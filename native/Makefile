CXX ?= g++
EMXX ?= em++
CXXFLAGS := -O3 -std=c++20 -Wall -Wextra -Werror -Iinclude
EXPORTS := ["_veldren_world_create","_veldren_world_destroy","_veldren_world_reset","_veldren_world_seed","_veldren_actor_upsert","_veldren_actors_upsert","_veldren_actor_set_heading","_veldren_actor_remove","_veldren_actor_read","_veldren_actors_read","_veldren_render_states_read","_veldren_animation_states_resolve","_veldren_world_step","_veldren_world_step_budgeted","_veldren_world_step_live","_veldren_query_visible","_veldren_pathfind","_veldren_world_count","_veldren_world_scene_serialize","_veldren_random_bounded","_veldren_random_chance","_veldren_roll_attack","_veldren_skill_level","_veldren_skill_threshold","_veldren_combat_level","_veldren_attack_roll_chance","_veldren_player_accuracy","_veldren_enemy_accuracy","_veldren_player_max_hit","_veldren_physical_max_hit","_veldren_magic_max_hit","_veldren_combat_rewards","_veldren_gathering_chance","_veldren_firemaking_chance","_veldren_cooking_burn_chance","_veldren_iron_smelt_chance","_veldren_inventory_entry_slots","_veldren_transfer_count","_veldren_spend_coins","_veldren_craft_fits","_veldren_action_events","_veldren_enemy_combat_tick","_veldren_requirements_met","_veldren_world_timer_events","_veldren_core_abi_version","_malloc","_free","_veldren_world_scene_entity_upsert","_veldren_world_scene_entity_remove","_veldren_world_scene_entity_set_transform","_veldren_world_scene_read","_veldren_world_scene_entity_read","_veldren_world_scene_entity_set_world_transform","_veldren_world_scene_component_ids","_veldren_world_document_serialize","_veldren_world_document_load","_veldren_world_scene_revision","_veldren_world_scene_quarry_sample","_veldren_world_scene_quarry_ramp_at","_veldren_world_scene_terrain_pad_height","_veldren_world_scene_lights_read","_veldren_world_scene_footprints_at","_veldren_resource_state_read","_veldren_resource_state_patch","_veldren_resources_tick","_veldren_resource_phase","_veldren_assets_create","_veldren_assets_destroy","_veldren_assets_command","_veldren_assets_response"]

.PHONY: asset-test test desktop desktop-test desktop-smoke scene-test wasm wasm-test clean

test: build/core-test build/scene-test build/desktop-scene-test
	./build/core-test
	./build/scene-test
	./build/desktop-scene-test

scene-test: build/scene-test
	./build/scene-test

desktop: build/veldren-desktop

desktop-test: build/desktop-test
	./build/desktop-test

desktop-smoke: build/veldren-desktop
	./build/veldren-desktop --headless --frames=240 --assets=..

build/core-test: src/core.cpp src/scene.cpp tests/core_test.cpp include/veldren/core.h include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/scene.cpp tests/core_test.cpp -o $@

build/scene-test: src/scene.cpp tests/scene_test.cpp include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/scene.cpp tests/scene_test.cpp -o $@

build/scene-migrate: src/scene.cpp tools/migrate_scene.cpp include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/scene.cpp tools/migrate_scene.cpp -o $@

build/desktop-test: src/core.cpp src/scene.cpp src/desktop.cpp tests/desktop_test.cpp include/veldren/core.h include/veldren/scene.h include/veldren/desktop.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/scene.cpp src/desktop.cpp tests/desktop_test.cpp -o $@

build/desktop-scene-test: src/core.cpp src/scene.cpp src/desktop.cpp tests/desktop_scene_test.cpp include/veldren/core.h include/veldren/scene.h include/veldren/desktop.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/scene.cpp src/desktop.cpp tests/desktop_scene_test.cpp -o $@

build/veldren-desktop: src/core.cpp src/scene.cpp src/desktop.cpp src/desktop_renderer.cpp src/desktop_main.cpp include/veldren/core.h include/veldren/scene.h include/veldren/desktop.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/scene.cpp src/desktop.cpp src/desktop_renderer.cpp src/desktop_main.cpp -ldl -lz -o $@

asset-test: build/asset-test
	./build/asset-test ../dist/assets/asset-registry.json

build/asset-test: src/assets.cpp src/scene.cpp tests/assets_test.cpp include/veldren/assets.h include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/assets.cpp src/scene.cpp tests/assets_test.cpp -o $@

wasm: ../dist/native/veldren-core.wasm

wasm-test: wasm
	node tests/core_wasm_test.mjs ../dist/native/veldren-core.wasm

../dist/native/veldren-core.wasm: Makefile src/assets.cpp include/veldren/assets.h src/core.cpp src/scene.cpp include/veldren/core.h include/veldren/scene.h
	mkdir -p ../dist/native
	$(EMXX) $(CXXFLAGS) -fwasm-exceptions src/assets.cpp src/core.cpp src/scene.cpp --no-entry -sSTANDALONE_WASM=1 -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS='$(EXPORTS)' -o $@

clean:
	rm -rf build ../dist/native/veldren-core.wasm
