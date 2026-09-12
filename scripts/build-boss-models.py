"""Build dedicated boss geometry on Emberfall's existing, licensed skeletons.

node scripts/export-boss-rigs.cjs /tmp/emberfall-boss-rigs
python scripts/build-boss-models.py /tmp/emberfall-boss-rigs
The Colossus and Sovereign have entirely new bodies. Other bosses retain their
source anatomy under new fitted armor, crowns, mantles, weapons and growths.
"""
import base64, hashlib, json, math, pathlib, sys
import numpy as np

ROOT=pathlib.Path(__file__).resolve().parents[1]
RIGS=pathlib.Path(sys.argv[1])
def packed(a,dtype='<f4'):return base64.b64encode(np.asarray(a,dtype=dtype).tobytes()).decode()
def color(value):return np.array([int(value[i:i+2],16)/255 for i in (1,3,5)])
def affine(m):return np.r_[np.array(m).reshape(3,4),[[0,0,0,1]]]

class Model:
 def __init__(self,base,keep=True,tint=(1,1,1)):
  self.base=base;self.a=json.loads((RIGS/(base+'.json')).read_text());a=self.a;m=a['mesh'];self.H=m['bounds'][1][1]-m['bounds'][0][1]
  self.palette=np.asarray(a['palette']).reshape(-1,3,4);self.bind=np.asarray(a['rig']['bind']).reshape(-1,3,4)
  self.vertices=[];self.normals=[];self.colors=[];self.material=[];self.uv=[];self.joints=[];self.weights=[];self.indices=[]
  if keep:
   self.vertices=np.asarray(m['p']).reshape(-1,3).tolist();self.normals=np.asarray(m['n']).reshape(-1,3).tolist();self.colors=(np.asarray(m['f']).reshape(-1,3)*tint).clip(0,1).tolist();self.material=[20]*len(self.vertices);self.uv=np.asarray(m['uv']).reshape(-1,2).tolist();self.joints=np.asarray(m['j']).reshape(-1,4).tolist();self.weights=np.asarray(m['w']).reshape(-1,4).tolist();self.indices=list(m['i'])
   # Remove the old handheld prop; boss weapons are fitted to the same hand.
   weapon=[i for i,j in enumerate(a['rig']['deforms']) if any(s in a['rig']['names'][j] for s in ['Weapon_','_Mace','_Stick'])]
   if weapon:self.indices=[v for face in np.asarray(self.indices).reshape(-1,3) if not all(self.joints[v][0] in weapon for v in face) for v in face]
 def bone(self,name):
  a=self.a;node=a['rig']['names'].index(name);return a['rig']['deforms'].index(node)
 def joint(self,name):
  b=self.bone(name);return (affine(self.palette[b])@np.linalg.inv(affine(self.bind[b])))[:3,3]/self.H
 def face(self,points,shade,bone):
  unique=[]
  for point in points:
   if not any(np.linalg.norm(np.asarray(point)-q)<1e-8 for q in unique):unique.append(np.asarray(point))
  if len(unique)<3:return
  points=np.asarray(unique);n=np.cross(points[1]-points[0],points[2]-points[0]);length=np.linalg.norm(n)
  if length<1e-9:return
  n/=length;inv=np.linalg.inv(affine(self.palette[self.bone(bone)]));start=len(self.vertices)
  for p in points:
   self.vertices.append((inv@np.r_[p*self.H,1])[:3].tolist());normal=inv[:3,:3]@n;normal/=np.linalg.norm(normal);self.normals.append(normal.tolist());self.colors.append(np.asarray(shade).clip(0,1).tolist());self.material.append(20);self.uv.append([0,0]);self.joints.append([self.bone(bone),0,0,0]);self.weights.append([1,0,0,0])
  for i in range(1,len(points)-1):self.indices.extend([start,start+i,start+i+1])
 def orb(self,center,size,shade,bone,segments=10,rings=6):
  center=np.asarray(center);size=np.asarray(size);shade=color(shade) if isinstance(shade,str) else shade
  for row in range(rings):
   for col in range(segments):
    pts=[]
    for lat,lon in [(row,col),(row+1,col),(row+1,col+1),(row,col+1)]:
     a=math.pi*lat/rings;b=2*math.pi*lon/segments;pts.append(center+size*np.array([math.sin(a)*math.cos(b),math.cos(a),math.sin(a)*math.sin(b)]))
    self.face(pts,shade*(.9+.1*((col*7+row*3)%5)/4),bone)
 def beam(self,start,end,radius,shade,bone,end_radius=None,sides=7):
  start=np.asarray(start);end=np.asarray(end);direction=end-start;length=np.linalg.norm(direction)
  if length<1e-8:return
  direction/=length;u=np.cross(direction,[0,1,0] if abs(direction[1])<.9 else [1,0,0]);u/=np.linalg.norm(u);v=np.cross(direction,u);end_radius=radius if end_radius is None else end_radius;shade=color(shade) if isinstance(shade,str) else shade
  rings=[]
  for t,r in [(0,radius*.84),(.12,radius),( .84,end_radius),(1,end_radius*.78)]:rings.append([start+(end-start)*t+(u*math.cos(i/sides*2*math.pi)+v*math.sin(i/sides*2*math.pi))*r for i in range(sides)])
  for k in range(3):
   for i in range(sides):j=(i+1)%sides;self.face([rings[k][i],rings[k+1][i],rings[k+1][j],rings[k][j]],shade*(.9+.1*(i%3)/2),bone)
  self.face(rings[0][::-1],shade*.8,bone);self.face(rings[-1],shade,bone)
 def spike(self,start,end,radius,shade,bone):self.beam(start,end,radius,shade,bone,0.001,6)
 def crown(self,center,radius,shade,bone,points=7):
  center=np.asarray(center)
  for i in range(points):
   a=i/points*math.tau;b=(i+1)/points*math.tau;p=center+[math.cos(a)*radius,0,math.sin(a)*radius];q=center+[math.cos(b)*radius,0,math.sin(b)*radius];self.beam(p,q,.018,shade,bone);self.spike(p,p+[math.cos(a)*.03,.12+(i%2)*.035,math.sin(a)*.03],.029,shade,bone)
 def robe(self,bone,top,bottom,radius,shade):
  for i in range(12):
   a=i/12*math.tau;b=(i+1)/12*math.tau;pts=[[math.cos(a)*radius*.65,top,math.sin(a)*radius*.65-.06],[math.cos(a)*radius,bottom+(i%2)*.055,math.sin(a)*radius-.06],[math.cos(b)*radius,bottom+((i+1)%2)*.055,math.sin(b)*radius-.06],[math.cos(b)*radius*.65,top,math.sin(b)*radius*.65-.06]];self.face(pts,color(shade)*(1-.1*(i%3)),bone)
 def finish(self,height):
  n=len(self.vertices);assert n<65536
  mesh={'p':packed(self.vertices),'n':packed(np.clip(self.normals,-1,1)*127,'i1'),'c':packed(np.clip(self.colors,0,1)*255,'u1'),'f':packed(np.clip(self.colors,0,1)*255,'u1'),'uv':packed(self.uv),'t':packed(self.material,'u1'),'j':packed(self.joints,'u1'),'w':packed(np.clip(self.weights,0,1)*255,'u1'),'i':packed(self.indices,'<u2'),'bounds':self.a['mesh']['bounds']}
  return {'base':self.base,'mesh':mesh,'height':height,'scale':height/self.H,'vertices':n,'triangles':len(self.indices)//3}

out={}
def armored(kind,theme):
 m=Model('skeleton',tint=(.82,.83,.77));head=m.joint('Head');torso=m.joint('Torso');metal,gold,cloth=theme
 m.orb(torso+[0,-.04,0],[.21,.18,.115],metal,'Torso');m.orb(torso+[0,-.025,.09],[.09,.10,.042],gold,'Torso',8,4)
 for side,sign in [('L',1),('R',-1)]:
  shoulder=m.joint('UpperArm.'+side);elbow=m.joint('LowerArm.'+side);hand=m.joint('Middle1.'+side)
  m.orb(shoulder+[sign*.025,.015,0],[.12,.073,.11],metal,'UpperArm.'+side,8,4);m.beam(elbow,hand,.057,metal,'LowerArm.'+side,.073)
  for i in range(3):m.spike(shoulder+[sign*(.025+i*.026),.06,-.04+i*.045],shoulder+[sign*(.065+i*.034),.145+i*.014,-.065+i*.05],.025,gold,'UpperArm.'+side)
  foot=m.joint('Foot.'+side);m.orb(foot+[0,.035,.045],[.085,.055,.15],metal,'Foot.'+side,8,4)
 m.robe('Body',.39,.04,.23,cloth);m.robe('Torso',.53,.14,.26,cloth)
 hand=m.joint('Middle1.L');m.beam(hand+[0,-.15,0],hand+[0,.22,0],.022,gold,'Middle1.L');m.beam(hand+[-.1,.13,0],hand+[.1,.13,0],.018,gold,'Middle1.L');m.spike(hand+[0,.15,0],hand+[0,.62,0],.065,metal,'Middle1.L')
 if kind=='king':m.crown(head+[0,.15,0],.15,gold,'Head',9);m.orb(head+[0,.19,.14],[.026,.04,.018],'#a66bcc','Head',6,4)
 elif kind=='warden':
  m.orb(head+[0,.07,-.04],[.18,.16,.16],metal,'Head',8,4);m.orb(head+[0,.055,.115],[.14,.17,.045],gold,'Head',8,4);m.beam(head+[-.105,.09,.163],head+[.105,.09,.163],.011,'#81a687','Head')
  p=m.joint('Middle1.R');m.orb(p+[0,.13,.02],[.14,.24,.035],metal,'Middle1.R',8,4);m.beam(p+[0,-.02,.065],p+[0,.3,.065],.018,gold,'Middle1.R')
 else:
  m.orb(head+[0,.07,.015],[.17,.15,.14],metal,'Head',8,4);m.beam(head+[-.12,.1,.14],head+[.12,.1,.14],.014,'#72c1d3','Head');m.spike(head+[0,.18,-.035],head+[0,.37,-.1],.09,gold,'Head')
 return m
out['boss_king']=armored('king',('#3d414d','#b59951','#4e263f')).finish(3.1)
out['boss_warden']=armored('warden',('#4b534d','#98805c','#303c36')).finish(2.65)
out['boss_sentinel']=armored('sentinel',('#485368','#a58c5c','#384950')).finish(3.0)

# An ancient wolf with a grown bark mantle and a branching antler silhouette.
m=Model('wolf',tint=(.58,.65,.49));head=m.joint('Head');neck=m.joint('Neck3')
for side in [-1,1]:
 start=head+[side*.09,.03,-.08];mid=start+[side*.15,.22,-.13];tip=mid+[side*.1,.26,-.17];m.beam(start,mid,.04,'#78644b','Head',.023);m.spike(mid,tip,.026,'#c4b292','Head')
 for n in range(2):p=mid+(tip-mid)*n*.4;m.spike(p,p+[side*.14,.07,.02],.018,'#b8a583','Head')
 m.spike(head+[side*.075,-.07,.18],head+[side*.075,-.26,.22],.035,'#e3d4ae','Head')
for row in range(5):
 for side in [-1,1]:p=neck+[side*.11,.04-row*.024,-.06-row*.06];m.orb(p,[.075,.10,.09],'#465443','Neck3',6,4);m.spike(p,p+[side*.13,.09,-.12],.05,'#696047','Neck3')
out['boss_mossfang']=m.finish(1.85)

# Entirely new segmented forge construct and branching forest sovereign bodies.
for name,wood in [('colossus',False),('nightbloom',True)]:
 m=Model('king',keep=False);dark='#4b5158' if not wood else '#4e493b';light='#8b8d82' if not wood else '#817550';glow='#72cddd' if not wood else '#c987cf';head=m.joint('Head');chest=m.joint('spine_03');pelvis=m.joint('pelvis')
 m.orb(chest+[0,.0,0],[.24,.18,.17],dark,'spine_03',10,5);m.orb(pelvis,[.16,.10,.13],dark,'pelvis',8,4)
 m.orb(chest+[0,.025,.15],[.085,.1,.045],light,'spine_03',8,4);m.orb(chest+[0,.025,.187],[.052,.065,.028],glow,'spine_03',8,4)
 m.orb(head+[0,.09,.005],[.14,.16,.135],dark,'Head',8,5)
 for sign in [-1,1]:m.orb(head+[sign*.053,.12,.12],[.022,.013,.012],glow,'Head',6,4)
 for side,sign in [('l',1),('r',-1)]:
  arm=m.joint('upperarm_'+side);elbow=m.joint('lowerarm_'+side);hand=m.joint('hand_'+side);hip=m.joint('thigh_'+side);knee=m.joint('calf_'+side);foot=m.joint('foot_'+side)
  shoulder=arm+[sign*.09,.015,0];m.orb(shoulder,[.15,.12,.14],light,'upperarm_'+side,7,4)
  for a,b,bone,r in [(arm,elbow,'upperarm_'+side,.09),(elbow,hand,'lowerarm_'+side,.115),(hip,knee,'thigh_'+side,.105),(knee,foot,'calf_'+side,.095)]:
   m.beam(a,b,r,dark,bone,r*.85);mid=(a+b)*.5;m.orb(mid,[r*1.1,r*.65,r*1.1],light,bone,7,4)
  m.orb(hand+[0,-.02,.015],[.13,.11,.12],dark,'hand_'+side,7,4);m.orb(foot+[0,.02,.06],[.12,.07,.18],dark,'foot_'+side,8,4)
  for i in range(3):m.spike(hand+[(i-1)*.055,-.055,.055],hand+[(i-1)*.08,-.19,.14],.026,light,'hand_'+side)
  if wood:
   root=shoulder+[0,.09,0];tip=root+[sign*.22,.3,-.1];m.beam(root,tip,.045,light,'upperarm_'+side,.01)
   for n in range(3):p=root+(tip-root)*(.25+n*.22);m.spike(p,p+[sign*.1,.13,.09*(-1)**n],.025,light,'upperarm_'+side);m.orb(p+[sign*.03,.12,0],[.115,.055,.08],'#565267','upperarm_'+side,7,4)
  else:
   for n in range(3):p=shoulder+[sign*.065,.08,-.09+n*.08];m.spike(p,p+[sign*.065,.15,.015],.045,'#ac9a71','upperarm_'+side)
 if wood:
  for sign in [-1,1]:p=head+[sign*.09,.19,-.04];q=p+[sign*.17,.27,-.08];m.beam(p,q,.038,light,'Head',.016);m.spike(q,q+[sign*.11,.12,.06],.02,light,'Head');m.spike(q-[sign*.04,.07,0],q+[sign*.11,.04,-.14],.022,light,'Head')
 else:
  m.crown(head+[0,.2,0],.11,'#a99566','Head',4)
  for y in [.47,.53,.59]:m.beam([-.13,y,.13],[.13,y,.13],.01,glow,'spine_03')
 out['boss_'+name]=m.finish(3.8 if not wood else 3.65)

m=Model('goblin',tint=(.8,.77,.59));head=m.joint('Head');chest=m.joint('spine_03')
m.orb(chest,[.24,.18,.16],'#655c47','spine_03',8,4);m.crown(head+[0,.23,0],.15,'#ad8e52','Head',5)
for side in ['l','r']:
 p=m.joint('upperarm_'+side);m.orb(p,[.18 if side=='l' else .12,.09,.14],'#74766c','upperarm_'+side,7,4)
 for i in range(3):m.spike(p+[(i-1)*.05,.065,0],p+[(i-1)*.075,.18,-.04],.025,'#b8a788','upperarm_'+side)
p=m.joint('hand_l');m.beam(p+[0,-.12,0],p+[0,.2,0],.022,'#856745','hand_l');m.beam(p+[-.15,.13,.0],p+[.15,.13,.0],.038,'#555f64','hand_l')
out['boss_scrapchief']=m.finish(2.25)

m=Model('skeleton',tint=(.58,.64,.51));head=m.joint('Head');m.robe('Body',.45,.01,.25,'#343e37');m.robe('Torso',.57,.22,.28,'#59604d');m.crown(head+[0,.14,0],.19,'#807356','Head',6)
for sign in [-1,1]:m.spike(head+[sign*.14,.18,-.02],head+[sign*.32,.39,-.08],.04,'#9f946e','Head')
p=m.joint('Middle1.L');m.beam(p+[0,-.24,0],p+[0,.70,0],.026,'#73614a','Middle1.L',.018);m.orb(p+[0,.67,0],[.066,.09,.066],'#b090bd','Middle1.L',7,4)
out['boss_briaroracle']=m.finish(2.75)

m=Model('slime',keep=False);head=m.joint('Head')
m.orb([0,.43,0],[.56,.43,.57],'#634737','Body',14,8)
for ring in range(3):
 for i in range(10):
  a=i/10*math.tau;p=np.array([math.cos(a)*(.56-ring*.13),.43+ring*.23,math.sin(a)*(.56-ring*.13)]);bone='Head' if ring>1 else 'Body';m.orb(p,[.145,.13,.15],'#484643',bone,7,4);m.spike(p,p+[math.cos(a)*.1,.21,math.sin(a)*.1],.065,'#99664a',bone)
m.orb([0,.4,.56],[.29,.14,.065],'#201d19','Head',10,5)
for sign in [-1,1]:
 m.orb([sign*.18,.66,.48],[.07,.038,.025],'#ee9a46','Head',7,4)
 for x in [.11,.24]:m.spike([sign*x,.49,.615],[sign*x,.34,.66],.035,'#c9b893','Head');m.spike([sign*x,.29,.605],[sign*x,.40,.66],.032,'#c9b893','Head')
for sign in [-1,1]:
 m.orb([sign*.38,.12,.35],[.16,.1,.18],'#514b42','Body',7,4);m.orb([sign*.38,.12,-.35],[.16,.1,.18],'#514b42','Body',7,4)
out['boss_cindermaw']=m.finish(2.1)

dest=ROOT/'dist/assets/realms/bosses.js';dest.write_text('const BOSS_MODELS='+json.dumps(out,separators=(',',':'))+';\n')
record={'note':'Dedicated boss geometry assembled on the existing game skeletons. Two entirely new construct bodies; seven anatomical derivatives with fitted modeled equipment and silhouettes. No new pack download is required. Cast and ranged upper-body actions use the existing authored motion library.','source':'Existing Quaternius assets documented in dist/assets/realms/CREDITS.txt and BESTIARY-LICENSE.txt','models':{k:{'base_rig':v['base'],'vertices':v['vertices'],'triangles':v['triangles'],'height_tiles':v['height']} for k,v in out.items()},'asset_sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
(ROOT/'docs/boss-models.json').write_text(json.dumps(record,indent=2)+'\n');print('Built',len(out),'dedicated boss meshes,',dest.stat().st_size,'bytes')
