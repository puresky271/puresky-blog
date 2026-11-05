"""Deterministic visual approach and two-arm box transfer controller."""
import cv2
import numpy as np


def box_bounds(im):
    r, g, b = im.astype(np.float32).transpose(2, 0, 1)
    mask = ((r > g * 1.18) & (g > b * 1.25) & (r > 65)).astype(np.uint8)
    n, _, stats, _ = cv2.connectedComponentsWithStats(mask)
    if n < 2:
        return None
    return stats[1 + np.argmax(stats[1:, 4])]


class Policy:
    def reset(self, obs, tools):
        self.a = np.asarray(tools.hold_action(), dtype=np.float32).copy()
        self.a[19:] = 0
        self.a[5] = self.a[12] = -.35
        self.a[8] = self.a[15] = .35
        self.av = self.al = 0.
        self.reach_x = None
        self.wide = False

    def act(self, obs, tools):
        t = int(obs['t'])
        p = obs['low_dim_obs']
        a = self.a
        a[:2] = 0
        a[3] = 0
        if t < 250:
            a[1] = -.22
        elif t < 700:
            a[3] = np.clip(-p[24] * 2, -.4, .4)
            if t % 10 == 0:
                bounds = box_bounds(tools.image('head'))
                if bounds is not None:
                    x, y, w, h, _ = bounds
                    self.av = np.clip((55 - y - h / 2) * .018, -.15, .18)
                    self.al = np.clip((42 - x - w / 2) * .025, -.18, .18)
                else:
                    self.av, self.al = 0., -.1
            a[0] = self.av if abs(self.av) > .055 else 0
            a[1] = self.al if abs(self.al) > .055 else 0
        elif t < 850:
            if self.reach_x is None:
                self.reach_x = float(p[21]) + .116
            a[0] = .14 if p[21] < self.reach_x else 0
        elif t < 1000:
            if t == 850:
                im = tools.image('head').astype(np.float32)
                r, g, b = im.transpose(2, 0, 1)
                mask = ((r > b*1.3) & (g > b*1.15) & (r > 75)).astype(np.uint8)
                n, _, stats, _ = cv2.connectedComponentsWithStats(mask)
                if n > 1:
                    st = stats[1 + np.argmax(stats[1:, 4])]
                    self.wide = st[2] > 27
            a[2] = .60
            a[5] = a[12] = 0. if self.wide else -.25
            a[8] = a[15] = 0
            a[6], a[13] = .25, -.25
        elif t < 1150:
            a[6] = a[13] = 0
            a[7], a[14] = (-.25, .25) if self.wide else (-.4, .4)
        elif t < 1300:
            a[19:] = 1
            a[7], a[14] = (-.35, .35) if self.wide else (-.55, .55)
            if self.wide:
                a[11], a[18] = .35, -.35
        elif t < 1450:
            a[2] = .74
        elif t < 1600:
            a[0] = -.15
        elif t < 1800:
            u = min(1., (t - 1600) / 150.)
            a[5] = a[12] = (-.85 * u) if self.wide else (-.25 - 1.05 * u)
            a[8] = a[15] = (.6 if self.wide else .2) * u
            a[2] = .78
        elif t < 2250:
            a[3] = np.clip(-p[24] * 2, -.3, .3)
            a[1] = .18 if p[22] < -.02 else 0
            a[0] = np.clip(-p[21] * 1.5, -.15, .15)
        elif t < 2700:
            a[3] = np.clip(-p[24] * 2, -.3, .3)
            a[0] = .14 if p[21] < .38 else 0
            a[1] = np.clip(-p[22] * 1.5, -.12, .12)
            if self.wide:
                u = min(1., (t - 2250) / 180.)
                a[5] = a[12] = -.85 - .65 * u
                a[8] = a[15] = .6 - .4 * u
            else:
                a[5] = a[12] = -1.3 - .2 * min(1., (t - 2250) / 120.)
        elif t < 2950:
            a[5] = a[12] = -1.5 + .25 * min(1., (t - 2700) / 200.)
        else:
            a[19:] = 0
            a[6], a[13] = .3, -.3
        return a.copy()
