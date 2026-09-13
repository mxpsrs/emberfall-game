"""Derive a tinderbox-striking motion from the game's fitted CC0 kneeling clip."""
import base64,json,math,struct
from pathlib import Path
path=Path(__file__).resolve().parents[1]/'dist/assets/realms/models.js'
data=json.loads(path.read_text().removeprefix('const REALM_MODELS=').strip().removesuffix(';'))
for avatar in data['avatars'].values():
    source=avatar['clips']['bury'];raw=base64.b64decode(source['trs']);values=struct.unpack('<'+'f'*(len(raw)//4),raw)
    stride=len(avatar['rig']['names'])*10;frames=[];arm=avatar['rig']['names'].index('lowerarm_r')
    for frame in range(73):
        t=frame/30;phase=t/.45*.25 if t<.45 else .25+(.5*(t-.45)/1.65) if t<2.1 else .75+(t-2.1)/.3*.25
        f=min(source['frames']-1,max(0,phase*(source['frames']-1)));a=int(f);b=min(a+1,source['frames']-1);u=f-a
        pose=[]
        for joint in range(stride//10):
            p=list(values[a*stride+joint*10:a*stride+joint*10+10]);q=list(values[b*stride+joint*10:b*stride+joint*10+10])
            if sum(p[k]*q[k] for k in range(3,7))<0:
                for k in range(3,7):q[k]*=-1
            v=[x*(1-u)+y*u for x,y in zip(p,q)];length=math.sqrt(sum(v[k]**2 for k in range(3,7)))
            for k in range(3,7):v[k]/=length
            if joint==arm:
                angle=math.sin(t*16)*.16*min(1,t/.4,max(0,(2.4-t)/.3));s,c=math.sin(angle/2),math.cos(angle/2);x,y,z,w=v[3:7]
                v[3:7]=[x*c+w*s,y*c+z*s,z*c-y*s,w*c-x*s]
            pose.extend(v)
        frames.extend(pose)
    avatar['clips']['firemaking']={'duration':2.4,'frames':73,'source':'Fixing_Kneeling / fitted tinderbox strikes','trs':base64.b64encode(struct.pack('<'+'f'*len(frames),*frames)).decode()}
path.write_text('const REALM_MODELS='+json.dumps(data,separators=(',',':'))+';\n')
print('Built firemaking motion for both body types.')
