"""Render capture-scene.cjs output using the production GLSL and a native ES2 context.
This verifies geometry/material output; it is not browser or device performance QA.
Usage: python3 scripts/render-scene.py CAPTURE_DIR OUTPUT.png
"""
import ctypes as C, os, json, sys, io
from pathlib import Path
from PIL import Image
os.environ['EGL_PLATFORM']='surfaceless'
root=Path(sys.argv[1]); scene=json.loads((root/(sys.argv[3] if len(sys.argv)>3 else 'scene.json')).read_text()); width,height=scene['width'],scene['height']
E=C.CDLL('libEGL.so.1'); I=C.c_int; U=C.c_uint; P=C.c_void_p; F=C.c_float

def egl(name,ret,args):
 f=getattr(E,name);f.restype=ret;f.argtypes=args;return f
get=egl('eglGetDisplay',P,[P]);init=egl('eglInitialize',I,[P,P,P]);choose=egl('eglChooseConfig',I,[P,P,P,I,P]);create=egl('eglCreateContext',P,[P,P,P,P]);surface=egl('eglCreatePbufferSurface',P,[P,P,P]);make=egl('eglMakeCurrent',I,[P,P,P,P]);proc=egl('eglGetProcAddress',P,[C.c_char_p])
egl('eglBindAPI',I,[I])(0x30A0);display=get(None);assert init(display,None,None)
attrs=(I*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3025,24,0x3038);config=P();count=I();assert choose(display,attrs,C.byref(config),1,C.byref(count)) and count.value
context=create(display,config,None,(I*3)(0x3098,2,0x3038));assert context
surf=surface(display,config,(I*5)(0x3057,width,0x3056,height,0x3038));assert make(display,surf,surf,context)
def gl(name,ret,args):return C.CFUNCTYPE(ret,*args)(proc(name.encode()))
shader=gl('glCreateShader',U,[U]);source=gl('glShaderSource',None,[U,I,P,P]);compile=gl('glCompileShader',None,[U]);getshader=gl('glGetShaderiv',None,[U,U,P]);shaderlog=gl('glGetShaderInfoLog',None,[U,I,P,P]);program=gl('glCreateProgram',U,[])();attach=gl('glAttachShader',None,[U,U]);link=gl('glLinkProgram',None,[U]);getprogram=gl('glGetProgramiv',None,[U,U,P])
def make_program(vertex):
 program=gl('glCreateProgram',U,[])()
 for code,kind in [(vertex,0x8B31),(scene['fragment'],0x8B30)]:
  sh=shader(kind);code=C.c_char_p(code.encode());source(sh,1,C.byref(code),None);compile(sh);ok=I();getshader(sh,0x8B81,C.byref(ok));buf=C.create_string_buffer(8192);shaderlog(sh,8192,None,buf);assert ok.value,buf.value;attach(program,sh)
 link(program);ok=I();getprogram(program,0x8B82,C.byref(ok));assert ok.value
 return program
program=make_program(scene['vertex'])
instance_program=make_program(scene['instancedVertex']) if any(d.get('instances') for d in scene['draws']) and os.environ.get('VELDREN_REVIEW_INSTANCING', os.environ.get('EMBERFALL_REVIEW_INSTANCING'))!='0' else None
gl('glUseProgram',None,[U])(program)
location=gl('glGetUniformLocation',I,[U,C.c_char_p]);uniforms={}
def uniform(key,value):
 loc=uniforms.setdefault(key,location(program,key.encode()))
 if isinstance(value,list):gl('glUniform'+str(len(value))+'f',None,[I]+[F]*len(value))(loc,*value)
 else:gl('glUniform1f',None,[I,F])(loc,value)
for key,value in scene['uniforms'].items():uniform(key,value)
for key,unit in [('uShadow',0),('uAtlas',1)]:gl('glUniform1i',None,[I,I])(location(program,key.encode()),unit)
active=gl('glActiveTexture',None,[U]);bindtex=gl('glBindTexture',None,[U,U]);teximage=gl('glTexImage2D',None,[U,I,I,I,I,I,U,U,P]);texparam=gl('glTexParameteri',None,[U,U,I])
def texture(w,h,data=None,linear=False):
 tex=U();gl('glGenTextures',None,[I,P])(1,C.byref(tex));bindtex(0x0DE1,tex);teximage(0x0DE1,0,0x1908,w,h,0,0x1908,0x1401,data)
 for key,value in [(0x2801,0x2601 if linear else 0x2600),(0x2800,0x2601 if linear else 0x2600),(0x2802,0x812F),(0x2803,0x812F)]:texparam(0x0DE1,key,value)
 return tex.value
active(0x84C1);atlas=Image.open(os.environ.get('VELDREN_REVIEW_ATLAS', os.environ.get('EMBERFALL_REVIEW_ATLAS')) or Path(__file__).resolve().parent.parent/'dist/assets/realms/atlas.png').convert('RGBA');atlasbytes=atlas.tobytes();atlastex=texture(atlas.width,atlas.height,C.c_char_p(atlasbytes),True)
bone_texture=None
if 'uBoneTexture' in scene['vertex']:
 active(0x84C2);bone_texture=texture(240,1)
 gl('glUniform1i',None,[I,I])(location(program,b'uBoneTexture'),2)
active(0x84C0);shadow=texture(1024,1024);fbo=U();gl('glGenFramebuffers',None,[I,P])(1,C.byref(fbo));bindfb=gl('glBindFramebuffer',None,[U,U]);bindfb(0x8D40,fbo);gl('glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,shadow,0)
depth=U();gl('glGenRenderbuffers',None,[I,P])(1,C.byref(depth));gl('glBindRenderbuffer',None,[U,U])(0x8D41,depth);gl('glRenderbufferStorage',None,[U,U,I,I])(0x8D41,0x81A5,1024,1024);gl('glFramebufferRenderbuffer',None,[U,U,U,U])(0x8D40,0x8D00,0x8D41,depth);assert gl('glCheckFramebufferStatus',U,[U])(0x8D40)==0x8CD5
bindbuffer=gl('glBindBuffer',None,[U,U]);buffers={}
for draw in scene['draws']:
 for key in ['file','indexFile','instanceFile']:
  name=draw.get(key)
  if not name or name in buffers:continue
  data=(root/name).read_bytes();b=U();gl('glGenBuffers',None,[I,P])(1,C.byref(b));bindbuffer(0x8892,b);gl('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8892,len(data),C.c_char_p(data),0x88E4);buffers[name]=b.value
attribute=gl('glGetAttribLocation',I,[U,C.c_char_p]);attributes=[attribute(program,key.encode()) for key in ['aPosition','aNormal','aColor','aMaterial','aUV','aJoints','aWeights']];enableattr=gl('glEnableVertexAttribArray',None,[U]);attrpointer=gl('glVertexAttribPointer',None,[U,I,U,U,I,P]);matrix=gl('glUniformMatrix4fv',None,[I,I,U,P]);model=location(program,b'uModel');drawarrays=gl('glDrawArrays',None,[U,I,I])
normalmatrix=gl('glUniformMatrix3fv',None,[I,I,U,P]);normal=location(program,b'uNormal')
def drawentry(draw):
 global program,uniforms
 previous=program;instanced=bool(draw.get('instances') and instance_program)
 if instanced:
  program=instance_program;uniforms={};gl('glUseProgram',None,[U])(program)
  for key,value in scene['uniforms'].items():uniform(key,value)
  uniform('uShadowPass',shadow_pass)
  for key,unit in [('uShadow',0),('uAtlas',1)]:gl('glUniform1i',None,[I,I])(location(program,key.encode()),unit)
 attrs=[attribute(program,key.encode()) for key in ['aPosition','aNormal','aColor','aMaterial','aUV','aJoints','aWeights']]
 uniform('uBossColor',draw.get('bossColor',0));uniform('uDissolve',draw.get('dissolve',0))
 palette=draw.get('palette');uniform('uSkinning',1 if palette else 0)
 if palette:
  if bone_texture:
   active(0x84C2);bindtex(0x0DE1,bone_texture);data=(F*(240*4))(*palette);teximage(0x0DE1,0,0x1908,240,1,0,0x1908,0x1406,data);uniform('uBoneRow',.5);active(0x84C0)
  else:gl('glUniform4fv',None,[I,I,P])(location(program,b'uBones[0]'),len(palette)//4,(F*len(palette))(*palette))
 normalmatrix(location(program,b'uNormal'),1,0,(F*9)(*draw.get('normal',[1,0,0,0,1,0,0,0,1])))
 matrix(location(program,b'uModel'),1,0,(F*16)(*draw['model']));bindbuffer(0x8892,buffers[draw['file']])
 for i,a in enumerate(attrs):
  if a<0:continue
  if i>=5 and not palette:
   gl('glDisableVertexAttribArray',None,[U])(a);gl('glVertexAttrib4f',None,[U,F,F,F,F])(a,0,0,0,0);continue
  enableattr(a);attrpointer(a,4 if i>=5 else 2 if i==4 else 1 if i==3 else 3,0x1406,0,draw.get('stride',48),P(48 if i==5 else 64 if i==6 else 40 if i==4 else i*12))
 if draw.get('indexFile'):bindbuffer(0x8893,buffers[draw['indexFile']])
 def submit():
  if draw.get('indexFile'):gl('glDrawElements',None,[U,I,U,P])(4,draw['count'],0x1403,None)
  else:drawarrays(4,0,draw['count'])
 if instanced:
  bindbuffer(0x8892,buffers[draw['instanceFile']]);instance_attrs=[attribute(program,('aInstance'+str(i)).encode()) for i in range(3)]
  divisor=gl('glVertexAttribDivisor',None,[U,U])
  for i,a in enumerate(instance_attrs):enableattr(a);attrpointer(a,4,0x1406,0,48,P(draw['instanceOffset']+i*16));divisor(a,1)
  if draw.get('indexFile'):gl('glDrawElementsInstanced',None,[U,I,U,P,I])(4,draw['count'],0x1403,None,draw['instances'])
  else:gl('glDrawArraysInstanced',None,[U,I,I,I])(4,0,draw['count'],draw['instances'])
  for a in instance_attrs:divisor(a,0);gl('glDisableVertexAttribArray',None,[U])(a)
 elif draw.get('instances'):
  import struct
  raw=(root/draw['instanceFile']).read_bytes()
  for i in range(draw['instances']):
   m=struct.unpack_from('12f',raw,draw['instanceOffset']+i*48)
   # Inverse-transpose for nonuniformly scaled reference instances.
   import numpy as np
   affine=np.array(m).reshape(3,4);norm=np.linalg.inv(affine[:,:3]).T
   normalmatrix(location(program,b'uNormal'),1,0,(F*9)(*norm.flatten(order='F')))
   mat=[m[0],m[4],m[8],0,m[1],m[5],m[9],0,m[2],m[6],m[10],0,m[3],m[7],m[11],1]
   matrix(location(program,b'uModel'),1,0,(F*16)(*mat));submit()
 else:submit()
 if instanced:program=previous;uniforms={};gl('glUseProgram',None,[U])(program)

enable=gl('glEnable',None,[U]);disable=gl('glDisable',None,[U]);enable(0x0B71);gl('glDepthFunc',None,[U])(0x0203);disable(0x0B44);disable(0x0BE2)
viewport=gl('glViewport',None,[I,I,I,I]);clearcolor=gl('glClearColor',None,[F,F,F,F]);clear=gl('glClear',None,[U])
shadow_pass=1
bindtex(0x0DE1,0);viewport(0,0,1024,1024);clearcolor(1,1,1,1);clear(0x4100);uniform('uShadowPass',1)
for draw in scene['draws']:
 if not draw['terrain']:drawentry(draw)
shadow_pass=0
bindfb(0x8D40,0);viewport(0,0,width,height);clearcolor(.14,.23,.25,1);clear(0x4100);bindtex(0x0DE1,shadow);active(0x84C1);bindtex(0x0DE1,atlastex);active(0x84C0);uniform('uShadowPass',0)
for draw in scene['draws']:drawentry(draw)
gl('glFinish',None,[])();error=gl('glGetError',U,[])();assert error==0,hex(error)
pixels=C.create_string_buffer(width*height*4);gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,width,height,0x1908,0x1401,pixels)
encoded=io.BytesIO()
Image.frombytes('RGBA',(width,height),pixels.raw).transpose(Image.Transpose.FLIP_TOP_BOTTOM).convert('RGB').save(encoded,format='PNG')
dest=Path(sys.argv[2]);temporary=dest.with_suffix('.writing');data=encoded.getvalue()
with temporary.open('wb') as f:
 f.write(data);f.flush();os.fsync(f.fileno())
temporary.replace(dest)
assert dest.stat().st_size==len(data)
print('Rendered production geometry, atlas, lighting and shadows:',sys.argv[2])
