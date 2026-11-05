"""Deterministic visual feedback controller for touching the red sphere."""
import cv2
import numpy as np


def sphere(im):
    a=im.astype(float)
    m=((a[:,:,0]>25)&(a[:,:,0]>1.65*a[:,:,1])&(a[:,:,0]>1.65*a[:,:,2])).astype(np.uint8)
    contours,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    if not contours:return None
    c=max(contours,key=cv2.contourArea)
    if len(c)<5:return None
    (x,y),r=cv2.minEnclosingCircle(c)
    return np.array([x,y,r])


class Policy:
    def reset(self,obs,tools):
        self.a=np.array(tools.hold_action(),float)
        s=sphere(tools.image('head'))
        self.right=s is None or s[0]>41.5
        k=11 if self.right else 4
        self.a[k]=-.2
        self.a[k+2]=.2 if self.right else -.2
        self.h=.74
        self.acquired=s is not None and s[1]>s[2]+2
        self.v=np.zeros(2)
        self.xygoal=None
        self.lower=False
        self.lower_t=0

    def act(self,obs,tools):
        t=obs['t']; p=obs['low_dim_obs'][18:22]
        if t%5==0:
            s=sphere(tools.image('head'))
            if not self.acquired:
                if s is not None and s[1]>s[2]+2:
                    self.acquired=True
                    self.right=s[0]>41.5
                    self.a[4:18]=0
                    k=11 if self.right else 4
                    self.a[k]=-.2
                    self.a[k+2]=.2 if self.right else -.2
                else:
                    self.v=np.array([.18,0.])
                    self.h=.74
            if self.acquired and s is not None and s[2]>2:
                x,y,r=s
                k=11 if self.right else 4
                nominal_yaw=.2 if self.right else -.2
                dp=self.a[k]+.2
                dyaw=self.a[k+2]-nominal_yaw
                goalx=(57 if self.right else 32)-70*dyaw
                goaly=21+110*dp+(15 if self.right else -15)*dyaw
                goalr=11.5-12*dp
                if t>180 and 9<r<16:
                    self.a[k+2]=np.clip(self.a[k+2]+.0015*(goalx-x),nominal_yaw-.16,nominal_yaw+.16)
                    self.a[k]=np.clip(self.a[k]+.001*(y-goaly),-.29,-.11)
                # Pinhole coordinates with a fixed metric scale.
                curr=np.array([(x-41.5)/r,(y-41.5)/r,60/r])*.055
                goal=np.array([(goalx-41.5)/goalr,(goaly-41.5)/goalr,60/goalr])*.055
                ex,ey,ez=curr-goal
                dx=.5*ez-.866*ey
                dz=-.866*ez-.5*ey
                cy,sy=np.cos(p[3]),np.sin(p[3])
                rot=np.array([[cy,-sy],[sy,cy]])
                xygoal=p[:2]+rot@np.array([dx,-ex])
                if self.xygoal is None:self.xygoal=xygoal
                else:self.xygoal=.2*xygoal+.8*self.xygoal
                err=rot.T@(self.xygoal-p[:2])
                if not self.lower and t>80 and np.linalg.norm(err)<.035:
                    self.lower=True
                    self.lower_t=t
                if self.lower and t-self.lower_t>130 and p[2]<.63 and np.linalg.norm(err)>.05:
                    self.lower=False
                self.v=np.clip(err*1.7,-.22,.22)
                speed=np.linalg.norm(self.v)
                if np.linalg.norm(err)<(.045 if t>180 else .022):self.v[:]=0
                elif speed<.065:self.v*=.065/speed
                if self.lower:
                    self.h=float(np.clip(self.h+np.clip(dz*.25,-.008,.008),.53,.79))
                else:self.h=min(.74,self.h+.008)
        self.a[:2]=self.v if t>30 else 0
        self.a[2]=self.h if t>30 else .74
        self.a[3]=np.clip(-p[3]*2,-.4,.4)
        return self.a.copy()
