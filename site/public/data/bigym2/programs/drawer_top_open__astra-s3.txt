"""Hand-written, deterministic controller for opening the upper drawer."""
import numpy as np


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)

    def act(self, obs, tools):
        t = obs['t']
        pos = obs['low_dim_obs'][18:22]
        action = self.hold.copy()
        action[:2] = 0
        action[2] = .74
        action[3] = np.clip(-3 * pos[3], -.4, .4)

        # Reach beneath the countertop, with the fingers straddling the handle.
        action[4:11] = [.4, 0, 0, 0, 1.57, 0, .3]
        action[11:18] = [-.7, 0, 0, 0, 0, 0, 0]
        action[18] = 0 if t < 270 else 1
        action[19] = 0

        if t < 310:
            # Close the loop on the measured base pose, including during grasp.
            error = np.array([.36, -.16]) - pos[:2]
            for j in range(2):
                if abs(error[j]) > .01:
                    action[j] = np.sign(error[j]) * max(
                        .065, min(.15, abs(error[j]) * 2)
                    )
        elif 330 <= t < 1100:
            # A slow pull maintains the pinch while the drawer slides outward.
            action[0] = -.08
        return action
