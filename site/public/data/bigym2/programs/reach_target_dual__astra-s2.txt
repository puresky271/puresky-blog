"""Deterministic, hand-written visual servo for simultaneous sphere touching.

Only RGB camera images and proprioception are used. Circle measurements are
computed geometrically from the current image; no learned model or stored
scene data is used. The head view initializes the approach, and the wrist
views close the arm-control loops. Bright target colors indicate contact.
"""
import numpy as np
import cv2

def sphere(im, side):
    """Measure a colored sphere silhouette, excluding clipped image edges."""
    f = im.astype(float)
    c = f[:, :, side]
    other = np.maximum(f[:, :, 2], f[:, :, 1 - side])
    m = ((c > 35) & (c > other * 1.65)).astype(np.uint8)
    contours, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        return None
    pts = max(contours, key=cv2.contourArea).reshape(-1, 2).astype(float)
    pts = pts[(pts[:, 0] > 1) & (pts[:, 0] < 82) & (pts[:, 1] > 1) & (pts[:, 1] < 82)]
    if len(pts) < 8:
        return None
    x, y = pts.T
    a = np.column_stack((2 * x, 2 * y, np.ones(len(x))))
    cx, cy, z = np.linalg.lstsq(a, x * x + y * y, rcond=None)[0]
    radius = np.sqrt(max(1, z + cx * cx + cy * cy))
    return np.array([cx, cy, radius])

class Policy:
    """Approach, visually align both hands, and hold each detected contact."""

    def reset(self, obs, tools):
        self.a = np.array(tools.hold_action())
        self.a[18:20] = 0
        self.a[4] = self.a[11] = -0.15
        self.last = [None, None]
        self.contact = [False, False]
        self.lateral = [0.3, -0.3]
        self.close = [False, False]
        self.recovery = [None, None]
        self.x0 = obs['low_dim_obs'][18]
        head = tools.image('head')
        self.approach = 0.065
        for side, off in enumerate([4, 11]):
            b = sphere(head, side)
            if b is not None:
                self.approach = max(self.approach, 0.065 + 2.0 * (1 / max(4.5, b[2]) - 1 / 7))
                self.lateral[side] = np.clip(((14 if side == 0 else 70) - b[0]) * 0.012, -0.35, 0.35)

    def act(self, obs, tools):
        t = obs['t']
        if t > 170 and t % 8 == 0:
            head = tools.image('head')
            for s, off in enumerate([4, 11]):
                im = tools.image(['left_wrist', 'right_wrist'][s])
                b = sphere(im, s)
                self.contact[s] = bool(((head[:, :, s] > 230) & (head[:, :, 1 - s] < 100)).sum() > 3 or ((im[:, :, s] > 230) & (im[:, :, 1 - s] < 100)).sum() > 8)
                self.last[s] = b
                if t >= 480 and self.recovery[s] is None and (b is None) and self.close[s] and (not self.contact[s]) and (self.a[off + 3] >= 1.55):
                    self.recovery[s] = (t, float(self.a[off] + 0.7 * (self.a[off + 3] - 0.6)))
                if self.recovery[s] is not None:
                    if not self.contact[s]:
                        start, center = self.recovery[s]
                        self.a[off + 3] = 0.6
                        self.a[off] = center + 0.18 * np.cos((t - start) * np.pi / 100)
                    continue
                colored = (im[:, :, s].astype(float) > 1.65 * np.maximum(im[:, :, 1 - s], im[:, :, 2])) & (im[:, :, s] > 35)
                if colored.sum() > 6600 or (colored.sum() > 4000 and (b is None or b[2] < 30)) or (self.close[s] and (b is None or b[2] < 20)):
                    b = np.array([42, 42, 100.0])
                if b is not None and b[2] > 55:
                    self.close[s] = True
                if b is None and (not self.contact[s]) and (not self.close[s]):
                    if t > 270:
                        self.a[off] = np.clip(self.a[off] + (0.035 if t < 400 else -0.05), -0.8, 0.3)
                    self.lateral[s] += 0.025 if s == 0 else -0.025
                    self.lateral[s] = np.clip(self.lateral[s], -0.8, 0.8)
                if b is not None and (not self.contact[s]):
                    u, v, r = b
                    self.a[off] += np.clip((v - 42) * 0.0015, -0.08, 0.08)
                    self.lateral[s] += np.clip((42 - u) * 0.0015, -0.06, 0.06)
                    if abs(v - 42) < 15 and abs(u - 42) < 15:
                        delta = min(0.05, 1.6 - self.a[off + 3])
                        self.a[off + 3] += delta
                        self.a[off] -= 0.7 * delta
                self.a[off + 3] = min(self.a[off + 3], 1.8)
        self.a[0] = 0.12 if t < 140 and obs['low_dim_obs'][18] < self.x0 + self.approach else 0
        for s, off in enumerate([4, 11]):
            lateral = self.lateral[s]
            if s == 0 and lateral >= 0 or (s == 1 and lateral <= 0):
                self.a[off + 1] = lateral
                self.a[off + 2] = 0
            else:
                self.a[off + 1] = 0
                self.a[off + 2] = lateral * 0.7
        return self.a
