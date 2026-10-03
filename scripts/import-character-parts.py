"""Import author character parts through the canonical C++ importer.

Usage: python3 scripts/import-character-parts.py EXTRACTED_UNIVERSAL_BASE_CHARACTERS
The packed character adapter retains explicit material channels and authored
skin textures and material tint channels; animation rigs and stable saved appearance IDs stay intact.
"""
import base64, hashlib, json, pathlib, subprocess, sys, tempfile
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[1]
SOURCE = pathlib.Path(sys.argv[1]).resolve()
DIST = ROOT/'dist'
packed_path = DIST/'assets/realms/models.js'
world = json.loads(packed_path.read_text().split('=', 1)[1].rstrip(';\n'))
registry = json.loads((DIST/'assets/canonical/registry.json').read_text())
records = {r['id']:r for r in registry['records']}
provenance = []

def pack(a, dtype='<f4'):
    return base64.b64encode(np.asarray(a, dtype=dtype).tobytes()).decode()

def stream(a):
    dtype={'float32-le':'<f4','uint32-le':'<u4','uint16-le':'<u2'}[a['encoding']]
    return np.frombuffer(base64.b64decode(a['data']), dtype=dtype).reshape(a['count'], a.get('components',1)).copy()

def sample(path, uv):
    image = np.asarray(Image.open(path).convert('RGB'))/255
    return image[np.minimum((uv[:,1]%1*image.shape[0]).astype(int),image.shape[0]-1),np.minimum((uv[:,0]%1*image.shape[1]).astype(int),image.shape[1]-1)]

def import_model(path, identity):
    with tempfile.TemporaryDirectory(prefix='veldren-character-import-') as directory:
        output = pathlib.Path(directory)/'model.json'
        subprocess.run([str(ROOT/'native/build/asset-import'),str(path),str(output),identity,str(path.parent),str(ROOT/'art/external/quaternius/uri-aliases.json')],check=True,capture_output=True)
        model = json.loads(output.read_text())
    definitions = model.pop('records')
    by_id = {r['id']:r for r in definitions}
    for image in model['images']:
        target = DIST/by_id[image['id']]['derivedPath']
        data = base64.b64decode(image.pop('data'))
        assert hashlib.sha256(data).hexdigest() == image['sourceHash']
        target.parent.mkdir(parents=True,exist_ok=True)
        if not target.exists(): target.write_bytes(data)
        image['derivedPath'] = str(target.relative_to(DIST))
    # Keep author textures/materials intact. An explicit per-pixel mask selects
    # editable regions; no appearance choice replaces the texture with colours.
    for material in model['materials']:
        name=material['name']
        kind='eyes' if 'Eyes' in name else 'hair' if 'Hair' in name else 'skin' if identity.startswith('avatar:') and 'Superhero' in name else None
        if not kind: continue
        material['appearanceKind']=kind
        if kind=='hair': continue
        original=next(image for image in model['images'] if image['id']==material['baseColorTexture']['image'])
        pixels=np.asarray(Image.open(DIST/original['derivedPath']).convert('RGB')).astype(np.int16)
        if kind=='skin':
            female='female' in identity
            light_path=SOURCE/'Base Characters/Textures'/('T_Superhero_Female_Light_BaseColor.png' if female else 'T_Superhero_Male_Ligh.png')
            light=np.asarray(Image.open(light_path).convert('RGB')).astype(np.int16)
            # The two author variants differ only in underwear. Their exact
            # difference identifies protected cloth, including textured edges.
            mask=np.where(np.max(abs(pixels-light),axis=2)==0,255,0).astype('uint8')
        else:
            chroma=pixels.max(2)-pixels.min(2)
            mask=np.round(np.clip((chroma/255-.04)*8,0,1)*255).astype('uint8')
        rgba=np.empty((*mask.shape,4),dtype='uint8');rgba[:,:,:3]=mask[:,:,None];rgba[:,:,3]=255
        with tempfile.NamedTemporaryFile(suffix='.png') as temporary:
            Image.fromarray(rgba).save(temporary.name)
            data=pathlib.Path(temporary.name).read_bytes()
        digest=hashlib.sha256(data).hexdigest();image_id=identity+'/image/appearance-'+kind
        derived='assets/canonical/images/'+digest+'.png';target=DIST/derived
        if not target.exists():target.write_bytes(data)
        image={'id':image_id,'sourceHash':digest,'derivedPath':derived,'mimeType':'image/png','width':mask.shape[1],'height':mask.shape[0]}
        model['images'].append(image)
        record=dict(by_id[original['id']]);record.update(id=image_id,name=kind+' appearance mask',sourceHash=digest,derivedPath=derived,dependencies=[],variants={})
        definitions.append(record);by_id[image_id]=record
        binding=dict(material['baseColorTexture']);binding.update(image=image_id,role='appearanceMask',colorSpace='linear')
        material['appearanceMaskTexture']=binding
    for material in model['materials']:
        record=by_id[material['id']];record['material']=material
        binding=material.get('appearanceMaskTexture')
        if binding:record['dependencies'].append(binding['image'])
    source_path = 'sources/quaternius/universal-base-characters/'+str(path.relative_to(SOURCE))
    for record in definitions: record['sourcePath'] = source_path; records[record['id']] = record
    target = DIST/by_id[identity]['derivedPath']
    target.write_text(json.dumps(model,separators=(',',':'))+'\n')
    provenance.append(dict(id=identity,sourcePath=source_path,sourceHash=model['sourceHash'],sourceDependencies=model['sourceDependencies'],derivedPath=str(target.relative_to(DIST)),derivedHash=hashlib.sha256(target.read_bytes()).hexdigest()))
    return model

def adapter(model, source, avatar=False):
    meshes = {m['id']:m for m in model['meshes']}
    materials = {m['id']:m for m in model['materials']}
    images = {m['id']:m for m in model['images']}
    arrays = {k:[] for k in ['p','n','uv','c','f','j','w','i','surface','skinBase','iris','skinMask']}
    offset = 0;parts=[];index_offset=0
    for node in model['nodes']:
        if 'mesh' not in node: continue
        for primitive in meshes[node['mesh']]['primitives']:
            attr=primitive['attributes']; p=stream(attr['POSITION']); n=stream(attr['NORMAL']); uv=stream(attr['TEXCOORD_0'])
            material=materials[primitive['material']]; name=material['name']; texture=images[material['baseColorTexture']['image']]
            color=sample(DIST/texture['derivedPath'],uv)*material['baseColorFactor'][:3]
            surface=2 if 'Eyes' in name else 3 if 'Hair' in name else 1
            light=color.copy()
            index_count=primitive['indices']['count']
            parts.append({'material':material['id'],'kind':material.get('appearanceKind'),'firstVertex':offset,'vertexCount':len(p),'indexOffset':index_offset,'indexCount':index_count})
            index_offset+=index_count
            iris=np.clip((color.max(1)-color.min(1)-.04)*8,0,1) if surface==2 else np.zeros(len(p))
            mask_binding=material.get('appearanceMaskTexture')
            skin_mask=sample(DIST/images[mask_binding['image']]['derivedPath'],uv)[:,0] if material.get('appearanceKind')=='skin' else np.zeros(len(p))
            joints=stream(attr['JOINTS_0']) if 'JOINTS_0' in attr else np.zeros((len(p),4))
            weights=stream(attr['WEIGHTS_0']) if 'WEIGHTS_0' in attr else np.tile([1,0,0,0],(len(p),1))
            if not avatar:
                matrix=np.asarray(node['worldMatrix']).reshape(4,4).T
                p=(matrix@np.c_[p,np.ones(len(p))].T).T[:,:3]; n=(np.linalg.inv(matrix[:3,:3]).T@n.T).T
            for k,value in dict(p=p,n=n,uv=uv,c=color,f=color,j=joints,w=weights,i=stream(primitive['indices']).ravel()+offset,surface=np.full(len(p),surface),skinBase=light,iris=iris,skinMask=skin_mask).items(): arrays[k].append(value)
            offset+=len(p)
    data={k:np.concatenate(v) for k,v in arrays.items()}
    assert offset<65536
    out={k:pack(data[k],dtype) for k,dtype in [('p','<f4'),('uv','<f4'),('i','<u2'),('j','u1')]}
    for k in ['c','f','w','skinBase','iris','skinMask']: out[k]=pack(np.round(np.clip(data[k],0,1)*255),'u1')
    out['n']=pack(np.round(np.clip(data['n'],-1,1)*127),'i1')
    out['t']=pack(np.full(offset,20),'u1'); out['surface']=pack(data['surface'],'u1')
    out['bounds']=[data['p'].min(0).tolist(),data['p'].max(0).tolist()]
    out['materialParts']=parts
    return out

for sex in ['male','female']:
    source=SOURCE/'Base Characters/Godot - UE'/('Superhero_'+sex.title()+'_FullBody.gltf')
    model=import_model(source,'avatar:'+sex)
    world['avatars'][sex]['mesh']=adapter(model,source,True)
for source in sorted((SOURCE/'Hairstyles/Origin at 0/glTF (Godot)').glob('*.gltf')):
    model=import_model(source,'rebuilt:'+source.stem)
    world['models'][source.stem]=adapter(model,source)
packed_path.write_text('const REALM_MODELS='+json.dumps(world,separators=(',',':'))+';\n')
registry['records']=sorted(records.values(),key=lambda r:r['id'])
(DIST/'assets/canonical/registry.json').write_text(json.dumps(registry,separators=(',',':'))+'\n')
manifest=ROOT/'art/external/quaternius/import-manifest.json'
existing={r['id']:r for r in json.loads(manifest.read_text())}
existing.update({r['id']:r for r in provenance})
manifest.write_text(json.dumps(list(existing.values()),indent=2)+'\n')
(DIST/'assets/realms/character-parts-provenance.json').write_text(json.dumps({'author':'Quaternius','pack':'Universal Base Characters Standard','license':'CC0 1.0','parts':provenance,'channels':{'1':'body skin from authored texture and material tint','2':'eyes with iris mask','3':'eyebrows/hair'},'hairAttachment':'head joint bind transform'},indent=2)+'\n')
print('Imported both bodies and all eight supplied hair/eyebrow parts with explicit surface channels.')
