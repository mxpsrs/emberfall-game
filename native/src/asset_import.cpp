#include "veldren/asset_import.h"
#include <algorithm>
#include <bit>
#include <cmath>
#include <cstring>
#include <limits>
#include <numeric>
#include <set>
#include <stdexcept>

namespace veldren {
std::string asset_base64(std::span<const std::uint8_t> bytes) {
  static constexpr char alphabet[]="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  std::string out;out.reserve((bytes.size()+2)/3*4);
  for(std::size_t i=0;i<bytes.size();i+=3){const unsigned a=bytes[i],b=i+1<bytes.size()?bytes[i+1]:0,c=i+2<bytes.size()?bytes[i+2]:0;out+=alphabet[a>>2];out+=alphabet[((a&3)<<4)|(b>>4)];out+=i+1<bytes.size()?alphabet[((b&15)<<2)|(c>>6)]:'=';out+=i+2<bytes.size()?alphabet[c&63]:'=';}return out;
}
AssetBytes asset_unbase64(std::string_view text) {
  if(text.size()%4)throw std::invalid_argument("Malformed base64 length");
  AssetBytes out;out.reserve(text.size()/4*3);
  const std::string alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  for(std::size_t i=0;i<text.size();i+=4){unsigned value=0,padding=0;for(unsigned j=0;j<4;++j){const char c=text[i+j];if(c=='='){if(i+4!=text.size()||j<2)throw std::invalid_argument("Malformed base64 padding");++padding;value<<=6;}else{const auto n=alphabet.find(c);if(n==std::string::npos||padding)throw std::invalid_argument("Malformed base64 data");value=(value<<6)|unsigned(n);}}out.push_back(std::uint8_t(value>>16));if(padding<2)out.push_back(std::uint8_t(value>>8));if(!padding)out.push_back(std::uint8_t(value));}return out;
}
std::string asset_sha256(std::span<const std::uint8_t> bytes) {
  static constexpr std::uint32_t k[]={0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2};
  std::uint32_t h[]={0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19};
  AssetBytes input(bytes.begin(),bytes.end());const std::uint64_t bits=input.size()*8;input.push_back(128);while(input.size()%64!=56)input.push_back(0);for(int i=7;i>=0;--i)input.push_back(std::uint8_t(bits>>(i*8)));
  for(std::size_t offset=0;offset<input.size();offset+=64){std::uint32_t w[64];for(int i=0;i<16;++i)w[i]=(std::uint32_t(input[offset+i*4])<<24)|(std::uint32_t(input[offset+i*4+1])<<16)|(std::uint32_t(input[offset+i*4+2])<<8)|input[offset+i*4+3];for(int i=16;i<64;++i){const auto a=w[i-15],b=w[i-2];w[i]=w[i-16]+(std::rotr(a,7)^std::rotr(a,18)^(a>>3))+w[i-7]+(std::rotr(b,17)^std::rotr(b,19)^(b>>10));}
    auto a=h[0],b=h[1],c=h[2],d=h[3],e=h[4],f=h[5],g=h[6],hh=h[7];for(int i=0;i<64;++i){const auto t1=hh+(std::rotr(e,6)^std::rotr(e,11)^std::rotr(e,25))+((e&f)^((~e)&g))+k[i]+w[i],t2=(std::rotr(a,2)^std::rotr(a,13)^std::rotr(a,22))+((a&b)^(a&c)^(b&c));hh=g;g=f;f=e;e=d+t1;d=c;c=b;b=a;a=t1+t2;}h[0]+=a;h[1]+=b;h[2]+=c;h[3]+=d;h[4]+=e;h[5]+=f;h[6]+=g;h[7]+=hh;}
  const char* hex="0123456789abcdef";std::string out;for(auto n:h)for(int shift=28;shift>=0;shift-=4)out+=hex[(n>>shift)&15];return out;
}
namespace {
[[noreturn]] void bad(const std::string& message){throw std::invalid_argument("GLTF: "+message);}
const Json empty_object{Json::Object{}};
const Json& field(const Json& value,std::string_view key){const auto* result=value.find(key);return result?*result:empty_object;}
const Json::Array& array(const Json& value,std::string_view key){static const Json::Array empty;const auto* result=value.find(key);return result?result->array():empty;}
std::string str(const Json& value,const char* key,const std::string& fallback={}){const auto* result=value.find(key);return result?result->string_or(fallback):fallback;}
double num(const Json& value,const char* key,double fallback=0){const auto* result=value.find(key);return result?result->number_or(fallback):fallback;}
std::size_t integer(const Json& value,const char* key,std::size_t fallback=0){const auto n=num(value,key,double(fallback));if(!std::isfinite(n)||n<0||std::floor(n)!=n||n>double(std::numeric_limits<std::uint32_t>::max()))bad(std::string("Invalid integer ")+key);return std::size_t(n);}
std::size_t index(const Json& value,std::size_t size,const std::string& label){const auto n=value.number_or(-1);if(n<0||std::floor(n)!=n||n>=double(size))bad("Invalid "+label+" index");return std::size_t(n);}
std::uint32_t u32(std::span<const std::uint8_t> b,std::size_t at){if(at>b.size()||b.size()-at<4)bad("Truncated integer");return b[at]|(std::uint32_t(b[at+1])<<8)|(std::uint32_t(b[at+2])<<16)|(std::uint32_t(b[at+3])<<24);}
Json values(std::span<const double> input){Json::Array out;for(auto v:input)out.emplace_back(v);return out;}
Json floats(const std::vector<double>& data,unsigned width){AssetBytes bytes;bytes.reserve(data.size()*4);for(double n:data){const float f=float(n);if(!std::isfinite(f))bad("Nonfinite float attribute");const auto bits=std::bit_cast<std::uint32_t>(f);for(int j=0;j<4;++j)bytes.push_back(std::uint8_t(bits>>(8*j)));}return Json::Object{{"encoding","float32-le"},{"components",int(width)},{"count",double(data.size()/width)},{"data",asset_base64(bytes)}};}
Json indices(const std::vector<std::uint32_t>& data){AssetBytes bytes;bytes.reserve(data.size()*4);for(auto n:data)for(int j=0;j<4;++j)bytes.push_back(std::uint8_t(n>>(8*j)));return Json::Object{{"encoding","uint32-le"},{"count",double(data.size())},{"data",asset_base64(bytes)}};}
struct Accessor {std::vector<double> values;unsigned width=0;std::size_t count=0;int component=0;};
class Importer {
 public:
  Importer(std::span<const std::uint8_t> source,std::string id,AssetResolver resolve):id_(std::move(id)),resolve_(std::move(resolve)),hash_(asset_sha256(source)) {
    if(id_.empty())bad("Stable model identity required");
    if(source.size()>=4&&u32(source,0)==0x46546c67){if(source.size()<20||u32(source,4)!=2||u32(source,8)!=source.size())bad("Malformed GLB header");std::size_t at=12;bool json=false,bin=false;while(at<source.size()){if(source.size()-at<8)bad("Truncated GLB chunk");const auto length=u32(source,at),type=u32(source,at+4);at+=8;if(length%4||length>source.size()-at)bad("Invalid GLB chunk length");if(type==0x4e4f534a){if(json||at!=20)bad("GLB JSON must be first and unique");g_=parse_json(std::string_view(reinterpret_cast<const char*>(source.data()+at),length));json=true;}else if(type==0x004e4942){if(!json||bin)bad("Invalid GLB BIN chunk");binary_.assign(source.begin()+at,source.begin()+at+length);bin=true;}at+=length;}if(!json)bad("GLB has no JSON");}
    else g_=parse_json(std::string_view(reinterpret_cast<const char*>(source.data()),source.size()));
    if(str(field(g_,"asset"),"version")!="2.0")bad("Only GLTF 2.0 assets are supported");
    const std::set<std::string> supported{"KHR_texture_transform","KHR_materials_unlit","KHR_materials_emissive_strength","KHR_mesh_quantization"};
    for(const auto& ext:array(g_,"extensionsRequired"))if(!supported.contains(ext.string_or()))bad("Unsupported required extension: "+ext.string_or());
    for(const auto& buffer:array(g_,"buffers")){auto bytes=buffer.find("uri")?uri(str(buffer,"uri")):binary_;const auto size=integer(buffer,"byteLength");if(bytes.size()<size||(!buffer.find("uri")&&bytes.size()>size+3))bad("Buffer length mismatch");bytes.resize(size);buffers_.push_back(std::move(bytes));}
  }
  Json run();
 private:
  std::string id_;AssetResolver resolve_;std::string hash_;Json g_;AssetBytes binary_;std::vector<AssetBytes> buffers_;std::map<std::size_t,Accessor> accessors_;Json::Array issues_,images_,materials_,meshes_,nodes_,skins_,animations_;std::map<std::string,std::string> source_dependencies_;
  void issue(const std::string& severity,const std::string& code,const std::string& message){issues_.emplace_back(Json::Object{{"severity",severity},{"code",code},{"message",message}});}
  AssetBytes uri(const std::string& value){if(value.starts_with("data:")){const auto comma=value.find(',');if(comma==std::string::npos||value.substr(0,comma).find(";base64")==std::string::npos)bad("Only base64 data URIs supported");return asset_unbase64(value.substr(comma+1));}if(value.empty()||value.find("://")!=std::string::npos||value.starts_with('/'))bad("External asset URI must be relative");auto bytes=resolve_(value);source_dependencies_[value]=asset_sha256(bytes);return bytes;}
  std::span<const std::uint8_t> view(std::size_t i){const auto& views=array(g_,"bufferViews");if(i>=views.size())bad("Invalid bufferView");const auto& v=views[i];const auto buffer=integer(v,"buffer",buffers_.size()),offset=integer(v,"byteOffset"),length=integer(v,"byteLength");if(buffer>=buffers_.size()||offset>buffers_[buffer].size()||length>buffers_[buffer].size()-offset)bad("BufferView exceeds buffer");return std::span(buffers_[buffer]).subspan(offset,length);}
  double component(std::span<const std::uint8_t> data,std::size_t at,int type,bool normalized){unsigned width=type==5120||type==5121?1:type==5122||type==5123?2:type==5125||type==5126?4:0;if(!width||at>data.size()||width>data.size()-at)bad("Invalid/truncated accessor component");std::uint32_t bits=0;for(unsigned j=0;j<width;++j)bits|=std::uint32_t(data[at+j])<<(8*j);double result=0;switch(type){case 5120:result=std::bit_cast<std::int8_t>(std::uint8_t(bits));if(normalized)result=std::max(-1.0,result/127);break;case 5121:result=bits;if(normalized)result/=255;break;case 5122:result=std::bit_cast<std::int16_t>(std::uint16_t(bits));if(normalized)result=std::max(-1.0,result/32767);break;case 5123:result=bits;if(normalized)result/=65535;break;case 5125:if(normalized)bad("Normalized uint32 accessor");result=bits;break;case 5126:if(normalized)bad("Normalized float accessor");result=std::bit_cast<float>(bits);break;}if(!std::isfinite(result))bad("Nonfinite accessor value");return result;}
  const Accessor& accessor(std::size_t i){
    if(auto it=accessors_.find(i);it!=accessors_.end())return it->second;
    const auto& entries=array(g_,"accessors");if(i>=entries.size())bad("Invalid accessor reference");const auto& a=entries[i];const auto type=str(a,"type");unsigned rows=0,cols=1;if(type=="SCALAR")rows=1;else if(type=="VEC2")rows=2;else if(type=="VEC3")rows=3;else if(type=="VEC4")rows=4;else if(type=="MAT2")rows=cols=2;else if(type=="MAT3")rows=cols=3;else if(type=="MAT4")rows=cols=4;else bad("Unknown accessor type");
    Accessor out;out.width=rows*cols;out.count=integer(a,"count");out.component=int(integer(a,"componentType"));if(!out.count||out.count>16000000)bad("Invalid/excessive accessor count");const unsigned bytes=out.component==5120||out.component==5121?1:out.component==5122||out.component==5123?2:out.component==5125||out.component==5126?4:0;if(!bytes)bad("Unknown accessor component type");const auto normalized=field(a,"normalized").bool_or();const unsigned column=cols>1?(rows*bytes+3)&~3u:rows*bytes,span=cols*column;out.values.resize(out.count*out.width);
    auto read=[&](std::size_t vi,std::size_t offset,std::size_t count,std::size_t stride,std::vector<double>& target){const auto data=view(vi);if(stride<span||stride%bytes||offset%bytes||offset>data.size()||span>data.size()-offset||count-1>(data.size()-offset-span)/stride)bad("Accessor exceeds bufferView or is misaligned");for(std::size_t n=0;n<count;++n)for(unsigned c=0;c<out.width;++c)target[n*out.width+c]=component(data,offset+n*stride+(c/rows)*column+(c%rows)*bytes,out.component,normalized);};
    if(a.find("bufferView")){const auto vi=integer(a,"bufferView");const auto& views=array(g_,"bufferViews");if(vi>=views.size())bad("Missing accessor bufferView");read(vi,integer(a,"byteOffset"),out.count,integer(views[vi],"byteStride",span),out.values);}else if(!a.find("sparse"))bad("Accessor has neither storage nor sparse data");
    if(const auto* sparse=a.find("sparse")){const auto count=integer(*sparse,"count");if(!count||count>out.count)bad("Invalid sparse count");const auto& index_info=field(*sparse,"indices");const int index_type=int(integer(index_info,"componentType"));const unsigned index_bytes=index_type==5121?1:index_type==5123?2:index_type==5125?4:0;if(!index_bytes)bad("Invalid sparse index type");const auto data=view(integer(index_info,"bufferView",std::numeric_limits<std::uint32_t>::max()));const auto offset=integer(index_info,"byteOffset");const auto& value_info=field(*sparse,"values");std::vector<double> replacement(count*out.width);read(integer(value_info,"bufferView",std::numeric_limits<std::uint32_t>::max()),integer(value_info,"byteOffset"),count,span,replacement);std::size_t previous=0;for(std::size_t n=0;n<count;++n){const auto position=std::size_t(component(data,offset+n*index_bytes,index_type,false));if(position>=out.count||(n&&position<=previous))bad("Sparse indices must be increasing and in range");previous=position;std::copy_n(replacement.begin()+n*out.width,out.width,out.values.begin()+position*out.width);}}
    return accessors_.emplace(i,std::move(out)).first->second;
  }
  void import_images();void import_materials();void import_meshes();void import_nodes();void import_skins();void import_animations();
};
void Importer::import_images(){
  for(const auto& image:array(g_,"images")){
    AssetBytes bytes;const auto source=str(image,"uri");if(!source.empty())bytes=uri(source);else if(image.find("bufferView")){const auto data=view(integer(image,"bufferView"));bytes.assign(data.begin(),data.end());}else bad("Image has no storage");
    unsigned width=0,height=0;std::string mime;
    auto be32=[&](std::size_t at){if(at>bytes.size()||bytes.size()-at<4)bad("Truncated image");return (unsigned(bytes[at])<<24)|(unsigned(bytes[at+1])<<16)|(unsigned(bytes[at+2])<<8)|bytes[at+3];};
    static constexpr std::uint8_t png[]={137,80,78,71,13,10,26,10};
    if(bytes.size()>=24&&std::equal(std::begin(png),std::end(png),bytes.begin())){
      mime="image/png";bool header=false,end=false,pixels=false;std::size_t at=8;
      while(at<bytes.size()){if(bytes.size()-at<12)bad("Truncated PNG chunk");const auto size=be32(at);if(size>bytes.size()-at-12)bad("PNG chunk exceeds image");const std::string type(reinterpret_cast<const char*>(bytes.data()+at+4),4);static const auto crc_table=[](){std::array<std::uint32_t,256> table{};for(unsigned i=0;i<256;++i){auto value=i;for(int bit=0;bit<8;++bit)value=(value>>1)^(0xedb88320u&std::uint32_t(-std::int32_t(value&1)));table[i]=value;}return table;}();std::uint32_t crc=0xffffffff;for(std::size_t n=at+4;n<at+8+size;++n)crc=(crc>>8)^crc_table[(crc^bytes[n])&255];if((crc^0xffffffff)!=be32(at+8+size))bad("Corrupted PNG CRC");if(type=="IHDR"){if(header||at!=8||size!=13)bad("Invalid PNG header");width=be32(at+8);height=be32(at+12);header=true;}if(type=="IDAT")pixels=true;if(type=="IEND"){if(size)bad("Invalid PNG end");end=true;at+=12;break;}at+=size+12;}
      if(!header||!pixels||!end||at!=bytes.size())bad("Incomplete PNG image");
    }else if(bytes.size()>4&&bytes[0]==255&&bytes[1]==216){mime="image/jpeg";std::size_t at=2;bool end=bytes[bytes.size()-2]==255&&bytes.back()==217;while(at+4<bytes.size()){if(bytes[at++]!=255)bad("Malformed JPEG marker");while(at<bytes.size()&&bytes[at]==255)++at;if(at>=bytes.size())bad("Truncated JPEG marker");const auto marker=bytes[at++];if(marker==218||marker==217)break;const auto length=(unsigned(bytes[at])<<8)|bytes[at+1];if(length<2||length>bytes.size()-at)bad("Truncated JPEG segment");if((marker>=192&&marker<=195)||(marker>=197&&marker<=199)||(marker>=201&&marker<=203)||(marker>=205&&marker<=207)){if(length<8)bad("Malformed JPEG frame");height=(unsigned(bytes[at+3])<<8)|bytes[at+4];width=(unsigned(bytes[at+5])<<8)|bytes[at+6];}at+=length;}if(!end)bad("Truncated JPEG image");
    }else bad("Unsupported or corrupted image; expected PNG/JPEG");
    if(!width||!height||width>32768||height>32768)bad("Invalid/excessive image dimensions");
    if(width>4096||height>4096)issue("warning","large-texture","Source image exceeds browser profile dimensions; derive an appropriate variant");
    if(image.find("mimeType")&&str(image,"mimeType")!=mime)bad("Image MIME does not match content");
    images_.emplace_back(Json::Object{{"id",id_+"/image/"+std::to_string(images_.size())},{"name",str(image,"name",source)},{"uri",source},{"mimeType",mime},{"width",int(width)},{"height",int(height)},{"sourceHash",asset_sha256(bytes)},{"data",asset_base64(bytes)}});
  }
}
void Importer::import_materials(){
  auto texture=[&](const Json& info,const std::string& role)->Json{
    if(!info.find("index"))return nullptr;
    const auto& textures=array(g_,"textures");const auto& t=textures.at(index(field(info,"index"),textures.size(),"texture"));
    const auto image=index(field(t,"source"),images_.size(),"image");Json::Object sampler{{"minFilter",9987},{"magFilter",9729},{"wrapS",10497},{"wrapT",10497}};
    if(t.find("sampler")){const auto& samplers=array(g_,"samplers");for(const auto& [key,value]:samplers.at(index(field(t,"sampler"),samplers.size(),"sampler")).object())if(sampler.contains(key))sampler[key]=value;}
    const std::set<int> min_filters{9728,9729,9984,9985,9986,9987},mag_filters{9728,9729},wraps{33071,33648,10497};if(!min_filters.contains(int(sampler["minFilter"].number_or()))||!mag_filters.contains(int(sampler["magFilter"].number_or()))||!wraps.contains(int(sampler["wrapS"].number_or()))||!wraps.contains(int(sampler["wrapT"].number_or())))bad("Invalid texture sampler");
    const auto& transform=field(field(info,"extensions"),"KHR_texture_transform");Json::Object uv{{"offset",Json::Array{0,0}},{"scale",Json::Array{1,1}},{"rotation",0}};for(const auto& key:{"offset","scale","rotation"})if(transform.find(key))uv[key]=field(transform,key);
    for(const auto& key:{"offset","scale"})if(uv[key].array().size()!=2)bad("Texture transform must have two components");
    const auto channel=integer(transform,"texCoord",integer(info,"texCoord"));if(channel>7)bad("Unsupported UV channel index");
    return Json::Object{{"image",field(images_[image],"id")},{"role",role},{"colorSpace",role=="baseColor"||role=="emissive"?"srgb":"linear"},{"texCoord",double(channel)},{"transform",uv},{"sampler",sampler},{"scale",num(info,"scale",1)},{"strength",num(info,"strength",1)}};
  };
  for(const auto& material:array(g_,"materials")){
    const auto& pbr=field(material,"pbrMetallicRoughness");const auto alpha=str(material,"alphaMode","OPAQUE");if(alpha!="OPAQUE"&&alpha!="MASK"&&alpha!="BLEND")bad("Unsupported alpha mode");
    Json base=pbr.find("baseColorFactor")?field(pbr,"baseColorFactor"):Json(Json::Array{1,1,1,1}),emissive=material.find("emissiveFactor")?field(material,"emissiveFactor"):Json(Json::Array{0,0,0});
    if(base.array().size()!=4||emissive.array().size()!=3){bad("Invalid PBR color factor");}
    for(const auto& value:base.array())if(value.number_or(-1)<0||value.number_or()>1)bad("Base color factor out of range");
    const double metallic=num(pbr,"metallicFactor",1),roughness=num(pbr,"roughnessFactor",1),cutoff=num(material,"alphaCutoff",.5),strength=num(field(field(material,"extensions"),"KHR_materials_emissive_strength"),"emissiveStrength",1);if(metallic<0||metallic>1||roughness<0||roughness>1||cutoff<0||strength<0)bad("Invalid PBR scalar");
    materials_.emplace_back(Json::Object{{"id",id_+"/material/"+std::to_string(materials_.size())},{"name",str(material,"name")},{"baseColorFactor",base},{"baseColorTexture",texture(field(pbr,"baseColorTexture"),"baseColor")},{"metallic",metallic},{"roughness",roughness},{"metallicRoughnessTexture",texture(field(pbr,"metallicRoughnessTexture"),"metallicRoughness")},{"normalTexture",texture(field(material,"normalTexture"),"normal")},{"occlusionTexture",texture(field(material,"occlusionTexture"),"occlusion")},{"emissiveTexture",texture(field(material,"emissiveTexture"),"emissive")},{"emissiveFactor",emissive},{"emissiveStrength",strength},{"alphaMode",alpha},{"alphaCutoff",cutoff},{"doubleSided",field(material,"doubleSided").bool_or()},{"unlit",field(material,"extensions").find("KHR_materials_unlit")!=nullptr}});
  }
  materials_.emplace_back(Json::Object{{"id",id_+"/material/default"},{"name","Default GLTF material"},{"baseColorFactor",Json::Array{1,1,1,1}},{"metallic",1},{"roughness",1},{"emissiveFactor",Json::Array{0,0,0}},{"emissiveStrength",1},{"alphaMode","OPAQUE"},{"alphaCutoff",.5},{"doubleSided",false},{"unlit",false}});
}
void Importer::import_meshes(){
  for(const auto& mesh:array(g_,"meshes")){
    Json::Array primitives;for(const auto& primitive:array(mesh,"primitives")){
      const auto& attributes=field(primitive,"attributes");if(!attributes.find("POSITION"))bad("Mesh has no positions");
      const auto& position=accessor(index(field(attributes,"POSITION"),array(g_,"accessors").size(),"position accessor"));if(position.width!=3)bad("Position accessor must be VEC3");const auto count=position.count;
      std::map<std::string,Accessor> data;
      for(const auto& [name,value]:attributes.object()){
        const auto& a=accessor(index(value,array(g_,"accessors").size(),"vertex accessor"));if(a.count!=count)bad("Vertex attribute count mismatch");
        const unsigned width=name=="POSITION"||name=="NORMAL"?3:name=="TANGENT"||name.starts_with("JOINTS_")||name.starts_with("WEIGHTS_")?4:name.starts_with("TEXCOORD_")?2:0;
        if((width&&a.width!=width)||(name.starts_with("COLOR_")&&a.width!=3&&a.width!=4))bad("Invalid attribute shape: "+name);
        if(name.starts_with("JOINTS_")&&a.component!=5121&&a.component!=5123)bad("Joint indices require unsigned byte/short");
        data[name]=a;
      }
      std::vector<std::uint32_t> source_indices;
      if(primitive.find("indices")){const auto& a=accessor(index(field(primitive,"indices"),array(g_,"accessors").size(),"index accessor"));if(a.width!=1||(a.component!=5121&&a.component!=5123&&a.component!=5125))bad("Invalid index accessor type");for(double value:a.values){if(value<0||value>=double(count)||value!=std::floor(value))bad("Mesh index outside vertex stream");source_indices.push_back(std::uint32_t(value));}}
      else {source_indices.resize(count);std::iota(source_indices.begin(),source_indices.end(),0);}
      const auto mode=integer(primitive,"mode",4);std::vector<std::uint32_t> triangles;
      if(mode==4){if(source_indices.size()%3)bad("Triangle indices are not divisible by three");triangles=source_indices;}
      else if(mode==5||mode==6){for(std::size_t i=2;i<source_indices.size();++i){auto a=mode==6?source_indices[0]:source_indices[i-2],b=source_indices[i-1],c=source_indices[i];if(mode==5&&i%2)std::swap(a,b);if(a!=b&&b!=c&&a!=c)triangles.insert(triangles.end(),{a,b,c});}}
      else {issue("recoverable error","non-triangle-primitive","Point/line primitive excluded from triangle rendering");continue;}
      if(triangles.empty())bad("Empty mesh primitive");
      if(!data.contains("NORMAL")){
        Accessor normal;normal.width=3;normal.count=count;normal.component=5126;normal.values.resize(count*3);
        for(std::size_t t=0;t<triangles.size();t+=3){const auto a=triangles[t]*3,b=triangles[t+1]*3,c=triangles[t+2]*3;const auto& p=position.values;const double ux=p[b]-p[a],uy=p[b+1]-p[a+1],uz=p[b+2]-p[a+2],vx=p[c]-p[a],vy=p[c+1]-p[a+1],vz=p[c+2]-p[a+2];const double n[]={uy*vz-uz*vy,uz*vx-ux*vz,ux*vy-uy*vx};for(auto vertex:{a,b,c})for(int axis=0;axis<3;++axis)normal.values[vertex+axis]+=n[axis];}
        data["NORMAL"]=std::move(normal);issue("recoverable error","generated-normals","Missing normals generated from triangle geometry");
      }
      auto& normal=data.at("NORMAL").values;
      for(std::size_t i=0;i<count;++i){const auto n=i*3;const auto length=std::hypot(normal[n],normal[n+1],normal[n+2]);if(length<1e-12)bad("Zero normal or degenerate mesh");for(int axis=0;axis<3;++axis)normal[n+axis]/=length;}
      if(data.contains("TANGENT")){const auto& tangent=data.at("TANGENT").values;for(std::size_t i=0;i<count;++i)if(std::hypot(tangent[i*4],tangent[i*4+1],tangent[i*4+2])<1e-12||std::abs(std::abs(tangent[i*4+3])-1)>1e-4)bad("Invalid tangent vector/handedness");}
      for(const auto& [name,a]:data)if(name.starts_with("JOINTS_")){
        const auto suffix=name.substr(7);if(!data.contains("WEIGHTS_"+suffix))bad("Skin joints have no weights");for(double joint:a.values)if(joint<0||joint!=std::floor(joint))bad("Invalid joint index");
      }
      for(const auto& [name,a]:data)if(name.starts_with("WEIGHTS_")){if(!data.contains("JOINTS_"+name.substr(8)))bad("Skin weights have no joints");for(double weight:a.values)if(weight<0||weight>1.0001)bad("Invalid skin weight");}
      double lo[]={INFINITY,INFINITY,INFINITY},hi[]={-INFINITY,-INFINITY,-INFINITY};for(std::size_t i=0;i<count;++i)for(int axis=0;axis<3;++axis){lo[axis]=std::min(lo[axis],position.values[i*3+axis]);hi[axis]=std::max(hi[axis],position.values[i*3+axis]);}if(std::hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])<1e-12)bad("Zero-sized mesh");
      Json::Object streams;for(const auto& [name,a]:data)streams[name]=floats(a.values,a.width);
      const auto material=primitive.find("material")?index(field(primitive,"material"),materials_.size()-1,"material"):materials_.size()-1;
      for(const auto& key:{"baseColorTexture","normalTexture","metallicRoughnessTexture","occlusionTexture","emissiveTexture"}){const auto& texture=field(materials_[material],key);if(texture.find("texCoord")&&!data.contains("TEXCOORD_"+std::to_string(integer(texture,"texCoord"))))bad("Material references missing UV channel");}
      Json::Array morphs;for(const auto& target:array(primitive,"targets")){Json::Object morph;for(const auto& [name,value]:target.object()){if(name!="POSITION"&&name!="NORMAL"&&name!="TANGENT")bad("Unsupported morph attribute");const auto& a=accessor(index(value,array(g_,"accessors").size(),"morph accessor"));if(a.count!=count||a.width!=3)bad("Invalid morph shape");morph[name]=floats(a.values,3);}morphs.emplace_back(morph);}
      const double center[]={(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2};double radius=0;for(std::size_t i=0;i<count;++i)radius=std::max(radius,std::hypot(position.values[i*3]-center[0],position.values[i*3+1]-center[1],position.values[i*3+2]-center[2]));
      primitives.emplace_back(Json::Object{{"id",id_+"/mesh/"+std::to_string(meshes_.size())+"/primitive/"+std::to_string(primitives.size())},{"attributes",streams},{"indices",indices(triangles)},{"material",field(materials_[material],"id")},{"bounds",Json::Array{values(lo),values(hi)}},{"sphere",Json::Object{{"center",values(center)},{"radius",radius}}},{"morphTargets",morphs}});
    }
    if(primitives.empty())bad("Mesh contains no renderable primitives");
    meshes_.emplace_back(Json::Object{{"id",id_+"/mesh/"+std::to_string(meshes_.size())},{"name",str(mesh,"name")},{"primitives",primitives},{"weights",mesh.find("weights")?field(mesh,"weights"):Json(Json::Array{})}});
  }
}
void Importer::import_nodes(){
  const auto& source=array(g_,"nodes");std::vector<int> parents(source.size(),-1);std::vector<Mat4> locals,worlds(source.size());
  auto vector=[&](const Json& node,const char* key,std::size_t count,std::vector<double> fallback){if(!node.find(key))return fallback;const auto& input=field(node,key).array();if(input.size()!=count)bad(std::string("Invalid node ")+key);std::vector<double> out;for(const auto& value:input){const auto n=value.number_or(NAN);if(!std::isfinite(n))bad("Invalid node transform number");out.push_back(n);}return out;};
  for(std::size_t i=0;i<source.size();++i){const auto& node=source[i];Mat4 local;
    if(node.find("matrix")){if(node.find("translation")||node.find("rotation")||node.find("scale"))bad("Node defines both matrix and TRS");const auto matrix=vector(node,"matrix",16,{});std::copy(matrix.begin(),matrix.end(),local.v.begin());if(std::abs(local.v[3])+std::abs(local.v[7])+std::abs(local.v[11])+std::abs(local.v[15]-1)>1e-6)bad("Non-affine node matrix");}
    else {const auto p=vector(node,"translation",3,{0,0,0}),q=vector(node,"rotation",4,{0,0,0,1}),s=vector(node,"scale",3,{1,1,1});if(std::sqrt(q[0]*q[0]+q[1]*q[1]+q[2]*q[2]+q[3]*q[3])<1e-12)bad("Zero node quaternion");local=compose(Transform{{p[0],p[1],p[2]},{q[0],q[1],q[2],q[3]},{s[0],s[1],s[2]},std::nullopt});}
    locals.push_back(local);Json::Array children;for(const auto& child:array(node,"children")){const auto n=index(child,source.size(),"child node");if(parents[n]!=-1||n==i)bad("Duplicate parent or self-parented node");parents[n]=int(i);children.emplace_back(id_+"/node/"+std::to_string(n));}
    Json::Object out{{"id",id_+"/node/"+std::to_string(i)},{"name",str(node,"name","Node "+std::to_string(i))},{"localMatrix",values(local.v)},{"children",children}};
    if(node.find("mesh"))out["mesh"]=field(meshes_.at(index(field(node,"mesh"),meshes_.size(),"node mesh")),"id");
    if(node.find("skin"))out["skin"]=id_+"/skeleton/"+std::to_string(index(field(node,"skin"),array(g_,"skins").size(),"node skin"));
    if(node.find("weights"))out["weights"]=field(node,"weights");
    nodes_.emplace_back(out);
  }
  // Some real exporters leave an unused helper parent pointing at a declared
  // scene root. Scene roots are authoritative; detach only unreachable helpers.
  std::set<std::size_t> reachable;
  std::function<void(std::size_t)> mark=[&](std::size_t i){if(!reachable.insert(i).second)return;for(const auto& child:array(source[i],"children"))mark(index(child,source.size(),"child node"));};
  for(const auto& scene:array(g_,"scenes"))for(const auto& root:array(scene,"nodes"))mark(index(root,source.size(),"scene root"));
  for(const auto& scene:array(g_,"scenes"))for(const auto& root:array(scene,"nodes")){
    const auto i=index(root,source.size(),"scene root");if(parents[i]<0)continue;
    if(reachable.contains(std::size_t(parents[i])))bad("Scene root has a reachable parent");
    auto& children=std::get<Json::Array>(std::get<Json::Object>(nodes_[std::size_t(parents[i])].value).at("children").value);
    const auto child_id=id_+"/node/"+std::to_string(i);std::erase_if(children,[&](const Json& child){return child.string_or()==child_id;});parents[i]=-1;
    issue("recoverable error","orphan-root-parent","Detached an unreachable exporter helper from a declared scene root");
  }
  std::vector<int> colors(source.size(),0);std::function<void(std::size_t,unsigned)> resolve=[&](std::size_t i,unsigned depth){if(depth>512||colors[i]==1)bad("Cyclic/excessively deep node hierarchy");if(colors[i]==2)return;colors[i]=1;if(parents[i]>=0){resolve(std::size_t(parents[i]),depth+1);worlds[i]=multiply(worlds[std::size_t(parents[i])],locals[i]);}else worlds[i]=locals[i];colors[i]=2;};
  for(std::size_t i=0;i<source.size();++i){resolve(i,0);auto& node=std::get<Json::Object>(nodes_[i].value);node["parent"]=parents[i]<0?Json(nullptr):Json(id_+"/node/"+std::to_string(parents[i]));node["worldMatrix"]=values(worlds[i].v);}
  for(const auto& scene:array(g_,"scenes"))for(const auto& root:array(scene,"nodes"))if(parents[index(root,source.size(),"scene root")]!=-1)bad("Scene root has a parent");
}
void Importer::import_skins(){
  for(const auto& skin:array(g_,"skins")){
    const auto& joints=array(skin,"joints");if(joints.empty())bad("Empty skeleton");std::set<std::size_t> seen;Json::Array ids,names;
    for(const auto& joint:joints){const auto n=index(joint,nodes_.size(),"skin joint");if(!seen.insert(n).second)bad("Duplicate skeleton joint");ids.push_back(field(nodes_[n],"id"));names.push_back(field(nodes_[n],"name"));}
    std::vector<double> binds(joints.size()*16,0);for(std::size_t i=0;i<joints.size();++i)for(int j=0;j<4;++j)binds[i*16+j*5]=1;
    if(skin.find("inverseBindMatrices")){const auto& accessor_data=accessor(index(field(skin,"inverseBindMatrices"),array(g_,"accessors").size(),"inverse bind accessor"));if(accessor_data.width!=16||accessor_data.count<joints.size()||accessor_data.component!=5126)bad("Malformed inverse bind matrices");std::copy_n(accessor_data.values.begin(),binds.size(),binds.begin());}
    Json::Object out{{"id",id_+"/skeleton/"+std::to_string(skins_.size())},{"name",str(skin,"name")},{"joints",ids},{"jointNames",names},{"inverseBindMatrices",floats(binds,16)}};
    if(skin.find("skeleton")){out["root"]=field(nodes_.at(index(field(skin,"skeleton"),nodes_.size(),"skeleton root")),"id");}
    skins_.emplace_back(out);
  }
  for(const auto& node:array(g_,"nodes"))if(node.find("skin")){
    if(!node.find("mesh")){bad("Skinned node has no mesh");}
    const auto skin=index(field(node,"skin"),skins_.size(),"skin"),mesh=index(field(node,"mesh"),array(g_,"meshes").size(),"mesh");const auto count=array(skins_[skin],"joints").size();
    for(const auto& primitive:array(array(g_,"meshes")[mesh],"primitives")){const auto& attributes=field(primitive,"attributes");if(!attributes.find("JOINTS_0")||!attributes.find("WEIGHTS_0"))bad("Skinned mesh missing joint/weight streams");for(const auto& [name,ref]:attributes.object())if(name.starts_with("JOINTS_")){const auto& a=accessor(index(ref,array(g_,"accessors").size(),"joint accessor"));for(auto value:a.values)if(value<0||value>=double(count))bad("Skin joint index exceeds skeleton");}}
  }
}
void Importer::import_animations(){
  for(const auto& animation:array(g_,"animations")){
    Json::Array channels;double start=INFINITY,end=0;std::set<std::pair<std::size_t,std::string>> targets;
    const auto& samplers=array(animation,"samplers");
    for(const auto& channel:array(animation,"channels")){
      const auto& target=field(channel,"target");const auto node=index(field(target,"node"),nodes_.size(),"animation target");const auto path=str(target,"path");if(path!="translation"&&path!="rotation"&&path!="scale"&&path!="weights")bad("Unsupported animation target path");if(!targets.insert({node,path}).second)bad("Duplicate animation channel target");
      if(array(g_,"nodes")[node].find("matrix")&&path!="weights")bad("TRS animation targets a matrix node");
      const auto& sampler=samplers.at(index(field(channel,"sampler"),samplers.size(),"animation sampler"));const auto interpolation=str(sampler,"interpolation","LINEAR");if(interpolation!="LINEAR"&&interpolation!="STEP"&&interpolation!="CUBICSPLINE")bad("Unsupported animation interpolation");
      const auto& input=accessor(index(field(sampler,"input"),array(g_,"accessors").size(),"animation input"));const auto& output=accessor(index(field(sampler,"output"),array(g_,"accessors").size(),"animation output"));
      if(input.width!=1||input.component!=5126||output.component!=5126){bad("Invalid animation accessor format");}
      for(std::size_t i=0;i<input.count;++i)if(input.values[i]<0||(i&&input.values[i]<=input.values[i-1]))bad("Animation times must increase");
      std::size_t width=path=="rotation"?4:3;if(path=="weights"){const auto& n=array(g_,"nodes")[node];const auto& mesh=array(g_,"meshes").at(index(field(n,"mesh"),array(g_,"meshes").size(),"morph mesh"));const auto& primitives=array(mesh,"primitives");if(primitives.empty())bad("Morph animation has no geometry");width=array(primitives[0],"targets").size();if(!width||output.width!=1)bad("Invalid morph animation output");}else if(output.width!=width)bad("Animation output shape mismatch");
      const auto multiplier=interpolation=="CUBICSPLINE"?3:1;if(output.values.size()!=input.count*width*multiplier)bad("Animation output count mismatch");
      if(path=="rotation")for(std::size_t i=0;i<input.count;++i){const auto at=(i*multiplier+(multiplier==3?1:0))*4;const auto& q=output.values;if(std::sqrt(q[at]*q[at]+q[at+1]*q[at+1]+q[at+2]*q[at+2]+q[at+3]*q[at+3])<1e-12)bad("Zero animation quaternion");}
      start=std::min(start,input.values.front());end=std::max(end,input.values.back());
      channels.emplace_back(Json::Object{{"node",field(nodes_[node],"id")},{"path",path},{"interpolation",interpolation},{"times",floats(input.values,1)},{"values",floats(output.values,unsigned(width))}});
    }
    if(channels.empty())bad("Animation has no channels");
    animations_.emplace_back(Json::Object{{"id",id_+"/animation/"+std::to_string(animations_.size())},{"name",str(animation,"name","Clip "+std::to_string(animations_.size()))},{"start",start},{"duration",end-start},{"channels",channels}});
  }
}
Json Importer::run(){
  import_images();import_materials();import_meshes();import_nodes();import_skins();import_animations();
  Json::Array scenes;for(const auto& scene:array(g_,"scenes")){Json::Array roots;for(const auto& node:array(scene,"nodes"))roots.push_back(field(nodes_.at(index(node,nodes_.size(),"scene node")),"id"));scenes.emplace_back(Json::Object{{"name",str(scene,"name")},{"roots",roots}});}
  if(scenes.empty()){Json::Array roots;for(const auto& node:nodes_)if(std::holds_alternative<std::nullptr_t>(field(node,"parent").value))roots.push_back(field(node,"id"));scenes.emplace_back(Json::Object{{"name","Default"},{"roots",roots}});}
  const auto default_scene=integer(g_,"scene");if(default_scene>=scenes.size())bad("Invalid default scene");
  // Cache default-scene bounds in model space, retaining node hierarchy.
  double lo[]={INFINITY,INFINITY,INFINITY},hi[]={-INFINITY,-INFINITY,-INFINITY};
  std::map<std::string,const Json*> node_map,mesh_map;
  for(const auto& node:nodes_)node_map[str(node,"id")]=&node;
  for(const auto& mesh:meshes_)mesh_map[str(mesh,"id")]=&mesh;
  std::function<void(const std::string&)> include=[&](const std::string& id){
    const auto& node=*node_map.at(id);
    if(node.find("mesh"))for(const auto& primitive:array(*mesh_map.at(str(node,"mesh")),"primitives")){
      const auto& bounds=field(primitive,"bounds").array();const auto& m=field(node,"worldMatrix").array();
      for(unsigned corner=0;corner<8;++corner)for(unsigned axis=0;axis<3;++axis){double v=m[12+axis].number_or();for(unsigned k=0;k<3;++k)v+=m[k*4+axis].number_or()*bounds[(corner>>k)&1].array()[k].number_or();lo[axis]=std::min(lo[axis],v);hi[axis]=std::max(hi[axis],v);}
    }
    for(const auto& child:array(node,"children"))include(child.string_or());
  };
  for(const auto& root:array(scenes[default_scene],"roots"))include(root.string_or());
  Json bounds=nullptr,sphere=nullptr;
  if(std::isfinite(lo[0])){const double center[]={(lo[0]+hi[0])/2,(lo[1]+hi[1])/2,(lo[2]+hi[2])/2};bounds=Json::Array{values(lo),values(hi)};sphere=Json::Object{{"center",values(center)},{"radius",std::hypot(hi[0]-lo[0],hi[1]-lo[1],hi[2]-lo[2])/2}};}
  Json::Object dependencies;for(const auto& [name,hash]:source_dependencies_)dependencies[name]=hash;
  Json::Object result{{"format","veldren.model"},{"version",1},{"importerVersion","veldren-gltf-1"},{"id",id_},{"sourceHash",hash_},{"sourceDependencies",dependencies},{"bounds",bounds},{"sphere",sphere},{"scenes",scenes},{"defaultScene",double(default_scene)},{"nodes",nodes_},{"meshes",meshes_},{"materials",materials_},{"images",images_},{"skeletons",skins_},{"animations",animations_},{"validation",Json::Object{{"state",issues_.empty()?"valid":"warnings"},{"issues",issues_}}}};
  return result;
}
}
Json import_gltf(std::span<const std::uint8_t> source,const std::string& stable_id,const AssetResolver& resolve){return Importer(source,stable_id,resolve).run();}
}

namespace veldren {
Json imported_asset_records(const Json& model,const std::string& source_path){
  const auto id=field(model,"id").string_or();
  const auto id_hash=asset_sha256(std::span(reinterpret_cast<const std::uint8_t*>(id.data()),id.size()));
  const auto derived="assets/canonical/models/"+id_hash+".json";
  Json::Array records,model_dependencies;
  const auto hash=field(model,"sourceHash");
  auto add=[&](const std::string& key,const std::string& type,const std::string& name,Json::Array deps,Json::Object extra=Json::Object{}){
    Json::Object record{{"id",key},{"type",type},{"name",name},{"sourcePath",source_path},{"derivedPath",derived},{"sourceHash",hash},{"importSettings",Json::Object{{"importer",field(model,"importerVersion")}}},{"dependencies",std::move(deps)},{"validation",field(model,"validation")},{"variants",Json::Object{}}};
    for(auto& [k,v]:extra)record[k]=std::move(v);
    records.emplace_back(std::move(record));
  };
  for(const auto& image:array(model,"images")){
    const auto image_hash=str(image,"sourceHash");
    add(str(image,"id"),"texture",str(image,"name"),{},{{"sourceHash",image_hash},{"derivedPath","assets/canonical/images/"+image_hash+(str(image,"mimeType")=="image/png"?".png":".jpg")},{"width",field(image,"width")},{"height",field(image,"height")},{"mimeType",field(image,"mimeType")}});
  }
  for(const auto& material:array(model,"materials")){
    Json::Array deps;std::set<std::string> seen;
    for(const auto& key:{"baseColorTexture","normalTexture","metallicRoughnessTexture","occlusionTexture","emissiveTexture"}){const auto& texture=field(material,key);const auto ref=str(texture,"image");if(!ref.empty()&&seen.insert(ref).second)deps.emplace_back(ref);}
    add(str(material,"id"),"material",str(material,"name"),deps,{{"material",material}});
  }
  for(const auto& mesh:array(model,"meshes")){
    Json::Array deps;
    for(const auto& primitive:array(mesh,"primitives")){
      const auto key=str(primitive,"id");
      add(key,"mesh",str(mesh,"name"),{field(primitive,"material")},{{"bounds",field(primitive,"bounds")},{"sphere",field(primitive,"sphere")},{"primitive",key},{"instancingEligible",array(primitive,"morphTargets").empty()}});deps.emplace_back(key);
    }
    add(str(mesh,"id"),"mesh",str(mesh,"name"),deps);model_dependencies.push_back(field(mesh,"id"));
  }
  for(const auto& skin:array(model,"skeletons")){add(str(skin,"id"),"skeleton",str(skin,"name"),{});model_dependencies.push_back(field(skin,"id"));}
  for(const auto& clip:array(model,"animations")){Json::Array deps;for(const auto& skin:array(model,"skeletons"))deps.push_back(field(skin,"id"));add(str(clip,"id"),"animation",str(clip,"name"),deps,{{"duration",field(clip,"duration")}});model_dependencies.push_back(field(clip,"id"));}
  if(!std::holds_alternative<std::nullptr_t>(field(model,"bounds").value)){
    add(id+"/collision","collision",id+" bounds",{},{{"bounds",field(model,"bounds")},{"shape","aabb"}});model_dependencies.emplace_back(id+"/collision");
  }
  add(id,"model",id.substr(id.find(':')+1),model_dependencies,{{"bounds",field(model,"bounds")},{"sphere",field(model,"sphere")},{"lods",Json::Array{Json::Object{{"level",0},{"asset",id},{"threshold",0},{"bounds",field(model,"bounds")}}}}});
  return records;
}
}
