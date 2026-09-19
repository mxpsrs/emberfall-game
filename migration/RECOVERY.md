# Veldren migration recovery checkpoint

Overall migration status: **incomplete**.

Baseline: `439dfaaea6e144ab9f2e8ab30304f9c34c1915b2`.
The working environment became inaccessible during publication of local commit
`2fd1a54015886accc4be3c043404da54cee3960d`. That commit was not pushed and is
not a delivered result. This checkpoint retains the recovered asset blobs that
were successfully uploaded, including 113 individually usable Nature/Tree
authoring GLBs, all their local texture dependencies, current UI rasters, audio
and licensing evidence. The original reference client/server and Git history
remain unchanged.

The lost checkout had executed asset/world/parity/reference-game tests; their
complete reports were lost with it. Those prior results must not be presented
as tests of a reconstructed checkout. Recovery and regeneration remain in
progress.

The read-only GitHub Actions workflow creates a verified source bundle for
restoring this same Veldren repository. It does not build/deploy the live game,
change player data, contact game APIs, or modify Vervesis. It uses read-only
repository permission and excludes checkout credentials from the bundle.

Current Rust/Tauri/Filament Vervesis project schemas, SDK and runtime remain
unavailable. The accessible Vervesis archive is the older Electron/Three.js
prototype. No native migration, Windows launch, native multiplayer or
performance acceptance has been demonstrated.
