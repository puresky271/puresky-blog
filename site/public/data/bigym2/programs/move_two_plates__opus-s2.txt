"""Move both plates from the left dish rack to the right dish rack (Unitree G1).

Hand-written script: head-camera perception of racks/plates (colour masks), approximate
arm kinematics with a resolved-rate / IK Cartesian controller, wrist-camera alignment
before grasping, walking with closed-loop odometry.
"""

import cv2
import numpy as np
from scipy import ndimage
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


def _T(R, p):
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = p
    return M


_AX = {'x': _rx, 'y': _ry, 'z': _rz}


def _chain(side):
    s = 1 if side == 'L' else -1
    return [
        ((0.0039563, s * 0.10022, 0.23778), (s * 0.27931, 0, 0), 'y'),
        ((0, s * 0.038, -0.013831), (-s * 0.27925, 0, 0), 'x'),
        ((0, s * 0.00624, -0.1032), (0, 0, 0), 'z'),
        ((0.015783, 0, -0.080518), (0, 0, 0), 'y'),
        ((0.100, s * 0.00188791, -0.010), (0, 0, 0), 'x'),
        ((0.038, 0, 0), (0, 0, 0), 'y'),
        ((0.046, 0, 0), (0, 0, 0), 'z'),
    ]


_CH = {'L': _chain('L'), 'R': _chain('R')}
_FIX = {side: [_T(_rz(r[2]) @ _ry(r[1]) @ _rx(r[0]), p) for (p, r, ax) in _CH[side]] for side in 'LR'}
GA = np.arctan2(0.117, 0.155)
TIP = np.array([0.155, 0.0, -0.117])
RG = _ry(GA)


def arm_fk(q, side):
    M = np.eye(4)
    for F, (p, r, ax), qi in zip(_FIX[side], _CH[side], q):
        R = np.eye(4)
        R[:3, :3] = _AX[ax](qi)
        M = M @ F @ R
    return M


def grip_pose(q, side):
    M = arm_fk(q, side)
    return M[:3, 3] + M[:3, :3] @ TIP, M[:3, :3] @ RG


_LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
_HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])


def limits(side):
    lo, hi = _LO.copy(), _HI.copy()
    if side == 'R':
        lo[1], hi[1] = -2.2515, 1.5882
    return lo, hi


MIRROR = np.array([1, -1, -1, 1, -1, 1, -1.0])


def ik_grip(side, pos, gx, gy, q0, w_ori=1.0, w_ref=0.05, w_gx=1.0):
    lo, hi = limits(side)
    q0 = np.clip(np.asarray(q0, float), lo + 1e-3, hi - 1e-3)

    def res(q):
        p, R = grip_pose(q, side)
        return np.concatenate([p - pos, w_gx * w_ori * (R[:, 0] - gx), w_ori * (R[:, 1] - gy), w_ref * (q - q0)])

    s = least_squares(res, q0, bounds=(lo, hi))
    p, _ = grip_pose(s.x, side)
    return s.x, float(np.linalg.norm(p - pos))


def down_frame():
    """gripper axis along torso -z, closing axis along torso y"""
    return np.array([0, 0, -1.0]), np.array([0, 1.0, 0])


# ----------------------------------------------------------------------------- perception


def _hsv(im):
    return cv2.cvtColor(im, cv2.COLOR_RGB2HSV).astype(int)


def rack_mask(im):
    hsv = _hsv(im)
    return (hsv[..., 0] >= 3) & (hsv[..., 0] <= 25) & (hsv[..., 1] >= 55) & (hsv[..., 2] >= 60)


def find_rack(im, ymax=55, xlim=(0, 84)):
    m = rack_mask(im)
    m[ymax:, :] = False
    m[:, :xlim[0]] = False
    m[:, xlim[1]:] = False
    m = ndimage.binary_closing(m, np.ones((3, 3)))
    lab, n = ndimage.label(m)
    if n == 0:
        return None
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    k = int(np.argmax(sizes)) + 1
    if sizes[k - 1] < 30:
        return None
    ys, xs = np.nonzero(lab == k)
    return dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()),
                cx=float(xs.mean()), cy=float(ys.mean()), n=len(xs), mask=(lab == k))


def gray_mask(im):
    hsv = _hsv(im)
    return (hsv[..., 1] <= 4) & (hsv[..., 2] >= 40)


def head_plates(im):
    """plate columns in a band just above the left rack. returns rack, list of (col, weight)"""
    rk = find_rack(im)
    if rk is None:
        return None, []
    m = gray_mask(im)
    m[rk['y1'] + 1:] = False
    m[:, :max(0, rk['x0'] - 12)] = False
    m[:, min(84, rk['x1'] + 12):] = False
    band = m[max(0, rk['y0'] - 12):rk['y0'] + 1]
    cols = band.sum(0)
    lab, n = ndimage.label(cols >= 2)
    comps = []
    for k in range(1, n + 1):
        xs = np.nonzero(lab == k)[0]
        w = cols[xs]
        if w.sum() >= 6:
            a, b = max(0, xs.min() - 3), min(84, xs.max() + 4)
            sub = m[:rk['y0'] + 1, a:b]
            ys_, xs_ = np.nonzero(sub)
            ytop = ys_.min()
            utop = float(xs_[ys_ <= ytop + 1].mean()) + a
            comps.append([float(np.average(xs, weights=w)), float(w.sum()), int(xs.min()), int(xs.max()), utop, int(ytop)])
    return rk, comps


def wrist_plates(im):
    """plate regions in a wrist image looking down: list of (col_center, col_min, col_max, npix)"""
    m = gray_mask(im)
    hsv = _hsv(im)
    m &= hsv[..., 2] >= 70
    m[:, :3] = False
    m[:, 81:] = False
    m = ndimage.binary_opening(m, np.ones((3, 2)))
    colsum = m[5:75].sum(0)
    lab, n = ndimage.label(colsum >= 4)
    out = []
    for k in range(1, n + 1):
        xs = np.nonzero(lab == k)[0]
        w = colsum[xs]
        if w.sum() >= 40:
            out.append((float(np.average(xs, weights=w)), int(xs.min()), int(xs.max()), int(w.sum())))
    return out


# ----------------------------------------------------------------------------- constants

PITCH = -0.2
P0 = (0.0, 0.2)            # perception stance for the left rack
P1 = (0.0, -0.3)           # perception stance for the right rack
KU = 150.0                 # px per metre, lateral, at rack distance from P0/P1
KV = 80.0                  # px per metre, depth (rack centre row)
FPX = 80.0                 # px per rad (head camera yaw)
# linearisation reference: image column REF_U / rack row REF_CY <-> offset (REF_TX, REF_TY) from the pelvis
REF_U, REF_CY, REF_TX, REF_TY = 40.4, 28.2, 0.498, 0.04
GRASP_X = 0.35             # stance: plate this far ahead of the pelvis
PRE_Z, GRASP_Z, LIFT_Z = 0.10, 0.035, 0.20
PLACE_Z = 0.045
SINGLE_Z = 0.025           # grasp height for a lone (possibly leaning) plate
PAIR_Z = 0.17              # wrist-camera alignment height above a plate pair
TILT_X0, TILT_K = 0.36, 8.0  # gripper tilts forward (about the plate normal) beyond this reach
BACKOFF = 0.12             # step back from the counter before walking between the racks
MAX_SPREAD = 0.0          # plates further apart than this need two stances (single stance proved unreliable)
RACK_DX = 0.0
WRIST_KPX = 500.0          # wrist-camera px per metre lateral at pre-grasp height
PAIR_DIST = 0.065          # plates closer than this are pinched together
PLACE_SEP = 0.035          # lateral offset of each plate from the rack centre (two-hand case)
PRE_Q = np.array([-1.86, 0.09, 0.98, 1.39, 0.3, 1.26, 0.45])
MID_Q = np.array([-1.0, 0.2, 0.3, 1.0, 0.3, 1.2, 0.3])
CARRY_Q = np.array([-2.42, 0.612, 0.908, 1.72, 0.255, 1.614, 0.477])   # gripper ~(0.27, 0.15, 0.27), pointing down


class Policy:
    def reset(self, obs, tools):
        self.tools = tools
        self.obs = obs
        self.h = np.asarray(tools.hold_action(), dtype=float).copy()
        self.h[4] = PITCH
        self.h[5:19] = 0.0
        self.h[19:21] = 0.0
        self.log = []
        self.gen = self.script()

    # ------------------------------------------------------------------ helpers (generators)
    def lo(self):
        return np.asarray(self.obs['low_dim_obs'], float)

    def mark(self, name):
        self.log.append(('t', name, int(self.obs['t'])))
        if getattr(self, 'debug', False):
            self.snaps.append((name, [self.tools.image(c) for c in ('head', 'left_wrist', 'right_wrist')]))

    def hold(self, n):
        for _ in range(n):
            yield self.h.copy()

    def _arm_sched(self, moves):
        """generator applying joint interpolations (side, q, n) one after another to self.h"""
        for side, q, n in moves:
            sl = slice(5, 12) if side == 'L' else slice(12, 19)
            q0 = self.h[sl].copy()
            for i in range(1, n + 1):
                self.h[sl] = q0 + (np.asarray(q) - q0) * i / n
                yield

    def walk_to(self, xt, yt, yawt, n=300, tol=0.015, vmax=0.35, arm=(), loose=0.03, loose_after=120):
        sched = self._arm_sched(arm)
        arm_done = False
        for i in range(n):
            if not arm_done:
                arm_done = next(sched, 'end') == 'end'
            l = self.lo()
            x, y, yaw = l[21], l[22], l[24]
            ex, ey = xt - x, yt - y
            c, s = np.cos(yaw), np.sin(yaw)
            bx, by = c * ex + s * ey, -s * ex + c * ey
            eyaw = (yawt - yaw + np.pi) % (2 * np.pi) - np.pi
            if abs(bx) < tol and abs(by) < tol and abs(eyaw) < 0.03:
                break
            if i > loose_after and abs(bx) < loose and abs(by) < loose and abs(eyaw) < 0.06:
                break
            vx = np.clip(2.0 * bx, -vmax, vmax)
            vy = np.clip(2.0 * by, -vmax, vmax)
            sp = np.hypot(vx, vy)
            if 0 < sp < 0.07:
                vx, vy = vx / sp * 0.07, vy / sp * 0.07
            if abs(bx) < tol and abs(by) < tol:
                vx = vy = 0.0
            wz = np.clip(2 * eyaw, -0.5, 0.5)
            if abs(eyaw) < 0.03:
                wz = 0.0
            a = self.h.copy()
            a[0], a[1], a[3] = vx, vy, wz
            yield a
        self.log.append(('walk', i, round(float(bx), 3), round(float(by), 3), round(float(eyaw), 3)))
        while not arm_done:
            arm_done = next(sched, 'end') == 'end'
            yield self.h.copy()

    def joint_move(self, side, q, n):
        for _ in self._arm_sched([(side, q, n)]):
            yield self.h.copy()

    def cart_steps(self, side, pos, step=0.02, w_gx=1.0):
        """list of joint vectors along a straight gripper path from the commanded pose"""
        sl = slice(5, 12) if side == 'L' else slice(12, 19)
        gx, gy = down_frame()
        q = self.h[sl].copy()
        p0, _ = grip_pose(q, side)
        pos = np.asarray(pos, float)
        ns = max(1, int(np.ceil(np.linalg.norm(pos - p0) / step)))
        out = []
        for i in range(1, ns + 1):
            p = p0 + (pos - p0) * i / ns
            a = float(np.clip((p[0] - TILT_X0) * TILT_K, 0.0, 0.6))     # tilt forward to reach far
            gx = np.array([np.sin(a), 0.0, -np.cos(a)])
            q, e = ik_grip(side, p, gx, gy, q, w_gx=w_gx)
            out.append(q)
        self.log.append(('ik', side, [round(float(v), 3) for v in pos], round(e, 3)))
        return out

    def cart_path(self, side, pos, step=0.02, n_step=8, n_final=20, w_gx=1.0):
        sl = slice(5, 12) if side == 'L' else slice(12, 19)
        for q in self.cart_steps(side, pos, step, w_gx):
            q0 = self.h[sl].copy()
            for i in range(1, n_step + 1):
                self.h[sl] = q0 + (q - q0) * i / n_step
                yield self.h.copy()
        yield from self.hold(n_final)

    def torso_xy(self, wx, wy):
        l = self.lo()
        dx, dy = wx - l[21], wy - l[22]
        c, s = np.cos(l[24]), np.sin(l[24])
        return c * dx + s * dy, -s * dx + c * dy

    # ------------------------------------------------------------------ perception helpers
    def pix_world(self, u, v):
        """world (x, y) of an image column u / rack-centre row v, linearised about the reference"""
        l = self.lo()
        u0 = u - (l[24] + l[0]) * FPX
        wy = l[22] + REF_TY - (u0 - REF_U) / KU
        wx = l[21] + REF_TX - (v - REF_CY) / KV
        return wx, wy

    def plate_targets(self):
        im = self.tools.image('head')
        rk, comps = head_plates(im)
        if rk is None or not comps:
            return None
        res = []
        for c in comps:
            px, py = self.pix_world(c[0], rk['cy'])
            _, pyt = self.pix_world(c[4], rk['cy'])
            res.append([px, py, c[1], c[2], c[3], pyt])
        self.log.append(('plates', rk['cx'], rk['cy'], comps, self.lo()[21:25].tolist()))
        return res

    def rack_target(self):
        im = self.tools.image('head')
        rk = find_rack(im)
        if rk is None:
            return None
        self.log.append(('rack', rk['cx'], rk['cy'], rk['x0'], rk['x1'], self.lo()[21:25].tolist()))
        return self.pix_world(rk['cx'], rk['cy'])

    # ------------------------------------------------------------------ skills
    def wrist_align_pair(self, side, tx, ty):
        cam = 'left_wrist' if side == 'L' else 'right_wrist'
        for it in range(3):
            wp = wrist_plates(self.tools.image(cam))
            self.log.append(('wrist', side, it, [tuple(round(v, 1) for v in w) for w in wp]))
            if len(wp) < 2:
                break
            wp.sort(key=lambda w: abs(w[0] - 41.5))
            if abs(wp[1][0] - wp[0][0]) > 35:
                break
            err = 0.5 * (wp[0][0] + wp[1][0]) - 41.5
            if abs(err) < 3:
                break
            ty += float(np.clip(-err / WRIST_KPX, -0.04, 0.04))
            yield from self.cart_path(side, [tx, ty, PAIR_Z], n_final=12)
        self.wy_final = ty

    def wrist_align_single(self, side, tx, ty):
        cam = 'left_wrist' if side == 'L' else 'right_wrist'
        for it in range(2):
            wp = wrist_plates(self.tools.image(cam))
            self.log.append(('wrist1', side, it, [tuple(round(v, 1) for v in w) for w in wp]))
            if not wp:
                break
            wp.sort(key=lambda w: abs(w[0] - 41.5))
            u = wp[0][0]
            err = u - 41.5
            if abs(err) < 3:
                break
            ty += float(np.clip(-err / WRIST_KPX, -0.04, 0.04))
            yield from self.cart_path(side, [tx, ty, PRE_Z], n_final=12)
        self.wy_final = ty

    def grasp_arm(self, side, px, py, mode):
        """robot already at a stance: raise arm, go above plate, (align), descend, grip, lift"""
        gi = 19 if side == 'L' else 20
        m = 1.0 if side == 'L' else MIRROR
        self.mark('grasp' + side)
        sl = slice(5, 12) if side == 'L' else slice(12, 19)
        if np.abs(self.h[sl] - PRE_Q * m).max() > 0.05:
            yield from self.joint_move(side, MID_Q * m, 25)
            yield from self.joint_move(side, PRE_Q * m, 25)
        tx, ty = self.torso_xy(px, py)
        yield from self.cart_path(side, [tx, ty, PAIR_Z if mode == 'pair' else PRE_Z], step=0.03, n_step=8, n_final=12)
        self.wy_final = ty
        if mode == 'pair':
            yield from self.wrist_align_pair(side, tx, ty)
        ty = self.wy_final
        self.mark('descend' + side)
        yield from self.cart_path(side, [tx, ty, GRASP_Z if mode == 'pair' else SINGLE_Z], step=0.025, n_step=8, n_final=12)
        self.h[gi] = 1.0
        yield from self.hold(25)
        l = self.lo()
        self.log.append(('fingers', side, l[10:12].tolist() if side == 'L' else l[19:21].tolist()))
        yield from self.cart_path(side, [tx - 0.03, ty, LIFT_Z], step=0.03, n_step=7, n_final=3)
        self.mark('lifted' + side)

    def place(self, side, wx, wy, retreat_q):
        gi = 19 if side == 'L' else 20
        tx, ty = self.torso_xy(wx, wy)
        yield from self.cart_path(side, [tx, ty, LIFT_Z], step=0.03, n_step=8, n_final=10)
        yield from self.cart_path(side, [tx, ty, PLACE_Z], step=0.015, n_step=8, n_final=15)
        self.mark('placed' + side)
        self.h[gi] = 0.0
        yield from self.hold(25)
        self.mark('released' + side)
        yield from self.cart_path(side, [tx - 0.02, ty, LIFT_Z], step=0.03, n_step=7, n_final=3)
        if retreat_q is not None:
            yield from self.joint_move(side, retreat_q, 25)

    # ------------------------------------------------------------------ main script
    def script(self):
        yield from self.walk_to(P1[0], P1[1], 0.0, tol=0.015)
        yield from self.hold(15)
        rt = self.rack_target()
        if rt is None:
            rt = (REF_TX, P1[1] + REF_TY)
        wx, wy = rt
        wx += RACK_DX
        yield from self.walk_to(P0[0], P0[1], 0.0, tol=0.01)
        yield from self.hold(15)
        plates = self.plate_targets()
        if not plates:
            plates = [[REF_TX, P0[1] + REF_TY, 1, 0, 0, P0[1] + REF_TY]]
        plates.sort(key=lambda p: -p[1])        # left first
        if len(plates) >= 2 and plates[0][1] - plates[-1][1] < PAIR_DIST:
            groups = [[float(np.mean([p[0] for p in plates])), float(np.mean([p[1] for p in plates])), 'pair']]
        elif len(plates) >= 2:
            groups = [[plates[0][0], plates[0][5], 'single'], [plates[-1][0], plates[-1][5], 'single']]
        else:
            groups = [[plates[0][0], plates[0][1], 'pair']]
        self.log.append(('groups', groups))
        if len(groups) == 1:
            # both plates pinched together by the left hand in one trip
            px, py = groups[0][0], groups[0][1]
            yield from self.walk_to(px - GRASP_X, py - 0.02, 0.0, arm=[('L', MID_Q, 30), ('L', PRE_Q, 30)])
            yield from self.grasp_arm('L', px, py, groups[0][2])
            self.mark('to_rack')
            yield from self.walk_to(wx - GRASP_X, wy, 0.0, tol=0.015, loose=0.045, loose_after=60)
            yield from self.hold(10)
            yield from self.place('L', wx, wy, MID_Q)
        else:
            # two trips with the left hand: right slot first, then left slot
            slots = [wy - PLACE_SEP, wy + PLACE_SEP]
            for k in range(2):
                px, py = groups[k][0], groups[k][1]
                # keep the arm low at the side while crossing between racks, raise it near the end
                if k == 0:
                    arm = [('L', MID_Q, 30), ('L', PRE_Q, 30)]
                else:
                    # back away from the counter before crossing over to the left rack
                    arm = [('L', PRE_Q, 30)]
                    yield from self.walk_to(px - GRASP_X - BACKOFF, py - 0.02, 0.0, tol=0.04, loose=0.06, loose_after=80)
                yield from self.walk_to(px - GRASP_X, py - 0.02, 0.0, arm=arm)
                yield from self.grasp_arm('L', px, py, 'single')
                self.mark('to_rack')
                yield from self.walk_to(wx - GRASP_X, slots[k] - 0.02, 0.0, tol=0.015, loose=0.045, loose_after=60)
                yield from self.hold(10)
                # after the first plate keep the arm raised (clear of racks) for the walk back
                yield from self.place('L', wx, slots[k], None if k == 0 else MID_Q)
        self.mark('done')
        while True:
            yield from self.hold(50)

    def act(self, obs, tools):
        self.obs = obs
        return next(self.gen)
