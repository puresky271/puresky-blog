"""Deterministic, handwritten plate-transfer controller.

Uses onboard RGB images and the robot's joint and pelvis observations only.
No demonstration files, trained components, or seed-specific state are needed.
"""
import numpy as np
from scipy.spatial.transform import Rotation as R

def wrist_for(q, sp):
    rot = R.from_euler('YXZ', q[:3]) * R.from_euler('Y', q[3]) * R.from_euler('XYZ', q[4:7])
    before = R.from_euler('YXZ', [sp, q[1], q[2]]) * R.from_euler('Y', q[3])
    out = q.copy()
    out[0] = sp
    out[4:7] = (before.inv() * rot).as_euler('XYZ')
    return out

def rim(im, lo=25, hi=60):
    im = im.astype(float)
    mask = (im.min(2) > 230) & (im.max(2) - im.min(2) < 15)
    ys, xs = np.where(mask[lo:hi, 5:79])
    if len(xs) < 8:
        return None
    return float(np.median(xs + 5))

def brown(im):
    a = im.astype(float)
    r, g, b = (a[:, :, 0], a[:, :, 1], a[:, :, 2])
    m = (r > g + 12) & (g > b + 8) & (r > 70)
    m[65:] = False
    return m

def project(u, v):
    n = (v - 42) / 60.0
    den = 0.8660254 + 0.5 * n
    return np.array([0.35 * (0.5 - 0.8660254 * n) / den, -(u - 42) * 0.35 / (60 * den)])

class NominalPolicy:

    def reset(self, obs, tools):
        self.a = np.array(tools.hold_action(), float)
        self.a[18] = 0
        self.q = np.array([-0.3, 0.1, 0.55, 0, -0.1, 0.15, -0.55])
        self.start = self.a[4:11].copy()
        im = tools.image('head')
        m = brown(im)
        ys, xs = np.where(m[:, :40])
        v = float(np.max(ys)) if len(ys) else 18
        dx = float(np.clip(project(24, v)[0] - project(24, 18)[0], -0.1, 0.1))
        im = tools.image('left_wrist').astype(float)
        yy, xx = np.where((im[:20].min(2) > 200) & (np.ptp(im[:20], axis=2) < 12))
        pu = float(np.median(xx)) if len(xx) else -25.0
        dy = float(np.clip((21 - pu) * 0.0035, -0.12, 0.16))
        im = tools.image('head')[:28, :38].astype(float)
        yy, xx = np.where((im.min(2) > 200) & (np.ptp(im, axis=2) < 12))
        if len(xx):
            dy = max(dy, float(np.clip((13 - float(np.median(xx))) * 0.007, -0.12, 0.16)))
        self.pick = np.array([0.18 + dx, dy, 0.0])
        self.dest = np.array([0.1 + dx, dy - 0.45, 0.0])
        self.corner = np.array([34.0, 42.0])
        self.touch_sp = None
        self.touch_t = None
        self.touch_count = 0
        self.extra_depth = 0.0

    def base(self, a, obs, target, speed=0.16):
        b = obs['low_dim_obs'][18:22]
        d = np.array(target[:2]) - b[:2]
        v = np.clip(2 * d, -speed, speed)
        v[np.abs(d) < 0.012] = 0
        n = np.linalg.norm(v)
        if 0 < n < 0.075:
            v *= 0.075 / n
        a[0] = np.cos(b[3]) * v[0] + np.sin(b[3]) * v[1]
        a[1] = -np.sin(b[3]) * v[0] + np.cos(b[3]) * v[1]
        a[3] = np.clip(3 * (target[2] - b[3]), -0.4, 0.4)

    def servo(self, tools, gain=0.0008):
        u = rim(tools.image('left_wrist'))
        if u is not None:
            self.q[2] = np.clip(self.q[2] + np.clip((42 - u) * gain, -0.02, 0.02), 0.15, 0.95)
            self.q[6] = -self.q[2]

    def act(self, obs, tools):
        t = obs['t']
        a = self.a.copy()
        a[:2] = 0
        a[3] = 0
        a[14] = 0.8 * min(1, t / 100)
        if t < 180:
            a[4:11] = self.start + (self.q - self.start) * min(1, t / 100)
            target = self.pick.copy()
            target[0] -= 0.08
            self.base(a, obs, target)
        elif t < 290:
            if t % 10 == 0:
                self.servo(tools)
            a[4:11] = self.q
        elif t < 430:
            if t == 290:
                self.extra_depth = 0.025 if self.q[2] > 0.65 else 0.0
            if t % 10 == 0:
                self.servo(tools, 0.0005)
            a[4:11] = self.q
            target = self.pick.copy()
            target[0] -= 0.08
            target[0] += (0.08 + self.extra_depth) * (t - 290) / 140
            self.base(a, obs, target, 0.08)
        elif t < 470:
            if t % 10 == 0:
                self.servo(tools, 0.0005)
            a[4:11] = self.q
        elif t < 530:
            a[4:11] = self.q
            a[18] = min(1, (t - 470) / 40)
            if t == 520:
                m = brown(tools.image('head'))
                cols = np.where(m.any(0))[0]
                if len(cols) > 4:
                    gaps = np.diff(cols)
                    k = int(np.argmax(gaps))
                    end = int(cols[k]) + 1 if gaps[k] > 8 else min(50, int(cols[-1]) + 1)
                    yy, xx = np.where(m[:, :end])
                    if len(xx) > 12:
                        self.corner = np.array([float(xx.max()), float(yy.max()) - 2])
                self.dest[2] = float(obs['low_dim_obs'][21])
        elif t < 710:
            a[4:11] = wrist_for(self.q, -0.3 - 0.65 * min(1, (t - 530) / 160))
            a[18] = 1
        elif t < 1210:
            a[4:11] = wrist_for(self.q, -0.95)
            a[18] = 1
            if t % 20 == 0 and obs['low_dim_obs'][19] < self.pick[1] - 0.19:
                m = brown(tools.image('head'))
                yy, xx = np.where(m)
                if len(xx) > 30:
                    u = float(xx.max())
                    yy2, xx2 = np.where(m[:, max(0, int(u) - 42):])
                    v = float(yy2.max())
                    if u < 80:
                        delta = project(u, v) - project(*self.corner)
                        b = obs['low_dim_obs'][18:22]
                        self.dest[:2] = 0.75 * self.dest[:2] + 0.25 * (b[:2] + np.clip(delta, -0.08, 0.08))
            self.base(a, obs, self.dest, 0.09)
        elif t < 1390:
            sp = -0.95 + 0.65 * min(1, (t - 1210) / 160)
            a[4:11] = wrist_for(self.q, sp)
            a[18] = 1
            qobs = obs['low_dim_obs']
            if t > 1270 and qobs[3] < 0.017 and (qobs[5] - a[9] < 0.024):
                self.touch_count += 1
            else:
                self.touch_count = 0
            if self.touch_count >= 5 and self.touch_sp is None:
                self.touch_sp = sp
                self.touch_t = t
        elif t < 1460:
            a[4:11] = wrist_for(self.q, -0.3)
            a[18] = max(0, 1 - (t - 1390) / 40)
        else:
            a[4:11] = wrist_for(self.q, -0.3 - 0.4 * min(1, (t - 1460) / 120))
            a[18] = 0
        if self.touch_sp is not None and t >= self.touch_t:
            elapsed = t - self.touch_t
            a[4:11] = wrist_for(self.q, self.touch_sp - 0.4 * np.clip((elapsed - 75) / 110, 0, 1))
            a[18] = np.clip(1 - (elapsed - 10) / 40, 0, 1)
        return a

# Retry shallow pinches, then place near the center of the destination rack.
class Policy(NominalPolicy):

    def reset(self, obs, tools):
        super().reset(obs, tools)
        self.delay = 0
        self.recovered = False
        self.recover_start = None

    def act(self, obs, tools):
        local = dict(obs)
        local['t'] = obs['t'] - self.delay
        if local['t'] == 525 and (not self.recovered):
            fingers = obs['low_dim_obs'][7:9]
            if np.max(fingers) < 0.004 or np.sum(fingers) < -0.023:
                self.recovered = True
                self.recover_start = obs['t']
                self.recover_action = super().act(local, tools)
                b = obs['low_dim_obs'][18:22]
                self.recover_target = np.array([b[0] + 0.035, b[1], b[3]])
        if self.recover_start is not None:
            elapsed = obs['t'] - self.recover_start
            a = self.recover_action.copy()
            a[0] = a[1] = a[3] = 0.0
            a[18] = float(np.clip((elapsed - 60) / 25, 0, 1))
            if 10 <= elapsed < 60:
                self.base(a, obs, self.recover_target, 0.09)
            if elapsed >= 100:
                m = brown(tools.image('head'))
                cols = np.where(m.any(0))[0]
                if len(cols) > 4:
                    gaps = np.diff(cols)
                    k = int(np.argmax(gaps))
                    end = int(cols[k]) + 1 if gaps[k] > 8 else min(50, int(cols[-1]) + 1)
                    yy, xx = np.where(m[:, :end])
                    if len(xx) > 12:
                        self.corner = np.array([float(xx.max()), float(yy.max()) - 2])
                self.dest[2] = float(obs['low_dim_obs'][21])
                self.delay += 80
                self.recover_start = None
            return a
        a = super().act(local, tools)
        if local['t'] >= 520:
            self.corner = np.array([34.0 - 25.0 * (self.q[2] - 0.39), 42.0])
            self.dest[2] = 0.0
        return a
