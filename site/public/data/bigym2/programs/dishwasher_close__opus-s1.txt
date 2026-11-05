"""Dishwasher close policy for the G1: push the racks in, then lift and push the door shut.

Scripted sequence of phases, all closed-loop on the pelvis pose from low_dim_obs:
  1. walk beside the dishwasher (facing +y) and push the upper rack in by side-stepping
     with the left hand inside the rack,
  2. walk in front of the open door (facing +x), squat and push the lower rack in low,
  3. squat again with hands under the door tip, stand up lifting the door,
  4. walk forward pressing the door closed and hold.
"""

import numpy as np

YAW_SIDE = np.pi / 2

# planar arm model (sagittal plane), pelvis-relative
SH = 0.30          # pelvis -> shoulder height
L1, L2 = 0.20, 0.30
EL_MAX = 1.5       # elbow: pi/2 = straight arm, 0 = right angle


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def ik(hx, hz, pz, pitch):
    """Hand target (forward of pelvis, world height) -> shoulder pitch, elbow."""
    sx, sz = SH * np.sin(pitch), pz + SH * np.cos(pitch)
    dx, dz = hx - sx, hz - sz
    d = np.hypot(dx, dz)
    bmin = np.pi / 2 - EL_MAX
    dmax = np.sqrt(L1 ** 2 + L2 ** 2 + 2 * L1 * L2 * np.cos(bmin))
    d = min(d, dmax - 1e-4)
    c = (L1 ** 2 + L2 ** 2 - d ** 2) / (2 * L1 * L2)
    bend = np.pi - np.arccos(np.clip(c, -1, 1))
    phi = np.arctan2(dx, -dz)
    off = np.arcsin(np.clip(L2 * np.sin(bend) / max(d, 1e-6), -1, 1))
    a1 = phi - off
    return -(a1 - pitch), np.pi / 2 - bend


def arm(sp, sr, sy, el, wr=0.0, wp=0.0, wy=0.0):
    return [sp, sr, sy, el, wr, wp, wy]


REST = (arm(0.3, 0.2, 0, 1.2), arm(0.3, -0.2, 0, 1.2))
TUCK = (arm(0.5, 0.15, 0, 1.4), arm(0.5, -0.15, 0, 1.4))
RL = -0.12

STEPS = [
    # upper rack: from the side, left hand in the rack, side-step toward +x
    dict(kind='nav', x=-0.25, y=-0.62, yaw=YAW_SIDE),
    dict(kind='nav', x=-0.25, y=-0.5, yaw=YAW_SIDE),
    dict(kind='pose', n=50, hands=(0.3, 0.84, 0.42, 0.72), roll=0.1, only='L'),
    dict(kind='pose', n=560, base=(0.0, -0.1), yaw=YAW_SIDE, yhold=-0.5),
    dict(kind='pose', n=40, hands=(0.42, 0.72, 0.3, 1.05), roll=0.1, only='L'),
    dict(kind='pose', n=30, arms=REST),
    # lower rack: in front of the door, squat and push low
    dict(kind='nav', x=-0.45, y=-0.6, yaw=0.0),
    dict(kind='nav', x=-0.45, y=0.0, yaw=0.0),
    dict(kind='nav', x=-0.2, y=0.0, yaw=0.0, vmax=0.12),
    dict(kind='pose', n=60, h=0.45, p=0.7, hands=(0.3, 0.84, 0.2, 0.5), roll=0.0),
    dict(kind='pose', n=30, hands=(0.2, 0.5, 0.2, 0.25), roll=0.0),
    dict(kind='pose', n=120, hands=(0.2, 0.25, 0.8, 0.25), roll=0.0),
    dict(kind='pose', n=30, hands=(0.8, 0.25, 0.3, 0.6), roll=0.0),
    dict(kind='pose', n=60, h=0.74, p=0.0, arms=REST),
    dict(kind='nav', x=-0.2, y=0.0, yaw=0.0, vmax=0.12),
    # door: hands under the tip, stand up lifting it
    dict(kind='pose', n=60, h=0.5, p=0.3, hands=(0.3, 0.84, 0.15, 0.45), roll=RL),
    dict(kind='pose', n=80, hands=(0.15, 0.45, 0.32, 0.45), roll=RL),
    dict(kind='pose', n=200, h=0.74, p=0.0, hands=(0.32, 0.45, 0.35, 0.72), roll=RL,
         base=(0.08, 0.0), yaw=0.0, yline=0.0),
    dict(kind='pose', n=100, hands=(0.35, 0.72, 0.45, 1.0), roll=RL,
         base=(0.1, 0.0), yaw=0.0, yline=0.0),
    # push it shut while walking in
    dict(kind='pose', n=150, p=0.4, hands=(0.45, 1.0, 0.62, 0.85), roll=RL,
         base=(0.1, 0.0), yaw=0.0, yline=0.0),
    dict(kind='pose', n=200, base=(0.12, 0.0), yaw=0.0, yline=0.0),
    # final shove: lean further and straighten the arms at door-face height
    dict(kind='pose', n=150, p=0.65, hands=(0.62, 0.85, 0.85, 0.75), roll=RL,
         base=(0.12, 0.0), yaw=0.0, yline=0.0),
    dict(kind='pose', n=10 ** 6, base=(0.12, 0.0), yaw=0.0, yline=0.0),
]


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.steps = [dict(s) for s in STEPS]
        self.i = 0
        self.k = 0
        self.L, self.R = list(REST[0]), list(REST[1])
        self.h, self.p = 0.74, 0.0
        self.tgt = None

    def nav(self, o, tx, ty, tyaw, a, vmax=None):
        x, y, yaw = o[21], o[22], o[24]
        vmax = vmax or 0.25
        dx, dy = tx - x, ty - y
        c, s = np.cos(yaw), np.sin(yaw)
        bx, by = c * dx + s * dy, -s * dx + c * dy
        d = np.hypot(bx, by)
        ey = wrap(tyaw - yaw)
        a[3] = np.clip(1.5 * ey, -0.6, 0.6)
        if abs(a[3]) < 0.06:
            a[3] = 0.0 if abs(ey) < 0.03 else 0.06 * np.sign(ey)
        if d > 0.03:
            v = np.clip(1.2 * d, 0.08, vmax)
            a[0], a[1] = v * bx / d, v * by / d
        return d < 0.03 and abs(ey) < 0.05

    def act(self, obs, tools):
        o = obs['low_dim_obs']
        a = self.hold.copy()
        a[2], a[4] = self.h, self.p
        a[5:12], a[12:19] = self.L, self.R
        st = self.steps[self.i]
        if st['kind'] == 'nav':
            self.tgt = (st['x'], st['y'], st['yaw'])
            if self.nav(o, st['x'], st['y'], st['yaw'], a, st.get('vmax')):
                self.i += 1
                self.k = 0
            return a
        n = st['n']
        s = min(1.0, (self.k + 1) / n)
        if self.k == 0:
            st['_h0'], st['_p0'] = self.h, self.p
            st['_L0'], st['_R0'] = list(self.L), list(self.R)
        h0, p0 = st['_h0'], st['_p0']
        a[2] = h0 + (st.get('h', h0) - h0) * s
        a[4] = p0 + (st.get('p', p0) - p0) * s
        if 'hands' in st:
            hx0, hz0, hx1, hz1 = st['hands']
            sp, el = ik(hx0 + (hx1 - hx0) * s, hz0 + (hz1 - hz0) * s, a[2], a[4])
            r = st.get('roll', 0.15)
            L, R = arm(sp, r, 0, el), arm(sp, -r, 0, el)
            if st.get('only') == 'L':
                R = st['_R0']
        elif 'arms' in st:
            L = [x0 + (x1 - x0) * s for x0, x1 in zip(st['_L0'], st['arms'][0])]
            R = [x0 + (x1 - x0) * s for x0, x1 in zip(st['_R0'], st['arms'][1])]
        else:
            L, R = st['_L0'], st['_R0']
        a[5:12], a[12:19] = L, R
        if 'base' in st:
            a[0], a[1] = st['base']
            a[3] = np.clip(1.5 * wrap(st['yaw'] - o[24]), -0.3, 0.3)
            if 'yhold' in st:   # facing +y: hold world y with forward velocity
                vx = np.clip(1.5 * (st['yhold'] - o[22]), -0.1, 0.1)
                a[0] += vx if abs(vx) > 0.03 else 0.0
            if 'yline' in st:   # facing +x: hold world y with lateral velocity
                vy = np.clip(-1.5 * (o[22] - st['yline']), -0.1, 0.1)
                a[1] = vy if abs(vy) > 0.03 else 0.0
        self.k += 1
        if self.k >= n and self.i < len(self.steps) - 1:
            self.L, self.R = list(L), list(R)
            self.h, self.p = float(a[2]), float(a[4])
            self.i += 1
            self.k = 0
        return a
