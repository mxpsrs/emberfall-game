#include "veldren/asset_texture.h"
#include "veldren/asset_profile.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <zlib.h>

namespace fs=std::filesystem;
using namespace veldren;
AssetBytes read(const fs::path& path) {
  std::ifstream file(path,std::ios::binary);
  if(!file)throw std::runtime_error("Missing texture input: "+path.string());
  return {std::istreambuf_iterator<char>(file),{}};
}
void append32(AssetBytes& bytes,std::uint32_t n){for(int shift=24;shift>=0;shift-=8)bytes.push_back(std::uint8_t(n>>shift));}
void chunk(AssetBytes& png,const char* type,const AssetBytes& data){
  append32(png,std::uint32_t(data.size()));const auto start=png.size();
  png.insert(png.end(),type,type+4);png.insert(png.end(),data.begin(),data.end());
  append32(png,std::uint32_t(crc32(0,png.data()+start,uInt(data.size()+4))));
}
// Original, deterministic RGBA PNG packaging. Filtering and DEFLATE only encode
// pixels already produced by the canonical native texture processor.
AssetBytes png(const AssetImage& image){
  AssetBytes scanlines;scanlines.reserve(image.pixels.size()+image.height);
  const auto stride=std::size_t(image.width)*4;
  for(unsigned y=0;y<image.height;++y){
    scanlines.push_back(1); // PNG Sub filter, four-byte RGBA pixel stride.
    const auto offset=std::size_t(y)*stride;
    for(std::size_t x=0;x<stride;++x)scanlines.push_back(std::uint8_t(image.pixels[offset+x]-(x>=4?image.pixels[offset+x-4]:0)));
  }
  uLongf size=compressBound(uLong(scanlines.size()));AssetBytes compressed(size);
  if(compress2(compressed.data(),&size,scanlines.data(),uLong(scanlines.size()),Z_BEST_COMPRESSION)!=Z_OK)throw std::runtime_error("PNG compression failed");
  compressed.resize(size);AssetBytes bytes{137,80,78,71,13,10,26,10},header;
  append32(header,image.width);append32(header,image.height);header.insert(header.end(),{8,6,0,0,0});
  chunk(bytes,"IHDR",header);chunk(bytes,"IDAT",compressed);chunk(bytes,"IEND",{});return bytes;
}
void write(const fs::path& path,const AssetBytes& bytes){
  fs::create_directories(path.parent_path());const auto temporary=path.string()+".tmp";
  std::ofstream file(temporary,std::ios::binary);file.write(reinterpret_cast<const char*>(bytes.data()),std::streamsize(bytes.size()));file.close();
  if(!file)throw std::runtime_error("Texture output write failed");
  fs::rename(temporary,path);
}
int main(int argc,char** argv){
  if(argc!=4){std::cerr<<"Usage: texture-variants REQUEST_JSON OUTPUT_JSON DIST_ROOT\n";return 2;}
  try{
    const auto request=read(argv[1]);const auto jobs=parse_json(std::string_view(reinterpret_cast<const char*>(request.data()),request.size()));
    const auto root=fs::weakly_canonical(argv[3]);Json::Array results;
    for(const auto& job:jobs.array()){
      const auto source=job.find("sourcePath")->string_or(),profile=job.find("profile")->string_or();
      const auto path=fs::weakly_canonical(root/source),relative=path.lexically_relative(root);
      if(relative.empty()||*relative.begin()=="..")throw std::invalid_argument("Texture source escapes asset root");
      auto settings=job.find("settings")->object();settings["maxDimension"]=double(asset_profile(profile).max_texture_dimension);
      const auto bytes=read(path);auto texture=import_texture(bytes,settings);const auto& first=texture.levels.front();
      // Desktop retains the original full-resolution encoded source. Smaller
      // images also keep their exact original bytes instead of being reencoded.
      const auto original=decode_asset_image(bytes);
      const auto derived=first.width==original.width&&first.height==original.height?bytes:png(first);
      const auto hash=asset_sha256(derived);
      const auto derived_path=derived==bytes?source:"assets/canonical/variants/"+hash+".png";
      if(derived_path!=source)write(root/derived_path,derived);
      const auto decoded=decode_asset_image(derived);
      if(decoded.width!=first.width||decoded.height!=first.height||decoded.pixels!=first.pixels)throw std::runtime_error("Texture variant roundtrip mismatch");
      auto result=job.object();result["derivedPath"]=derived_path;result["derivedHash"]=hash;result["sourceHash"]=texture.source_hash;
      result["width"]=double(first.width);result["height"]=double(first.height);result["bytes"]=double(derived.size());result["gpuBytes"]=texture.metadata().find("gpuBytes")->number_or();result["settings"]=settings;
      results.emplace_back(result);
    }
    const auto output=write_json(results)+"\n";write(argv[2],AssetBytes(output.begin(),output.end()));
    std::cout<<"Derived and pixel-verified "<<results.size()<<" native texture variants\n";
  }catch(const std::exception& error){std::cerr<<error.what()<<'\n';return 1;}
}
