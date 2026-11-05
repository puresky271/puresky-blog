"""Hand-written wrist-camera feedback and gentle dishwasher placement."""
import numpy as np
import cv2

class Policy:
    def reset(self,obs,tools):
        self.a=np.asarray(tools.hold_action(),float);self.a[19:]=0
        self.x=-.30;self.y=-.55;self.side=0;self.phase='init';self.pt=0
        self.sh=[-1.25,-1.35];self.roll=[0.,-.10];self.held=[False,False]
        self.walk=0;self.settle=0;self.walkspeed=0;self.walkaxis=0
        self.gt=0;self.grasp=False;self.shoulder=-1.25;self.last=None
        self.holdarms=[None,None]
        self.lost=0
        self.distant=None
    def base(self,o,x,y,yaw=0):
        p=o['low_dim_obs'][21:25];v=np.array([x,y])-p[:2]
        if np.linalg.norm(v)<.028:v*=0
        else:
            speed=.23 if self.phase=='transfer' and not self.distant else .18
            v=np.clip(v*1.6,-speed,speed)
            if np.linalg.norm(v)<.06:v*=.06/np.linalg.norm(v)
        c,s=np.cos(p[3]),np.sin(p[3]);self.a[0:2]=[c*v[0]+s*v[1],-s*v[0]+c*v[1]]
        self.a[3]=np.clip(2*(yaw-p[3]),-.35,.35)
    @staticmethod
    def mug(im,side=0):
        lo=im.min(2).astype(float);hi=im.max(2).astype(float)
        mask=((hi-lo<28)&(lo>65)&(hi<235)).astype('uint8');mask[78:]=0
        def candidates(mm):
            n,ll,ss,cc=cv2.connectedComponentsWithStats(mm)
            kk=[k for k in range(1,n) if ss[k,4]>100 and ss[k,2]>=15 and ss[k,3]>7 and ss[k,3]>.7*ss[k,2] and ss[k,1]<55]
            return ll,ss,cc,kk
        def select(ss,kk):
            return min(kk,key=lambda k:ss[k,0]) if side==0 else max(kk,key=lambda k:ss[k,0]+ss[k,2])
        l,st,ce,kk=candidates(mask)
        clean=cv2.morphologyEx(mask,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
        lc,sc,cc,kc=candidates(clean)
        i=select(st,kk) if kk else None
        repair=False
        if kc:
            k=select(sc,kc);xx,yy,ww,hh,aa=sc[k]
            if i is None:repair=True
            elif side==0 and xx<st[i,0]-5:repair=True
            elif st[i,1]+st[i,3]>=78 and yy+hh<75 and aa>st[i,4]*.35:repair=True
            if repair:
                cut=mask.copy();cut[yy+hh+3:]=0
                cut[:,:max(0,xx-5)]=0;cut[:,min(84,xx+ww+5):]=0
                n,l,st,ce=cv2.connectedComponentsWithStats(cut)
                if n>1:i=max(range(1,n),key=lambda k:st[k,4])
        if i is None:return None
        x,y,w,h,area=st[i];cx,cy=ce[i]
        hm=np.zeros((84,84),np.uint8)
        pts=np.argwhere(l==i)[:,::-1].astype(np.int32)
        cv2.fillConvexPoly(hm,cv2.convexHull(pts),1)
        hm=cv2.erode(hm,np.ones((3,3),np.uint8))
        hm[:int(y+h*.28)]=0;hm[int(y+h*.90):]=0
        bright=((lo>190)&(hi-lo<25)&(hm>0)).astype(np.uint8)
        nn,ll,ss,cc=cv2.connectedComponentsWithStats(bright)
        handles=[k for k in range(1,nn) if ss[k,4]>4 and ss[k,3]>h*.18]
        if handles:
            k=max(handles,key=lambda k:ss[k,4]);cx=cc[k,0]
        return x,y,w,h,area,cx,cy
    @staticmethod
    def distant_mug(im,side=0):
        lo=im.min(2).astype(float);hi=im.max(2).astype(float)
        mask=((hi-lo<28)&(lo>65)&(hi<235)).astype('uint8');mask[78:]=0
        n,l,st,ce=cv2.connectedComponentsWithStats(mask)
        cand=[]
        for i,(x,y,w,h,area) in enumerate(st[1:],1):
            if area>35 and 5<w<85 and h>7 and h>0.7*w and y<55:
                cand.append((x,y,w,h,area,ce[i][0],ce[i][1],i))
        if not cand:return None
        # At an open hand the mug is the large gray component.
        c=max(cand,key=lambda c:c[4]) if side==0 else max(cand,key=lambda c:c[0]+c[2])
        x,y,w,h,area,cx,cy,i=c
        hm=np.zeros((84,84),np.uint8)
        pts=np.argwhere(l==i)[:,::-1].astype(np.int32)
        cv2.fillConvexPoly(hm,cv2.convexHull(pts),1)
        hm=cv2.erode(hm,np.ones((3,3),np.uint8))
        hm[:int(y+h*.28)]=0;hm[int(y+h*.90):]=0
        bright=((lo>190)&(hi-lo<25)&(hm>0)).astype(np.uint8)
        nn,ll,ss,cc=cv2.connectedComponentsWithStats(bright)
        handles=[k for k in range(1,nn) if ss[k,4]>4 and ss[k,3]>h*.18]
        if handles:
            k=max(handles,key=lambda k:ss[k,4]);cx=cc[k,0]
        return x,y,w,h,area,cx,cy
    def act(self,o,tools):
        t=o['t'];self.a[:2]=0;self.a[3]=0
        if t>=200 and self.distant is None:
            visible=self.distant_mug(tools.image('left_wrist'))
            self.distant=bool(visible is not None and visible[3]<=33)
        targets=[np.array([-1.25,0,0,1.25,0,-.12,0.]),np.array([-1.4,-.2,0,1.4,0,-.12,0.])]
        if self.phase=='init':
            if t<120:
                self.x=-.20;targets=[np.array([-2.6,0,0,2.09,0,.4,0.])]*2
            elif t<220:
                self.x=-.14;targets=[np.array([-1.5,.16,0,1.5,0,-.12,0.]),np.array([-1.4,-.1,0,1.4,0,-.12,0.])]
            else:
                self.phase='align';self.sh[0]=-1.5;self.roll[0]=.16;self.settle=t+30
            self.base(o,self.x,self.y)
        if self.phase in ('align','close','lift'):
            i=self.side
            for j in range(2):
                if self.held[j]:targets[j]=self.holdarms[j].copy()
            targets[i]=np.array([self.sh[i],self.roll[i],0,-self.sh[i],0,-.12,0.])
            self.shoulder=self.sh[i]
            if self.phase=='align':
                if t%5==0 and self.walk==0:
                    detector=self.distant_mug if self.distant else self.mug
                    m=detector(tools.image('left_wrist' if i==0 else 'right_wrist'),i)
                    self.last=m
                    if m is None and not self.distant:
                        self.lost+=5
                        if self.lost>40:
                            im=tools.image('left_wrist' if i==0 else 'right_wrist')
                            lo=im.min(2).astype(float);hi=im.max(2).astype(float)
                            mask=((hi-lo<28)&(lo>65)&(hi<235)).astype(np.uint8)
                            nn,ll,ss,cc=cv2.connectedComponentsWithStats(mask)
                            loose=[k for k in range(1,nn) if ss[k,4]>50]
                            if loose:
                                k=max(loose,key=lambda k:ss[k,4]);cy=cc[k,1]
                                self.sh[i]=np.clip(self.sh[i]+np.clip((cy-40)*.001,-.025,.025),-1.9,-.7)
                    if m:
                        self.lost=0
                        x,y,w,h,area,cx,cy=m
                        self.roll[i]=np.clip(self.roll[i]+np.clip((42-cx)*.0007,-.02,.02),-.5,.6 if i==0 else .13)
                        self.sh[i]=np.clip(self.sh[i]-np.clip((60-(y+h))*.0007,-.015,.015),-1.7,-.7)
                        if abs(cx-42)<5 and abs(y+h-60)<22 and h<60 and t>self.settle:
                            if self.distant:
                                self.walk=t+(50 if w<45 else 35);self.walkspeed=.14 if w<45 else .10
                            else:
                                self.walk=t+(65 if w<35 else 35);self.walkspeed=.16 if w<35 else .10
                            self.settle=self.walk+60;self.walkaxis=0
                        if i==1 and self.roll[i]>.12 and cx<32 and t>self.settle:
                            self.walk=t+55;self.settle=self.walk+60;self.walkspeed=.15;self.walkaxis=1
                        if abs(cx-42)<4 and h>=53 and abs(y+h-60)<8 and t>self.settle:
                            self.phase='close';self.gt=t;self.grasp=True
                targets[i]=np.array([self.sh[i],self.roll[i],0,-self.sh[i],0,-.12,0.])
                if self.walk>t:self.a[self.walkaxis]=self.walkspeed
                elif self.walk:self.walk=0
            if self.phase=='close':
                self.a[19+i]=1
                if t-self.gt>40:self.phase='lift'
            if self.phase=='lift':
                targets[i]=np.array([-1.6,self.roll[i],0,1.45,0,-.12,0.])
                if t-self.gt>115:
                    self.held[i]=True;self.holdarms[i]=targets[i].copy()
                    if i==0:
                        self.side=1;self.phase='align';self.walk=0;self.settle=t+60;self.grasp=False
                    else:self.phase='transfer';self.pt=t
        if self.phase=='transfer':
            targets=[h.copy() for h in self.holdarms]
            self.base(o,-.46,.02,0)
            if np.linalg.norm(o['low_dim_obs'][21:23]-np.array([-.46,.02]))<.06:
                self.phase='lower';self.pt=t
        if self.phase=='lower':
            targets=[h.copy() for h in self.holdarms]
            self.a[2]=max(.51,.74-(t-self.pt)*.0015)
            if t-self.pt>180:self.phase='release';self.pt=t
        if self.phase=='release':
            targets=[h.copy() for h in self.holdarms];self.a[19:]=0
        for j in range(2):
            sl=slice(5+7*j,12+7*j);self.a[sl]+=np.clip(targets[j]-self.a[sl],-.025,.025)
        return self.a.copy()
