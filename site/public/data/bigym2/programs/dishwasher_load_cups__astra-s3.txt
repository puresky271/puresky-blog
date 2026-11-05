"""Deterministic visual servoing for the two dishwasher mugs."""
import cv2
import numpy as np

class Policy:
    def reset(self, obs, tools):
        self.a = np.asarray(tools.hold_action(), dtype=np.float32)
        self.a[19:] = .3
        self.a[5:12] = [-.35,.2,0,0,0,-.05,0]
        self.a[12:19] = [-.35,0,.4,0,0,.15,0]
        self.carry = None
        self.phase=0;self.phase_start=0;self.lift_start=None;self.search_pose=None;self.last_cup=None;self.grip_count=0

    @staticmethod
    def cup(im, side):
        hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV)
        mask=((hsv[:,:,1]<40)&(hsv[:,:,2]>65)&(hsv[:,:,2]<245)).astype('uint8')
        mask[80:]=0; mask[:,:5]=0; mask[:,79:]=0
        _,_,st,_=cv2.connectedComponentsWithStats(mask)
        cand=[]
        for x,y,w,h,area in st[1:]:
            if area>150 and h>12 and w>8 and w<=74 and y<60:
                cand.append((x+w/2,y+h,w,h,area))
        return min(cand,key=lambda z:-z[4] if side==0 else abs(z[0]-42)) if cand else None


    @staticmethod
    def handle(im,z):
     x,y,w,h,area=z;y0=max(4,int(y-h)+max(6,int(h*.22)));y1=min(y0+10,int(y)-6)
     if y1<=y0+3:return x
     hsv=cv2.cvtColor(im,cv2.COLOR_RGB2HSV);v=hsv[:,:,2].astype(float)
     m=((hsv[:,:,1]<40)&(v>70)&(v<245)).astype('uint8')
     row=(m[y0:y1].mean(axis=0)>.5).astype('uint8')[None,:]
     row=cv2.morphologyEx(row,cv2.MORPH_CLOSE,np.ones((1,9),np.uint8))
     n,la,st,ce=cv2.connectedComponentsWithStats(row)
     cand=[r for r in st[1:] if r[2]>12]
     if not cand:return x
     r=max(cand,key=lambda r:r[2]);l=r[0]+3;rr=r[0]+r[2]-3
     p=v[y0:y1].mean(axis=0);hi=cv2.GaussianBlur(p[None,:],(0,0),.7)[0];lo=cv2.GaussianBlur(p[None,:],(0,0),6)[0];score=hi-lo
     score[:l]=-100;score[rr:]=-100;i=int(np.argmax(score))
     return i if score[i]>7 else x

    def act(self, obs, tools):
        t=obs['t']; a=self.a; p=obs['low_dim_obs'][21:25]
        if self.phase < 2:
            side=self.phase; k=t-self.phase_start; j=5+7*side
            if k==0 and side==1:
                a[12:19]=[-.35,0,.4,0,0,.15,0]
            a[:2]=0; a[3]=0
            if self.lift_start is not None:
                f=min(1.,(t-self.lift_start)/40.)
                a[j]=self.grasp_pose[j]-.35*f
                a[j+5]=self.grasp_pose[j+5]+.35*f
                if side==0:a[j+1]=self.grasp_pose[j+1]+.10*f
                if f>=1:
                    self.phase+=1;self.phase_start=t+1;self.lift_start=None
                    self.last_cup=None;self.search_pose=None
                return a.copy()
            if 80<k<250:
                dx=(.055 if side==0 else .19)-p[0]
                a[0]=np.clip(2*dx,-.1,.1) if abs(dx)>.012 else 0
                if 0<abs(a[0])<.06:a[0]=np.sign(a[0])*.06
                a[3]=np.clip(-p[3]*3,-.3,.3)
                if side==1:a[1]=np.clip(2*(-.61-p[1]),-.08,.08)
            if 80<=k<330 and k%10==0:
                im=tools.image(['left_wrist','right_wrist'][side])
                z=self.cup(im,side)
                if z:
                    self.last_cup=z
                    cx=z[0]
                    a[j+6]+=np.clip(.003*(42-cx),-.045,.045)
                    a[j+5]+=np.clip(.003*(z[1]-52),-.045,.045)
            if 250<=k<330 and self.last_cup is not None:
                if self.last_cup[4]<1900 and p[0]<(.2 if side==0 else .3):
                    a[0]=.07;a[3]=np.clip(-p[3]*3,-.3,.3)
            if k>=330:
                a[19+side]=1
                self.grip_count = self.grip_count+1 if .75<obs['low_dim_obs'][50+side]<.85 else 0
                if self.grip_count>=10:
                    self.lift_start=t;self.grasp_pose=a.copy()
                    a[:2]=0;a[3]=0
                elif k>=350:
                    if self.search_pose is None:self.search_pose=a.copy()
                    u=k-350
                    if u<80:
                        a[19+side]=.3
                        if u>=10 and u%10==0:
                            im=tools.image(['left_wrist','right_wrist'][side])
                            z=self.cup(im,side)
                            if z:
                                self.last_cup=z
                                cx=self.handle(im,z)
                                a[j+6]+=np.clip(.003*(42-cx),-.035,.035)
                                a[j+5]+=np.clip(.003*(z[1]-52),-.035,.035)
                        if u<60 and self.last_cup is not None and self.last_cup[4]<2500:
                            a[0]=.065;a[3]=np.clip(-p[3]*3,-.3,.3)
                        self.search_pose=a.copy()
                    elif u<110:
                        a[19+side]=1
                    else:
                        cycle=min((u-110)//50,2);tick=(u-110)%50
                        a[19+side]=.3 if tick<18 else 1
                        d=[0,-.16,.16][cycle]
                        dz=[.12,-.08,-.08][cycle]
                        a[j+2]=self.search_pose[j+2]+d
                        a[j+6]=self.search_pose[j+6]+d
                        a[j]=self.search_pose[j]+dz
                        a[j+5]=self.search_pose[j+5]-dz
                    if u>=250:
                        a[19+side]=1
                        self.lift_start=t;self.grasp_pose=a.copy();a[:2]=0;a[3]=0
        else:
            k=t-self.phase_start
            if self.carry is None:self.carry=a.copy()
            start=self.carry; yaw=p[3]
            if k<360:
                delta=np.array([.28,-.45])-p[:2];v=delta*1.5;n=np.linalg.norm(v)
                if n>.15:v*=.15/n
                if np.linalg.norm(delta)<.025:v*=0
                elif n<.065:v*=.065/(n+1e-9)
                a[:2]=np.array([[np.cos(yaw),np.sin(yaw)],[-np.sin(yaw),np.cos(yaw)]])@v
                a[3]=np.clip(2*(1.57-yaw),-.55,.55)
            else:a[:2]=0;a[3]=0
            if 290<=k<380:
                f=(k-290)/89
                a[6]=start[6]*(1-f)
                a[7]=-.5*f
                a[14]=start[14]*(1-f)+.2*f
            if 390<=k<540:
                f=(k-390)/150;a[2]=.74-.10*f
                for j in [5,12]:a[j+3]=start[j+3]+.8*f;a[j+5]=start[j+5]-.8*f
            if k==570:a[19:]=0
            if 590<=k<650:
                a[19:]=.4
                f=(k-590)/59
                for j in [5,12]:
                    a[j]=start[j]+.45*f
                    a[j+5]=start[j+5]-.8-.45*f
            if 660<=k<730:a[2]=.64+.10*(k-660)/70
        return a.copy()
