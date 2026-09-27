#include "veldren/assets.h"
#include <fstream>
#include <iostream>
#include <iterator>
int main(int argc,char** argv){
 if(argc!=2)return 2;
 try{std::ifstream file(argv[1]);if(!file)throw std::runtime_error("Manifest unavailable");const std::string bytes(std::istreambuf_iterator<char>(file),{});veldren::AssetRegistry registry;registry.load(veldren::parse_json(bytes));std::cout<<veldren::write_json(registry.diagnostics())<<'\n';}
 catch(const std::exception& e){std::cerr<<e.what()<<'\n';return 1;}
}
