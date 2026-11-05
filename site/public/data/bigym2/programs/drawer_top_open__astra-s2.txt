"""Hand-written, deterministic controller for opening the top drawer."""

import numpy as np


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=float)

    def act(self, obs, tools):
        t = obs["t"]
        body = obs["low_dim_obs"]
        action = self.hold.copy()

        # Extend the left hand with vertical finger closure around the handle.
        # Fold the unused right arm away from the cabinet.
        action[4:11] = [-0.115, 0, 0, 0.3, 1.57, 0, -0.195]
        action[11:18] = [0.3, 0, 0, 1, 0, 0, 0]
        action[18] = 0 if t < 350 else 1

        # Align, approach, allow the grasp to settle, then pull backward.
        target_x = 0.08 if t < 180 else (0.24 if t < 440 else -0.18)
        error = np.array([target_x, -0.15]) - body[18:20]
        velocity = np.clip(2 * error, -0.15, 0.15)
        velocity = np.where(
            (abs(velocity) < 0.06) & (abs(error) > 0.015),
            np.sign(velocity) * 0.06,
            velocity,
        )
        action[:2] = np.where(abs(error) < 0.015, 0, velocity)
        action[3] = np.clip(-3 * body[21], -0.4, 0.4)
        return action
