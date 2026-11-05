"""Close the open top drawer: step back, lower both forearms to drawer-front
height, then walk forward so the hands push the drawer front shut.

Hand-written phase logic; pelvis pose from low_dim_obs closes the loop on
distance travelled and heading.
"""

import numpy as np

MIRROR = np.array([1, -1, -1, 1, -1, 1, -1], dtype=np.float32)

# Left arm poses (right arm is the mirror image).
ARM_BACK = np.array([-0.4, 0.15, 0.0, 0.0, 0.0, 0.0, 0.0], dtype=np.float32)
ARM_PUSH = np.array([-0.4, 0.15, 0.0, 0.5, 0.0, 0.0, 0.0], dtype=np.float32)

BACK_DIST = 0.30      # m to step back before lowering the arms
BACK_SPEED = -0.3
SETTLE_STEPS = 60
PUSH_SPEED = 0.15
YAW_GAIN = 1.5
LAT_GAIN = 1.0


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        o = obs["low_dim_obs"]
        self.x0 = np.array(o[18:20], dtype=np.float64)
        self.yaw0 = float(o[21])
        self.phase = "back"
        self.phase_t = 0

    def _fwd(self, o):
        d = np.array(o[18:20], dtype=np.float64) - self.x0
        return d[0] * np.cos(self.yaw0) + d[1] * np.sin(self.yaw0)

    def _set(self, phase):
        self.phase = phase
        self.phase_t = 0

    def act(self, obs, tools):
        o = obs["low_dim_obs"]
        raw = np.asarray(tools.hold_action(), dtype=np.float32).copy()
        raw[2] = 0.74
        raw[18:20] = 0.0
        fwd = self._fwd(o)
        yaw = float(o[21])
        # The cabinet faces world +x: square up to it and hold the start line.
        wz = float(np.clip(-YAW_GAIN * wrap(yaw), -0.5, 0.5))
        dy = float(o[19]) - self.x0[1]
        vy_world = float(np.clip(-LAT_GAIN * dy, -0.1, 0.1))
        vy = np.cos(yaw) * vy_world
        self.phase_t += 1

        if self.phase == "back":
            arm, vx = ARM_BACK, BACK_SPEED
            if fwd < -BACK_DIST + 0.1:  # base keeps moving after the command stops
                self._set("settle")
        elif self.phase == "settle":
            arm, vx = ARM_PUSH, 0.0
            if self.phase_t >= SETTLE_STEPS:
                self._set("push")
        else:
            arm, vx = ARM_PUSH, PUSH_SPEED

        raw[0] = vx
        raw[1] = vy if vx != 0.0 else 0.0
        raw[3] = wz
        raw[4:11] = arm
        raw[11:18] = arm * MIRROR
        return raw
