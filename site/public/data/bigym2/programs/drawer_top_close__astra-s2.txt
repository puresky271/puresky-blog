"""Close the drawer with a retreat, arm clearance, and slow forward push."""
import numpy as np


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.x0 = float(obs['low_dim_obs'][18])
        self.stage = 0
        self.age = 0

    def act(self, obs, tools):
        a = self.hold.copy()
        x = obs['low_dim_obs'][18]
        a[18:20] = 0

        if self.stage == 0:
            # Clear the drawer before lowering the hands. Measure the retreat
            # from body state because commanded walking speed has lag.
            a[0] = -.2
            if x < self.x0 - .18:
                self.stage = 1
                self.age = 0
        elif self.stage == 1:
            # Allow the shoulders and standing controller to settle.
            a[4] = a[11] = .6
            if self.age > 80:
                self.stage = 2
        else:
            # Maintain gentle forward pressure through the success dwell time.
            a[4] = a[11] = .6
            a[0] = .2

        self.age += 1
        return a
