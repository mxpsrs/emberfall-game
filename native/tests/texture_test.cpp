#include "veldren/asset_texture.h"
#include <cassert>
#include <cmath>
#include <filesystem>
#include <fstream>
#include <iostream>
using namespace veldren;
template<class F> void reject(F f){bool failed=false;try{f();}catch(const std::exception&){failed=true;}assert(failed);}
int main(int argc,char** argv){
  const AssetImage contrast{2,1,{0,0,0,255,255,255,255,255}};
  auto color=build_texture(contrast,{true,false,4096,0}),data=build_texture(contrast,{false,false,4096,0});
  assert(color.levels.size()==2&&color.levels[1].pixels[0]==188);
  assert(data.levels[1].pixels[0]==128);
  auto normal=build_texture({2,1,{255,128,128,255,128,128,255,255}},{false,true,4096,0});
  const auto& n=normal.levels[1].pixels;const double length=std::hypot(n[0]/127.5-1,n[1]/127.5-1,n[2]/127.5-1);assert(std::abs(length-1)<.01);
  auto odd=build_texture({3,1,{0,0,0,255,0,0,0,255,255,255,255,255}},{false,false,4096,0});assert(odd.levels[1].pixels[0]==85);
  auto edge=build_texture({2,1,{255,0,0,0,0,0,255,255}},{true,false,4096,0});assert(edge.levels[1].pixels[0]==0&&edge.levels[1].pixels[2]==255);
  auto reduced=build_texture({8,4,AssetBytes(8*4*4,255)},{true,false,2,0});assert(reduced.levels[0].width==2&&reduced.levels[0].height==1);
  reject([&]{build_texture(contrast,{true,true,4096,0});});reject([&]{decode_asset_image({});});
  assert(argc==2);unsigned count=0;
  for(const auto& file:std::filesystem::directory_iterator(argv[1])){
    std::ifstream input(file.path(),std::ios::binary);AssetBytes bytes{std::istreambuf_iterator<char>(input),{}};
    auto texture=import_texture(bytes,Json::Object{{"colorSpace","linear"},{"maxDimension",128},{"sourceHash",file.path().stem().string()}});
    assert(texture.levels.back().width==1&&texture.levels.back().height==1);
    assert(texture.metadata().find("gpuBytes")->number_or()>0);
    const auto settings=write_json(Json::Object{{"colorSpace","srgb"},{"maxDimension",64}});
    const auto handle=veldren_texture_create(bytes.data(),std::uint32_t(bytes.size()),settings.c_str());assert(handle);
    assert(veldren_texture_info(handle,nullptr,0)>0&&veldren_texture_data(handle,0)&&veldren_texture_size(handle,0));
    // Content plus normalized processing settings shares storage across asset IDs.
    const auto equivalent=write_json(Json::Object{{"colorSpace","srgb"},{"maxDimension",64},{"role","baseColor"},{"alphaCutoff",0},{"sourceHash",file.path().stem().string()}});
    for(unsigned user=0;user<100;++user)assert(veldren_texture_create(bytes.data(),std::uint32_t(bytes.size()),equivalent.c_str())==handle);
    for(unsigned user=0;user<100;++user)veldren_texture_destroy(handle);
    assert(veldren_texture_data(handle,0));
    const auto linear=veldren_texture_create(bytes.data(),std::uint32_t(bytes.size()),"{\"colorSpace\":\"linear\",\"maxDimension\":64}");assert(linear&&linear!=handle);
    const auto small=veldren_texture_create(bytes.data(),std::uint32_t(bytes.size()),"{\"colorSpace\":\"srgb\",\"maxDimension\":32}");assert(small&&small!=handle);
    assert(!veldren_texture_create(bytes.data(),std::uint32_t(bytes.size()),"{\"sourceHash\":\"bad\"}"));
    veldren_texture_destroy(linear);veldren_texture_destroy(small);
    veldren_texture_destroy(handle);assert(!veldren_texture_data(handle,0));
    const auto reloaded=veldren_texture_create(bytes.data(),std::uint32_t(bytes.size()),settings.c_str());assert(reloaded&&reloaded!=handle);veldren_texture_destroy(reloaded);
    reject([&]{import_texture(bytes,Json::Object{{"sourceHash","bad"}});});
    bytes.resize(40);reject([&]{decode_asset_image(bytes);});++count;
  }
  assert(count>=30);
  std::cout<<"PASS: "<<count<<" real PNG textures decoded, corrupt images/hash mismatches rejected, linear-light mips, data maps, normalized normal mips, transparent edges, NPOT coverage, dimension limits and C ABI teardown.\n";
}
