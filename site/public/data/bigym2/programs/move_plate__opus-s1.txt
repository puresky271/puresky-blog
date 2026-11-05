"""Move the plate from the left dish rack to the right dish rack (Unitree G1).

Hand-written pipeline:
  1. look at the scene with the head camera (calibrated pinhole model, fixed
     on the torso) and locate the racks on the counter plane;
  2. walk next to the left rack, fit a disk model of the plate to its
     silhouette (plates are the only zero-saturation objects above the counter);
  3. grasp the top rim of the plate with the left gripper (fingers horizontal,
     pointing forward), lift it;
  4. walk to the right rack, locate its rails and pegs, lower the plate into
     a slot between two pegs, release and retract.
Arm targets come from a numerical IK on the G1 arm kinematics (URDF values).
"""

import cv2
import numpy as np
from scipy import ndimage
from scipy.optimize import least_squares, minimize

# ----------------------------------------------------------------------------
# kinematics


def _rpy(r, p, y):
    cr, sr, cp, sp, cy, sy = np.cos(r), np.sin(r), np.cos(p), np.sin(p), np.cos(y), np.sin(y)
    Rx = np.array([[1, 0, 0], [0, cr, -sr], [0, sr, cr]])
    Ry = np.array([[cp, 0, sp], [0, 1, 0], [-sp, 0, cp]])
    Rz = np.array([[cy, -sy, 0], [sy, cy, 0], [0, 0, 1]])
    return Rz @ Ry @ Rx


def _chain(s):
    return [
        ((0.0039563, s * 0.10022, 0.23778), (s * 0.27931, 5.4949e-05, -s * 0.00019159), 1),
        ((0, s * 0.038, -0.013831), (-s * 0.27925, 0, 0), 0),
        ((0, s * 0.00624, -0.1032), (0, 0, 0), 2),
        ((0.015783, 0, -0.080518), (0, 0, 0), 1),
        ((0.100, s * 0.00188791, -0.010), (0, 0, 0), 0),
        ((0.038, 0, 0), (0, 0, 0), 1),
        ((0.046, 0, 0), (0, 0, 0), 2),
    ]


CHAIN = {"L": _chain(1.0), "R": _chain(-1.0)}
_FIXED = {k: [(_rpy(*r), np.array(p), ax) for p, r, ax in v] for k, v in CHAIN.items()}
Q_LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
Q_HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])
TORSO_IN_PELVIS = np.array([-0.0039635, 0.0, 0.044])
GRIP_OFF = np.array([0.09, 0.0, 0.0])  # pinch centre in the wrist-yaw frame
GRASP_DZ = 0.03  # how far below the rim top the grasp point goes
LIFT = 0.25  # lift of the grasp point above the grasp height (plate clears the pegs)
PLACE_DZ = 0.01  # release height relative to the grasp height
IK_STEP = 0.05  # max joint change per IK update while tracking (rad)


def _axis_rot(ax, q):
    c, s = np.cos(q), np.sin(q)
    if ax == 0:
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if ax == 1:
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def fk(q, side="L", off=GRIP_OFF):
    R = np.eye(3)
    p = np.zeros(3)
    for (Rf, pf, ax), qi in zip(_FIXED[side], q):
        p = p + R @ pf
        R = R @ Rf @ _axis_rot(ax, qi)
    return p + R @ off, R


def limits(side):
    if side == "L":
        return Q_LO, Q_HI
    lo, hi = Q_LO.copy(), Q_HI.copy()
    for j in (1, 2, 4, 6):
        lo[j], hi[j] = -Q_HI[j], -Q_LO[j]
    return lo, hi


# Nominal arm posture for grasping/carrying: upper arm horizontal to the side,
# forearm pointing forward, wrist rolled so the fingers open horizontally.
Q_NOM_L = np.array([-0.58, 1.47, -0.34, 0.07, -1.68, 1.0, 0.23])
Q_NOM_R = Q_NOM_L * np.array([1, -1, -1, 1, -1, 1, -1])
GRASP_PITCH = 0.8  # fingers point forward and down


def ik(p, R, side, q0, wrot=0.3, reg=0.03, off=GRIP_OFF):
    lo, hi = limits(side)
    q0 = np.clip(np.asarray(q0, float), lo + 1e-4, hi - 1e-4)
    qn = Q_NOM_L if side == "L" else Q_NOM_R

    def res(q):
        P, Rq = fk(q, side, off)
        return np.concatenate([P - p, wrot * (Rq - R).ravel(), reg * (q - qn)])

    s = least_squares(res, q0, bounds=(lo, hi), xtol=1e-6, ftol=1e-6)
    P, _ = fk(s.x, side, off)
    return s.x, float(np.linalg.norm(P - p))


IK_SEEDS_L = [
    np.array([-0.94, 1.2, -0.77, -0.78, -1.58, 0.18, 1.29]),
    np.array([-1.25, 0.86, -0.39, -0.18, -1.6, 0.77, 1.07]),
    np.array([-1.13, 0.92, -0.25, -0.56, -1.89, 0.77, 1.42]),
    np.array([-0.8, 0.3, 0.0, 0.5, 0.0, 0.0, 0.0]),
    np.array([-1.5, 0.3, 0.0, 1.0, 0.0, 0.0, 0.0]),
]


def solve_ik(p, R, side, qcur):
    """IK from the current configuration and from the nominal posture."""
    best = None
    seeds = [qcur, Q_NOM_L if side == "L" else Q_NOM_R]
    for k, q0 in enumerate(seeds):
        q, err = ik(p, R, side, q0)
        _, Rq = fk(q, side)
        cost = err + 0.05 * float(np.linalg.norm(Rq - R))
        if best is None or cost < best[0] - 1e-4:
            best = (cost, q, err)
        if k == 0 and err < 0.004 and np.linalg.norm(Rq - R) < 0.1:
            break
    return best[1], best[2]


HAND_NOM = fk(Q_NOM_L, "L")[0][:2] + TORSO_IN_PELVIS[:2]  # pinch point of Q_NOM_L rel. to pelvis


def hand_R(yaw, roll=0.0):
    """Hand orientation (torso frame): heading yaw, fingers pitched down by
    GRASP_PITCH, the finger plane tilted by roll about the heading axis."""
    return _rpy(0, 0, wrap(yaw)) @ _rpy(roll, 0, 0) @ _rpy(0, GRASP_PITCH, 0)


# ----------------------------------------------------------------------------
# head camera (fixed on the torso): pinhole, 84x84

# z lowered by 0.11 after hand-eye checks with a grasped plate
CAM_POS = np.array([0.0154, -0.0002, 0.3968])  # torso frame
CAM_R = _rpy(0.0106, 1.0185, -0.0089)
CAM_F = 84.76
Z_COUNTER = 0.706
Z_RAIL = 0.716


def cam_pose(pel):
    Ry = _rpy(0, 0, pel[3])
    o = np.array(pel[:3]) + Ry @ (TORSO_IN_PELVIS + CAM_POS)
    return o, Ry @ CAM_R


def world_to_pix(P, pel):
    o, R = cam_pose(pel)
    d = (np.atleast_2d(P) - o) @ R
    return np.stack([42 - CAM_F * d[:, 1] / d[:, 0], 42 - CAM_F * d[:, 2] / d[:, 0]], 1)


def pix_to_plane(u, v, pel, z):
    o, R = cam_pose(pel)
    u = np.atleast_1d(np.asarray(u, float))
    v = np.atleast_1d(np.asarray(v, float))
    d = np.stack([np.ones_like(u), -(u - 42) / CAM_F, -(v - 42) / CAM_F], 1) @ R.T
    t = (z - o[2]) / d[:, 2]
    return o + t[:, None] * d


# ----------------------------------------------------------------------------
# perception


def brown_mask(im):
    g = im.astype(int)
    r, gg, b = g[..., 0], g[..., 1], g[..., 2]
    return (r - b > 35) & (r > 90) & (r > gg)


def plate_mask(im, vmax=60):
    g = im.astype(int)
    sat = g.max(-1) - g.min(-1)
    m = (sat <= 3) & (g.min(-1) > 60)
    m[vmax:] = False
    lab, n = ndimage.label(m)
    if n == 0:
        return m
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return lab == (np.argmax(sizes) + 1)


PLATE_R = 0.115
PEG_PITCH = 0.04


def disk_pts(p, n=48):
    xc, yp, zc, psi, lean = p
    t = np.linspace(0, 2 * np.pi, n, endpoint=False)
    a = np.array([np.cos(psi), np.sin(psi), 0.0])
    nrm = np.array([-np.sin(psi), np.cos(psi), 0.0])
    b = np.cos(lean) * np.array([0, 0, 1.0]) + np.sin(lean) * nrm
    return np.array([xc, yp, zc]) + PLATE_R * (np.cos(t)[:, None] * a + np.sin(t)[:, None] * b)


def render_disk(p, pel):
    uv = world_to_pix(disk_pts(p), pel)
    m = np.zeros((84, 84), np.uint8)
    cv2.fillPoly(m, [np.round(uv * 8).astype(np.int32)], 1, shift=3)
    return m.astype(bool)


PLATE_ZC = 0.826


def fit_plate(mask, pel, p0):
    """Fit (xc, y, yaw, lean) of the plate disk; its centre height is fixed."""
    def cost(x):
        r = render_disk([x[0], x[1], PLATE_ZC, x[2], x[3]], pel)
        return 1 - (r & mask).sum() / max((r | mask).sum(), 1)

    x0 = np.array(p0, float)
    fun = None
    for scale in (0.03, 0.01, 0.004):
        simplex = np.vstack([x0] + [x0 + scale * np.eye(4)[k] for k in range(4)])
        s = minimize(cost, x0, method="Nelder-Mead",
                     options=dict(initial_simplex=simplex, xatol=1e-4, fatol=1e-5, maxiter=800))
        x0, fun = s.x, s.fun
    return x0, fun


def rack_points(im, pel, side):
    m = brown_mask(im)
    vs, us = np.nonzero(m)
    if len(us) == 0:
        return np.zeros((0, 3))
    P = pix_to_plane(us, vs, pel, Z_RAIL)
    keep = (P[:, 0] > 0.3) & (P[:, 0] < 0.8)
    keep &= (P[:, 1] > 0.0) if side == "L" else (P[:, 1] < 0.0)
    return P[keep]


def rack_pose(P):
    """Fit rack yaw and front/back rail lines to projected brown points."""
    best = None
    for th in np.arange(-0.4, 0.401, 0.01):
        c, s = np.cos(th), np.sin(th)
        xr = c * P[:, 0] + s * P[:, 1]
        h, _ = np.histogram(xr, bins=np.arange(0.2, 0.9, 0.006))
        score = float((h.astype(float) ** 2).sum())
        if best is None or score > best[0]:
            best = (score, th)
    th = best[1]
    for th2 in np.arange(th - 0.01, th + 0.0101, 0.002):
        c, s = np.cos(th2), np.sin(th2)
        xr = c * P[:, 0] + s * P[:, 1]
        h, _ = np.histogram(xr, bins=np.arange(0.2, 0.9, 0.006))
        score = float((h.astype(float) ** 2).sum())
        if score > best[0]:
            best = (score, th2)
    th = best[1]
    c, s = np.cos(th), np.sin(th)
    xr = c * P[:, 0] + s * P[:, 1]
    yr = -s * P[:, 0] + c * P[:, 1]
    bins = np.arange(0.2, 0.9, 0.004)
    h, e = np.histogram(xr, bins=bins)
    h = ndimage.uniform_filter1d(h.astype(float), 3)
    i1 = int(np.argmax(h))
    x1 = e[i1] + 0.002
    h2 = h.copy()
    h2[max(0, i1 - 15):i1 + 16] = 0
    i2 = int(np.argmax(h2))
    x2 = e[i2] + 0.002
    xf, xb = min(x1, x2), max(x1, x2)
    near = np.abs(xr - xf) < 0.012
    if near.sum() < 5:
        near = np.abs(xr - xf) < 0.03
    y0, y1 = np.percentile(yr[near], [2, 98])
    return dict(yaw=th, xf=xf, xb=xb, y0=y0, y1=y1)


def rack_to_world(rp, xr, yr):
    c, s = np.cos(rp["yaw"]), np.sin(rp["yaw"])
    return np.array([c * xr - s * yr, s * xr + c * yr])


def peg_positions(im, pel, rp):
    """Positions (rack-frame y) of the pegs standing on the front and back rails."""
    g = im.astype(int)
    r, gg, b = g[..., 0], g[..., 1], g[..., 2]
    m = (r - b > 20) & (r < 160) & (r > gg) & (gg > b)
    vs, us = np.nonzero(m)
    if len(us) == 0:
        return []
    P = pix_to_plane(us, vs, pel, Z_RAIL + 0.04)
    c, s = np.cos(rp["yaw"]), np.sin(rp["yaw"])
    xr = c * P[:, 0] + s * P[:, 1]
    yr = -s * P[:, 0] + c * P[:, 1]
    out = []
    for rail in (rp["xf"], rp["xb"]):
        sel = (xr > rail - 0.03) & (xr < rail + 0.05) & (yr > rp["y0"] - 0.01) & (yr < rp["y1"] + 0.01)
        bins = np.arange(rp["y0"] - 0.02, rp["y1"] + 0.02, 0.004)
        h, e = np.histogram(yr[sel], bins=bins)
        h = ndimage.uniform_filter1d(h.astype(float), 3)
        peaks = []
        order = np.argsort(-h)
        for i in order:
            if h[i] < max(2.0, 0.25 * h.max()):
                break
            yc = e[i] + 0.002
            if all(abs(yc - p) > 0.025 for p in peaks):
                peaks.append(yc)
        out.append(sorted(peaks))
    return out


# ----------------------------------------------------------------------------
# policy


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


TUCK_L = np.array([0.1, 0.15, 0.0, 1.3, 0.0, 0.0, 0.0])
MIRROR = np.array([1, -1, -1, 1, -1, 1, -1])
TUCK_R = TUCK_L * MIRROR


class Policy:
    """The control policy that is scored on the hidden seeds."""

    debug = False

    def reset(self, obs, tools):
        self.tools = tools
        self.obs = obs
        self.cur = np.asarray(tools.hold_action(), dtype=np.float64).copy()
        self.log = []
        self.snaps = []
        self.gen = self.script()

    # -- helpers --------------------------------------------------------------
    def pel(self):
        lo = self.obs["low_dim_obs"]
        return np.array([lo[18], lo[19], lo[20], lo[21]], float)

    def qarm(self, side):
        lo = self.obs["low_dim_obs"]
        return np.array(lo[0:7] if side == "L" else lo[9:16], float)

    def note(self, *a):
        if self.debug:
            self.log.append((int(self.obs["t"]),) + a)

    def snap(self, name):
        if self.debug:
            self.snaps.append((name, int(self.obs["t"]), self.tools.image("head"),
                               self.tools.image("left_wrist"), self.tools.image("right_wrist")))

    def act_hold(self, n):
        for _ in range(n):
            a = self.cur.copy()
            a[0] = a[1] = a[3] = 0.0
            yield a

    def world_to_torso(self, P, pel=None):
        pel = self.pel() if pel is None else pel
        Ry = _rpy(0, 0, pel[3])
        return Ry.T @ (np.asarray(P, float) - pel[:3]) - TORSO_IN_PELVIS

    def walk(self, x, y, yaw, tol=0.015, ytol=0.02, maxn=300, vmax=0.4, settle=30):
        for _ in range(maxn):
            pel = self.pel()
            ex, ey = x - pel[0], y - pel[1]
            c, s = np.cos(pel[3]), np.sin(pel[3])
            bx, by = c * ex + s * ey, -s * ex + c * ey
            eyaw = wrap(yaw - pel[3])
            dist = np.hypot(bx, by)
            if dist < tol and abs(eyaw) < ytol:
                break
            vx, vy = 2.0 * bx, 2.0 * by
            sp = np.hypot(vx, vy)
            if sp > vmax:
                vx, vy = vx / sp * vmax, vy / sp * vmax
            if dist < tol:
                vx = vy = 0.0
            elif np.hypot(vx, vy) < 0.07:
                sp = np.hypot(vx, vy)
                vx, vy = vx / sp * 0.07, vy / sp * 0.07
            wz = float(np.clip(1.5 * eyaw, -0.4, 0.4))
            if abs(eyaw) < ytol:
                wz = 0.0
            a = self.cur.copy()
            a[0], a[1], a[3] = vx, vy, wz
            yield a
        yield from self.act_hold(settle)
        self.note("walk_done", [x, y, yaw], self.pel().round(3).tolist())

    def arm_move(self, side, q, n, grip=None):
        sl = slice(4, 11) if side == "L" else slice(11, 18)
        gi = 18 if side == "L" else 19
        q0 = self.cur[sl].copy()
        g0 = self.cur[gi]
        for i in range(n):
            s = (i + 1) / n
            s = 0.5 - 0.5 * np.cos(np.pi * s)
            self.cur[sl] = q0 + s * (q - q0)
            if grip is not None:
                self.cur[gi] = g0 + s * (grip - g0)
            a = self.cur.copy()
            a[0] = a[1] = a[3] = 0.0
            yield a

    def hand_to(self, side, Pw, yaw_w, n, grip=None, sag=0.02, hold=10, roll_w=0.0):
        """Move the grasp point along a straight world-frame line (IK re-solved
        against the measured pelvis pose, so base drift is compensated)."""
        sl = slice(4, 11) if side == "L" else slice(11, 18)
        gi = 18 if side == "L" else 19
        Pw = np.asarray(Pw, float)
        if getattr(self, "hand_w", None) is None or self.hand_side != side:
            pel = self.pel()
            p, _ = fk(self.cur[sl], side)
            Ry = _rpy(0, 0, pel[3])
            self.hand_w = pel[:3] + Ry @ (p + TORSO_IN_PELVIS - np.array([0, 0, sag]))
            self.hand_side = side
        P0 = self.hand_w.copy()
        g0 = self.cur[gi]
        q_start = self.cur[sl].copy()
        pel = self.pel()
        p = self.world_to_torso(Pw, pel)
        p[2] += sag
        q_goal, err = solve_ik(p, hand_R(yaw_w - pel[3], roll_w), side, q_start)
        joint_mode = np.abs(q_goal - q_start).max() > 0.6
        for i in range(n + hold):
            s = min(1.0, (i + 1) / n)
            s = 0.5 - 0.5 * np.cos(np.pi * s)
            Pt = P0 + s * (Pw - P0)
            if joint_mode and i < n:
                self.cur[sl] = q_start + s * (q_goal - q_start)
            elif i % 2 == 0 or i == n - 1:
                pel = self.pel()
                p = self.world_to_torso(Pw if joint_mode else Pt, pel)
                p[2] += sag
                R = hand_R(yaw_w - pel[3], roll_w)
                q, err = ik(p, R, side, self.cur[sl])
                self.cur[sl] += np.clip(q - self.cur[sl], -2 * IK_STEP, 2 * IK_STEP)
            if grip is not None:
                self.cur[gi] = g0 + s * (grip - g0)
            a = self.cur.copy()
            a[0] = a[1] = a[3] = 0.0
            yield a
        self.hand_w = Pw.copy()
        self.note("hand_to", side, np.round(Pw, 3).tolist(), round(err, 4))

    # -- the task -------------------------------------------------------------
    def script(self):
        # tuck arms so they clear the counter while walking
        self.cur[4:11] = TUCK_L
        self.cur[11:18] = TUCK_R
        yield from self.act_hold(1)
        pel0 = self.pel()
        im0 = self.tools.image("head")
        self.snap("start")
        PL = rack_points(im0, pel0, "L")
        PR = rack_points(im0, pel0, "R")
        yl = float(np.median(PL[:, 1])) if len(PL) > 20 else 0.25
        rp0 = rack_pose(PR) if len(PR) > 30 else None
        if rp0 is not None:
            _, cy = rack_to_world(rp0, (rp0["xf"] + rp0["xb"]) / 2, (rp0["y0"] + rp0["y1"]) / 2)
            ryaw0 = rp0["yaw"]
        else:
            cy, ryaw0 = -0.23, 0.0
        self.note("rough", yl, cy)

        # --- look at the right rack from straight in front of it: rails and pegs
        yield from self.walk(0.17, cy, ryaw0)
        pel = self.pel()
        im = self.tools.image("head")
        self.snap("rack_view")
        PR2 = rack_points(im, pel, "R")
        rp = rack_pose(PR2) if len(PR2) > 30 else rp0
        if rp is None:
            rp = dict(yaw=0.0, xf=0.41, xb=0.51, y0=-0.35, y1=-0.11)
        pegs = peg_positions(im, pel, rp)
        slot = self.choose_slot(pegs, (rp["y0"] + rp["y1"]) / 2)
        self.note("rackR", {k: round(float(v), 3) for k, v in rp.items()},
                  [np.round(p, 3).tolist() for p in pegs], round(slot, 3))
        B = rack_to_world(rp, (rp["xf"] + rp["xb"]) / 2, slot)
        ryaw = rp["yaw"]

        # --- view the plate from its right side, fit the disk, grasp the rim;
        # one retry if the fingers close on nothing
        view_y = yl - 0.12
        for attempt in range(2):
            plate, cost = None, 1.0
            for look in range(2):
                yield from self.walk(0.17, view_y, 0.0)
                pel = self.pel()
                im = self.tools.image("head")
                self.snap("plate_view")
                mask = plate_mask(im)
                y_guess = pel[1] + 0.1
                if mask.sum() > 15:
                    vs, us = np.nonzero(mask)
                    y_guess = float(pix_to_plane(us.mean(), vs.mean(), pel, PLATE_ZC)[0, 1])
                best = None
                for dy in (-0.03, 0.0, 0.03):
                    pp, c = fit_plate(mask, pel, [0.51, y_guess + dy, 0.0, 0.1])
                    if best is None or c < best[1]:
                        best = (pp, c)
                plate, cost = best
                self.note("plate_fit", look, np.round(plate, 3).tolist(), round(cost, 3))
                off = plate[1] - pel[1]
                if cost < 0.2 and 0.07 < off < 0.13 and not mask[:, :2].any():
                    break
                view_y = plate[1] - 0.1 if cost < 0.5 else view_y - 0.05
            plate = np.array([plate[0], plate[1], PLATE_ZC, plate[2], plate[3]])
            xc, yp, zc, psi, lean = plate
            top = np.array([xc, yp, zc]) + PLATE_R * (np.cos(lean) * np.array([0, 0, 1.0])
                                                      + np.sin(lean) * np.array([-np.sin(psi), np.cos(psi), 0]))
            self.plate = plate

            yield from self.walk(top[0] - HAND_NOM[0], top[1] - HAND_NOM[1], psi)
            g = top.copy()
            self.hand_w = None
            rl = -lean  # match the plate's lean so the pads close flat on it
            yield from self.hand_to("L", g + np.array([-0.2, 0.03, 0.10]), psi, 50, grip=0.0, roll_w=rl)
            yield from self.hand_to("L", g + np.array([-0.05, 0, 0.05]), psi, 35, grip=0.0, roll_w=rl)
            self.snap("pregrasp")
            yield from self.hand_to("L", g + np.array([0.0, 0, -GRASP_DZ]), psi, 35, grip=0.0, roll_w=rl)
            yield from self.act_hold(10)
            self.snap("grasp")
            for k in range(20):
                self.cur[18] = min(1.0, (k + 1) / 15)
                yield from self.act_hold(1)
            yield from self.act_hold(10)
            fingers = self.obs["low_dim_obs"][7:9]
            self.note("grip", attempt, fingers.round(4).tolist())
            self.snap("closed")
            if max(fingers) > -0.0185 or attempt == 1:  # a miss closes both fingers fully
                break
            # missed: open, back off, look again
            yield from self.hand_to("L", g + np.array([0.0, 0, -GRASP_DZ]), psi, 15, grip=0.0, roll_w=rl)
            yield from self.hand_to("L", g + np.array([-0.2, 0.03, 0.10]), psi, 40, grip=0.0, roll_w=rl)
            self.cur[4:11] = TUCK_L
            yield from self.act_hold(30)
            view_y = yp - 0.1
        zg = g[2] - GRASP_DZ
        yield from self.hand_to("L", np.array([g[0], g[1], zg + LIFT]), psi, 50, sag=0.03, roll_w=rl)
        # straighten the plate: the pads hold it rigidly, so it follows the hand
        yield from self.hand_to("L", np.array([g[0], g[1] - PLATE_R * np.sin(lean), zg + LIFT]), psi, 30, sag=0.03)
        self.snap("lifted")

        # --- carry: walk sideways until the hand is over the slot
        c, s = np.cos(ryaw), np.sin(ryaw)
        hx, hy = c * HAND_NOM[0] - s * HAND_NOM[1], s * HAND_NOM[0] + c * HAND_NOM[1]
        yield from self.walk(B[0] - hx, B[1] - hy, ryaw, vmax=0.2)
        self.note("grip_after_walk", self.obs["low_dim_obs"][7:9].round(4).tolist())
        self.snap("carried")

        # --- lower into the slot and release
        self.hand_w = None
        yield from self.insert(B, zg, ryaw)
        self.snap("lowered")
        for k in range(25):
            self.cur[18] = max(0.0, 1.0 - (k + 1) / 20)
            yield from self.act_hold(1)
        yield from self.act_hold(10)
        pel = self.pel()
        ph, _ = fk(self.cur[4:11], "L")
        self.hand_w = pel[:3] + _rpy(0, 0, pel[3]) @ (ph + TORSO_IN_PELVIS - np.array([0, 0, 0.03]))
        self.snap("released")
        yield from self.hand_to("L", np.array([B[0] - 0.05, B[1], zg + 0.12]), ryaw, 40, grip=0.0, sag=0.03)
        self.snap("done")
        while True:
            yield from self.act_hold(1)

    def insert(self, B, zg, ryaw):
        """Lower the plate into the slot; if it lands on a peg (hand stops going
        down, or the plate twists in the fingers) lift and retry shifted sideways."""
        c, s = np.cos(ryaw), np.sin(ryaw)
        for k, dy in enumerate((0.0, 0.016, -0.016)):
            Pk = np.array([B[0] - s * dy, B[1] + c * dy])
            yield from self.hand_to("L", np.array([Pk[0], Pk[1], zg + 0.14]), ryaw, 25, sag=0.03, hold=8)
            if k == 0:
                self.snap("over_slot")
            f0 = float(self.obs["low_dim_obs"][7:9].mean())
            bad = 0
            lag0 = 0.0
            n = 70
            for i in range(n):
                z = zg + 0.14 + (i + 1) / n * (PLACE_DZ - 0.14)
                if i % 2 == 0:
                    pel = self.pel()
                    p = self.world_to_torso(np.array([Pk[0], Pk[1], z]), pel)
                    p[2] += 0.03
                    q, _ = ik(p, hand_R(ryaw - pel[3]), "L", self.cur[4:11])
                    self.cur[4:11] += np.clip(q - self.cur[4:11], -IK_STEP, IK_STEP)
                a = self.cur.copy()
                a[0] = a[1] = a[3] = 0.0
                yield a
                lo = self.obs["low_dim_obs"]
                pel = self.pel()
                pa, _ = fk(np.asarray(lo[0:7], float), "L")
                za = pel[2] + (pa + TORSO_IN_PELVIS)[2]
                df = float(lo[7:9].mean()) - f0
                lag = za - z
                if i == 8:
                    lag0 = lag
                if i > 10 and z <= zg + 0.05 and lag - lag0 > 0.012:
                    break  # the plate stands on the rack: stop pushing
                if (lag > 0.025 or df > 0.002) and i > 5 and z > zg + 0.04:
                    bad += 1
                else:
                    bad = 0
                if bad >= 3:
                    break
            self.note("insert", k, round(dy, 3), i, bad, round(float(za - z), 3), round(float(lag0), 3), round(df, 4))
            self.hand_w = np.array([Pk[0], Pk[1], z])
            if bad < 3:
                yield from self.act_hold(15)
                return
        yield from self.act_hold(10)

    @staticmethod
    def choose_slot(pegs, ymid):
        """Slot next to the middle peg. The rails carry 7 pegs 4 cm apart with the
        middle one at the rack centre; the detected pegs fix the grid phase."""
        dets = np.array([p for pl in pegs for p in pl], float)
        centre = ymid
        if len(dets) >= 3:
            best = None
            for ph in np.arange(-0.02, 0.02, 0.001):
                grid = ymid + ph + PEG_PITCH * np.arange(-3, 4)
                d = np.abs(dets[:, None] - grid[None, :]).min(1)
                score = float(np.exp(-(d / 0.006) ** 2).sum()) - 2.0 * abs(ph)
                if best is None or score > best[0]:
                    best = (score, ph)
            centre = ymid + best[1]
        return float(centre + PEG_PITCH / 2)

    def act(self, obs, tools):
        self.obs = obs
        try:
            a = next(self.gen)
        except StopIteration:
            a = self.cur.copy()
            a[0] = a[1] = a[3] = 0.0
        return np.asarray(a, dtype=np.float32)
