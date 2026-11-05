"""Hand-written visual servo controller for transferring two upright plates."""
import numpy as np
import cv2

class Policy:
    def reset(self,obs,tools):
        self.a=np.asarray(tools.hold_action(),dtype=float)
        self.a[19:]=0
        self.i=0;self.tick=0;self.cycle=0
        self.target=np.array([-.12,.30,0.])
        self.lengths=[180,220,45,50,70,190,130,100,60,90]
        self.debug={}
    def vision(self,tools):
        a=tools.image('head').astype(int)
        neutral=(a.max(2)-a.min(2)<3)&(a[:,:,0]>65)
        columns=np.where(neutral[:12].sum(0)>=5)[0]
        columns=columns[(columns>5)&(columns<76)]
        plate=None
        if len(columns):
            groups=np.split(columns,np.where(np.diff(columns)>1)[0]+1)
            groups=[g for g in groups if len(g)>=2]
            if groups:plate=float(np.mean(groups[-1]))
        brown=(a[:,:,0]-a[:,:,2]>14)&(a[:,:,0]-a[:,:,1]>5)&(a[:,:,0]>65)
        brown[38:]=0
        # Grid rails form connected components after a small morphological close.
        mask=cv2.dilate(brown.astype('uint8'),np.ones((3,3),np.uint8))
        n,l,s,c=cv2.connectedComponentsWithStats(mask)
        candidates=[k for k in range(1,n) if s[k,4]>70 and s[k,2]>14]
        rack=None
        if candidates:
            k=max(candidates,key=lambda k:s[k,4] if self.i<5 else c[k,0])
            yy,xx=np.where(brown&(l==k))
            if len(xx):
                rows=np.bincount(yy,minlength=84)
                valid=np.where(rows>=max(5,rows.max()*.50))[0]
                rack=(float(np.percentile(xx,2)),float(np.percentile(xx,98)),float(valid[-1] if len(valid) else yy.max()))
        return plate,rack
    def navigate(self,obs):
        o=obs['low_dim_obs'];x,y,yaw=o[[21,22,24]]
        delta=self.target[:2]-[x,y]
        v=np.clip(delta*2,-.25,.25);v[np.abs(delta)<.008]=0
        for k in range(2):
            if 0<abs(v[k])<.065:v[k]=np.sign(v[k])*.065
        self.a[0]=np.cos(yaw)*v[0]+np.sin(yaw)*v[1]
        self.a[1]=-np.sin(yaw)*v[0]+np.cos(yaw)*v[1]
        self.a[3]=np.clip(-3*yaw,-.5,.5)
    def act(self,obs,tools):
        if self.cycle>=2:
            self.a[:2]=0;self.a[3]=0;return self.a.copy()
        i=self.i;o=obs['low_dim_obs']
        self.a[:2]=0;self.a[3]=0
        goal=-.6
        if i in [4,5,6]:goal=-1.08
        if i==9:goal=-.4
        self.a[12]+=np.clip(goal-self.a[12],-.008,.008)
        self.a[15]=.55
        self.a[20]=1 if i in [3,4,5,6,7] else 0
        if self.tick==0:
            if i==0:self.target=np.array([-.12,.30 if self.cycle==0 else .36,0.])
            if i==1:self.target=o[[21,22,24]].copy();self.target[2]=0
            if i==5:self.target=np.array([.005,-.14,0.]) if self.cycle==0 else self.destination+np.array([0,.10,0])
            if i==6 and self.cycle==0:self.target=o[[21,22,24]].copy();self.target[2]=0
            if i==3 and self.cycle==0:self.source_x=float(o[21])
            if i==8 and self.cycle==0:self.destination=o[[21,22,24]].copy();self.destination[2]=0
            if i==9:self.target=np.array([-.12,o[22],0.])
        if (i==1 or (i==6 and self.cycle==0)) and self.tick%20==0:
            plate,rack=self.vision(tools);self.debug={'plate':plate,'rack':rack}
            if i==1 and plate is not None:
                self.target[1]=o[22]+np.clip((52-plate)*.006,-.06,.06)
            if rack is not None:
                left,right,row=rack
                self.target[0]=o[21]+np.clip(((35 if i==1 else 32)-row)*.006,-.04,.04)
                if i==6:self.target[1]=o[22]+np.clip(((38 if self.cycle==0 else 50)-left)*.006,-.06,.06)
            self.target[0]=np.clip(self.target[0],-.20,.13)
            if i==1 and self.cycle==1:self.target[0]=self.source_x+.006
        if i in [0,1,5,6,9]:self.navigate(obs)
        self.tick+=1
        if self.tick>=self.lengths[i]:
            self.i+=1;self.tick=0
            if self.i==10:self.cycle+=1;self.i=0
        return self.a.copy()
