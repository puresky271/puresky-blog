"""Deterministic visual reaching controller for the G1.

Color segmentation supplies the sphere center, angular size, and visible
contact feedback. A coarse pinhole model guides the approach, followed by
height adjustment. High targets use a raised arm and image-based base servo.
All control constants are hand tuned; there are no learned components.
"""

import numpy as np
import cv2

# Perception uses only the on-robot RGB image.
def detect(im):
    r, g, b = im.astype(float).transpose(2, 0, 1)
    mask = ((r > 25) & (r > 1.6 * g) & (r > 1.6 * b)).astype('uint8')
    n, lab, stats, cent = cv2.connectedComponentsWithStats(mask)
    if n < 2:
        return None
    i = 1 + np.argmax(stats[1:, 4])
    ys, xs = np.where(lab == i)
    (x, y), rad = cv2.minEnclosingCircle(np.array([xs, ys]).T.astype('float32'))
    bright = np.sum(r[lab == i] > 230)
    return np.array([x, y, rad, bright], float)

def red(im):
    return detect(im)

class Policy:

    def reset(self, obs, tools):
        self.a = np.array(tools.hold_action())
        self.yaw = obs['low_dim_obs'][21]
        self.side = 1
        self.phase = 0
        self.start = 0
        self.height = 0.74
        self.contact = 0
        self.arm = np.zeros(7)
        self.seen = False
        self.highmode = False
        z = detect(tools.image('head'))
        if z is not None:
            self.side = 1 if z[0] > 42 else -1
            self.seen = True

    def act(self, obs, tools):
        a = self.a.copy()
        t = obs['t']
        q = obs['low_dim_obs']
        a[:4] = [0, 0, self.height, np.clip(2 * (self.yaw - q[21]), -0.4, 0.4)]
        idx = 11 if self.side == 1 else 4
        a[idx:idx + 7] = self.arm
        z = detect(tools.image('head'))
        if z is None:
            if self.phase == 0:
                a[0] = 0.12
            return a
        if not self.seen:
            self.side = 1 if z[0] > 42 else -1
            self.seen = True
        if z[1] < 5 and self.phase == 0:
            a[0] = 0.16
            return a
        # Hold long enough for sustained contact despite short occlusions.
        if z[3] > 8:
            self.contact = t
        if self.contact and t - self.contact < 65:
            return a
        if t > 250 and self.height > 0.84:
            self.highmode = True
        # Walk at normal pelvis height when using the raised-arm reach.
        if self.highmode:
            self.arm += np.clip(np.array([-1.2, 0, 0, 1.2, 0, 0, 0]) - self.arm, -0.015, 0.015)
            a[idx:idx + 7] = self.arm
            self.height = 0.74
            a[2] = 0.74
            ex = z[0] - (53 if self.side == 1 else 30)
            ey = 6 - z[1]
            if abs(ex) > 2:
                a[1] = -np.sign(ex) * np.clip(abs(ex) * 0.012, 0.06, 0.15)
            if abs(ey) > 2:
                a[0] = np.sign(ey) * np.clip(abs(ey) * 0.01, 0.06, 0.15)
            return a
        u = 67 if self.side == 1 else 16
        v = 43
        radius = 8.0
        # Approximate camera geometry is used as a feedback scale.
        dep = 55 * 0.04 / z[2]
        dep0 = 55 * 0.04 / radius
        vv = (z[1] - 41.5) * dep / 55
        vv0 = (v - 41.5) * dep0 / 55
        dx = 0.5 * (dep - dep0) - 0.866 * (vv - vv0)
        dz = -0.866 * (dep - dep0) - 0.5 * (vv - vv0)
        dy = -((z[0] - 41.5) * dep - (u - 41.5) * dep0) / 55
        if self.phase == 0:
            if abs(dx) > 0.012:
                a[0] = np.sign(dx) * np.clip(abs(dx) * 2, 0.06, 0.22)
            if abs(dy) > 0.012:
                a[1] = np.sign(dy) * np.clip(abs(dy) * 2, 0.06, 0.18)
            if abs(dx) < 0.018 and abs(dy) < 0.018 and (t > 70) or t > 300:
                self.phase = 1
                self.start = t
        else:
            if t % 10 == 0:
                self.height = np.clip(self.height + 0.4 * dz, 0.45, 0.87)
            a[2] = self.height
            if t > 230 and self.height > 0.84 or t > 460:
                l1 = 0.185
                l2 = 0.24
                zz = -(l1 + l2) + dz
                yy = dy
                roll = np.clip(np.arctan2(yy, -zz), -0.45, 0.45)
                zz = -np.hypot(zz, yy)
                cc = np.clip((dx * dx + zz * zz - l1 * l1 - l2 * l2) / (2 * l1 * l2), -0.95, 1)
                el = np.arccos(cc)
                pitch = np.arctan2(-dx, -zz) - np.arctan2(l2 * np.sin(el), l1 + l2 * np.cos(el))
                goal = np.array([pitch, roll, 0, el, 0, 0, 0])
                self.arm += np.clip(goal - self.arm, -0.015, 0.015)
                a[idx:idx + 7] = self.arm
        return a
