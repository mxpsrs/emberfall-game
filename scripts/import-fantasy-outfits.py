"""Import the CC0 Standard fantasy outfits onto Veldren's two existing rigs.
Usage: python scripts/import-fantasy-outfits.py /path/to/extracted/pack
The optional hood is exported independently; no headgear is baked into clothing.
"""
import base64, hashlib, importlib.util, json, pathlib, sys
import numpy as np
from PIL import Image
ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('motion',ROOT/'scripts/import-authored-motion.py')
motion=importlib.util.module_from_spec(spec);spec.loader.exec_module(motion)
def unpack(s,dtype='<f4'):return np.frombuffer(base64.b64decode(s),dtype=dtype)
def build(cache):
 dest=ROOT/'dist/assets/realms/models.js';world=json.loads(dest.read_text().split('=',1)[1].rstrip(';\n'));provenance=[]
 for sex,avatar in world['avatars'].items():
  tb=unpack(avatar['rig']['bind']).reshape(-1,3,4);tr=np.linalg.inv(np.concatenate([tb,np.tile([[[0,0,0,1]]],(len(tb),1,1))],axis=1));target_names=avatar['rig']['names']
  for outfit in ['Peasant','Ranger']:
   for part in ['Body','Arms','Legs','Feet']+(['Head_Hood']if outfit=='Ranger' else []):
    paths=list(cache.rglob(sex.capitalize()+'_'+outfit+'_'+part+'.gltf')) or list(cache.rglob(sex.capitalize()+'_'+outfit+'_'+part+'_Boots.gltf'));path=paths[0];g=motion.Gltf(path);skin=g.g['skins'][0];sb=g.acc(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1);names=[g.nodes[j]['name']for j in skin['joints']];mapping=np.array([target_names.index(n)for n in names]);warp=tr[mapping]@sb
    arrays={k:[]for k in ['p','n','c','j','w','i','skin','dye']};count=0
    for mesh in g.g['meshes']:
     for pr in mesh['primitives']:
      attr=pr['attributes'];p=g.acc(attr['POSITION']).astype(float);n=g.acc(attr['NORMAL']).astype(float);uv=g.acc(attr['TEXCOORD_0']);joint=g.acc(attr['JOINTS_0']).astype(int);weight=g.acc(attr['WEIGHTS_0']).astype(float);weight/=weight.sum(1)[:,None]
      matrices=(warp[joint]*weight[:,:,None,None]).sum(1);p=np.einsum('nab,nb->na',matrices,np.c_[p,np.ones(len(p))])[:,:3];n=np.einsum('nab,nb->na',np.linalg.inv(matrices[:,:3,:3]).transpose(0,2,1),n);n/=np.maximum(1e-8,np.linalg.norm(n,axis=1)[:,None])
      mat=g.g['materials'][pr['material']];tex=g.g['textures'][mat['pbrMetallicRoughness']['baseColorTexture']['index']];image=g.g['images'][tex['source']];pixels=np.asarray(Image.open(path.parent/image['uri']).convert('RGB'))/255
      color=pixels[np.clip((uv[:,1]*pixels.shape[0]).astype(int),0,pixels.shape[0]-1),np.clip((uv[:,0]*pixels.shape[1]).astype(int),0,pixels.shape[1]-1)]
      # Preserve the author's leather/metal, tint only the textile. Exposed
      # hands/forearms use the same skin palette as the receiving character.
      is_skin=np.full(len(p),'Regular' in mat['name']);is_skin|=(abs(p[:,0])>.68)&(part=='Arms')
      if outfit=='Ranger':dye=(color[:,1]>color[:,0]*1.10)&(color[:,1]>color[:,2]*1.12)
      else:dye=(np.max(color,1)-np.min(color,1)<.25)&(np.mean(color,1)>.23)
      dye&=~is_skin
      arrays['p'].append(p);arrays['n'].append(n);arrays['c'].append(color);arrays['j'].append(mapping[joint]);arrays['w'].append(weight);arrays['i'].append(g.acc(pr['indices']).ravel()+count);arrays['skin'].append(is_skin);arrays['dye'].append(dye);count+=len(p)
    a={k:np.concatenate(v)for k,v in arrays.items()};assert count<65536
    # Keep rounded feet just above the floor, without changing leg proportions.
    a['p'][:,1]=np.maximum(a['p'][:,1],.003)
    out={k:motion.packed(v,dtype)for k,v,dtype in [('p',np.rint(a['p']*10000),'<i2'),('n',np.rint(a['n']*127),'i1'),('c',np.rint(a['c']*255),'u1'),('j',a['j'],'u1'),('w',np.rint(a['w']*255),'u1'),('i',a['i'],'<u2'),('skin',a['skin'],'u1'),('dye',a['dye'],'u1')]};out['pScale']=.0001;out['bounds']=[a['p'].min(0).tolist(),a['p'].max(0).tolist()];out['outfitPart']=part
    key='Outfit_'+outfit+'_'+part;world['armor'][sex][key]=out;print(sex,key,count,'vertices',flush=True);provenance.append({'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
 dest.write_text('const REALM_MODELS='+json.dumps(world,separators=(',',':'))+';\n')
 (ROOT/'dist/assets/realms/fantasy-outfits-provenance.json').write_text(json.dumps({'author':'Quaternius','pack':'Modular Character Outfits - Fantasy (Standard)','url':'https://quaternius.itch.io/modular-character-outfits-fantasy','license':'CC0 1.0 Universal','parts':provenance,'adaptation':'Retargeted to both Veldren rigs; texture colours baked into vertices; hood remains separate head equipment.'},indent=2)+'\n')
 credits=ROOT/'dist/assets/realms/CREDITS.txt';text=credits.read_text()
 if 'Modular Character Outfits - Fantasy'not in text:credits.write_text(text+'\nPeasant and Ranger clothing: Quaternius Modular Character Outfits - Fantasy (Standard), CC0 1.0.\nhttps://quaternius.itch.io/modular-character-outfits-fantasy\n')
if __name__=='__main__':build(pathlib.Path(sys.argv[1]))
