"""Scripted two-plate transfer for the G1: left rack -> right rack.

Structure: the episode is a generator (`_run`) that yields one action per
control step.  Geometry comes from
  * an approximate G1 arm kinematic model (URDF numbers) + numeric IK,
  * the head camera (pinhole model) to locate both racks at t=0,
  * the wrist cameras to centre the gripper over a plate rim before grasping.
"""

import numpy as np

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


def _T(R, p):
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = p
    return M


_AX = {'x': _rx, 'y': _ry, 'z': _rz}
_LEFT = [
    ((0.0039563, 0.10022, 0.24778), (0.27931, 5.4949e-05, -0.00019159), 'y'),
    ((0, 0.038, -0.013831), (-0.27925, 0, 0), 'x'),
    ((0, 0.00624, -0.1032), (0, 0, 0), 'z'),
    ((0.015783, 0, -0.080518), (0, 0, 0), 'y'),
    ((0.100, 0.00188791, -0.010), (0, 0, 0), 'x'),
    ((0.038, 0, 0), (0, 0, 0), 'y'),
    ((0.046, 0, 0), (0, 0, 0), 'z'),
]


def _chain(side):
    out = []
    for (x, y, z), (r, p, yy), ax in _LEFT:
        if side == 'right':
            y, r, yy = -y, -r, -yy
        R = _rz(yy) @ _ry(p) @ _rx(r)
        out.append((_T(R, [x, y, z]), _AX[ax]))
    return out


_CH = {'left': _chain('left'), 'right': _chain('right')}
TOOL = 0.15


def torso_T(waist):
    return (_T(_rz(waist[0]), [0, 0, 0]) @ _T(_rx(waist[1]), [-0.0039635, 0, 0.035])
            @ _T(_ry(waist[2]), [0, 0, 0.019]))


def fk(q, side, waist, tool=TOOL):
    M = torso_T(waist)
    for qi, (Tj, axf) in zip(q, _CH[side]):
        M = M @ Tj
        M[:3, :3] = M[:3, :3] @ axf(qi)
    M = M.copy()
    M[:3, 3] = M[:3, 3] + M[:3, 0] * tool
    return M


_LO = np.array([-3.0892, 0.0, -2.618, -1.0472, -1.97222, -1.61443, -1.61443]) + 0.05
_HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443]) - 0.05
LIM = {'left': (_LO, _HI),
       'right': (np.r_[_LO[0], -2.2515 + 0.05, _LO[2:]], np.r_[_HI[0], -0.05, _HI[2:]])}


def _rotvec(Re):
    return 0.5 * np.array([Re[2, 1] - Re[1, 2], Re[0, 2] - Re[2, 0], Re[1, 0] - Re[0, 1]])


def ik(p, R, q0, side, waist, iters=15, w_rot=0.3):
    q = np.array(q0, dtype=float)
    lo, hi = LIM[side]
    for _ in range(iters):
        M = fk(q, side, waist)
        err = np.r_[p - M[:3, 3], w_rot * _rotvec(R @ M[:3, :3].T)]
        if np.linalg.norm(err) < 1e-5:
            break
        J = np.zeros((6, 7))
        for i in range(7):
            dq = np.zeros(7)
            dq[i] = 1e-5
            M2 = fk(q + dq, side, waist)
            J[:3, i] = (M2[:3, 3] - M[:3, 3]) / 1e-5
            J[3:, i] = w_rot * _rotvec(M2[:3, :3] @ M[:3, :3].T) / 1e-5
        dq = J.T @ np.linalg.solve(J @ J.T + 1e-3 * np.eye(6), err)
        q = np.clip(q + np.clip(dq, -0.3, 0.3), lo, hi)
    return q


# ----------------------------------------------------------------------------- head camera

CAM = (0.0576235, 0.01753, 0.42987, 0.8307767 + 0.22)
FOVY = 62.0
Y_BIAS = -0.035  # head-camera lateral bias measured against the wrist camera / grasps


def unproject(uv, z_pel, waist=(0, 0, 0.055), W=84):
    cx, cy, cz, pitch = CAM
    Mc = torso_T(waist) @ _T(_ry(pitch), [cx, cy, cz])
    f = (W / 2) / np.tan(np.radians(FOVY) / 2)
    d = Mc[:3, :3] @ np.array([1.0, (W / 2 - uv[0]) / f, (W / 2 - uv[1]) / f])
    o = Mc[:3, 3]
    t = (z_pel - o[2]) / d[2]
    return o + t * d


def brown(im):
    g = im.astype(int)
    r, gg, b = g[..., 0], g[..., 1], g[..., 2]
    return (r - b > 35) & (r > gg) & (gg > b)


def racks_t0(im):
    """Front-bar row and inner end column of the left and right rack in the t=0 head image."""
    m = brown(im)[:40]
    has = m.sum(0) > 0
    best, gap, u = (30, 50), 0, 0
    while u < 84:
        if not has[u]:
            s = u
            while u < 84 and not has[u]:
                u += 1
            if s > 0 and u < 84 and u - s > gap:
                gap, best = u - s, (s, u)
        else:
            u += 1
    out = {}
    for name, sl in (('left', slice(0, best[0])), ('right', slice(best[1], 84))):
        mm = np.zeros_like(m)
        mm[:, sl] = m[:, sl]
        rows = mm.sum(1)
        if rows.max() == 0:
            out[name] = None
            continue
        thr = 0.5 * rows.max()
        vb = max(i for i in range(40) if rows[i] >= thr)
        band = mm[max(0, vb - 1):vb + 2]
        us = np.nonzero(band.any(0))[0]
        end = us.max() + 1.0 if name == 'left' else float(us.min())
        out[name] = (end, vb + 0.5)
    return out


# ----------------------------------------------------------------------------- wrist camera


def rim_columns(im, v0=15, v1=84, thr=215, min_rows=6):
    """(u, weight) of bright, near-vertical plate-rim highlights."""
    m = (im.astype(int).min(2) > thr)[v0:v1]
    cnt = m.sum(0)
    out, u = [], 0
    while u < len(cnt):
        if cnt[u] >= 2:
            s = u
            while u < len(cnt) and cnt[u] >= 2:
                u += 1
            seg = cnt[s:u]
            tot = seg.sum()
            if tot >= min_rows:
                out.append((float((np.arange(s, u) * seg).sum() / tot), int(tot), u - s))
        else:
            u += 1
    return out


def cluster_plates(dets, y_end, gap=0.035, min_w=60):
    """Group rim detections (world y, weight) into plates; return plate y's sorted ascending."""
    dets = sorted([d for d in dets if y_end - 0.02 < d[0] < y_end + 0.32], key=lambda d: d[0])
    groups = []
    for y, w, _ in dets:
        if groups and y - groups[-1][-1][0] < gap:
            groups[-1].append((y, w))
        else:
            groups.append([(y, w)])
    out = []
    for g in groups:
        w = np.array([x[1] for x in g], dtype=float)
        if w.sum() >= min_w:
            out.append((float(np.dot(w, [x[0] for x in g]) / w.sum()), float(w.sum())))
    out = sorted(out, key=lambda o: -o[1])
    return sorted(o[0] for o in out[:2]), [o[0] for o in out[2:3]]


# ----------------------------------------------------------------------------- policy

GR = _ry(0.15)          # gripper orientation: pointing forward, pitched 0.15 rad down
U0 = 41.0               # wrist-image column of the gripper centre
PX_PER_M = 350.0        # wrist-image scale at the pre-grasp height (px per m)
Z_PRE = 0.25            # tool height (pelvis frame) above the plates
Z_SCAN = 0.27
Z_CARRY = 0.30
Z_GRASP = 0.125
Z_PLACE = 0.14
G_OPEN = 0.5            # pre-grasp opening
REACH = 0.14            # lateral tool offset from the pelvis used for grasp/place
X_BASE = 0.42           # plate x minus pelvis x at the work pose
CARRY_YAW = 1.2         # hand yaw while walking: plate plane close to the walking direction
PLATE_DX = 0.035        # plate x relative to the detected front bar
SLOT_DY = {'right': -0.20, 'left': -0.11}     # target slots from the right rack's inner end
CARRY_OUT = 0.04        # hands move outward by this while carrying
RIGHT_TUCK = (0.18, -0.22, 0.12)   # idle right-hand tool position (pelvis frame)
X_BACK = 0.10          # base set-back while walking between the racks
PAIR_SEP = 0.065       # plates closer than this are grasped together directly
NEST_DY = 0.02          # set the moved plate down this far on the -y side of the other plate's rim
Z_NEST = 0.13           # tool height at which the moved plate is released
PAIR_OFF = 0.012        # pair grasp centre relative to the outer plate's rim


class Policy:
    def reset(self, obs, tools):
        self.tools = tools
        self.obs = obs
        self.a = np.asarray(tools.hold_action(), dtype=np.float64).copy()
        self.q = {'left': np.zeros(7), 'right': np.zeros(7)}
        self.qi = {'left': np.zeros(7), 'right': np.zeros(7)}
        self.R = {'left': GR, 'right': GR}
        self.log = []
        self.dbg = []
        self.gen = self._run()

    def act(self, obs, tools):
        self.obs = obs
        try:
            a = next(self.gen)
        except Exception:  # finished (StopIteration) or an unexpected failure: stand still
            self.gen = self._idle()
            a = next(self.gen)
        return np.asarray(a, dtype=np.float32)

    # ------------------------------------------------------------------ low level
    @property
    def l(self):
        return self.obs['low_dim_obs']

    def qobs(self, side):
        return self.l[3:10] if side == 'left' else self.l[12:19]

    def _arms(self):
        for side, sl in (('left', slice(5, 12)), ('right', slice(12, 19))):
            e = self.q[side] - self.qobs(side)
            self.qi[side] = np.clip(self.qi[side] + 0.05 * e, -0.15, 0.15)
            self.a[sl] = self.q[side] + self.qi[side]

    def _step(self):
        self._arms()
        return self.a.copy()

    def _idle(self):
        self.finished = True
        while True:
            self.a[0] = self.a[1] = self.a[3] = 0.0
            yield self._step()

    def hold(self, n):
        for _ in range(n):
            yield self._step()

    def to_pel(self, pw):
        x, y, yaw = self.l[21], self.l[22], self.l[24]
        dx, dy = pw[0] - x, pw[1] - y
        c, s = np.cos(yaw), np.sin(yaw)
        return np.array([c * dx + s * dy, -s * dx + c * dy, pw[2]])

    def to_world(self, pp):
        x, y, yaw = self.l[21], self.l[22], self.l[24]
        c, s = np.cos(yaw), np.sin(yaw)
        return np.array([x + c * pp[0] - s * pp[1], y + s * pp[0] + c * pp[1], pp[2]])

    def tool_cmd(self, side):
        return fk(self.q[side], side, self.l[0:3])[:3, 3]

    def tool_meas(self, side):
        return fk(self.qobs(side), side, self.l[0:3])[:3, 3]

    def move(self, side, p_pel, n, R=None):
        p0 = self.tool_cmd(side)
        R = self.R[side] if R is None else R
        p_pel = np.asarray(p_pel, dtype=float)
        for k in range(1, n + 1):
            p = p0 + (p_pel - p0) * k / n
            self.q[side] = ik(p, R, self.q[side], side, self.l[0:3])
            yield self._step()

    def move_w(self, side, pw, n):
        yield from self.move(side, self.to_pel(pw), n)

    def rel(self, side, d, n):
        yield from self.move(side, self.tool_cmd(side) + np.asarray(d), n)

    def rotate(self, side, yaw, n, d=(0, 0, 0)):
        """Turn the hand to yaw (about vertical, relative to GR) while shifting by d."""
        p0 = self.tool_cmd(side)
        p1 = p0 + np.asarray(d)
        y0 = np.arctan2(self.R[side][1, 0], self.R[side][0, 0])
        for k in range(1, n + 1):
            f = k / n
            R = _rz(y0 + (yaw - y0) * f) @ GR
            self.q[side] = ik(p0 + (p1 - p0) * f, R, self.q[side], side, self.l[0:3], iters=20)
            yield self._step()
        self.R[side] = _rz(yaw) @ GR

    def grip(self, side, g, n=30):
        self.a[19 if side == 'left' else 20] = g
        yield from self.hold(n)

    def walk(self, tx, ty, vmax=0.2, acc=0.006, tol=0.015, tries=2, maxn=260):
        for t in range(tries):
            if t > 0 and np.hypot(tx - self.l[21], ty - self.l[22]) < 1.5 * tol:
                break
            vprev = np.zeros(2)
            for _ in range(maxn):
                x, y, yaw = self.l[21], self.l[22], self.l[24]
                ex, ey = tx - x, ty - y
                eyaw = (-yaw + np.pi) % (2 * np.pi) - np.pi
                if np.hypot(ex, ey) < tol and abs(eyaw) < 0.06:
                    break
                c, s = np.cos(yaw), np.sin(yaw)
                v = 2.5 * np.array([c * ex + s * ey, -s * ex + c * ey])
                n = np.linalg.norm(v)
                if n > vmax:
                    v *= vmax / n
                if 1e-6 < n < 0.07:
                    v *= 0.07 / n
                dv = v - vprev
                dn = np.linalg.norm(dv)
                if dn > acc:
                    v = vprev + dv * acc / dn
                vprev = v
                self.a[0], self.a[1] = v
                self.a[3] = np.clip(2.0 * eyaw, -0.5, 0.5)
                yield self._step()
            self.a[0] = self.a[1] = self.a[3] = 0.0
            yield from self.hold(20)

    def gstate(self, side):
        return self.l[50] if side == 'left' else self.l[51]

    # ------------------------------------------------------------------ perception
    def locate_racks(self):
        im = self.tools.image('head')
        r = racks_t0(im)
        res = {}
        for name in ('left', 'right'):
            if r[name] is None:
                res[name] = None
                continue
            p = self.to_world(unproject(r[name], 0.065, self.l[0:3]))
            res[name] = np.array([p[0], p[1] + Y_BIAS])
        if res['left'] is None:
            res['left'] = np.array([0.425, 0.115])
        if res['right'] is None:
            res['right'] = np.array([0.393, -0.161])
        return res

    def scan(self, side, x, y0, y1, n):
        """Sweep the hand over the rack; return world-y of rim highlights (y, weight)."""
        dets = []
        self.a[19 if side == 'left' else 20] = 0.0
        for k in range(n):
            y = y0 + (y1 - y0) * k / max(1, n - 1)
            yield from self.move_w(side, (x, y, Z_SCAN), 22 if k else 50)
            yield from self.hold(6)
            im = self.tools.image(side + '_wrist')
            self.dbg.append((side, im))
            tw = self.to_world(self.tool_meas(side))
            for u, w, _ in rim_columns(im):
                dets.append((tw[1] - (u - U0) / PX_PER_M, w, k))
        self.log.append(('scan', [(round(d[0], 3), d[1], d[2]) for d in dets]))
        return dets

    def servo_rim(self, side, n_iter=3, gain=0.8, max_off=32):
        cam = side + '_wrist'
        for _ in range(n_iter):
            im = self.tools.image(cam)
            self.dbg.append((side, im))
            rims = [r for r in rim_columns(im) if abs(r[0] - U0) < max_off]
            self.log.append((side, 'rims', rims))
            if not rims:
                return
            narrow = [r for r in rims if r[2] <= 4]
            u = min(narrow or rims, key=lambda r: abs(r[0] - U0))[0]
            dy = -(u - U0) / PX_PER_M * gain
            if abs(dy) < 0.002:
                return
            yield from self.rel(side, (0, float(np.clip(dy, -0.05, 0.05)), 0), 14)
            yield from self.hold(8)

    def servo_pair(self, side, n_iter=3, gain=0.8, max_off=30):
        """Centre the open gripper between the two strongest rims near the centre."""
        cam = side + '_wrist'
        for _ in range(n_iter):
            im = self.tools.image(cam)
            self.dbg.append((side, im))
            rims = [r for r in rim_columns(im) if abs(r[0] - U0) < max_off]
            self.log.append((side, 'pair_rims', rims))
            if not rims:
                return
            rims = sorted(rims, key=lambda r: -r[1])[:2]
            u = float(np.mean([r[0] for r in rims]))
            dy = -(u - U0) / PX_PER_M * gain
            if abs(dy) < 0.002:
                return
            yield from self.rel(side, (0, float(np.clip(dy, -0.04, 0.04)), 0), 12)
            yield from self.hold(8)

    # ------------------------------------------------------------------ skills
    def grasp(self, side, pw, g_open=G_OPEN, rotate=True, servo=True):
        self.grasp_ok = False
        yield from self.grip(side, g_open, 1)
        yield from self.move_w(side, (pw[0], pw[1], Z_PRE), 40)
        yield from self.hold(8)
        for attempt in range(2):
            if servo == 'pair':
                yield from self.servo_pair(side)
            elif servo:
                yield from self.servo_rim(side)
            yield from self.rel(side, (0, 0, Z_GRASP + (0.0, -0.02, 0.02)[attempt] - self.tool_cmd(side)[2]), 35)
            yield from self.hold(6)
            yield from self.grip(side, 1.0, 22)
            self.log.append((side, 'grip', float(self.gstate(side)), int(self.obs['t'])))
            self.grasp_ok = self.gstate(side) < 0.97
            if self.grasp_ok:
                break
            yield from self.grip(side, g_open, 12)
            yield from self.rel(side, (0, 0, Z_PRE - self.tool_cmd(side)[2]), 35)
            yield from self.hold(8)
        yield from self.rel(side, (0, 0, Z_CARRY - self.tool_cmd(side)[2]), 50)
        if rotate and self.grasp_ok:
            sgn = -1.0 if side == 'left' else 1.0
            yield from self.rotate(side, sgn * CARRY_YAW, 45, d=(-0.03, -sgn * CARRY_OUT, 0))

    def place(self, side, pw, unrotate=True):
        if unrotate:
            yield from self.rotate(side, 0.0, 40, d=(0.03, 0, 0))
        yield from self.move_w(side, (pw[0], pw[1], Z_CARRY), 35)
        yield from self.hold(12)
        yield from self.rel(side, (0, 0, Z_PLACE - Z_CARRY), 65)
        yield from self.hold(10)
        self.log.append((side, 'place_z', self.tool_meas(side).round(3).tolist(), int(self.obs['t'])))
        yield from self.grip(side, 0.0, 20)
        yield from self.rel(side, (0, 0, Z_CARRY - self.tool_cmd(side)[2]), 35)

    # ------------------------------------------------------------------ script
    def _run(self):
        yield from self.hold(2)
        racks = self.locate_racks()
        self.racks = racks
        L, Rr = racks['left'], racks['right']
        xL = L[0] + PLATE_DX
        xR = Rr[0] + PLATE_DX
        xb = min(xL, xR) - X_BASE - X_BACK
        # keep the idle right arm tucked away from tables and racks
        yield from self.move('right', RIGHT_TUCK, 30)
        # scan the start rack with the left wrist camera
        yield from self.walk(xL - X_BASE, L[1], vmax=0.25)
        dets = yield from self.scan('left', xL, L[1] + 0.04, L[1] + 0.25, 4)
        plates, alt = cluster_plates(dets, L[1])
        self.log.append(('plates', plates, alt))
        if len(plates) >= 2 and plates[1] - plates[0] > PAIR_SEP:
            todo = [plates[1], plates[0]]
            g_open, servo = G_OPEN, True
        else:
            todo = [float(np.mean(plates)) if plates else L[1] + 0.10]
            g_open, servo = 0.0, 'pair'
        slots = [Rr[1] + SLOT_DY['right'], Rr[1] + SLOT_DY['left']]
        yield from self.move('left', (0.30, 0.25, 0.20), 25)
        for i, yp in enumerate(todo):
            self.log.append(('t_go', i, int(self.obs['t'])))
            yield from self.walk(xL - X_BASE, yp - REACH, vmax=0.3 if i else 0.2, tol=0.02, tries=1, maxn=320)
            yield from self.grasp('left', (xL, yp), g_open=g_open, servo=servo)
            if not self.grasp_ok and alt:
                # nothing caught: try the remaining rim candidate
                yield from self.grip('left', G_OPEN, 10)
                yield from self.walk(xL - X_BASE, alt[0] - REACH, tol=0.02, tries=1, maxn=200)
                yield from self.grasp('left', (xL, alt[0]), g_open=g_open, servo=servo)
                alt = []
            self.log.append(('t_grasped', i, int(self.obs['t']), float(self.gstate('left'))))
            if not self.grasp_ok:
                continue
            both = self.gstate('left') < 0.85
            s = slots[0] if (i == 0 or both) else slots[1]
            yield from self.walk(xR - X_BASE, s - REACH, vmax=0.25, tol=0.02, tries=1, maxn=320)
            yield from self.place('left', (xR, s))
            self.log.append(('t_placed', i, int(self.obs['t'])))
            if both:
                break
            if i + 1 < len(todo):
                yield from self.move('left', (0.30, 0.25, 0.25), 25)
                pass
        yield from self.move('left', (0.25, 0.30, 0.15), 30)
        yield from self.hold(10)
