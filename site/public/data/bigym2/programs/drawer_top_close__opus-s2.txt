"""Close the open top drawer: lift the hands out of the drawer, back away, lower
the hands in front of the drawer front and walk forward pushing it shut.

Hand-written phase machine; the base is closed-loop on the pelvis pose read from
low_dim_obs (heading and lateral offset held relative to the start pose).
"""

import numpy as np

# Arm joint targets: shoulder_pitch, shoulder_roll, shoulder_yaw, elbow,
# wrist_roll, wrist_pitch, wrist_yaw.  Elbow 0 = forearm at right angle,
# positive elbow extends the arm.
LIFT_L = np.array([-1.2, 0.2, 0.0, 0.0, 0.0, 0.0, 0.0])
LIFT_R = np.array([-1.2, -0.2, 0.0, 0.0, 0.0, 0.0, 0.0])
PUSH_P, PUSH_E, PUSH_WP = -0.3, 0.36, 0.0
PUSH_L = np.array([PUSH_P, 0.1, 0.0, PUSH_E, 0.0, PUSH_WP, 0.0])
PUSH_R = np.array([PUSH_P, -0.1, 0.0, PUSH_E, 0.0, PUSH_WP, 0.0])

LIFT_STEPS = 40
BACK_DIST = 0.45       # m to back away along the start heading
BACK_SPEED = 0.2
SETTLE_STEPS = 30
LOWER_STEPS = 40
PUSH_SPEED = 0.15
SLOW_SPEED = 0.08


def wrap(a):
    return (a + np.pi) % (2 * np.pi) - np.pi


class Policy:
    """The control policy that is scored on the hidden seeds."""

    def reset(self, obs, tools):
        o = np.asarray(obs["low_dim_obs"], dtype=np.float64)
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        self.x0, self.y0, self.yaw0 = o[18], o[19], o[21]
        self.c, self.s = np.cos(self.yaw0), np.sin(self.yaw0)
        self.arm0 = np.concatenate([o[0:7], o[9:16]])
        self.phase = "lift"
        self.k = 0
        self.hist = []

    def local(self, o):
        """Pelvis position in the start frame (forward, left) and yaw error."""
        dx, dy = o[18] - self.x0, o[19] - self.y0
        f = self.c * dx + self.s * dy
        l = -self.s * dx + self.c * dy
        return f, l, wrap(o[21] - self.yaw0)

    def base_cmd(self, vx, l, dyaw):
        """Body-frame command holding lateral offset 0 and the start heading."""
        vy_w = float(np.clip(-1.5 * l, -0.15, 0.15))
        wz = float(np.clip(-2.0 * dyaw, -0.4, 0.4))
        # heading error stays small, so start-frame lateral ~ body-frame lateral
        return vx, vy_w, wz

    def act(self, obs, tools):
        o = np.asarray(obs["low_dim_obs"], dtype=np.float64)
        f, l, dyaw = self.local(o)
        raw = self.hold.copy()
        vx = 0.0
        self.k += 1
        arms = None

        if self.phase == "lift":
            a = min(1.0, self.k / LIFT_STEPS)
            arms = (1 - a) * self.arm0 + a * np.concatenate([LIFT_L, LIFT_R])
            if self.k >= LIFT_STEPS:
                self.phase, self.k = "back", 0
        elif self.phase == "back":
            arms = np.concatenate([LIFT_L, LIFT_R])
            vx = -BACK_SPEED
            if f <= -BACK_DIST:
                self.phase, self.k = "settle", 0
        elif self.phase == "settle":
            arms = np.concatenate([LIFT_L, LIFT_R])
            if self.k >= SETTLE_STEPS:
                self.phase, self.k = "lower", 0
        elif self.phase == "lower":
            a = min(1.0, self.k / LOWER_STEPS)
            arms = (1 - a) * np.concatenate([LIFT_L, LIFT_R]) + a * np.concatenate([PUSH_L, PUSH_R])
            if self.k >= LOWER_STEPS:
                self.phase, self.k = "push", 0
        else:  # push
            arms = np.concatenate([PUSH_L, PUSH_R])
            self.hist.append(f)
            vx = PUSH_SPEED
            if len(self.hist) > 40 and self.hist[-1] - self.hist[-40] < 0.01:
                vx = SLOW_SPEED

        if vx != 0.0:
            vx, vy, wz = self.base_cmd(vx, l, dyaw)
            if np.hypot(vx, vy) < 0.06:
                vy = 0.0
        else:
            vy, wz = 0.0, 0.0
        raw[0], raw[1], raw[3] = vx, vy, wz
        raw[2] = 0.74
        raw[4:18] = arms
        return raw
