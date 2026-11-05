"""Unitree G1: load the two mugs from the counter into the dishwasher's upper rack.

Hand-written control: G1 arm kinematics (menagerie constants), a pinhole model of
the wrist cameras (calibrated on the floor checkerboard), mug localisation by
fitting cylinder silhouettes in both wrist cameras, Cartesian arm trajectories
through damped least-squares IK, and a closed-loop base controller on the
pelvis pose reported in low_dim_obs.
"""

import os

import cv2
import numpy as np
from scipy.optimize import least_squares, minimize

DEBUG = os.environ.get("POLICY_DEBUG")

# ----------------------------------------------------------------------------- kinematics


def rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


SH_TILT = 0.2793
GRASP_OFF = np.array([0.165, 0.0, 0.028])  # finger pad centre in the wrist_yaw_link frame
QLO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
QHI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])
NOMINAL = np.array([-0.4, 0.25, 0.0, 0.6, 0.0, 0.0, 0.0])
ROLL_IN = 0.12


def arm_fk(q, side, waist=(0, 0, 0), off=GRASP_OFF):
    """Hand frame (R, p) in the pelvis frame. side=+1 left, -1 right."""
    s = side
    R = rz(waist[0])
    p = R @ np.array([-0.0039635, 0, 0.044])
    R = R @ rx(waist[1]) @ ry(waist[2])
    p = p + R @ np.array([0.0039563, 0.10022 * s, 0.24778])
    R = R @ rx(SH_TILT * s) @ ry(q[0])
    p = p + R @ np.array([0, 0.038 * s, -0.013831])
    R = R @ rx(-SH_TILT * s) @ rx(q[1])
    p = p + R @ np.array([0, 0.00624 * s, -0.1032])
    R = R @ rz(q[2])
    p = p + R @ np.array([0.015783, 0, -0.080518])
    R = R @ ry(q[3])
    p = p + R @ np.array([0.1, 0.00188791 * s, -0.01])
    R = R @ rx(q[4])
    p = p + R @ np.array([0.038, 0, 0])
    R = R @ ry(q[5])
    p = p + R @ np.array([0.046, 0, 0])
    R = R @ rz(q[6])
    p = p + R @ np.asarray(off)
    return R, p


def limits(side):
    lo, hi = QLO.copy(), QHI.copy()
    if side < 0:
        lo[1], hi[1] = -2.2515, 1.5882
        hi[1] = ROLL_IN      # the upper arm meets the torso
    else:
        lo[1] = -ROLL_IN
    # keep the wrist in a sane branch
    lo[4], hi[4] = -1.2, 1.2
    return lo, hi


def nominal(side):
    q = NOMINAL.copy()
    q[[1, 2, 4, 6]] *= side
    return q


def hand_R(pitch_up=0.0, yaw=0.0):
    return rz(yaw) @ ry(-pitch_up)


def ik(side, p_t, R_t, q0, waist, w_rot=0.3, w_post=0.02, nfev=60):
    lo, hi = limits(side)
    qn = nominal(side)

    def res(q):
        R, p = arm_fk(q, side, waist)
        eo = 0.5 * (np.cross(R[:, 0], R_t[:, 0]) + np.cross(R[:, 1], R_t[:, 1]) + np.cross(R[:, 2], R_t[:, 2]))
        return np.concatenate([p - p_t, w_rot * eo, w_post * (q - qn)])

    q0 = np.clip(np.asarray(q0, float), lo + 1e-4, hi - 1e-4)
    r = least_squares(res, q0, bounds=(lo, hi), max_nfev=nfev, xtol=1e-5, ftol=1e-7)
    return r.x, np.linalg.norm(r.fun[:3])


# ----------------------------------------------------------------------------- cameras

F_PX = 75.0
C0 = 41.5
CAM_ALPHA = np.radians(37.5)
CAM_OFF = np.array([0.08, 0.0, 0.07])


def wrist_cam(o, side):
    """World pose of a wrist camera: origin, R with columns (right, down, forward)."""
    q = o[3:10] if side > 0 else o[12:19]
    R, p = arm_fk(q, side, o[0:3], off=np.zeros(3))
    Rw = rz(o[24])
    Rh = Rw @ R
    ph = o[21:24] + Rw @ p
    org = ph + Rh @ CAM_OFF
    fwd = Rh @ np.array([np.cos(CAM_ALPHA), 0, -np.sin(CAM_ALPHA)])
    right = Rh @ np.array([0, -1.0, 0])
    down = np.cross(fwd, right)
    return org, np.stack([right, down, fwd], 1)


def pix_ray(org, Rc, u, v):
    d = Rc @ np.array([(u - C0) / F_PX, (v - C0) / F_PX, 1.0])
    return d / np.linalg.norm(d)


def project_pts(org, Rc, P):
    c = (P - org) @ Rc
    return np.stack([C0 + F_PX * c[:, 0] / c[:, 2], C0 + F_PX * c[:, 1] / c[:, 2]], 1), c[:, 2]


# ----------------------------------------------------------------------------- mug perception

ZC = 0.85  # counter top height
MUG_R = 0.045
MUG_H = 0.10
_ANG = np.linspace(0, 2 * np.pi, 24, endpoint=False)


def image_masks(im):
    im = im.astype(int)
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    V = im.max(-1)
    gray = (np.abs(R - B) < 8) & (np.abs(R - G) < 8) & (V >= 70)
    stick = (V < 200) & (R - B > 25) & (R >= G) & (G >= B)
    return gray, stick


def cyl_mask(org, Rc, x, y):
    P = np.concatenate([np.stack([x + MUG_R * np.cos(_ANG), y + MUG_R * np.sin(_ANG), np.full_like(_ANG, z)], 1)
                        for z in (ZC, ZC + MUG_H)])
    uv, dep = project_pts(org, Rc, P)
    m = np.zeros((84, 84), np.uint8)
    if (dep <= 0.02).any():
        return m.astype(bool)
    cv2.fillConvexPoly(m, cv2.convexHull((uv * 8).astype(np.int32)), 1, shift=3)
    return m.astype(bool)


def fit_mugs(views, inits):
    n = len(inits)

    def cost(v):
        tot = 0.0
        for org, Rc, gm in views:
            pred = np.zeros_like(gm)
            for i in range(n):
                pred |= cyl_mask(org, Rc, v[2 * i], v[2 * i + 1])
            tot += 1 - (pred & gm).sum() / max((pred | gm).sum(), 1)
        for i in range(n):
            for j in range(i + 1, n):
                dd = np.hypot(v[2 * i] - v[2 * j], v[2 * i + 1] - v[2 * j + 1])
                if dd < 2 * MUG_R:
                    tot += 5 * (2 * MUG_R - dd)
        return tot

    x0 = np.array(inits, float).ravel()
    best = None
    for dx in (-0.03, 0.0, 0.03):
        for dy in (-0.03, 0.0, 0.03):
            s = x0 + np.tile([dx, dy], n)
            c = cost(s)
            if best is None or c < best[0]:
                best = (c, s)
    v = minimize(cost, best[1], method='Nelder-Mead', options=dict(xatol=1e-3, fatol=1e-4, maxiter=400)).x
    sim = np.array([v] + [v + 0.01 * np.eye(2 * n)[k] for k in range(2 * n)])
    r = minimize(cost, v, method='Nelder-Mead', options=dict(xatol=5e-4, fatol=1e-5, maxiter=400, initial_simplex=sim))
    return r.x.reshape(n, 2), r.fun


def handle_protrusion(views, mugs, rh=0.062):
    """Handle yaw from mug pixels sticking out of the fitted body silhouettes."""
    out = []
    for i, (x, y) in enumerate(mugs):
        az = []
        for org, Rc, gm, stick in views:
            body = cyl_mask(org, Rc, x, y)
            others = np.zeros_like(body)
            for j, (x2, y2) in enumerate(mugs):
                if j != i:
                    others |= cyl_mask(org, Rc, x2, y2)
            near = cv2.dilate(body.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool)
            grown = cv2.dilate(body.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
            cand = gm & near & ~grown & ~others
            ys, xs = np.nonzero(cand)
            for u, v in zip(xs, ys):
                d = pix_ray(org, Rc, float(u), float(v))
                # intersect with vertical cylinder of radius rh about the mug axis
                ox, oy = org[0] - x, org[1] - y
                a = d[0] ** 2 + d[1] ** 2
                b = 2 * (ox * d[0] + oy * d[1])
                c = ox ** 2 + oy ** 2 - rh ** 2
                disc = b * b - 4 * a * c
                if a < 1e-9:
                    continue
                if disc < 0:
                    tt = -b / (2 * a)   # closest approach
                else:
                    tt = (-b - np.sqrt(disc)) / (2 * a)
                P3 = org + tt * d
                if ZC - 0.01 < P3[2] < ZC + MUG_H + 0.01:
                    az.append(np.arctan2(P3[1] - y, P3[0] - x))
        if len(az) >= 4:
            az = np.array(az)
            out.append((float(np.arctan2(np.sin(az).mean(), np.cos(az).mean())), len(az)))
        else:
            out.append((None, len(az)))
    return out


def handle_dirs(views, mugs):
    """Handle yaw of each mug, from the handle's shadow on the counter."""
    out = []
    for (x, y) in mugs:
        pts = []
        for org, Rc, gm, stick in views:
            ys, xs = np.nonzero(stick)
            for u, v in zip(xs, ys):
                d = pix_ray(org, Rc, float(u), float(v))
                if d[2] >= -1e-3:
                    continue
                P = org + d * (ZC - org[2]) / d[2]
                dd = np.hypot(P[0] - x, P[1] - y)
                if MUG_R * 0.8 < dd < MUG_R + 0.06:
                    pts.append(P[:2])
        if len(pts) >= 3:
            p = np.mean(pts, 0)
            out.append(float(np.arctan2(p[1] - y, p[0] - x)))
        else:
            out.append(np.pi)
    return out


# ----------------------------------------------------------------------------- base


WZ_MIN = 0.12


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def goto_cmd(o, x, y, yaw, vmax=0.2, wmax=0.5, kp=1.5, kw=1.5, tol=0.03, ytol=0.03):
    px, py, pyaw = o[21], o[22], o[24]
    dx, dy = x - px, y - py
    c, s = np.cos(pyaw), np.sin(pyaw)
    bx, by = c * dx + s * dy, -s * dx + c * dy
    eyaw = wrap(yaw - pyaw)
    vx, vy = kp * bx, kp * by
    n = np.hypot(vx, vy)
    if n > vmax:
        vx, vy = vx * vmax / n, vy * vmax / n
    n = np.hypot(vx, vy)
    if n < 0.06:
        if np.hypot(bx, by) > tol:
            vx, vy = vx * 0.06 / max(n, 1e-6), vy * 0.06 / max(n, 1e-6)
        else:
            vx, vy = 0.0, 0.0
    wz = float(np.clip(kw * eyaw, -wmax, wmax))
    if abs(eyaw) < ytol:
        wz = 0.0
    elif abs(wz) < WZ_MIN:
        wz = WZ_MIN * np.sign(wz)
    done = np.hypot(bx, by) < tol and abs(eyaw) < ytol
    return (float(vx), float(vy), wz), done


# ----------------------------------------------------------------------------- arm motion


class ArmMover:
    """Cartesian straight-line moves of the grasp point, in world or pelvis frame."""

    def __init__(self, side):
        self.side = side
        self.q = nominal(side) * 0.0
        self.seg = None  # (p0, yaw0, pitch0, p1, yaw1, pitch1, n, k, frame)
        self.target = None  # (p, yaw, pitch, frame)
        self.pc = np.zeros(3)
        self.ac = np.zeros(2)
        self.comp = True

    def pose_now(self, o, frame):
        q = o[3:10] if self.side > 0 else o[12:19]
        R, p = arm_fk(q, self.side, o[0:3])
        yaw = np.arctan2(R[1, 0], R[0, 0])
        pitch = np.arcsin(np.clip(R[2, 0], -1, 1))
        if frame == 'world':
            p = o[21:24] + rz(o[24]) @ p
            yaw = yaw + o[24]
        return p, yaw, pitch

    def move(self, o, p1, yaw1, pitch1, n, frame='world', from_target=True):
        if from_target and self.target is not None and self.target[3] == frame:
            p0, y0, pi0 = self.target[0], self.target[1], self.target[2]
        else:
            p0, y0, pi0 = self.pose_now(o, frame)
        self.seg = [np.array(p0), y0, pi0, np.array(p1, float), yaw1, pitch1, max(int(n), 1), 0, frame]

    def busy(self):
        return self.seg is not None and self.seg[7] < self.seg[6]

    def step(self, o):
        if self.seg is not None:
            p0, y0, pi0, p1, y1, pi1, n, k, frame = self.seg
            k = min(k + 1, n)
            self.seg[7] = k
            s = 0.5 - 0.5 * np.cos(np.pi * k / n)
            p = p0 + (p1 - p0) * s
            yaw = y0 + wrap(y1 - y0) * s
            pitch = pi0 + (pi1 - pi0) * s
            self.target = (p, yaw, pitch, frame)
        if self.target is None:
            return self.q
        p, yaw, pitch, frame = self.target
        if frame == 'world':
            Rw = rz(o[24])
            p_rel = Rw.T @ (p - o[21:24])
            yaw_rel = yaw - o[24]
        else:
            p_rel, yaw_rel = p, yaw
        # Cartesian integral correction of the steady tracking error (gravity sag, contacts excluded)
        q_act = o[3:10] if self.side > 0 else o[12:19]
        Ra, pa = arm_fk(q_act, self.side, o[0:3])
        ya = np.arctan2(Ra[1, 0], Ra[0, 0])
        pia = np.arcsin(np.clip(Ra[2, 0], -1, 1))
        if self.comp:
            g = 0.012 if self.busy() else 0.035
            self.pc = np.clip(self.pc + g * (p_rel - pa), -0.06, 0.06)
            self.ac = np.clip(self.ac + g * np.array([wrap(yaw_rel - ya), pitch - pia]), -0.25, 0.25)
        self.q, self.err = ik(self.side, p_rel + self.pc, hand_R(pitch + self.ac[1], yaw_rel + self.ac[0]), self.q, o[0:3])
        return self.q


# ----------------------------------------------------------------------------- policy

LOOK_P = np.array([0.40, 0.15, 0.20])
LOOK_PITCH = 0.2
LOOK_YAW = 0.3
BASE1 = (0.04, -0.52, 0.0)
LEAN = 0.3
GR_IN = 0.005
HANDLE_R = 0.068
YAW_ALIGN = 0.5
GR_Z = 0.08
REACH_X = 0.57     # mug centre ahead of the pelvis when grasping
SIDE_OFF = 0.12    # mug centre beside the pelvis (towards the grasping hand)
CARRY_P = np.array([0.38, 0.15, 0.24])
WALK_P = np.array([0.25, 0.15, 0.25])
CARRY_PITCH = 0.0   # hand pitch while grasping and carrying
GRIP_OPEN = 0.25
WALK_V = 0.20
WALK_W = 0.7
PLACE_BASE = (0.19, -0.545, np.pi / 2)   # facing the upper rack
PLACE_H = 0.72
PLACE_LEAN = 0.32
PLACE_SPOTS = ((0.10, -0.03), (0.28, -0.03))   # mug centres in the upper rack (world x, y)
PLACE_Z_HI = 0.89
PLACE_Z_LO = 0.52
CONTACT_DZ = 0.015


WRIST_REL = (0.33, 0.12)   # wrist ahead of / beside the pelvis when grasping
GRASP_BASE_YAW = (0.0, 0.35)  # base yaw while grasping the left / right mug
BASE_Y_MAX = -0.47            # the open dishwasher door blocks the legs beyond this


def grasp_geometry(mug, handle):
    """Handle point H (world), handle yaw phi and hand yaw for a mug."""
    dev = float(np.clip(wrap(handle - np.pi), -0.6, 0.6))
    phi = np.pi + dev
    app = YAW_ALIGN * dev
    H = np.array([mug[0] + HANDLE_R * np.cos(phi), mug[1] + HANDLE_R * np.sin(phi), ZC + GR_Z])
    return H, phi, app


def look_pose(mug, psi, dist=0.24, height=0.17):
    """Pad target and hand pitch that put a wrist camera dist back / height above the mug, looking at it."""
    c = np.array([mug[0] - dist * np.cos(psi), mug[1] - dist * np.sin(psi), ZC + 0.05 + height])
    dep = np.arctan2(height, dist)
    pitch = CAM_ALPHA - dep
    Rh = rz(psi) @ ry(-pitch)
    wrist = c - Rh @ CAM_OFF
    return wrist + Rh @ GRASP_OFF, float(pitch)


def window_mask(org, Rc, mugs, grow=10):
    m = np.zeros((84, 84), bool)
    for x, y in mugs:
        m |= cyl_mask(org, Rc, x, y)
    return cv2.dilate(m.astype(np.uint8), np.ones((2 * grow + 1, 2 * grow + 1), np.uint8)).astype(bool)


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        self.tools = tools
        self.arms = {1: ArmMover(1), -1: ArmMover(-1)}
        self.grip = {1: 0.0, -1: 0.0}
        self.pitch = 0.0
        self.height = 0.74
        self.base = (0.0, 0.0, 0.0)
        self.o = np.asarray(obs['low_dim_obs'], dtype=float)
        self.t = 0
        self.mug_rel = {}
        self.pitch_goal = 0.0
        self.height_goal = 0.74
        self.gen = self.script()

    # ------------------------------------------------------------------ helpers
    def dbg(self, *a):
        if DEBUG:
            print(f'[{self.t}]', *a, flush=True)

    def snap(self, tag):
        if DEBUG:
            for c in ('head', 'left_wrist', 'right_wrist'):
                self.tools.render(c, f'frames/dbg_{tag}_{c}.png')

    def wait(self, n):
        for _ in range(int(n)):
            yield

    def wait_arms(self, sides=(1, -1), extra=0, timeout=400):
        k = 0
        while any(self.arms[s].busy() for s in sides) and k < timeout:
            k += 1
            yield
        yield from self.wait(extra)

    def walk_to(self, x, y, yaw, timeout=300, tol=0.025, vmax=0.15, ytol=0.03, wmax=0.5, acc=0.004):
        cur = np.array(self.base, float)
        for k in range(timeout):
            cmd, done = goto_cmd(self.o, x, y, yaw, vmax=vmax, tol=tol, ytol=ytol, wmax=wmax)
            if done:
                break
            cmd = np.array(cmd)
            # limit accelerations, but never command a planar speed inside the dead band
            step = np.clip(cmd - cur, -acc, acc)
            step[2] = np.clip(cmd[2] - cur[2], -2 * acc, 2 * acc)
            cur = cur + step
            out = cur.copy()
            sp = np.hypot(out[0], out[1])
            if 0 < sp < 0.06 and np.hypot(cmd[0], cmd[1]) >= 0.06:
                out[:2] *= 0.06 / sp
            elif sp < 0.06 and np.hypot(cmd[0], cmd[1]) < 0.06:
                out[:2] = cmd[:2]
            if 0 < abs(out[2]) < WZ_MIN and abs(cmd[2]) >= WZ_MIN:
                out[2] = WZ_MIN * np.sign(out[2])
            self.base = tuple(out)
            yield
        self.base = (0.0, 0.0, 0.0)
        self.dbg('walk_to', (round(x, 3), round(y, 3), round(yaw, 3)), 'at', np.round(self.o[[21, 22, 24]], 3), 'k', k)

    def lean_to(self, p, rate=0.01):
        self.pitch_goal = p
        while abs(self.pitch - p) > 1e-6:
            yield

    def views(self, sides):
        out = []
        for s in sides:
            im = self.tools.image('left_wrist' if s > 0 else 'right_wrist')
            org, Rc = wrist_cam(self.o, s)
            gm, st = image_masks(im)
            out.append((org, Rc, gm, st))
        return out

    def perceive(self, inits, sides=(1, -1), window=True, protrusion=False):
        vs = self.views(sides)
        fv = []
        for org, Rc, gm, st in vs:
            if window:
                gm = gm & window_mask(org, Rc, inits, 12)
            fv.append((org, Rc, gm))
        mugs, cost = fit_mugs(fv, inits)
        hd = handle_dirs(vs, mugs)
        if protrusion:
            hp = handle_protrusion([(a, b, c, d[3]) for (a, b, c), d in zip(fv, vs)], mugs)
            self.dbg('protrusion', [(None if a is None else round(np.degrees(a)), n) for a, n in hp], 'stick', np.degrees(hd).round(0))
            # The silhouette cue fails when the handle faces the camera; the shadow cue is only
            # unbiased when the handle points back towards the robot (shadows fall towards it).
            out = []
            for (a, n), st in zip(hp, hd):
                if a is None or n < 8:
                    out.append(None)
                elif abs(wrap(st - np.pi)) < np.radians(15) and abs(wrap(a - st)) > np.radians(30):
                    out.append(st)
                else:
                    out.append(a)
            hd = out
        self.dbg('perceive', np.round(mugs, 3).tolist(), 'cost', round(cost, 3), 'handles', np.degrees(hd).round(0))
        return mugs, hd, cost

    def refine_handle(self, s, mug_c, phi):
        """Handle yaw from the handle's shadow on the counter, seen close up by the grasping hand.

        At the stand-off pose the shadow lies almost under the handle, so the blob in the
        annulus around the mug whose azimuth is nearest the current estimate gives the handle yaw.
        """
        org, Rc, gm, st = self.views((s,))[0]
        ys, xs = np.nonzero(st)
        best = None
        if len(xs):
            from scipy import ndimage
            lab, n = ndimage.label(st)
            for i in range(1, n + 1):
                sel = lab[ys, xs] == i
                if sel.sum() < 4:
                    continue
                pts = []
                for u, v in zip(xs[sel], ys[sel]):
                    d = pix_ray(org, Rc, float(u), float(v))
                    if d[2] < -1e-3:
                        pts.append((org + d * (ZC - org[2]) / d[2])[:2])
                if len(pts) < 10:
                    continue
                pts = np.array(pts)
                c = pts.mean(0)
                r = np.hypot(*(c - mug_c))
                ang = float(np.arctan2(c[1] - mug_c[1], c[0] - mug_c[0]))
                dang = abs(wrap(ang - phi))
                if 0.035 < r < 0.09 and dang < np.radians(60) and (best is None or dang < best[0]):
                    best = (dang, ang, len(pts), r)
        if best is None:
            self.dbg('refine: no stick')
            return None
        self.dbg('refine: stick at yaw', round(np.degrees(best[1])), 'r', round(best[3], 3),
                 'expected', round(np.degrees(phi)), 'n', best[2])
        return best[1]

    # ------------------------------------------------------------------ skills
    def grasp(self, s, mug, handle):
        arm = self.arms[s]
        mx, my = mug
        H, phi, app = grasp_geometry(mug, handle)
        dvec = np.array([np.cos(app), np.sin(app), 0.0])

        def G(back, dz=0.0):
            return H - back * dvec + [0, 0, dz]

        self.grip[s] = GRIP_OPEN
        arm.move(self.o, G(0.11, 0.06), app, CARRY_PITCH, 35)
        yield from self.wait_arms((s,))
        arm.move(self.o, G(0.08), app, CARRY_PITCH, 20)
        yield from self.wait_arms((s,), extra=10)
        mug_c = np.array([mx, my])
        for it in range(1):
            a = self.refine_handle(s, mug_c, phi)
            if a is None:
                break
            # the shadow sits slightly off the handle: move half way towards it
            phi = phi + 0.5 * wrap(a - phi)
            phi = np.pi + float(np.clip(wrap(phi - np.pi), -0.8, 0.8))
            H[:2] = mug_c + HANDLE_R * np.array([np.cos(phi), np.sin(phi)])
            app = float(np.clip(wrap(phi - np.pi), -0.6, 0.6))
            dvec[:] = [np.cos(app), np.sin(app), 0.0]
            self.dbg('refine it', it, 'phi', round(np.degrees(phi)), 'app', round(np.degrees(app)))
            arm.move(self.o, G(0.08), app, CARRY_PITCH, 15)
            yield from self.wait_arms((s,), extra=6)
        arm.move(self.o, G(-GR_IN), app, CARRY_PITCH, 45)
        yield from self.wait_arms((s,), extra=8)
        self.snap(f'pregrip{s}')
        q_act = self.o[3:10] if s > 0 else self.o[12:19]
        Rw = rz(self.o[24])
        Ra, pa = arm_fk(q_act, s, self.o[0:3])
        Ra, pa = Rw @ Ra, self.o[21:24] + Rw @ pa
        mug_c = np.r_[H[:2] - HANDLE_R * np.array([np.cos(phi), np.sin(phi)]), ZC]
        self.mug_rel[s] = Ra.T @ (mug_c - pa)
        self.dbg('mug_rel', s, np.round(self.mug_rel[s], 3))
        arm.comp = False
        for k in range(16):
            self.grip[s] = GRIP_OPEN + (1 - GRIP_OPEN) * (k + 1) / 16
            yield
        yield from self.wait(5)
        arm.move(self.o, G(-GR_IN, 0.12), app, CARRY_PITCH, 30)
        yield from self.wait_arms((s,))
        arm.comp = True
        self.snap(f'lifted{s}')
        gstate = self.o[50] if s > 0 else self.o[51]
        self.dbg('grasp', s, 'gripper state', round(float(gstate), 3))

    def script(self):
        for s in (1, -1):
            self.arms[s].move(self.o, LOOK_P * [1, s, 1], -LOOK_YAW * s, LOOK_PITCH, 50, frame='pelvis', from_target=False)
        yield from self.wait(15)
        self.pitch_goal = LEAN
        yield from self.walk_to(*BASE1, timeout=250)
        yield from self.lean_to(LEAN)
        yield from self.wait(35)
        mugs, hd, _ = self.perceive([(0.60, -0.45), (0.58, -0.60)], window=False)
        self.snap('perceive')

        # ---- grasp each mug from a base pose suited to its handle
        for s in (1, -1):
            i = 0 if s > 0 else 1
            H, phi, app = grasp_geometry(mugs[i], hd[i])
            pad = H + GR_IN * np.array([np.cos(app), np.sin(app), 0.0])
            th = GRASP_BASE_YAW[i]
            rel = np.array([WRIST_REL[0] + 0.165 * np.cos(app - th), s * WRIST_REL[1] + 0.165 * np.sin(app - th)])
            rel = rz(th)[:2, :2] @ rel
            bx, by = pad[0] - rel[0], min(pad[1] - rel[1], BASE_Y_MAX)
            yield from self.walk_to(bx, by, th, timeout=200, vmax=0.1, tol=0.02, ytol=0.03)
            # close look at this mug with the grasping hand's camera
            psi = float(np.arctan2(mugs[i][1] - self.o[22], mugs[i][0] - self.o[21])) + 0.25 * s
            p_look, pitch_look = look_pose(mugs[i], psi)
            self.arms[s].move(self.o, p_look, psi, pitch_look, 35)
            yield from self.wait_arms((s,), extra=10)
            m2, h2, c2 = self.perceive([mugs[i]], sides=(s,), protrusion=True)
            self.snap(f'look{s}')
            if c2 < 0.45 and np.hypot(*(m2[0] - mugs[i])) < 0.09:
                mugs[i] = m2[0]
                if h2[0] is not None:
                    hd[i] = h2[0]
                H, phi, app = grasp_geometry(mugs[i], hd[i])
                pad = H + GR_IN * np.array([np.cos(app), np.sin(app), 0.0])
                rel = np.array([WRIST_REL[0] + 0.165 * np.cos(app - th), s * WRIST_REL[1] + 0.165 * np.sin(app - th)])
                rel = rz(th)[:2, :2] @ rel
                bx, by = pad[0] - rel[0], min(pad[1] - rel[1], BASE_Y_MAX)
                yield from self.walk_to(bx, by, th, timeout=100, vmax=0.08, tol=0.02, ytol=0.03)
            yield from self.wait(5)
            yield from self.grasp(s, mugs[i], hd[i])
            self.arms[s].move(self.o, CARRY_P * [1, s, 1], 0.0, CARRY_PITCH, 50, frame='pelvis')
            yield from self.wait(15)
        self.snap('carry')

        # ---- carry to the dishwasher
        yield from self.wait_arms()
        self.pitch_goal = 0.0
        yield from self.walk_to(*PLACE_BASE, timeout=350, tol=0.02, ytol=0.025, vmax=WALK_V, wmax=WALK_W)
        self.pitch_goal = PLACE_LEAN
        self.height_goal = PLACE_H
        yield from self.wait(75)
        self.snap('atrack')
        yield from self.place()
        self.snap('placed')
        while True:   # hold still while the success condition is checked
            yield

    def place(self):
        """Lower both mugs into the upper rack, release and withdraw."""
        tgt = {1: np.array(PLACE_SPOTS[0]), -1: np.array(PLACE_SPOTS[1])}
        yaw_h = PLACE_BASE[2]
        Rh = rz(yaw_h) @ ry(-CARRY_PITCH)
        pads = {}
        for s in (1, -1):
            v = self.mug_rel.get(s, np.array([HANDLE_R, 0.0, -GR_Z]))
            pad_xy = tgt[s] - (Rh @ v)[:2]
            pads[s] = pad_xy
        # above the rack, mug bottom clear of the front rim
        for s in (1, -1):
            self.arms[s].move(self.o, np.r_[pads[s], PLACE_Z_HI], yaw_h, CARRY_PITCH, 60)
        yield from self.wait_arms(extra=10)
        self.snap('above')
        for s in (1, -1):
            self.arms[s].comp = False
        # lower both slowly until contact
        z = PLACE_Z_HI
        done = {1: False, -1: False}
        dz0 = {}
        k = 0
        while not all(done.values()) and z > PLACE_Z_LO:
            z -= 0.0009
            k += 1
            for s in (1, -1):
                if done[s]:
                    continue
                arm = self.arms[s]
                arm.target = (np.r_[pads[s], z], yaw_h, CARRY_PITCH, 'world')
                arm.seg = None
                q_act = self.o[3:10] if s > 0 else self.o[12:19]
                Rw = rz(self.o[24])
                za = (self.o[21:24] + Rw @ arm_fk(q_act, s, self.o[0:3])[1])[2]
                if k == 40:
                    dz0[s] = za - z
                if k > 40 and (za - z - dz0[s] > CONTACT_DZ or arm.err > 0.012):
                    done[s] = True
                    self.dbg('contact', s, 'cmd z', round(z, 3), 'act z', round(za, 3), 'ik err', round(arm.err, 4))
            yield
        self.dbg('lowered', done, 'z', round(z, 3))
        yield from self.wait(15)
        self.snap('lowered')
        for k in range(20):
            for s in (1, -1):
                self.grip[s] = max(0.0, 1.0 - (k + 1) / 20)
            yield
        yield from self.wait(20)
        self.snap('released')
        for s in (1, -1):
            p, yw, pi, fr = self.arms[s].target
            back = np.array([np.cos(yw), np.sin(yw), 0.0])
            self.arms[s].move(self.o, p - 0.08 * back, yw, pi, 50)
        yield from self.wait_arms()
        for s in (1, -1):
            p, yw, pi, fr = self.arms[s].target
            self.arms[s].move(self.o, p + [0, 0, 0.12], yw, pi, 50)
        yield from self.wait_arms()

    def act(self, obs, tools):
        self.o = np.asarray(obs['low_dim_obs'], dtype=float)
        self.t = int(obs['t'])
        try:
            next(self.gen)
        except StopIteration:
            pass
        qL = self.arms[1].step(self.o)
        qR = self.arms[-1].step(self.o)
        raw = np.zeros(21, dtype=np.float32)
        raw[0:2] = self.base[0:2]
        self.pitch += float(np.clip(self.pitch_goal - self.pitch, -0.004, 0.004))
        self.height += float(np.clip(self.height_goal - self.height, -0.001, 0.001))
        raw[2] = self.height
        raw[3] = self.base[2]
        raw[4] = self.pitch
        raw[5:12] = qL
        raw[12:19] = qR
        raw[19] = self.grip[1]
        raw[20] = self.grip[-1]
        return raw
