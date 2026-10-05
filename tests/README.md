# Regression tests

Run `npm test` for the Node suite or `node scripts/check-game.mjs editor`
for one subsystem. You can also pass a filename, such as
`node scripts/check-game.mjs ranged-performance.cjs`.

| Directory | Scope |
| --- | --- |
| `assets/` | Import, registry, texture, mesh, and delivery checks |
| `editor/` | Commands, selection, geometry, persistence, and workspace |
| `gameplay/` | Character, combat, skills, quests, and interface behavior |
| `native/` | JavaScript integration with the C++ and WebAssembly core |
| `rendering/` | Renderer, camera, animation, GPU, and built-asset checks |
| `server/` | Accounts, saves, authentication, multiplayer, and shared state |
| `world/` | Scene ownership, terrain, buildings, streaming, and world data |
| `browser/` | Browser fixtures and browser-driven checks |

Run `npm run build` before checks that import the generated Worker. The runner
records results under `.qa/`; a nonzero exit reports failures. It does not write
dated reports into the documentation tree during normal development.
