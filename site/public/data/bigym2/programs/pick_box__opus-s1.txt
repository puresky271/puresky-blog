"""Pick the cardboard box from the side table and set it down on the kitchen counter.

Hand-written state machine:
  1. walk to a viewpoint in front of the side table (world frame, pelvis pose from obs)
  2. locate the box (head camera, colour segmentation of the box top face, ray/plane
     intersection with a pinhole model of the head camera)
  3. walk in front of the box, aligned with its faces, squat
  4. bimanual squeeze (hands closed until joint tracking shows contact), lift, stand
  5. back off, walk to the counter, lower the box until contact, open hands, back off
"""

import cv2
import numpy as np
from scipy.optimize import least_squares

# ----------------------------------------------------------------------------- kinematics


def _rot(axis, a):
    c, s = np.cos(a), np.sin(a)
    if axis == 'x':
        return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == 'y':
        return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def _rpy(r, p, y):
    return _rot('z', y) @ _rot('y', p) @ _rot('x', r)


def _T(R, p):
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = p
    return M


_TORSO = _T(np.eye(3), [-0.0039635, 0, 0.054])


def _chain(side):
    s = 1 if side == 'L' else -1
    return [
        ([0.0039563, s * 0.10022, 0.23778], (s * 0.27931, 5.4949e-05, -s * 0.00019159), 'y'),
        ([0, s * 0.038, -0.013831], (-s * 0.27925, 0, 0), 'x'),
        ([0, s * 0.00624, -0.1032], (0, 0, 0), 'z'),
        ([0.015783, 0, -0.080518], (0, 0, 0), 'y'),
        ([0.100, s * 0.00188791, -0.010], (0, 0, 0), 'x'),
        ([0.038, 0, 0], (0, 0, 0), 'y'),
        ([0.046, 0, 0], (0, 0, 0), 'z'),
    ]


_CHAINS = {sd: [(_T(_rpy(*r), p), ax) for p, r, ax in _chain(sd)] for sd in 'LR'}
TOOL = np.array([0.137, 0.0, 0.0, 1.0])


def arm_fk(q, side):
    M = _TORSO.copy()
    frames = []
    for (Tj, ax), qi in zip(_CHAINS[side], q):
        M = M @ Tj @ _T(_rot(ax, qi), [0, 0, 0])
        frames.append(M)
    return frames, (M @ TOOL)[:3]


_LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
_HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])


def _limits(side):
    lo, hi = _LO.copy(), _HI.copy()
    if side == 'R':
        lo[1], hi[1] = -_HI[1], -_LO[1]
    return lo, hi


WAIST = np.array([0.0, 0.0, 0.054])


def level_to_torso(p, pitch):
    """Point in the level pelvis frame -> frame of an upright torso when leaning by pitch."""
    R = _rot('y', pitch)
    return R.T @ (np.asarray(p) - WAIST) + WAIST


def torso_to_level(p, pitch):
    R = _rot('y', pitch)
    return R @ (np.asarray(p) - WAIST) + WAIST


def arm_ik(target, side, q0, pitch=0.0):
    """Tool point target (level pelvis frame), gripper pointing forward, elbow kept out."""
    lo, hi = _limits(side)
    s_ = 1 if side == 'L' else -1
    Rt = _rot('y', pitch).T
    target = level_to_torso(target, pitch)
    fwd = Rt @ np.array([1.0, 0, 0])
    up = Rt @ np.array([0, 0, 1.0])
    q0 = np.clip(np.asarray(q0, float), lo + 1e-3, hi - 1e-3)

    def res(q):
        fr, tip = arm_fk(q, side)
        R = fr[-1][:3, :3]
        r = list(tip - target)
        r += list(0.3 * (R[:, 0] - fwd))
        r += list(0.3 * (R[:, 2] - up))
        r.append(min(0.0, s_ * fr[3][1, 3] - 0.2))
        r += list(0.02 * (q - q0))
        return np.array(r)

    return least_squares(res, q0, bounds=(lo, hi), max_nfev=60).x


# ----------------------------------------------------------------------------- vision

CAM_PITCH, CAM_F, CAM_X, CAM_Y, CAM_Z = 1.108, 83.5, 0.079, 0.0175, 0.518
TABLE_H = 0.55
BOX_H = 0.29
_CAM = _TORSO @ _T(_rot('y', CAM_PITCH), [CAM_X, CAM_Y, CAM_Z])


def unproject(u, v, z_world, pelvis_z):
    d = _CAM[:3, :3] @ np.array([np.ones_like(u), -(u - 41.5) / CAM_F, -(v - 41.5) / CAM_F])
    o = _CAM[:3, 3]
    t = (z_world - pelvis_z - o[2]) / d[2]
    return o[:, None] + t * d


def box_top(im, pelvis_z):
    """Box top face in the yaw-aligned pelvis frame: (center xy, axis angle, n pixels)."""
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV).astype(int)
    h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]
    brown = (h >= 5) & (h <= 25) & (s > 90) & (v > 50)
    top = (h >= 18) & (h <= 35) & (s > 40) & (s <= 150) & (v > 170)
    m = (brown | top).astype(np.uint8)
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n <= 1:
        return None
    k = 1 + int(np.argmax(st[1:, 4]))
    t = (lab == k) & top
    ty, tx = np.nonzero(t)
    if len(tx) < 15:
        return None
    uu = np.concatenate([tx + 0.25, tx + 0.75, tx + 0.25, tx + 0.75])
    vv = np.concatenate([ty + 0.25, ty + 0.25, ty + 0.75, ty + 0.75])
    Q = unproject(uu, vv, TABLE_H + BOX_H, pelvis_z)
    rect = cv2.minAreaRect((Q[:2].T * 1000).astype(np.float32))
    pts = cv2.boxPoints(rect) / 1000.0
    e1, e2 = pts[1] - pts[0], pts[2] - pts[1]
    ang = np.arctan2(e1[1], e1[0])
    return np.array(rect[0]) / 1000.0, ang, np.linalg.norm(e1), np.linalg.norm(e2)


# ----------------------------------------------------------------------------- helpers


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


VIEW = (0.10, -0.90, 0.0)          # viewpoint in front of the side table
GRASP_D = 0.29                      # pelvis -> box centre (vision units) at grasp
GRASP_PITCH = 0.45                  # torso lean while grasping
REACH_OFF = 0.047                   # tool x = box centre distance + REACH_OFF + DEPTH_K*(depth-0.12)
DEPTH_K = 0.6
GRASP_Z = -0.03                     # tool z at grasp (pelvis frame), above the box's centre of mass
SQ_EXTRA = 0.06                     # squeeze beyond contact
LIFT_X, LIFT_Z = 0.33, 0.28
CARRY_V = 0.14
PLACE_X = 0.40                      # push the box this far forward over the counter before lowering
COUNTER = (0.40, 0.0, 0.0)          # pelvis pose for placing on the counter
SQUAT = 0.74                        # pelvis height while grasping (no squat: keeps the pelvis close)
PRE = np.array([0.30, 0.20, 0.20])  # arms while walking to the table


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float64)
        self.a = self.hold.copy()
        self.qL = np.zeros(7)
        self.qR = np.zeros(7)
        self.tip = PRE.copy()
        self.cy_off = 0.0
        self.depth = 0.12
        self.set_tips(self.tip)
        self.state = 'to_view'
        self.k = 0
        self.meas = []
        self.goal = None
        self.log = []

    # -- arms
    def set_tips(self, tip, c=None):
        tip = np.asarray(tip, float)
        if c is None:
            c = self.cy_off
        self.cy_off = c
        off = np.array([0, c, 0])
        p = self.a[4]
        self.qL = arm_ik(tip + off, 'L', self.qL, p)
        self.qR = arm_ik(tip * [1, -1, 1] + off, 'R', self.qR, p)
        self.a[5:12] = self.qL
        self.a[12:19] = self.qR
        self.tip = tip

    def tips_obs(self, L):
        _, tl = arm_fk(L[3:10], 'L')
        _, tr = arm_fk(L[12:19], 'R')
        p = self.a[4]
        return torso_to_level(tl, p), torso_to_level(tr, p)

    # -- base
    def goto(self, L, tx, ty, tyaw, vmax=0.25, turn_first=True):
        x, y, yaw = L[21], L[22], L[24]
        dx, dy = tx - x, ty - y
        c, s = np.cos(yaw), np.sin(yaw)
        fx, fy = c * dx + s * dy, -s * dx + c * dy
        vx = np.clip(1.5 * fx, -vmax, vmax)
        vy = np.clip(1.5 * fy, -vmax, vmax)
        sp = np.hypot(vx, vy)
        dist = np.hypot(dx, dy)
        eyaw = wrap(tyaw - yaw)
        if dist < 0.012:
            vx = vy = 0.0
        elif sp < 0.06:
            vx, vy = vx / sp * 0.06, vy / sp * 0.06
        if turn_first and abs(eyaw) > 0.4:
            vx = vy = 0.0
        self.a[0], self.a[1] = vx, vy
        self.a[3] = np.clip(2.0 * eyaw, -0.6, 0.6)
        return dist, abs(eyaw)

    def stop(self):
        self.a[0] = self.a[1] = self.a[3] = 0.0

    def goto_state(self, s):
        self.state = s
        self.k = 0
        self.best = (1e9, 0)

    def stalled(self, d, n=40):
        if d < self.best[0] - 0.005:
            self.best = (d, self.k)
        return self.k - self.best[1] > n

    def measure_box(self, L, tools):
        r = box_top(tools.image('head'), L[23])
        if r is None:
            return None
        (px, py), ang, l1, l2 = r
        yaw = L[24]
        c, s = np.cos(yaw), np.sin(yaw)
        wx = L[21] + c * px - s * py
        wy = L[22] + s * px + c * py
        a1 = wrap(ang + yaw)
        axis = (a1 + np.pi / 4) % (np.pi / 2) - np.pi / 4
        # edge 1 runs along a1: it is the depth if it is (anti)parallel to the approach axis
        depth = l1 if abs(wrap(2 * (a1 - axis))) < 1.0 else l2
        return np.array([wx, wy, axis, depth])

    def plan_grasp(self):
        m = np.array(self.meas)
        cx, cy = np.median(m[:, 0]), np.median(m[:, 1])
        ax = np.median(m[:, 2])
        self.depth = np.median(m[:, 3])
        self.box = (cx, cy, ax)
        gx = cx - GRASP_D * np.cos(ax)
        gy = cy - GRASP_D * np.sin(ax)
        self.goal = (gx, gy, ax)

    # -- main
    def act(self, obs, tools):
        L = np.asarray(obs['low_dim_obs'], dtype=np.float64)
        self.k += 1
        st = self.state
        if st == 'to_view':
            d, e = self.goto(L, *VIEW)
            if (d < 0.02 and e < 0.03) or self.k > 600:
                self.stop()
                self.meas = []
                self.goto_state('look')
        elif st == 'look':
            self.stop()
            if self.k > 15:
                m = self.measure_box(L, tools)
                if m is not None:
                    self.meas.append(m)
            if self.k >= 25:
                if not self.meas:
                    self.goto_state('done')
                else:
                    self.plan_grasp()
                    self.goto_state('pre_approach')
        elif st == 'pre_approach':
            gx, gy, gyaw = self.goal
            px, py = gx - 0.15 * np.cos(gyaw), gy - 0.15 * np.sin(gyaw)
            d, e = self.goto(L, px, py, gyaw)
            if (d < 0.02 and e < 0.03) or self.k > 500:
                self.stop()
                self.meas = []
                self.goto_state('look2')
        elif st == 'look2':
            self.stop()
            if self.k > 15:
                m = self.measure_box(L, tools)
                if m is not None:
                    self.meas.append(m)
            if self.k >= 25:
                if self.meas:
                    self.plan_grasp()
                self.goto_state('approach')
        elif st == 'approach':
            d, e = self.goto(L, *self.goal, vmax=0.12, turn_first=False)
            if (d < 0.015 and e < 0.03) or self.stalled(d) or self.k > 300:
                self.stop()
                self.goto_state('squat')
        elif st == 'squat':
            self.stop()
            f = min(1.0, self.k / 50)
            self.a[2] = 0.74 + (SQUAT - 0.74) * f
            self.a[4] = GRASP_PITCH * f
            self.set_tips(self.tip)
            if self.k > 50:
                self.start_tip = self.tip.copy()
                self.goto_state('reach')
        elif st == 'reach':
            if self.k == 1:
                cx, cy, _ = self.box
                yaw = L[24]
                dx, dy = cx - L[21], cy - L[22]
                along = np.cos(yaw) * dx + np.sin(yaw) * dy
                cross = -np.sin(yaw) * dx + np.cos(yaw) * dy
                self.rx = float(np.clip(along + REACH_OFF + DEPTH_K * (self.depth - 0.12), 0.34, 0.50))
                self.cy_goal = float(np.clip(cross, -0.05, 0.05))
                self.start_tip = self.tip.copy()
            n1, n2 = 40, 50
            if self.k <= n1:
                t = self.start_tip + (np.array([self.rx, 0.20, 0.15]) - self.start_tip) * self.k / n1
            else:
                t = np.array([self.rx, 0.20, 0.15 + (GRASP_Z - 0.15) * min(1, (self.k - n1) / n2)])
            self.set_tips(t, self.cy_goal * min(1, self.k / n1))
            if self.k >= n1 + n2 + 10:
                self.goto_state('squeeze')
        elif st == 'squeeze':
            y = max(0.06, 0.20 - 0.001 * self.k)
            t = self.tip.copy()
            t[1] = y
            self.set_tips(t, self.cy_off)
            tl, tr = self.tips_obs(L)
            el, er = tl[1] - self.cy_off - y, self.cy_off - tr[1] - y
            if self.k == 25:
                self.e0 = (el, er)
            if self.k > 25 and el - self.e0[0] > 0.012 and er - self.e0[1] > 0.012:
                self.hw = (tl[1] - tr[1]) / 2
                self.sq_from = t.copy()
                self.goto_state('press')
            elif y <= 0.06:
                self.hw = 0.08
                self.sq_from = t.copy()
                self.goto_state('press')
        elif st == 'press':
            t = self.sq_from.copy()
            t[1] = self.sq_from[1] + (self.hw - SQ_EXTRA - self.sq_from[1]) * min(1, self.k / 30)
            self.set_tips(t)
            if self.k >= 35:
                self.lift_from = t.copy()
                self.goto_state('lift')
        elif st == 'lift':
            tgt = np.array([LIFT_X, self.lift_from[1] - 0.01, LIFT_Z])
            f = min(1.0, self.k / 100)
            self.set_tips(self.lift_from + (tgt - self.lift_from) * f)
            if self.k > 100:
                f2 = min(1.0, (self.k - 100) / 50)
                self.a[2] = SQUAT + (0.74 - SQUAT) * f2
                self.a[4] = GRASP_PITCH * (1 - f2)
            if self.k >= 170:
                self.goto_state('back_off')
        elif st == 'back_off':
            gx, gy, gyaw = self.goal
            px, py = gx - 0.25 * np.cos(gyaw), gy - 0.25 * np.sin(gyaw)
            d, e = self.goto(L, px, py, gyaw, vmax=CARRY_V)
            if (d < 0.03) or self.k > 300:
                self.goto_state('to_counter')
        elif st == 'to_counter':
            d, e = self.goto(L, COUNTER[0] - 0.25, COUNTER[1], COUNTER[2], vmax=CARRY_V)
            if (d < 0.02 and e < 0.03) or self.k > 800:
                self.goto_state('counter_in')
        elif st == 'counter_in':
            d, e = self.goto(L, *COUNTER, vmax=0.1, turn_first=False)
            if (d < 0.015 and e < 0.03) or self.stalled(d) or self.k > 300:
                self.stop()
                self.ext_from = self.tip.copy()
                self.goto_state('extend')
        elif st == 'extend':
            self.stop()
            t = self.ext_from.copy()
            t[0] = self.ext_from[0] + (PLACE_X - self.ext_from[0]) * min(1, self.k / 50)
            self.set_tips(t)
            if self.k >= 60:
                self.place_from = self.tip.copy()
                self.goto_state('lower')
        elif st == 'lower':
            self.stop()
            t = self.place_from.copy()
            t[2] = self.place_from[2] - 0.0006 * self.k
            self.set_tips(t)
            tl, tr = self.tips_obs(L)
            ez = (tl[2] + tr[2]) / 2 - t[2]
            if self.k == 10:
                self.ez0 = ez
            if (self.k > 10 and ez - self.ez0 > 0.015) or t[2] < -0.15:
                self.rel_from = t.copy()
                self.goto_state('release')
        elif st == 'release':
            t = self.rel_from.copy()
            t[1] = self.rel_from[1] + 0.07 * min(1, self.k / 40)
            self.set_tips(t)
            if self.k >= 50:
                self.rel_from = t.copy()
                self.goto_state('retreat')
        elif st == 'retreat':
            t = self.rel_from.copy()
            t[0] -= 0.1 * min(1, self.k / 50)
            self.set_tips(t)
            if self.k > 50:
                d, e = self.goto(L, COUNTER[0] - 0.25, COUNTER[1], COUNTER[2], vmax=0.1, turn_first=False)
            if self.k > 200:
                self.stop()
                self.goto_state('done')
        else:
            self.stop()
        self.log.append((st, self.k))
        return self.a.astype(np.float32).tolist()
