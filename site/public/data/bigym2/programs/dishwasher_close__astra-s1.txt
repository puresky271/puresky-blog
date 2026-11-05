"""Deterministic dishwasher controller using staged contacts and base feedback."""
import numpy as np

# Manually specified motions: lift to seat the lower rack, push the upper
# rack, then lift the door again. Positions are in the room's world frame.
STAGES = [{'name': 'front', 'n': 300, 'target': [-0.25, 0, 0], '19': 1, '20': 1},
 {'name': 'low', 'n': 120, '2': 0.4, '4': 0.4, '5': 0.3, '12': 0.3},
 {'name': 'reach', 'n': 100, '5': -0.2, '12': -0.2},
 {'name': 'lift1', 'n': 120, '5': -0.6, '12': -0.6},
 {'name': 'lift2', 'n': 120, '5': -1, '12': -1, '2': 0.55},
 {'name': 'lift3', 'n': 150, '5': -1.5, '12': -1.5, '2': 0.74, '4': 0},
 {'name': 'push', 'n': 500, 'target': [0.5, 0, 0]},
 {'name': 'release', 'n': 200, '5': 0, '12': 0, 'target': [-0.25, 0, 0]},
 {'name': 'align', 'n': 180, 'target': [-0.25, -0.16, 0], '15': 1, '12': 0},
 {'name': 'upper', 'n': 100, '5': 0, '8': 0},
 {'name': 'pushupper', 'n': 350, 'target': [0.4, -0.16, 0]},
 {'name': 'extendupper', 'n': 300, '5': -0.3, '8': 0.3, '4': 0.4, 'target': [0.4, -0.16, 0]},
 {'name': 'back', 'n': 250, 'target': [-0.3, -0.16, 0]},
 {'name': 'front2', 'n': 200, 'target': [-0.25, 0, 0], '5': 0, '8': 0, '15': 0, '4': 0},
 {'name': 'low', 'n': 120, '2': 0.4, '4': 0.4, '5': 0.3, '12': 0.3},
 {'name': 'reach', 'n': 100, '5': -0.2, '12': -0.2},
 {'name': 'lift1', 'n': 120, '5': -0.6, '12': -0.6},
 {'name': 'lift2', 'n': 120, '5': -1, '12': -1, '2': 0.55},
 {'name': 'lift3', 'n': 150, '5': -1.5, '12': -1.5, '2': 0.74, '4': 0},
 {'name': 'push', 'n': 500, 'target': [0.5, 0, 0]},
 {'name': 'finish', 'n': 250, '8': 1.2, '15': 1.2, 'target': [0.5, 0, 0]}]

class Policy:
    def reset(self, obs, tools):
        self.action = np.asarray(tools.hold_action(), dtype=np.float32).copy()
        self.index = -1
        self.end = 0
        self.target = None

    def act(self, obs, tools):
        t = int(obs["t"])
        if t >= self.end and self.index + 1 < len(STAGES):
            self.index += 1
            stage = STAGES[self.index]
            self.end += stage["n"]
            self.action[0] = self.action[1] = self.action[3] = 0
            self.target = stage.get("target")
            for k, value in stage.items():
                if k not in ("name", "n", "target"):
                    self.action[int(k)] = value
        if self.target is not None:
            x, y, z, yaw = obs["low_dim_obs"][21:25]
            dx, dy = self.target[0] - x, self.target[1] - y
            v = np.array([np.cos(yaw)*dx + np.sin(yaw)*dy,
                          -np.sin(yaw)*dx + np.cos(yaw)*dy]) * 1.5
            v = np.clip(v, -.22, .22)
            norm = np.linalg.norm(v)
            if norm < .06:
                v *= 0 if norm < .015 else .06 / norm
            self.action[:2] = v
            error = (self.target[2] - yaw + np.pi) % (2*np.pi) - np.pi
            self.action[3] = np.clip(2*error, -.6, .6)
        return self.action.copy()
