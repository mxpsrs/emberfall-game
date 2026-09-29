#include "veldren/asset_import.h"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <iterator>
namespace fs=std::filesystem;
veldren::AssetBytes read(const fs::path& path){std::ifstream file(path,std::ios::binary);if(!file)throw std::runtime_error("Missing source file: "+path.string());return {std::istreambuf_iterator<char>(file),{}};}
int main(int argc,char** argv){
  if(argc!=5&&argc!=6){std::cerr<<"Usage: asset-import INPUT OUTPUT STABLE_ID SOURCE_ROOT [URI_ALIASES_JSON]\n";return 2;}
  try{
    const auto input=fs::weakly_canonical(argv[1]),root=fs::weakly_canonical(argv[4]);const auto bytes=read(input);
    veldren::Json aliases{veldren::Json::Object{}};if(argc==6){const auto data=read(argv[5]);aliases=veldren::parse_json(std::string_view(reinterpret_cast<const char*>(data.data()),data.size()));}
    auto resolve=[&](const std::string& requested){const auto* alias=aliases.find(requested);const auto uri=alias?alias->string_or():requested;std::string decoded;for(std::size_t i=0;i<uri.size();++i){if(uri[i]=='%'){if(i+2>=uri.size())throw std::runtime_error("Malformed URI escape");auto hex=[](char c)->int{if(c>='0'&&c<='9')return c-'0';if(c>='A'&&c<='F')return c-'A'+10;if(c>='a'&&c<='f')return c-'a'+10;throw std::runtime_error("Malformed URI escape");};decoded.push_back(char(hex(uri[i+1])*16+hex(uri[i+2])));i+=2;}else decoded+=uri[i];}if(decoded.find('\0')!=std::string::npos||decoded.find('\\')!=std::string::npos)throw std::runtime_error("Invalid asset URI");const auto path=fs::weakly_canonical(input.parent_path()/decoded),relative=path.lexically_relative(root);if(relative.empty()||*relative.begin()==".."||path.is_absolute()!=root.is_absolute())throw std::runtime_error("Asset dependency escapes source root");return read(path);};
    auto result=veldren::import_gltf(bytes,argv[3],resolve);std::get<veldren::Json::Object>(result.value)["records"]=veldren::imported_asset_records(result,fs::path(argv[1]).generic_string());fs::create_directories(fs::path(argv[2]).parent_path());std::ofstream output(argv[2],std::ios::binary);output<<veldren::write_json(result)<<'\n';if(!output)throw std::runtime_error("Could not write derived asset");
    std::cout<<"Imported "<<argv[3]<<": "<<result.find("meshes")->array().size()<<" meshes, "<<result.find("nodes")->array().size()<<" nodes, "<<result.find("animations")->array().size()<<" clips\n";
  }catch(const std::exception& error){std::cerr<<veldren::write_json(veldren::Json::Object{{"severity","fatal error"},{"message",error.what()}})<<'\n';return 1;}
}
