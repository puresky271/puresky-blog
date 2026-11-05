"""Touch the red sphere with the left hand and the green sphere with the right hand.

Hand-written control:
  1. lower the forearms out of the way, stand tall and locate both spheres in the head
     camera (colour blobs, circle fit; distance from the apparent radius); turn towards
     a sphere that is out of view;
  2. walk (at normal height) to a spot from which both are within comfortable reach,
     squat if a sphere is low, and measure again;
  3. per arm, sweep the hand point through the sphere along a line near the head-camera
     ray (inverse kinematics on a kinematic G1 arm model; head-camera pose and focal
     length calibrated offline by matching that arm model to the arm silhouette), while
     tracking the sphere in the head image; retry with small sideways offsets;
  4. a touched sphere turns saturated in the camera images: keep sweeping slowly over the
     touching stretch, then hold the hand in its middle.
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


_ROT = (_ry, _rx, _rz, _ry, _rx, _ry, _rz)
_TORSO = np.array([-0.0039635, 0, 0.044])


def _joints(s):
    return [(np.array([0.0039563, s * 0.10022, 0.23778]), _rx(s * 0.27931)),
            (np.array([0, s * 0.038, -0.013831]), _rx(-s * 0.27925)),
            (np.array([0, s * 0.00624, -0.1032]), np.eye(3)),
            (np.array([0.015783, 0, -0.080518]), np.eye(3)),
            (np.array([0.100, s * 0.00188791, -0.010]), np.eye(3)),
            (np.array([0.038, 0, 0]), np.eye(3)),
            (np.array([0.046, 0, 0]), np.eye(3))]


JOINTS = {'L': _joints(1), 'R': _joints(-1)}


def fk(q, side):
    """Wrist-yaw link position and rotation in the (upright) pelvis frame."""
    p = _TORSO.copy()
    R = np.eye(3)
    for (o, r0), rot, qi in zip(JOINTS[side], _ROT, q):
        p = p + R @ o
        R = R @ r0 @ rot(qi)
    return p, R


SHOULDER = {s: _TORSO + JOINTS[s][0][0] for s in 'LR'}

# ----------------------------------------------------------------------------- head camera
HEAD_P = np.array([0.00983771634691396, -0.00012230200000887953, 0.4386567502905857])
HEAD_R = np.array([[0.5742387294861857, 0.015630101774682336, 0.8185386866096216],
                   [0.001861066585896575, 0.9997902327422175, -0.020396738573250955],
                   [-0.818685787093714, 0.013235952242878341, 0.5740891843424419]])
HEAD_F = 80.58299288401194
C0 = 41.5
SPHERE_R = 0.06


def head_ray(u, v):
    ray = np.array([HEAD_F, -(u - C0), -(v - C0)])
    return HEAD_R @ (ray / np.linalg.norm(ray))


# ----------------------------------------------------------------------------- vision


def color_masks(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    sat = (s > 150) & (v > 20)
    red = sat & ((h < 10) | (h >= 170))
    grn = sat & (h >= 45) & (h < 80)
    return red, grn


def lit_masks(img):
    im = img.astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    red = (r >= 235) & (g < 90) & (b < 90)
    grn = (g >= 235) & (r < 90) & (b < 90)
    return red, grn


def fit_circle(pts):
    x, y = pts[:, 0], pts[:, 1]
    A = np.stack([x, y, np.ones_like(x)], 1)
    sol = np.linalg.lstsq(A, x * x + y * y, rcond=None)[0]
    cx, cy = sol[0] / 2, sol[1] / 2
    return cx, cy, np.sqrt(max(sol[2] + cx * cx + cy * cy, 1e-6))


def detect(mask, min_area=6):
    m = mask.astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return None
    k = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    area = int(stats[k, cv2.CC_STAT_AREA])
    if area < min_area:
        return None
    blob = (lab == k).astype(np.uint8)
    cs, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    pts = np.concatenate([c[:, 0, :] for c in cs], 0).astype(float)
    H, W = mask.shape
    keep = (pts[:, 0] > 0) & (pts[:, 0] < W - 1) & (pts[:, 1] > 0) & (pts[:, 1] < H - 1)
    pts = pts[keep]
    if len(pts) < 6:
        return None
    for _ in range(4):
        cx, cy, r = fit_circle(pts)
        d = np.hypot(pts[:, 0] - cx, pts[:, 1] - cy)
        good = d > r - 1.0
        if good.sum() < 6 or good.all():
            break
        pts = pts[good]
    cx, cy, r = fit_circle(pts)
    return np.array([cx, cy, r + 0.5, area])


def occluder_mask(img):
    hsv = cv2.cvtColor(img, cv2.COLOR_RGB2HSV)
    m = (hsv[..., 1] < 70) | (hsv[..., 2] < 45)
    return cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0


def detect_track(mask, occ, ref):
    """Sphere centre given a reference (cx, cy, r): fit the fixed-radius circle to the
    blob boundary that borders the background (not the arm or the image edge)."""
    m = mask.astype(np.uint8)
    n, lab, stats, cent = cv2.connectedComponentsWithStats(m, connectivity=8)
    if n <= 1:
        return None
    # the blob closest to the reference centre
    d2 = (cent[1:, 0] - ref[0]) ** 2 + (cent[1:, 1] - ref[1]) ** 2
    k = 1 + int(np.argmin(d2))
    if stats[k, cv2.CC_STAT_AREA] < 8:
        return None
    blob = (lab == k).astype(np.uint8)
    cs, _ = cv2.findContours(blob, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    pts = np.concatenate([c[:, 0, :] for c in cs], 0)
    H, W = mask.shape
    keep = (pts[:, 0] > 0) & (pts[:, 0] < W - 1) & (pts[:, 1] > 0) & (pts[:, 1] < H - 1)
    keep &= ~occ[pts[:, 1], pts[:, 0]]
    pts = pts[keep].astype(float) + 0.0
    if len(pts) < 10:
        return None
    # boundary must span a reasonable arc
    ang = np.arctan2(pts[:, 1] - ref[1], pts[:, 0] - ref[0])
    span = np.histogram(ang, bins=8, range=(-np.pi, np.pi))[0]
    if (span > 0).sum() < 3:
        return None
    r = ref[2] - 0.5
    c = np.array([ref[0], ref[1]], float)
    for _ in range(10):
        dv = pts - c
        dist = np.linalg.norm(dv, axis=1) + 1e-9
        J = -dv / dist[:, None]
        res = dist - r
        w = 1.0 / np.maximum(1.0, np.abs(res))
        step = np.linalg.lstsq(J * w[:, None], -res * w, rcond=None)[0]
        c = c + step
        if np.linalg.norm(step) < 0.01:
            break
    res = np.abs(np.linalg.norm(pts - c, axis=1) - r)
    if np.median(res) > 1.0:
        return None
    return np.array([c[0], c[1], ref[2], len(pts)])


# ----------------------------------------------------------------------------- IK
LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.972, -1.614, -1.614])
HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.972, 1.614, 1.614])
MIRROR = np.array([1, -1, -1, 1, -1, 1, -1])
Q_NOM = np.array([-0.8, 0.2, 0.0, 0.6, 0.0, 0.0, 0.0])
TIP = 0.15  # hand point: along the gripper, from the wrist-yaw joint


def to_side(q, side):
    return q * MIRROR if side == 'R' else q


def lo_hi(side):
    if side == 'L':
        return LO, HI
    a, b = LO * MIRROR, HI * MIRROR
    return np.minimum(a, b), np.maximum(a, b)


def hand_point(q, side, tip=TIP):
    p, R = fk(q, side)
    return p + R[:, 0] * tip, R


def ik(target, side, q0, tip=TIP):
    """Joint angles putting the hand point at target, gripper pointing away from the shoulder."""
    lo, hi = lo_hi(side)
    nom = to_side(Q_NOM, side)
    d = target - SHOULDER[side]
    d = d / np.linalg.norm(d)

    def res(q):
        h, R = hand_point(q, side, tip)
        return np.concatenate([(h - target) * 10.0, (R[:, 0] - d) * 0.5, (q - nom) * 0.05])

    x0 = np.clip(q0, lo + 1e-4, hi - 1e-4)
    r = least_squares(res, x0, bounds=(lo, hi), xtol=1e-6, max_nfev=200)
    return r.x, np.linalg.norm(hand_point(r.x, side, tip)[0] - target)


# ----------------------------------------------------------------------------- policy
HIGH = 0.9          # stand tall to see the spheres
WALK_HEIGHT = 0.74  # the controller only steps at normal height
SIDES = ('L', 'R')
COLOR_OF = {'L': 0, 'R': 1}  # 0 red (left hand), 1 green (right hand)
Q_DOWN = np.array([0.0, 0.15, 0.0, 1.3, 0.0, 0.0, 0.0])  # forearms down, out of the view
REACH_D = 0.42       # desired shoulder-to-sphere distance after walking
DZ_MAX = 0.30        # at most this far from shoulder height down to the lower sphere
TIP_T = 0.16         # hand point that should reach the sphere centre
SWEEP = (-0.08, 0.10)
SWEEP_STEPS = 110
LAG_OK = 0.03        # hand-to-target distance under which the sweep advances
STALL_MAX = 15
HOLD_LOST = 20      # unlit steps at the hold spot before sweeping on
KI = 0.02            # integral gain (per step) on arm joint tracking error
I_MAX = 0.12
RETREAT_STEPS = 25
OFFSETS = [(0.0, 0.0), (0.0, 0.035), (0.035, 0.0), (0.0, -0.035), (-0.035, 0.0),
           (0.035, 0.035), (-0.035, 0.035), (0.035, -0.035), (-0.035, -0.035)]
T_DOWN, T_MEAS0, T_MEAS1 = 25, 60, 72


def pelvis(o):
    return o[18:21].astype(float), float(o[21])


def to_world(p_local, o):
    pos, yaw = pelvis(o)
    return pos + _rz(yaw) @ p_local


def to_local(p_world, o):
    pos, yaw = pelvis(o)
    return _rz(yaw).T @ (p_world - pos)


LO2 = np.array([-2.5, 0.0, -1.0, -0.6, -1.0, -1.2, -1.0])  # comfortable joint ranges
HI2 = np.array([0.8, 1.6, 1.0, 1.9, 1.0, 1.2, 1.0])
Q_SEEDS = [np.array([-0.8, 0.2, 0.0, 0.6, 0.0, 0.0, 0.0]),
           np.array([-0.4, 0.1, 0.0, 1.2, 0.0, 0.3, 0.0]),
           np.array([-1.0, 0.3, 0.0, 0.2, 0.0, 0.5, 0.0])]


def lo_hi2(side):
    if side == 'L':
        return LO2, HI2
    a, b = LO2 * MIRROR, HI2 * MIRROR
    return np.minimum(a, b), np.maximum(a, b)


def ik_dir(target, side, q0, d, tip=TIP_T, wdir=0.3):
    lo, hi = lo_hi2(side)
    nom = to_side(Q_NOM, side)

    def res(q):
        h, R = hand_point(q, side, tip)
        return np.concatenate([(h - target) * 10.0, (R[:, 0] - d) * wdir, (q - nom) * 0.05])

    r = least_squares(res, np.clip(q0, lo + 1e-4, hi - 1e-4), bounds=(lo, hi), max_nfev=60)
    h, _ = hand_point(r.x, side, tip)
    if np.linalg.norm(h - target) < 0.005 and np.all(r.x > lo + 0.02) and np.all(r.x < hi - 0.02):
        return r.x
    best = (r.cost, r.x)
    for qs in [to_side(q, side) for q in Q_SEEDS]:
        r = least_squares(res, np.clip(qs, lo + 1e-4, hi - 1e-4), bounds=(lo, hi), max_nfev=60)
        # prefer staying on the current branch unless another start is clearly better
        cost = r.cost * 1.5 + 1e-3
        if best is None or cost < best[0]:
            best = (cost, r.x)
    return best[1]


def plausible(p_local, s):
    x, y, z = p_local
    if not (0.15 < x < 0.9 and abs(y) < 0.6 and -0.6 < z < 0.4):
        return False
    return y > -0.15 if s == 'L' else y < 0.15


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float64)
        self.t = 0
        self.q_cmd = {'L': np.zeros(7), 'R': np.zeros(7)}
        self.q_ik = {}
        self.integ = {'L': np.zeros(7), 'R': np.zeros(7)}
        self.reach_h = WALK_HEIGHT
        self.hist = []
        self.meas = {'L': [], 'R': []}
        self.sph = {}      # world sphere estimate
        self.raydir = {}   # world direction of the measuring head ray
        self.phase = 'down'
        self.t_phase = 0
        self.arm = {s: dict(state='sweep', k=0, attempt=0) for s in SIDES}
        self.log = []

    # -------------------------------------------------------------- perception
    def observe(self, tools):
        head = tools.image('head')
        red, grn = color_masks(head)
        dets = [detect(red), detect(grn)]
        nlit = [0, 0]
        ncol = [0, 0]
        for cam in ('head', 'left_wrist', 'right_wrist'):
            img = head if cam == 'head' else tools.image(cam)
            lr, lg = lit_masks(img)
            cr, cg = (red, grn) if cam == 'head' else color_masks(img)
            nlit[0] += int(lr.sum())
            nlit[1] += int(lg.sum())
            ncol[0] += int(cr.sum())
            ncol[1] += int(cg.sum())
        # True: lit, False: seen and not lit, None: not visible enough to tell
        lit = [True if nlit[i] >= 3 else (False if ncol[i] >= 25 else None) for i in range(2)]
        self.head = head
        return dets, lit

    def collect(self, dets, o):
        for s in SIDES:
            d = dets[COLOR_OF[s]]
            if d is None or not (3.0 < d[2] < 16.0):
                continue
            # fraction of the fitted disc that lies inside the image
            yy, xx = np.mgrid[0:84, 0:84]
            disc = ((xx - d[0]) ** 2 + (yy - d[1]) ** 2) <= d[2] ** 2
            vis = disc.sum()
            if vis < 0.5 * np.pi * d[2] ** 2 or d[3] < 0.6 * vis:
                continue
            ray = head_ray(d[0], d[1])
            depth = SPHERE_R / np.sin(np.arctan(d[2] / HEAD_F))
            p_local = HEAD_P + ray * depth
            if not plausible(p_local, s):
                continue
            self.meas[s].append((to_world(p_local, o), _rz(pelvis(o)[1]) @ ray, to_world(HEAD_P, o), d[2],
                                 np.concatenate([d[:3], o[18:22]])))

    def estimate(self):
        for s in SIDES:
            if not self.meas[s]:
                continue
            P = np.array([m[0] for m in self.meas[s]])
            D = np.array([m[1] for m in self.meas[s]])
            self.sph[s] = np.median(P, 0)
            d = D.mean(0)
            self.raydir[s] = d / np.linalg.norm(d)
            C = np.array([m[2] for m in self.meas[s]])
            rr = np.array([m[3] for m in self.meas[s]])
            self.log.append(('est', self.t, s, self.sph[s].round(3).tolist(), len(P),
                             'cam', np.median(C, 0).round(4).tolist(), 'ray', self.raydir[s].round(4).tolist(),
                             'r', round(float(np.median(rr)), 3),
                             'raw', np.median(np.array([m[4] for m in self.meas[s]]), 0).round(4).tolist()))
        self.meas = {'L': [], 'R': []}

    def walk_goal(self, o):
        """Pelvis xy (world) that puts each sphere at a comfortable reach from its shoulder."""
        pos, yaw = pelvis(o)
        if not self.sph:
            return pos[:2].copy()
        xs, ys = [], []
        # squat so that the shoulders are no more than DZ_MAX above the lower sphere
        min_z = min(S[2] for S in self.sph.values())
        self.reach_h = float(np.clip(min_z + DZ_MAX - SHOULDER['L'][2] - 0.01, 0.62, WALK_HEIGHT))
        for s, S in self.sph.items():
            sh = SHOULDER[s]
            dz = max(self.reach_h + 0.01 + sh[2] - S[2], 0.0)
            h = np.sqrt(max(REACH_D ** 2 - dz ** 2, 0.1 ** 2))
            xs.append(S[0] - np.sqrt(max(h ** 2 - 0.05 ** 2, 0.05 ** 2)))
            ys.append(S[1] - sh[1] * 0.5)
        return np.array([np.mean(xs), np.mean(ys)])

    def start_tracking(self, o):
        """Head-image track (u, v, r) and camera depth of each sphere, from the world estimate."""
        self.pix, self.depth = {}, {}
        for s, S in self.sph.items():
            p = to_local(S, o) - HEAD_P
            c = HEAD_R.T @ p
            u = C0 - HEAD_F * c[1] / c[0]
            v = C0 - HEAD_F * c[2] / c[0]
            dist = np.linalg.norm(p)
            r = HEAD_F * np.tan(np.arcsin(min(SPHERE_R / dist, 0.9)))
            self.pix[s] = np.array([u, v, r])
            self.depth[s] = dist

    def track(self, head):
        red, grn = color_masks(head)
        occ = occluder_mask(head)
        for s, m in (('L', red), ('R', grn)):
            if s not in self.pix:
                continue
            det = detect_track(m, occ, self.pix[s])
            if det is None:
                continue
            gate = 12 if self.t - self.t_phase < 10 else 6
            if np.hypot(det[0] - self.pix[s][0], det[1] - self.pix[s][1]) > gate:
                continue
            self.pix[s][:2] = 0.7 * self.pix[s][:2] + 0.3 * det[:2]
            self.ntrack = getattr(self, 'ntrack', 0) + 1

    def set_phase(self, p):
        self.phase = p
        self.t_phase = self.t

    # -------------------------------------------------------------- arms
    def sweep_geometry(self, s, attempt):
        """Sphere centre (local), sweep direction and offset base point for this attempt."""
        off = OFFSETS[attempt % len(OFFSETS)]
        ray = head_ray(self.pix[s][0], self.pix[s][1])
        centre = HEAD_P + ray * self.depth[s]
        sh = centre - SHOULDER[s]
        d = ray + sh / np.linalg.norm(sh)
        d /= np.linalg.norm(d)
        lat = np.cross(np.array([0, 0, 1.0]), d)
        lat /= np.linalg.norm(lat)
        up = np.cross(d, lat)
        return centre + lat * off[0] + up * off[1], d

    def reach_step(self, s, lit, o):
        """Sweep the hand through the sphere; on touch, find the touching stretch of the
        sweep line and hold the hand in its middle."""
        a = self.arm[s]
        if s not in self.sph:
            return
        qa = o[0:7] if s == 'L' else o[9:16]
        base, d = self.sweep_geometry(s, a['attempt'])
        hand = hand_point(qa, s, TIP_T)[0]
        delta_act = float((hand - base) @ d)
        k = a['k']
        st = a['state']
        if st == 'sweep' and lit:
            a['state'] = st = 'touch'
            a['enter'] = delta_act
            a['unlit'] = 0
            # continue from where the (lagging) hand actually is
            f = (delta_act - SWEEP[0]) / (SWEEP[1] - SWEEP[0])
            a['k'] = int(np.clip(RETREAT_STEPS + f * SWEEP_STEPS, RETREAT_STEPS, RETREAT_STEPS + SWEEP_STEPS - 1))
            hw = to_world(hand, o)
            rel = hw - self.sph[s]
            self.log.append(('lit', self.t, s, a['attempt'], k, 'rel', rel.round(3).tolist(),
                             'along', round(float(rel @ self.raydir[s]), 3), 'dact', round(delta_act, 3)))
        if st == 'touch':
            # keep sweeping slowly until the touch ends, then go back to its middle
            a['unlit'] = a['unlit'] + 1 if lit is False else 0
            end = a['unlit'] >= 3 or a['k'] >= RETREAT_STEPS + SWEEP_STEPS - 1
            if end:
                exit_d = delta_act if a['unlit'] >= 3 else SWEEP[1]
                a['hold'] = 0.5 * (a['enter'] + exit_d)
                a['state'] = st = 'hold'
                a['unlit'] = 0
                self.log.append(('hold', self.t, s, round(a['enter'], 3), round(exit_d, 3)))
            elif self.t % 2 == 0:
                a['k'] += 1
            delta = SWEEP[0] + (a['k'] - RETREAT_STEPS) / SWEEP_STEPS * (SWEEP[1] - SWEEP[0])
        if st == 'hold':
            a['unlit'] = a['unlit'] + 1 if lit is False else 0
            if a['unlit'] > HOLD_LOST:
                # the hold spot does not touch: resume the sweep past the touch
                a['state'] = st = 'sweep'
                self.log.append(('lost', self.t, s))
            else:
                delta = a['hold']
        if st == 'sweep':
            # advance the sweep only while the hand keeps up with its target
            lag = np.linalg.norm(hand - a.get('target', np.zeros(3)))
            if k < RETREAT_STEPS or lag < LAG_OK or a.get('stall', 0) > STALL_MAX:
                a['k'] += 1
                a['stall'] = 0
            else:
                a['stall'] = a.get('stall', 0) + 1
            k = a['k']
            if k >= RETREAT_STEPS + SWEEP_STEPS:
                a['attempt'] += 1
                a['k'] = k = 0
                base, d = self.sweep_geometry(s, a['attempt'])
            frac = 0.0 if k < RETREAT_STEPS else (k - RETREAT_STEPS) / SWEEP_STEPS
            delta = SWEEP[0] + frac * (SWEEP[1] - SWEEP[0])
        target = base + d * delta
        a['target'] = target
        if self.t % 2 == 0 or s not in self.q_ik:
            self.q_ik[s] = ik_dir(target, s, self.q_ik.get(s, to_side(Q_NOM, s)), d)
        lim = 0.03 if (st == 'sweep' and a['k'] < RETREAT_STEPS) else 0.05
        self.q_cmd[s] = self.q_cmd[s] + np.clip(self.q_ik[s] - self.q_cmd[s], -lim, lim)

    # -------------------------------------------------------------- main
    def act(self, obs, tools):
        t = self.t
        self.t += 1
        o = obs['low_dim_obs']
        raw = self.hold.copy()
        raw[2] = WALK_HEIGHT
        raw[18:20] = 0.0
        dets, lit = self.observe(tools)
        tp = t - self.t_phase
        down = {s: to_side(Q_DOWN, s) for s in SIDES}

        if self.phase == 'down':
            for s in SIDES:
                self.q_cmd[s] = self.q_cmd[s] + np.clip(down[s] - self.q_cmd[s], -0.05, 0.05)
            if t >= T_DOWN:
                raw[2] = HIGH
            if T_MEAS0 <= t < T_MEAS1:
                self.collect(dets, o)
            if t >= T_MEAS1:
                self.estimate()
                self.set_phase('walk' if len(self.sph) == 2 else 'search')
        elif self.phase == 'search':
            # a sphere was not in view: turn towards its side until it is seen
            missing = [s for s in SIDES if s not in self.sph]
            if not missing:
                self.set_phase('walk')
            else:
                s = missing[0]
                raw[3] = 0.4 if s == 'L' else -0.4
                if tp > 10:
                    self.collect(dets, o)
                    self.meas = {k: (v if k == s else []) for k, v in self.meas.items()}
                if len(self.meas[s]) >= 6 or tp > 120:
                    self.estimate()
                    self.set_phase('walk')
        elif self.phase == 'walk':
            if not hasattr(self, 'goal'):
                self.goal = self.walk_goal(o)
                self.log.append(('goal', self.t, self.goal.round(3).tolist()))
            goal = self.goal
            pos, yaw = pelvis(o)
            err_b = _rz(-yaw)[:2, :2] @ (goal - pos[:2])
            dist = np.linalg.norm(err_b)
            if dist < 0.02 or tp > 200:
                self.set_phase('settle')
            else:
                v = err_b * 1.5
                v = v / np.linalg.norm(v) * np.clip(np.linalg.norm(v), 0.08, 0.3)
                raw[0], raw[1] = v
                raw[3] = np.clip(-yaw * 1.0, -0.3, 0.3)
        elif self.phase == 'settle':
            raw[2] = self.reach_h
            settle = 25 if self.reach_h > WALK_HEIGHT - 0.02 else 40
            if tp >= settle - 10:
                self.collect(dets, o)
            if tp >= settle:
                self.estimate()
                self.start_tracking(o)
                self.set_phase('reach')
        elif self.phase == 'reach':
            raw[2] = self.reach_h
            for s in SIDES:
                self.reach_step(s, lit[COLOR_OF[s]], o)
            self.track(self.head)
        self.hist.append({s: self.q_cmd[s].copy() for s in SIDES})
        # integral action on the shoulder and elbow joints against gravity sag
        for s in SIDES:
            if self.phase == 'reach' and self.arm[s]['state'] == 'sweep':
                qa = o[0:7] if s == 'L' else o[9:16]
                for j in (0, 3):  # shoulder pitch and elbow carry the arm's weight
                    self.integ[s][j] = np.clip(self.integ[s][j] + KI * (self.q_cmd[s][j] - qa[j]), -I_MAX, I_MAX)
        raw[4:11] = self.q_cmd['L'] + self.integ['L']
        raw[11:18] = self.q_cmd['R'] + self.integ['R']
        return raw
