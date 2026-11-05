"""Dishwasher close: push both racks in, then lift the door shut.

Scripted policy. The scene layout is fixed (the dishwasher faces -x, its door
hinge is at about x=0.62, z=0.47 in the world frame); the robot localises with
the pelvis pose from low_dim_obs. Hand targets are converted to joint targets
with an approximate G1 arm model and a small numerical IK.
"""

import numpy as np
from scipy.optimize import least_squares

L, R = 5, 12
Y0 = -0.03            # lateral position in front of the dishwasher
XS = -0.14            # standing x in front of the open door
YSIDE = -0.47         # lateral position beside the door for pushing the racks
HX, HZ = 0.62, 0.47   # door hinge (world x, z)

# ---------------------------------------------------------------- kinematics


def _rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def _ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def _rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def arm_fk(q, side, waist_pitch=0.0, tip=0.12):
    """Wrist and gripper-tip positions in the pelvis frame (x fwd, y left, z up)."""
    sg = 1 if side == 'left' else -1
    Rm = _ry(waist_pitch)
    p = np.array([-0.0039635, 0, 0.054])
    p = p + Rm @ np.array([0.0039563, sg * 0.10022, 0.23778])
    Rm = Rm @ _rx(sg * 0.2793)
    Rm = Rm @ _ry(q[0])
    p = p + Rm @ np.array([0, sg * 0.038, -0.013831])
    Rm = Rm @ _rx(-sg * 0.2793) @ _rx(q[1])
    p = p + Rm @ np.array([0, sg * 0.00624, -0.1032])
    Rm = Rm @ _rz(q[2])
    p = p + Rm @ np.array([0.015783, 0, -0.080518])
    Rm = Rm @ _ry(q[3])
    p = p + Rm @ np.array([0.100, sg * 0.00188791, -0.010])
    Rm = Rm @ _rx(q[4])
    p = p + Rm @ np.array([0.038, 0, 0])
    Rm = Rm @ _ry(q[5])
    p = p + Rm @ np.array([0.046, 0, 0])
    Rm = Rm @ _rz(q[6])
    return p, p + Rm @ np.array([tip, 0, 0])


_LO = np.array([-3.0892, -0.3, -0.6, -1.0472, -1.97, -1.614, -1.614])
_HI = np.array([2.6704, 1.2, 0.6, 2.0944, 1.97, 1.614, 1.614])
_FREE = [0, 1, 2, 3, 5]


def ik(tip, side, wp, q0=None):
    """Joint angles putting the gripper tip at `tip` (pelvis frame)."""
    sg = 1 if side == 'left' else -1
    lo, hi = _LO.copy(), _HI.copy()
    if side == 'right':
        lo[[1, 2, 4, 6]], hi[[1, 2, 4, 6]] = -_HI[[1, 2, 4, 6]], -_LO[[1, 2, 4, 6]]
    if q0 is None:
        q0 = np.array([-0.5, sg * 0.2, 0, 0.8, 0, 0, 0])
    tip = np.asarray(tip, float)
    wpa = wp - 0.07

    def full(x):
        q = np.zeros(7)
        q[_FREE] = x
        return q

    def res(x):
        _, t = arm_fk(full(x), side, wpa)
        return np.concatenate([t - tip, 0.02 * (x - q0[_FREE])])

    def err(x):
        return np.linalg.norm(arm_fk(full(x), side, wpa)[1] - tip)

    starts = [q0[_FREE], np.array([-0.5, sg * 0.2, 0, 0.8, 0]),
              np.array([-1.2, sg * 0.2, 0, 1.2, 0])]
    best = None
    for x0 in starts:
        x0 = np.clip(x0, lo[_FREE] + 1e-3, hi[_FREE] - 1e-3)
        s = least_squares(res, x0, bounds=(lo[_FREE], hi[_FREE]), max_nfev=40)
        e = err(s.x)
        if best is None or e < best[1] - 0.01:
            best = (s.x, e)
        if best[1] < 0.03:
            break
    return full(best[0]), best[1]


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


# ---------------------------------------------------------------- policy


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        self.obs = obs
        self.q = [None, None]
        self.gen = self.plan(np.array(tools.hold_action(), dtype=np.float64))
        self.last = None

    def act(self, obs, tools):
        self.obs = obs
        try:
            a = next(self.gen)
            self.last = a
        except StopIteration:
            a = self.last.copy()
            a[0] = a[1] = a[3] = 0.0
        return np.asarray(a, dtype=np.float32)

    # ---- helpers
    def pose(self):
        lo = self.obs['low_dim_obs']
        return float(lo[21]), float(lo[22]), float(lo[24])

    def base_cmd(self, tx, ty, tyaw, kp=1.2, vmax=0.4, mind=0.02):
        x, y, yaw = self.pose()
        dx, dy = tx - x, ty - y
        c, s = np.cos(yaw), np.sin(yaw)
        vx, vy = kp * (c * dx + s * dy), kp * (-s * dx + c * dy)
        n = np.hypot(vx, vy)
        if n > vmax:
            vx, vy = vx * vmax / n, vy * vmax / n
        n = np.hypot(vx, vy)
        if n < 0.065:
            if n > 1e-6 and np.hypot(dx, dy) > mind:
                vx, vy = vx * 0.065 / n, vy * 0.065 / n
            else:
                vx = vy = 0.0
        wz = float(np.clip(1.5 * wrap(tyaw - yaw), -0.8, 0.8))
        if abs(wz) < 0.05:
            wz = 0.0
        return vx, vy, wz, np.hypot(dx, dy), abs(wrap(tyaw - yaw))

    def goto(self, a, tx, ty, tyaw, tol=0.03, ytol=0.05, maxsteps=500, settle=30):
        for _ in range(maxsteps):
            vx, vy, wz, d, dyaw = self.base_cmd(tx, ty, tyaw, mind=tol * 0.7)
            if d < tol and dyaw < ytol:
                break
            a[0], a[1], a[3] = vx, vy, wz
            yield a.copy()
        a[0] = a[1] = a[3] = 0.0
        for _ in range(settle):
            yield a.copy()

    def hold(self, a, n):
        for _ in range(n):
            yield a.copy()

    def arms_to(self, a, xw, zw, lat=0.17):
        """Both gripper tips to world x=xw, height zw, +-lat sideways of the pelvis."""
        lo = self.obs['low_dim_obs']
        x, _, _ = self.pose()
        zp, wp = float(lo[23]), float(lo[2])
        f = xw - x
        ql, el = ik([f, lat, zw - zp], 'left', wp, self.q[0])
        qr, _ = ik([f, -lat, zw - zp], 'right', wp, self.q[1])
        self.q = [ql, qr]
        a[L:L + 7] = ql
        a[R:R + 7] = qr
        return el

    @staticmethod
    def tuck_up(a):
        for base, sg in ((L, 1), (R, -1)):
            a[base:base + 7] = 0
            a[base + 0], a[base + 1], a[base + 3] = 0.3, sg * 0.25, -1.0

    @staticmethod
    def tuck_down(a):
        for base, sg in ((L, 1), (R, -1)):
            a[base:base + 7] = 0
            a[base + 0], a[base + 1], a[base + 3] = 0.0, sg * 0.15, 1.4

    def side_push(self, a, zw, x_end, f=0.35, lat=0.3):
        """Beside the door, hold the left hand inward at height zw and walk forward."""
        self.q = [None, None]
        self.tuck_up(a)
        yield from self.goto(a, -0.45, YSIDE, 0.0, tol=0.02, ytol=0.02)
        lo = self.obs['low_dim_obs']
        for _ in range(40):
            ql, _ = ik([f, lat, zw - float(lo[23])], 'left', float(lo[2]), self.q[0])
            self.q[0] = ql
            a[L:L + 7] = ql
            yield a.copy()
        for _ in range(700):
            x, _, _ = self.pose()
            if x > x_end:
                break
            _, vy, wz, _, _ = self.base_cmd(x_end, YSIDE, 0.0, kp=2.0)
            a[0], a[1], a[3] = 0.12, vy, wz
            lo = self.obs['low_dim_obs']
            ql, _ = ik([f, lat, zw - float(lo[23])], 'left', float(lo[2]), self.q[0])
            self.q[0] = ql
            a[L:L + 7] = ql
            yield a.copy()
        a[0] = a[1] = a[3] = 0.0
        yield from self.hold(a, 30)
        self.tuck_up(a)
        yield from self.hold(a, 30)
        yield from self.goto(a, -0.45, YSIDE, 0.0, tol=0.03, ytol=0.05)

    def push(self, a, zp, n=250, lat=0.08):
        """Sweep both hands forward at height zp to push a rack in."""
        self.arms_to(a, self.pose()[0] + 0.15, zp, lat=lat)
        yield from self.hold(a, 30)
        for k in range(n + 30):
            f = 0.15 + 0.5 * min(1.0, k / n)
            if a[2] > 0.7:
                vx, vy, wz, _, _ = self.base_cmd(XS, Y0, 0.0, kp=2.0, vmax=0.2)
                a[0], a[1], a[3] = vx, vy, wz
            self.arms_to(a, self.pose()[0] + f, zp, lat=lat)
            yield a.copy()
        for k in range(30):
            self.arms_to(a, self.pose()[0] + 0.1, zp + 0.05, lat=lat)
            yield a.copy()
        a[0] = a[1] = a[3] = 0.0

    @staticmethod
    def door_pt(th, push=0.02):
        r = 0.5 - 0.1 * min(1.0, th / 1.57)
        return (HX - r * np.cos(th) + push * np.sin(th),
                HZ + r * np.sin(th) + push * np.cos(th) - 0.03)

    # ---- the task
    def plan(self, a):
        a[19] = a[20] = 0.0
        self.tuck_up(a)
        yield from self.goto(a, -0.6, -0.8, 0.0, tol=0.03, ytol=0.05)

        # 1. push the racks in from beside the door, walking forward
        a[4] = 0.3
        yield from self.side_push(a, 0.8, 0.25)
        yield from self.side_push(a, 0.62, 0.35)
        a[4] = 0.0

        # 2. arms down-forward, go in front of the door and squat
        yield from self.goto(a, -0.6, YSIDE, 0.0, tol=0.03, ytol=0.05)
        yield from self.goto(a, -0.6, Y0, 0.0, tol=0.02, ytol=0.02)
        self.q = [None, None]
        yield from self.goto(a, XS - 0.25, Y0, 0.0, tol=0.02, ytol=0.02)
        self.tuck_down(a)
        yield from self.hold(a, 30)
        yield from self.goto(a, XS, Y0, 0.0, tol=0.012, ytol=0.015)
        a[2], a[4] = 0.62, 0.7
        yield from self.hold(a, 70)
        x0 = self.pose()[0]
        for xw in np.linspace(x0 + 0.15, 0.12, 5):
            self.arms_to(a, xw, 0.43)
            yield from self.hold(a, 15)

        # 3. lift the door along its arc, standing up and walking in behind it
        th, k, e = 0.0, 0, 0.0
        while th < 1.75 and k < 1400:
            k += 1
            px, pz = self.door_pt(th)
            a[2] = 0.62 + 0.12 * np.clip((th - 0.08) / 0.25, 0, 1)
            a[4] = 0.7 if th < 0.8 else 0.5
            if a[2] >= 0.7:
                tx = min(px - 0.33, 0.3)
                vx, vy, wz, _, _ = self.base_cmd(tx, Y0, 0.0, kp=2.0, vmax=0.3)
                a[0], a[1], a[3] = vx, vy, wz
            if e < 0.06:
                th += 0.004
            if k % 2 == 0:
                e = self.arms_to(a, px, pz)
            yield a.copy()

        # 4. keep pressing the door shut
        while True:
            px, pz = self.door_pt(1.75)
            vx, vy, wz, _, _ = self.base_cmd(px - 0.33, Y0, 0.0, kp=2.0, vmax=0.3)
            a[0], a[1], a[3] = vx, vy, wz
            self.arms_to(a, px + 0.03, pz)
            yield a.copy()
