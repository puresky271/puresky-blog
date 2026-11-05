"""Hand-written policy: load two mugs from the counter into the dishwasher upper rack.

Structure: a generator-based state machine (sequential code that yields one
action per control step).  Perception is colour segmentation of the robot's
cameras; arm motion uses an approximate G1 arm kinematic model (from the
URDF) with damped IK and integral sag compensation.
"""

import numpy as np
from scipy import ndimage
from scipy.optimize import least_squares

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


AX = {'x': rx, 'y': ry, 'z': rz}


def _chain(side):
    s = 1.0 if side == 'L' else -1.0
    return [
        (np.array([0.0039563, s * 0.10022, 0.23778]), rx(s * 0.27931), 'y'),
        (np.array([0, s * 0.038, -0.013831]), rx(-s * 0.27925), 'x'),
        (np.array([0, s * 0.00624, -0.1032]), np.eye(3), 'z'),
        (np.array([0.015783, 0, -0.080518]), np.eye(3), 'y'),
        (np.array([0.100, s * 0.00188791, -0.010]), np.eye(3), 'x'),
        (np.array([0.038, 0, 0]), np.eye(3), 'y'),
        (np.array([0.046, 0, 0]), np.eye(3), 'z'),
    ]


CHAIN = {'L': _chain('L'), 'R': _chain('R')}
TOOL = np.array([0.16, 0, 0])
LIM_LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
LIM_HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])


def limits(side):
    lo, hi = LIM_LO.copy(), LIM_HI.copy()
    if side == 'R':
        lo[1], hi[1] = -LIM_HI[1], -LIM_LO[1]
    return lo, hi


def fk(q, side, frames=False):
    p = np.zeros(3)
    R = np.eye(3)
    out = []
    for (off, R0, ax), qi in zip(CHAIN[side], q):
        p = p + R @ off
        R = R @ R0 @ AX[ax](qi)
        out.append(p.copy())
    pt = p + R @ TOOL
    if frames:
        return pt, R, out
    return pt, R


def rot_err(Rc, Rt):
    E = Rt @ Rc.T
    ang = np.arccos(np.clip((np.trace(E) - 1) / 2, -1, 1))
    if ang < 1e-6:
        return np.zeros(3)
    w = np.array([E[2, 1] - E[1, 2], E[0, 2] - E[2, 0], E[1, 0] - E[0, 1]]) / (2 * np.sin(ang))
    return w * ang


QPREF = {'L': np.array([-0.4, 0.25, 0.0, 0.3, 0.0, 0.0, 0.0])}
QPREF['R'] = QPREF['L'] * np.array([1, -1, -1, 1, -1, 1, -1])


def ik(pt, Rt, side, q0):
    s = 1.0 if side == 'L' else -1.0
    lo, hi = limits(side)
    q0 = np.clip(np.asarray(q0, float), lo + 1e-3, hi - 1e-3)

    def res(q):
        p, R, fr = fk(q, side, frames=True)
        er = rot_err(R, Rt)
        ey = s * fr[3][1]
        wy = s * fr[4][1]
        pen = [max(0.0, 0.14 - ey) * 3, max(0.0, 0.03 - wy) * 3]
        return np.concatenate([(p - pt), 0.15 * er, 0.02 * (q - QPREF[side]), pen])

    sol = least_squares(res, q0, bounds=(lo, hi), xtol=1e-7, ftol=1e-9, max_nfev=200)
    return sol.x


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


# ----------------------------------------------------------------------------- vision


def neutral_mask(im):
    im = im.astype(int)
    mx, mn = im.max(2), im.min(2)
    return ((mx - mn) < 14) & (mx > 60) & (mx < 236)


def wrist_blobs(im, min_area=120):
    m = ndimage.binary_opening(neutral_mask(im), iterations=1)
    lab, n = ndimage.label(m)
    out = []
    for i in range(1, n + 1):
        comp = lab == i
        a = int(comp.sum())
        if a < min_area:
            continue
        ys, xs = np.nonzero(comp)
        y1 = ys.max()
        band = comp[max(0, y1 - 6):y1 + 1]
        bx = np.nonzero(band.any(0))[0]
        out.append(dict(u=float(xs.mean()), ub=float(bx.min() + bx.max()) / 2, area=a, y1=int(y1)))
    return out


def head_mugs(im):
    """Mugs seen by the head camera at the counter stance: dark-gray blobs above the counter edge."""
    im = im.astype(int)
    mx, mn = im.max(2), im.min(2)
    m = ((mx - mn) < 16) & (mx > 50) & (mx < 215)
    m[55:] = False
    m = ndimage.binary_opening(m, iterations=1)
    lab, n = ndimage.label(m)
    out = []
    for i in range(1, n + 1):
        comp = lab == i
        a = int(comp.sum())
        if a < 25:
            continue
        ys, xs = np.nonzero(comp)
        out.append(dict(u=float(xs.mean()), v=float(ys.mean()), area=a, y1=int(ys.max())))
    return out


# ----------------------------------------------------------------------------- policy

REST = {'L': np.array([0.12, 0.25, -0.1]), 'R': np.array([0.12, -0.25, -0.1])}
RAISED = {'L': np.array([0.25, 0.28, 0.27]), 'R': np.array([0.25, -0.28, 0.27])}
STANCE_X = 0.20
Z_GRASP = 0.14
Z_LOOK = 0.28
Z_PRE = 0.22
YAW = {'L': 0.0, 'R': 0.0}
DEEP = 0.015
U_CANON = {'R': 40.0, 'L': 44.0}
APP_N = 10
LOOK_Y = {'R': 0.045, 'L': -0.03}
PLACE_BASE = (0.12, -0.62)
PLACE_X = 0.44
PLACE_Y = 0.07
SQUAT_H = 0.55
STALL = 0.015


class NoList:
    def append(self, x):
        pass


class DbgList(list):
    pass


class Policy:
    def reset(self, obs, tools):
        self.tools = tools
        self.obs = obs
        self.a = np.asarray(tools.hold_action(), dtype=float)
        self.qt = {'L': self.a[5:12].copy(), 'R': self.a[12:19].copy()}
        self.qcmd = {'L': self.qt['L'].copy(), 'R': self.qt['R'].copy()}
        self.off = {'L': np.zeros(7), 'R': np.zeros(7)}
        self.base_t = None
        self.y_adj = {}
        self.log = []
        self.dbg = DbgList() if getattr(self, 'debug', False) else NoList()
        self.gen = self.run()

    # ---- low level
    @property
    def lo(self):
        return self.obs['low_dim_obs']

    def qmeas(self, side):
        return self.lo[3:10] if side == 'L' else self.lo[12:19]

    def tool(self, side):
        return fk(self.qmeas(side), side)

    def act(self, obs, tools):
        self.obs = obs
        try:
            next(self.gen)
        except StopIteration:
            pass
        return self.a.astype(np.float32)

    def _update(self):
        lo = self.lo
        for s, sl in (('L', slice(5, 12)), ('R', slice(12, 19))):
            err = self.qcmd[s] - self.qmeas(s)
            self.off[s] = np.clip(self.off[s] + 0.05 * err, -0.4, 0.4)
            self.a[sl] = self.qcmd[s] + self.off[s]
        if self.base_t is not None:
            xt, yt, yawt = self.base_t
            c, s_ = np.cos(lo[24]), np.sin(lo[24])
            dx, dy = xt - lo[21], yt - lo[22]
            ex, ey = c * dx + s_ * dy, -s_ * dx + c * dy
            vx = np.clip(1.5 * ex, -0.25, 0.25)
            vy = np.clip(1.5 * ey, -0.2, 0.2)
            sp = np.hypot(vx, vy)
            if np.hypot(ex, ey) < 0.015:
                vx = vy = 0.0
            elif sp < 0.07:
                vx, vy = vx / sp * 0.07, vy / sp * 0.07
            e = wrap(yawt - lo[24])
            wz = float(np.clip(2.0 * e, -0.6, 0.6)) if abs(e) > 0.02 else 0.0
            self.a[0], self.a[1], self.a[3] = vx, vy, wz

    def wait(self, n):
        for _ in range(n):
            self._update()
            yield

    def move(self, side, P, R, n):
        """IK to (P, R) and interpolate the joint targets over n steps."""
        q1 = ik(np.asarray(P, float), R, side, self.qt[side])
        q0 = self.qcmd[side].copy()
        self.qt[side] = q1
        n = max(1, n)
        for i in range(n):
            self.qcmd[side] = q0 + (q1 - q0) * (i + 1) / n
            self._update()
            yield

    def move2(self, PL, RL, PR, RR, n):
        """Move both arms simultaneously."""
        q1L = ik(np.asarray(PL, float), RL, 'L', self.qt['L'])
        q1R = ik(np.asarray(PR, float), RR, 'R', self.qt['R'])
        q0L, q0R = self.qcmd['L'].copy(), self.qcmd['R'].copy()
        self.qt['L'], self.qt['R'] = q1L, q1R
        for i in range(n):
            f = (i + 1) / n
            self.qcmd['L'] = q0L + (q1L - q0L) * f
            self.qcmd['R'] = q0R + (q1R - q0R) * f
            self._update()
            yield

    def grip(self, side, g):
        self.a[19 if side == 'L' else 20] = g

    # ---- behaviour
    def run(self):
        lo = self.lo
        self.y0 = float(lo[22])
        self.grip('L', 0.0)
        self.grip('R', 0.0)
        # raise the hands above counter height (wide, out of the head view), walk in
        yield from self.move2(RAISED['L'], np.eye(3), RAISED['R'], np.eye(3), 40)
        self.base_t = (STANCE_X, self.y0, 0.0)
        yield from self.wait(120)
        self.held = {}
        # right mug with the right arm
        yield from self.center_mug('R')
        self.held['R'] = yield from self.grasp_one('R')
        pr, _ = self.tool('R')
        yield from self.move('R', np.array([0.22, -0.30, 0.26]), np.eye(3), 40)
        # left mug with the left arm
        yield from self.center_mug('L')
        self.held['L'] = yield from self.grasp_one('L')
        pl, _ = self.tool('L')
        yield from self.move('L', np.array([0.22, 0.30, 0.26]), np.eye(3), 40)
        self.log.append(('held', self.held, int(self.obs['t'])))
        # back off and turn to the dishwasher
        self.base_t = (STANCE_X - 0.2, float(self.lo[22]), 0.0)
        yield from self.wait(70)
        self.base_t = (STANCE_X - 0.2, float(self.lo[22]), np.pi / 2)
        for _ in range(25):
            yield from self.wait(8)
            if abs(wrap(self.lo[24] - np.pi / 2)) < 0.12:
                break
        self.log.append(('turned', int(self.obs['t'])))
        yield from self.place()
        while True:
            yield from self.wait(10)

    def center_mug(self, side):
        """Shift the base sideways so the target mug is at a canonical head-image column."""
        for it in range(2):
            mugs = head_mugs(self.tools.image('head'))
            mugs = [m for m in mugs if m['area'] >= 60]
            mugs = sorted(mugs, key=lambda m: -m['area'])[:2]
            self.log.append(('head_mugs', side, [(round(m['u'], 1), round(m['v'], 1), m['area']) for m in mugs]))
            if not mugs:
                return
            if len(mugs) == 2:
                m = max(mugs, key=lambda m: m['u']) if side == 'R' else min(mugs, key=lambda m: m['u'])
            else:
                m = mugs[0]
            dy = float(np.clip((U_CANON[side] - m['u']) * 0.0045, -0.2, 0.2))
            if it > 0 and abs(dy) < 0.02:
                break
            self.base_t = (STANCE_X, float(self.lo[22]) + dy, 0.0)
            for _ in range(25):
                yield from self.wait(8)
                if abs(self.base_t[1] - self.lo[22]) < 0.015:
                    break
            yield from self.wait(15)
            self.log.append(('centered', side, round(dy, 3), round(float(self.base_t[1] - self.lo[22]), 3), int(self.obs['t'])))
        # final measurement: residual offset handled by the arm
        mugs = [m for m in head_mugs(self.tools.image('head')) if m['area'] >= 60]
        mugs = sorted(mugs, key=lambda m: -m['area'])[:2]
        self.y_adj[side] = 0.0
        if mugs:
            if len(mugs) == 2:
                m = max(mugs, key=lambda m: m['u']) if side == 'R' else min(mugs, key=lambda m: m['u'])
            else:
                m = mugs[0]
            self.y_adj[side] = float(np.clip((U_CANON[side] - m['u']) * 0.0045, -0.08, 0.08))
        self.log.append(('y_adj', side, round(self.y_adj[side], 3)))

    def grasp_one(self, side):
        cam = 'left_wrist' if side == 'L' else 'right_wrist'
        Rg = np.eye(3)
        fwd, lat = Rg[:, 0], Rg[:, 1]
        base = np.array([0.20, LOOK_Y[side] + self.y_adj.get(side, 0.0), Z_LOOK])
        yield from self.move(side, base, Rg, 30)
        lat_off = 0.0
        base = base.copy()
        base[2] = Z_PRE
        yield from self.move(side, base, Rg, 20)
        for k in range(6):
            im = self.tools.image(cam)
            bs = wrist_blobs(im)
            bs = [b for b in bs if b['area'] >= 200]
            b = (min(bs, key=lambda b: b['u']) if side == 'L' else max(bs, key=lambda b: b['u'])) if bs else None
            self.dbg.append((f'pre{k}{side}', im, b))
            if b is None:
                if k >= 2:
                    break
                lat_off += 0.04 if side == 'R' else -0.04
                yield from self.move(side, base + lat_off * lat, Rg, 15)
                continue
            d = float(np.clip(-(b['ub'] - 42) * 0.0012, -0.03, 0.03))
            lat_off = float(np.clip(lat_off + d, -0.12, 0.12))
            yield from self.move(side, base + lat_off * lat, Rg, 12)
            if abs(b['ub'] - 42) < 4:
                break
        base[2] = Z_GRASP
        yield from self.move(side, base + lat_off * lat, Rg, 20)
        s = 0.0
        k = 0
        while s < 0.25:
            k += 1
            if s < 0.12:
                im = self.tools.image(cam)
                bs = wrist_blobs(im)
                b = min(bs, key=lambda b: abs(b['ub'] - 42) - 0.01 * b['area']) if bs else None
                self.dbg.append((f'app{k}{side}', im, b))
                if b is not None:
                    lat_off += float(np.clip(-(b['ub'] - 42) * 0.0008, -0.012, 0.012))
                    lat_off = float(np.clip(lat_off, -0.09, 0.09))
            s += 0.01
            yield from self.move(side, base + s * fwd + lat_off * lat, Rg, APP_N)
            pm, _ = self.tool(side)
            prog = (pm - base - lat_off * lat) @ fwd
            if s - prog > STALL and s > 0.06:
                break
        yield from self.move(side, base + (s + 0.01) * fwd + lat_off * lat, Rg, 15)
        self.grip(side, 1.0)
        yield from self.wait(35)
        g = float(self.lo[50 if side == 'L' else 51])
        pm, _ = self.tool(side)
        for i in range(8):
            yield from self.move(side, pm + np.array([0, 0, 0.012 * (i + 1)]), Rg, 5)
        yield from self.wait(5)
        g2 = float(self.lo[50 if side == 'L' else 51])
        self.log.append(('grasp', side, round(g, 2), round(g2, 2), round(s, 3), round(lat_off, 3), int(self.obs['t'])))
        return g2 < 0.97

    def place(self):
        self.base_t = (PLACE_BASE[0], PLACE_BASE[1], np.pi / 2)
        for _ in range(20):
            yield from self.wait(8)
            lo = self.lo
            if np.hypot(lo[21] - PLACE_BASE[0], lo[22] - PLACE_BASE[1]) < 0.02 and abs(wrap(lo[24] - np.pi / 2)) < 0.04:
                break
        self.log.append(('at_rack', [round(float(v), 3) for v in self.lo[21:25]], int(self.obs['t'])))
        P = {'L': np.array([PLACE_X, PLACE_Y, 0.14]), 'R': np.array([PLACE_X, -PLACE_Y, 0.14])}
        yield from self.move2(P['L'], np.eye(3), P['R'], np.eye(3), 40)
        self.base_t = None
        self.a[0] = self.a[1] = self.a[3] = 0.0
        h0 = float(self.a[2])
        for i in range(60):
            self.a[2] = h0 + (SQUAT_H - h0) * (i + 1) / 60
            yield from self.wait(1)
        yield from self.wait(20)
        done = {'L': not self.held.get('L'), 'R': not self.held.get('R')}
        d0 = {}
        z = 0.14
        while not all(done.values()) and z > -0.2:
            z -= 0.01
            for s in ('L', 'R'):
                if not done[s]:
                    P[s][2] = z
            yield from self.move2(P['L'], np.eye(3), P['R'], np.eye(3), 10)
            for s in ('L', 'R'):
                if done[s]:
                    continue
                pm, _ = self.tool(s)
                d = pm[2] - P[s][2]
                if s not in d0:
                    d0[s] = d
                if d - d0[s] > 0.012:
                    done[s] = True
        self.log.append(('lowered', round(z, 3), int(self.obs['t'])))
        self.grip('L', 0.0)
        self.grip('R', 0.0)
        yield from self.wait(25)
        pl, _ = self.tool('L')
        pr, _ = self.tool('R')
        yield from self.move2(pl + np.array([-0.10, 0, 0.06]), np.eye(3), pr + np.array([-0.10, 0, 0.06]), np.eye(3), 40)
        self.log.append(('released', int(self.obs['t'])))
