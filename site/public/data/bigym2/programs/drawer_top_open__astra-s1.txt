"""Deterministic visual alignment and grasp/pull control for the top drawer."""

import cv2
import numpy as np


class Policy:
    def reset(self, obs, tools):
        self.a = np.asarray(tools.hold_action()).copy()
        # Turn the left gripper across the handle; tuck the unused arm away.
        self.a[4:11] = [.30, 0, -.40, 0, 1.57, -.3, 0]
        self.a[11:18] = [.6, 0, 0, .5, 0, 0, 0]
        self.a[18] = 0
        self.detected = None

    def detect(self, im):
        """Locate the dark handle in the rotated left wrist image."""
        gray = cv2.cvtColor(im, cv2.COLOR_RGB2GRAY)
        neutral = np.max(im, axis=2).astype(int) - np.min(im, axis=2) < 20
        mask = ((gray > 45) & (gray < 135) & neutral).astype('uint8')
        count, labels, stats, centers = cv2.connectedComponentsWithStats(mask)
        candidates = [
            i for i in range(1, count)
            if stats[i, 4] > 80 and stats[i, 3] > 25
            and stats[i, 2] > 3 and 15 < centers[i, 0] < 72
        ]
        if not candidates:
            return None
        handle = max(candidates, key=lambda i: stats[i, 4])
        rows = np.indices(labels.shape)[0]
        _, xs = np.where((labels == handle) & (rows >= 28) & (rows <= 52))
        return float(np.median(xs)) if len(xs) > 20 else float(centers[handle, 0])

    def act(self, obs, tools):
        t = obs['t']
        pelvis = obs['low_dim_obs'][18:22]

        # Successful episodes end automatically. A surviving episode gets a
        # second approach, with enough time left to grasp and pull again.
        retry = t >= 740
        if t == 740:
            self.a[4] = .30
        if retry:
            t = t - 740 + 160

        # Align after the walking transient has settled. With the wrist rolled,
        # the handle's horizontal image error corresponds to hand height.
        if 340 <= t < 450 and t % 5 == 0:
            x = self.detect(tools.image('left_wrist'))
            self.detected = x
            if x is not None:
                self.a[4] += np.clip((x - 41.5) * .0005, -.008, .008)

        action = self.a.copy()
        target_x = .43 if t < 570 else -.22
        delta = np.array([target_x - pelvis[0], -pelvis[1]])
        velocity = delta * 2
        if np.linalg.norm(velocity) < .06:
            velocity = (
                velocity / max(np.linalg.norm(velocity), 1e-6) * .06
                if np.linalg.norm(delta) > .008 else velocity * 0
            )
        speed = (.3 if retry else .13) if t < 570 else .4
        velocity = np.clip(velocity, -speed, speed)
        yaw = pelvis[3]
        action[0] = velocity[0] * np.cos(yaw) + velocity[1] * np.sin(yaw)
        action[1] = -velocity[0] * np.sin(yaw) + velocity[1] * np.cos(yaw)
        action[3] = np.clip(-yaw * 2, -.3, .3)

        # Settle, close, briefly advance to seat the grip, then pull backward.
        if 320 <= t < 570:
            action[:2] = 0
        if 490 <= t < 540:
            action[0] = .13
        if t >= 450:
            action[18] = 1
        return action
