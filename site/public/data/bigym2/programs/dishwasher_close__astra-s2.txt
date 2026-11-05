"""Deterministic rack sweeps followed by a crouched, two-handed door lift."""
import numpy as np

class Policy:
 def reset(self,obs,tools):
  self.a=np.asarray(tools.hold_action(),dtype=float)
  self.phase=0;self.k=0
  # time, planar target, height, lean, left (pitch, elbow), right, roll, wrist
  self.seq=[
   (350,(.02,-.65,1.5708),.74,0,(.4,0),(.4,0),0,0),
   (120,(.02,-.54,1.5708),.74,.2,(-.4,.2),(.5,0),0,0),
   (340,(.85,-.54,1.5708),.74,.2,(-.4,.2),(.5,0),0,0),
   (120,(.85,-.68,1.5708),.74,0,(.4,0),(.5,0),0,0),
   (300,(.02,-.65,1.5708),.74,0,(.4,0),(.5,0),0,0),
   (120,(.02,-.54,1.5708),.74,.5,(-.5,1),(.5,0),0,0),
   (340,(.85,-.54,1.5708),.74,.5,(-.5,1),(.5,0),0,0),
   (150,(.85,-.75,1.5708),.74,0,(.4,0),(.4,0),0,0),
   (380,(-.35,-.75,0),.74,0,(.4,0),(.4,0),0,0),
   (270,(-.35,0,0),.74,0,(-.4,1.2),(-.4,1.2),.8,0),
   (130,None,.4,.8,(.1,.7),(.1,.7),.8,0),
   (130,(-.2,0,0),.4,.8,(-.8,1.3),(-.8,1.3),.3,0),
   (130,(-.15,0,0),.4,.8,(-1.2,1.7),(-1.2,1.7),0,-.6),
   (130,(-.1,0,0),.4,.8,(-1.8,1.6),(-1.8,1.6),0,0),
   (150,(-.1,0,0),.65,.5,(-1.6,1.3),(-1.6,1.3),0,0),
   (350,(.25,0,0),.74,.2,(-1,.8),(-1,.8),0,0),
  ]
 def act(self,obs,tools):
  dur,goal,h,p,l,r,roll,wrist=self.seq[min(self.phase,len(self.seq)-1)]
  a=self.a.copy(); target=a.copy()
  target[2]=h;target[4]=p;target[5:19]=0
  target[5]=l[0];target[8]=l[1];target[12]=r[0];target[15]=r[1]
  target[6]=roll;target[13]=-roll;target[10]=target[17]=wrist;target[19:]=1
  a[2:]+=np.clip(target[2:]-a[2:],-.025,.025)
  a[0]=a[1]=a[3]=0
  if goal is not None:
   x,y,z,th=obs['low_dim_obs'][21:25]
   err=np.array([goal[0]-x,goal[1]-y]); v=np.clip(err*2,-.3,.3)
   if np.linalg.norm(err)<.015:v[:]=0
   elif np.linalg.norm(v)<.065:v*=.065/np.linalg.norm(v)
   a[0]=np.cos(th)*v[0]+np.sin(th)*v[1];a[1]=-np.sin(th)*v[0]+np.cos(th)*v[1]
   a[3]=np.clip(2*((goal[2]-th+np.pi)%(2*np.pi)-np.pi),-.7,.7)
  self.a=a;self.k+=1
  if self.k>=dur and self.phase<len(self.seq)-1:self.phase+=1;self.k=0
  return a
