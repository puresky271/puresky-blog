"""Pick the cardboard box from the side table and set it on the kitchen counter.

Hand-written state machine (world frame: the robot starts facing +x toward the
counter; the side table is to its right, along the same wall):
  side     side-step right (facing +x) until the box is in view of the head camera
  align    servo laterally on the box's image column, walk up to the table
  look     stand still briefly (settle; box image statistics are recorded)
  crouch   squat + lean forward, arms open wide above the table
  lower    lower the open hands to just above the table top
  squeeze  close each hand until it stalls on the box, then press 5 cm further
  lift     stand up / un-lean with the hands kept level (task-space IK), raise the box
  back     step back from the table
  toc      side-step left to the counter's y
  approach walk forward until the legs touch the counter
  reach    raise the box, push it out, then lean forward over the counter
  place    lower the box onto the counter
  release  open the arms, straighten up, step back
Arm poses come from forward kinematics of the G1 arm (URDF geometry) and a
numeric inverse kinematics solve for hand-tip targets.
"""

import cv2
import numpy as np
from scipy.optimize import least_squares

# ----------------------------------------------------------------------------- kinematics


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


def _chain(side):
    sg = 1 if side == "L" else -1
    return [
        ((0.0039563, sg * 0.10022, 0.23778), (sg * 0.27931, 0, 0), "y"),
        ((0, sg * 0.038, -0.013831), (-sg * 0.27925, 0, 0), "x"),
        ((0, sg * 0.00624, -0.1032), (0, 0, 0), "z"),
        ((0.015783, 0, -0.080518), (0, 0, 0), "y"),
        ((0.100, sg * 0.00188791, -0.010), (0, 0, 0), "x"),
        ((0.038, 0, 0), (0, 0, 0), "y"),
        ((0.046, 0, 0), (0, 0, 0), "z"),
    ]


_CHAINS = {s: _chain(s) for s in "LR"}
TORSO_OFF = np.array([-0.0039635, 0, 0.054])  # waist pitch pivot above the pelvis


def fk(q, side, tool=0.10):
    """Hand-tip position and hand rotation in the torso frame."""
    R = np.eye(3)
    p = np.zeros(3)
    for (xyz, r, ax), qi in zip(_CHAINS[side], q):
        p = p + R @ np.array(xyz)
        R = R @ _rx(r[0]) @ _AX[ax](qi)
    return p + R @ np.array([tool, 0, 0]), R


def tip_world(q, side, lean):
    """Hand-tip position / rotation relative to the pelvis, torso pitched by lean."""
    tp, R = fk(q, side)
    Rw = _ry(lean)
    return TORSO_OFF + Rw @ tp, Rw @ R


_LO = np.array([-2.5, -1.5, -2.5, -1.0, -1.9, -1.6, -1.6])
_HI = np.array([2.6, 2.2, 2.6, 2.0, 1.9, 1.6, 1.6])


def ik(target, side, lean, q0=None):
    """Joint angles putting the hand tip at target (pelvis frame), hand level and pointing forward."""
    if q0 is None:
        q0 = np.zeros(7)
    lo, hi = _LO.copy(), _HI.copy()
    if side == "R":
        lo[1], hi[1] = -2.2, 1.5
    want_x = np.array([1.0, 0, 0])

    def res(q):
        p, R = tip_world(q, side, lean)
        r = list((p - target) * 10)
        r += list((R[:, 0] - want_x) * 0.3)
        r += [R[2, 1] * 0.3]
        r += list(q * 0.02)
        return r

    return least_squares(res, np.clip(q0, lo + 1e-6, hi - 1e-6), bounds=(lo, hi)).x


YGRID = np.round(np.arange(0.0, 0.2601, 0.01), 3)


class PoseFamily:
    """IK solutions over hand half-spacing y for a fixed tip (x, z) and torso lean."""

    def __init__(self, x, z, lean):
        self.lean = lean
        self.q = {}
        for side, sg in (("L", 1), ("R", -1)):
            qs, q0 = [], None
            for y in YGRID[::-1]:
                q0 = ik(np.array([x, sg * y, z]), side, lean, q0)
                qs.append(q0)
            self.q[side] = np.array(qs[::-1])

    def at(self, side, y):
        y = float(np.clip(y, YGRID[0], YGRID[-1]))
        i = min(int((y - YGRID[0]) / 0.01), len(YGRID) - 2)
        a = (y - YGRID[i]) / 0.01
        return (1 - a) * self.q[side][i] + a * self.q[side][i + 1]

    def pair(self, yl, yr=None):
        return self.at("L", yl), self.at("R", yl if yr is None else yr)


# ----------------------------------------------------------------------------- vision


def box_mask(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
    return (h >= 8) & (h <= 35) & (s >= 50) & (v >= 60)


# ----------------------------------------------------------------------------- policy

P = dict(
    col_target=42, x_stop=0.37, H=0.62, lean=0.45, X=0.45, Z=0.0, Zhi=0.10,
    Yopen=0.22, sq_rate=0.002, sq_press=0.06, sq_min=0.02, contact_err=0.012,
    lift_T=160, carry_X=0.36, carry_Z=0.30, reach_Z=0.38, back_x=0.10, counter_y=0.0,
    place_X=0.52, place_lean=0.3, place_T=200, place_Zend=0.12, open_Y=0.25,
)

_FAMILIES = {}


def families():
    if not _FAMILIES:
        _FAMILIES["grasp_hi"] = PoseFamily(P["X"], P["Zhi"], P["lean"])
        _FAMILIES["grasp"] = PoseFamily(P["X"], P["Z"], P["lean"])
    return _FAMILIES


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.F = families()
        self.phase = "side"
        self.t0 = 0
        self.col = None
        self.q0 = (np.array([0, 0.25, 0, 0, 0, 0, 0.0]), np.array([0, -0.25, 0, 0, 0, 0, 0.0]))
        self.ycmd = {"L": P["Yopen"], "R": P["Yopen"]}
        self.yhold = {"L": None, "R": None}
        self.xprev = []
        self.qcur = None
        self.stats = []
        self.boxstat = None
        self.task_key = None
        self.sq_done = None
        self.stop = False

    def _arms(self, raw, qa, qb=None, a=1.0):
        if qb is None:
            qb = qa
        a = float(np.clip(a, 0, 1))
        raw[5:12] = (1 - a) * qa[0] + a * qb[0]
        raw[12:19] = (1 - a) * qa[1] + a * qb[1]

    def _go(self, phase, t):
        self.phase, self.t0 = phase, t

    def _held(self, fam):
        return self.F[fam].pair(self.yhold["L"], self.yhold["R"])

    def act(self, obs, tools):
        lo = obs["low_dim_obs"]
        t = int(obs["t"])
        raw = self.hold.copy()
        raw[2] = 0.74
        raw[4] = 0.0
        raw[19] = raw[20] = 0.6
        x, y, yaw = lo[21], lo[22], lo[24]
        raw[3] = np.clip(1.5 * (0 - yaw), -0.6, 0.6)
        ph = self.phase
        dt = t - self.t0
        self._arms(raw, self.q0)
        F = self.F

        if ph in ("side", "align"):
            m = box_mask(tools.image("head"))
            xs = np.nonzero(m)[1]
            self.col = xs.mean() if len(xs) > 30 else None

        if ph == "side":
            raw[1] = np.clip(1.5 * (-0.8 - y), -0.25, 0.25)
            if y < -0.78 or dt > 400:
                self._go("align", t)
        elif ph == "align":
            if self.col is not None:
                e = self.col - P["col_target"]
                vy = np.clip(-0.01 * e, -0.15, 0.15) if abs(e) > 1.5 else 0.0
                if vy != 0 and abs(vy) < 0.06:
                    vy = 0.06 * np.sign(vy)
                raw[1] = vy
                if x < P["x_stop"]:
                    if abs(e) < 3:
                        raw[0] = 0.12
                    elif abs(e) < 6:
                        raw[0] = 0.08
            if x >= P["x_stop"] or dt > 600:
                self._go("look", t)
        elif ph == "look":
            # stand still and measure where the box lies on the table
            if dt >= 20:
                m = box_mask(tools.image("head"))
                ys, xs = np.nonzero(m)
                if len(ys) > 30:
                    self.stats.append((ys.mean(), ys.min(), ys.max(), xs.min(), xs.max(), len(ys)))
            if dt >= 40:
                self.boxstat = np.mean(self.stats, 0) if self.stats else None
                self._go("crouch", t)
        elif ph == "crouch":
            a = min(1, dt / 100)
            raw[4] = a * P["lean"]
            raw[2] = 0.74 + a * (P["H"] - 0.74)
            self._arms(raw, self.q0, F["grasp_hi"].pair(P["Yopen"]), a)
            if dt > 120:
                self._go("lower", t)
        elif ph == "lower":
            raw[4], raw[2] = P["lean"], P["H"]
            self._arms(raw, F["grasp_hi"].pair(P["Yopen"]), F["grasp"].pair(P["Yopen"]), dt / 50)
            if dt > 70:
                self._go("squeeze", t)
        elif ph == "squeeze":
            raw[4], raw[2] = P["lean"], P["H"]
            qm = {"L": lo[3:10], "R": lo[12:19]}
            for s, sg in (("L", 1), ("R", -1)):
                if self.yhold[s] is None:
                    qc = F["grasp"].at(s, self.ycmd[s])
                    yc = sg * tip_world(qc, s, P["lean"])[0][1]
                    ya = sg * tip_world(qm[s], s, P["lean"])[0][1]
                    if ya - yc > P["contact_err"]:
                        self.yhold[s] = max(P["sq_min"], ya - P["sq_press"])
                    elif self.ycmd[s] <= P["sq_min"] + 0.04:
                        self.yhold[s] = P["sq_min"]
                    else:
                        self.ycmd[s] -= P["sq_rate"]
                if self.yhold[s] is not None:
                    self.ycmd[s] = max(self.yhold[s], self.ycmd[s] - 2 * P["sq_rate"])
            self._arms(raw, F["grasp"].pair(self.ycmd["L"], self.ycmd["R"]))
            done = all(self.yhold[s] is not None and self.ycmd[s] <= self.yhold[s] for s in "LR")
            if done and self.sq_done is None:
                self.sq_done = t
            if (done and t - self.sq_done > 25) or dt > 200:
                for s in "LR":
                    if self.yhold[s] is None:
                        self.yhold[s] = self.ycmd[s]
                self._go("lift", t)
        elif ph == "lift":
            # task-space lift: hands stay level while the torso straightens
            a = min(1, dt / P["lift_T"])
            a = a * a * (3 - 2 * a)
            raw[2] = P["H"] + a * (0.74 - P["H"])
            self._task(raw, P["X"] + a * (P["carry_X"] - P["X"]), P["Z"] + a * (P["carry_Z"] - P["Z"]),
                       (1 - a) * P["lean"])
            if dt > P["lift_T"] + 20:
                self._go("back", t)
        elif ph == "back":
            self._task(raw, P["carry_X"], P["carry_Z"], 0.0)
            raw[0] = np.clip(2.0 * (P["back_x"] - x), -0.2, -0.06) if x > P["back_x"] + 0.02 else 0.0
            if (x <= P["back_x"] + 0.02 and dt > 30) or dt > 400:
                self._go("toc", t)
        elif ph == "toc":
            self._task(raw, P["carry_X"], P["carry_Z"], 0.0)
            ey = P["counter_y"] - y
            raw[1] = np.clip(1.2 * ey, -0.25, 0.25) if abs(ey) > 0.03 else 0.0
            if raw[1] != 0 and abs(raw[1]) < 0.07:
                raw[1] = 0.07 * np.sign(raw[1])
            raw[0] = np.clip(1.0 * (P["back_x"] - x), -0.1, 0.1)
            if abs(raw[0]) < 0.06:
                raw[0] = 0.0
            if (abs(ey) < 0.04 and dt > 30) or dt > 600:
                self._go("approach", t)
        elif ph == "approach":
            self._task(raw, P["carry_X"], P["carry_Z"], 0.0)
            raw[0] = 0.12
            ey = P["counter_y"] - y
            raw[1] = np.clip(1.0 * ey, -0.1, 0.1) if abs(ey) > 0.05 else 0.0
            if raw[1] != 0 and abs(raw[1]) < 0.06:
                raw[1] = 0.06 * np.sign(raw[1])
            self.xprev.append(x)
            stalled = len(self.xprev) > 60 and self.xprev[-1] - self.xprev[-40] < 0.02
            if stalled or dt > 500:
                self._go("reach", t)
        elif ph == "reach":
            # raise the box above the counter edge first, then lean and extend over the counter
            # (the box may hang upright in front of the head: move it out before leaning)
            a = min(1, dt / 60)
            a = a * a * (3 - 2 * a)
            b = min(1, max(0, dt - 60) / 100)
            b = b * b * (3 - 2 * b)
            xm = P["carry_X"] + 0.1
            self._task(raw, P["carry_X"] + a * (xm - P["carry_X"]) + b * (P["place_X"] - xm),
                       P["carry_Z"] + a * (P["reach_Z"] - P["carry_Z"]), b * P["place_lean"])
            if dt > 170:
                self._go("place", t)
        elif ph == "place":
            a = min(1, dt / P["place_T"])
            self._task(raw, P["place_X"], P["reach_Z"] + a * (P["place_Zend"] - P["reach_Z"]), P["place_lean"])
            if dt > P["place_T"] + 20:
                self._go("release", t)
        elif ph == "release":
            a = min(1, dt / 40)
            yo = {s: self.yhold[s] + a * (P["open_Y"] - self.yhold[s]) for s in "LR"}
            b = min(1, max(0, dt - 50) / 80)
            self._task(raw, P["place_X"] - 0.1 * b, P["place_Zend"] + 0.05 * a, (1 - b) * P["place_lean"], yo["L"], yo["R"])
            if dt > 140:
                raw[0] = -0.1 if dt < 260 else 0.0
            if dt > 260:
                self.stop = True
        return raw

    def _task(self, raw, x, z, lean, yl=None, yr=None):
        """Hands at tip (x, +-y, z) relative to the pelvis, level, torso pitched by lean (IK, warm-started)."""
        yl = self.yhold["L"] if yl is None else yl
        yr = self.yhold["R"] if yr is None else yr
        if self.qcur is None:
            self.qcur = self._held("grasp")
        key = (round(x, 4), round(z, 4), round(lean, 4), round(yl, 4), round(yr, 4))
        if key != self.task_key:
            self.qcur = (
                ik(np.array([x, yl, z]), "L", lean, self.qcur[0]),
                ik(np.array([x, -yr, z]), "R", lean, self.qcur[1]),
            )
            self.task_key = key
        raw[4] = lean
        self._arms(raw, self.qcur)
