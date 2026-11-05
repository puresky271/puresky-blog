"""Close the open top drawer of the kitchen cabinet.

Strategy (from the demonstration): lift the hands out of the open drawer, step
back, bring the hands down in front of the drawer face, then walk forward and
push the drawer shut with both hands. Base motion is closed-loop on the pelvis
pose from low_dim_obs, expressed in the frame of the starting pose.
"""

import numpy as np

LIFT_L = [-1.0, 0.15, 0.0, 0.3, 0.0, 0.0, 0.0]
PUSH_L = [-0.75, 0.15, 0.0, 1.0, 0.0, 0.0, 0.0]


def mirror(arm):
    """Right-arm targets from left-arm targets (roll and yaw joints flip sign)."""
    a = list(arm)
    for i in (1, 2, 4, 6):
        a[i] = -a[i]
    return a


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


class Policy:
    BACK_DIST = 0.30      # how far to step back before pushing, m
    PUSH_SPEED = 0.2
    MAX_FWD = 0.35        # never walk further than this past the start, m

    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        o = obs["low_dim_obs"]
        self.x0, self.y0, self.yaw0 = float(o[18]), float(o[19]), float(o[21])
        self.phase = "lift"
        self.k = 0
        self.stall = 0

    def local(self, o):
        dx, dy = float(o[18]) - self.x0, float(o[19]) - self.y0
        c, s = np.cos(self.yaw0), np.sin(self.yaw0)
        return c * dx + s * dy, -s * dx + c * dy, wrap(float(o[21]) - self.yaw0)

    def act(self, obs, tools):
        o = obs["low_dim_obs"]
        fx, fy, dyaw = self.local(o)
        raw = self.hold.copy()
        raw[2] = 0.74
        self.k += 1
        vx = vy = 0.0
        arms_l = LIFT_L

        if self.phase == "lift":
            if self.k >= 40:
                self.phase, self.k = "back", 0
        elif self.phase == "back":
            vx = -0.25
            if fx <= -self.BACK_DIST:
                self.phase, self.k = "lower", 0
        elif self.phase == "lower":
            arms_l = PUSH_L
            if self.k >= 40:
                self.phase, self.k = "push", 0
        elif self.phase == "push":
            arms_l = PUSH_L
            vx = self.PUSH_SPEED
            vy = float(np.clip(-1.0 * fy, -0.1, 0.1))
            fwd_speed = float(o[22 + 18]) * np.cos(self.yaw0) + float(o[22 + 19]) * np.sin(self.yaw0)
            if self.k > 50 and fwd_speed < 0.03:
                self.stall += 1
            else:
                self.stall = 0
            if fx >= self.MAX_FWD or self.stall > 25:
                self.phase, self.k = "hold", 0
        else:
            arms_l = PUSH_L

        wz = float(np.clip(-1.5 * dyaw, -0.3, 0.3)) if vx != 0.0 else 0.0
        raw[0], raw[1], raw[3] = vx, vy, wz
        raw[4:11] = arms_l
        raw[11:18] = mirror(arms_l)
        return raw
