"""Deterministic bimanual box transfer using RGB and joint feedback only.

The base follows pelvis-pose feedback. Colour segmentation aligns the approach;
arm motions are interpolated, with wrist compensation during lifting. During
transport, shoulder tracking error provides a bounded grip-pressure heuristic.
All geometry, gains, and waypoints are manually chosen control constants.
"""
import numpy as np
import cv2

class Policy:
    def reset(self, obs, tools):
        self.a=np.asarray(tools.hold_action(),float)
        self.a[19:]=0
        self.stage=0; self.age=0; self.start=self.a.copy()
        self.y=-1.04; self.err=0; self.grip_control=False
        self.force_roll=None
        self.narrow=False
        self.fine_error=None
        # First move sideways clear of the furniture, then approach with spread arms.
        # Squat, close, stand, lift, retreat, transfer, lower, and release.
        self.stages=[
            ('nav',430,[-.07,-1.04,0],{}),
            ('align',110,None,{}),
            ('pose',100,None,{6:.25,13:-.25,5:-.6,12:-.6,8:1,15:1}),
            ('nav',320,[.42,None,0],{}),
            ('pose',140,None,{2:.68}),
            ('pose',160,None,{6:-.06,13:.06}),
            ('pose',180,None,{2:.78}),
            ('pose',230,None,{5:-1.65,12:-1.65,10:1.05,17:1.05,6:.09,13:-.09}),
            ('nav',160,[.18,None,0],{}),
            ('nav',650,[-.08,-.02,0],{}),
            ('nav',280,[.43,-.02,0],{}),
            ('pose',160,None,{5:-1.2,12:-1.2,10:.6,17:.6,6:.03,13:-.03}),
            ('pose',160,None,{6:.32,13:-.32}),
            ('nav',200,[-.12,-.02,0],{}),
            ('pose',120,None,{5:0,12:0,8:0,15:0,10:0,17:0,6:0,13:0,2:.74}),
        ]
    @staticmethod
    def detect(im):
        hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV)
        m=((hsv[:,:,0]>9)&(hsv[:,:,0]<40)&(hsv[:,:,1]>45)&(hsv[:,:,2]>45)).astype(np.uint8)
        n,l,s,c=cv2.connectedComponentsWithStats(m)
        ids=[i for i in range(1,n) if s[i,4]>12]
        if not ids:return None
        i=max(ids,key=lambda j:s[j,4]);return (s[i,0]+s[i,2]/2,s[i,1]+s[i,3]/2,s[i,2],s[i,3])
    def navigate(self,p,goal):
        goal=np.array([goal[0],self.y if goal[1] is None else goal[1]])
        v=np.clip((goal-p[:2])*1.5,-.18,.18)
        mag=np.linalg.norm(v)
        if mag<.019:v[:]=0
        elif mag<.065:v*=.065/mag
        yaw=p[3]
        self.a[:2]=np.array([[np.cos(yaw),np.sin(yaw)],[-np.sin(yaw),np.cos(yaw)]])@v
        self.a[3]=np.clip(-yaw*2,-.35,.35)
    def act(self,obs,tools):
        p=obs['low_dim_obs'][21:25]
        if self.stage>=len(self.stages):
            self.a[:2]=0;self.a[3]=0;return self.a.copy()
        typ,dur,goal,ch=self.stages[self.stage]
        self.a[:2]=0;self.a[3]=0
        if typ=='pose':
            if self.age==0 and ch.get(5)==-1.65:
                ch[6]=float(obs['low_dim_obs'][4])+.02
                ch[13]=float(obs['low_dim_obs'][13])-.02
                self.carry_roll=(ch[6],ch[13])
            if self.age==0 and ch.get(5)==-1.2:
                ch[6]=self.carry_roll[0]-.06
                ch[13]=self.carry_roll[1]+.06
            if ch.get(5)==-1.65 and self.age==dur-30:
                self.grip_control=True
            if 6 in ch and ch[6]==.32:
                self.grip_control=False
            f=min(1,(self.age+1)/max(1,dur-20))
            for k,v in ch.items():self.a[k]=self.start[k]+f*(v-self.start[k])
        elif typ=='nav':
            self.navigate(p,goal)
            # Narrow end-on boxes need a closer check of the fore-aft grasp alignment.
            if self.stage==3 and self.age>=220:
                if self.age%10==0:
                    b=self.detect(tools.image('head'))
                    if self.age==220:
                        self.narrow=b is not None and b[2] < .9*b[3]
                    if b is not None:
                        self.fine_error=np.array([70-b[1]-b[3]/2,42-b[0]])
                if self.narrow and self.fine_error is not None:
                    v=np.clip(self.fine_error*.01,-.10,.10)
                    mag=np.linalg.norm(v)
                    if np.max(np.abs(self.fine_error))<1.5:v[:]=0
                    elif mag<.065 and mag>0:v*=.065/mag
                    self.a[:2]=v
        else:
            if self.age%10==0:
                b=self.detect(tools.image('head'))
                self.err=0 if b is None else b[0]-42
            self.a[1]=-.07*np.sign(self.err) if abs(self.err)>1.5 else 0
            self.a[3]=np.clip(-p[3]*2,-.25,.25)
        # Maintain a small joint tracking error against the box. This is feedback
        # from the current grasp, not an estimate learned from past episodes.
        if self.grip_control:
            q=obs['low_dim_obs']
            if self.force_roll is None:
                self.force_roll=np.array([self.a[6],self.a[13]])
            error=np.array([q[4]-.11,q[13]+.11])-self.force_roll
            self.force_roll+=np.clip(.035*error,-.0015,.0015)
            self.force_roll=np.clip(self.force_roll,[-.15,-.3],[.3,.15])
            self.a[6],self.a[13]=self.force_roll
        self.age+=1
        if self.age>=dur:
            # A short extension can free the stance if contact prevented standing.
            if self.stage==6 and p[2]<.72:
                self.stages[self.stage+1:self.stage+1]=[('pose',180,None,{2:1.0}),('pose',100,None,{2:.78})]
            if typ=='align':self.y=float(p[1])
            self.stage+=1;self.age=0;self.start=self.a.copy()
        return self.a.copy()
