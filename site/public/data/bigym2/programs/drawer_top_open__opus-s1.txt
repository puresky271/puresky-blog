"""Open the top drawer: walk up to the cabinet, grasp the top handle with the left
hand, then walk backwards holding it.

The cabinet sits at a fixed place in the odometry (world) frame; only the robot's
start pose varies between seeds.  The robot walks to a fixed stand pose in front
of the handle and reaches for it with the gripper's fingers opening vertically.
Before closing, the left wrist camera checks where the handle bar ends inside
the open gripper and shifts the grasp sideways until the bar spans the fingers.
A missed grasp (gripper closes fully) is retried at other heights; a handle lost
while pulling is grasped again where the hand last held it.
"""

import numpy as np
from scipy.optimize import least_squares

# ----------------------------------------------------------------------------
# Kinematics (approximate G1 arm chain, pelvis frame, waist assumed rigid)


def _rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def _ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def _rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def fk_left(q, tool):
    p = np.array([-0.0039635, 0, 0.054])
    R = np.eye(3)
    p = p + R @ np.array([0.0039563, 0.10022, 0.23778]); R = R @ _rx(0.27931)
    R = R @ _ry(q[0])
    p = p + R @ np.array([0, 0.038, -0.013831]); R = R @ _rx(-0.27925) @ _rx(q[1])
    p = p + R @ np.array([0, 0.00624, -0.1032]); R = R @ _rz(q[2])
    p = p + R @ np.array([0.015783, 0, -0.080518]); R = R @ _ry(q[3])
    p = p + R @ np.array([0.100, 0.00188791, -0.010]); R = R @ _rx(q[4])
    p = p + R @ np.array([0.038, 0, 0]); R = R @ _ry(q[5])
    p = p + R @ np.array([0.046, 0, 0]); R = R @ _rz(q[6])
    return p + R @ np.array([tool, 0, 0]), R


Q_LO = np.array([-3.0892, -0.05, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
Q_HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])
TOOL = 0.19


def ik_left(target, q0, maxdown=0.3):
    """Fingers' centre at target, opening axis in the world x-z plane (to pinch a
    horizontal bar running along y), gripper pointing roughly forward."""
    q0 = np.clip(np.asarray(q0, float), Q_LO + 1e-3, Q_HI - 1e-3)
    pref = np.array([1.0, 0, 0])

    def res(q):
        p, R = fk_left(q, TOOL)
        return np.concatenate([
            3 * (p - target),
            [1.0 * R[1, 1]],
            0.05 * (R[:, 0] - pref),
            [0.5 * max(0.0, -R[2, 0] - np.sin(maxdown))],
            [0.5 * max(0.0, abs(R[1, 0]) - 0.5)],
            [0.3 * max(0.0, -R[2, 1])],
            0.01 * (q - q0),
        ])
    return least_squares(res, q0, bounds=(Q_LO, Q_HI)).x


# ----------------------------------------------------------------------------
# Vision


def handle_band(w):
    """Rows spanned by the handle bar in the (open-gripper) left wrist image.

    The bar shows as a near-vertical mid-grey band left of the image centre;
    image-up is the robot's right.  Returns (first_row, last_row) or None."""
    im = w.astype(float)
    g = im.mean(2)
    sat = im.max(2) - im.min(2)
    m = (g > 70) & (g < 125) & (sat < 25)
    m[:, :6] = False
    m[:, 60:] = False
    rows = np.nonzero(m.sum(1) >= 4)[0]
    if len(rows) < 6:
        return None
    xs = np.nonzero(m[30:70])[1]
    xc = float(xs.mean()) if len(xs) >= 20 else None
    return int(rows.min()), int(rows.max()), xc


# ----------------------------------------------------------------------------
# Grasp point on the closed top-drawer handle, odometry (world) frame: measured by
# grasping on the demonstration seed; the same on every development seed.
REF_GRASP = np.array([0.618, -0.02, 0.740])


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


class Policy:
    """The control policy that is scored on the hidden seeds."""

    P = dict(STAND_X=0.43, STAND_DY=0.03, XPRE=0.12, XIN=0.02, VB=-0.3,
             RETRACT=0.15, TRET=40, MAXREGRASP=4, RAMP=1, YAWTOL=0.02,
             BAND_MIN_END=58, BAND_GOAL_END=70, BAND_PX_PER_M=700.0)

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.phase = 'look'
        self.t0 = 0
        self.q = self.hold[4:11].astype(float).copy()
        self.grasp = REF_GRASP.copy()
        self.attempt = 0
        self.zoff = [0.0, -0.02, 0.02, -0.035, 0.035]
        self.traj = None
        self.hold_pose = None
        self.settle = 0
        self.traj_pull = None
        self.regrasps = 0
        self.ycorr = 0
        self.same_z = False
        self.hand_world = self.grasp[:2].copy()

    # -- helpers
    def go(self, p, t):
        self.phase, self.t0 = p, t

    def rel(self, lo, pw):
        x, y, yaw = lo[18], lo[19], lo[21]
        d = pw[:2] - np.array([x, y])
        c, s = np.cos(yaw), np.sin(yaw)
        return np.array([c * d[0] + s * d[1], -s * d[0] + c * d[1], pw[2] - lo[20]])

    def base_goto(self, raw, lo, target, tol=0.012, ytol=0.03):
        x, y, yaw = lo[18], lo[19], lo[21]
        ex, ey = target[0] - x, target[1] - y
        c, s = np.cos(yaw), np.sin(yaw)
        bx, by = c * ex + s * ey, -s * ex + c * ey
        eyaw = wrap(target[2] - yaw)
        vx = np.clip(1.2 * bx, -0.15, 0.15)
        vy = np.clip(1.2 * by, -0.12, 0.12)
        wz = np.clip(1.5 * eyaw, -0.3, 0.3)
        done_xy = np.hypot(bx, by) < tol
        sp = np.hypot(vx, vy)
        if done_xy:
            vx = vy = 0.0
        elif sp < 0.065:
            vx, vy = vx / sp * 0.065, vy / sp * 0.065
        if abs(eyaw) < ytol:
            wz = 0.0
        elif abs(wz) < 0.12:
            wz = np.sign(wz) * 0.12
        raw[0], raw[1], raw[3] = vx, vy, wz
        return done_xy and abs(eyaw) < ytol

    def arm_target(self, lo, dx):
        r = self.rel(lo, self.grasp + np.array([0, 0, self.zoff[self.attempt]]))
        return r + np.array([dx, 0, 0])

    # -- main
    def act(self, obs, tools):
        lo = np.asarray(obs['low_dim_obs'], dtype=float)
        t = int(obs['t'])
        raw = self.hold.copy()
        raw[4:11] = self.q
        raw[18] = 0.0
        tt = t - self.t0
        ph = self.phase
        P = self.P

        if ph == 'look':
            if tt >= 3:
                g = self.grasp
                self.stand = np.array([g[0] - P['STAND_X'], g[1] + P['STAND_DY'], 0.0])
                self.go('walk', t)
        elif ph == 'walk':
            done = self.base_goto(raw, lo, self.stand, tol=0.02, ytol=0.04)
            self.settle = self.settle + 1 if done else 0
            if self.settle > 5 or tt > 150:
                self.go('pre', t)
                self.qs = self.q.copy()
        elif ph == 'pre':
            if self.traj is None:
                tgt_pre = self.arm_target(lo, -P['XPRE'])
                q1 = ik_left(tgt_pre, self.q if self.attempt else np.array([-0.3, 0, -1.0, 0.5, 1.0, 0.8, 0.4]))
                n = 6
                self.traj = [ik_left(self.arm_target(lo, -P['XPRE'] + (P['XPRE'] + P['XIN']) * i / n), q1) for i in range(n + 1)]
                self.traj_q1 = q1
            a = min(1.0, tt / 35)
            raw[4:11] = self.qs + a * (self.traj_q1 - self.qs)
            if tt >= 40:
                self.q = self.traj_q1.copy()
                self.go('in', t)
        elif ph == 'in':
            f = min(1.0, tt / 40) * (len(self.traj) - 1)
            i = min(int(f), len(self.traj) - 2)
            a = f - i
            raw[4:11] = (1 - a) * self.traj[i] + a * self.traj[i + 1]
            if tt >= 48:
                self.q = self.traj[-1].copy()
                band = handle_band(tools.image('left_wrist'))
                dy = 0.0
                if band is not None:
                    if band[1] < P['BAND_MIN_END']:
                        dy = -(P['BAND_GOAL_END'] - band[1]) / P['BAND_PX_PER_M']
                    elif band[0] > 15:
                        dy = (band[0] - 5) / P['BAND_PX_PER_M']
                if dy != 0.0 and self.ycorr < 3:
                    self.ycorr += 1
                    self.grasp[1] += float(np.clip(dy, -0.08, 0.08))
                    self.same_z = True
                    self.go('retreat', t)
                else:
                    self.go('close', t)
        elif ph == 'close':
            raw[18] = 1.0
            if tt >= 25:
                if lo[44] < 0.95:
                    self.hold_pose = lo[18:22].copy()
                    self.go('pull', t)
                else:
                    self.go('retreat', t)
        elif ph == 'retreat':
            raw[18] = 0.0
            f = min(1.0, tt / 30) * (len(self.traj) - 1)
            i = min(int(f), len(self.traj) - 2)
            a = f - i
            rev = self.traj[::-1]
            raw[4:11] = (1 - a) * rev[i] + a * rev[i + 1]
            if tt >= 35:
                self.q = self.traj[0].copy()
                self.qs = self.q.copy()
                if not self.same_z:
                    self.attempt = (self.attempt + 1) % len(self.zoff)
                self.same_z = False
                self.traj = None
                self.go('pre', t)
        elif ph == 'pull':
            raw[18] = 1.0
            if self.traj_pull is None:
                tgt = self.arm_target(lo, P['XIN'])
                self.traj_pull = [ik_left(tgt - np.array([P['RETRACT'] * i / 4, 0, 0]), self.q) for i in range(5)]
            f = min(1.0, tt / P['TRET']) * 4
            i = min(int(f), 3)
            a = f - i
            raw[4:11] = (1 - a) * self.traj_pull[i] + a * self.traj_pull[i + 1]
            raw[0] = P['VB'] * min(1.0, (tt + 1) / P['RAMP']) if tt < 150 else 0.0
            if lo[44] < 0.9:
                p, _ = fk_left(lo[0:7], TOOL)
                c, s = np.cos(lo[21]), np.sin(lo[21])
                self.hand_world = np.array([lo[18] + c * p[0] - s * p[1], lo[19] + s * p[0] + c * p[1]])
            elif lo[44] > 0.97 and tt > 10 and self.regrasps < P['MAXREGRASP']:
                # lost the handle: go back for it where the hand last held it
                self.regrasps += 1
                self.grasp[0] = self.hand_world[0]
                g = self.grasp
                self.stand = np.array([g[0] - P['STAND_X'], g[1] + P['STAND_DY'], 0.0])
                self.q = raw[4:11].copy()
                self.traj = None
                self.traj_pull = None
                self.attempt = 0
                self.ycorr = 0
                self.settle = 0
                self.go('walk', t)
                return raw
            eyaw = wrap(self.hold_pose[3] - lo[21])
            raw[3] = np.clip(2.0 * eyaw, -0.3, 0.3) if abs(eyaw) > P['YAWTOL'] else 0.0
            c, s = np.cos(lo[21]), np.sin(lo[21])
            ey = -s * (self.hold_pose[0] - lo[18]) + c * (self.hold_pose[1] - lo[19])
            raw[1] = np.clip(1.5 * ey, -0.1, 0.1) if abs(ey) > 0.02 else 0.0
            if tt > 200:
                raw[18] = 0.0
        return raw
