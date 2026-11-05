"""Deterministic visual rack alignment and staged, two-handed manipulation."""
import numpy as np
import cv2


def rack_features(im):
    r,g,b=im.astype(float).transpose(2,0,1)
    m=((r-g>7)&(g-b>7)&(r-b>22)&(r>65)).astype('uint8');m[50:]=0
    n,lab,st,cen=cv2.connectedComponentsWithStats(cv2.dilate(m,np.ones((3,3),np.uint8)))
    out=[]
    for i in range(1,n):
        if st[i,4]<25 or st[i,2]<9:continue
        ys,xs=np.where((lab==i)&(m>0))
        if len(xs)<12:continue
        out.append(((xs.min()+xs.max())*.5,float(np.percentile(ys,95)),int(xs.min()),int(xs.max())))
    return sorted(out)


def plate_features(im):
    r,g,b=im.astype(float).transpose(2,0,1)
    m=((abs(r-g)<2)&(abs(g-b)<2)&(r>70)).astype('uint8');m[26:]=0
    n,l,s,c=cv2.connectedComponentsWithStats(m)
    out=[]
    for i in range(1,n):
        x,y,w,h,a=s[i]
        if a<12 or h<7 or y>12:continue
        out.append((float(c[i,0]),int(a)))
    return sorted(out)

class Policy:
    def reset(self,obs,tools):
        self.a=np.asarray(tools.hold_action(),dtype=float);self.a[19:]=.6
        self.phase=0;self.age=0;self.target=np.array([-.085,.25,0.]);self.still=False
        self.source=np.array([.02,.21,.25]);self.dest=np.array([.08,-.22,0.])
    def nav(self,obs):
        p=obs['low_dim_obs'][21:25];d=self.target-p[[0,1,3]]
        v=np.clip(d[:2]*2,-.25,.25)
        for j in range(2):
            if abs(d[j])<.008:v[j]=0
            elif abs(v[j])<.06:v[j]=np.sign(v[j])*.06
        c,s=np.cos(p[3]),np.sin(p[3]);self.a[:2]=[c*v[0]+s*v[1],-s*v[0]+c*v[1]]
        self.a[3]=np.clip(d[2]*3,-.5,.5)
    def next(self):
        self.phase+=1;self.age=0
    def act(self,obs,tools):
        p=obs['low_dim_obs'][21:25];k=self.age;q=self.phase
        self.a[:2]=0;self.a[3]=0
        if q==0:
            self.nav(obs)
            if k>=170:self.next()
        elif q==1:
            if k>=35:
                im=tools.image('head');rs=rack_features(im);ps=plate_features(im)
                rs=[z for z in rs if z[3]-z[2]>20]
                if rs:
                    r=min(rs,key=lambda z:abs(z[0]-42));ps=[z for z in ps if r[2]-5<=z[0]<=r[3]+5]
                    self.source[0]=p[0]+.0095*(32-r[1])+.005
                if len(ps)>=2:
                    self.source[1]=p[1]+.0085*(23-ps[0][0]);self.source[2]=p[1]+.0085*(52-ps[-1][0])
                self.source[0]=np.clip(self.source[0],-.04,.14)
                self.target=np.array([self.source[0]-.20,self.source[1],0]);self.next()
        elif q==2:
            self.nav(obs)
            if k>=85:self.a[[5,12]]=-.4;self.a[[8,15]]=.4
            if k>=190:self.target[0]=self.source[0];self.next()
        elif q==3:
            self.nav(obs)
            if k>=170:self.next()
        elif q==4:
            if k==1:
                dx=np.clip(self.source[0]-.007-p[0],-.035,.05)
                dy=np.clip(self.source[1]-.01-p[1],-.04,.04)
                self.a[5]=-.4-dx/.20;self.a[8]=.4+1.3*dx/.20
                self.a[7]=dy/.28;self.a[11]=-dy/.28
            if k>=35:self.a[19]=1
            if k>=80:self.next()
        elif q==5:
            self.a[5]=-.85;self.a[8]=.55
            if k>=85:self.target=np.array([self.source[0]-.10,self.source[1],0]);self.next()
        elif q==6:
            self.nav(obs)
            if k>=95:self.target[1]=self.source[2];self.next()
        elif q==7:
            self.nav(obs)
            if k>=100:self.target[0]=self.source[0]+.005;self.next()
        elif q==8:
            self.nav(obs)
            if k>=145:self.next()
        elif q==9:
            if k==1:
                dx=np.clip(self.source[0]-.007-p[0],-.035,.05)
                dy=np.clip(self.source[2]-.005-p[1],-.04,.04)
                self.a[12]=-.4-dx/.20;self.a[15]=.4+1.3*dx/.20
                self.a[14]=dy/.28;self.a[18]=-dy/.28
            if k>=35:self.a[20]=1
            if k>=80:self.next()
        elif q==10:
            self.a[12]=-.85;self.a[15]=.55
            if k>=85:self.target=self.dest.copy();self.next()
        elif q==11:
            self.nav(obs)
            if k>=330:self.next()
        elif q==12:
            if k==35:
                rs=rack_features(tools.image('head'));rs=[z for z in rs if z[3]-z[2]>16]
                if rs:
                    r=min(rs,key=lambda z:abs(z[0]-42))
                    self.target=np.array([p[0]+.008*(35-r[1]),p[1]+.007*(42-r[0]),0])
            if k>=35:self.nav(obs)
            if k>=150:self.next()
        elif q==13:
            f=min(1,(k+1)/70);self.a[[5,12]]=-.85+.45*f;self.a[[8,15]]=.55-.15*f
            self.a[7]=-.3*f;self.a[14]=.3*f;self.a[11]=.3*f;self.a[18]=-.3*f
            if k>=100:self.next()
        elif q==14:
            self.a[2]=.74-.04*min(1,(k+1)/80)
            if k>=140:self.next()
        elif q==15:
            self.a[19:]=.6
            if k>=90:self.next()
        elif q==16:
            f=min(1,(k+1)/90)
            self.a[[5,12]]=-.4+.2*f;self.a[[8,15]]=.4-.1*f;self.a[2]=.70+.04*f
            if k>=120:self.a[19:]=0
        self.age+=1
        return self.a.copy()
