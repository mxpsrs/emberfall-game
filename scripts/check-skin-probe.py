"""Execute the device's actual bone-texture correctness probe in native GLES.
Input is JSON emitted by tests/texture-skinning.cjs; no browser is started.
"""
import ctypes as C, json, os, sys
os.environ['EGL_PLATFORM']='surfaceless'
data=json.load(sys.stdin)
E=C.CDLL('libEGL.so.1'); I=C.c_int; U=C.c_uint; P=C.c_void_p; F=C.c_float
def egl(name,ret,args):
 f=getattr(E,name);f.restype=ret;f.argtypes=args;return f
get=egl('eglGetDisplay',P,[P]);init=egl('eglInitialize',I,[P,P,P]);choose=egl('eglChooseConfig',I,[P,P,P,I,P]);create=egl('eglCreateContext',P,[P,P,P,P]);surface=egl('eglCreatePbufferSurface',P,[P,P,P]);make=egl('eglMakeCurrent',I,[P,P,P,P]);proc=egl('eglGetProcAddress',P,[C.c_char_p])
egl('eglBindAPI',I,[I])(0x30A0);display=get(None);assert init(display,None,None)
attrs=(I*13)(0x3033,1,0x3040,4,0x3024,8,0x3023,8,0x3022,8,0x3025,0,0x3038);config=P();count=I();assert choose(display,attrs,C.byref(config),1,C.byref(count)) and count.value
context=create(display,config,None,(I*3)(0x3098,2,0x3038));assert context
surf=surface(display,config,(I*5)(0x3057,80,0x3056,1,0x3038));assert make(display,surf,surf,context)
def gl(name,ret,args):return C.CFUNCTYPE(ret,*args)(proc(name.encode()))
program=gl('glCreateProgram',U,[])()
for code,kind in [(data['vertex'],0x8B31),(data['fragment'],0x8B30)]:
 sh=gl('glCreateShader',U,[U])(kind);source=C.c_char_p(code.encode());gl('glShaderSource',None,[U,I,P,P])(sh,1,C.byref(source),None);gl('glCompileShader',None,[U])(sh)
 ok=I();gl('glGetShaderiv',None,[U,U,P])(sh,0x8B81,C.byref(ok));buf=C.create_string_buffer(8192);gl('glGetShaderInfoLog',None,[U,I,P,P])(sh,8192,None,buf);assert ok.value,buf.value
 gl('glAttachShader',None,[U,U])(program,sh)
gl('glLinkProgram',None,[U])(program);ok=I();gl('glGetProgramiv',None,[U,U,P])(program,0x8B82,C.byref(ok));assert ok.value
gl('glUseProgram',None,[U])(program)
def texture(unit,w,h,kind,pixels):
 gl('glActiveTexture',None,[U])(unit);tex=U();gl('glGenTextures',None,[I,P])(1,C.byref(tex));gl('glBindTexture',None,[U,U])(0x0DE1,tex)
 gl('glTexImage2D',None,[U,I,I,I,I,I,U,U,P])(0x0DE1,0,0x1908,w,h,0,0x1908,kind,pixels)
 for key,value in [(0x2801,0x2600),(0x2800,0x2600),(0x2802,0x812F),(0x2803,0x812F)]:gl('glTexParameteri',None,[U,U,I])(0x0DE1,key,value)
 return tex
texture(0x84C2,240,1,0x1406,(F*len(data['bones']))(*data['bones']))
location=gl('glGetUniformLocation',I,[U,C.c_char_p]);gl('glUniform1i',None,[I,I])(location(program,b'uBoneTexture'),2);gl('glUniform1f',None,[I,F])(location(program,b'uBoneRow'),.5)
target=texture(0x84C0,80,1,0x1401,None);fbo=U();gl('glGenFramebuffers',None,[I,P])(1,C.byref(fbo));gl('glBindFramebuffer',None,[U,U])(0x8D40,fbo);gl('glFramebufferTexture2D',None,[U,U,U,U,I])(0x8D40,0x8CE0,0x0DE1,target,0);assert gl('glCheckFramebufferStatus',U,[U])(0x8D40)==0x8CD5
buffer=U();gl('glGenBuffers',None,[I,P])(1,C.byref(buffer));gl('glBindBuffer',None,[U,U])(0x8892,buffer);vertices=(F*len(data['vertices']))(*data['vertices']);gl('glBufferData',None,[U,C.c_ssize_t,P,U])(0x8892,C.sizeof(vertices),vertices,0x88E4)
attribute=gl('glGetAttribLocation',I,[U,C.c_char_p])(program,b'aProbe');gl('glEnableVertexAttribArray',None,[U])(attribute);gl('glVertexAttribPointer',None,[U,I,U,U,I,P])(attribute,4,0x1406,0,16,None)
gl('glViewport',None,[I,I,I,I])(0,0,80,1);gl('glClearColor',None,[F,F,F,F])(0,0,0,0);gl('glClear',None,[U])(0x4000);gl('glDrawArrays',None,[U,I,I])(0,0,80)
pixels=(C.c_ubyte*320)();gl('glReadPixels',None,[I,I,I,I,U,U,P])(0,0,80,1,0x1908,0x1401,pixels)
error=gl('glGetError',U,[])();assert error==0,hex(error)
delta=max(abs(a-b) for a,b in zip(pixels,data['expected']));assert delta<=2,('Bone transform pixel mismatch',delta)
print('PASS: native GLES executes all 80 bone addresses and four weighted transforms; maximum pixel error',delta)
