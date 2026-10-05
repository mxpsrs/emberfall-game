"""Compile canonical material variants once, never per model or instance."""
import os,pathlib,subprocess,tempfile
root=pathlib.Path(__file__).resolve().parents[2]
matc=pathlib.Path(os.environ['FILAMENT_ROOT'])/'bin/matc'
source=(root/'client/materials/veldren-pbr.mat').read_text()
with tempfile.TemporaryDirectory(prefix='veldren-materials-') as directory:
 for shading in ['lit','unlit']:
  for alpha,blend in [('OPAQUE','opaque'),('MASK','masked'),('BLEND','transparent')]:
   fragment='''vec4 mr = texture(materialParams_metalRough, uvM);
        material.metallic = materialParams.metallic * mr.b;
        material.roughness = materialParams.roughness * mr.g;
        material.ambientOcclusion = mix(1.0, texture(materialParams_occlusion, uvO).r, materialParams.occlusionStrength);
        material.emissive = vec4(texture(materialParams_emission, uvE).rgb * materialParams.emissiveFactor, 0.0);''' if shading=='lit' else ''
   text=source.replace('VELDREN_SHADING',shading).replace('VELDREN_BLENDING',blend).replace('VELDREN_LIT_PROPERTIES',fragment)
   if shading=='unlit':text=text.replace('    specularAntiAliasing : true,\n','').replace('        material.normal = normalize(vec3(normalValue.xy * materialParams.normalScale, normalValue.z));\n','')
   path=pathlib.Path(directory)/'material.mat';path.write_text(text)
   output=root/'client/materials'/f'veldren-pbr-{shading}-{alpha.lower()}.filamat'
   subprocess.run([str(matc),'-p','mobile','-a','opengl','-l','1','-Os','-o',str(output),str(path)],check=True)
   print(output.name)
