"""Deterministic, rate-limited dishwasher manipulation controller.

The waypoints and arm motions are hand tuned. Base movement is closed-loop
in the robot's proprioceptive world frame; no demonstration data is loaded.
"""
import numpy as np

# Approach, upper rack push, lower rack push, and door lift.
STAGES = [{'n': 220, 'pose': [-0.7, -0.8, 0], 'set': {'19': 0, '20': 1}},
 {'n': 350, 'pose': [-0.7, 0.24, 0]},
 {'n': 120, 'set': {'12': -0.4, '15': 0}},
 {'n': 240, 'pose': [-0.1, 0.24, 0]},
 {'n': 170, 'pose': [-0.1, 0.24, 0], 'set': {'12': -1.2, '15': 0.8}},
 {'n': 170, 'pose': [-0.1, 0.24, 0], 'set': {'12': -1.7, '15': 1.4, '4': 0.5}},
 {'n': 240, 'pose': [-0.65, 0.24, 0]},
 {'n': 160, 'set': {'12': 0.5, '15': 0.5, '4': 0}},
 {'n': 250, 'pose': [-0.1, 0.24, 0]},
 {'n': 300, 'pose': [0.12, 0.24, 0], 'set': {'12': -1.8, '15': 1.7, '4': 0.8}},
 {'n': 200, 'pose': [0.12, 0.24, 0], 'set': {'12': -2.1, '15': 1.8}},
 {'n': 120, 'pose': [0.12, 0.24, 0], 'set': {'20': 0}},
 {'n': 230, 'pose': [-0.6, 0.24, 0]},
 {'n': 170, 'pose': [-0.4, 0, 0], 'set': {'12': 0, '15': 0, '4': 0}},
 {'n': 130, 'pose': [-0.24, 0, 0], 'set': {'13': -1, '19': 0, '20': 0, '6': 1}},
 {'n': 200, 'set': {'0': 0, '1': 0, '15': 0.7, '2': 0.4, '3': 0, '8': 0.7}},
 {'n': 130, 'set': {'13': 0, '6': 0}},
 {'n': 100, 'set': {'12': -0.5, '5': -0.5}},
 {'n': 60, 'set': {'19': 1, '20': 1}},
 {'n': 220,
  'pose': [0.35, 0, 0],
  'set': {'12': -2.2, '15': 1.5, '2': 0.74, '4': 0.8, '5': -2.2, '8': 1.5}},
 {'n': 250, 'pose': [0.5, 0, 0]},
 {'n': 180, 'pose': [0.5, 0, 0], 'set': {'12': -1, '15': 1, '4': 0, '5': -1, '8': 1}}]

class Policy:
    def reset(self, obs, tools):
        self.action = np.asarray(tools.hold_action(), dtype=np.float64).copy()
        self.stage = -1
        self.elapsed = 0
        self.rates = np.array([2, 2, .002, 2, .008] + [.012]*14 + [.05]*2)
        self._next()

    def _next(self):
        self.stage += 1
        self.elapsed = 0
        self.spec = STAGES[min(self.stage, len(STAGES)-1)]
        self.target = self.action.copy()
        for index, value in self.spec.get('set', {}).items():
            self.target[int(index)] = value

    def act(self, obs, tools):
        if self.elapsed >= self.spec['n'] and self.stage < len(STAGES)-1:
            self._next()
        self.action += np.clip(self.target-self.action, -self.rates, self.rates)
        if 'pose' in self.spec:
            x, y, yaw = obs['low_dim_obs'][[21,22,24]]
            tx, ty, ta = self.spec['pose']
            err = np.array([tx-x, ty-y])
            velocity = np.clip(err*1.4, -.3, .3)
            velocity = np.array([[np.cos(yaw),np.sin(yaw)],[-np.sin(yaw),np.cos(yaw)]]) @ velocity
            if np.linalg.norm(err) < .018:
                velocity *= 0
            elif np.linalg.norm(velocity) < .065:
                velocity *= .065/(np.linalg.norm(velocity)+1e-6)
            self.action[:2] = velocity
            self.action[3] = np.clip(((ta-yaw+np.pi)%(2*np.pi)-np.pi)*2, -.7, .7)
        self.elapsed += 1
        return self.action.copy()
