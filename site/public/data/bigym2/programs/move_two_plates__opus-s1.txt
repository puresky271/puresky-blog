"""Scripted policy for move_two_plates on the Unitree G1.

Hand-written control: G1 arm forward kinematics + numeric IK, a head camera
model calibrated against the robot's own arms and the table edge, colour-based
detection of the dish racks and plates, and a sequential task script written
as a generator (one yielded action per control step).
"""

import cv2
import numpy as np
from scipy import ndimage
from scipy.optimize import least_squares

# ----------------------------------------------------------------------------
# kinematics (unitree g1_29dof URDF), pelvis frame


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


AX = {'x': rx, 'y': ry, 'z': rz}


def T(R, p):
    M = np.eye(4)
    M[:3, :3] = R
    M[:3, 3] = p
    return M


def arm_chain(side):
    s = 1.0 if side == 'L' else -1.0
    return [
        ((0.0039563, s * 0.10022, 0.24778), (s * 0.27931, 5.4949e-05, -s * 0.00019159), 'y'),
        ((0.0, s * 0.038, -0.013831), (-s * 0.27925, 0, 0), 'x'),
        ((0.0, s * 0.00624, -0.1032), (0, 0, 0), 'z'),
        ((0.015783, 0, -0.080518), (0, 0, 0), 'y'),
        ((0.100, s * 0.00188791, -0.010), (0, 0, 0), 'x'),
        ((0.038, 0, 0), (0, 0, 0), 'y'),
        ((0.046, 0, 0), (0, 0, 0), 'z'),
    ]


CHAINS = {'L': [(T(rpy(*r), xyz), AX[ax]) for xyz, r, ax in arm_chain('L')],
          'R': [(T(rpy(*r), xyz), AX[ax]) for xyz, r, ax in arm_chain('R')]}


def torso_T(waist):
    M = T(rz(waist[0]), (0, 0, 0))
    M = M @ T(rx(waist[1]), (-0.0039635, 0, 0.035))
    M = M @ T(ry(waist[2]), (0, 0, 0.019))
    return M


def fk(side, q, waist, tool=0.14):
    M = torso_T(waist)
    for (A, axf), qi in zip(CHAINS[side], q):
        B = np.eye(4)
        B[:3, :3] = axf(qi)
        M = M @ A @ B
    return M @ T(np.eye(3), (tool, 0, 0))


LO = np.array([-3.0892, -0.05, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])
MIR = np.array([1, -1, -1, 1, -1, 1, -1])
QN = np.array([-0.6, 0.15, 0.0, 0.2, 0.0, 0.6, 0.0])

# camera / torso model (calibrated)
CAM = np.array([0.0008, 0.0007, 0.411, 0.9462, 0.0002, 0.0002, 88.9724])
P0, R0 = 0.0566, -0.0008
TABLE_H = 0.6789
W = 84
RC = np.stack([[0, -1, 0], [0, 0, 1], [-1, 0, 0]], 1).astype(float)


def waist_of(o):
    return (o[0], R0, P0)


def limits(side):
    lo, hi = LO.copy(), HI.copy()
    if side == 'R':
        lo[1], hi[1] = -HI[1], -LO[1]
    return lo + 1e-3, hi - 1e-3


def tool_dirs(a, yaw=0.0):
    d = np.array([np.cos(a) * np.cos(yaw), np.cos(a) * np.sin(yaw), -np.sin(a)])
    yv = np.array([-np.sin(yaw), np.cos(yaw), 0.0])
    return d, np.cross(d, yv)


def ik(side, p, a=0.0, yaw=0.0, q0=None, waist=(0, 0, 0), roll=0.0):
    lo, hi = limits(side)
    qn = QN if side == 'L' else QN * MIR
    d, up = tool_dirs(a, yaw)
    if roll != 0.0:
        # tilt the jaws' up direction sideways: up = (0, sin r, cos r) for a level tool
        jaw = np.array([-np.sin(yaw), np.cos(yaw), 0.0])
        up = np.cos(roll) * up + np.sin(roll) * jaw
    p = np.asarray(p, float)

    qc = qn if q0 is None else np.asarray(q0, float)

    def res(q):
        M = fk(side, q, waist)
        return np.concatenate([M[:3, 3] - p, 0.3 * (M[:3, 0] - d), 0.3 * (M[:3, 2] - up), 0.004 * (q - qn),
                               0.015 * (q - qc)])

    best = None
    for q_init in ([q0] if q0 is not None else []) + [qn]:
        sol = least_squares(res, np.clip(q_init, lo, hi), bounds=(lo, hi))
        err = np.linalg.norm(fk(side, sol.x, waist)[:3, 3] - p)
        if best is None or err < best[1] - 1e-4:
            best = (sol.x, err)
    return best


def world_to_rel(o, p):
    return rz(-o[24]) @ (np.asarray(p, float) - np.array([o[21], o[22], o[23]]))


def rel_to_world(o, p):
    return rz(o[24]) @ np.asarray(p, float) + np.array([o[21], o[22], o[23]])


def cam_world(o):
    x, y, z, pitch, yaw, roll, f = CAM
    Tt = torso_T(waist_of(o))
    R = Tt[:3, :3] @ rpy(roll, pitch, yaw) @ RC
    p = Tt[:3, :3] @ np.array([x, y, z]) + Tt[:3, 3]
    Rz = rz(o[24])
    return Rz @ R, Rz @ p + np.array([o[21], o[22], o[23]]), f


def pix_ray(o, u, v):
    R, p, f = cam_world(o)
    return p, R @ np.array([(u - W / 2) / f, -(v - W / 2) / f, -1.0])


def on_z(o, u, v, z):
    p, d = pix_ray(o, u, v)
    return p + (z - p[2]) / d[2] * d


def on_x(o, u, v, x):
    p, d = pix_ray(o, u, v)
    return p + (x - p[0]) / d[0] * d


# ----------------------------------------------------------------------------
# perception


def bar_mask(im):
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV).astype(int)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return (h >= 8) & (h <= 22) & (s > 60) & (v > 150)


def detect_bars(im, o):
    m0 = bar_mask(im)
    m = cv2.morphologyEx(m0.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((1, 5), np.uint8)).astype(bool)
    lab, n = ndimage.label(m)
    bars = []
    for i in range(1, n + 1):
        ys, xs = np.nonzero(lab == i)
        if len(xs) < 12 or xs.max() - xs.min() < 10:
            continue
        pts = []
        for c in range(xs.min(), xs.max() + 1):
            rr = ys[xs == c]
            if len(rr):
                pts.append(on_z(o, c + 0.5, rr.max() + 1.0, TABLE_H + 0.02))
        pts = np.array(pts)
        bars.append(dict(x=float(np.median(pts[:, 0])), y_lo=float(pts[:, 1].min()), y_hi=float(pts[:, 1].max()),
                         row=float(ys.mean()), c0=int(xs.min()), c1=int(xs.max())))
    return bars


PEG_DY = 0.0433   # peg pitch of the racks (7 pegs per bar)
PLATE_BIAS = 0.012  # head-camera plate estimates (upper part of the plate) read this much too far left


def peg_mask(im):
    hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV).astype(int)
    h, s, v = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    return (h >= 5) & (h <= 25) & (s > 50) & (v < 170) & (v > 40)


def detect_pegs(im, o, bar):
    """world y of the pegs standing on a bar (dark brown columns just above it)."""
    m = peg_mask(im)
    r = int(round(bar['row']))
    prof = np.zeros(W)
    for rr in range(max(0, r - 5), max(0, r - 1)):
        prof += m[rr]
    ys = []
    c = max(0, bar['c0'] - 2)
    while c <= min(W - 1, bar['c1'] + 2):
        if prof[c] >= 2:
            c1 = c
            while c1 + 1 < W and prof[c1 + 1] >= 2:
                c1 += 1
            cc = float(np.average(np.arange(c, c1 + 1), weights=prof[c:c1 + 1]))
            ys.append(on_x(o, cc + 0.5, r - 2.5, bar['x'] + 0.01)[1])
            c = c1 + 1
        else:
            c += 1
    return ys


def grid_phase(ys):
    """phase (mod PEG_DY) of a set of peg y's, robust circular mean."""
    if not ys:
        return None
    ang = 2 * np.pi * np.asarray(ys) / PEG_DY
    z = np.exp(1j * ang)
    m = np.angle(z.mean())
    # reject outliers and recompute
    keep = np.abs(np.angle(z * np.exp(-1j * m))) < 1.2
    if keep.sum() >= 2:
        m = np.angle(z[keep].mean())
    return m / (2 * np.pi) * PEG_DY


def snap_slot(y, phase):
    """nearest slot centre (half way between pegs)."""
    if phase is None:
        return y
    c = phase + PEG_DY / 2
    return c + np.round((y - c) / PEG_DY) * PEG_DY


def merge_pegs(pegs, tol=0.02):
    """merge detections from both bars into peg positions (descending)."""
    ps = sorted(pegs, reverse=True)
    out = []
    for p in ps:
        if out and out[-1][-1] - p < tol:
            out[-1].append(p)
        else:
            out.append([p])
    return [float(np.mean(g)) for g in out if len(g) >= 1]


def rack_slots(pegs):
    """all 6 slot centres (descending y) from partially detected pegs: fit a regular 7-peg grid."""
    ps = merge_pegs(pegs) if pegs else []
    if len(ps) < 2:
        return None
    d = -np.diff(ps)
    pitch = float(np.clip(np.median(d[d < 0.065]) if np.any(d < 0.065) else 0.045, 0.040, 0.049))
    # integer index of each peg relative to the first
    k = np.round((ps[0] - np.asarray(ps)) / pitch)
    # least squares y = a - pitch_f * k
    A = np.stack([np.ones_like(k), -k], 1)
    a, pf = np.linalg.lstsq(A, np.asarray(ps), rcond=None)[0]
    if not (0.040 <= pf <= 0.049):
        pf = pitch
        a = float(np.mean(np.asarray(ps) + pf * k))
    kmax = int(k.max())
    # the grid has 7 pegs; if fewer detected, extend towards the side with room
    return a, pf, kmax


PITCH = 0.0442
RETRY_DY = 0.012    # a failed grasp is retried this much further right (plates lean that way)
LINE_BIAS = 0.015
MAX_LEAN = 0.45     # rad  # on-axis head-camera plate line reads this much too far left


def vote_phase(pegs, pitch=PITCH, tol=0.005):
    """grid phase (peg positions = phase + k*pitch) by voting; robust to spurious pegs."""
    ps = np.asarray(pegs, float)
    if len(ps) < 2:
        return None, 0
    best = (None, -1)
    for ph in np.arange(0.0, pitch, 0.0005):
        r = (ps - ph + pitch / 2) % pitch - pitch / 2
        score = np.sum(np.abs(r) < tol) - 0.01 * np.sum(np.minimum(np.abs(r), tol))
        if score > best[1]:
            best = (ph, score)
    # refine: mean residual of inliers
    ph = best[0]
    r = (ps - ph + pitch / 2) % pitch - pitch / 2
    inl = np.abs(r) < tol
    ph = ph + r[inl].mean()
    return ph, int(inl.sum())


def plate_slots(ys, pegs, bar):
    """snap plate estimates to slot centres of the source rack."""
    base = [y - PLATE_BIAS for y in ys]
    if not pegs:
        return base
    ph, n = vote_phase(pegs)
    if ph is None or n < 3:
        return base
    out = []
    for y in base:
        c = ph + PITCH / 2
        out.append(c + np.round((y - c) / PITCH) * PITCH)
    if len(out) == 2 and abs(out[0] - out[1]) < 0.5 * PITCH:
        # both snapped into one slot: split by raw order
        out[1] = out[0] - PITCH
    return out


def target_slots(pegs):
    """left-most and right-most slot centres of the target rack."""
    ps = merge_pegs(pegs) if pegs else []
    if len(ps) >= 2:
        pitch = np.clip(np.median(-np.diff(ps)), 0.038, 0.05)
    else:
        pitch = 0.045
    if len(ps) == 7:
        ytop, ybot = ps[0], ps[-1]
    elif len(ps) >= 2:
        # anchor on the end whose neighbour spacing looks regular
        ytop = ps[0]
        ybot = ytop - 6 * pitch
        if ps[-1] < ybot - 0.02:
            ybot = ps[-1]
            ytop = ybot + 6 * pitch
    else:
        ytop, ybot = -0.15, -0.42
    pitch = (ytop - ybot) / 6
    # slots 1 and 4 of 0..5: inner slots, pegs on both sides of each plate
    return ytop - 1.5 * pitch, ybot + 2.5 * pitch, ytop, ybot


def plate_cols(im, r0=2, r1=18):
    f = im.astype(float)
    sat = f.max(2) - f.min(2)
    g = f.mean(2)
    bg = np.median(g[r0:r1], axis=1, keepdims=True)
    m = (np.abs(g[r0:r1] - bg) > 18) & (sat[r0:r1] < 30)
    prof = m.sum(0)
    groups = []
    for c in range(W):
        if prof[c] > 5:
            if groups and c - groups[-1][-1] <= 2:
                groups[-1].append(c)
            else:
                groups.append([c])
    return [(float(np.average(g_, weights=prof[g_])), int(prof[g_].sum()), g_[0], g_[-1]) for g_ in groups]


def world_to_pix(o, P):
    R, p, f = cam_world(o)
    Pc = R.T @ (np.asarray(P, float) - p)
    return W / 2 + f * Pc[0] / -Pc[2], W / 2 - f * Pc[1] / -Pc[2]


def plate_line(im, o, y_rough, front_x, r0=2, r1=26, win=7):
    """Fit the edge-on plate seen near the image axis (col = a + b*row) and return the plate's y
    at the grasp point (rim in front of the front bar at GRASP_Z), or None."""
    f = im.astype(float)
    sat = f.max(2) - f.min(2)
    g = f.mean(2)
    c_exp = world_to_pix(o, [front_x + 0.06, y_rough, 0.93])[0]
    pts = []
    for r in range(r0, r1):
        m = (np.abs(g[r] - np.median(g[r])) > 18) & (sat[r] < 30)
        cols = np.nonzero(m)[0]
        cols = cols[np.abs(cols - c_exp) <= win]
        if len(cols) == 0:
            continue
        # contiguous run containing the column nearest the expectation
        c0 = cols[np.argmin(np.abs(cols - c_exp))]
        run = [c0]
        while run[-1] + 1 in cols:
            run.append(run[-1] + 1)
        while run[0] - 1 in cols:
            run.insert(0, run[0] - 1)
        if len(run) <= 6:
            pts.append((r, float(np.mean(run))))
    if len(pts) < 6:
        return None
    pts = np.array(pts)
    a = np.polyfit(pts[:, 0], pts[:, 1], 1)
    res = np.abs(np.polyval(a, pts[:, 0]) - pts[:, 1])
    keep = res < 1.5
    if keep.sum() >= 6:
        a = np.polyfit(pts[keep, 0], pts[keep, 1], 1)
    xr = front_x - 0.05
    rg = world_to_pix(o, [xr, y_rough, GRASP_Z])[1]
    cg = np.polyval(a, rg)
    return float(on_x(o, cg + 0.5, rg + 0.5, xr)[1]), float(a[0]), len(pts)


def plate_lean(im, o, y_rough, front_x, r0=2, r1=26, win=8):
    """Lean of the plate seen roughly on-axis: returns (theta, y at grasp height, n points) or None.
    theta > 0: the plate's top leans towards +y (plate up direction = (0, sin, cos))."""
    f = im.astype(float)
    sat = f.max(2) - f.min(2)
    g = f.mean(2)
    c_exp = world_to_pix(o, [front_x + 0.06, y_rough, 0.93])[0]
    pts = []
    for r in range(r0, r1):
        m = (np.abs(g[r] - np.median(g[r])) > 18) & (sat[r] < 30)
        cols = np.nonzero(m)[0]
        cols = cols[np.abs(cols - c_exp) <= win]
        if len(cols) == 0:
            continue
        c0 = cols[np.argmin(np.abs(cols - c_exp))]
        run = [c0]
        while run[-1] + 1 in cols:
            run.append(run[-1] + 1)
        while run[0] - 1 in cols:
            run.insert(0, run[0] - 1)
        if len(run) <= 9:
            pts.append((r, float(np.mean(run))))
    if len(pts) < 8:
        return None
    pts = np.array(pts)
    a = np.polyfit(pts[:, 0], pts[:, 1], 1)
    res = np.abs(np.polyval(a, pts[:, 0]) - pts[:, 1])
    keep = res < 1.5
    if keep.sum() >= 8:
        a = np.polyfit(pts[keep, 0], pts[keep, 1], 1)
    best = None
    p1 = np.array([front_x + 0.06, y_rough, 0.88])
    c1, r1_ = world_to_pix(o, p1)
    for th in np.linspace(-0.6, 0.6, 121):
        c2, r2 = world_to_pix(o, p1 + 0.1 * np.array([0, np.sin(th), np.cos(th)]))
        s = (c2 - c1) / (r2 - r1_)
        if best is None or abs(s - a[0]) < best[0]:
            best = (abs(s - a[0]), th)
    xr = front_x - 0.05
    rg = world_to_pix(o, [xr, y_rough, GRASP_Z])[1]
    yg = float(on_x(o, np.polyval(a, rg) + 0.5, rg + 0.5, xr)[1])
    return float(best[1]), yg, len(pts)


def plate_estimates(im, o, front):
    """y of the plates (left to right) seen from the look pose; a wide blob is two adjacent plates."""
    groups = [g for g in plate_cols(im) if g[1] >= 25]
    groups.sort(key=lambda g: -g[1])
    if len(groups) >= 2:
        cs = [groups[0][0], groups[1][0]]
    elif len(groups) == 1:
        c, w, c0, c1 = groups[0]
        cs = [c0 + 2.0, c1 - 2.0] if c1 - c0 >= 7 else [c]
    else:
        cs = []
    return sorted([on_x(o, cc + 0.5, 10.5, front + 0.04)[1] for cc in cs], reverse=True)


# ----------------------------------------------------------------------------
# base control


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def base_cmd(o, target, kp=2.2, kyaw=1.5, vmax=0.4, tol=0.015):
    x, y, yaw = o[21], o[22], o[24]
    dx, dy = target[0] - x, target[1] - y
    c, s = np.cos(yaw), np.sin(yaw)
    bx, by = c * dx + s * dy, -s * dx + c * dy
    vx, vy = kp * bx, kp * by
    sp = np.hypot(vx, vy)
    if sp > vmax:
        vx, vy = vx * vmax / sp, vy * vmax / sp
    dist = np.hypot(bx, by)
    sp = np.hypot(vx, vy)
    if dist < tol:
        vx = vy = 0.0
    elif sp < 0.07:
        vx, vy = vx * 0.07 / sp, vy * 0.07 / sp
    e = wrap(target[2] - yaw)
    wz = 0.0 if abs(e) < 0.02 else float(np.clip(kyaw * e, -0.5, 0.5))
    return vx, vy, wz, dist


# ----------------------------------------------------------------------------
# policy

READY_REL = {'L': np.array([0.13, 0.24, 0.05]), 'R': np.array([0.13, -0.24, 0.05])}  # tucked: clear of the plates while walking
STAND_X = 0.17
LOOK_X = 0.12
HAND_DY = 0.16          # lateral offset of the working hand from the pelvis
GRASP_Z = 0.83
LIFT_Z = 1.0
GRASP_DX = 0.0          # tool (0.14) x at the detected front bar: rim ~5 cm inside the fingers
CLEAR_DZ = 0.12         # vertical lift that takes a plate's foot above the pegs (tops ~0.76 m)
PULL_DX = 0.03        # then pull the plate back towards the robot, off the rack
SLOT_DY_L = 0.008       # set each plate down against the peg it would otherwise lean onto:
SLOT_DY_R = -0.010     # the left-hand plate leans to +y once released, the right-hand one to -y
PLACE_DX = 0.0      # set the plate down a little deeper than it was picked (it tends to rotate forward in the grip)
DROP_DZ = 0.02       # release this far above the pick-up height: the plate drops into the slot
RELEASE_GRIP = 0.3   # open fully when letting go (a finger left touching the plate counts as holding it)
PRE_GRIP = 0.6         # half-open gripper (~4.4 cm) so the fingers fit between adjacent plates


class Policy:
    def reset(self, obs, tools):
        self.tools = tools
        self.obs = obs
        self.log = []
        self.snaps = []
        self.zgrasp = {'L': GRASP_Z - 0.013, 'R': GRASP_Z - 0.013}
        self.roll = {'L': 0.0, 'R': 0.0}
        self.t = 0
        self.done = False
        self.q = {}
        self.grip = {'L': 0.0, 'R': 0.0}
        for side in 'LR':
            self.q[side] = ik(side, READY_REL[side], 0.0, 0.0, waist=(0, R0, P0))[0]
        self.gen = self.main()

    def act(self, obs, tools):
        self.obs = obs
        self.tools = tools
        self.t = int(obs.get('t', 0))
        if self.done:
            return self.action()
        try:
            return next(self.gen)
        except Exception:  # StopIteration, or anything unexpected: keep holding still
            self.done = True
            return self.action()

    # -- helpers
    def o(self):
        return np.asarray(self.obs['low_dim_obs'], float)

    def action(self, v=(0.0, 0.0, 0.0)):
        a = np.zeros(21, np.float32)
        a[0], a[1], a[3] = v[0], v[1], v[2]
        a[2] = 0.74
        a[4] = 0.0
        a[5:12] = self.q['L']
        a[12:19] = self.q['R']
        a[19] = self.grip['L']
        a[20] = self.grip['R']
        return a

    def hold(self, n):
        for _ in range(n):
            yield self.action()

    def goto(self, tgt, maxk=400, settle=25, tol=0.025):
        for k in range(maxk):
            vx, vy, wz, dist = base_cmd(self.o(), tgt, tol=tol * 0.6)
            if dist < tol and abs(wrap(tgt[2] - self.o()[24])) < 0.04 and k > 10:
                break
            yield self.action((vx, vy, wz))
        yield from self.hold(settle)

    def tip_world(self, side, q=None, tool=0.10):
        o = self.o()
        sl = slice(3, 10) if side == 'L' else slice(12, 19)
        q = o[sl] if q is None else q
        return rel_to_world(o, fk(side, q, waist_of(o), tool)[:3, 3])

    def approach(self, side, y, z, x0, x1, speed=0.0018, near=None):
        """advance the tool (0.14 point) along +x at (y, z) until contact; returns True on contact."""
        pel0 = self.o()[21].copy()
        x = x0
        lag_n = 0
        near = x1 - 0.14 if near is None else near
        while x < x1:
            x = min(x1, x + 2 * speed)
            self.set_hand_world(side, [x, y, z])
            yield from self.hold(2)
            cmd = self.tip_world(side, self.q[side])
            meas = self.tip_world(side)
            lag = cmd[0] - meas[0]
            pushed = (pel0 - self.o()[21]) > 0.04 and meas[0] > near and lag > 0.01
            lag_n = lag_n + 1 if (lag > 0.022 and meas[0] > near) else 0
            if lag_n >= 2 or pushed:
                self.log.append(('contact', round(float(meas[0]), 3), round(float(lag), 3), bool(pushed), self.t))
                # hold the hand where it is
                self.set_hand_world(side, [meas[0] + 0.04 + 0.005, y, z])
                return True
        return False

    def set_hand_world(self, side, p, a=0.0, yaw=0.0, roll=None):
        o = self.o()
        roll = self.roll[side] if roll is None else roll
        q, err = ik(side, world_to_rel(o, p), a, yaw - o[24], q0=self.q[side], waist=waist_of(o), roll=roll)
        self.q[side] = q
        return err

    def move_hand(self, side, p0, p1, steps, per=4):
        """straight line in world from p0 to p1 over `steps` waypoints, `per` control steps each."""
        for i in range(1, steps + 1):
            p = np.asarray(p0) + (np.asarray(p1) - np.asarray(p0)) * i / steps
            self.set_hand_world(side, p)
            yield from self.hold(per)

    def hand_world(self, side):
        o = self.o()
        sl = slice(3, 10) if side == 'L' else slice(12, 19)
        return rel_to_world(o, fk(side, o[sl], waist_of(o))[:3, 3])

    def look(self, tag):
        im = self.tools.image('head')
        o = self.o()
        self.snaps.append((tag, self.t, im, o.copy()))
        return im, o

    def move_hands(self, targets, steps, per=4):
        """move several hands along straight world lines together. targets: {side: (p0, p1)}"""
        for i in range(1, steps + 1):
            for side, (p0, p1) in targets.items():
                p = np.asarray(p0, float) + (np.asarray(p1, float) - np.asarray(p0, float)) * i / steps
                self.set_hand_world(side, p)
            yield from self.hold(per)

    def rack_info(self, im, o, want_left):
        bars = [b for b in detect_bars(im, o) if ((b['y_lo'] + b['y_hi']) / 2 > 0) == want_left]
        if not bars:
            return None, None, bars
        front = dict(min(bars, key=lambda b: b['x']))
        if len(bars) == 1 and front['x'] > 0.54:
            front['x'] -= 0.115   # only the back bar was seen
        pegs = []
        for b in bars:
            pegs += detect_pegs(im, o, b)
        return front, pegs, bars

    def grasp(self, side, y, front_x, tries=2, pre=0.0, away=0.0, lean=0.0):
        """grasp the plate standing at y (rim facing the robot); returns (ok, tip x at grasp).
        lean: the plate's sideways lean; the jaws are rolled to match and rolled back after lifting."""
        gi = 50 if side == 'L' else 51
        self.roll[side] = lean
        y0 = y
        for attempt in range(tries):
            y = y0 - RETRY_DY * attempt
            self.grip[side] = pre
            p_pre = np.array([front_x - 0.14, y, GRASP_Z])
            hp = self.hand_world(side)
            yield from self.move_hand(side, hp, p_pre, 6, 4)
            yield from self.hold(15)
            yield from self.approach(side, y, GRASP_Z, p_pre[0], front_x + GRASP_DX, near=front_x - 0.075)
            tip = self.tip_world(side)
            self.zgrasp[side] = float(self.hand_world(side)[2])
            self.grip[side] = 1.0
            yield from self.hold(25)
            ok = self.o()[gi] < 0.97
            self.log.append(('grasp', side, attempt, round(float(y), 3), bool(ok), round(float(tip[0] - front_x), 3), self.t))
            if ok:
                break
            self.grip[side] = 0.0
            yield from self.hold(10)
        # lean the plate away from its neighbour, lift it slowly straight out of the slot,
        # pull it back off the rack, then raise it to carrying height
        hp = self.hand_world(side)
        p1 = np.array([hp[0], y + away, hp[2]])
        p2 = p1 + [0, 0, CLEAR_DZ]
        p3 = p2 + [-PULL_DX, 0, 0]
        p4 = np.array([p3[0], p3[1], LIFT_Z])
        yield from self.move_hand(side, hp, p1, 5, 3)
        yield from self.move_hand(side, p1, p2, 16, 5)
        yield from self.move_hand(side, p2, p3, 10, 5)
        # clear of the rack: roll the plate upright while raising it to carrying height
        for i in range(1, 11):
            self.roll[side] = lean * (1 - i / 10)
            self.set_hand_world(side, p3 + (p4 - p3) * i / 10)
            yield from self.hold(5)
        return ok, tip[0] - front_x

    def refine(self, y, fx, tag):
        """walk the head camera in front of a plate and measure its y at the grasp point."""
        yield from self.goto((LOOK_X, y, 0.0), settle=12, tol=0.02, maxk=200)
        im, o = self.look('ref' + tag)
        r = plate_line(im, o, y + LINE_BIAS, fx)
        out = y
        if r is not None and abs(r[0] - LINE_BIAS - y) < 0.03:
            out = r[0] - LINE_BIAS
        self.log.append(('refine', tag, round(float(y), 4), None if r is None else round(r[0] - LINE_BIAS, 4), round(float(out), 4)))
        return out

    def look_lean(self, y, fx, tag):
        """on-axis look at a plate: returns (y at grasp height, lean angle)."""
        yield from self.goto((LOOK_X, y, 0.0), settle=12, tol=0.02, maxk=200)
        im, o = self.look('lean' + tag)
        r = plate_lean(im, o, y + LINE_BIAS, fx)
        yo, th = y, 0.0
        if r is not None:
            th = float(np.clip(r[0], -MAX_LEAN, MAX_LEAN))
            if abs(r[1] - LINE_BIAS - y) < 0.03:
                yo = r[1] - LINE_BIAS
        self.log.append(('lean', tag, round(float(y), 4), None if r is None else (round(np.degrees(r[0]), 1), round(r[1] - LINE_BIAS, 4)), round(float(yo), 4)))
        return yo, th

    # -- task
    def main(self):
        yield from self.hold(10)
        # 0. look at the target rack while the hands are still empty
        yield from self.goto((LOOK_X, -0.28, 0.0), settle=15, tol=0.015, maxk=250)
        im, o = self.look('dst')
        front, pegs, bars = self.rack_info(im, o, False)
        tx = front['x'] if front else 0.47
        sL, sR, ytop, ybot = target_slots(pegs)
        self.log.append(('dst', round(tx, 3), round(float(ytop), 3), round(float(ybot), 3), round(float(sL), 3), round(float(sR), 3)))
        # 1. look at the source rack
        yield from self.goto((LOOK_X, 0.21, 0.0), settle=15, tol=0.015, maxk=250)
        im, o = self.look('src')
        front, pegs, bars = self.rack_info(im, o, True)
        fx = front['x'] if front else 0.49
        phase = grid_phase(pegs) if pegs and len(pegs) >= 3 else None
        ys = plate_estimates(im, o, fx)
        ys_s = plate_slots(ys, pegs, front)
        self.log.append(('src', round(fx, 3), np.round(ys, 3).tolist(), np.round(ys_s, 3).tolist(), phase))
        if len(ys_s) < 2:
            ys_s = (ys_s + [ys_s[0] - 2 * PEG_DY] if ys_s else [0.25, 0.20])
        yA, yB = ys_s[0], ys_s[1]
        close = yA - yB < 0.07
        # 2. left hand takes the left plate (after an on-axis look at it)
        if abs(yA - o[22]) > 0.06:
            yA = yield from self.refine(yA, fx, 'A')
        self.sx_src = float(np.clip(fx - 0.30, 0.13, 0.22))
        yield from self.goto((self.sx_src, yA - HAND_DY, 0.0), settle=15)
        okA, dA = yield from self.grasp('L', yA, fx, pre=PRE_GRIP if close else 0.0, away=0.015)
        # 3. right hand takes the other one (left arm stays fixed in the body frame); look at it
        #    on-axis first: without its neighbour it may now lean
        yB, leanB = yield from self.look_lean(yB, fx, 'B')
        yield from self.goto((self.sx_src, yB + HAND_DY, 0.0), settle=15)
        okB, dB = yield from self.grasp('R', yB, fx, lean=leanB)
        # 4. carry both to the target rack
        sL, sR = sL + SLOT_DY_L, sR + SLOT_DY_R
        ymid = 0.5 * (sL + sR)
        yield from self.goto((float(np.clip(tx - 0.30, 0.13, 0.23)), ymid, 0.0), settle=15)
        # 5. place both
        xL = tx + dA + 0.04 + PLACE_DX
        xR = tx + dB + 0.04 + PLACE_DX
        hL, hR = self.hand_world('L'), self.hand_world('R')
        yield from self.move_hands({'L': (hL, [xL, sL, LIFT_Z]), 'R': (hR, [xR, sR, LIFT_Z])}, 12, 5)
        yield from self.hold(10)
        # lower each plate until its (measured) height is a little above where it was picked up
        tgt = {'L': [xL, sL, LIFT_Z], 'R': [xR, sR, LIFT_Z]}
        stop = {'L': False, 'R': False}
        # fast down to a few cm above the pick-up height, then slowly until the rack takes the
        # plate's weight (the arm stops sagging: measured-minus-commanded height rises)
        for side in 'LR':
            tgt[side][2] = self.zgrasp[side] + 0.05
        yield from self.move_hands({'L': ([xL, sL, LIFT_Z], list(tgt['L'])), 'R': ([xR, sR, LIFT_Z], list(tgt['R']))}, 12, 5)
        yield from self.hold(10)
        lags = {'L': [], 'R': []}
        cnt = {'L': 0, 'R': 0}
        for k in range(90):
            for side in 'LR':
                if stop[side]:
                    continue
                lag = self.hand_world(side)[2] - self.tip_world(side, self.q[side], 0.14)[2]
                lags[side].append(lag)
                base = np.median(lags[side][:8]) if len(lags[side]) >= 8 else None
                cnt[side] = cnt[side] + 1 if (base is not None and lag - base > 0.01) else 0
                if cnt[side] >= 2 or tgt[side][2] < self.zgrasp[side] - 0.05:
                    stop[side] = True
                    tgt[side][2] = self.hand_world(side)[2] + 0.004
                    self.set_hand_world(side, tgt[side])
                    continue
                tgt[side][2] -= 0.0015
                self.set_hand_world(side, tgt[side])
            if stop['L'] and stop['R']:
                break
            yield from self.hold(2)
        self.log.append(('lowered', round(self.hand_world('L')[2] - self.zgrasp['L'], 3),
                         round(self.hand_world('R')[2] - self.zgrasp['R'], 3), self.t))
        yield from self.hold(15)
        # open slowly: snapping the fingers open flicks the plates sideways
        for i in range(1, 41):
            self.grip['L'] = self.grip['R'] = 1.0 - (1.0 - RELEASE_GRIP) * i / 40
            yield from self.hold(1)
        yield from self.hold(15)
        # ease the open fingers off the rims, then keep still: the plates must stand untouched
        self.grip['L'] = self.grip['R'] = 0.0
        yield from self.hold(10)
        hL, hR = list(tgt['L']), list(tgt['R'])
        tgt = {'L': [hL[0] - 0.10, hL[1], hL[2] + 0.005], 'R': [hR[0] - 0.10, hR[1], hR[2] + 0.005]}
        yield from self.move_hands({'L': (hL, tgt['L']), 'R': (hR, tgt['R'])}, 15, 3)
        yield from self.hold(80)
        self.grip['L'] = 0.0
        self.grip['R'] = 0.0
        yield from self.hold(10)
        hL, hR = list(tgt['L']), list(tgt['R'])
        yield from self.move_hands({'L': (hL, [hL[0] - 0.14, hL[1], hL[2] + 0.02]),
                                    'R': (hR, [hR[0] - 0.14, hR[1], hR[2] + 0.02])}, 20, 5)
        yield from self.hold(20)
        for side in 'LR':
            self.q[side] = ik(side, READY_REL[side], 0.0, 0.0, q0=self.q[side], waist=(0, R0, P0))[0]
        while True:
            yield self.action()
