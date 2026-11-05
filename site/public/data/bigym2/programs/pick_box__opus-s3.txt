"""Pick the cardboard box from the side table and set it on the kitchen counter.

Hand-written state machine:
  1. lean back slightly (the posture the head camera model was calibrated in)
  2. walk to a fixed observation pose, estimate the box pose (x, y, yaw) from
     the yellow top face seen by the head camera (pinhole model + least squares)
  3. walk to a stance in front of the box, aligned with one of its axes, and
     re-estimate the box from close range
  4. squat + lean forward, bimanual squeeze grasp: world-frame hand waypoints
     re-solved every step against the current pelvis pose (analytic FK + IK)
  5. stand up leaning back (raises the box), walk to the counter; the box
     touching down on the counter top completes the task (else squat to set
     it down), then release and step back.
"""

import cv2
import numpy as np
from scipy.optimize import least_squares

# ----------------------------------------------------------------------------
# head camera model, pelvis frame, posture height 0.74 / pitch -0.2
F, CDX, CAMZ, PHI = 69.984, 0.0823, 0.3845, 0.9236   # CAMZ: camera height above the box top
BOX_TOP_REL = 0.0          # box top relative to the standing pelvis height
BW, BD = 0.1097, 0.1856    # box top face dimensions (box x, box y)

OBS_POSE = (0.2, -0.5, -0.8)
DEFAULT_BOX = (0.72, -1.01, 0.0)

P = dict(
    dist=0.315,        # pelvis to box centre at the stance
    max_heading=np.pi,  # stance heading limit (clipping it was tried: worse)
    align_rot=False,    # rotating the grippers to the box faces (tried: worse)
    grip_depth=0.15,   # grasp this far below the box top
    grasp_h=0.62,      # pelvis height command while grasping
    grasp_pitch=0.15,  # torso lean while grasping (extends the reach)
    carry_h=0.78,
    carry_pitch=-0.2,  # leaning back raises the box by ~8 cm
    dn=(0.15, 0, -1),  # hand direction while grasping
    open_m=0.07,       # lateral clearance before squeeze
    squeeze=0.06,      # commanded penetration
    lift=0.08,         # hands raised this much (world) while still squatting
    dn_lift=(0.4, 0, -1),
    counter_x=0.42,    # pelvis x at the counter
    place_h=0.66,      # squat to this height to set the box down
)


def wrap(a):
    return (a + np.pi) % (2*np.pi) - np.pi


def top_mask(im):
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV).astype(int)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return ((h > 15) & (h < 40) & (s > 28) & (s < 170) & (v > 200)).astype(np.uint8)


def corners(im):
    m = top_mask(im)
    cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cs:
        return None
    c = max(cs, key=cv2.contourArea)
    if cv2.contourArea(c) < 8:
        return None
    peri = cv2.arcLength(c, True)
    for eps in np.linspace(0.02, 0.2, 40):
        ap = cv2.approxPolyDP(c, eps*peri, True)
        if len(ap) == 4:
            return ap[:, 0, :].astype(float) + 0.5
    return None


def proj_body(Pt):
    fx = Pt[:, 0] - CDX
    ly = Pt[:, 1]
    z = Pt[:, 2] - CAMZ
    Z = fx*np.cos(PHI) - z*np.sin(PHI)
    Yd = -fx*np.sin(PHI) - z*np.cos(PHI)
    return np.stack([F*(-ly)/Z + 42, F*Yd/Z + 42], 1)


def box_top_body(bx, by, th, z=BOX_TOP_REL):
    loc = np.array([[BW/2, BD/2], [-BW/2, BD/2], [-BW/2, -BD/2], [BW/2, -BD/2]])
    c, s = np.cos(th), np.sin(th)
    xy = loc @ np.array([[c, s], [-s, c]]) + [bx, by]
    return np.c_[xy, np.full(4, z)]


PERMS = []
for _k in range(4):
    _p = [(j + _k) % 4 for j in range(4)]
    PERMS.append(_p)
    PERMS.append(_p[::-1])


def est_body(im):
    c = corners(im)
    if c is None:
        return None, 99.0

    def res(p):
        uv = proj_body(box_top_body(*p))
        best = min((np.sum((uv[q] - c)**2), q) for q in PERMS)[1]
        return (uv[best] - c).ravel()
    best = None
    for t0 in np.linspace(-np.pi/2, np.pi/2, 6, endpoint=False):
        r = least_squares(res, [0.5, 0.0, t0])
        if best is None or r.cost < best.cost:
            best = r
    p = best.x.copy()
    p[2] = (p[2] + np.pi/2) % np.pi - np.pi/2
    return p, float(np.sqrt(np.mean(best.fun**2)))


# ----------------------------------------------------------------------------
# arm kinematics (G1 29dof geometry)
def rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


TILT = 2*np.arcsin(0.139201)
WP0 = -0.1217
TOOL = 0.12
LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])


def arm_fk(q, side, waist=WP0):
    sp, sr, sy, el, wr, wp, wy = q
    R = ry(waist)
    p = np.array([-0.0039635, 0, 0.054])
    p = p + R @ np.array([0.0039563, side*0.10022, 0.24778])
    R = R @ rx(side*TILT) @ ry(sp)
    p = p + R @ np.array([0, side*0.038, -0.013831])
    R = R @ rx(-side*TILT) @ rx(sr)
    p = p + R @ np.array([0, side*0.00624, -0.1032])
    R = R @ rz(sy)
    p = p + R @ np.array([0.015783, 0, -0.080518])
    R = R @ ry(el)
    p = p + R @ np.array([0.100, side*0.00188791, -0.010])
    R = R @ rx(wr)
    p = p + R @ np.array([0.038, 0, 0])
    R = R @ ry(wp)
    p = p + R @ np.array([0.046, 0, 0])
    R = R @ rz(wy)
    p = p + R @ np.array([TOOL, 0, 0])
    return p, R


def ik(target, fwd, side, q0, waist=WP0, rot=0.0):
    """rot: rotate the desired hand orientation about the vertical axis (pelvis frame)."""
    target = np.asarray(target, float)
    fwd = rz(rot) @ np.asarray(fwd, float)
    fwd = fwd / np.linalg.norm(fwd)
    ys = rz(rot) @ np.array([0.0, float(side), 0.0])
    qn = np.array([-0.5, 0.2*side, 0, 0.5, 0, 0, 0])

    def res(q):
        p, R = arm_fk(q, side, waist)
        return np.r_[3*(p - target), 0.3*(R[:, 0] - fwd), 0.2*(R[:, 1] - ys), 0.01*(q - qn), 0.02*(q - q0)]
    s = least_squares(res, np.clip(q0, LO, HI), bounds=(LO, HI))
    return s.x


# ----------------------------------------------------------------------------
class Policy:
    """Task-queue state machine. Each task is a small generator-like record."""

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float64)
        self.a = self.hold.copy()
        self.a[19:21] = 1.0
        self.tasks = [
            ('pose', dict(pitch=-0.2, n=30)),
            ('walk', dict(goal=OBS_POSE, vmax=0.3, tol=0.03)),
            ('settle', dict(n=25)),
            ('observe', dict(n=6)),
            ('call', self.plan_grasp),
        ]
        self.cur = None
        self.ests = []
        self.box = None
        self.qlast = self.a[5:19].copy()
        self.log = []

    # --- motion helpers
    def goto_cmd(self, o, goal, vmax=0.3, tol=0.02, ytol=0.03):
        x, y, yaw = goal
        ex, ey = x - o[21], y - o[22]
        c, s = np.cos(o[24]), np.sin(o[24])
        bx, by = c*ex + s*ey, -s*ex + c*ey
        eyaw = wrap(yaw - o[24])
        dist = np.hypot(bx, by)
        done = dist < tol and abs(eyaw) < ytol
        if dist > 0.3:
            # long move: face the direction of travel and walk forward
            etr = wrap(np.arctan2(ey, ex) - o[24])
            sgn = 1.0
            if abs(etr) > np.pi/2 and abs(eyaw) < np.pi/2:   # goal behind: walk backwards
                etr, sgn = wrap(etr + np.pi), -1.0
            w = float(np.clip(2.0*etr, -0.6, 0.6))
            vx = sgn*vmax*max(0.0, np.cos(etr))**4
            if abs(vx) < 0.07:
                vx = 0.0
            if abs(w) < 0.06:
                w = 0.0
            return False, vx, 0.0, w
        vx, vy = 2.0*bx, 2.0*by
        sp = np.hypot(vx, vy)
        if sp > vmax:
            vx, vy = vx*vmax/sp, vy*vmax/sp
        elif sp < 0.07:
            if dist < tol:
                vx = vy = 0.0
            else:
                vx, vy = vx*0.07/sp, vy*0.07/sp
        w = float(np.clip(2.0*eyaw, -0.6, 0.6))
        if abs(w) < 0.06:
            w = 0.0 if abs(eyaw) < ytol else 0.06*np.sign(w)
        return done, vx, vy, w

    def expand(self, wps, yb, steps_per=2, ramp=20):
        """wps: (x, y_half, z, fwd); left hand at yb + y, right at yb - y (pelvis frame)."""
        out = []
        ql, qr = self.qlast[:7].copy(), self.qlast[7:].copy()
        prev = None
        for (x, y, z, fwd) in wps:
            cur = np.array([x, yb + y, yb - y, z])
            n = 1 if prev is None else max(1, int(np.ceil(np.max(np.abs(cur - prev[0])) / 0.01)))
            for k in range(1, n + 1):
                al = k / n
                if prev is None:
                    pt, fw = cur, np.asarray(fwd, float)
                else:
                    pt = prev[0] + (cur - prev[0])*al
                    fw = np.asarray(prev[1], float)*(1 - al) + np.asarray(fwd, float)*al
                ql = ik((pt[0], pt[1], pt[3]), fw, 1, ql)
                qr = ik((pt[0], pt[2], pt[3]), fw, -1, qr)
                out.extend([np.r_[ql, qr]]*steps_per)
            prev = (cur, fwd)
        q0 = self.qlast.copy()
        first = out[0]
        out = [q0 + (first - q0)*(k + 1)/ramp for k in range(ramp)] + out
        self.qlast = out[-1].copy()
        return out

    def rel_path(self, waist, moves, steps_per=3):
        """Move both hands by pelvis-frame offsets from their current FK positions.
        moves: list of (dl, dr) cumulative offsets (3-vectors); orientation is held."""
        q = self.qlast.copy()
        pl, Rl = arm_fk(q[:7], 1, waist)
        pr, Rr = arm_fk(q[7:], -1, waist)
        fl, fr = Rl[:, 0], Rr[:, 0]
        out = []
        prev = (np.zeros(3), np.zeros(3))
        ql, qr = q[:7].copy(), q[7:].copy()
        for dl, dr in moves:
            dl, dr = np.asarray(dl, float), np.asarray(dr, float)
            m = max(1, int(np.ceil(max(np.max(np.abs(dl - prev[0])), np.max(np.abs(dr - prev[1]))) / 0.01)))
            for k in range(1, m + 1):
                a = k / m
                ql = ik(pl + prev[0] + (dl - prev[0])*a, fl, 1, ql, waist)
                qr = ik(pr + prev[1] + (dr - prev[1])*a, fr, -1, qr, waist)
                out.extend([np.r_[ql, qr]]*steps_per)
            prev = (dl, dr)
        self.qlast = out[-1].copy()
        return out

    def body(self, o, x, y):
        c, s = np.cos(o[24]), np.sin(o[24])
        ex, ey = x - o[21], y - o[22]
        return c*ex + s*ey, -s*ex + c*ey

    # --- planning callbacks
    def box_from_ests(self, default):
        if not self.ests:
            return default
        e = np.array(self.ests)
        bx, by = float(np.median(e[:, 0])), float(np.median(e[:, 1]))
        th = float(e[np.argsort(e[:, 0])[len(e)//2], 2])
        return bx, by, th

    def plan_grasp(self, o):
        bx, by, th = self.box_from_ests(DEFAULT_BOX)
        self.log.append(('box0', (bx, by, th), len(self.ests)))
        h = min((wrap(th + k*np.pi/2) for k in range(-2, 3)), key=abs)
        h = float(np.clip(h, -P['max_heading'], P['max_heading']))
        self.box = (bx, by, th)
        self.h = h
        d = P['dist']
        ready = self.expand([(0.25, 0.25, 0.20, (1, 0, -0.5))], 0.0, ramp=30)
        self.ests = []
        return [('arms', dict(q=ready + [ready[-1]]*10)),
                ('walk', dict(goal=(bx - d*np.cos(h), by - d*np.sin(h), h), vmax=0.25, tol=0.02)),
                ('settle', dict(n=20)),
                ('observe', dict(n=6)),
                ('call', self.plan_squeeze)]

    def plan_squeeze(self, o):
        bx, by, th = self.box_from_ests(self.box)
        self.log.append(('box1', (bx, by, th), len(self.ests)))
        h = self.h
        # box axis closest to the heading: squeeze across the other one
        k = min(range(-2, 3), key=lambda k: abs(wrap(th + k*np.pi/2 - h)))
        half = BD/2 if k % 2 == 0 else BW/2
        ax = th + k*np.pi/2                      # facing axis of the box (world)
        self.ax = ax
        n = np.array([-np.sin(ax), np.cos(ax)])  # squeeze direction (to the left)
        c = np.array([bx, by])
        om, sq = P['open_m'], P['squeeze']
        top = 0.747 + BOX_TOP_REL
        zg = top - P['grip_depth']
        dn = P['dn']

        def hp(w, z):
            l, r = c + n*w, c - n*w
            return np.array([l[0], l[1], r[0], r[1], z])
        up = P['dn_lift']
        way = [(hp(half + om, top + 0.08), 1, dn), (hp(half + om, zg), 2, dn), (hp(half - sq, zg), 3, dn),
               (hp(half - sq, zg), 20, dn), (hp(half - sq, zg + P['lift']), 4, up)]
        return [('pose', dict(pitch=P['grasp_pitch'], n=40, height=P['grasp_h'])),
                ('settle', dict(n=20)),
                ('track', dict(way=way)),
                ('call', self.do_carry)]

    def do_carry(self, o):
        xl, yl, xr, yr, z = self.track_body
        self.yb = (yl + yr)/2
        c, s = np.cos(o[24]), np.sin(o[24])
        back = (o[21] - 0.25*c, o[22] - 0.25*s, o[24])
        cx = P['counter_x']
        # arms keep their joint targets; the body stands up with the box
        return [('pose', dict(pitch=P['carry_pitch'], n=60, height=P['carry_h'])),
                ('settle', dict(n=10)),
                ('walk', dict(goal=back, vmax=0.25, tol=0.05)),
                ('walk', dict(goal=(0.1, -0.3, 0.0), vmax=0.3, tol=0.06)),
                ('walk', dict(goal=(cx, -self.yb, 0.0), vmax=0.2, tol=0.015)),
                ('settle', dict(n=25)),
                ('call', self.do_place)]

    def do_place(self, o):
        return [('pose', dict(pitch=P['carry_pitch'], n=100, height=P['place_h'])),
                ('settle', dict(n=20)),
                ('call', self.do_release)]

    def do_release(self, o):
        om = P['open_m'] + P['squeeze']
        q = self.rel_path(o[2], [((0, om, 0), (0, -om, 0)), ((-0.05, om, 0.08), (-0.05, -om, 0.08))])
        c, s = np.cos(o[24]), np.sin(o[24])
        rest = np.zeros(14)
        down = [q[-1] + (rest - q[-1])*(k + 1)/40 for k in range(40)]
        return [('arms', dict(q=q)),
                ('pose', dict(pitch=-0.2, n=40, height=0.74)),
                ('walk', dict(goal=(o[21] - 0.45*c, o[22] - 0.45*s, o[24]), vmax=0.2, tol=0.04)),
                ('arms', dict(q=down)),
                ('settle', dict(n=10 ** 6))]

    # --- main loop
    def act(self, obs, tools):
        o = np.asarray(obs['low_dim_obs'], dtype=np.float64)
        a = self.a
        a[0] = a[1] = a[3] = 0.0
        while self.cur is None and self.tasks and self.tasks[0][0] == 'call':
            _, fn = self.tasks.pop(0)
            self.tasks = fn(o) + self.tasks
        if self.cur is None and self.tasks:
            kind, arg = self.tasks.pop(0)
            self.cur = [kind, dict(arg), 0]
            self.log.append((int(obs['t']), kind))
        kind, arg, n = self.cur if self.cur else (None, None, 0)
        if kind == 'pose':
            if n == 0:
                arg['p0'], arg['h0'] = float(a[4]), float(a[2])
            al = min(1.0, (n + 1)/arg['n'])
            a[4] = arg['p0'] + (arg['pitch'] - arg['p0'])*al
            a[2] = arg['h0'] + (arg.get('height', arg['h0']) - arg['h0'])*al
            if n + 1 >= arg['n']:
                self.cur = None
        elif kind == 'walk':
            done, vx, vy, w = self.goto_cmd(o, arg['goal'], arg['vmax'], arg['tol'])
            dist = np.hypot(arg['goal'][0] - o[21], arg['goal'][1] - o[22])
            if n % 50 == 0:
                if n > 0 and arg['d50'] - dist < 0.01 and dist < 0.08:
                    done = True   # stalled close to the goal (blocked by furniture)
                arg['d50'] = dist
            if done or n > 700:
                self.cur = None
            else:
                a[0], a[1], a[3] = vx, vy, w
        elif kind == 'settle':
            if n + 1 >= arg['n']:
                self.cur = None
        elif kind == 'observe':
            p, e = est_body(tools.image('head'))
            if p is not None and e < 2.0:
                bx, by = self.body_inv(o, p[0], p[1])
                self.ests.append((bx, by, wrap(p[2] + o[24])))
            if n + 1 >= arg['n']:
                self.cur = None
        elif kind == 'track':
            if n == 0:
                sched = []
                way = arg['way']
                for i in range(1, len(way)):
                    p0, p1, spc = way[i-1][0], way[i][0], way[i][1]
                    f0, f1 = np.asarray(way[i-1][2], float), np.asarray(way[i][2], float)
                    m = max(1, int(np.ceil(np.max(np.abs(p1 - p0)) / 0.01)))
                    for k in range(1, m + 1):
                        sched.extend([(p0 + (p1 - p0)*k/m, f0 + (f1 - f0)*k/m)]*spc)
                arg['sched'] = sched
                arg['q0'] = self.qlast.copy()
                arg['qt'] = self.track_ik(o, way[0][0], way[0][2], self.qlast)
            if n < 40:
                q = arg['q0'] + (arg['qt'] - arg['q0'])*(n + 1)/40
            else:
                pw, fw = arg['sched'][n - 40]
                q = self.track_ik(o, pw, fw, self.qlast)
                q = self.qlast + np.clip(q - self.qlast, -0.06, 0.06)
            a[5:19] = q
            self.qlast = q.copy()
            if n + 1 >= 40 + len(arg['sched']):
                self.cur = None
        elif kind == 'arms':
            q = arg['q']
            if n < len(q):
                a[5:19] = q[n]
            if n + 1 >= len(q):
                self.cur = None
        if self.cur is not None:
            self.cur[2] += 1
        return a.astype(np.float32).tolist()

    def track_ik(self, o, pw, fwd, qprev):
        """World-frame hand targets [xl, yl, xr, yr, z] -> joints, using the current pelvis pose."""
        xl, yl = self.body(o, pw[0], pw[1])
        xr, yr = self.body(o, pw[2], pw[3])
        z = pw[4] - o[23]
        self.track_body = (xl, yl, xr, yr, z)
        rot = wrap(self.ax - o[24]) if P['align_rot'] else 0.0   # align the grippers with the box faces
        ql = ik((xl, yl, z), fwd, 1, qprev[:7], o[2], rot)
        qr = ik((xr, yr, z), fwd, -1, qprev[7:], o[2], rot)
        return np.r_[ql, qr]

    def body_inv(self, o, x, y):
        c, s = np.cos(o[24]), np.sin(o[24])
        return o[21] + c*x - s*y, o[22] + s*x + c*y
