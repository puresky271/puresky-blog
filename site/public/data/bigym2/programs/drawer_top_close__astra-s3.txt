"""Deterministic drawer closure with a retreat, hand placement, and forward push."""
import numpy as np

class Policy:
    def reset(self, obs, tools):
        self.hold = np.asarray(tools.hold_action(), dtype=np.float32)
        q=obs['low_dim_obs']
        self.start = np.array(q[18:22])
        self.stage=0
        self.stage_t=0

    def act(self, obs, tools):
        a=self.hold.copy()
        q=obs['low_dim_obs']; x,y,z,yaw=q[18:22]; t=obs['t']
        a[18:20]=0
        a[3]=np.clip(-2*yaw,-.25,.25)
        # Keep the hands centered through the controller's walking sway.
        ey=self.start[1]-y
        a[1]=np.clip(2*ey,-.12,.12) if abs(ey)>.025 else 0
        if self.stage==0:
            a[0]=-.2
            if x<self.start[0]-.17 or t>=160:
                self.stage=1;self.stage_t=t
        if self.stage>=1:
            a[4]=a[11]=.5
            a[7]=a[14]=0
        if self.stage==1:
            a[0]=0;a[1]=0
            if t-self.stage_t>=60:
                self.stage=2;self.stage_t=t
        if self.stage==2:
            a[0]=.15
        return a
