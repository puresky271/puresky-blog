"""Hand-written, deterministic bimanual box transfer.

Colour segmentation supplies a small approach correction and distinguishes
narrow presentations of the box. Smooth joint targets squeeze the box between
the hands; measured pelvis position closes the walking loop. Counter contact
is handled by increasing clearance if forward motion stalls.
"""

import numpy as np
import cv2

class Policy:

    def reset(self, obs, tools):
        self.a = np.asarray(tools.hold_action(), dtype=float)
        self.a[19:] = 0
        self.i = 0
        self.k = 0
        self.start = self.a.copy()
        self.adjusted = False
        self.clearance = -1.25
        self.last_x = None
        self.offset = 0
        self.stages = [('move', (-0.07, -1.0), 400), ('wait', {}, 30), ('pose', {6: 0.35, 13: -0.35}, 60), ('move', (0.4, -1.0), 400), ('wait', {}, 30), ('pose', {2: 0.55, 5: -0.6, 12: -0.6, 8: 0.8, 15: 0.8}, 100), ('pose', {6: 0, 13: 0, 7: -0.25, 14: 0.25}, 80), ('wait', {}, 50), ('pose', {2: 0.74}, 150), ('move', (-0.18, -1.0), 400), ('wait', {}, 30), ('pose', {2: 0.78, 5: -1.25, 12: -1.25, 10: 0.65, 17: 0.65}, 200), ('move', (-0.18, 0), 400), ('wait', {}, 30), ('move', (0.32, 0), 400), ('wait', {}, 30), ('pose', {5: -1.1, 12: -1.1, 10: 0.3, 17: 0.3}, 150), ('pose', {6: 0.4, 13: -0.4, 7: 0, 14: 0}, 100), ('wait', {}, 1000)]

    def act(self, obs, tools):
        if self.i == 5 and (not self.adjusted):
            self.adjusted = True
            im = tools.image('head')
            hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV)
            mask = ((hsv[:, :, 0] > 10) & (hsv[:, :, 0] < 40) & (hsv[:, :, 1] > 60) & (hsv[:, :, 2] < 225)).astype(np.uint8)
            n, labels, stats, centers = cv2.connectedComponentsWithStats(mask)
            if n > 1:
                x, y, w, h, area = stats[1 + np.argmax(stats[1:, 4])]
                if area > 30:
                    narrow = w < 25
                    if narrow or y + h <= 67:
                        self.stages[5][1][2] = 0.65
                        self.clearance = -1.6
                        self.stages[11][1].update({5: -1.6, 12: -1.6, 10: 1.0, 17: 1.0})
                    if narrow:
                        self.stages[6][1].update({6: -0.12, 13: 0.12, 7: -0.35, 14: 0.35})
                    p = obs['low_dim_obs'][21:25]
                    goal = (float(p[0] + np.clip(0.007 * (70 - y - h), -0.06, 0.06)), float(p[1] - np.clip(0.006 * (x + w / 2 - 42), -0.06, 0.06)))
                    if np.linalg.norm(np.array(goal) - p[:2]) > 0.025:
                        self.offset = 2
                        self.stages.insert(5, ('move', goal, 160))
                        self.stages.insert(6, ('wait', {}, 30))
        typ, val, duration = self.stages[self.i]
        self.a[:2] = 0
        self.a[3] = 0
        if typ == 'move':
            p = obs['low_dim_obs'][21:25]
            err = np.array(val) - p[:2]
            c, s = (np.cos(p[3]), np.sin(p[3]))
            v = np.array([[c, s], [-s, c]]) @ err * 1.6
            self.a[:2] = np.clip(v, -0.3, 0.3)
            self.a[3] = np.clip(-2 * p[3], -0.5, 0.5)
            if np.linalg.norm(err) < 0.025:
                self.k = duration
                self.a[:2] = 0
                self.a[3] = 0
        elif typ == 'pose':
            f = min(1, (self.k + 1) / (duration * 0.7))
            for j, v in val.items():
                self.a[j] = self.start[j] + (v - self.start[j]) * f
        elif typ == 'back':
            self.a[0] = -0.15
        if self.i == 14 + self.offset:
            if self.k % 50 == 0:
                x = float(obs['low_dim_obs'][21])
                if self.last_x is not None and x - self.last_x < 0.02 and (x < 0.27):
                    self.clearance = max(-1.85, self.clearance - 0.08)
                self.last_x = x
            self.a[5] = self.a[12] = self.clearance
            self.a[10] = self.a[17] = -self.clearance - 0.6
        if self.i == 16 + self.offset:
            f = min(1, (self.k + 1) / (duration * 0.7))
            self.a[5] = self.a[12] = self.clearance + 0.15 * f
            self.a[10] = self.a[17] = -self.clearance - 0.6 - 0.15 * f
        self.k += 1
        if self.k >= duration and self.i < len(self.stages) - 1:
            self.i += 1
            self.k = 0
            self.start = self.a.copy()
        return self.a.copy()
