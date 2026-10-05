# Veldren

A browser multiplayer RPG with a custom C++ gameplay core, a Filament renderer,
and an in-game world editor. The live game is [playveldren.com](https://playveldren.com).

## Development

Use Node.js 24 or newer and Python 3 with NumPy and Pillow for the asset build.

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/play` and create a local account. Local accounts and
saves are separate from production. [Local development](docs/operations/local-development.md)
explains storage, backups, and device testing.

```sh
npm run check
npm run test:editor
npm run test:rendering
npm run native:test
npm run build
```

`npm test` runs the Node regression suite. Browser fixtures require their QA tools.
Build-dependent checks use `dist/server/index.js`, so run the build first.

## Layout

| Directory | Contents |
| --- | --- |
| `client/` | Browser game, editor, shaders, and runtime assets |
| `worker/`, `db/`, `drizzle/` | Server endpoints, database definitions, and migrations |
| `native/` | C++ engine, importers, native tests, and WebAssembly build |
| `scripts/` | Build, asset, world, development, release, and QA tools |
| `tests/` | Regression tests grouped by subsystem and browser fixtures |
| `art/` | Asset sources, import settings, provenance, and licenses |
| `editor-data/` | Authored world documents and edit history |
| `docs/` | Architecture, operations, acceptance records, QA evidence, and archive |
| `emberfall-android/` | Android client; package identity retained for installed apps |
| `dist/` | Generated Worker and deployment metadata; excluded from Git |

See the [documentation index](docs/README.md) for the engine and editor specifications.
Read [AGENTS.md](AGENTS.md) before publishing. Account identifiers, storage keys,
Android signing identity, and database migrations retain their existing compatibility.
