"""Touch the red sphere with either hand.

Hand-written control, no learned components:
1. look: the head camera locates the sphere (pinhole model calibrated by moving
   the robot around a static sphere; range from the sphere's pixel radius).
2. walk: the base steps to a height-dependent standoff using pelvis odometry.
3. pre/approach: an approximate G1 arm model (URDF geometry, offsets calibrated
   against the head camera) with a small damped IK moves the open hand forward
   toward the sphere, while the wrist camera steers the sphere to a fixed pixel
   (visual servo; corrects the arm model's errors). If the arm runs out of
   reach, the body creeps forward a bounded distance.
4. touch: the sphere turns bright red when touched; the hand then holds still
   (re-approaching if contact is lost) until the 1 s success condition is met.
"""

import cv2
import numpy as np
from scipy.optimize import least_squares


# ---------------------------------------------------------------- vision

def red_mask(im):
    r = im.astype(np.int16)
    R, G, B = r[..., 0], r[..., 1], r[..., 2]
    return (R > 50) & (R > 2 * G + 20) & (R > 2 * B + 20)


def bright_red_fraction(im, mask=None):
    """Fraction of red pixels that are saturated bright red (the touched colour)."""
    if mask is None:
        mask = red_mask(im)
    n = mask.sum()
    if n == 0:
        return 0.0, 0
    return float((im[..., 0][mask] > 200).mean()), int(n)


def find_sphere(im):
    """Return (u, v, r_px, n_pixels, truncated) of the largest red blob, or None."""
    m = red_mask(im).astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return None
    k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    area = stats[k, cv2.CC_STAT_AREA]
    if area < 4:
        return None
    x0, y0, w, h = stats[k, 0], stats[k, 1], stats[k, 2], stats[k, 3]
    H, W = m.shape
    trunc = x0 == 0 or y0 == 0 or x0 + w >= W or y0 + h >= H
    if not trunc:
        u, v = cent[k]
        return float(u), float(v), float(np.sqrt(area / np.pi)), int(area), False
    # circle fit to the blob's boundary pixels that are not on the image border
    blob = (lab == k).astype(np.uint8)
    cnts, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    pts = max(cnts, key=len)[:, 0, :].astype(float)
    ok = (pts[:, 0] > 0) & (pts[:, 1] > 0) & (pts[:, 0] < W - 1) & (pts[:, 1] < H - 1)
    pts = pts[ok]
    if len(pts) < 6:
        u, v = cent[k]
        return float(u), float(v), float(np.sqrt(area / np.pi)), int(area), True
    A = np.c_[2 * pts, np.ones(len(pts))]
    b = (pts ** 2).sum(1)
    sol, *_ = np.linalg.lstsq(A, b, rcond=None)
    cu, cv = sol[0], sol[1]
    r = np.sqrt(max(sol[2] + cu ** 2 + cv ** 2, 1.0))
    # contour pixels sit ~0.5 px inside the true edge
    return float(cu), float(cv), float(r + 0.5), int(area), True


# ---------------------------------------------------------------- kinematics and head camera

def rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def rpy(r, p, y):
    return rz(y) @ ry(p) @ rx(r)


TORSO = np.array([-0.0039635, 0.0, 0.054])
TOOL = 0.12  # tool point beyond the wrist yaw joint along the hand x axis


def arm_chain(side):
    """(origin, rotation, axis) per joint in the parent frame. side=+1 left, -1 right."""
    s = side
    return [
        (np.array([0.0039563, s * 0.10022, 0.24778]), rpy(s * 0.27931, 0, 0), 1),
        (np.array([0, s * 0.038, -0.013831]), rpy(-s * 0.27925, 0, 0), 0),
        (np.array([0, s * 0.00624, -0.1032]), np.eye(3), 2),
        (np.array([0.015783, 0, -0.080518]), np.eye(3), 1),
        (np.array([0.100, s * 0.00188791, -0.010]), np.eye(3), 0),
        (np.array([0.038, 0, 0]), np.eye(3), 1),
        (np.array([0.046, 0, 0]), np.eye(3), 2),
    ]


_CHAINS = {1: arm_chain(1), -1: arm_chain(-1)}
_AX = (rx, ry, rz)


def fk_points(q, side, tool=TOOL):
    """Joint positions and the tool point, pelvis frame (z up from the pelvis)."""
    p = TORSO.copy()
    R = np.eye(3)
    pts = []
    for (o, R0, ax), qi in zip(_CHAINS[side], q):
        p = p + R @ o
        R = R @ R0 @ _AX[ax](qi)
        pts.append(p.copy())
    pts.append(p + R @ np.array([tool, 0, 0]))
    return pts, R


def fk(q, side, tool=TOOL):
    pts, R = fk_points(q, side, tool)
    return pts[-1], R


# head camera, pelvis frame
CAM_POS = np.array([0.054, 0.0175, 0.474])
CAM_PITCH = 1.117
CAM_F = 69.67
SPHERE_R = 0.0454


def cam_rot(pitch=CAM_PITCH):
    """Columns: image-right, image-down, optical axis, in the pelvis frame."""
    z = np.array([np.cos(pitch), 0, -np.sin(pitch)])
    x = np.array([0, -1.0, 0])
    y = np.cross(z, x)
    return np.stack([x, y, z], 1)


def project(P, pitch=CAM_PITCH, f=CAM_F, cam=CAM_POS):
    d = cam_rot(pitch).T @ (np.asarray(P) - cam)
    return 42 + f * d[0] / d[2], 42 + f * d[1] / d[2], d[2]


def backproject(u, v, r_px, pitch=CAM_PITCH, f=CAM_F, cam=CAM_POS, R=SPHERE_R):
    """Sphere centre in the pelvis frame from its pixel centre and pixel radius."""
    ray = np.array([(u - 42) / f, (v - 42) / f, 1.0])
    ray /= np.linalg.norm(ray)
    dist = R * np.sqrt(1 + (f / r_px) ** 2)
    return cam + cam_rot(pitch) @ (ray * dist)


LIM_LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
LIM_HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])


def limits(side):
    """Joint limits; roll and yaw limits mirror for the right arm."""
    lo, hi = LIM_LO.copy(), LIM_HI.copy()
    if side < 0:
        for i in (1, 2, 4, 6):
            lo[i], hi[i] = -LIM_HI[i], -LIM_LO[i]
    return lo, hi


UP = np.array([0.0, 0.0, 1.0])
STARTS = [
    np.array([-1.2, 0.1, 0.0, 0.6, 0.0, 0.0, 0.0]),
    np.array([-0.9, 0.2, 0.3, 0.0, 0.0, 0.0, 0.0]),
    np.array([-1.5, 0.1, 0.0, 1.0, 0.0, 0.0, 0.0]),
    np.array([0.0, 0.1, -0.3, 0.0, 0.0, 0.0, 0.0]),
]
QNOM = np.array([-0.5, 0.15, 0.0, 0.3, 0.0, 0.0, 0.0])


def ik(target, direction, side, q0=None, tool=TOOL, w_dir=0.1, w_nom=0.01, w_smooth=0.0, w_up=0.05, multi=False):
    """Joint angles putting the tool point at target with the hand x axis near direction.

    Shoulder adduction and backward pitch are bounded to keep the arm off the torso.
    """
    lo, hi = limits(side)
    lo = lo + 0.02
    hi = hi - 0.02
    qn = QNOM.copy()
    if side > 0:
        lo[1] = max(lo[1], -0.05)
    else:
        qn[[1, 2, 4, 6]] *= -1
        hi[1] = min(hi[1], 0.05)
    hi[0] = 0.3
    d = np.asarray(direction, float)
    d = d / np.linalg.norm(d)
    q0 = qn.copy() if q0 is None else np.asarray(q0, float)
    q0 = np.clip(q0, lo, hi)
    qp = q0.copy()

    def res(q):
        p, R = fk(q, side, tool)
        return np.concatenate([p - target, w_dir * (R[:, 0] - d), w_up * (R[:, 2] - UP), w_nom * (q - qn), w_smooth * (q - qp)])

    starts = [q0]
    if multi:
        for g in STARTS:
            g = g.copy()
            if side < 0:
                g[[1, 2, 4, 6]] *= -1
            starts.append(np.clip(g, lo, hi))
    best = None
    for st in starts:
        sol = least_squares(res, st, bounds=(lo, hi))
        if best is None or sol.cost < best.cost:
            best = sol
    p, R = fk(best.x, side, tool)
    return best.x, np.linalg.norm(p - target)


# ---------------------------------------------------------------- policy

ARM_OFS = {1: np.array([0.0, 0.030, 0.019]), -1: np.array([0.0, 0.007, 0.019])}
S0 = -0.12  # approach start, metres behind the sphere centre
S_MAX = 0.25
CREEP_V = 0.08
CREEP_MAX = 0.10  # metres the body may creep forward during the reach
SPEED = 0.002  # approach speed, m per step
WU, WV = 41.0, 30.0  # wrist-camera pixel the sphere centre is steered to
WGAIN = 0.12
WR_MAX = 45.0  # stop steering once the sphere is this close (pixel radius)


def _body_to_world(p_body, pose):
    x, y, z, yaw = pose
    c, s = np.cos(yaw), np.sin(yaw)
    return np.array([x + c * p_body[0] - s * p_body[1], y + s * p_body[0] + c * p_body[1], z + p_body[2]])


def _world_to_body(p_w, pose):
    x, y, z, yaw = pose
    c, s = np.cos(yaw), np.sin(yaw)
    dx, dy = p_w[0] - x, p_w[1] - y
    return np.array([c * dx + s * dy, -s * dx + c * dy, p_w[2] - z])


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.t = 0
        self.phase = "look"
        self.phase_t = 0
        self.meas = []
        self.q_cmd = {1: np.zeros(7), -1: np.zeros(7)}
        self.integ = {1: np.zeros(7), -1: np.zeros(7)}
        self.side = 1
        self.Pw = None
        self.s = S0
        self.q_ik = None
        self.walk_goal = None
        self.creep_start = None
        self.log = []
        self.ik_err = 0.0
        self.lost = 0
        self.reach_start = None
        self.corr = np.zeros(2)  # (left, up) correction of the hand target, metres
        self.wmeas = None

    # ------------------------------------------------------------------
    def _set_phase(self, name):
        self.phase, self.phase_t = name, 0

    def _pose(self, lo):
        return lo[18:22].astype(float)

    def _estimate(self, pose):
        u, v, r = np.median(np.array(self.meas), 0)
        P = backproject(u, v, r)
        self.Pw = _body_to_world(P, pose)
        self.meas = []

    def _solve(self, s, pose):
        P = _world_to_body(self.Pw, pose)
        sh = fk_points(np.zeros(7), self.side)[0][1] + ARM_OFS[self.side]
        d = P - sh
        d[2] = 0.0
        d /= np.linalg.norm(d)
        perp = np.array([-d[1], d[0], 0.0])  # left of the approach direction
        target = P + s * d - ARM_OFS[self.side] + self.corr[0] * perp + np.array([0, 0, self.corr[1]])
        ws = 0.05 if self.q_ik is not None else 0.0
        q, err = ik(target, d, self.side, q0=self.q_ik, w_smooth=ws, multi=self.q_ik is None)
        self.q_ik = q
        self.ik_err = err
        return q

    def _touched(self, tools):
        n = 0
        for cam in ("head", "left_wrist", "right_wrist"):
            r = tools.image(cam).astype(np.int16)
            n += int(((r[..., 0] > 200) & (r[..., 1] < 80) & (r[..., 2] < 80)).sum())
        return n

    def _wrist_servo(self, tools):
        cam = "left_wrist" if self.side > 0 else "right_wrist"
        d = find_sphere(tools.image(cam))
        self.wmeas = d
        if d is None or d[2] > WR_MAX:
            return
        u, v, r = d[:3]
        mpp = SPHERE_R / max(r, 2.0)  # metres per pixel at the sphere
        eu, ev = (u - WU) * mpp, (v - WV) * mpp
        self.corr[0] -= WGAIN * eu  # image right = hand's right
        self.corr[1] -= WGAIN * ev  # image down = down
        self.corr = np.clip(self.corr, -0.2, 0.2)

    def _crept(self, pose):
        if self.reach_start is None:
            self.reach_start = pose.copy()
        return np.hypot(pose[0] - self.reach_start[0], pose[1] - self.reach_start[1])

    def _walk(self, raw, pose, goal):
        ex, ey = goal[0] - pose[0], goal[1] - pose[1]
        c, s = np.cos(pose[3]), np.sin(pose[3])
        bx, by = c * ex + s * ey, -s * ex + c * ey
        if max(abs(bx), abs(by)) < 0.015:
            return True
        v = np.array([bx, by]) * 2.0
        n = np.linalg.norm(v)
        if n > 0.25:
            v *= 0.25 / n
        if 0 < n < 0.07:
            v *= 0.07 / n
        raw[0], raw[1] = v
        raw[3] = np.clip(2.0 * (goal[2] - pose[3]), -0.5, 0.5)
        return False

    # ------------------------------------------------------------------
    def act(self, obs, tools):
        lo = obs["low_dim_obs"]
        pose = self._pose(lo)
        q_meas = {1: lo[0:7].astype(float), -1: lo[9:16].astype(float)}
        raw = self.hold.copy()
        raw[2] = 0.74
        self.t += 1
        self.phase_t += 1

        if self.phase in ("look", "relook"):
            if self.phase_t >= 5:
                d = find_sphere(tools.image("head"))
                if d is not None and not (d[4] and d[3] < 60):
                    self.meas.append(d[:3])
            if self.phase_t >= 12:
                if len(self.meas) >= 4:
                    self._estimate(pose)
                    P = _world_to_body(self.Pw, pose)
                    self.side = 1 if P[1] > 0 else -1
                    standoff = float(np.clip(0.27 + 0.3 * (P[2] - 0.05), 0.27, 0.34))
                    if self.phase == "look" and abs(P[0] - standoff) > 0.02:
                        g = _body_to_world(np.array([P[0] - standoff, 0.0, 0.0]), pose)
                        self.walk_goal = (g[0], g[1], pose[3])
                        self._set_phase("walk")
                    else:
                        self.q_ik = None
                        self.corr = np.array([0.03 * self.side, 0.02])
                        self.q_goal = self._solve(S0, pose)
                        self.q_start = self.q_cmd[self.side].copy()
                        self._set_phase("pre")
                elif self.phase_t >= 20:
                    # sphere not (fully) visible: creep forward
                    self.meas = []
                    self.creep_start = pose.copy()
                    self._set_phase("creep")
        elif self.phase == "creep":
            raw[0] = 0.12
            d = find_sphere(tools.image("head"))
            moved = np.hypot(pose[0] - self.creep_start[0], pose[1] - self.creep_start[1])
            if (d is not None and not d[4]) or moved > 0.15 or self.phase_t > 150:
                raw[0] = 0.0
                self._set_phase("settle")
        elif self.phase == "settle":
            if self.phase_t >= 25:
                self._set_phase("relook")
        elif self.phase == "walk":
            if self._walk(raw, pose, self.walk_goal) or self.phase_t > 200:
                raw[0] = raw[1] = raw[3] = 0.0
                self.q_ik = None
                self.corr = np.array([0.03 * self.side, 0.02])
                self.q_goal = self._solve(S0, pose)
                self.q_start = self.q_cmd[self.side].copy()
                self._set_phase("pre")
        elif self.phase == "pre":
            a = min(1.0, self.phase_t / 40.0)
            self.q_cmd[self.side] = self.q_start + a * (self.q_goal - self.q_start)
            if self.phase_t >= 55:
                self.s = S0
                self._set_phase("approach")
        elif self.phase in ("approach", "touch"):
            if self._touched(tools) >= 3:
                if self.phase == "approach":
                    self.s += 0.01
                    self._set_phase("touch")
                self.lost = 0
            elif self.phase == "touch":
                self.lost += 1
                if self.lost > 8:
                    self._set_phase("approach")
            if self.phase == "approach":
                self._wrist_servo(tools)
                close = self.wmeas is not None and self.wmeas[2] > 20
                if self.ik_err < 0.015:
                    self.s = min(self.s + (SPEED / 2 if close else SPEED), S_MAX)
                if (self.ik_err > 0.01 or self.s >= S_MAX) and self._crept(pose) < CREEP_MAX:
                    raw[0] = CREEP_V  # out of reach: bring the body closer
            elif self.ik_err > 0.012 and self._crept(pose) < CREEP_MAX:
                raw[0] = CREEP_V  # holding the touch but the body drifted back
            self.q_cmd[self.side] = self._solve(self.s, pose)

        sd = self.side
        if self.phase in ("pre", "approach", "touch"):
            self.integ[sd] += 0.05 * (self.q_cmd[sd] - q_meas[sd])
            self.integ[sd] = np.clip(self.integ[sd], -0.25, 0.25)
        raw[4:11] = self.q_cmd[1] + self.integ[1]
        raw[11:18] = self.q_cmd[-1] + self.integ[-1]
        raw[18] = raw[19] = 0.0
        self.log.append((self.t, self.phase, round(self.s, 3), round(float(self.ik_err), 3), round(float(raw[0]), 2), np.round(self.corr, 3).tolist(), None if self.wmeas is None else np.round(self.wmeas[:3], 1).tolist()))
        return raw
