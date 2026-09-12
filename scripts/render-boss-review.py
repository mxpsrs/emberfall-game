"""Render exported, posed boss triangles for design review (no browser needed)."""
import json,math,pathlib,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont
root=pathlib.Path(sys.argv[1]);dest=pathlib.Path(sys.argv[2]);im=Image.new('RGB',(1500,1340),'#171e22');d=ImageDraw.Draw(im)
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
title=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',25)
d.text((28,23),'EMBERFALL  /  BOSS DESIGN DRAFTS',font=title,fill='#ead7ab')
d.text((28,59),'Actual 3D meshes · Standing poses · Pending your design feedback',font=font,fill='#a6b5b6')
items=[('boss_king','The Hollow King'),('boss_mossfang','Mossfang'),('boss_colossus','Runeforged Colossus'),('boss_warden','Crypt Warden'),('boss_sentinel','Ashwatch Sentinel'),('boss_cindermaw','Cindermaw'),('boss_scrapchief','Grik the Scrapchief'),('boss_briaroracle','Briar Oracle'),('boss_nightbloom','Nightbloom Sovereign')]
c=math.cos(.25);s=math.sin(.25);light=np.array([-.5,.8,1.]);light/=np.linalg.norm(light)
for n,(name,label) in enumerate(items):
 row,col=divmod(n,3);x0=col*500;y0=row*410+100;a=json.loads((root/('render-'+name+'.json')).read_text());p=np.array(a['p']).reshape(-1,3);tri=np.array(a['i']).reshape(-1,3);colors=np.array(a['c']).reshape(-1,3)
 u=p[:,0]*c-p[:,2]*s;depth=p[:,0]*s+p[:,2]*c;v=.22*depth-.97*p[:,1];scale=min(420/(u.max()-u.min()),300/(v.max()-v.min()));xy=np.c_[(u-(u.max()+u.min())/2)*scale+x0+250,(v-v.max())*scale+y0+346]
 d.rounded_rectangle([x0+10,y0+4,x0+490,y0+400],radius=12,fill='#242c30');d.ellipse([x0+105,y0+324,x0+395,y0+360],fill='#14191b')
 for face in sorted(tri,key=lambda t:np.mean(depth[t]+p[t,1]*.22)):
  norm=np.cross(p[face[1]]-p[face[0]],p[face[2]]-p[face[0]]);length=np.linalg.norm(norm)
  if not length:continue
  norm/=length;shade=.68+.32*abs(norm@light);rgb=(np.clip(colors[face].mean(0)*shade,0,1)*255).astype(int);d.polygon([tuple(q) for q in xy[face]],fill=tuple(rgb))
 d.text((x0+250,y0+374),label,font=font,fill='#ead7ab',anchor='mm')
dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest);print(dest)
