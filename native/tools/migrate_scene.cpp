#include "veldren/scene.h"

#include <fstream>
#include <iostream>
#include <iterator>
#include <stdexcept>

int main(int argc, char** argv) {
  if (argc != 3 && argc != 4) {
    std::cerr << "Usage: veldren-scene-migrate LEGACY_WORLD_EDITS OUTPUT\n"
                 "   or: veldren-scene-migrate LEGACY_WORLD_EDITS SCENE OUTPUT\n";
    return 2;
  }
  try {
    const char* destination=argv[argc-1];
    if(std::string(argv[1])==destination)throw std::invalid_argument("Migration output must differ from legacy input");
    std::ifstream input(argv[1], std::ios::binary);
    if (!input) throw std::runtime_error("Could not read legacy world edits");
    const std::string source{std::istreambuf_iterator<char>{input}, {}};
    std::string serialized;std::size_t count=0;
    if(argc==3){
      auto world=veldren::WorldDocument::migrate_legacy_edits(source);
      for(const auto& scene:world.scenes)count+=scene.size();
      serialized=world.serialize();
      if(veldren::WorldDocument::deserialize(serialized).serialize()!=serialized)
        throw std::runtime_error("World migration failed round-trip verification");
    }else{
      auto scene=veldren::Scene::migrate_legacy_edits(source,argv[2]);
      count=scene.size();serialized=scene.serialize();
      if(veldren::Scene::deserialize(serialized).serialize()!=serialized)
        throw std::runtime_error("Scene migration failed round-trip verification");
    }
    std::ofstream output(destination, std::ios::binary | std::ios::trunc);
    if (!output) throw std::runtime_error("Could not open scene output");
    output << serialized;output.close();
    if (!output) throw std::runtime_error("Could not write scene output");
    std::cout << "Migrated " << count << " entities to " << destination << '\n';
    return 0;
  } catch (const std::exception& error) {
    std::cerr << "Scene migration failed: " << error.what() << '\n';
    return 1;
  }
}
