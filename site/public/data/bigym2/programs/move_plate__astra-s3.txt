"""Deterministic plate transfer with a guarded visual pickup recovery.

Only proprioception and the robot-mounted cameras are used. Motion is divided
into approach, grasp, lift, transfer, lowering, release, and withdrawal phases.
The recovery uses neutral-color plate rims and brown rack supports as visual
features; it contains no learned parameters or stored demonstration frames.
"""
import cv2
import numpy as np

class _Primary:
 def reset(self,obs,tools):
  self.a=np.asarray(tools.hold_action()).copy()
  self.a[18:]=0
 def move(self,a,obs,x,y):
  p=obs['low_dim_obs'][18:22];err=np.array([x-p[0],y-p[1]])
  v=np.clip(err*1.8,-.16,.16)
  if np.linalg.norm(err)<.012:v[:]=0
  elif np.linalg.norm(v)<.065:v*=.065/max(1e-6,np.linalg.norm(v))
  a[:2]=[np.cos(p[3])*v[0]+np.sin(p[3])*v[1],-np.sin(p[3])*v[0]+np.cos(p[3])*v[1]]
  a[3]=np.clip(-p[3]*2,-.25,.25)
 def act(self,obs,tools):
  t=obs['t'];a=self.a.copy();a[4]=-.15
  if t<260:self.move(a,obs,.08,.13)
  elif t<300:pass
  elif t<340:a[18]=1
  elif t<450:a[18]=1;a[4]=-.15-.50*(t-340)/110
  elif t<770:
   a[18]=1;a[4]=-.65;self.move(a,obs,.025,-.31)
  elif t<820:a[18]=1;a[4]=-.65
  elif t<890:
   a[18]=1;a[4]=-.65+.50*(t-820)/70
  elif t<960:a[18]=1
  else:
   a[18]=0
   if t>1010:self.move(a,obs,-.08,-.31)
  if t>=770:a[8]=.15*np.clip((t-770)/120,0,1)
  return a


class _Recovery:
 def reset(self,o,e):
  self.a=np.asarray(e.hold_action()).copy();self.a[18:]=0
  self.y=.13;self.roll=0;self.x=.08
  self.dx=.025;self.dy=-.31;self.delay=0;self.retries=0;self.retry_at=None
 def move(self,a,obs,x,y):
  p=obs['low_dim_obs'][18:22];err=np.array([x-p[0],y-p[1]])
  v=np.clip(err*1.8,-.16,.16)
  if np.linalg.norm(err)<.012:v[:]=0
  elif np.linalg.norm(v)<.065:v*=.065/max(1e-6,np.linalg.norm(v))
  a[:2]=[np.cos(p[3])*v[0]+np.sin(p[3])*v[1],-np.sin(p[3])*v[0]+np.cos(p[3])*v[1]]
  a[3]=np.clip(-p[3]*2,-.25,.25)
 def detect(self,im):
  f=im.astype(float);m=((f.min(2)>175)&(f.max(2)-f.min(2)<25)).astype('uint8');m[:,:2]=0;m[:,82:]=0
  n,l,stats,c=cv2.connectedComponentsWithStats(m)
  ids=[i for i in range(1,n) if stats[i,4]>8 and stats[i,3]>12]
  if not ids:return None
  k=max(ids,key=lambda i:stats[i,3]);ys,xs=np.where(l==k)
  return float(np.median(xs)),float(np.max(ys))
 def rack(self,im):
  f=im.astype(float)
  m=(f[:,:,0]>f[:,:,1]*1.10)&(f[:,:,1]>f[:,:,2]*1.13)&(f[:,:,0]>65)
  m[60:]=False
  ys,xs=np.where(m)
  if len(xs)<20:return None
  return float(np.max(xs)),float(np.max(ys))
 def act(self,o,e):
  t=o['t']-self.delay;a=self.a.copy();a[4]=-.15;a[5]=self.roll
  if t==650 and self.retry_at is None and self.retries<2 and max(o['low_dim_obs'][7:9])<-.0193:
   self.retry_at=o['t'];self.retry_x=float(o['low_dim_obs'][18]+.032);self.retry_y=float(o['low_dim_obs'][19]);self.retries+=1
  if self.retry_at is not None:
   k=o['t']-self.retry_at
   if k<110:
    if k>=15 and k<70:self.move(a,o,self.retry_x,self.retry_y)
    if k>=70:a[18]=1
    return a
   self.delay+=110;self.retry_at=None;t=o['t']-self.delay
  if t==750:self.dy=-.31-.3*self.roll
  if 900<=t<1100 and t%20==0:
   r=self.rack(e.image('head'))
   if r:
    self.dx=float(np.clip(o['low_dim_obs'][18]+(31-r[1])*.006,-.12,.15))
    self.dy=float(np.clip(o['low_dim_obs'][19]+(50-40*self.roll-r[0])*.006,-.65,-.1))
  if t<480:
   a[4]=-.25 if t<240 else -.15
   if t>=100 and t%15==0:
    det=self.detect(e.image('left_wrist'))
    if det:
     target=o['low_dim_obs'][19]+np.clip((50-det[0])*.003,-.07,.07)
     self.y=.3*self.y+.7*target
     if t>310:
      target=o['low_dim_obs'][18]+np.clip((82-det[1])*.002,-.025,.025)
      self.x=float(np.clip(.5*self.x+.5*target,-.02,.18))
   self.move(a,o,-.07 if t<240 else self.x,self.y)
  elif t<610:pass
  elif t<650:a[18]=1
  elif t<750:
   f=min(1,(t-650)/50);a[18]=1;a[4]=-.15-.50*f;a[9]=0
  elif t<1100:
   a[18]=1;a[4]=-.65;a[9]=0;self.move(a,o,self.dx,self.dy)
  elif t<1150:a[18]=1;a[4]=-.65;a[9]=0
  elif t<1250:
   a[18]=1;a[4]=-.65+.5*(t-1150)/100;a[9]=0
  elif t<1300:a[18]=1
  else:
   a[18]=0
   if t>1360:self.move(a,o,self.dx-.14,self.dy)
  if 700<=t<750:a[8]=1.2*(t-700)/50
  elif 750<=t<1100:a[8]=1.2
  elif 1100<=t<1150:a[8]=1.2-.9*(t-1100)/50
  elif t>=1150:a[8]=.30
  return a


class Policy:
    def reset(self, obs, tools):
        self.primary = _Primary()
        self.primary.reset(obs, tools)
        self.recovery = None
        self.recovery_start = 0

    def act(self, obs, tools):
        # A fully closed, unobstructed pair of fingers indicates a missed grip.
        # Restart the visual approach early enough to retain time for release.
        if obs["t"] == 340 and max(obs["low_dim_obs"][7:9]) < -0.0193:
            self.recovery_start = int(obs["t"])
            self.recovery = _Recovery()
            local = dict(obs)
            local["t"] = 0
            self.recovery.reset(local, tools)
        if self.recovery is not None:
            local = dict(obs)
            local["t"] = int(obs["t"]) - self.recovery_start
            return self.recovery.act(local, tools)
        return self.primary.act(obs, tools)
