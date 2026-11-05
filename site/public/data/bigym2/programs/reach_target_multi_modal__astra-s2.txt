"""Deterministic color-based visual servo for reaching the red sphere.

The head camera selects an arm. The wrist camera closes the reaching loop;
small base corrections extend the workspace when the arm reaches its limit.
All gains and thresholds below are fixed hand-tuned control constants.
"""
import numpy as np


def red(im):
    """Return red-pixel centroid, area, and contact-highlight pixel count."""
    z=im.astype(np.int16)
    m=(z[:,:,0]>65)&(z[:,:,0]>z[:,:,1]*1.8)&(z[:,:,0]>z[:,:,2]*1.8)
    y,x=np.where(m)
    if len(x)<3:return None
    return float(x.mean()),float(y.mean()),len(x),int(np.sum(m&(z[:,:,0]>240)))

class Policy:
    def reset(self,obs,tools):
        self.a=np.asarray(tools.hold_action()).copy()
        # The image horizontal coordinate selects the nearer hand.
        f=red(tools.image('head'))
        x,y=(f[:2] if f else (42,10))
        self.right=x>=42
        self.i=11 if self.right else 4
        self.cam='right_wrist' if self.right else 'left_wrist'
        self.a[self.i:self.i+7]=[np.clip(y*.015-.395,-.5,-.05),0,((63 if self.right else 21)-x)*.012,0,0,0,0]
        self.a[18:20]=0
        self.yaw0=float(obs['low_dim_obs'][21])
    def act(self,obs,tools):
        t=obs['t'];i=self.i
        if t%4==0:
            h=red(tools.image('head'))
            touch=h and h[3]>=5
            f=red(tools.image(self.cam))
            touch=touch or (f and f[3]>100)
            self.a[0:2]=0
            self.a[3]=np.clip((self.yaw0-obs["low_dim_obs"][21])*2,-.3,.3)
            # Stop stepping at contact; gently center the sphere while holding.
            if touch:
                self.a[3]=0
                if f:
                    self.a[i]+=np.clip((f[1]-42)*.0004,-.01,.01)
                    self.a[i+1]-=np.clip((f[0]-42)*.0003,-.01,.01)
            if t>36 and not touch:
                if f:
                    x,y,n,_=f
                    if self.a[i+3]>=1.10 and n<6100 and abs(x-42)<22 and abs(y-42)<22:
                        self.a[0]=.07
                    if self.a[i+3]>.6 and abs(x-42)>8:
                        if (self.right and self.a[i+1]>=.049 and x<42) or (not self.right and self.a[i+1]<=-.049 and x>42):
                            self.a[1]=np.clip(-(x-42)*.005,-.09,.09)
                            if abs(self.a[1])<.06:self.a[1]=np.sign(self.a[1])*.06
                    self.a[i]+=np.clip((y-42)*.0012,-.03,.03)
                    
                    # Shoulder yaw is useful early; roll remains effective
                    # once the elbow bends and the forearm changes orientation.
                    if self.a[i+3]<.5:
                        self.a[i+2]-=np.clip((x-42)*.0008,-.025,.025)
                    else:
                        self.a[i+1]-=np.clip((x-42)*.0008,-.025,.025)
                    if abs(x-42)<15 and abs(y-42)<15 and n<6400 and self.a[i+3]<1.10:
                        self.a[i+3]+=.023
                        self.a[i]-=.023
                else:
                    if h:
                        self.a[i]+=.003*np.clip(h[1]-18,-5,5)
            self.a[i]=np.clip(self.a[i],-2.2,.3)
            self.a[i+1]=np.clip(self.a[i+1],-.7 if self.right else -.05,.05 if self.right else .7)
            self.a[i+2]=np.clip(self.a[i+2],-.8,.8)
        return self.a.copy()
