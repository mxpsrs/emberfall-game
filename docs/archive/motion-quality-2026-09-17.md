# Motion clarity, zoom and compass — 2026-09-17

**Acceptance remains open.** Confirmed rendering defects are corrected and local comparisons are recorded. Neither the full Visual Regression Gate nor the device Performance Regression Gate is certified. The available browser exposes no WebGL context, and no physical PC/mobile GPU is accessible here. Native GLES rendering and instrumented JavaScript are explicitly different evidence.

## Root causes and changes

- The old renderer reduced its backing image to 65% after slow frames, on top of a 1080p pixel cap. It now keeps native device backing pixels throughout gameplay. There is no frame-rate-driven resolution adjustment or pumping.
- The atlas used bilinear filtering without mipmaps. The updated path uses trilinear mipmaps, up to 8× anisotropic filtering, unwrapped UV derivatives, and atlas boundary guards. Alpha is premultiplied before mip generation and recovered after sampling to prevent dark foliage fringes. Repeating paving uses a dedicated repeat texture so filtering cannot cross into another atlas material. Existing texture assets are retained.
- Procedural fine grain and tile patterns were sampled above the pixel resolution. Screen-space derivative filtering integrates subpixel patterns while retaining resolved detail. It does not blur the completed image.
- The shadow projection followed every fractional player movement. Its light-space origin is now snapped to shadow texels. The gameplay camera is not snapped.
- Camera orbit rebuilt building selection hulls every frame. These now calculate when an actual selection needs them. A conservative world-space visibility check avoids terrain sampling for buildings far outside the viewport. The eight benchmark locations submit the same draw and vertex counts as the baseline.
- Minimap terrain redraws no longer repeat merely because the camera rotates. Scene invalidation is retained.
- The zoom slider reports 0% at the closest existing view and 100% at the widest existing view. Buttons, wheel, pinch and reset update it. Camera pitch remains entirely player-controlled. Open-door roof removal and castle access behavior from the previous repair remain intact.
- The minimap displays N/E/S/W rotated with its map; the world map has a fixed north-up compass.
- Settings → Performance records 60 seconds of actual foreground frame intervals, including major stalls, average FPS, average worst 1% FPS, frame times, render resolution and zoom range. Hidden-tab time is excluded. Results can be downloaded without sending account information anywhere.

## Audit

No TAA, temporal accumulation, camera jitter sequence, or camera motion blur exists in this renderer. WebGL multisample anti-aliasing remains requested. Camera position is floating point and movement/held rotation update in the render loop; no new camera smoothing delay was added. Model density, assets, draw distance and existing model/terrain LOD thresholds were not lowered. The existing terrain threshold around zoom 24 still needs a physical-device movement review; there is no basis for certifying every legacy transition here.

## Reproduction and comparisons

The baseline is commit `94b0abbbd90f07f189c8230eb92ff3508e563f64` (live build before this work). Paired native GLES captures use Briarhaven at (55,61), yaw −0.55, pitch 0.85, maximum zoom 14, and closest zoom 65, with identical world state, lighting and geometry. Desktop output is 1920×1080. A second pair uses 844×390 landscape dimensions; this is a mobile viewport comparison, not a mobile device test.

All 205 desktop geometry buffers and 138 mobile geometry buffers match before/after. The images include architecture, roofs, terrain, vegetation, small props and NPCs. The separate browser fixture also includes six synthetic rendered peers; it does not certify multiplayer delivery or hosting capacity.

The static and subpixel-shift captures reproduce crawling in the road/terrain shader. `motion-quality/temporal-residuals.json` records fixed-patch, motion-compensated RGB differences and its limitations. Paired wide, near, subpixel and mobile images are retained beside it. Visual review caught dark alpha fringes and atlas repeat seams during implementation; both were corrected before retaining the final comparisons. Near-view paving detail and world geometry remain present.

The browser ran the old rendering path through 95 measured fallback frames in a populated town: average 0.514 FPS, 1% low 0.403 FPS, mean 1947.1 ms, maximum 2482.9 ms, 95 frames over 33 ms, scale 100%. WebGL was unavailable, so this exercises software Canvas fallback and **does not measure the targeted WebGL renderer or meet device acceptance**. The early diagnostic replay did not complete every door traversal; it is not claimed as full movement acceptance. The reusable replay now runs all eight phases for 60 seconds on suitable hardware.

## CPU measurements

`scripts/qa/benchmark-environment.cjs` executes the populated production world with instrumented WebGL submissions. It measures JavaScript work, not GPU execution, browser scheduling, input-to-display latency or actual FPS. Raw before/after samples are retained. Shared test-host timing has noise; no device FPS is inferred from it.

| Scene | Before median CPU ms | After median CPU ms | After p95 CPU ms |
|---|---:|---:|---:|
| Briarhaven | 25.82 | 17.28 | 82.81 |
| Ironcrown castle | 24.86 | 16.81 | 117.14 |
| Dense forest | 14.90 | 11.77 | 86.28 |
| Crownreach | 36.08 | 11.30 | 130.40 |
| Freight Mine | 17.03 | 17.59 | 26.51 |
| Pinewatch Mine | 7.12 | 5.06 | 7.21 |
| Briarhaven maximum zoom | 36.36 | 17.63 | 97.27 |
| Mobile landscape viewport | 18.21 | 10.34 | 28.18 |

Maximum-zoom submissions remain 232 draws / 3,291,864 indexed vertices in the recorded comparison. No scenery was removed to obtain the CPU improvement. The profile identifies new terrain chunk construction and cold mesh/animation preparation as remaining hitch sources. Initial scene generation still takes seconds; these costs prevent a complete performance pass. Freight Mine's small median increase is retained rather than concealed.

## Required remaining acceptance

1. On an actual 1920×1080 PC, record representative standing, walking, running, camera rotation/reversal, complete building entry/exit and the entire zoom range. Target 60 FPS with at least 50 FPS 1% lows and no repeated >33 ms stalls.
2. Repeat on modern physical mobile hardware, including maximum zoom. Sustain at least 30 FPS and target 60 FPS where practical. Native backing resolution increases pixel work compared with the old low-resolution cap; its device cost is not yet measured.
3. Review moving before/after footage at equivalent positions and camera settings. Verify atlas filtering and alpha cutouts on real WebGL drivers, MSAA, shadow stability, LOD transitions, input latency and memory over a sustained session.
4. Resolve cold-cache hitches, any device regression, or any visual defect exposed by those checks before calling either gate passed.

## Validation and publication scope

Targeted checks cover camera input/slider mapping, fixed native scale, shadow alignment, mipmap/anisotropy/alpha configuration, real frame statistics, desktop rendering and selection, map interactions, UI panel wiring, exact indexed geometry, animation poses and context-loss fallback. The existing door test was reconciled with the owner's open-door roof behavior; it was not used to restore the rejected automatic roof/camera behavior.

These are client rendering and UI changes. No account, save, shared-world protocol or server behavior change is intended, and no maintenance interruption is required. Temporary comparison pages and captures are excluded from the deployed build.

Implementation reference: [explicit texture gradients for wrapped coordinates](https://developer.mozilla.org/en-US/docs/Web/API/EXT_shader_texture_lod), [anisotropic texture filtering](https://developer.mozilla.org/en-US/docs/Web/API/EXT_texture_filter_anisotropic).
