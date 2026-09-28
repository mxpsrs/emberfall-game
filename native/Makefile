CXX ?= g++
EMXX ?= em++
CXXFLAGS := -O3 -std=c++20 -Wall -Wextra -Werror -Iinclude -isystem third_party
EXPORTS := ["_veldren_performance_create","_veldren_performance_destroy","_veldren_performance_command","_veldren_performance_response","_veldren_editor_command","_veldren_editor_response","_veldren_world_create","_veldren_world_destroy","_veldren_world_reset","_veldren_world_seed","_veldren_actor_upsert","_veldren_actors_upsert","_veldren_actor_set_heading","_veldren_actor_remove","_veldren_actor_read","_veldren_actors_read","_veldren_render_states_read","_veldren_animation_states_resolve","_veldren_world_step","_veldren_world_step_budgeted","_veldren_world_step_live","_veldren_query_visible","_veldren_pathfind","_veldren_world_count","_veldren_world_scene_serialize","_veldren_random_bounded","_veldren_random_chance","_veldren_roll_attack","_veldren_skill_level","_veldren_skill_threshold","_veldren_combat_level","_veldren_attack_roll_chance","_veldren_player_accuracy","_veldren_enemy_accuracy","_veldren_player_max_hit","_veldren_physical_max_hit","_veldren_magic_max_hit","_veldren_combat_rewards","_veldren_gathering_chance","_veldren_firemaking_chance","_veldren_cooking_burn_chance","_veldren_iron_smelt_chance","_veldren_inventory_entry_slots","_veldren_transfer_count","_veldren_spend_coins","_veldren_craft_fits","_veldren_action_events","_veldren_enemy_combat_tick","_veldren_requirements_met","_veldren_world_timer_events","_veldren_core_abi_version","_malloc","_free","_veldren_world_scene_entity_upsert","_veldren_world_scene_entity_remove","_veldren_world_scene_entity_set_transform","_veldren_world_scene_read","_veldren_world_scene_entity_read","_veldren_world_scene_entity_set_world_transform","_veldren_world_scene_component_ids","_veldren_world_document_serialize","_veldren_world_document_load","_veldren_world_scene_revision","_veldren_world_scene_quarry_sample","_veldren_world_scene_quarry_ramp_at","_veldren_world_scene_terrain_pad_height","_veldren_world_scene_lights_read","_veldren_world_scene_footprints_at","_veldren_resource_state_read","_veldren_resource_state_patch","_veldren_resources_tick","_veldren_resource_phase","_veldren_assets_create","_veldren_assets_destroy","_veldren_assets_command","_veldren_assets_response","_veldren_texture_create","_veldren_texture_destroy","_veldren_texture_info","_veldren_texture_data","_veldren_texture_size","_veldren_texture_error"]

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

build/core-test: src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp tests/core_test.cpp include/veldren/core.h include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp tests/core_test.cpp -o $@

build/scene-test: src/scene.cpp tests/scene_test.cpp include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/scene.cpp tests/scene_test.cpp -o $@

build/scene-migrate: src/scene.cpp tools/migrate_scene.cpp include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/scene.cpp tools/migrate_scene.cpp -o $@

build/desktop-test: src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp src/desktop.cpp tests/desktop_test.cpp include/veldren/core.h include/veldren/scene.h include/veldren/desktop.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp src/desktop.cpp tests/desktop_test.cpp -o $@

build/desktop-scene-test: src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp src/desktop.cpp tests/desktop_scene_test.cpp include/veldren/core.h include/veldren/scene.h include/veldren/desktop.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp src/desktop.cpp tests/desktop_scene_test.cpp -o $@

build/veldren-desktop: src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp src/desktop.cpp src/desktop_renderer.cpp src/desktop_main.cpp include/veldren/core.h include/veldren/scene.h include/veldren/desktop.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp src/desktop.cpp src/desktop_renderer.cpp src/desktop_main.cpp -ldl -lz -o $@

asset-test: build/asset-test
	./build/asset-test ../dist/assets/asset-registry.json

build/asset-test: src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/assets.cpp src/scene.cpp tests/assets_test.cpp include/veldren/assets.h include/veldren/asset_profile.h include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/assets.cpp src/scene.cpp tests/assets_test.cpp -o $@

wasm: ../dist/native/veldren-core.wasm

wasm-test: wasm
	node tests/core_wasm_test.mjs ../dist/native/veldren-core.wasm

../dist/native/veldren-core.wasm: src/world_lod.cpp src/world_visibility.cpp src/world_performance.cpp src/world_performance_bridge.cpp include/veldren/world_lod.h include/veldren/world_visibility.h include/veldren/world_performance.h src/asset_import.cpp src/asset_texture.cpp include/veldren/asset_texture.h third_party/stb_image.h Makefile src/asset_render.cpp src/asset_material.cpp src/assets.cpp include/veldren/asset_profile.h include/veldren/assets.h src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp include/veldren/core.h include/veldren/scene.h
	mkdir -p ../dist/native
	$(EMXX) $(CXXFLAGS) -fwasm-exceptions src/world_lod.cpp src/world_visibility.cpp src/world_performance.cpp src/world_performance_bridge.cpp src/asset_texture.cpp src/asset_import.cpp src/asset_render.cpp src/asset_material.cpp src/assets.cpp src/core.cpp src/editor.cpp src/editor_prefabs.cpp src/scene.cpp --no-entry -sSTANDALONE_WASM=1 -sALLOW_MEMORY_GROWTH=1 -sEXPORTED_FUNCTIONS='$(EXPORTS)' -o $@

clean:
	rm -rf build ../dist/native/veldren-core.wasm

build/asset-import: src/asset_import.cpp src/scene.cpp tools/import_asset.cpp include/veldren/asset_import.h include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/asset_import.cpp src/scene.cpp tools/import_asset.cpp -o $@

.PHONY: asset-import-test
asset-import-test: build/asset-import
	python3 ../tests/asset-import.py

.PHONY: texture-test
texture-test: build/texture-test
	./build/texture-test ../dist/assets/canonical/images

build/texture-test: src/asset_texture.cpp src/asset_import.cpp src/scene.cpp tests/texture_test.cpp include/veldren/asset_texture.h third_party/stb_image.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/asset_texture.cpp src/asset_import.cpp src/scene.cpp tests/texture_test.cpp -o $@

build/texture-variants: src/asset_texture.cpp src/asset_import.cpp src/scene.cpp tools/texture_variants.cpp include/veldren/asset_texture.h include/veldren/asset_profile.h third_party/stb_image.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/asset_texture.cpp src/asset_import.cpp src/scene.cpp tools/texture_variants.cpp -lz -o $@

.PHONY: material-test
material-test: build/material-test
	./build/material-test ../dist/assets/asset-registry.json

.PHONY: render-asset-test
render-asset-test: build/render-asset-test
	./build/render-asset-test ../dist/assets

build/render-asset-test: src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/assets.cpp src/scene.cpp tests/render_asset_test.cpp include/veldren/asset_render.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/assets.cpp src/scene.cpp tests/render_asset_test.cpp -o $@

build/asset-validate: src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/assets.cpp src/scene.cpp tools/validate_assets.cpp
	mkdir -p build
	$(CXX) $(CXXFLAGS) $^ -o $@

build/material-test: src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/assets.cpp src/scene.cpp tests/material_test.cpp include/veldren/assets.h include/veldren/asset_profile.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/assets.cpp src/scene.cpp tests/material_test.cpp -o $@

.PHONY: editor-test
editor-test: build/editor-test
	./build/editor-test
build/editor-test: src/scene.cpp src/editor.cpp src/editor_prefabs.cpp tests/editor_test.cpp include/veldren/editor.h include/veldren/scene.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) src/scene.cpp src/editor.cpp src/editor_prefabs.cpp tests/editor_test.cpp -o $@

.PHONY: world-performance-test
world-performance-test: build/world-performance-test
	./build/world-performance-test ../dist/assets/asset-registry.json

build/world-performance-test: src/world_lod.cpp src/world_visibility.cpp src/world_performance.cpp src/scene.cpp src/assets.cpp src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp src/editor.cpp src/editor_prefabs.cpp tests/world_performance_test.cpp include/veldren/world_lod.h include/veldren/world_visibility.h include/veldren/world_performance.h include/veldren/scene.h include/veldren/assets.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) $(filter %.cpp,$^) -o $@

.PHONY: world-visibility-test
world-visibility-test: build/world-visibility-test
	./build/world-visibility-test
build/world-visibility-test: src/world_lod.cpp src/world_visibility.cpp src/world_performance.cpp src/scene.cpp src/assets.cpp src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp tests/world_visibility_test.cpp include/veldren/world_lod.h include/veldren/world_visibility.h include/veldren/world_performance.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) $(filter %.cpp,$^) -o $@

.PHONY: world-lod-test
world-lod-test: build/world-lod-test
	./build/world-lod-test
build/world-lod-test: src/world_lod.cpp src/scene.cpp src/assets.cpp src/asset_render.cpp src/asset_material.cpp src/asset_import.cpp tests/world_lod_test.cpp include/veldren/world_lod.h include/veldren/assets.h
	mkdir -p build
	$(CXX) $(CXXFLAGS) $(filter %.cpp,$^) -o $@
