"""Deterministic hand-written control for loading two mugs into the upper rack.

The controller uses color thresholds, connected components, and handle-opening
contours from the wrist cameras. Proprioception closes the navigation loop and
checks gripper closure. Arm targets interpolate during lifting and placement.
No learned components, external files, randomness, or clock inputs are used.
"""
import numpy as np
import cv2

def _near_handles(im, side=0):
    a = im.astype(np.int16)
    lo = a.min(2)
    hi = a.max(2)
    gray = (hi - lo < 18) & (lo > 70) & (hi < 225)
    near = cv2.boxFilter(gray.astype(np.float32), -1, (9, 9), normalize=False)
    m = (lo > 205) & (hi - lo < 18) & (near > 10)
    if True:
        contours, hierarchy = cv2.findContours(((hi - lo < 20) & (lo > 70)).astype('uint8'), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        holes = []
        if hierarchy is not None:
            for k, c in enumerate(contours):
                x, y, w, h = cv2.boundingRect(c)
                if hierarchy[0, k, 3] >= 0 and 10 < x < 72 and (y < 50) and (h > 12) and (h > w * 1.4) and (cv2.contourArea(c) > 12):
                    left = gray[y:y + h, max(0, x - 18):x].sum()
                    right = gray[y:y + h, x + w:min(84, x + w + 18)].sum()
                    hx = x + w + 1 if left > right else x - 2
                    holes.append((h / (1 + abs(hx - 42) * 0.025), np.array([hx, y + h * 0.5, w, h * 1.3, cv2.contourArea(c)])))
        if holes:
            return max(holes, key=lambda a: a[0])[1]
    if side:
        m = cv2.morphologyEx(m.astype('uint8'), cv2.MORPH_OPEN, np.ones((5, 2), np.uint8)) > 0
    m[:7] = False
    m[64:] = False
    m[:, :4] = False
    m[:, 80:] = False
    n, lab, st, ct = cv2.connectedComponentsWithStats(m.astype('uint8'))
    out = []
    for j in range(1, n):
        x, y, w, h, area = st[j]
        if area >= 7 and h >= 6 and (w < 40) and (h > w * 0.8):
            score = area * h / (w + 3) / (1 + abs(ct[j, 0] - 42) * 0.035)
            ys, xs = np.where(lab == j)
            lower = xs[ys > y + h * 0.5]
            hx = float(np.mean(lower)) if len(lower) > 2 else ct[j, 0]
            out.append((score, np.array([hx, ct[j, 1], w, h, area], float)))
    return max(out, key=lambda z: z[0])[1] if out else None

def mug_region(im):
    a = im.astype(np.int16)
    lo = a.min(2)
    hi = a.max(2)
    m = ((hi - lo < 18) & (lo > 80) & (hi < 225)).astype('uint8')
    m[64:] = 0
    n, lb, st, ct = cv2.connectedComponentsWithStats(m)
    cand = []
    for k in range(1, n):
        x, y, w, h, area = st[k]
        if area > 65 and h > 12 and (y < 45):
            cand.append((area / (1 + abs(ct[k, 0] - 42) * 0.02), (x, y, w, h)))
    return max(cand, key=lambda z: z[0])[1] if cand else None

class _NearPolicy:
    """Approach close mugs from the initial stance."""

    def reset(self, obs, tools):
        self.a = np.asarray(tools.hold_action(), float)
        self.a[19:] = 0
        self.state = 'raise'
        self.age = 0
        self.side = 0
        self.tries = 0
        self.cycles = 0
        self.target = self.a.copy()
        self.start = self.a.copy()
        self.initial = obs['low_dim_obs'][21:25].copy()
        self.navtarget = None
        self.held = [False, False]
        self.last_seen = None
        self.align = 0
        self.target[5:12] = [-1, 0, 0, -0.5, 0, 0, 0]
        self.target[12:19] = [-1, 0, 0, -0.5, 0, 0, 0]

    def enter(self, name):
        self.state = name
        self.age = 0
        self.start = self.a.copy()
        self.target = self.a.copy()
        self.target[:2] = 0
        self.target[3] = 0

    def arm(self, q):
        j = 5 + 7 * self.side
        self.target[j:j + 7] = q

    def nav(self, obs, tar, speed=0.2):
        p = obs['low_dim_obs'][21:25]
        e = np.asarray(tar[:2]) - p[:2]
        v = e * 2.5
        norm = np.linalg.norm(v)
        if np.linalg.norm(e) < 0.018:
            v *= 0
        elif norm < 0.065:
            v *= 0.065 / max(norm, 1e-06)
        elif norm > speed:
            v *= speed / norm
        c, s = (np.cos(p[3]), np.sin(p[3]))
        self.a[0] = c * v[0] + s * v[1]
        self.a[1] = -s * v[0] + c * v[1]
        self.a[3] = np.clip((tar[2] - p[3]) * 2, -0.5, 0.5)
        return np.linalg.norm(e) < 0.03 and abs(tar[2] - p[3]) < 0.06

    def act(self, obs, tools):
        self.age += 1
        p = obs['low_dim_obs']
        j = 5 + 7 * self.side
        g = 19 + self.side
        self.a[:2] = 0
        self.a[3] = 0
        st = self.state
        if st == 'raise':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 45)
            if self.age >= 75:
                self.enter('initial_settle')
        elif st == 'initial_settle':
            self.a = self.target.copy()
            if self.age >= 20:
                self.enter('prepare')
                self.arm([-1.1, 0.24, 0, 1.1, 0, -0.3, 0])
        elif st == 'prepare':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 40)
            if self.age >= 55:
                self.enter('align')
                self.align = 0
        elif st == 'align':
            self.a = self.target.copy()
            if self.age % 8 == 0:
                im = tools.image('left_wrist' if self.side == 0 else 'right_wrist')
                h = _near_handles(im, self.side)
                self.last_seen = h
                if h is not None:
                    ex = 42 - h[0]
                    ey = h[1] - 30
                    axis = j + 1 if self.side == 0 else j + 2
                    self.target[axis] = np.clip(self.target[axis] + np.clip(ex * 0.0015, -0.018, 0.018), -0.45, 0.65)
                    self.target[j + 6] = np.clip(self.target[j + 6] + np.clip(ex * 0.001, -0.012, 0.012), -0.35, 0.35)
                    self.target[j + 5] = np.clip(self.target[j + 5] + np.clip(ey * 0.0015, -0.018, 0.018), -1.3, 0.45)
                    if abs(ex) < 7 and abs(ey) < 11:
                        self.align += 1
                    else:
                        self.align = 0
                    if self.age > 35 and self.align >= 2:
                        if h[3] >= 34 or (self.side == 1 and self.cycles >= 1 and (h[3] >= 26)) or self.cycles >= 8:
                            self.enter('close')
                            self.target[g] = 1
                        else:
                            self.enter('approach')
                            self.navtarget = [float(p[21] + (0.055 if self.side == 0 else 0.075)), float(self.initial[1]), 0]
                            self.cycles += 1
                else:
                    box = mug_region(im)
                    if box is not None:
                        x, y, w, hb = box
                        axis = j + 1 if self.side == 0 else j + 2
                        if x < 5:
                            self.target[axis] = min(0.65, self.target[axis] + 0.025)
                            self.target[j + 6] = min(0.35, self.target[j + 6] + 0.015)
                        elif x + w > 79:
                            self.target[axis] = max(-0.45, self.target[axis] - 0.025)
                            self.target[j + 6] = max(-0.35, self.target[j + 6] - 0.015)
                        self.target[j + 5] = np.clip(self.target[j + 5] + np.clip((y + hb - 52) * 0.002, -0.022, 0.022), -1.3, 0.45)
            if self.age > 220:
                self.enter('close')
                self.target[g] = 1
        elif st == 'approach':
            self.a = self.target.copy()
            self.nav(obs, self.navtarget, 0.14 if self.side == 0 else 0.2)
            if self.age >= 80:
                self.enter('settle')
        elif st == 'settle':
            self.a = self.target.copy()
            if self.age >= 25:
                self.enter('align')
                self.align = 0
        elif st == 'close':
            self.a = self.target.copy()
            if self.age >= 25:
                inds = [10, 11] if self.side == 0 else [19, 20]
                if np.mean(p[inds]) > -0.0155:
                    self.held[self.side] = True
                    self.enter('lift')
                    delta = min(0.85, 2.05 - self.target[j + 3])
                    self.target[j] -= delta
                    self.target[j + 3] += delta
                    if self.side == 0:
                        self.target[j + 1] = 0.55
                        self.target[j + 6] = 0
                elif self.tries < 5:
                    self.tries += 1
                    self.enter('reopen')
                    self.target[g] = 0
                else:
                    self.enter('lift')
                    self.target[j] -= 0.55
                    self.target[j + 3] += 0.55
        elif st == 'reopen':
            self.a = self.target.copy()
            if self.age >= 15:
                self.enter('approach')
                self.navtarget = [float(p[21] + 0.06), float(self.initial[1]), 0]
                self.cycles += 1
        elif st == 'lift':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 65)
            if self.age >= 75:
                if self.side == 0:
                    self.side = 1
                    self.tries = 0
                    self.cycles = 0
                    self.enter('right_retreat')
                else:
                    self.enter('carry')
                    self.target[5:12] = [-1.8, 0.35, 0, 1.8, 0, -0.03, 0]
                    self.right_carry = self.target[12:19].copy()
        elif st == 'right_retreat':
            self.a = self.target.copy()
            if self.age >= 5:
                self.enter('right_settle')
        elif st == 'right_settle':
            self.a = self.target.copy()
            if self.age >= 10:
                self.enter('prepare')
                self.arm([-1.1, 0.1, 0, 1.5, 0, -1.0, 0])
        elif st == 'carry':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 50)
            if self.age >= 60:
                self.enter('to_rack')
        elif st == 'to_rack':
            self.a = self.target.copy()
            reached = self.nav(obs, [-0.055, -0.55, 0.65], 0.18)
            if reached and self.age > 90 or self.age > 200:
                self.side = 0
                self.enter('lower')
                self.target[5] = -1.0
                self.target[8] = 1.0
                self.target[2] = 0.67
        elif st == 'lower':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 80)
            if self.age >= 100:
                self.enter('release')
                self.target[g] = 0
        elif st == 'release':
            self.a = self.target.copy()
            if self.age >= 55:
                if self.side == 0:
                    self.enter('retract')
                    self.target[5] = -1.5
                    self.target[8] = -0.3
                    self.target[2] = 0.74
                else:
                    self.enter('done')
        elif st == 'retract':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 60)
            if self.age >= 65:
                self.side = 1
                self.enter('right_rack')
        elif st == 'right_rack':
            self.a = self.target.copy()
            reached = self.nav(obs, [-0.055, -0.5, 1.3], 0.15)
            if reached and self.age > 80 or self.age > 160:
                self.enter('lower')
                self.target[12] = -0.95
                self.target[15] = 1.35
                self.target[2] = 0.67
        else:
            self.a = self.target.copy()
        return self.a.copy()

def _far_handles(im, side=0):
    a = im.astype(np.int16)
    lo = a.min(2)
    hi = a.max(2)
    gray = (hi - lo < 18) & (lo > 70) & (hi < 225)
    near = cv2.boxFilter(gray.astype(np.float32), -1, (9, 9), normalize=False)
    m = (lo > 205) & (hi - lo < 18) & (near > 10)
    if side:
        contours, hierarchy = cv2.findContours(((hi - lo < 20) & (lo > 70)).astype('uint8'), cv2.RETR_CCOMP, cv2.CHAIN_APPROX_SIMPLE)
        holes = []
        if hierarchy is not None:
            for k, c in enumerate(contours):
                x, y, w, h = cv2.boundingRect(c)
                if hierarchy[0, k, 3] >= 0 and 10 < x < 72 and (y < 50) and (h > 12) and (h > w * 1.4) and (cv2.contourArea(c) > 12):
                    holes.append((h / (1 + abs(x - 42) * 0.025), np.array([x - 2, y + h * 0.5, w, h * 1.3, cv2.contourArea(c)])))
        if holes:
            return max(holes, key=lambda a: a[0])[1]
        m = cv2.morphologyEx(m.astype('uint8'), cv2.MORPH_OPEN, np.ones((5, 2), np.uint8)) > 0
    m[:7] = False
    m[64:] = False
    m[:, :4] = False
    m[:, 80:] = False
    n, lab, st, ct = cv2.connectedComponentsWithStats(m.astype('uint8'))
    out = []
    for j in range(1, n):
        x, y, w, h, area = st[j]
        if area >= 7 and h >= 6 and (w < 40) and (h > w * 0.8):
            score = area * h / (w + 3) / (1 + abs(ct[j, 0] - 42) * 0.035)
            ys, xs = np.where(lab == j)
            lower = xs[ys > y + h * 0.5]
            hx = float(np.mean(lower)) if len(lower) > 2 else ct[j, 0]
            out.append((score, np.array([hx, ct[j, 1], w, h, area], float)))
    return max(out, key=lambda z: z[0])[1] if out else None

class _FarPolicy:
    """Approach farther mugs with the wrists raised clear of the counter."""

    def reset(self, obs, tools):
        self.a = np.asarray(tools.hold_action(), float)
        self.a[19:] = 0
        self.state = 'raise'
        self.age = 0
        self.side = 0
        self.tries = 0
        self.cycles = 0
        self.target = self.a.copy()
        self.start = self.a.copy()
        self.initial = obs['low_dim_obs'][21:25].copy()
        self.navtarget = None
        self.held = [False, False]
        self.last_seen = None
        self.align = 0
        self.target[5:12] = [-1, 0, 0, -0.5, 0, 0, 0]
        self.target[12:19] = [-1, 0, 0, -0.5, 0, 0, 0]

    def enter(self, name):
        self.state = name
        self.age = 0
        self.start = self.a.copy()
        self.target = self.a.copy()
        self.target[:2] = 0
        self.target[3] = 0

    def arm(self, q):
        j = 5 + 7 * self.side
        self.target[j:j + 7] = q

    def nav(self, obs, tar, speed=0.2):
        p = obs['low_dim_obs'][21:25]
        e = np.asarray(tar[:2]) - p[:2]
        v = e * 2.5
        norm = np.linalg.norm(v)
        if np.linalg.norm(e) < 0.018:
            v *= 0
        elif norm < 0.065:
            v *= 0.065 / max(norm, 1e-06)
        elif norm > speed:
            v *= speed / norm
        c, s = (np.cos(p[3]), np.sin(p[3]))
        self.a[0] = c * v[0] + s * v[1]
        self.a[1] = -s * v[0] + c * v[1]
        self.a[3] = np.clip((tar[2] - p[3]) * 2, -0.5, 0.5)
        return np.linalg.norm(e) < 0.03 and abs(tar[2] - p[3]) < 0.06

    def act(self, obs, tools):
        self.age += 1
        p = obs['low_dim_obs']
        j = 5 + 7 * self.side
        g = 19 + self.side
        self.a[:2] = 0
        self.a[3] = 0
        st = self.state
        if st == 'raise':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 45)
            if self.age > 35:
                self.nav(obs, [0.02, float(self.initial[1]), 0], 0.16)
            if self.age >= 130:
                self.enter('initial_settle')
        elif st == 'initial_settle':
            self.a = self.target.copy()
            if self.age >= 35:
                self.enter('prepare')
                self.arm([-1.1, 0.24, 0, 1.1, 0, -0.3, 0])
        elif st == 'prepare':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 40)
            if self.age >= 60:
                self.enter('align')
                self.align = 0
        elif st == 'align':
            self.a = self.target.copy()
            if self.age % 8 == 0:
                im = tools.image('left_wrist' if self.side == 0 else 'right_wrist')
                h = _far_handles(im, self.side)
                self.last_seen = h
                if h is not None:
                    ex = 42 - h[0]
                    ey = h[1] - 30
                    axis = j + 1 if self.side == 0 else j + 2
                    self.target[axis] = np.clip(self.target[axis] + np.clip(ex * 0.0015, -0.018, 0.018), -0.45, 0.65)
                    self.target[j + 6] = np.clip(self.target[j + 6] + np.clip(ex * 0.001, -0.012, 0.012), -0.35, 0.35)
                    self.target[j + 5] = np.clip(self.target[j + 5] + np.clip(ey * 0.0015, -0.018, 0.018), -1.3, 0.45)
                    if abs(ex) < 7 and abs(ey) < 11:
                        self.align += 1
                    else:
                        self.align = 0
                    if self.age > 35 and self.align >= 2:
                        if h[3] >= 42 or (self.side == 1 and self.cycles >= 1 and (h[3] >= 26)) or self.cycles >= 8:
                            self.enter('close')
                            self.target[g] = 1
                        else:
                            self.enter('approach')
                            self.navtarget = [float(p[21] + (0.055 if self.side == 0 else 0.1)), float(p[22]), 0]
                            self.cycles += 1
                elif self.age > 40 and self.side == 1:
                    box = mug_region(im)
                    if box is not None:
                        x, y, w, hb = box
                        if x < 5:
                            self.target[j + 2] = min(0.65, self.target[j + 2] + 0.02)
                            self.target[j + 6] = min(0.35, self.target[j + 6] + 0.012)
                        elif x + w > 79:
                            self.target[j + 2] = max(-0.45, self.target[j + 2] - 0.02)
                            self.target[j + 6] = max(-0.35, self.target[j + 6] - 0.012)
                        self.target[j + 5] = np.clip(self.target[j + 5] + np.clip((y + hb - 52) * 0.002, -0.022, 0.022), -1.3, 0.6)
            if self.age > 220:
                self.enter('close')
                self.target[g] = 1
        elif st == 'approach':
            self.a = self.target.copy()
            self.nav(obs, self.navtarget, 0.14 if self.side == 0 else 0.2)
            if self.age >= 80:
                self.enter('settle')
        elif st == 'settle':
            self.a = self.target.copy()
            if self.age >= 25:
                self.enter('align')
                self.align = 0
        elif st == 'close':
            self.a = self.target.copy()
            if self.age >= 45:
                inds = [10, 11] if self.side == 0 else [19, 20]
                if np.mean(p[inds]) > -0.016:
                    self.held[self.side] = True
                    self.enter('lift')
                    delta = min(0.85, 2.05 - self.target[j + 3])
                    self.target[j] -= delta
                    self.target[j + 3] += delta
                    if self.side == 0:
                        self.target[j + 1] = 0.55
                        self.target[j + 6] = 0
                elif self.tries < 5:
                    self.tries += 1
                    self.enter('reopen')
                    self.target[g] = 0
                else:
                    self.enter('lift')
                    self.target[j] -= 0.55
                    self.target[j + 3] += 0.55
        elif st == 'reopen':
            self.a = self.target.copy()
            if self.age >= 30:
                self.enter('approach')
                self.navtarget = [float(p[21] + 0.06), float(p[22]), 0]
                self.cycles += 1
        elif st == 'lift':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 65)
            if self.age >= 90:
                if self.side == 0:
                    self.side = 1
                    self.tries = 0
                    self.cycles = 0
                    self.enter('right_retreat')
                else:
                    self.enter('carry')
                    self.target[5:12] = [-1.8, 0.35, 0, 1.8, 0, -0.03, 0]
                    self.right_carry = self.target[12:19].copy()
        elif st == 'right_retreat':
            self.a = self.target.copy()
            if self.age >= 20:
                self.enter('right_settle')
        elif st == 'right_settle':
            self.a = self.target.copy()
            if self.age >= 30:
                self.enter('prepare')
                self.arm([-1.1, 0.1, 0, 1.5, 0, -1.0, 0])
        elif st == 'carry':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 50)
            if self.age >= 60:
                self.enter('to_rack')
        elif st == 'to_rack':
            self.a = self.target.copy()
            reached = self.nav(obs, [-0.055, -0.55, 0.65], 0.18)
            if reached and self.age > 120 or self.age > 230:
                self.side = 0
                self.enter('lower')
                self.target[5] = -1.0
                self.target[8] = 1.0
                self.target[2] = 0.67
        elif st == 'lower':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 80)
            if self.age >= 100:
                self.enter('release')
                self.target[g] = 0
        elif st == 'release':
            self.a = self.target.copy()
            if self.age >= 55:
                if self.side == 0:
                    self.enter('retract')
                    self.target[5] = -1.5
                    self.target[8] = -0.3
                    self.target[2] = 0.74
                else:
                    self.enter('done')
        elif st == 'retract':
            self.a = self.start + (self.target - self.start) * min(1, self.age / 60)
            if self.age >= 65:
                self.side = 1
                self.enter('right_rack')
        elif st == 'right_rack':
            self.a = self.target.copy()
            reached = self.nav(obs, [-0.055, -0.5, 1.3], 0.15)
            if reached and self.age > 100 or self.age > 170:
                self.enter('lower')
                self.target[12] = -0.95
                self.target[15] = 1.35
                self.target[2] = 0.67
        else:
            self.a = self.target.copy()
        return self.a.copy()

class Policy:
    """Select the initial approach using the visible counter shadow."""

    def reset(self, obs, tools):
        im = tools.image('head').astype(np.float32)
        nearby = np.any(im[1:6, :45].mean(axis=2) < 190)
        self.control = _NearPolicy() if nearby else _FarPolicy()
        self.control.reset(obs, tools)

    def act(self, obs, tools):
        return self.control.act(obs, tools)

    def __getattr__(self, name):
        return getattr(self.control, name)
