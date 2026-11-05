"""Scripted G1 policy: take the plate from the left dish rack, stand it in the right rack.

Hand-written control, no learned components:
  * analytic G1 arm kinematics + numeric IK (scipy least squares),
  * base position / yaw feedback from the pelvis pose,
  * a pinhole model of the head camera (calibrated by hand from gripper
    positions) to measure where the racks are in the first frame,
  * colour / brightness features in the left wrist camera for visual servoing
    (plate rim before the grasp, peg tips of the target rack before release).
Constants were tuned by running episodes on the development seeds.
"""

import cv2  # noqa: F401
import numpy as np
from scipy.ndimage import center_of_mass, label
from scipy.optimize import least_squares


# ----------------------------------------------------------------------------
# Kinematics (G1 arm, pelvis frame: x forward, y left, z up)
# ----------------------------------------------------------------------------
def _rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def _ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def _rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


_AX = {"x": _rx, "y": _ry, "z": _rz}
_TORSO = np.array([-0.0039635, 0, 0.044])
TOOL = np.array([0.165, 0, 0])


def _chain(side):
    s = 1 if side == "L" else -1
    return [
        (np.array([0.0039563, s * 0.10022, 0.24778]), _rx(s * 0.27931), "y"),
        (np.array([0, s * 0.038, -0.013831]), _rx(-s * 0.27925), "x"),
        (np.array([0, s * 0.00624, -0.1032]), np.eye(3), "z"),
        (np.array([0.015783, 0, -0.080518]), np.eye(3), "y"),
        (np.array([0.100, s * 0.00188791, -0.010]), np.eye(3), "x"),
        (np.array([0.038, 0, 0]), np.eye(3), "y"),
        (np.array([0.046, 0, 0]), np.eye(3), "z"),
    ]


_CH = {"L": _chain("L"), "R": _chain("R")}


def fk(q, side="L", tool=TOOL):
    p = _TORSO.copy()
    R = np.eye(3)
    for (o, R0, ax), qi in zip(_CH[side], q):
        p = p + R @ o
        R = R @ R0 @ _AX[ax](qi)
    return p + R @ tool, R


LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])
MIR = np.array([1, -1, -1, 1, -1, 1, -1])


def ik(target, fwd, up, q0, side="L", reg=0.01, w=1.0, wf=0.2, q_nom=None, wn=0.005):
    """Tip position + finger axis (up) + soft approach axis (fwd) IK, warm-started at q0."""
    lo, hi = LO, HI
    qn = q0 if q_nom is None else q_nom

    def res(q):
        t, R = fk(q, side)
        return np.concatenate([t - target, wf * (R[:, 0] - fwd), w * (R[:, 1] - up), reg * (q - q0), wn * (q - qn)])

    s = least_squares(res, np.clip(q0, lo + 1e-4, hi - 1e-4), bounds=(lo, hi), max_nfev=60)
    t, _ = fk(s.x, side)
    return s.x, float(np.linalg.norm(t - target))


# ----------------------------------------------------------------------------
# Head camera model (pelvis frame), fitted to gripper-tip pixels.
# ----------------------------------------------------------------------------
CAM_POS = np.array([0.103236, -0.002438, 0.444112])
CAM_R = _rz(0.008749) @ _ry(1.068484) @ _rx(-0.019419)
CAM_F = 82.43935


def pix_to_plane(u, v, zp):
    """Head pixel (u col, v row) -> pelvis-frame point on the plane z = zp."""
    d = CAM_R @ np.array([1.0, (42 - u) / CAM_F, (42 - v) / CAM_F])
    t = (zp - CAM_POS[2]) / d[2]
    return CAM_POS + t * d


def brown_mask(img):
    im = img.astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return (r - b > 40) & (r > g) & (g > b)


def rack_features(img):
    """Front-rail row and end columns of the left / right rack in the first head frame."""
    m = brown_mask(img)
    out = {}
    for name, (c0, c1) in (("L", (0, 42)), ("R", (42, 84))):
        mm = np.zeros_like(m)
        mm[:, c0:c1] = m[:, c0:c1]
        rows = mm.sum(axis=1).astype(float)
        cand = np.nonzero(rows >= 6)[0]
        if len(cand) == 0:
            out[name] = None
            continue
        fr = cand.max()
        lo = max(0, fr - 2)
        w = rows[lo:fr + 1]
        frow = float((np.arange(lo, fr + 1) * w).sum() / w.sum())
        ys, xs = np.nonzero(mm[lo:fr + 1])
        out[name] = (frow, float(xs.min()), float(xs.max()))
    return out


def rack_world(feat, side):
    """World (x, y) of the inner rail end (left rack: right end, right rack: left end)."""
    frow, cmin, cmax = feat
    u = cmax + 0.5 if side == "L" else cmin - 0.5
    p = pix_to_plane(u, frow, RAIL_Z - START_PELVIS[2])
    return np.array([p[0] + START_PELVIS[0], p[1] + START_PELVIS[1]])


START_PELVIS = np.array([-0.0711, -0.0028, 0.7467])
RAIL_Z = 0.72
# seed-87 reference features (the seed the grasp / place targets were tuned on)
REF_L = (16.67, 0.0, 23.0)
REF_R = (22.52, 58.0, 83.0)


# ----------------------------------------------------------------------------
# Wrist camera features
# ----------------------------------------------------------------------------
def plate_col(img, rows=(0, 31), win=10, min_rows=8):
    """Column of the plate (neutral grey / specular band) in the left wrist image."""
    im = img[rows[0]:rows[1]].astype(int)
    mx = im.max(axis=2)
    mn = im.min(axis=2)
    m = ((mx - mn) < 12) & ((mx < 150) | (mn >= 238))
    m[:, :6] = False
    m[:, 78:] = False
    cnt = m.sum(axis=0).astype(float)
    cs = np.convolve(cnt, np.ones(win), "same")
    j = int(np.argmax(cs))
    if cs[j] < 20:
        return None
    lo, hi = max(0, j - win // 2), min(img.shape[1], j + win // 2 + 1)
    band = m[:, lo:hi].any(axis=1)
    if band.sum() < min_rows:
        return None
    w = cnt[lo:hi]
    return float((np.arange(lo, hi) * w).sum() / w.sum())


def peg_front_row(img, rmax=40):
    """Peg tips of the front row of the target rack: (mean row, wrapped column phase error)."""
    im = img[:rmax].astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    tips = (r >= 235) & (g >= 225) & (r - b >= 28)
    lab, n = label(tips)
    if n < 1:
        return None
    pegs = np.array(center_of_mass(tips, lab, range(1, n + 1)))
    front = pegs[pegs[:, 0] >= pegs[:, 0].max() - 5]
    s = PEG_SPACING_PX
    ang = 2 * np.pi * (front[:, 1] - PEG_COL_REF) / s
    e = np.arctan2(np.mean(np.sin(ang)), np.mean(np.cos(ang))) / (2 * np.pi) * s
    return float(front[:, 0].mean()), float(e), len(front)


PEG_SPACING_PX = 13.5
PEG_COL_REF = 29.7  # a front peg tip sits here when the plate is over a slot
PEG_ROW_REF = 21.5
PEG_ROW_PX_PER_M = 300.0

# ----------------------------------------------------------------------------
# Task constants (world frame unless noted)
# ----------------------------------------------------------------------------
Q_TUCK_L = np.array([0.19, 0.29, 0.31, -0.77, -0.4, 0.58, -0.08])
Q_PG_L = np.array([-1.753, 0.846, -0.503, 0.96, -0.612, 1.552, -0.3])

APPROACH_X = 0.04
F_APP = np.array([0.63, 0.0, -0.77]) / np.linalg.norm([0.63, 0.0, -0.77])
G_W = np.array([0.462, 0.26, 0.872]) + 0.035 * F_APP  # grasp point (measured tip) on seed 87
PRE_DIST = 0.10
H_W = np.array([0.35, 0.26, 1.08])  # hand waypoint while walking in
LIFT_VEC = np.array([-0.06, 0.0, 0.15])
COL_TARGET = 45.0
PX_PER_M = 450.0
KI = 0.06
I_MAX = 0.06
SURVEY_UP = np.array([0.0, 0.0, 0.12])
SURVEY_COL = 40.0
SURVEY_PX_PER_M = 450.0

P_W = np.array([0.395, -0.222, 1.0])  # hover point (measured tip) over the right rack on seed 87
PLACE_DZ = 0.14  # lowering before release
CARRY_V = 0.10
HAND_OFF_Y = 0.24  # pelvis-frame y of the left hand when placing
PEG_PX_PER_M = 365.0


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float64)
        self.phase = "tuck"
        self.k = 0  # steps in phase
        self.arms = np.zeros(14)
        self.grip = np.array([1.0, 1.0])
        self.debug = []
        self.log = []
        self.qL = Q_PG_L.copy()
        self.T = None  # world target of the left tool tip
        self.Tf = F_APP.copy()
        self.Tu = np.array([0.0, 1.0, 0.0])
        self.I = np.zeros(3)
        # rack offsets relative to seed 87 from the first head frame
        self.dL = np.zeros(2)
        self.dR = np.zeros(2)
        try:
            f = rack_features(tools.image("head"))
            if f["L"] is not None:
                self.dL = rack_world(f["L"], "L") - rack_world(REF_L, "L")
            if f["R"] is not None:
                self.dR = rack_world(f["R"], "R") - rack_world(REF_R, "R")
            self.log.append(("racks", f, self.dL, self.dR))
        except Exception as exc:  # keep going with nominal targets
            self.log.append(("rack_err", repr(exc)))
        self.dL = np.clip(self.dL, -0.08, 0.08)
        self.dR = np.clip(self.dR, -0.08, 0.08)
        self.G = G_W + np.array([self.dL[0], self.dL[1], 0.0])
        self.P = P_W + np.array([self.dR[0], self.dR[1], 0.0])
        self.stance_place = np.array([APPROACH_X, self.P[1] - HAND_OFF_Y])

    # -- frames
    def pel(self, obs):
        l = obs["low_dim_obs"]
        return l[18], l[19], l[20], l[21]

    def to_pelvis(self, obs, pw):
        x, y, z, th = self.pel(obs)
        d = np.asarray(pw) - np.array([x, y, z])
        c, s = np.cos(th), np.sin(th)
        return np.array([c * d[0] + s * d[1], -s * d[0] + c * d[1], d[2]])

    def to_world(self, obs, pp):
        x, y, z, th = self.pel(obs)
        c, s = np.cos(th), np.sin(th)
        return np.array([x + c * pp[0] - s * pp[1], y + s * pp[0] + c * pp[1], z + pp[2]])

    def rot_to_pelvis(self, obs, v):
        th = self.pel(obs)[3]
        c, s = np.cos(th), np.sin(th)
        return np.array([c * v[0] + s * v[1], -s * v[0] + c * v[1], v[2]])

    def track_left(self, obs, integrate=True, moving=None):
        """IK the left tool tip onto the world target self.T (with measured-tip integral correction).

        While moving along direction `moving`, only the error perpendicular to it is integrated
        (sag), not the tracking lag along the path.
        """
        if integrate:
            meas = self.to_world(obs, fk(obs["low_dim_obs"][0:7], "L")[0])
            e = self.T - meas
            if moving is not None:
                e = e - moving * float(moving @ e)
            self.I = np.clip(self.I + KI * e, -I_MAX, I_MAX)
        tp = self.to_pelvis(obs, self.T + self.I)
        f = self.rot_to_pelvis(obs, self.Tf)
        u = self.rot_to_pelvis(obs, self.Tu)
        q, e = ik(tp, f, u, self.qL, "L", q_nom=Q_PG_L)
        self.qL = q
        self.arms[:7] = q
        return e

    def base_cmd(self, obs, xt=None, yt=None, yawt=0.0, vmax=0.2, tol=0.012, tolx=None, vmin=0.09):
        x, y, z, th = self.pel(obs)
        wz = float(np.clip(2.0 * (yawt - th), -0.5, 0.5))
        if abs(yawt - th) < 0.01:
            wz = 0.0
        if xt is None:
            return 0.0, 0.0, wz, True
        ex, ey = xt - x, yt - y
        c, s = np.cos(th), np.sin(th)
        bx, by = c * ex + s * ey, -s * ex + c * ey
        dist = np.hypot(ex, ey)
        if dist < tol or (tolx is not None and abs(ex) < tolx and abs(ey) < tol):
            return 0.0, 0.0, wz, True
        v = np.array([1.0 * bx, 1.0 * by])
        n = np.linalg.norm(v)
        if n > vmax:
            v *= vmax / n
        if n < vmin:
            v *= vmin / max(n, 1e-6)
        return float(v[0]), float(v[1]), wz, False

    def snap(self, tools, tag):
        if getattr(self, "debug_on", False):
            self.debug.append((tag, [tools.image(c) for c in ("head", "left_wrist", "right_wrist")]))

    def next(self, phase):
        self.phase = phase
        self.k = 0

    def move_T(self, obs, k, n, start, goal, integrate=None):
        a = min(1.0, (k + 1) / n)
        self.T = start + (goal - start) * a
        d = goal - start
        nd = float(np.linalg.norm(d))
        moving = d / nd if (a < 1.0 and nd > 1e-6) else None
        if integrate is None:
            integrate = True
        return self.track_left(obs, integrate=integrate, moving=moving)

    # -- main
    def act(self, obs, tools):
        try:
            return self._act(obs, tools)
        except Exception as exc:  # never crash the episode: hold the last targets
            self.log.append(("act_err", self.phase, repr(exc)))
            raw = self.hold.copy()
            raw[4:18] = self.arms
            raw[18:20] = self.grip
            return raw

    def _act(self, obs, tools):
        k = self.k
        self.k += 1
        vx = vy = wz = 0.0
        ph = self.phase
        if ph == "tuck":
            if k == 0:
                h_p = H_W + np.array([self.dL[0], self.dL[1], 0]) - np.array([APPROACH_X, 0.0, START_PELVIS[2]])
                self.qA, _ = ik(h_p, self.Tf, self.Tu, Q_PG_L, "L")
            tuck = np.concatenate([Q_TUCK_L, Q_TUCK_L * MIR])
            self.arms = tuck * min(1.0, (k + 1) / 30)
            if k >= 30:
                self.next("raise")
        elif ph == "raise":
            a = min(1.0, (k + 1) / 40)
            self.arms[:7] = Q_TUCK_L + (self.qA - Q_TUCK_L) * a
            if k >= 45:
                self.next("approach")
        elif ph == "approach":
            vx, vy, wz, done = self.base_cmd(obs, APPROACH_X, 0.0, tolx=0.035, tol=0.03)
            if (done and k > 10) or k > 200:
                self.next("settle")
        elif ph == "settle":
            _, _, wz, _ = self.base_cmd(obs)
            if k >= 20:
                self.snap(tools, "settled")
                self.qL = self.arms[:7].copy()
                self.Tstart = self.to_world(obs, fk(self.arms[:7], "L")[0])
                self.next("to_pg")
        elif ph == "to_pg":
            _, _, wz, _ = self.base_cmd(obs)
            self.move_T(obs, k, 30, self.Tstart, self.G - self.Tf * PRE_DIST + SURVEY_UP)
            if k == 10:
                self.grip[0] = 0.0
            if k >= 45:
                self.snap(tools, "survey")
                self.scols = []
                self.next("survey")
        elif ph == "survey":
            _, _, wz, _ = self.base_cmd(obs)
            self.track_left(obs)
            if k % 10 == 9:
                col = plate_col(tools.image("left_wrist"))
                self.scols.append(col)
                if col is not None:
                    err = col - SURVEY_COL
                    self.G[1] -= 0.7 * err / SURVEY_PX_PER_M
                    self.T = self.G - self.Tf * PRE_DIST + SURVEY_UP
                    if abs(err) < 3.0 and k > 20:
                        self.k = 1000
                if k > 10 * 10:
                    self.k = 1000
            if self.k >= 1000:
                self.log.append(("survey", [None if c is None else round(c, 1) for c in self.scols]))
                self.stance = np.array([APPROACH_X, 0.0])
                if abs(self.G[1] - G_W[1]) > 0.04:
                    self.stance[1] = self.G[1] - G_W[1]
                self.next("recenter")
        elif ph == "recenter":
            self.track_left(obs, integrate=False)
            vx, vy, wz, done = self.base_cmd(obs, *self.stance, vmax=0.12, tol=0.015, tolx=0.04)
            if (done and k > 5) or k > 150:
                self.next("resettle")
        elif ph == "resettle":
            _, _, wz, _ = self.base_cmd(obs)
            self.track_left(obs)
            if k >= 20:
                self.Tstart = self.T.copy()
                self.next("to_pg2")
        elif ph == "to_pg2":
            _, _, wz, _ = self.base_cmd(obs)
            self.move_T(obs, k, 25, self.Tstart, self.G - self.Tf * PRE_DIST)
            if k >= 35:
                self.snap(tools, "pregrasp")
                self.prev_err = None
                self.again = 0.6
                self.next("align")
        elif ph == "align":
            _, _, wz, _ = self.base_cmd(obs)
            self.track_left(obs)
            if k % 10 == 9:
                col = plate_col(tools.image("left_wrist"))
                self.log.append(("align", k, col))
                if col is not None:
                    err = col - COL_TARGET
                    if self.prev_err is not None and np.sign(err) != np.sign(self.prev_err):
                        self.again *= 0.5
                    self.prev_err = err
                    self.G[1] -= self.again * err / PX_PER_M  # hand +y moves the plate right in the image
                    self.T = self.G - self.Tf * PRE_DIST
                    if abs(err) < 2.0:
                        self.next("advance")
                if k > 10 * 12:
                    self.next("advance")
        elif ph == "advance":
            _, _, wz, _ = self.base_cmd(obs)
            if k == 0:
                self.Tadv0 = self.T.copy()
            self.move_T(obs, k, 40, self.Tadv0, self.G)
            if k >= 70:
                self.snap(tools, "advanced")
                self.next("close")
        elif ph == "close":
            _, _, wz, _ = self.base_cmd(obs)
            self.track_left(obs)
            self.grip[0] = 1.0
            if k >= 25:
                self.snap(tools, "closed")
                self.Tl0 = self.T.copy()
                self.next("lift")
        elif ph == "lift":
            _, _, wz, _ = self.base_cmd(obs)
            up = np.array([0.0, 0.0, LIFT_VEC[2]])
            if k < 50:
                self.move_T(obs, k, 45, self.Tl0, self.Tl0 + up)
            else:
                self.move_T(obs, k - 50, 25, self.Tl0 + up, self.Tl0 + LIFT_VEC)
            if k >= 85:
                self.snap(tools, "lifted")
                self.qcarry = self.arms[:7].copy()
                self.next("carry")
        elif ph == "carry":
            self.arms[:7] = self.qcarry
            vx, vy, wz, done = self.base_cmd(obs, *self.stance_place, vmax=CARRY_V, tol=0.015, tolx=0.06)
            if done and k > 10:
                self.next("csettle")
        elif ph == "csettle":
            _, _, wz, _ = self.base_cmd(obs)
            if k >= 20:
                self.qL = self.arms[:7].copy()
                self.Tstart = self.to_world(obs, fk(self.arms[:7], "L")[0])
                self.next("hover")
        elif ph == "hover":
            _, _, wz, _ = self.base_cmd(obs)
            self.move_T(obs, k, 40, self.Tstart, self.P)
            if k >= 50:
                self.snap(tools, "hover")
                self.perr = []
                self.next("palign")
        elif ph == "palign":
            _, _, wz, _ = self.base_cmd(obs)
            self.track_left(obs)
            if k % 4 == 3:
                f = peg_front_row(tools.image("left_wrist"))
                if f is not None:
                    self.perr.append(f)
            if k % 16 == 15:
                self.log.append(("palign", k, [tuple(np.round(p[:2], 1)) for p in self.perr]))
                if len(self.perr) >= 2:
                    rows = np.array([p[0] for p in self.perr])
                    ang = 2 * np.pi * np.array([p[1] for p in self.perr]) / PEG_SPACING_PX
                    ey = np.arctan2(np.mean(np.sin(ang)), np.mean(np.cos(ang))) / (2 * np.pi) * PEG_SPACING_PX
                    ex = PEG_ROW_REF - float(np.median(rows))
                    self.P[1] -= 0.7 * ey / PEG_PX_PER_M  # pegs right of reference -> move hand -y
                    self.P[0] += 0.7 * np.clip(ex, -12, 12) / PEG_ROW_PX_PER_M
                    self.T = self.P.copy()
                    if abs(ey) < 1.2 and abs(ex) < 2.0:
                        self.next("lower")
                self.perr = []
                if k > 16 * 6:
                    self.next("lower")
        elif ph == "lower":
            _, _, wz, _ = self.base_cmd(obs)
            if k == 0:
                self.snap(tools, "aligned")
                self.Tlow0 = self.T.copy()
            self.move_T(obs, k, 60, self.Tlow0, self.Tlow0 - np.array([0, 0, PLACE_DZ]), integrate=False)
            if k >= 70:
                self.snap(tools, "lowered")
                self.next("release")
        elif ph == "release":
            _, _, wz, _ = self.base_cmd(obs)
            self.track_left(obs, integrate=False)
            self.grip[0] = 0.0
            if k >= 25:
                self.snap(tools, "released")
                self.Tr0 = self.T.copy()
                self.next("retreat")
        elif ph == "retreat":
            _, _, wz, _ = self.base_cmd(obs)
            self.move_T(obs, k, 40, self.Tr0, self.Tr0 - self.Tf * 0.10, integrate=False)
            if k >= 45:
                self.snap(tools, "retreated")
                self.next("done")
        elif ph == "done":
            _, _, wz, _ = self.base_cmd(obs)
            if k % 25 == 0 and k <= 100:
                self.snap(tools, f"done{k}")
        raw = self.hold.copy()
        raw[0], raw[1], raw[3] = vx, vy, wz
        raw[4:18] = self.arms
        raw[18:20] = self.grip
        return raw
