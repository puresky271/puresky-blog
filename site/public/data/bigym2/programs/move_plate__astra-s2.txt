"""Hand-written, deterministic controller for transferring an upright plate.

Only robot cameras and proprioception are used. Distances and gains are
physical control constants; no demonstration files are needed at runtime.
"""
import numpy as np


class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.pick = np.array([0.14, 0.10])
        self.place = np.array([0.04, -0.30])

        # Locate the near edge and left end of the destination rack. Its
        # wooden rails are warm brown against the neutral tabletop.
        im = tools.image("head").astype(float)
        wood = ((im[:, :, 0] > 1.12 * im[:, :, 1]) &
                (im[:, :, 1] > 1.15 * im[:, :, 2]) &
                (im[:, :, 0] > 90) & (im[:, :, 0] < 235))
        wood[:, :42] = False
        yy, xx = np.where(wood)
        if len(xx) > 10:
            correction = np.array([0.008 * (23 - yy.max()),
                                   0.008 * (57 - xx.min())])
            self.place += np.clip(correction, -0.12, 0.12)

        # A plate at the outer end of the source rack can initially be
        # clipped by the wrist view. Align laterally before reaching it.
        im = tools.image("left_wrist").astype(float)
        rim = ((im.min(axis=2) > 200) &
               ((im.max(axis=2) - im.min(axis=2)) < 30))
        rim[30:] = False
        yy, xx = np.where(rim)
        if not len(xx):
            self.pick[1] += 0.12
        elif np.median(xx) < 5:
            self.pick[1] += 0.08

    def act(self, obs, tools):
        t = int(obs["t"])
        body = obs["low_dim_obs"]
        action = self.hold.copy()
        action[2] = 0.74
        action[18:] = 0
        target = self.pick.copy()
        pitch = 0.0

        # Approach with open fingers, close around the rim, and lift while
        # counter-rotating the wrist to keep the plate standing vertically.
        if t >= 200:
            action[18] = 1
        if t >= 250:
            pitch = -0.7
        if t >= 325:
            target = self.place.copy()
        if t >= 545:
            pitch = 0.0
        if t >= 645:
            action[18] = 0
        if t >= 745:
            target = self.place + [-0.12, 0]
        action[4] = pitch
        action[9] = -pitch

        # Close the base loop using measured position and yaw. Respect the
        # walking controller's minimum speed rather than dead-reckoning.
        action[:2] = 0
        action[3] = np.clip(-3 * body[21], -0.3, 0.3)
        if t < 835:
            error = target - body[18:20]
            velocity = np.clip(2 * error, -0.22, 0.22)
            speed = np.linalg.norm(velocity)
            if np.linalg.norm(error) < 0.012:
                velocity *= 0
            elif speed < 0.065:
                velocity *= 0.065 / max(speed, 1e-8)
            c, s = np.cos(body[21]), np.sin(body[21])
            action[:2] = [c * velocity[0] + s * velocity[1],
                          -s * velocity[0] + c * velocity[1]]
        return action
