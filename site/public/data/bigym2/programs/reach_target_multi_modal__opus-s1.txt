"""Touch the red sphere with either hand (Unitree G1).

Pipeline (all hand-written geometry, no learned parts):
  1. Tuck the arms, stand still.
  2. Calibrate the head camera from the 0.2 m floor checkerboard (fit the camera
     pose so a synthetic checkerboard matches the image) and locate the sphere in
     world coordinates: its shadow (light from straight above) gives x, y; the
     sphere's ray intersected with the vertical line above the shadow gives z.
  3. Walk (closed loop on the pelvis odometry) until the sphere is a comfortable
     distance ahead.
  4. Reach with the nearer arm: inverse kinematics of the G1 arm so the fingers
     point at the sphere with the finger tips slightly inside it; the torso lean is
     re-measured from the camera and the arm target is refined until the sphere
     lights up (touched), then held.
"""

import cv2  # noqa: F401
import numpy as np
import scipy.ndimage as nd
from scipy.optimize import least_squares

# ----------------------------------------------------------------------------- geometry
SQ = 0.2          # floor checker square (m)
RS = 0.05         # sphere radius (m)
F_PIX = 72.75     # head camera focal length in pixels (fovy 60 deg, 84 px)
TUCK = np.array([0.2, 0.25, 0.0, 1.4, 0.0, 0.0, 0.0])
MIRROR = np.array([1, -1, -1, 1, -1, 1, -1])


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


TORSO = np.array([-0.0039635, 0, 0.054])
_ROT = {'x': rx, 'y': ry, 'z': rz}


def _specs(side):
    s = 1 if side == 'L' else -1
    return [((0.0039563, s * 0.10022, 0.24778), rpy(s * 0.27931, 5.4949e-05, -s * 0.00019159), 'y'),
            ((0, s * 0.038, -0.013831), rx(-s * 0.27925), 'x'),
            ((0, s * 0.00624, -0.1032), np.eye(3), 'z'),
            ((0.015783, 0, -0.080518), np.eye(3), 'y'),
            ((0.100, s * 0.00188791, -0.010), np.eye(3), 'x'),
            ((0.038, 0, 0), np.eye(3), 'y'),
            ((0.046, 0, 0), np.eye(3), 'z')]


SPECS = {'L': _specs('L'), 'R': _specs('R')}


def hand_pose(q, side):
    """Wrist-yaw link pose (position, rotation) in the (upright) pelvis frame."""
    p = TORSO.copy()
    R = np.eye(3)
    for (off, R0, ax), qi in zip(SPECS[side], q):
        p = p + R @ np.array(off)
        R = R @ R0 @ _ROT[ax](qi)
    return p, R


def shoulder_pos(side):
    off, R0, _ = SPECS[side][0]
    return TORSO + np.array(off)


# ----------------------------------------------------------------------------- camera
def cam_axes(yaw, pitch, roll):
    F = np.array([np.cos(pitch) * np.cos(yaw), np.cos(pitch) * np.sin(yaw), -np.sin(pitch)])
    R0 = np.array([np.sin(yaw), -np.cos(yaw), 0.0])
    U0 = np.cross(R0, F)
    c, s = np.cos(roll), np.sin(roll)
    return F, c * R0 + s * U0, -s * R0 + c * U0


def pix_rays(par, us, vs):
    cx, cy, cz, yaw, pitch, roll, f = par
    F, R, U = cam_axes(yaw, pitch, roll)
    d = F[None] + ((us - 42) / f)[:, None] * R[None] - ((vs - 42) / f)[:, None] * U[None]
    return np.array([cx, cy, cz]), d


def floor_mask(im):
    im = im.astype(int)
    r, b = im[..., 0], im[..., 2]
    return nd.binary_erosion((b - r > 35) & (b > 100), iterations=1)


def obs_signal(im):
    b = im[..., 2].astype(float)
    mu = nd.uniform_filter(b, 9)
    sd = np.sqrt(np.maximum(nd.uniform_filter(b * b, 9) - mu * mu, 1))
    return np.clip((b - mu) / sd, -1.5, 1.5)


def fit_checker(im, par0, signs=(1, -1)):
    m = floor_mask(im)
    m[:3] = False
    vs, us = np.nonzero(m)
    us = us + 0.5
    vs = vs + 0.5
    o = obs_signal(im)[m] / 1.2
    best = None
    for sg in signs:
        def res(p):
            C, d = pix_rays(p, us, vs)
            t = -C[2] / d[:, 2]
            X = C[0] + t * d[:, 0]
            Y = C[1] + t * d[:, 1]
            r = sg * np.tanh(3.0 * np.sin(np.pi * X / SQ) * np.sin(np.pi * Y / SQ)) - o
            r[t < 0] = 2
            return r
        sol = least_squares(res, par0, x_scale=[0.05, 0.05, 0.05, 0.05, 0.05, 0.05, 5], loss='soft_l1')
        c = np.mean(sol.fun ** 2)
        if best is None or c < best[0]:
            best = (c, sol.x, sg)
    return best


def fit_camera(im, pel, warm=None):
    px, py, pz, pyaw = pel
    if warm is not None:
        starts = [warm]
    else:
        starts = [np.array([px + 0.12 * np.cos(pyaw) + dx, py + 0.12 * np.sin(pyaw), 1.16, pyaw, 1.08, 0, F_PIX])
                  for dx in (-0.07, 0.0, 0.07)]
    best = None
    for p0 in starts:
        c, p, sg = fit_checker(im, p0)
        if best is None or c < best[0]:
            best = (c, p, sg)
    c, p, sg = best
    # the checker is periodic: put the camera where the body says it must be
    fwd_exp = 0.104 + 0.42 * (p[4] - 1.047)
    p[0] -= SQ * np.round((p[0] - px - np.cos(pyaw) * fwd_exp) / SQ)
    p[1] -= SQ * np.round((p[1] - py - np.sin(pyaw) * fwd_exp) / SQ)
    return p, c


def floor_point(par, u, v):
    C, d = pix_rays(par, np.array([u]), np.array([v]))
    t = -C[2] / d[0, 2]
    return C + t * d[0]


def unit_ray(par, u, v):
    _, d = pix_rays(par, np.array([u]), np.array([v]))
    return d[0] / np.linalg.norm(d[0])


# ----------------------------------------------------------------------------- detection
def sphere_mask(im):
    im = im.astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return (r > g + 30) & (r > b + 25)


def bright_count(im):
    im = im.astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    return int(((r > 200) & (g < 90) & (b < 90)).sum())


def find_sphere(im):
    m = sphere_mask(im)
    if m.sum() < 3:
        return None
    lab, n = nd.label(m)
    sizes = nd.sum(m, lab, range(1, n + 1))
    k = np.argmax(sizes) + 1
    ys, xs = np.nonzero(lab == k)
    return dict(u=xs.mean() + 0.5, v=ys.mean() + 0.5, area=len(ys), top=ys.min(), bot=ys.max() + 1,
                left=xs.min(), right=xs.max() + 1)


def shadow_candidates(im, vmin=15):
    imf = im.astype(float)
    r, b = imf[..., 0], imf[..., 2]
    floorish = (b - r > 25) & ~sphere_mask(im)
    bm = nd.maximum_filter(np.where(floorish, b, 0), size=9)
    m = floorish & (b < 0.68 * bm)
    m[:vmin] = False
    m = nd.binary_opening(m, iterations=1)
    lab, n = nd.label(m)
    out = []
    for k in range(1, n + 1):
        ys, xs = np.nonzero(lab == k)
        a = len(ys)
        if a < 4:
            continue
        h = ys.max() - ys.min() + 1
        w = xs.max() - xs.min() + 1
        out.append(dict(u=xs.mean() + 0.5, v=ys.mean() + 0.5, area=a, fill=a / (h * w),
                        touch_edge=bool(ys.max() >= 83 or xs.min() <= 0 or xs.max() >= 83)))
    return out


def locate_sphere(im, par):
    """Sphere centre in world coordinates, or None."""
    s = find_sphere(im)
    if s is None:
        return None
    C = np.array(par[:3])
    full = s['top'] > 0 and s['bot'] < 84 and s['left'] > 0 and s['right'] < 84
    uc = (s['left'] + s['right']) / 2 if (s['left'] > 0 and s['right'] < 84) else s['u']
    vref = s['v'] if full else s['bot'] - 0.5
    if not full and s['bot'] <= 1:
        return None
    rdir = unit_ray(par, uc, vref)
    hdir = rdir[:2] / np.linalg.norm(rdir[:2])
    best = None
    for c in shadow_candidates(im):
        if c['touch_edge'] or c['v'] > 76 or c['fill'] < 0.4 or c['v'] < vref:
            continue
        F = floor_point(par, c['u'], c['v'])
        w = F[:2] - C[:2]
        if np.dot(w, hdir) < 0:
            continue
        miss = abs(hdir[0] * w[1] - hdir[1] * w[0]) + (0.03 if c['area'] < 6 else 0)
        if best is None or miss < best[0]:
            best = (miss, F)
    if best is None or best[0] > 0.06:
        return None
    F = best[1]
    t = np.dot(F[:2] - C[:2], rdir[:2]) / np.dot(rdir[:2], rdir[:2])
    z = (C + t * rdir)[2]
    if not full:
        z += RS / np.linalg.norm(rdir[:2])
    return np.array([F[0], F[1], z])


def locate_sphere_size(im, par):
    """Sphere centre from its apparent size (fallback, needs the whole disc)."""
    s = find_sphere(im)
    if s is None or not (s['top'] > 0 and s['bot'] < 84 and s['left'] > 0 and s['right'] < 84):
        return None
    rdir = unit_ray(par, s['u'], s['v'])
    rpx = np.sqrt(s['area'] / np.pi)
    return np.array(par[:3]) + RS * par[6] / rpx * rdir


# ----------------------------------------------------------------------------- IK
TIP = np.array([0.15, 0.0, 0.0])
NOMINAL = {'L': np.array([-0.3, 0.05, 0.0, 0.3, 0, 0, 0]), 'R': np.array([-0.3, -0.05, 0.0, 0.3, 0, 0, 0])}
LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])


def joint_limits(side):
    lo = LO.copy()
    hi = HI.copy()
    lo[1] = -0.1          # never swing the upper arm into the torso
    if side == 'L':
        return lo, hi
    return lo * MIRROR + (hi * MIRROR - lo * MIRROR) * (MIRROR < 0), hi * MIRROR + (lo * MIRROR - hi * MIRROR) * (MIRROR < 0)


SEARCH_OFFSETS = [np.array(v) for v in ((0, 0, 0.02), (0, 0, -0.02), (0, 0.02, 0), (0, -0.02, 0),
                                         (0.02, 0, 0.03), (0, 0, 0))]


def approach_dir(Sb, side):
    """Finger direction for reaching the sphere at Sb (upright pelvis frame)."""
    sh = shoulder_pos(side)
    h = Sb[:2] - sh[:2]
    h = h / np.linalg.norm(h)
    dz = np.clip((Sb[2] - sh[2]) / 0.45, -0.9, 0.3)
    d = np.array([h[0], h[1], dz])
    return d / np.linalg.norm(d)


def solve_ik(side, target, direction, q0, iters=60):
    q, res = _solve_ik(side, target, direction, q0, iters, 0.03)
    if res > 0.004:
        q, res = _solve_ik(side, target, direction, q, iters, 0.0)
    return q, res


def _solve_ik(side, target, direction, q0, iters, wdir):
    """Tip at target (upright pelvis frame), finger axis along direction."""
    lo, hi = joint_limits(side)
    q = q0.copy()
    nom = NOMINAL[side]
    for _ in range(iters):
        def err(qq):
            p, R = hand_pose(qq, side)
            tip = p + R @ TIP
            return np.concatenate([tip - target, wdir * (R[:, 0] - direction)])
        e = err(q)
        J = np.zeros((6, 7))
        for j in range(7):
            dq = np.zeros(7)
            dq[j] = 1e-4
            J[:, j] = (err(q + dq) - e) / 1e-4
        lam = 1e-3
        W = np.diag([0.02, 0.02, 0.02, 0.02, 0.5, 0.5, 0.5])
        A = J.T @ J + lam * np.eye(7) + W * 0.001
        g = J.T @ e + (W * 0.001) @ (q - nom)
        q = np.clip(q - np.linalg.solve(A, g), lo + 0.02, hi - 0.02)
    p, R = hand_pose(q, side)
    return q, np.linalg.norm(p + R @ TIP - target)


# ----------------------------------------------------------------------------- policy
class Policy:
    """The control policy that is scored on the hidden seeds."""

    STAND_X = 0.34      # desired sphere position relative to the pelvis (m)
    STAND_Y = 0.13      # (in front of the reaching shoulder)
    GRIP = 1.0          # reaching gripper closed: the fingers form one blunt tip

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.phase = 'tuck'
        self.t_phase = 0
        self.cam = None
        self.S = None
        self.side = None
        self.q_cmd = None
        self.q_goal = None
        self.beta = 0.05
        self.depth = 0.02
        self.touch_steps = 0
        self.t_reach = 0
        self.last_counts = None
        self.yaw0 = float(obs['low_dim_obs'][21])
        self.log = []

    # -- helpers
    def _pel(self, obs):
        return np.asarray(obs['low_dim_obs'][18:22], dtype=float)

    def _arm_action(self, raw, qL, qR):
        raw[4:11] = qL
        raw[11:18] = qR
        return raw

    def _to_body(self, P, pel):
        """World point -> upright pelvis frame (yaw only), then undo torso lean."""
        d = P - np.array([pel[0], pel[1], pel[2]])
        d = rz(-pel[3]) @ d
        return ry(-self.beta) @ d

    def _goal(self, pel):
        side = self.side
        Sb = self._to_body(self.S, pel)
        if self.t_reach >= 120:
            # still no touch: probe small offsets around the estimate
            k = (self.t_reach - 120) // 40
            Sb = Sb + SEARCH_OFFSETS[k % len(SEARCH_OFFSETS)]
        dirn = approach_dir(Sb, side)
        target = Sb - dirn * (RS - self.depth)
        q0 = self.q_goal if self.q_goal is not None else NOMINAL[side]
        q, res = solve_ik(side, target, dirn, q0)
        return q, res

    def _locate(self, tools, pel, warm=None):
        im = tools.image('head')
        par, c = fit_camera(im, pel, warm)
        S = locate_sphere(im, par)
        return im, par, c, S

    # -- main
    def act(self, obs, tools):
        try:
            raw = self._act(obs, tools)
            self.last_raw = raw
            return raw
        except Exception as exc:  # never crash the episode: keep the last command
            self.log.append(('error', int(obs['t']), repr(exc)))
            raw = getattr(self, 'last_raw', None)
            if raw is None:
                raw = self.hold.copy()
            raw = np.array(raw, dtype=np.float32)
            raw[0:2] = 0.0
            raw[3] = 0.0
            return raw

    def _act(self, obs, tools):
        raw = self.hold.copy()
        pel = self._pel(obs)
        self.t_phase += 1
        tuckL = TUCK
        tuckR = TUCK * MIRROR
        ph = self.phase

        if ph == 'tuck':
            a = min(1.0, self.t_phase / 20)
            self._arm_action(raw, a * tuckL, a * tuckR)
            if self.t_phase >= 40:
                im, par, c, S = self._locate(tools, pel)
                self.cam = par
                if S is None:
                    S = locate_sphere_size(im, par)
                self.S = S
                self.log.append(('look', obs['t'], None if S is None else S.tolist(), float(c)))
                if S is None:
                    self.phase = 'search'
                else:
                    self.phase = 'walk'
                self.t_phase = 0
            return raw

        self._arm_action(raw, tuckL, tuckR)

        if ph == 'search':
            # sphere not located (e.g. above the view): creep forward, which
            # brings anything below the camera down into the image, and look again
            raw[0] = 0.1 if self.t_phase < 150 else -0.1
            if self.t_phase % 25 == 0:
                im, par, c, S = self._locate(tools, pel)
                if S is None:
                    S = locate_sphere_size(im, par)
                if S is not None:
                    self.S = S
                    self.phase = 'walk'
                    self.t_phase = 0
            return raw

        if ph == 'walk':
            if self.side is None:
                d0 = rz(-pel[3]) @ (self.S - np.array([pel[0], pel[1], 0]))
                self.side = 'L' if d0[1] >= 0 else 'R'
            d = rz(-pel[3]) @ (self.S - np.array([pel[0], pel[1], 0]))
            ex = d[0] - self.STAND_X
            ey = d[1] - (self.STAND_Y if self.side == 'L' else -self.STAND_Y)
            yaw_err = np.arctan2(np.sin(pel[3] - self.yaw0), np.cos(pel[3] - self.yaw0))
            raw[3] = float(np.clip(-2.0 * yaw_err, -0.3, 0.3))
            if np.hypot(ex, ey) < 0.015 or self.t_phase > 300:
                raw[0] = 0.0
                raw[1] = 0.0
                raw[3] = 0.0
                self.phase = 'settle'
                self.t_phase = 0
            else:
                v = np.clip(1.2 * np.array([ex, ey]), -0.2, 0.2)
                sp = np.linalg.norm(v)
                if sp < 0.07:
                    v = v * (0.07 / sp)
                raw[0] = float(v[0])
                raw[1] = float(v[1])
            return raw

        if ph == 'settle':
            if self.t_phase >= 25:
                im, par, c, S = self._locate(tools, pel, warm=None)
                self.cam = par
                if S is not None and np.linalg.norm(S - self.S) < 0.08:
                    self.S = 0.5 * (S + self.S)
                self.log.append(('settle', obs['t'], None if S is None else S.tolist(), float(c)))
                self.beta = par[4] - 1.047
                self.q_start = np.array(TUCK if self.side == 'L' else TUCK * MIRROR)
                self.q_goal, res = self._goal(pel)
                self.q_cmd = self.q_start.copy()
                self.phase = 'reach'
                self.t_phase = 0
            return raw

        # reach / hold phases: one arm moves, the other stays tucked
        if ph in ('reach', 'hold'):
            if self.t_phase % 5 == 0:
                self.q_goal, res = self._goal(pel)
            step = 0.04 if ph == 'reach' else 0.01
            dq = self.q_goal - self.q_cmd
            n = np.max(np.abs(dq))
            self.q_cmd = self.q_goal.copy() if n <= step else self.q_cmd + dq * (step / n)
            if ph == 'reach':
                self.t_reach = getattr(self, 't_reach', 0) + 1
                if self.t_reach % 20 == 0 and self.t_reach >= 40:
                    im = tools.image('head')
                    par, c = fit_camera(im, pel, warm=self.cam)
                    if c < 0.35:
                        self.cam = par
                        self.beta = par[4] - 1.047
                    S = locate_sphere(im, par)
                    self.log.append(('reach', obs['t'], None if S is None else np.round(S, 3).tolist(), round(float(c), 3), round(self.beta, 3)))
                    if self.t_reach % 60 == 0:
                        self.depth = min(self.depth + 0.015, 0.06)
            touched = self._touched(tools)
            if touched:
                self.touch_steps += 1
                self.phase = 'hold'
            elif ph == 'hold':
                self.touch_steps = 0
                self.phase = 'reach'
            if self.side == 'L':
                self._arm_action(raw, self.q_cmd, tuckR)
                raw[18] = self.GRIP
            else:
                self._arm_action(raw, tuckL, self.q_cmd)
                raw[19] = self.GRIP
        return raw

    def _touched(self, tools):
        n = bright_count(tools.image('head'))
        cam = 'left_wrist' if self.side == 'L' else 'right_wrist'
        m = bright_count(tools.image(cam))
        self.last_counts = (n, m)
        return n >= 4 or m >= 15
