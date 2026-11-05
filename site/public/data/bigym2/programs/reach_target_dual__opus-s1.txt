"""Dual reach policy: touch the red sphere with the left hand, green with the right.

Pipeline: locate both spheres in the head camera (colour blobs -> 3D by
triangulating all views with a calibrated pinhole model and the known sphere
radius; extra viewpoints for spheres outside the view), walk to a reaching
station, solve arm IK (G1 kinematics) with integral action against gravity
droop, and search along the camera ray until each visible sphere lights up.
"""

import cv2
import numpy as np
from scipy.optimize import least_squares

# ----------------------------------------------------------------- kinematics

def Rx(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])


def Ry(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])


def Rz(a):
    c, s = np.cos(a), np.sin(a)
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


AX = {"x": Rx, "y": Ry, "z": Rz}
TORSO = np.array([-0.0039635, 0, 0.054])


def chain(side):
    s = 1 if side == "left" else -1
    return [
        (np.array([0.0039563, s * 0.10022, 0.24778]), Rx(s * 0.27931), "y"),
        (np.array([0, s * 0.038, -0.013831]), Rx(-s * 0.27925), "x"),
        (np.array([0, s * 0.00624, -0.1032]), np.eye(3), "z"),
        (np.array([0.015783, 0, -0.080518]), np.eye(3), "y"),
        (np.array([0.100, s * 0.00188791, -0.010]), np.eye(3), "x"),
        (np.array([0.038, 0, 0]), np.eye(3), "y"),
        (np.array([0.046, 0, 0]), np.eye(3), "z"),
    ]


CHAINS = {"left": chain("left"), "right": chain("right")}


def fk(q, side, tip):
    p = TORSO.copy()
    R = np.eye(3)
    for (xyz, R0, ax), qi in zip(CHAINS[side], q):
        p = p + R @ xyz
        R = R @ R0 @ AX[ax](qi)
    return p + R @ tip


LO = np.array([-3.0892, -1.5882, -2.618, -1.0472, -1.97222, -1.61443, -1.61443])
HI = np.array([2.6704, 2.2515, 2.618, 2.0944, 1.97222, 1.61443, 1.61443])
MIR = np.array([1, -1, -1, 1, -1, 1, -1])
TIP = np.array([0.10, 0.0, 0.0])


def limits(side):
    if side == "left":
        return LO, HI
    return np.minimum(LO * MIR, HI * MIR), np.maximum(LO * MIR, HI * MIR)


STARTS = [np.array(v) for v in ([-0.6, 0.2, 0.0, 0.3], [-1.2, 0.3, 0.0, -0.3],
                                 [-0.2, 0.1, 0.0, 0.9], [-0.8, 0.4, 0.4, 0.2])]


def ik(target, side, q0=None, lam=0.01):
    s = 1 if side == "left" else -1
    qnom = np.array([-0.6, 0.2 * s, 0.0, 0.3, 0, 0, 0])
    lo, hi = limits(side)
    idx = [0, 1, 2, 3]

    def res(x):
        q = qnom.copy()
        q[idx] = x
        return np.r_[fk(q, side, TIP) - target, lam * (x - qnom[idx])]

    inits = [st * np.array([1, s, s, 1]) for st in STARTS]
    if q0 is not None:
        inits = [np.asarray(q0)[idx]]
    best = None
    for x0 in inits:
        x0 = np.clip(x0, lo[idx] + 1e-3, hi[idx] - 1e-3)
        sol = least_squares(res, x0, bounds=(lo[idx], hi[idx]))
        if best is None or sol.cost < best.cost - 1e-9:
            best = sol
    q = qnom.copy()
    q[idx] = best.x
    return q, float(np.linalg.norm(fk(q, side, TIP) - target))


# --------------------------------------------------------------------- camera

CAM = dict(f=89.365, pos=np.array([0.0302, 0.0156, 0.4642]), pitch=1.006,
           yaw=-0.0069, roll=-0.0068, R=0.0475)


def cam_R():
    p, yaw, roll = CAM["pitch"], CAM["yaw"], CAM["roll"]
    z = np.array([np.cos(p), 0, -np.sin(p)])
    x = np.array([0, -1.0, 0])
    y = np.cross(z, x)
    R = np.c_[x, y, z]
    return Rz(yaw) @ R @ Rz(roll)


CAMR = cam_R()


def pix_to_pelvis(u, v, r):
    f, Rs = CAM["f"], CAM["R"]
    d = Rs * np.sqrt(f ** 2 / r ** 2 + 1)
    ray = np.array([(u - 41.5) / f, (v - 41.5) / f, 1.0])
    ray /= np.linalg.norm(ray)
    return CAMR @ (ray * d) + CAM["pos"]


def pelvis_to_world(pt, pose):
    return Rz(pose[3]) @ pt + pose[:3]


def world_to_pelvis(pt, pose):
    return Rz(pose[3]).T @ (pt - pose[:3])


# --------------------------------------------------------------------- vision

def colour_masks(im):
    im = im.astype(np.int16)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    red = (r > 50) & (r > g + 35) & (r > b + 35)
    green = (g > 50) & (g > r + 30) & (g > b + 15)
    return red, green


def blob(mask, img_ch):
    n, lab, stats, cent = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    if n <= 1:
        return None
    i = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    area = int(stats[i, cv2.CC_STAT_AREA])
    if area < 4:
        return None
    x, y, w, h = stats[i, :4]
    H, W = mask.shape
    edge = bool(x == 0 or y == 0 or x + w >= W or y + h >= H)
    cs, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL,
                             cv2.CHAIN_APPROX_NONE)
    pts = cs[0][:, 0, :].astype(float)
    keep = (pts[:, 0] > 0) & (pts[:, 1] > 0) & (pts[:, 0] < W - 1) & (pts[:, 1] < H - 1)
    p = pts[keep] if keep.sum() >= 5 else pts
    A = np.c_[2 * p[:, 0], 2 * p[:, 1], np.ones(len(p))]
    sol, *_ = np.linalg.lstsq(A, (p ** 2).sum(1), rcond=None)
    cx, cy = sol[0], sol[1]
    rad = np.sqrt(max(sol[2] + cx ** 2 + cy ** 2, 0)) + 0.5
    m = lab == i
    return dict(area=area, cx=float(cx), cy=float(cy), r=float(rad), edge=edge,
                ninner=int(keep.sum()), bright=float(np.percentile(img_ch[m], 90)))


def lit_count(im, colour):
    """Pixels of the lit (bright, saturated) sphere colour."""
    im = im.astype(np.int16)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    if colour == "red":
        return int(((r > 215) & (g < 90) & (b < 90)).sum())
    return int(((g > 215) & (r < 110) & (b < 110)).sum())


def detect(im):
    red, green = colour_masks(im)
    return {"red": blob(red, im[..., 0]), "green": blob(green, im[..., 1])}


# --------------------------------------------------------------------- policy

STANDOFF = 0.25   # desired sphere distance in front of the pelvis (at pelvis height)
VIEW_DIST = 0.32  # horizontal pelvis-sphere distance for a dedicated look
YAW_GAIN = 2.5
YAW_MAX = 0.8
TUCK = np.array([0.0, 0.25, 0.0, 1.3, 0.0, 0.0, 0.0])  # arms out of the head view
# FK-frame offset at which each hand lights its sphere (measured by scanning)
BIAS = {"left": np.array([0.0, 0.0, 0.0]), "right": np.array([0.0, 0.0, 0.0])}
R_WEIGHT = 0.5   # weight of the apparent radius against the pixel position
KI = 0.05        # per-step integral gain on arm joint tracking error
DEFAULT = {"red": np.array([0.45, 0.2, 0.08]), "green": np.array([0.45, -0.2, 0.08])}
SIDE = {"left": "red", "right": "green"}
ARM = {"red": "left", "green": "right"}
DWELL = 6
SOLO_T = 200
USE_SOLO = False
STATION_YAW = 0.6  # max heading change of the reaching station
LOOK_N = 8
SOLO_Y = 0.12     # lateral offset of a sphere in the single-arm station


def search_offsets():
    pts = []
    s = 0.025
    for i in range(-2, 3):
        for j in range(-3, 4):
            for k in range(-3, 4):
                p = np.array([i * s, j * s, k * s])
                if (p[0] / 0.05) ** 2 + (p[1] / 0.075) ** 2 + (p[2] / 0.075) ** 2 <= 1.0001:
                    pts.append(p)
    pts.sort(key=lambda p: (round(float(np.linalg.norm(p)), 4), float(np.arctan2(p[2], p[1])), p[0]))
    return pts


def ray_offsets():
    """Search pattern (depth along the camera ray, then sideways): the image
    position of a sphere is precise, its depth is not."""
    out = [(t, 0.0, 0.0) for t in (0.0, 0.03, -0.03, 0.06, -0.06, 0.09, 0.12, -0.09, 0.15)]
    for t in (0.0, 0.03, -0.03, 0.06, 0.09, -0.06, 0.12):
        for a, b in ((0.03, 0), (-0.03, 0), (0, 0.03), (0, -0.03)):
            out.append((t, a, b))
    return out


OFFSETS = ray_offsets()


def ray_frame(S):
    ray = S - CAM["pos"]
    ray /= np.linalg.norm(ray)
    e1 = np.cross(ray, [0, 0, 1.0])
    e1 /= np.linalg.norm(e1)
    e2 = np.cross(e1, ray)
    return ray, e1, e2


def offset_vec(S, c):
    ray, e1, e2 = ray_frame(S)
    return c[0] * ray + c[1] * e1 + c[2] * e2


def plausible(P):
    return 0.1 < P[0] < 1.0 and abs(P[1]) < 0.7 and -0.35 < P[2] < 0.45


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


def project(P):
    """Pelvis-frame point -> head pixel (u, v) and pixel radius."""
    c = CAMR.T @ (P - CAM["pos"])
    if c[2] <= 0.05:
        return None
    f = CAM["f"]
    return 41.5 + f * c[0] / c[2], 41.5 + f * c[1] / c[2], f * CAM["R"] / c[2]


def visible(P, margin=0.0):
    p = project(P)
    if p is None:
        return False
    u, v, r = p
    m = r * margin
    return m - 0.5 <= u <= 83.5 - m and m - 0.5 <= v <= 83.5 - m


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float64)
        self.world = {}
        self.qual = {"red": 0, "green": 0}
        self.corr = {"red": np.zeros(3), "green": np.zeros(3)}  # world-frame corrections
        self.qcmd = {"left": TUCK.copy(), "right": TUCK * MIR}
        self.log = []
        self.home = self.pose(obs)
        self.queue = [("settle", 25), ("look", LOOK_N, "start")]
        self.task = None
        self.phase = "plan"
        self.active = ()
        self.srch = {}
        self.solo_est = {}
        self.hist = {"red": [], "green": []}
        self.qint = {"left": np.zeros(7), "right": np.zeros(7)}

    # ------------------------------------------------------------ helpers
    def pose(self, obs):
        return np.asarray(obs["low_dim_obs"][18:22], dtype=np.float64)

    def observe(self, obs, tools, acc):
        det = detect(tools.image("head"))
        pose = self.pose(obs)
        for k in ("red", "green"):
            b = det[k]
            if b is None or b["r"] <= 2 or b["ninner"] < 6:
                continue
            P = pix_to_pelvis(b["cx"], b["cy"], b["r"])
            if not plausible(P):
                continue
            acc[k][0 if b["edge"] else 1].append(pelvis_to_world(P, pose))
            self.hist[k].append((pose.copy(), b["cx"], b["cy"], b["r"], b["edge"]))

    def triangulate(self, k, P0, full_only):
        rows = [h for h in self.hist[k] if not (full_only and h[4])]
        if not rows:
            return P0

        def res(P):
            out = []
            for pose, u, v, r, edge in rows:
                p = project(world_to_pelvis(P, pose))
                w = 0.3 if edge else 1.0
                if p is None:
                    out += [10.0, 10.0, 10.0]
                else:
                    out += [w * (p[0] - u), w * (p[1] - v), w * R_WEIGHT * (p[2] - r)]
            return out

        sol = least_squares(res, P0, loss="soft_l1", f_scale=1.0)
        return sol.x

    def fuse(self, acc):
        for k in ("red", "green"):
            part, full = acc[k]
            if len(full) >= 3:
                self.world[k] = self.triangulate(k, np.median(np.array(full), 0), False)
                self.qual[k] = 2
            elif len(part) >= 3 and self.qual[k] <= 1:
                self.world[k] = self.triangulate(k, np.median(np.array(part), 0), False)
                self.qual[k] = 1

    def target_world(self, k, pose=None):
        if k in self.world:
            return self.world[k]
        return pelvis_to_world(DEFAULT[k], self.home)

    def xd(self, p):
        return float(np.clip(STANDOFF + 0.3 * (p[2] - self.home[2]), 0.2, 0.36))

    def clip_station(self, g):
        rel = world_to_pelvis(np.r_[g, self.home[2]], self.home)
        rel[0] = np.clip(rel[0], -0.1, 0.4)
        rel[1] = np.clip(rel[1], -0.3, 0.3)
        return pelvis_to_world(rel, self.home)[:2]

    def clip_yaw(self, th, lim):
        return self.home[3] + np.clip(wrap(th - self.home[3]), -lim, lim)

    def station(self):
        red, green = self.target_world("red"), self.target_world("green")
        mid = 0.5 * (red + green)
        d = mid[:2] - self.home[:2]
        th_mid = self.clip_yaw(np.arctan2(d[1], d[0]), 0.5)
        xd = [self.xd(red), self.xd(green)]

        def res(v):
            st = np.array([v[0], v[1], self.home[2], v[2]])
            a = world_to_pelvis(red, st)
            b = world_to_pelvis(green, st)
            return [a[0] - xd[0], b[0] - xd[1], 0.7 * (a[1] + b[1]), 0.1 * (v[2] - th_mid)]

        g0 = mid[:2] - np.mean(xd) * np.array([np.cos(th_mid), np.sin(th_mid)])
        sol = least_squares(res, np.r_[g0, th_mid])
        th = self.clip_yaw(sol.x[2], STATION_YAW)
        if abs(wrap(th - sol.x[2])) > 1e-6:
            # heading was clipped: re-solve the position for the clipped heading
            def res2(v):
                return res([v[0], v[1], th])[:3]
            sol2 = least_squares(res2, sol.x[:2])
            return self.clip_station(sol2.x), th
        return self.clip_station(sol.x[:2]), th

    def solo_station(self, k):
        """Station where sphere k sits in front of its own arm, inside the head view."""
        P = self.target_world(k)
        s = 1 if k == "red" else -1
        xd = self.xd(P)
        d = P[:2] - self.home[:2]
        th = self.clip_yaw(np.arctan2(d[1], d[0]), 1.0)

        def res(v):
            st = np.array([v[0], v[1], self.home[2], v[2]])
            a = world_to_pelvis(P, st)
            return [a[0] - xd, a[1] - s * SOLO_Y, 0.05 * wrap(v[2] - th)]

        g0 = P[:2] - xd * np.array([np.cos(th), np.sin(th)])
        sol = least_squares(res, np.r_[g0, th])
        return self.clip_station(sol.x[:2]), self.clip_yaw(sol.x[2], 1.0)

    def viewpoint(self, k):
        P = self.target_world(k)
        d = P[:2] - self.home[:2]
        u = d / max(np.linalg.norm(d), 1e-6)
        g = self.clip_station(P[:2] - VIEW_DIST * u)
        yaw = self.clip_yaw(np.arctan2(P[1] - g[1], P[0] - g[0]), 1.0)
        return g, yaw

    def both_visible(self, g, th):
        st = np.array([g[0], g[1], self.home[2], th])
        return all(visible(world_to_pelvis(self.target_world(k), st), 0.3) for k in ("red", "green"))

    # ------------------------------------------------------------ planning
    def plan(self, tag, pose):
        if tag == "start":
            g, th = self.station()
            if self.both_visible(g, th) or not USE_SOLO:
                self.mode = "joint"
                self.pending = [k for k in ("red", "green") if self.qual[k] < 2]
                tag = "scan"
            else:
                self.mode = "solo"
                self.pending = ["red", "green"]
                tag = "solo"
        if tag == "scan":
            while self.pending:
                k = self.pending.pop(0)
                if self.qual[k] >= 2:
                    continue
                g, yaw = self.viewpoint(k)
                self.queue += [("goto", g, yaw), ("settle", 15), ("look", LOOK_N, "scan")]
                return
            g, th = self.station()
            self.queue += [("goto", g, th), ("settle", 20), ("look", LOOK_N, "reach")]
            return
        if tag == "solo":
            if self.pending:
                k = self.pending.pop(0)
                self.solo_est[k] = self.target_world(k).copy()
                g, th = self.solo_station(k)
                self.queue += [("goto", g, th), ("settle", 15), ("look", LOOK_N, "solo_" + k)]
                return
            g, th = self.station()
            self.queue += [("goto", g, th), ("settle", 15), ("look", LOOK_N, "reach")]
            return
        if tag.startswith("solo_"):
            k = tag[5:]
            # the look may have refined the estimate: re-station once if it moved a lot
            prev = self.solo_est.get(k)
            if prev is not None and np.linalg.norm(self.target_world(k) - prev) > 0.04:
                self.solo_est[k] = None
                g, th = self.solo_station(k)
                self.queue += [("goto", g, th), ("settle", 10), ("look", LOOK_N, tag)]
                return
            self.start_reach(pose, (ARM[k],), solo=True)
            return
        if tag == "reach":
            self.start_reach(pose, ("left", "right"))

    def start_reach(self, pose, arms, solo=False):
        self.qgoal = {}
        self.active = arms
        self.solo = solo
        for side in arms:
            k = SIDE[side]
            P = world_to_pelvis(self.target_world(k) + self.corr[k], pose)
            q, e = ik(P + BIAS[side], side)
            self.qgoal[side] = q
            self.log.append((side, P, q, e))
            self.srch[side] = dict(center=np.zeros(3), cur=np.zeros(3), idx=0, cnt=0, lit_t=-1, lost=0,
                                   q=q.copy(), nlit=0)
        self.qstart = {s: self.qcmd[s].copy() for s in ("left", "right")}
        self.phase = "reach"
        self.treach = None

    def lit(self, tools):
        im = tools.image("head")
        det = detect(im)
        return ({k: lit_count(im, k) >= 3 for k in ("red", "green")},
                {k: det[k] is not None and det[k]["area"] >= 8 for k in ("red", "green")})

    # ------------------------------------------------------------------ act
    def act(self, obs, tools):
        try:
            raw = self._act(obs, tools)
            self.last_raw = raw
            return raw
        except Exception:  # never crash an episode: hold the last command
            raw = getattr(self, "last_raw", None)
            if raw is None:
                raw = self.hold.copy()
            raw = np.array(raw, dtype=np.float64)
            raw[0] = raw[1] = raw[3] = 0.0
            return raw

    def _act(self, obs, tools):
        t = int(obs["t"])
        pose = self.pose(obs)
        self.last_obs = obs
        raw = self.hold.copy()
        raw[0] = raw[1] = raw[3] = 0.0
        raw[2] = 0.74
        if self.phase == "plan":
            if self.task is None and self.queue:
                self.task = list(self.queue.pop(0)) + [t]
                if self.task[0] == "look":
                    self.acc = {"red": ([], []), "green": ([], [])}
            task = self.task
            kind = task[0]
            if kind == "look":
                self.observe(obs, tools, self.acc)
                if t - task[-1] + 1 >= task[1]:
                    self.fuse(self.acc)
                    self.task = None
                    self.plan(task[2], pose)
            elif kind == "settle":
                if t - task[-1] >= task[1]:
                    self.task = None
            elif kind == "goto":
                g, th = task[1], task[2]
                err = world_to_pelvis(np.r_[g, pose[2]], pose)[:2]
                eth = wrap(th - pose[3])
                dist = np.linalg.norm(err)
                if (dist < 0.02 and abs(eth) < 0.04) or t - task[-1] > 250:
                    self.task = None
                else:
                    if dist >= 0.02:
                        v = err * 1.5
                        sp = np.linalg.norm(v)
                        v = v / max(sp, 1e-9) * np.clip(sp, 0.08, 0.25)
                        raw[0], raw[1] = v
                    w = np.clip(YAW_GAIN * eth, -YAW_MAX, YAW_MAX)
                    if abs(eth) >= 0.04 and abs(w) < 0.2:
                        w = 0.2 * np.sign(eth)
                    raw[3] = w
        elif self.phase == "reach":
            if self.treach is None:
                self.treach = t
            a = min(1.0, (t - self.treach) / 40.0)
            for side in ("left", "right"):
                goal = self.qgoal[side] if side in self.active else (TUCK if side == "left" else TUCK * MIR)
                self.qcmd[side] = (1 - a) * self.qstart[side] + a * goal
            if a >= 1.0:
                self.phase = "search"
                self.tsearch = t
        elif self.phase == "search":
            self.search_step(t, pose, tools)
        # integral action on the joint targets removes the gravity droop of the
        # position-controlled arms
        ld = obs["low_dim_obs"]
        for side, sl, qm in (("left", slice(4, 11), ld[0:7]), ("right", slice(11, 18), ld[9:16])):
            q = self.qcmd[side]
            if side in self.active and self.phase == "search":
                self.qint[side] = np.clip(self.qint[side] + KI * (q - qm), -0.35, 0.35)
            else:
                self.qint[side] *= 0.9
            lo, hi = limits(side)
            raw[sl] = np.clip(q + self.qint[side], lo, hi)
        return raw

    def search_step(self, t, pose, tools):
        lit, seen = self.lit(tools)
        if getattr(self, "debug", None) is not None:
            ld = self.last_obs["low_dim_obs"]
            for side, qm in (("left", ld[0:7]), ("right", ld[9:16])):
                k = SIDE[side]
                S = world_to_pelvis(self.target_world(k), pose)
                self.debug.append((t, side, fk(np.asarray(qm, float), side, TIP) - S, lit[k], seen[k]))
        for side in self.active:
            S = self.srch[side]
            k = SIDE[side]
            if lit[k]:
                S["lost"] = 0
                S["lit_t"] = t
                S["nlit"] += 1
                S["center"] = S["cur"]
                S["idx"] = 0
                S["cnt"] = 0
                continue
            S["lost"] += 1
            if S["lit_t"] >= 0 and S["lost"] < 12:
                continue  # recently lit: wait before searching again
            if not seen[k] and not self.solo:
                continue  # cannot observe this sphere: hold the calibrated target
            S["cnt"] += 1
            if S["cnt"] >= DWELL:
                S["cnt"] = 0
                S["idx"] = (S["idx"] + 1) % len(OFFSETS)
                P = world_to_pelvis(self.target_world(k) + self.corr[k], pose)
                off = S["center"] + offset_vec(P, OFFSETS[S["idx"]])
                S["cur"] = off
                q, e = ik(P + BIAS[side] + off, side, S["q"])
                S["q"] = q
                self.qcmd[side] = q
        if self.solo:
            side = self.active[0]
            S = self.srch[side]
            k = SIDE[side]
            done = S["nlit"] >= 6 or t - self.tsearch > SOLO_T
            if done:
                if S["nlit"] >= 6:
                    self.corr[k] = self.corr[k] + Rz(pose[3]) @ S["center"]
                self.log.append(("solo", k, S["nlit"], S["center"]))
                self.active = ()
                self.phase = "plan"
                self.qcmd[side] = TUCK.copy() if side == "left" else TUCK * MIR
                self.plan("solo", pose)
