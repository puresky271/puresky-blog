"""Deterministic, hand-written binocular reaching with wrist visual feedback.

The head view initializes the reach. Each wrist independently centers its
assigned color and regulates apparent sphere size. All gains and thresholds
are fixed control constants; there are no trained models or seed-specific data.
"""

import cv2
import numpy as np


def detect(image, color):
    """Return centroid, visible area and extent of the largest colored blob."""
    red, green, blue = image.astype(float).transpose(2, 0, 1)
    if color == 0:
        mask = (red > green * 1.6) & (red > blue * 1.6) & (red > 40)
    else:
        mask = (green > red * 1.5) & (green > blue * 1.3) & (green > 35)
    count, labels, stats, centers = cv2.connectedComponentsWithStats(
        mask.astype("uint8")
    )
    if count < 2:
        return None
    index = 1 + np.argmax(stats[1:, 4])
    x, y, width, height, area = stats[index]
    if area < 4:
        return None
    return np.array([*centers[index], area, width, height])


class Policy:
    def reset(self, obs, tools):
        self.a = np.asarray(tools.hold_action()).copy()
        self.a[18:] = 0  # Open fingers for the touch.
        image = tools.image("head")
        self.start = obs["low_dim_obs"][18:22].copy()
        for side in range(2):
            target = detect(image, side)
            joint = 4 + 7 * side
            self.a[joint] = (
                -0.25 if target is None
                else np.clip((target[1] - 40) * 0.007, -0.5, 0)
            )
            self.a[joint + 1] = 0.12 if side == 0 else -0.12
        self.ds = [None, None]
        self.close = False
        self.close_t = 0
        self.areas = [0., 0.]
        self.finish = [0, 0]
        self.reposition = 0
        self.repositioned = 0
        self.maxareas = [0., 0.]

    def act(self, obs, tools):
        t = obs["t"]

        # A widely separated pair of depths can exhaust one arm's reach.
        # Retract both arms and take one small step before resuming feedback.
        if (
            self.close and self.repositioned < 2 and t - self.close_t > (80 if self.repositioned else 100)
            and any(
                not self.finish[s] and self.a[7 + 7 * s] > 0.8
                and self.areas[s] < 5200
                for s in range(2)
            )
        ):
            self.repositioned += 1
            self.reposition = t + 50
            self.finish = [0, 0]
            for joint in (4, 11):
                self.a[joint + 3] -= 0.3
                self.a[joint] += 0.24
            self.close_t = t + 50
        if t < self.reposition:
            self.a[0] = 0.06
            return self.a

        # Allow the initial arm motion to settle; then update vision at 10 Hz.
        if t >= 40 and t % 5 == 0:
            for side, camera in enumerate(("left_wrist", "right_wrist")):
                target = detect(tools.image(camera), side)
                self.ds[side] = target
                joint = 4 + 7 * side

                # Near the sphere surface, clipping can remove the color from
                # the image. Avoid treating this as a distant target.
                if (
                    self.close and self.repositioned and self.maxareas[side] > 6000
                    and (target is None or target[2] < 3500)
                    and not self.finish[side]
                ):
                    self.finish[side] = 11
                if target is not None:
                    self.maxareas[side] = max(self.maxareas[side], target[2])

                if self.finish[side]:
                    # Finish with a short coordinated shoulder/elbow reach.
                    if self.finish[side] <= 10:
                        self.a[joint + 3] += 0.025
                        self.a[joint] -= 0.020
                    self.finish[side] += 1
                    # Correct residual drift after the final motion settles.
                    if (
                        self.finish[side] > 20 and target is not None
                        and 1500 < target[2] < 6500
                    ):
                        if abs(target[1] - 40) > 3:
                            self.a[joint] += np.clip(
                                (target[1] - 40) * 0.0006, -0.015, 0.015
                            )
                        if abs(target[0] - 41.5) > 3:
                            self.a[joint + 1] += np.clip(
                                (41.5 - target[0]) * 0.0006, -0.015, 0.015
                            )
                    if (
                        self.finish[side] > 20 and target is not None
                        and 4000 < target[2] < 6800
                        and abs(target[0] - 41.5) < 8
                        and abs(target[1] - 40) < 8
                    ):
                        advance = np.clip(0.04 * (np.sqrt(6800 / target[2]) - 1), 0, 0.008)
                        self.a[joint + 3] += advance
                        self.a[joint] -= 0.8 * advance
                    continue

                if target is not None:
                    self.areas[side] = target[2]
                    self.a[joint] += np.clip(
                        (target[1] - 40) * 0.001, -0.035, 0.035
                    )
                    # Roll handles outward motion. Use yaw for the remaining
                    # inward correction so the upper arm clears the torso.
                    delta = np.clip((41.5 - target[0]) * 0.001, -0.035, 0.035)
                    old_roll = self.a[joint + 1]
                    self.a[joint + 1] = np.clip(
                        old_roll + delta,
                        -0.08 if side == 0 else -0.9,
                        0.9 if side == 0 else 0.08,
                    )
                    self.a[joint + 2] += delta - (self.a[joint + 1] - old_roll)

                    if self.close:
                        if (
                            t - self.close_t > 100 and target[2] > 5800
                            and abs(target[0] - 41.5) < 5
                            and abs(target[1] - 40) < 5
                        ):
                            self.finish[side] = 1
                        # Apparent radius scales inversely with distance.
                        delta_elbow = np.clip(
                            0.08 * (np.sqrt(6000 / target[2]) - 1), -0.015, 0.025
                        )
                        if target[2] > 6500:
                            delta_elbow = 0
                        new_elbow = np.clip(
                            self.a[joint + 3] + delta_elbow, -0.7, 1.7
                        )
                        self.a[joint] -= 0.8 * (new_elbow - self.a[joint + 3])
                        self.a[joint + 3] = new_elbow

        if max(self.areas) > 3300 and not self.close:
            self.close = True
            self.close_t = t
        self.a[0] = 0.06 if t > 80 and not self.close else 0
        self.a[3] = np.clip(
            -2 * (obs["low_dim_obs"][21] - self.start[3]), -0.2, 0.2
        )
        return self.a
