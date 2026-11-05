"""Deterministic two-handed drawer push."""
import numpy as np

class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)

    def act(self, obs, tools):
        t = obs['t']
        state = obs['low_dim_obs']
        a = self.hold.copy()
        # Open fingers provide a broad contact surface on the drawer front.
        a[18:] = 0
        # Clear the drawer rim, lower both hands, then advance and settle.
        a[0] = -.2 if t < 80 else (.15 if 160 < t < 700 else 0)
        a[4] = a[11] = .6 if t >= 80 else 0
        # Correct the measured heading throughout the approach and push.
        a[3] = np.clip(-2 * state[21], -.3, .3)
        return a
