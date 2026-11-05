"""Deterministic, camera-guided plate transfer with hand-tuned motions.

Pick the plates in succession with opposite hands, carry both above the rack,
then converge the hands while lowering. Perception uses only color and connected
components. All motion timing is in control steps.
"""

import numpy as np
import cv2
from scipy.spatial.transform import Rotation as R

class Policy:

    def reset(self, o, tools):
        self.a = np.array(tools.hold_action(), float)
        self.a[19:] = 0
        self.phase = 0
        self.tick = 0
        self.arrived = False
        # Steps, base x/y, shoulders, wrist pitches, and gripper commands.
        self.plan = [
            (150, -0.04, 0.33, 0, 0, 0, 0, 0, 0),
            (100, 0.14, 0.33, 0, -0.2, 0, 0, 0, 0),
            (45, 0.14, 0.33, 0, -0.2, 0, 0, 0, 1),
            (100, 0.04, 0.33, 0, -1.15, 0, 0.95, 0, 1),
            (220, 0.06, 0.02, 0, -1.15, 0, 0.95, 0, 1),
            (100, 0.14, 0.02, -0.2, -1.15, 0, 0.95, 0, 1),
            (45, 0.14, 0.02, -0.2, -1.15, 0, 0.95, 1, 1),
            (100, 0.04, 0.02, -1.15, -1.15, 0.95, 0.95, 1, 1),
            (190, 0.04, -0.29, -1.15, -1.15, 0.95, 0.95, 1, 1),
            (120, 0.13, -0.29, -1.15, -1.15, 0.95, 0.95, 1, 1),
            (250, 0.13, -0.29, -0.05, -0.05, -0.15, -0.15, 1, 1),
            (100, 0.13, -0.29, -0.05, -0.05, -0.15, -0.15, 0, 0),
            (120, -0.1, -0.29, -0.2, -0.2, 0, 0, 0, 0)
        ]
        # Coarse scene offsets from ceramic edges and the wooden rack rails.
        im = tools.image('head').astype(float)
        r, g, b = im.transpose(2, 0, 1)
        gray = (abs(r - g) < 3) & (abs(r - b) < 3) & (r > 65)
        gray[26:] = False
        gray[:, 45:] = False
        _, _, st, _ = cv2.connectedComponentsWithStats(gray.astype('uint8'))
        st = [v for v in st[1:] if v[4] > 15 and v[3] > 8]
        edge = max([v[0] + v[2] - 1 for v in st], default=23)
        brown = (r > g * 1.18) & (g > b * 1.15) & (r > 70)
        brown[40:] = False
        sy, sx = np.where(brown[:, :42])
        dy, dx = np.where(brown[:, 42:])
        dx = dx + 42
        source_x = np.clip((19 - np.percentile(sy, 95)) * 0.015, -0.15, 0.15) if len(sy) > 10 else 0
        source_y = np.clip((23 - edge) / 140, -0.2, 0.2)
        dest_x = np.clip((21 - np.percentile(dy, 95)) * 0.015, -0.15, 0.15) if len(dy) > 10 else 0
        dest_y = np.clip((58 - np.min(dx)) / 140, -0.2, 0.2) if len(dx) > 10 else 0
        self.offsets = (source_x, source_y, dest_x, dest_y)
        self.dest_samples = []
        self.plan = [(v[0], v[1] + (source_x if i < 8 else dest_x), v[2] + (source_y if i < 8 else dest_y), *v[3:]) for i, v in enumerate(self.plan)]

    def act(self, o, tools):
        # Reobserve the remaining plate after the first hand has cleared it.
        if self.phase == 4 and self.tick == 140:
            im = tools.image('head').astype(float)
            rr, gg, bb = im.transpose(2, 0, 1)
            mask = (abs(rr - gg) < 3) & (abs(rr - bb) < 3) & (rr > 65)
            mask[:, 32:] = False
            mask[30:] = False
            _, _, st, cen = cv2.connectedComponentsWithStats(mask.astype('uint8'))
            ids = [i for i in range(1, len(st)) if st[i, 4] > 25 and st[i, 3] > 10 and (st[i, 1] < 10)]
            if ids:
                i = max(ids, key=lambda i: st[i, 4])
                cx = cen[i, 0]
                yy = float(o['low_dim_obs'][22]) + (14 - cx) / 140 + 0.025
                for k in range(4, 8):
                    v = self.plan[k]
                    self.plan[k] = (v[0], v[1], yy, *v[3:])
                self.arrived = False
        # Average the destination rail geometry over several gait frames.
        if self.phase == 8 and self.tick >= 140 and (self.tick % 5 == 0):
            im = tools.image('head').astype(float)
            rr, gg, bb = im.transpose(2, 0, 1)
            mask = (rr > gg * 1.18) & (gg > bb * 1.15) & (rr > 70)
            mask[55:] = False
            mask[:, :10] = False
            mask[:, 76:] = False
            ys, xs = np.where(mask)
            if len(xs) > 35:
                front = np.percentile(ys, 95)
                xx = xs[ys >= front - 2]
                if len(xx) > 8 and np.ptp(xx) > 20:
                    center = (np.min(xx) + np.max(xx)) / 2
                    pp = o['low_dim_obs'][21:25]
                    self.dest_samples.append((pp[0] + (27 - front) / 100 + 0.113, pp[1] + (42 - center) / 150 - 0.005))
        if self.phase == 9 and self.tick == 0 and self.dest_samples:
            dx, dy = np.median(self.dest_samples, axis=0)
            for k in range(9, 13):
                v = self.plan[k]
                self.plan[k] = (v[0], float(dx) if k < 12 else float(dx) - 0.23, float(dy), *v[3:])
        # Close the base loop in world coordinates, then command body velocities.
        n, x, y, sl, sr, wl, wr, gl, gr = self.plan[self.phase]
        q = o['low_dim_obs']
        p = q[21:25]
        e = np.array([x, y]) - p[:2]
        v = np.clip(2 * e, -0.25, 0.25)
        if np.linalg.norm(e) < 0.023:
            self.arrived = True
        if self.arrived or self.phase in (2, 3, 6, 7, 10, 11):
            v[:] = 0
        elif 0 < np.linalg.norm(v) < 0.065:
            v *= 0.065 / np.linalg.norm(v)
        c = np.cos(p[3])
        ss = np.sin(p[3])
        self.a[:2] = [c * v[0] + ss * v[1], -ss * v[0] + c * v[1]]
        self.a[3] = np.clip(-3 * p[3], -0.5, 0.5)
        # Bring the plates inward only while lowering, avoiding hand collisions.
        f = np.clip((self.a[5] + 1.15) / 1.1, 0, 1) if self.phase >= 10 else 0
        yl = -0.32 * f
        yr = -0.06 + 0.3 * f
        targ = np.array([sl, 0, yl, 0, 0, wl, -yl, sr, 0, yr, 0, 0, wr, -yr])
        if self.phase >= 10:
            targ[4:7] = (R.from_euler('YZ', [sl, yl]).inv() * R.from_euler('Y', -0.2)).as_euler('XYZ')
            targ[11:14] = (R.from_euler('YZ', [sr, yr]).inv() * R.from_euler('Y', -0.2)).as_euler('XYZ')
        self.a[5:19] += np.clip(targ - self.a[5:19], -0.012, 0.012)
        self.a[19:] = [gl, gr]
        self.tick += 1
        if self.tick >= n and self.phase < len(self.plan) - 1:
            self.tick = 0
            self.phase += 1
            self.arrived = False
        return self.a.copy()
