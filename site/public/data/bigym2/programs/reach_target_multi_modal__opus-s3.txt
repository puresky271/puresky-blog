"""Touch the red sphere with either hand (Unitree G1, scripted).

Pipeline
  1. Locate the sphere in the head camera: fit a circle (in ray space) to the
     red blob boundary -> direction + angular radius -> 3D point, using a
     pinhole model of the head camera calibrated from the floor checkerboard.
  2. Store the target in world coordinates (pelvis odometry) and walk the base
     so the target sits at a comfortable spot in front of one shoulder.
  3. Re-observe, then reach with an analytic G1 arm model + numerical IK:
     sweep the hand forward through the estimate; the sphere lights up while
     touched, so the lit stretch of the sweep gives the touch-zone centre
     (then z / y sweeps if needed), and the hand holds there.
The arms hang down (out of the head camera view) until the reach starts.
"""

import cv2
import numpy as np
from scipy.optimize import least_squares

# ---------------------------------------------------------------- camera model
F = 72.746          # focal length in px (fovy 60 deg, 84 px)
CX = CY = 41.5
CAM_PITCH = 1.093   # rad below horizontal
CAM_OFF = np.array([0.07, 0.0, 0.40])   # head camera position in pelvis frame
R_SPHERE = 0.047    # effective sphere radius for the boundary detector


def cam_R(th, psi=0.0):
    """Camera->frame rotation (camera x right, y down, z forward)."""
    z = np.array([np.cos(th) * np.cos(psi), np.cos(th) * np.sin(psi), -np.sin(th)])
    x = np.array([np.sin(psi), -np.cos(psi), 0.0])
    y = np.cross(z, x)
    return np.stack([x, y, z], 1)


R_CAM = cam_R(CAM_PITCH)


def red_mask(im):
    im = im.astype(np.int32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return (r > 40) & (r > 2 * g + 8) & (r > 2 * b + 8)


def bright_count(im):
    im = im.astype(np.int32)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return int(((r > 215) & (g < 110) & (b < 110)).sum())


def fit_sphere(im):
    """Fit the red blob. Returns (unit ray in camera frame, angular radius, n boundary pts)."""
    m = red_mask(im)
    if m.sum() < 4:
        return None
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    mk = (lab == k).astype(np.uint8)
    cs, _ = cv2.findContours(mk, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    pts = np.concatenate([c.reshape(-1, 2) for c in cs], 0).astype(float)
    h, w = m.shape
    keep = (pts[:, 0] > 0) & (pts[:, 0] < w - 1) & (pts[:, 1] > 0) & (pts[:, 1] < h - 1)
    pts = pts[keep]
    if len(pts) < 6:
        return None
    ys, xs = np.nonzero(mk)
    rays = np.stack([(pts[:, 0] - CX) / F, (pts[:, 1] - CY) / F, np.ones(len(pts))], 1)
    rays /= np.linalg.norm(rays, axis=1, keepdims=True)

    def dirf(p):
        d = np.array([p[0], p[1], 1.0])
        return d / np.linalg.norm(d)

    x0 = [(xs.mean() - CX) / F, (ys.mean() - CY) / F, np.sqrt(mk.sum() / np.pi) / F]

    def res(p):
        return np.arccos(np.clip(rays @ dirf(p[:2]), -1, 1)) - p[2]

    r = least_squares(res, x0)
    return dirf(r.x[:2]), r.x[2] + 0.5 / F, len(pts)


def locate(im):
    """Sphere centre in the pelvis frame (x fwd, y left, z up rel. pelvis)."""
    s = fit_sphere(im)
    if s is None:
        return None
    d, alpha, npts = s
    if alpha <= 0.01:
        return None
    D = R_SPHERE / np.sin(alpha)
    return R_CAM @ (D * d) + CAM_OFF, npts


# ------------------------------------------------------------------ arm model
def rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


TORSO = np.array([-0.0039635, 0, 0.054])
Q16 = 2 * np.arcsin(0.139201)
TOOL = np.array([0.10, 0.0, 0.0])


def fk(q, side):
    """Tool point and wrist rotation (pelvis frame) for arm joints q (7)."""
    s = side
    R = np.eye(3)
    p = TORSO + np.array([0.0039563, s * 0.10022, 0.23778])
    R = rx(s * Q16) @ ry(q[0])
    p = p + R @ np.array([0, s * 0.038, -0.013831])
    R = R @ rx(-s * Q16) @ rx(q[1])
    p = p + R @ np.array([0, s * 0.00624, -0.1032])
    R = R @ rz(q[2])
    p = p + R @ np.array([0.015783, 0, -0.080518])
    R = R @ ry(q[3])
    p = p + R @ np.array([0.1, s * 0.00188791, -0.01])
    R = R @ rx(q[4])
    p = p + R @ np.array([0.038, 0, 0])
    R = R @ ry(q[5])
    p = p + R @ np.array([0.046, 0, 0])
    R = R @ rz(q[6])
    return p + R @ TOOL, R


IDX = [0, 1, 2, 3, 5]   # joints used by the IK: shoulder pitch/roll/yaw, elbow, wrist pitch


# sane working ranges (left arm) for sp, sr, sy, el, wp; roll/yaw mirrored for the right arm
W_LO = np.array([-1.9, 0.0, -0.9, -0.9, -1.0])
W_HI = np.array([0.5, 0.9, 0.9, 1.6, 1.0])


def limits(side):
    lo, hi = W_LO.copy(), W_HI.copy()
    if side < 0:
        for i in (1, 2):
            lo[i], hi[i] = -W_HI[i], -W_LO[i]
    return lo, hi


def ik(p, side, q0=None, approach=np.array([1.0, 0, 0]), w_ori=0.05):
    lo, hi = limits(side)
    if q0 is None:
        starts = [np.clip(np.array(s, float) * np.array([1, side, side, 1, 1]), lo + 1e-3, hi - 1e-3)
                  for s in [(-0.3, 0.1, 0, -0.5, 0), (-0.8, 0.1, 0, -0.3, 0), (-0.5, 0.2, 0, 0.3, 0),
                            (-1.2, 0.1, 0, 0.3, 0), (0, 0, 0, 0, 0)]]
    else:
        starts = [np.clip(np.asarray(q0)[IDX], lo + 1e-3, hi - 1e-3)]

    def res(x):
        q = np.zeros(7)
        q[IDX] = x
        tip, R = fk(q, side)
        return np.r_[(tip - p) * 30, w_ori * (R[:, 0] - approach), 0.003 * x]

    best = None
    for s0 in starts:
        r = least_squares(res, s0, bounds=(lo, hi))
        if best is None or r.cost < best.cost:
            best = r
    q = np.zeros(7)
    q[IDX] = best.x
    return q, float(np.linalg.norm(fk(q, side)[0] - p))


# --------------------------------------------------------------------- policy
def to_world(p_rel, pel):
    x, y, z, yaw = pel
    c, s = np.cos(yaw), np.sin(yaw)
    return np.array([x + c * p_rel[0] - s * p_rel[1], y + s * p_rel[0] + c * p_rel[1], z + p_rel[2]])


def to_rel(p_w, pel):
    x, y, z, yaw = pel
    c, s = np.cos(yaw), np.sin(yaw)
    dx, dy = p_w[0] - x, p_w[1] - y
    return np.array([c * dx + s * dy, -s * dx + c * dy, p_w[2] - z])


X_DES = 0.32      # desired target x in pelvis frame before reaching
Y_DES = 0.12      # desired |y| of target (in front of the reaching shoulder)
SX0, SX1 = -0.06, 0.08   # x sweep range (relative to the estimate)
SW = 0.05                # half range of the lateral (z, y) sweeps
S_SPEED = 0.0015         # sweep speed, m per control step
V_MOVE = 0.003           # repositioning speed, m per control step
KI = 0.05                # joint-space integral gain (gravity sag)
# x-sweep lines (dy, dz) tried in turn around the estimate
OFFSETS = [(0, 0), (0, 0.025), (0, -0.025), (0.025, 0), (-0.025, 0), (0.025, 0.025), (-0.025, 0.025),
           (0.025, -0.025), (-0.025, -0.025), (0, 0.05), (0, -0.05), (0.05, 0), (-0.05, 0)]
AXES = {"x": 0, "y": 1, "z": 2}
BASE0 = np.array([0.01, 0.0, 0.02])   # systematic offset of the touch zone from the estimate
# arms hang down while observing/walking so the grippers never hide the sphere
CLEAR_L = np.array([0.0, 0.15, 0.0, 1.3, 0.0, 0.0, 0.0])
CLEAR_R = np.array([0.0, -0.15, 0.0, 1.3, 0.0, 0.0, 0.0])
T_CLEAR = 30        # steps for the arms to get out of the view
SETTLE = 70         # steps standing still after the walk
SETTLE_OBS = 40     # observe from this step of the settle phase on


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float64)
        self.phase = "observe"
        self.t0 = 0
        self.obs_buf = []
        self.target_w = None
        self.side = 1
        self.q = np.zeros(7)
        self.qi = np.zeros(7)
        self.log = []
        self.line = 0
        self.base = np.zeros(3)      # centre of the current search (offset from estimate)
        self.g = np.zeros(3)         # commanded tip offset from the estimate
        self.mode = None
        self.unlit = 0

    def pel(self, obs):
        return np.asarray(obs["low_dim_obs"][18:22], dtype=np.float64)

    def observe(self, obs, tools):
        im = tools.image("head")
        r = locate(im)
        if r is None:
            return None
        p, npts = r
        return to_world(p, self.pel(obs)), npts

    # ------------------------------------------------------------ search program
    def start_xsweep(self):
        dy, dz = OFFSETS[self.line % len(OFFSETS)]
        c = self.base + np.array([0.0, dy, dz])
        self.go(c + np.array([SX0, 0, 0]), ("sweep", "x", c[0] + SX1))

    def go(self, p, then):
        self.g_to = np.asarray(p, float)
        self.mode = "move"
        self.after = then

    def begin_sweep(self, axis, end):
        self.mode = "sweep"
        self.axis = axis
        self.end = end
        self.end0 = end
        self.lit_vals = []
        self.unlit = 0

    def sweep_done(self):
        ax = AXES[self.axis]
        if self.lit_vals:
            v = np.array(self.lit_vals)
            centre = 0.5 * (v.min() + v.max())
        else:
            centre = None
        self.log.append(("sweep", self.axis, None if centre is None else round(float(centre), 4),
                         len(self.lit_vals), self.base.round(3).tolist()))
        if self.axis == "x":
            if centre is None:
                self.line += 1
                self.start_xsweep()
                return
            dy, dz = OFFSETS[self.line % len(OFFSETS)]
            self.cur = np.array([centre, self.base[1] + dy, self.base[2] + dz])
            self.go(self.cur, ("hold", "x"))
        elif self.axis == "z":
            if centre is not None:
                self.cur[2] = centre
            self.go(self.cur + np.array([0, -SW, 0]), ("sweep", "y", self.cur[1] + SW))
        else:
            if centre is not None:
                self.cur[1] = centre
            self.go(self.cur, ("hold",))

    def step_search(self, lit, tip_off):
        m = self.mode
        if m == "move":
            d = self.g_to - self.g
            n = np.linalg.norm(d)
            if n <= V_MOVE:
                self.g = self.g_to.copy()
                if self.after[0] == "sweep":
                    self.begin_sweep(self.after[1], self.after[2])
                else:
                    self.mode = "hold"
                    self.hold_kind = self.after[1] if len(self.after) > 1 else "final"
                    self.unlit = 0
            else:
                self.g = self.g + d / n * V_MOVE
        elif m == "sweep":
            ax = AXES[self.axis]
            if lit:
                self.lit_vals.append(tip_off[ax])
                self.unlit = 0
            else:
                self.unlit += 1
            if lit and self.g[ax] >= self.end and self.end < self.end0 + 0.04:
                self.end += S_SPEED   # still lit at the end of the range: keep going
            if (self.lit_vals and self.unlit >= 3) or self.g[ax] >= self.end:
                self.sweep_done()
            else:
                self.g[ax] += S_SPEED
        elif m == "hold":
            self.unlit = 0 if lit else self.unlit + 1
            if self.hold_kind == "x" and self.unlit > 20:
                # x centre alone is not enough: centre z, then y
                self.go(self.cur + np.array([0, 0, -SW]), ("sweep", "z", self.cur[2] + SW))
            elif self.unlit > 40:
                # lost it: search again around the last centre
                self.base = self.cur.copy()
                self.line = 0
                self.start_xsweep()

    # ------------------------------------------------------------------- act
    def act(self, obs, tools):
        t = int(obs["t"])
        a = self.hold.copy()
        pel = self.pel(obs)
        low = np.asarray(obs["low_dim_obs"], dtype=np.float64)
        # both arms hang clear; the reaching arm is overwritten in the reach phase
        a[4:11] = CLEAR_L
        a[11:18] = CLEAR_R

        if self.phase == "observe":
            r = self.observe(obs, tools) if t >= T_CLEAR else None
            if r is not None and r[1] >= 20:
                self.obs_buf.append(r[0])
            self.log.append(("obs", t, pel.round(3).tolist(), None if r is None else (r[0].round(3).tolist(), r[1])))
            if len(self.obs_buf) >= 8:
                self.target_w = np.median(np.array(self.obs_buf), 0)
                self.first_w = self.target_w.copy()
                rel = to_rel(self.target_w, pel)
                self.side = 1 if rel[1] >= 0 else -1
                self.phase = "walk"
                self.t0 = t
            elif T_CLEAR + 10 < t < T_CLEAR + 160:
                a[0] = 0.12   # sphere not well visible: creep forward
            return a

        rel = to_rel(self.target_w, pel)

        if self.phase == "walk":
            ex = rel[0] - X_DES
            ey = rel[1] - self.side * Y_DES
            if abs(ex) < 0.02 and abs(ey) < 0.02 or t - self.t0 > 250:
                self.phase = "settle"
                self.t0 = t
                self.obs_buf = []
                self.log.append(("walked", t, pel.round(3).tolist(), rel.round(3).tolist()))
            else:
                vx = np.clip(1.5 * ex, -0.25, 0.25)
                vy = np.clip(1.5 * ey, -0.25, 0.25)
                sp = np.hypot(vx, vy)
                if sp < 0.07:
                    k = 0.07 / max(sp, 1e-6)
                    vx, vy = vx * k, vy * k
                a[0], a[1] = vx, vy
            return a

        if self.phase == "settle":
            if t - self.t0 >= SETTLE_OBS:
                r = self.observe(obs, tools)
                if r is not None and r[1] >= 20:
                    self.obs_buf.append(r[0])
                self.log.append(("settle", t, pel.round(3).tolist(), None if r is None else (r[0].round(3).tolist(), r[1])))
            if t - self.t0 >= SETTLE:
                if len(self.obs_buf) >= 5:
                    est = np.median(np.array(self.obs_buf), 0)
                    if np.linalg.norm(est - self.first_w) < 0.08:
                        self.target_w = est
                self.log.append(("target", t, self.target_w.round(3).tolist(), self.first_w.round(3).tolist()))
                self.phase = "reach"
                self.t0 = t
                self.line = 0
                self.base = BASE0.copy()
                dy, dz = OFFSETS[0]
                self.g = self.base + np.array([SX0, dy, dz])
                self.start_xsweep()
                self.q_from = (CLEAR_L if self.side > 0 else CLEAR_R).copy()
                rel = to_rel(self.target_w, pel)
            else:
                return a

        # ---------------- reach
        side = self.side
        sl = slice(4, 11) if side > 0 else slice(11, 18)
        qm = low[0:7] if side > 0 else low[9:16]
        tip_off = fk(qm, side)[0] - rel
        lit = bright_count(tools.image("head")) >= 3
        tau = t - self.t0
        if tau >= 40:
            self.step_search(lit, tip_off)
        q, err = ik(rel + self.g, side, None if tau == 0 else self.q)
        self.q = q
        if tau < 40:
            w = (tau + 1) / 40.0
            cmd = (1 - w) * self.q_from + w * q
        else:
            self.qi[IDX] = np.clip(self.qi[IDX] + KI * (q - qm)[IDX], -0.15, 0.15)
            cmd = q + self.qi
        a[sl] = cmd
        self.log.append(("reach", t, self.mode, self.line, self.g.round(4).tolist(), tip_off.round(4).tolist(),
                         rel.round(3).tolist(), round(err, 4), int(lit)))
        return a
