#include "veldren/desktop.h"

#include <zlib.h>

#include <algorithm>
#include <array>
#include <chrono>
#include <cmath>
#include <cstddef>
#include <cstdint>
#include <cstring>
#if defined(_WIN32)
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#else
#include <dlfcn.h>
#endif
#include <fstream>
#include <iostream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <thread>
#include <vector>

namespace {
using Uint32 = std::uint32_t;
using SDL_Window = void;
using SDL_GLContext = void*;
struct SDL_Event { Uint32 type; std::uint8_t padding[124]; };
constexpr Uint32 SDL_INIT_VIDEO = 0x20;
constexpr Uint32 SDL_WINDOW_OPENGL = 0x2;
constexpr Uint32 SDL_WINDOW_RESIZABLE = 0x20;
constexpr Uint32 SDL_WINDOW_ALLOW_HIGHDPI = 0x2000;
constexpr Uint32 SDL_QUIT = 0x100;
constexpr int SDL_SCANCODE_A = 4;
constexpr int SDL_SCANCODE_D = 7;
constexpr int SDL_SCANCODE_S = 22;
constexpr int SDL_SCANCODE_W = 26;
constexpr int SDL_SCANCODE_ESCAPE = 41;
constexpr int SDL_WINDOWPOS_CENTERED = 0x2fff0000;
constexpr int SDL_GL_DOUBLEBUFFER = 5;
constexpr int SDL_GL_DEPTH_SIZE = 6;
constexpr int SDL_GL_STENCIL_SIZE = 7;
constexpr int SDL_GL_MULTISAMPLEBUFFERS = 13;
constexpr int SDL_GL_MULTISAMPLESAMPLES = 14;
constexpr int SDL_GL_CONTEXT_MAJOR_VERSION = 17;
constexpr int SDL_GL_CONTEXT_MINOR_VERSION = 18;
constexpr int SDL_GL_CONTEXT_PROFILE_MASK = 21;
constexpr int SDL_GL_CONTEXT_PROFILE_CORE = 1;

using GLenum = unsigned int;
using GLuint = unsigned int;
using GLint = int;
using GLsizei = int;
using GLboolean = unsigned char;
using GLchar = char;
using GLfloat = float;
using GLsizeiptr = std::ptrdiff_t;
constexpr GLenum GL_FALSE = 0;
constexpr GLenum GL_FLOAT = 0x1406;
constexpr GLenum GL_TRIANGLES = 0x0004;
constexpr GLenum GL_COLOR_BUFFER_BIT = 0x00004000;
constexpr GLenum GL_DEPTH_BUFFER_BIT = 0x00000100;
constexpr GLenum GL_DEPTH_TEST = 0x0B71;
constexpr GLenum GL_CULL_FACE = 0x0B44;
constexpr GLenum GL_BACK = 0x0405;
constexpr GLenum GL_LEQUAL = 0x0203;
constexpr GLenum GL_BLEND = 0x0BE2;
constexpr GLenum GL_SRC_ALPHA = 0x0302;
constexpr GLenum GL_ONE_MINUS_SRC_ALPHA = 0x0303;
constexpr GLenum GL_MULTISAMPLE = 0x809D;
constexpr GLenum GL_VERTEX_SHADER = 0x8B31;
constexpr GLenum GL_FRAGMENT_SHADER = 0x8B30;
constexpr GLenum GL_COMPILE_STATUS = 0x8B81;
constexpr GLenum GL_LINK_STATUS = 0x8B82;
constexpr GLenum GL_INFO_LOG_LENGTH = 0x8B84;
constexpr GLenum GL_ARRAY_BUFFER = 0x8892;
constexpr GLenum GL_STATIC_DRAW = 0x88E4;
constexpr GLenum GL_DYNAMIC_DRAW = 0x88E8;
constexpr GLenum GL_TEXTURE_2D = 0x0DE1;
constexpr GLenum GL_TEXTURE0 = 0x84C0;
constexpr GLenum GL_TEXTURE1 = 0x84C1;
constexpr GLenum GL_RGBA = 0x1908;
constexpr GLenum GL_RGB = 0x1907;
constexpr GLenum GL_UNSIGNED_BYTE = 0x1401;
constexpr GLenum GL_SRGB8 = 0x8C41;
constexpr GLenum GL_SRGB8_ALPHA8 = 0x8C43;
constexpr GLenum GL_TEXTURE_MIN_FILTER = 0x2801;
constexpr GLenum GL_TEXTURE_MAG_FILTER = 0x2800;
constexpr GLenum GL_TEXTURE_WRAP_S = 0x2802;
constexpr GLenum GL_TEXTURE_WRAP_T = 0x2803;
constexpr GLenum GL_LINEAR = 0x2601;
constexpr GLenum GL_LINEAR_MIPMAP_LINEAR = 0x2703;
constexpr GLenum GL_REPEAT = 0x2901;
constexpr GLenum GL_CLAMP_TO_EDGE = 0x812F;
constexpr GLenum GL_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FE;
constexpr GLenum GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT = 0x84FF;
constexpr GLenum GL_EXTENSIONS = 0x1F03;
constexpr GLenum GL_FRAMEBUFFER = 0x8D40;
constexpr GLenum GL_DEPTH_ATTACHMENT = 0x8D00;
constexpr GLenum GL_DEPTH_COMPONENT = 0x1902;
constexpr GLenum GL_DEPTH_COMPONENT24 = 0x81A6;
constexpr GLenum GL_UNSIGNED_INT = 0x1405;
constexpr GLenum GL_FRAMEBUFFER_COMPLETE = 0x8CD5;
constexpr GLenum GL_NONE = 0;

struct Sdl {
#if defined(_WIN32)
  HMODULE library{};
#else
  void* library{};
#endif
  int (*init)(Uint32){};
  void (*quit)(){};
  int (*gl_set_attribute)(int, int){};
  SDL_Window* (*create_window)(const char*, int, int, int, int, Uint32){};
  void (*destroy_window)(SDL_Window*){};
  SDL_GLContext (*gl_create_context)(SDL_Window*){};
  void (*gl_delete_context)(SDL_GLContext){};
  int (*gl_set_swap_interval)(int){};
  void (*gl_swap_window)(SDL_Window*){};
  void* (*gl_get_proc_address)(const char*){};
  int (*poll_event)(SDL_Event*){};
  const std::uint8_t* (*get_keyboard_state)(int*){};
  int (*set_relative_mouse_mode)(int){};
  Uint32 (*get_relative_mouse_state)(int*, int*){};
  void (*get_window_size)(SDL_Window*, int*, int*){};
  const char* (*get_error)(){};

  template <class T> void load(T& target, const char* name) {
#if defined(_WIN32)
    target = reinterpret_cast<T>(GetProcAddress(library, name));
#else
    target = reinterpret_cast<T>(dlsym(library, name));
#endif
    if (!target) throw std::runtime_error(std::string("Missing SDL function: ") + name);
  }
  Sdl() {
#if defined(_WIN32)
    library = LoadLibraryA("SDL2.dll");
#else
    library = dlopen("libSDL2-2.0.so.0", RTLD_NOW | RTLD_LOCAL);
#endif
    if (!library) throw std::runtime_error("SDL2 runtime is unavailable");
    load(init, "SDL_Init"); load(quit, "SDL_Quit"); load(gl_set_attribute, "SDL_GL_SetAttribute");
    load(create_window, "SDL_CreateWindow"); load(destroy_window, "SDL_DestroyWindow");
    load(gl_create_context, "SDL_GL_CreateContext"); load(gl_delete_context, "SDL_GL_DeleteContext");
    load(gl_set_swap_interval, "SDL_GL_SetSwapInterval"); load(gl_swap_window, "SDL_GL_SwapWindow");
    load(gl_get_proc_address, "SDL_GL_GetProcAddress"); load(poll_event, "SDL_PollEvent");
    load(get_keyboard_state, "SDL_GetKeyboardState"); load(set_relative_mouse_mode, "SDL_SetRelativeMouseMode");
    load(get_relative_mouse_state, "SDL_GetRelativeMouseState"); load(get_window_size, "SDL_GetWindowSize");
    load(get_error, "SDL_GetError");
  }
  ~Sdl() {
#if defined(_WIN32)
    if (library) FreeLibrary(library);
#else
    if (library) dlclose(library);
#endif
  }
};

struct Gl {
#define GL_FN(ret, name, ...) using name##Fn = ret (*)(__VA_ARGS__); name##Fn name{}
  GL_FN(void, Viewport, GLint, GLint, GLsizei, GLsizei);
  GL_FN(void, ClearColor, GLfloat, GLfloat, GLfloat, GLfloat);
  GL_FN(void, Clear, GLenum);
  GL_FN(void, Enable, GLenum); GL_FN(void, Disable, GLenum); GL_FN(void, DepthFunc, GLenum);
  GL_FN(void, CullFace, GLenum); GL_FN(void, BlendFunc, GLenum, GLenum);
  GL_FN(GLuint, CreateShader, GLenum); GL_FN(void, ShaderSource, GLuint, GLsizei, const GLchar* const*, const GLint*);
  GL_FN(void, CompileShader, GLuint); GL_FN(void, GetShaderiv, GLuint, GLenum, GLint*);
  GL_FN(void, GetShaderInfoLog, GLuint, GLsizei, GLsizei*, GLchar*); GL_FN(void, DeleteShader, GLuint);
  GL_FN(GLuint, CreateProgram); GL_FN(void, AttachShader, GLuint, GLuint); GL_FN(void, LinkProgram, GLuint);
  GL_FN(void, GetProgramiv, GLuint, GLenum, GLint*); GL_FN(void, GetProgramInfoLog, GLuint, GLsizei, GLsizei*, GLchar*);
  GL_FN(void, DeleteProgram, GLuint); GL_FN(void, UseProgram, GLuint);
  GL_FN(void, GenVertexArrays, GLsizei, GLuint*); GL_FN(void, BindVertexArray, GLuint); GL_FN(void, DeleteVertexArrays, GLsizei, const GLuint*);
  GL_FN(void, GenBuffers, GLsizei, GLuint*); GL_FN(void, BindBuffer, GLenum, GLuint); GL_FN(void, BufferData, GLenum, GLsizeiptr, const void*, GLenum);
  GL_FN(void, DeleteBuffers, GLsizei, const GLuint*); GL_FN(void, EnableVertexAttribArray, GLuint);
  GL_FN(void, VertexAttribPointer, GLuint, GLint, GLenum, GLboolean, GLsizei, const void*);
  GL_FN(GLint, GetUniformLocation, GLuint, const GLchar*); GL_FN(void, UniformMatrix4fv, GLint, GLsizei, GLboolean, const GLfloat*);
  GL_FN(void, Uniform3f, GLint, GLfloat, GLfloat, GLfloat); GL_FN(void, Uniform1i, GLint, GLint); GL_FN(void, Uniform1f, GLint, GLfloat);
  GL_FN(void, DrawArrays, GLenum, GLint, GLsizei);
  GL_FN(void, GenTextures, GLsizei, GLuint*); GL_FN(void, BindTexture, GLenum, GLuint); GL_FN(void, ActiveTexture, GLenum);
  GL_FN(void, TexImage2D, GLenum, GLint, GLint, GLsizei, GLsizei, GLint, GLenum, GLenum, const void*);
  GL_FN(void, TexParameteri, GLenum, GLenum, GLint); GL_FN(void, TexParameterf, GLenum, GLenum, GLfloat);
  GL_FN(void, GenerateMipmap, GLenum); GL_FN(void, DeleteTextures, GLsizei, const GLuint*); GL_FN(const unsigned char*, GetString, GLenum);
  GL_FN(void, GetFloatv, GLenum, GLfloat*);
  GL_FN(void, GenFramebuffers, GLsizei, GLuint*); GL_FN(void, BindFramebuffer, GLenum, GLuint);
  GL_FN(void, FramebufferTexture2D, GLenum, GLenum, GLenum, GLuint, GLint); GL_FN(GLenum, CheckFramebufferStatus, GLenum);
  GL_FN(void, DeleteFramebuffers, GLsizei, const GLuint*); GL_FN(void, DrawBuffer, GLenum); GL_FN(void, ReadBuffer, GLenum);
#undef GL_FN
  template <class T> void load(T& target, Sdl& sdl, const char* name) {
    target = reinterpret_cast<T>(sdl.gl_get_proc_address(name));
    if (!target) throw std::runtime_error(std::string("Missing OpenGL function: ") + name);
  }
  explicit Gl(Sdl& sdl) {
#define LOAD(name) load(name, sdl, "gl" #name)
    LOAD(Viewport); LOAD(ClearColor); LOAD(Clear); LOAD(Enable); LOAD(Disable); LOAD(DepthFunc); LOAD(CullFace); LOAD(BlendFunc);
    LOAD(CreateShader); LOAD(ShaderSource); LOAD(CompileShader); LOAD(GetShaderiv); LOAD(GetShaderInfoLog); LOAD(DeleteShader);
    LOAD(CreateProgram); LOAD(AttachShader); LOAD(LinkProgram); LOAD(GetProgramiv); LOAD(GetProgramInfoLog); LOAD(DeleteProgram); LOAD(UseProgram);
    LOAD(GenVertexArrays); LOAD(BindVertexArray); LOAD(DeleteVertexArrays); LOAD(GenBuffers); LOAD(BindBuffer); LOAD(BufferData); LOAD(DeleteBuffers);
    LOAD(EnableVertexAttribArray); LOAD(VertexAttribPointer); LOAD(GetUniformLocation); LOAD(UniformMatrix4fv); LOAD(Uniform3f); LOAD(Uniform1i); LOAD(Uniform1f); LOAD(DrawArrays);
    LOAD(GenTextures); LOAD(BindTexture); LOAD(ActiveTexture); LOAD(TexImage2D); LOAD(TexParameteri); LOAD(TexParameterf); LOAD(GenerateMipmap); LOAD(DeleteTextures); LOAD(GetString); LOAD(GetFloatv);
    LOAD(GenFramebuffers); LOAD(BindFramebuffer); LOAD(FramebufferTexture2D); LOAD(CheckFramebufferStatus); LOAD(DeleteFramebuffers); LOAD(DrawBuffer); LOAD(ReadBuffer);
#undef LOAD
  }
};

struct Vec3 { float x, y, z; };
struct Mat4 { std::array<float, 16> v{}; };
Vec3 operator-(Vec3 a, Vec3 b) { return {a.x - b.x, a.y - b.y, a.z - b.z}; }
Vec3 cross(Vec3 a, Vec3 b) { return {a.y*b.z-a.z*b.y, a.z*b.x-a.x*b.z, a.x*b.y-a.y*b.x}; }
float dot(Vec3 a, Vec3 b) { return a.x*b.x+a.y*b.y+a.z*b.z; }
Vec3 normalize(Vec3 a) { const float l=std::sqrt(std::max(.000001F,dot(a,a))); return {a.x/l,a.y/l,a.z/l}; }
Mat4 identity() { Mat4 m; m.v={1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1}; return m; }
Mat4 multiply(const Mat4& a,const Mat4& b) { Mat4 r; for(int c=0;c<4;c++)for(int row=0;row<4;row++)for(int k=0;k<4;k++)r.v[c*4+row]+=a.v[k*4+row]*b.v[c*4+k]; return r; }
Mat4 perspective(float fov,float aspect,float near,float far) { Mat4 m; const float f=1/std::tan(fov*.5F);m.v[0]=f/aspect;m.v[5]=f;m.v[10]=(far+near)/(near-far);m.v[11]=-1;m.v[14]=2*far*near/(near-far);return m; }
Mat4 orthographic(float extent,float near,float far) { Mat4 m=identity();m.v[0]=m.v[5]=1/extent;m.v[10]=-2/(far-near);m.v[14]=-(far+near)/(far-near);return m; }
Mat4 look_at(Vec3 eye,Vec3 center,Vec3 up) { const Vec3 f=normalize(center-eye),s=normalize(cross(f,up)),u=cross(s,f);Mat4 m=identity();m.v[0]=s.x;m.v[4]=s.y;m.v[8]=s.z;m.v[1]=u.x;m.v[5]=u.y;m.v[9]=u.z;m.v[2]=-f.x;m.v[6]=-f.y;m.v[10]=-f.z;m.v[12]=-dot(s,eye);m.v[13]=-dot(u,eye);m.v[14]=dot(f,eye);return m; }

struct Image { std::uint32_t width{},height{},channels{};std::vector<std::uint8_t> pixels; };
std::uint32_t be32(const std::uint8_t* p) { return (std::uint32_t(p[0])<<24)|(std::uint32_t(p[1])<<16)|(std::uint32_t(p[2])<<8)|p[3]; }
int paeth(int a,int b,int c) { const int p=a+b-c,pa=std::abs(p-a),pb=std::abs(p-b),pc=std::abs(p-c);return pa<=pb&&pa<=pc?a:pb<=pc?b:c; }
Image load_png(const std::filesystem::path& path) {
  std::ifstream input(path,std::ios::binary);if(!input)throw std::runtime_error("Cannot open "+path.string());
  std::vector<std::uint8_t> bytes((std::istreambuf_iterator<char>(input)),{});
  const std::array<std::uint8_t,8> signature{137,80,78,71,13,10,26,10};
  if(bytes.size()<33||!std::equal(signature.begin(),signature.end(),bytes.begin()))throw std::runtime_error("Invalid PNG: "+path.string());
  Image image;std::vector<std::uint8_t> compressed;std::uint8_t depth=0,type=0,interlace=0;
  for(std::size_t offset=8;offset+12<=bytes.size();) { const auto length=be32(&bytes[offset]);const std::string name(reinterpret_cast<const char*>(&bytes[offset+4]),4);const auto data=offset+8;if(data+length+4>bytes.size())throw std::runtime_error("Truncated PNG");
    if(name=="IHDR"){image.width=be32(&bytes[data]);image.height=be32(&bytes[data+4]);depth=bytes[data+8];type=bytes[data+9];interlace=bytes[data+12];}
    else if(name=="IDAT")compressed.insert(compressed.end(),bytes.begin()+data,bytes.begin()+data+length);
    else if(name=="IEND")break;
    offset=data+length+4;
  }
  if(depth!=8||(type!=2&&type!=6)||interlace)throw std::runtime_error("Native PNG loader requires non-interlaced RGB/RGBA8: "+path.string());
  image.channels=type==6?4:3;const std::size_t stride=std::size_t(image.width)*image.channels,raw_size=(stride+1)*image.height;std::vector<std::uint8_t> raw(raw_size);uLongf size=raw.size();
  if(uncompress(raw.data(),&size,compressed.data(),compressed.size())!=Z_OK||size!=raw_size)throw std::runtime_error("PNG inflate failed: "+path.string());
  image.pixels.resize(stride*image.height);for(std::uint32_t y=0;y<image.height;y++){const std::uint8_t filter=raw[y*(stride+1)];const std::size_t src=y*(stride+1)+1,dst=std::size_t(y)*stride;for(std::size_t x=0;x<stride;x++){const int value=raw[src+x],left=x>=image.channels?image.pixels[dst+x-image.channels]:0,up=y?image.pixels[dst+x-stride]:0,corner=y&&x>=image.channels?image.pixels[dst+x-stride-image.channels]:0;int decoded=value;if(filter==1)decoded+=left;else if(filter==2)decoded+=up;else if(filter==3)decoded+=(left+up)/2;else if(filter==4)decoded+=paeth(left,up,corner);else if(filter!=0)throw std::runtime_error("Unsupported PNG filter");image.pixels[dst+x]=static_cast<std::uint8_t>(decoded&255);}}
  return image;
}

GLuint compile_shader(Gl& gl,GLenum kind,const char* source) { const GLuint shader=gl.CreateShader(kind);gl.ShaderSource(shader,1,&source,nullptr);gl.CompileShader(shader);GLint ok=0;gl.GetShaderiv(shader,GL_COMPILE_STATUS,&ok);if(!ok){GLint length=0;gl.GetShaderiv(shader,GL_INFO_LOG_LENGTH,&length);std::string log(std::max(1,length),'\0');gl.GetShaderInfoLog(shader,log.size(),nullptr,log.data());gl.DeleteShader(shader);throw std::runtime_error("Shader compile failed: "+log);}return shader; }
GLuint make_program(Gl& gl,const char* vertex,const char* fragment) { const GLuint vs=compile_shader(gl,GL_VERTEX_SHADER,vertex),fs=compile_shader(gl,GL_FRAGMENT_SHADER,fragment),program=gl.CreateProgram();gl.AttachShader(program,vs);gl.AttachShader(program,fs);gl.LinkProgram(program);gl.DeleteShader(vs);gl.DeleteShader(fs);GLint ok=0;gl.GetProgramiv(program,GL_LINK_STATUS,&ok);if(!ok){GLint length=0;gl.GetProgramiv(program,GL_INFO_LOG_LENGTH,&length);std::string log(std::max(1,length),'\0');gl.GetProgramInfoLog(program,log.size(),nullptr,log.data());gl.DeleteProgram(program);throw std::runtime_error("Program link failed: "+log);}return program; }

struct Mesh { GLuint vao{},vbo{};GLsizei count{}; };
Mesh upload_mesh(Gl& gl,const std::vector<float>& vertices,GLenum usage=GL_STATIC_DRAW) { Mesh mesh;gl.GenVertexArrays(1,&mesh.vao);gl.GenBuffers(1,&mesh.vbo);gl.BindVertexArray(mesh.vao);gl.BindBuffer(GL_ARRAY_BUFFER,mesh.vbo);gl.BufferData(GL_ARRAY_BUFFER,vertices.size()*sizeof(float),vertices.data(),usage);for(GLuint i=0;i<3;i++){gl.EnableVertexAttribArray(i);gl.VertexAttribPointer(i,i==2?2:3,GL_FLOAT,GL_FALSE,8*sizeof(float),reinterpret_cast<const void*>(std::uintptr_t(i==0?0:i==1?3*sizeof(float):6*sizeof(float))));}mesh.count=vertices.size()/8;return mesh; }
void update_mesh(Gl& gl,Mesh& mesh,const std::vector<float>& vertices) { gl.BindBuffer(GL_ARRAY_BUFFER,mesh.vbo);gl.BufferData(GL_ARRAY_BUFFER,vertices.size()*sizeof(float),vertices.data(),GL_DYNAMIC_DRAW);mesh.count=vertices.size()/8; }
void vertex(std::vector<float>& out,Vec3 p,Vec3 n,float u,float v){out.insert(out.end(),{p.x,p.y,p.z,n.x,n.y,n.z,u,v});}
void quad(std::vector<float>& out,Vec3 a,Vec3 b,Vec3 c,Vec3 d,Vec3 n,float u0,float v0,float u1,float v1){vertex(out,a,n,u0,v1);vertex(out,b,n,u1,v1);vertex(out,c,n,u1,v0);vertex(out,a,n,u0,v1);vertex(out,c,n,u1,v0);vertex(out,d,n,u0,v0);}
void box(std::vector<float>& out,float x,float y,float z,float w,float h,float d,std::uint32_t tile){const float x0=x-w,x1=x+w,y0=y,y1=y+h,z0=z-d,z1=z+d,u0=(tile%8+2/512.0F)/8,u1=(tile%8+510/512.0F)/8,v0=(tile/8+2/512.0F)/8,v1=(tile/8+510/512.0F)/8;quad(out,{x0,y0,z1},{x1,y0,z1},{x1,y1,z1},{x0,y1,z1},{0,0,1},u0,v0,u1,v1);quad(out,{x1,y0,z0},{x0,y0,z0},{x0,y1,z0},{x1,y1,z0},{0,0,-1},u0,v0,u1,v1);quad(out,{x0,y0,z0},{x0,y0,z1},{x0,y1,z1},{x0,y1,z0},{-1,0,0},u0,v0,u1,v1);quad(out,{x1,y0,z1},{x1,y0,z0},{x1,y1,z0},{x1,y1,z1},{1,0,0},u0,v0,u1,v1);quad(out,{x0,y1,z1},{x1,y1,z1},{x1,y1,z0},{x0,y1,z0},{0,1,0},u0,v0,u1,v1);}

struct ObjRef { int position{},uv{},normal{}; };
ObjRef obj_ref(const std::string& text) { ObjRef ref;char slash=0;std::istringstream stream(text);stream>>ref.position;if(stream.peek()=='/'){stream>>slash;if(stream.peek()!='/')stream>>ref.uv;if(stream.peek()=='/')stream>>slash>>ref.normal;}return ref; }
std::vector<float> load_obj(const std::filesystem::path& path) {
  std::ifstream input(path);if(!input)throw std::runtime_error("Cannot open "+path.string());
  std::vector<Vec3> positions,normals;std::vector<std::array<float,2>> uvs;std::vector<float> output;std::string line;
  const auto index=[](int value,std::size_t size)->std::size_t{const int resolved=value>0?value-1:int(size)+value;if(resolved<0||resolved>=int(size))throw std::runtime_error("OBJ index is outside its source array");return resolved;};
  while(std::getline(input,line)){std::istringstream stream(line);std::string kind;stream>>kind;if(kind=="v"){Vec3 p{};stream>>p.x>>p.y>>p.z;positions.push_back(p);}else if(kind=="vn"){Vec3 n{};stream>>n.x>>n.y>>n.z;normals.push_back(normalize(n));}else if(kind=="vt"){std::array<float,2> uv{};stream>>uv[0]>>uv[1];uvs.push_back(uv);}else if(kind=="f"){std::vector<ObjRef> face;std::string token;while(stream>>token)face.push_back(obj_ref(token));for(std::size_t triangle=1;triangle+1<face.size();triangle++)for(std::size_t corner:{std::size_t(0),triangle,triangle+1}){const auto ref=face[corner];const Vec3 p=positions.at(index(ref.position,positions.size()));const Vec3 n=ref.normal?normals.at(index(ref.normal,normals.size())):Vec3{0,1,0};const auto uv=ref.uv?uvs.at(index(ref.uv,uvs.size())):std::array<float,2>{0,0};vertex(output,p,n,uv[0],uv[1]);}}}
  if(output.empty())throw std::runtime_error("OBJ contains no triangles: "+path.string());
  return output;
}

void append_instance(std::vector<float>& target,const std::vector<float>& source,float x,float z,float angle,float scale) { const float c=std::cos(angle),s=std::sin(angle);target.reserve(target.size()+source.size());for(std::size_t i=0;i<source.size();i+=8){const float px=source[i]*scale,pz=source[i+2]*scale,nx=source[i+3],nz=source[i+5];target.insert(target.end(),{x+px*c-pz*s,source[i+1]*scale,z+px*s+pz*c,nx*c-nz*s,source[i+4],nx*s+nz*c,source[i+6],source[i+7]});}}

GLuint upload_texture(Gl& gl,const Image& image,std::uint32_t anisotropy) { GLuint texture;gl.GenTextures(1,&texture);gl.BindTexture(GL_TEXTURE_2D,texture);const GLenum format=image.channels==4?GL_RGBA:GL_RGB;gl.TexImage2D(GL_TEXTURE_2D,0,image.channels==4?GL_SRGB8_ALPHA8:GL_SRGB8,image.width,image.height,0,format,GL_UNSIGNED_BYTE,image.pixels.data());gl.GenerateMipmap(GL_TEXTURE_2D);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR_MIPMAP_LINEAR);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_REPEAT);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_REPEAT);const char* extensions=reinterpret_cast<const char*>(gl.GetString(GL_EXTENSIONS));if(extensions&&std::strstr(extensions,"GL_EXT_texture_filter_anisotropic")){GLfloat maximum=1;gl.GetFloatv(GL_MAX_TEXTURE_MAX_ANISOTROPY_EXT,&maximum);gl.TexParameterf(GL_TEXTURE_2D,GL_TEXTURE_MAX_ANISOTROPY_EXT,std::min<float>(maximum,anisotropy));}return texture; }

constexpr const char* kVertex = R"GLSL(#version 330 core
layout(location=0) in vec3 position;layout(location=1) in vec3 normal;layout(location=2) in vec2 uv;
uniform mat4 viewProjection;uniform mat4 lightViewProjection;out vec3 worldNormal;out vec2 texcoord;out vec4 lightPosition;
void main(){gl_Position=viewProjection*vec4(position,1);worldNormal=normal;texcoord=uv;lightPosition=lightViewProjection*vec4(position,1);})GLSL";
constexpr const char* kFragment = R"GLSL(#version 330 core
in vec3 worldNormal;in vec2 texcoord;in vec4 lightPosition;out vec4 color;uniform sampler2D surface;uniform sampler2D shadowMap;uniform vec3 tint;uniform vec3 lightDirection;uniform float emissive;uniform float alphaCutoff;
float shadow(){vec3 p=lightPosition.xyz/lightPosition.w*.5+.5;if(p.z>1)return 0;float bias=max(.00035*(1-dot(normalize(worldNormal),-lightDirection)),.00008);vec2 pixel=1.0/textureSize(shadowMap,0);float value=0;for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++)value+=p.z-bias>texture(shadowMap,p.xy+vec2(x,y)*pixel).r?1:0;return value/9;}
void main(){vec4 texel=texture(surface,texcoord);if(texel.a<alphaCutoff)discard;float diffuse=max(.18,dot(normalize(worldNormal),-lightDirection));vec3 lit=texel.rgb*tint*(diffuse*(1-.68*shadow())+.12)+texel.rgb*emissive;color=vec4(lit,texel.a);})GLSL";
constexpr const char* kShadowVertex = R"GLSL(#version 330 core
layout(location=0) in vec3 position;uniform mat4 lightViewProjection;void main(){gl_Position=lightViewProjection*vec4(position,1);})GLSL";
constexpr const char* kShadowFragment = R"GLSL(#version 330 core
void main(){})GLSL";

struct Renderer {
  Gl& gl;VeldrenDesktopQuality quality;GLuint program{},shadow_program{},atlas{},ground{},white{},shadow_texture{},shadow_fbo{};Mesh terrain{},actors{},effects{};std::vector<Mesh> foliage;Mat4 light_vp{};
  Renderer(Gl& api,const VeldrenDesktopAssets& assets,VeldrenDesktopQuality q):gl(api),quality(q){
    program=make_program(gl,kVertex,kFragment);shadow_program=make_program(gl,kShadowVertex,kShadowFragment);atlas=upload_texture(gl,load_png(assets.world_atlas),q.anisotropy);ground=upload_texture(gl,load_png(assets.ground_surfaces),q.anisotropy);white=upload_texture(gl,Image{1,1,4,{255,255,255,255}},1);
    std::vector<float> ground_mesh;const float extent=q.far_clip*.82F;quad(ground_mesh,{-extent,0,-extent},{extent,0,-extent},{extent,0,extent},{-extent,0,extent},{0,1,0},0,0,extent*.08F,extent*.08F);terrain=upload_mesh(gl,ground_mesh);
    std::vector<std::vector<float>> plant_models;plant_models.reserve(assets.foliage_models.size());for(const auto& path:assets.foliage_models)plant_models.push_back(load_obj(path));
    std::vector<std::vector<float>> plants(plant_models.size());std::uint32_t seed=0x9e3779b9U;const std::uint32_t count=static_cast<std::uint32_t>(1800*q.foliage_density);for(std::uint32_t i=0;i<count;i++){seed=seed*1664525U+1013904223U;const float a=float(seed&65535)/65535*6.2831853F;seed=seed*1664525U+1013904223U;const float r=std::sqrt(float(seed&65535)/65535)*q.foliage_radius,x=std::cos(a)*r,z=std::sin(a)*r;seed=seed*1664525U+1013904223U;const std::size_t model=(seed>>16)%plant_models.size();const float scale=.72F+float(seed&255)/255*.95F;append_instance(plants[model],plant_models[model],x,z,a*1.7F,scale);}foliage.reserve(plants.size());for(const auto& vertices:plants)foliage.push_back(upload_mesh(gl,vertices));
    actors=upload_mesh(gl,{},GL_DYNAMIC_DRAW);effects=upload_mesh(gl,{},GL_DYNAMIC_DRAW);
    gl.GenTextures(1,&shadow_texture);gl.BindTexture(GL_TEXTURE_2D,shadow_texture);gl.TexImage2D(GL_TEXTURE_2D,0,GL_DEPTH_COMPONENT24,q.shadow_map_size,q.shadow_map_size,0,GL_DEPTH_COMPONENT,GL_UNSIGNED_INT,nullptr);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MIN_FILTER,GL_LINEAR);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_MAG_FILTER,GL_LINEAR);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_S,GL_CLAMP_TO_EDGE);gl.TexParameteri(GL_TEXTURE_2D,GL_TEXTURE_WRAP_T,GL_CLAMP_TO_EDGE);gl.GenFramebuffers(1,&shadow_fbo);gl.BindFramebuffer(GL_FRAMEBUFFER,shadow_fbo);gl.FramebufferTexture2D(GL_FRAMEBUFFER,GL_DEPTH_ATTACHMENT,GL_TEXTURE_2D,shadow_texture,0);gl.DrawBuffer(GL_NONE);gl.ReadBuffer(GL_NONE);if(gl.CheckFramebufferStatus(GL_FRAMEBUFFER)!=GL_FRAMEBUFFER_COMPLETE)throw std::runtime_error("Desktop shadow framebuffer is incomplete");gl.BindFramebuffer(GL_FRAMEBUFFER,0);
    light_vp=multiply(orthographic(q.foliage_radius*1.3F,-q.far_clip,q.far_clip),look_at({-180,260,-120},{0,0,0},{0,1,0}));
  }
  ~Renderer(){for(auto mesh:{terrain,actors,effects}){if(mesh.vbo)gl.DeleteBuffers(1,&mesh.vbo);if(mesh.vao)gl.DeleteVertexArrays(1,&mesh.vao);}for(const auto& mesh:foliage){if(mesh.vbo)gl.DeleteBuffers(1,&mesh.vbo);if(mesh.vao)gl.DeleteVertexArrays(1,&mesh.vao);}gl.DeleteFramebuffers(1,&shadow_fbo);gl.DeleteTextures(1,&shadow_texture);gl.DeleteTextures(1,&atlas);gl.DeleteTextures(1,&ground);gl.DeleteTextures(1,&white);gl.DeleteProgram(program);gl.DeleteProgram(shadow_program);}
  void update(std::span<const VeldrenRenderState> states,float time){std::vector<float> actor_vertices,effect_vertices;actor_vertices.reserve(states.size()*30*8);for(const auto& state:states){const float bounce=std::sin(state.phase*6.2831853F)*.025F*state.blend;box(actor_vertices,state.x,bounce,state.z,.28F,1.28F,.24F,20+state.id%9);if(state.id%11==0){const float angle=time*1.8F+state.id,ex=state.x+std::cos(angle)*.85F,ez=state.z+std::sin(angle)*.85F;box(effect_vertices,ex,.55F+std::sin(angle*1.7F)*.25F,ez,.055F,.11F,.055F,39);}}update_mesh(gl,actors,actor_vertices);update_mesh(gl,effects,effect_vertices);}
  void draw_mesh(const Mesh& mesh,GLuint texture,std::array<float,3> tint,float emissive,float cutoff){if(!mesh.count)return;gl.ActiveTexture(GL_TEXTURE0);gl.BindTexture(GL_TEXTURE_2D,texture);gl.Uniform3f(gl.GetUniformLocation(program,"tint"),tint[0],tint[1],tint[2]);gl.Uniform1f(gl.GetUniformLocation(program,"emissive"),emissive);gl.Uniform1f(gl.GetUniformLocation(program,"alphaCutoff"),cutoff);gl.BindVertexArray(mesh.vao);gl.DrawArrays(GL_TRIANGLES,0,mesh.count);}
  void frame(float time,std::span<const VeldrenRenderState> states,int width,int height,float player_x,float player_z,float camera_yaw){update(states,time);gl.Enable(GL_DEPTH_TEST);gl.DepthFunc(GL_LEQUAL);gl.Enable(GL_CULL_FACE);gl.CullFace(GL_BACK);light_vp=multiply(orthographic(quality.foliage_radius*1.3F,-quality.far_clip,quality.far_clip),look_at({player_x-180,260,player_z-120},{player_x,0,player_z},{0,1,0}));
    gl.BindFramebuffer(GL_FRAMEBUFFER,shadow_fbo);gl.Viewport(0,0,quality.shadow_map_size,quality.shadow_map_size);gl.Clear(GL_DEPTH_BUFFER_BIT);gl.UseProgram(shadow_program);gl.UniformMatrix4fv(gl.GetUniformLocation(shadow_program,"lightViewProjection"),1,GL_FALSE,light_vp.v.data());for(const Mesh* mesh:{&terrain,&actors}){gl.BindVertexArray(mesh->vao);gl.DrawArrays(GL_TRIANGLES,0,mesh->count);}for(const auto& mesh:foliage){gl.BindVertexArray(mesh.vao);gl.DrawArrays(GL_TRIANGLES,0,mesh.count);}
    gl.BindFramebuffer(GL_FRAMEBUFFER,0);gl.Viewport(0,0,width,height);gl.ClearColor(.055F,.12F,.19F,1);gl.Clear(GL_COLOR_BUFFER_BIT|GL_DEPTH_BUFFER_BIT);gl.UseProgram(program);const Vec3 camera{player_x+std::sin(camera_yaw)*58,38,player_z+std::cos(camera_yaw)*58};const Mat4 vp=multiply(perspective(55*3.14159265F/180,float(width)/std::max(1,height),.1F,quality.far_clip),look_at(camera,{player_x,0,player_z},{0,1,0}));gl.UniformMatrix4fv(gl.GetUniformLocation(program,"viewProjection"),1,GL_FALSE,vp.v.data());gl.UniformMatrix4fv(gl.GetUniformLocation(program,"lightViewProjection"),1,GL_FALSE,light_vp.v.data());gl.Uniform3f(gl.GetUniformLocation(program,"lightDirection"),.55F,-1,.38F);gl.Uniform1i(gl.GetUniformLocation(program,"surface"),0);gl.ActiveTexture(GL_TEXTURE1);gl.BindTexture(GL_TEXTURE_2D,shadow_texture);gl.Uniform1i(gl.GetUniformLocation(program,"shadowMap"),1);draw_mesh(terrain,ground,{.78F,.86F,.72F},0,0);gl.Disable(GL_CULL_FACE);const std::array<std::array<float,3>,11> foliage_tints{{{.28F,.72F,.24F},{.38F,.82F,.30F},{.20F,.62F,.28F},{.62F,.38F,.88F},{.92F,.24F,.20F},{.98F,.78F,.18F},{.86F,.16F,.12F},{.68F,.48F,.26F},{.34F,.56F,.24F},{.46F,.29F,.16F},{.56F,.58F,.54F}}};for(std::size_t i=0;i<foliage.size();i++)draw_mesh(foliage[i],white,foliage_tints[i],0,0);gl.Enable(GL_CULL_FACE);draw_mesh(actors,atlas,{1,1,1},0,0);gl.Disable(GL_CULL_FACE);gl.Enable(GL_BLEND);gl.BlendFunc(GL_SRC_ALPHA,GL_ONE_MINUS_SRC_ALPHA);draw_mesh(effects,atlas,{.65F,.82F,1},1.8F,0);gl.Disable(GL_BLEND);
  }
};
}  // namespace

bool veldren_desktop_renderer_assets_valid(const VeldrenDesktopAssets& assets, std::string* error) {
  try {
    const auto atlas = load_png(assets.world_atlas);
    const auto ground = load_png(assets.ground_surfaces);
    if (atlas.width != 4096 || atlas.height != 4096 || atlas.channels != 4)
      throw std::runtime_error("Desktop atlas is not the full 4096 RGBA source");
    if (ground.width != 1024 || ground.height != 1024 || ground.channels != 3)
      throw std::runtime_error("Desktop ground surfaces are not the full 1024 RGB source");
    for (const auto& path : assets.foliage_models) (void)load_obj(path);
    return true;
  } catch (const std::exception& failure) {
    if (error) *error = failure.what();
    return false;
  }
}

int veldren_run_desktop(VeldrenDesktopClient& client,
                        const VeldrenDesktopAssets& assets,
                        const VeldrenDesktopQuality& quality) {
  try {
    Sdl sdl;if(sdl.init(SDL_INIT_VIDEO)!=0)throw std::runtime_error(sdl.get_error());
    sdl.gl_set_attribute(SDL_GL_CONTEXT_MAJOR_VERSION,3);sdl.gl_set_attribute(SDL_GL_CONTEXT_MINOR_VERSION,3);sdl.gl_set_attribute(SDL_GL_CONTEXT_PROFILE_MASK,SDL_GL_CONTEXT_PROFILE_CORE);sdl.gl_set_attribute(SDL_GL_DOUBLEBUFFER,1);sdl.gl_set_attribute(SDL_GL_DEPTH_SIZE,24);sdl.gl_set_attribute(SDL_GL_STENCIL_SIZE,8);sdl.gl_set_attribute(SDL_GL_MULTISAMPLEBUFFERS,quality.msaa_samples?1:0);sdl.gl_set_attribute(SDL_GL_MULTISAMPLESAMPLES,quality.msaa_samples);
    SDL_Window* window=sdl.create_window("Veldren: The Unwritten Age",SDL_WINDOWPOS_CENTERED,SDL_WINDOWPOS_CENTERED,quality.width,quality.height,SDL_WINDOW_OPENGL|SDL_WINDOW_RESIZABLE|SDL_WINDOW_ALLOW_HIGHDPI);if(!window){sdl.quit();throw std::runtime_error(sdl.get_error());}
    SDL_GLContext context=sdl.gl_create_context(window);if(!context){sdl.destroy_window(window);sdl.quit();throw std::runtime_error(sdl.get_error());}sdl.gl_set_swap_interval(1);Gl gl(sdl);if(quality.msaa_samples)gl.Enable(GL_MULTISAMPLE);Renderer renderer(gl,assets,quality);
    sdl.set_relative_mouse_mode(1);bool running=true;SDL_Event event{};auto previous=std::chrono::steady_clock::now();float time=0,camera_yaw=.65F,player_x=0,player_z=0;while(running){while(sdl.poll_event(&event))if(event.type==SDL_QUIT)running=false;const auto now=std::chrono::steady_clock::now();const float seconds=std::chrono::duration<float>(now-previous).count();previous=now;time+=std::min(seconds,.1F);int mouse_x=0,mouse_y=0;sdl.get_relative_mouse_state(&mouse_x,&mouse_y);(void)mouse_y;camera_yaw-=mouse_x*.0025F;int key_count=0;const auto* keys=sdl.get_keyboard_state(&key_count);if(keys&&key_count>SDL_SCANCODE_ESCAPE&&keys[SDL_SCANCODE_ESCAPE])running=false;float forward=0,side=0;if(keys&&key_count>SDL_SCANCODE_W){forward=float(keys[SDL_SCANCODE_W])-float(keys[SDL_SCANCODE_S]);side=float(keys[SDL_SCANCODE_D])-float(keys[SDL_SCANCODE_A]);}const float length=std::hypot(forward,side);if(length>.01F){const float dx=(std::sin(camera_yaw)*forward+std::cos(camera_yaw)*side)/length,dz=(std::cos(camera_yaw)*forward-std::sin(camera_yaw)*side)/length;client.move_actor(1,player_x+dx*12,player_z+dz*12,7.2F);}client.step(seconds,player_x,player_z,quality.far_clip);if(!client.render_states().empty()){player_x=client.render_states()[0].x;player_z=client.render_states()[0].z;}int width=quality.width,height=quality.height;sdl.get_window_size(window,&width,&height);renderer.frame(time,client.render_states(),std::max(1,width),std::max(1,height),player_x,player_z,camera_yaw);sdl.gl_swap_window(window);}
    sdl.gl_delete_context(context);sdl.destroy_window(window);sdl.quit();return 0;
  } catch(const std::exception& error) { std::cerr<<"Veldren desktop renderer failed: "<<error.what()<<'\n';return 4; }
}
