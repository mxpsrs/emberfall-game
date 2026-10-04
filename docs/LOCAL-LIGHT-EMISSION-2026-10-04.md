# Local light emission, 2026-10-04

Lanterns, torches, fires, and crystals already supplied real point lights to
Filament, but the renderer converted their relative strengths into too few
lumens for the game's camera exposure. A street lantern supplied only 1,615
lumens, leaving its illumination insignificant beside the accepted night fill.

The renderer now converts relative strength using the current camera aperture
and shutter speed. The light's exposure-adjusted strength stays constant during
day/night adaptation. Authored position, color, and radius remain in use;
zero-strength and invalid lights are removed from the active scene.

The accepted sun, sky, ambient light, exposure profiles, and materials are
unchanged. Point lights retain the existing eight-light mobile and twelve-light
desktop caps, reuse their native entities, and do not add shadow maps. This is
a compatible client update: no server protocol, database, account, character,
or saved-world edits, and publication keeps the game open.

## Verification

- `node tests/filament-runtime.cjs`: actual Filament 1.77 native objects confirm
  a warm lantern at `[10, 2.75, 20]`, radius 19, the new intensity, zero-strength
  removal, and the mobile cap. Its returned native candela and attenuation
  calculate approximately 2,419 lux on horizontal ground four units from the
  lantern, versus approximately 3 lux before. This is a calculation from native
  parameters, not a GPU image or physical measurement.
- `node tests/renderer-filament.cjs`: exposure consistency, disabled/invalid
  emitters, and existing day/night and rendering assertions pass.
- `node tests/world-lighting.cjs`, `node tests/indoor-light-boundaries.cjs`, and
  `node tests/world-lights-scene.cjs`: fixture/mesh alignment, warm and colored
  sources, room boundaries, light editing, expiration, and persistence pass.
- `npm run build` and `node tests/built-assets.mjs` pass. The built Worker is
  67,080,316 bytes, within the 64 MiB hosting limit; versioned renderer assets
  and inline game sources agree.
- Production scene probes used `PROFILE_COOKED=1 PROFILE_RENDER_READY=1
  PROFILE_FULL_FRAME=1 PROFILE_NIGHT=1 PROFILE_FRAMES=220`. Firstlight/mobile
  activated its five point lights plus the sun; Briar Haven/desktop selected
  twelve of sixteen available point lights plus the sun. Both scheduled all
  220 frames with zero runtime or model-loading failures and stayed within the
  renderer residency budgets. Firstlight completed its visible model queue;
  Briar Haven still had 138 visible instances queued at the end of this probe,
  so this is not a claim that all scenery had finished loading.

The probes execute the real game C++ WASM and native Filament NOOP backend.
They do not rasterize pixels or certify phone/PC frame rates, visual brightness,
or hosted capacity for 39 players. GPU appearance needs checking in the game.

Filament's [LightManager API](https://github.com/google/filament/blob/main/filament/include/filament/LightManager.h)
documents point-light lumens and returned candela; its
[lighting manual](https://google.github.io/filament/main/filament.html)
documents exposure and distance attenuation.
