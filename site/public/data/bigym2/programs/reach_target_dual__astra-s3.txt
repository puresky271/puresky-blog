"""Deterministic visual feedback control for simultaneous two-hand reaching.

Only the three robot cameras and the supported action interface are used.
Sphere boundaries, hand silhouettes, and contact colors drive the controller;
there are no trained parameters, demonstrations, or seed-specific records.
"""

import numpy as np
import cv2
from itertools import combinations

def sphere(im, j, prior=None):
    """Recover a sphere silhouette, including arcs clipped by hands or borders."""
    m = (im[:, :, j] > im[:, :, 1 - j] * 1.8 + 25) & (im[:, :, j] > im[:, :, 2] * 1.8 + 25)
    y, x = np.where(m)
    if len(x) < 4:
        return (None, m)
    (cx, cy), r = cv2.minEnclosingCircle(np.array([x, y], np.float32).T)
    # Restrict geometric circle candidates to edges against the blue floor.
    floor = (im[:, :, 2] > im[:, :, 0] * 1.15) & (im[:, :, 2] > im[:, :, 1] * 1.12)
    edge = m & (cv2.dilate(floor.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0)
    edge[[0, -1], :] = False
    edge[:, [0, -1]] = False
    y, x = np.where(edge)
    pts = np.array([x, y], float).T
    if len(pts) >= 6:
        pts = pts[np.linspace(0, len(pts) - 1, min(20, len(pts))).astype(int)]
        # Fixed, deterministic triples define analytic circumcircles.
        tri = pts[np.array(list(combinations(range(len(pts)), 3)))]
        a = tri[:, 1] - tri[:, 0]
        b = tri[:, 2] - tri[:, 0]
        det = 2 * (a[:, 0] * b[:, 1] - a[:, 1] * b[:, 0])
        valid = abs(det) > 4
        a = a[valid]
        b = b[valid]
        tri = tri[valid]
        det = det[valid]
        aa = (a * a).sum(1)
        bb = (b * b).sum(1)
        c = tri[:, 0] + np.stack([(aa * b[:, 1] - bb * a[:, 1]) / det, (bb * a[:, 0] - aa * b[:, 0]) / det], 1)
        rad = np.linalg.norm(c - tri[:, 0], axis=1)
        valid = (rad > 4) & (rad < 17) & (c[:, 0] > -14) & (c[:, 0] < 98) & (c[:, 1] > -14) & (c[:, 1] < 98)
        c = c[valid]
        rad = rad[valid]
        if len(c):
            err = np.abs(np.linalg.norm(c[:, None, :] - pts[None, :, :], axis=2) - rad[:, None])
            score = np.minimum(err, 2).mean(1)
            if prior is not None:
                score += 0.04 * abs(rad - prior)
            k = score.argmin()
            cx, cy = c[k]
            r = rad[k] + 0.4
    return (np.array([cx, cy, r]), m)

class Policy:

    def reset(self, obs, tools):
        """Initialize a symmetric reach and independent arm search directions."""
        self.a = np.asarray(tools.hold_action(), float)
        self.a[4:11] = [-0.65, 0.05, 0, 0.6, 0, 0, 0]
        self.a[11:18] = [-0.65, -0.05, 0, 0.6, 0, 0, 0]
        self.centers = [None, None]
        self.rad = [0, 0]
        self.lit = [False, False]
        self.search = 0
        self.edir = [1, 1]

    def act(self, obs, tools):
        t = obs['t']
        a = self.a
        if t % 5 == 0:
            # Visual feedback runs at 10 Hz; joint commands are held between frames.
            im = tools.image('head').astype(float)
            for j in range(2):
                result, color = sphere(im, j, self.rad[j] or None)
                if result is not None:
                    self.centers[j] = result[:2]
                    self.rad[j] = result[2]
                self.lit[j] = bool(color.any() and np.sum(im[:, :, j][color] > 240) > 3)
                if result is None or (self.centers[j] is not None and (self.centers[j][0] < 2 or self.centers[j][0] > 81)):
                    wi = tools.image(['left_wrist', 'right_wrist'][j]).astype(float)
                    wm = (wi[:, :, j] > wi[:, :, 1 - j] * 1.8 + 25) & (wi[:, :, j] > wi[:, :, 2] * 1.8 + 25)
                    self.lit[j] = self.lit[j] or np.sum(wm & (wi[:, :, j] > 240)) > 3
                # Extrapolate the fingertip from the top of the white hand silhouette.
                white = (im.min(2) > 150) & (im.max(2) - im.min(2) < 55)
                white[:, 41:] = False if j == 0 else white[:, 41:]
                if j == 1:
                    white[:, :42] = False
                yy, xx = np.where(white & (np.indices((84, 84))[0] < 65))
                if len(xx) > 5 and self.centers[j] is not None:
                    y0 = np.percentile(yy, 4)
                    sel = (yy >= y0) & (yy < y0 + 9)
                    if not sel.any():
                        continue
                    xt = np.mean(xx[sel])
                    lo = (yy >= y0 + 9) & (yy < y0 + 19)
                    slope = (np.mean(xx[lo]) - xt) / 10 if lo.any() else 0
                    hand = np.array([xt - np.clip(slope * 3, -4, 4), y0 - 3])
                    err = self.centers[j] - hand
                    off = 4 + 7 * j
                    if t > 25 and (not self.lit[j]):
                        a[off] += np.clip(err[1] * 0.006, -0.045, 0.045)
                        a[off + 1] -= np.clip(err[0] * 0.008, -0.04, 0.04)
        if t > 50:
            if any(self.lit):
                self.search += 1
            for j in range(2):
                if not self.lit[j] and any(self.lit):
                    # Coordinate shoulder and elbow to vary depth at nearly fixed bearing.
                    a[7 + 7 * j] += 0.006 * self.edir[j]
                    a[4 + 7 * j] -= 0.0039 * self.edir[j]
                    if a[7 + 7 * j] > 1.65:
                        self.edir[j] = -1
                    if a[7 + 7 * j] < 0.2:
                        self.edir[j] = 1
            # Stop on contact; short approach pulses help the remaining hand reach.
            a[0] = 0.1 if t < 550 and (not any(self.lit) or (not all(self.lit) and self.search > 100 and (self.search % 100 < 40) and all((4 < c[0] < 79 for c in self.centers if c is not None)))) else 0
        return a.copy()
