"""Scripted policy for dishwasher_close: push both racks in, then lift the door closed.

The robot walks in front of the dishwasher (it sits on the +y side of the start pose),
pushes the lower and the upper rack in with both hands, backs off, squats, slides both
hands under the edge of the open door, lifts it and walks forward pressing it shut.

Arm targets are given as hand positions (forward from pelvis, world height) and turned
into shoulder-pitch / elbow angles with a planar two-link model; the base is closed-loop
on the pelvis pose from low_dim_obs. No learned components, no randomness.
"""

import numpy as np

L1, L2 = 0.197, 0.28
YAW = np.pi / 2


def ik(fwd, up):
    """Hand (fwd, up) relative to the shoulder in the torso frame -> (shoulder pitch, elbow, forearm angle)."""
    d = min(np.hypot(fwd, up), L1 + L2 - 1e-4)
    gam = np.arccos(np.clip((L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2), -1, 1))
    bend = np.pi - gam
    phi = np.arctan2(fwd, -up)
    alpha = np.arccos(np.clip((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1))
    t1 = phi - alpha
    return -t1, np.pi / 2 - bend, t1 + bend


def goto(lo, tx, ty, tyaw, vmax=0.3, kp=1.2, tol=0.02):
    """Body-frame velocity command towards a world pose; returns (vx, vy, wz, done)."""
    x, y, yaw = lo[21], lo[22], lo[24]
    dx, dy = tx - x, ty - y
    c, s = np.cos(yaw), np.sin(yaw)
    bx, by = c * dx + s * dy, -s * dx + c * dy
    eyaw = (tyaw - yaw + np.pi) % (2 * np.pi) - np.pi
    vx = np.clip(kp * bx, -vmax, vmax)
    vy = np.clip(kp * by, -vmax, vmax)
    sp = np.hypot(vx, vy)
    dist = np.hypot(bx, by)
    if dist < tol:
        vx = vy = 0.0
    elif sp < 0.07:
        vx, vy = vx / sp * 0.07, vy / sp * 0.07
    wz = np.clip(1.5 * eyaw, -0.6, 0.6)
    if abs(eyaw) < 0.02:
        wz = 0.0
    elif abs(wz) < 0.1:
        wz = 0.1 * np.sign(wz)
    return vx, vy, wz, (dist < tol and abs(eyaw) < 0.03)


# ---------------------------------------------------------------- the script
Z_LOW, Z_HIGH = 0.68, 0.86
CLOSED = [1.0, 1.0]


def _h(n, x, y=-0.60, **kw):
    return dict(x=x, y=y, yaw=YAW, vmax=0.2, kp=3.0, n=n, timeout=n, **kw)


def push(x, z, retract):
    """Both hands push a rack at height z while the base holds x; then retract without dragging it."""
    s = [dict(height=0.74, pitch=0.0, x=x, y=-0.66, yaw=YAW, timeout=400, n=10),
         dict(hwl=(0.15, 0.95), hwr=(0.15, 0.95), g=CLOSED, n=40),
         dict(height=0.58, pitch=0.6, hwl=(0.30, z + 0.25), hwr=(0.30, z + 0.25), n=50),
         dict(hwl=(0.30, z), hwr=(0.30, z), **_h(40, x))]
    for f in (0.4, 0.5, 0.6, 0.7):
        s.append(dict(hwl=(f, z), hwr=(f, z), **_h(70, x)))
    dz = 0.10 if retract == "up" else -0.10
    s.append(dict(hwl=(0.67, z + dz), hwr=(0.67, z + dz), **_h(50, x)))
    s.append(dict(hwl=(0.30, z + dz), hwr=(0.30, z + dz), **_h(50, x)))
    s.append(dict(hwl=(0.30, z + 0.25), hwr=(0.30, z + 0.25), n=40))
    return s


DX, DY = 0.33, -0.90
DOOR = [
    dict(height=0.74, pitch=0.0, L=[0.0] * 7, R=[0.0] * 7, g=[0.6, 0.6], x=DX, y=DY, yaw=YAW, timeout=400, n=20),
    dict(height=0.42, pitch=0.5, hwl=(0.25, 0.12), hwr=(0.25, 0.12), **_h(80, DX, DY)),
    dict(hwl=(0.45, 0.12), hwr=(0.45, 0.12), **_h(80, DX, DY)),
    dict(hwl=(0.45, 0.50), hwr=(0.45, 0.50), **_h(100, DX, DY)),
    dict(hwl=(0.48, 0.80), hwr=(0.48, 0.80), **_h(100, DX, DY)),
    dict(hwl=(0.52, 1.00), hwr=(0.52, 1.00), **_h(100, DX, DY)),
    dict(height=0.74, pitch=0.2, hwl=(0.52, 1.00), hwr=(0.52, 1.00), **_h(80, DX, DY)),
    dict(hwl=(0.52, 0.85), hwr=(0.52, 0.85), **_h(150, DX, -0.65)),
    dict(hwl=(0.55, 0.75), hwr=(0.55, 0.75), **_h(150, DX, -0.55)),
    dict(hwl=(0.60, 0.75), hwr=(0.60, 0.75), **_h(10 ** 6, DX, -0.55)),
]

SEQ = (push(0.36, Z_LOW, "up") + push(0.55, Z_LOW, "up")
       + push(0.40, Z_HIGH, "down") + push(0.55, Z_HIGH, "down") + DOOR)


class Policy:
    """Open-loop script over segments, closed-loop base and hand-height tracking."""

    def reset(self, obs, tools):
        self.prev = np.asarray(tools.hold_action(), dtype=np.float64)
        self.i = 0
        self.k = 0
        self.hw = {}

    def _target(self, g):
        a = self.prev.copy()
        if "height" in g:
            a[2] = g["height"]
        if "pitch" in g:
            a[4] = g["pitch"]
        if "L" in g:
            a[5:12] = g["L"]
        if "R" in g:
            a[12:19] = g["R"]
        if "g" in g:
            a[19:21] = g["g"]
        return a

    def act(self, obs, tools):
        lo = np.asarray(obs["low_dim_obs"], dtype=np.float64)
        g = SEQ[min(self.i, len(SEQ) - 1)]
        tgt = self._target(g)
        n = g.get("n", 1)
        self.k += 1
        al = min(1.0, self.k / max(1, n))
        a = self.prev + (tgt - self.prev) * al
        a[0] = a[1] = a[3] = 0.0
        for key, sl in (("hwl", slice(5, 12)), ("hwr", slice(12, 19))):
            if key in g:
                p0 = np.array(self.hw.get(key, g[key]))
                p1 = np.array(g[key])
                p = p0 + (p1 - p0) * al
                if self.k >= n:
                    self.hw[key] = tuple(p1)
                pw, pz = lo[2], lo[23]
                f = p[0] - 0.25 * np.sin(pw)
                u = (p[1] - pz) - (0.044 + 0.25 * np.cos(pw))
                ft = f * np.cos(pw) - u * np.sin(pw)
                ut = f * np.sin(pw) + u * np.cos(pw)
                sp, e, t2 = ik(ft, ut)
                w = t2 - np.pi / 2 - pw
                a[sl] = [sp, 0.0, 0.0, e, 0.0, float(np.clip(w, -1.6, 1.6)), 0.0]
                tgt[sl] = a[sl]
        if "x" in g:
            vx, vy, wz, done = goto(lo, g["x"], g["y"], g["yaw"], vmax=g.get("vmax", 0.3), kp=g.get("kp", 1.2))
            a[0], a[1], a[3] = vx, vy, wz
            fin = (done and self.k >= n) or self.k > g.get("timeout", 400)
        else:
            fin = self.k >= n
        if fin and self.i < len(SEQ) - 1:
            self.prev = tgt.copy()
            self.prev[0] = self.prev[1] = self.prev[3] = 0.0
            self.i += 1
            self.k = 0
        return a.astype(np.float32).tolist()
