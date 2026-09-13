# Veldren: The Unwritten Age

Welcome to the land of Veldren: a shared fantasy world with character progression,
quests, gathering, crafting, combat, trading, and elemental spirits.

## Run locally

Use Node.js 24, then run:

```sh
npm ci
npm run build
npm run dev -- --host 127.0.0.1
```

The local preview uses temporary test data. Production accounts and character
saves remain on the existing hosted game.

## Source layout

- `dist/`: authored browser game, interface, world, and licensed assets.
- `worker/`, `db/`, `drizzle/`: server endpoints and database definitions.
- `emberfall-android/`: Veldren Android client and build instructions.
- `scripts/`, `tests/`, `docs/`: development tools, checks, and asset records.

Read `AGENTS.md` before publishing. Every production update requires the existing
two-minute maintenance countdown and verified session lock.

## Rename compatibility

The public title is **Veldren: The Unwritten Age**; the world and compact app
name are **Veldren**. Existing account data, character identifiers, and saves
are unchanged. Some historical identifiers deliberately remain compatible:

- The current game address is
  <https://emberfall-realms.rayfgarrison97.chatgpt.site>. Keep it until the
  separately requested custom-domain setup is verified.
- Browser storage keys `emberfall-save-v1`, `emberfall-camera-v1`, and
  `emberfall-cloud-backup-v1` still access existing progress and settings.
- Android package `games.emberfall.beta`, the `emberfall-beta` signing alias,
  and private `emberfall-beta.p12` key identify the existing installed app.
- The Android folder and `scripts/package-emberfall.mjs` path remain compatible
  with the owner's exported repository and existing commands.
- Development tools prefer `VELDREN_*` environment variables and accept the
  corresponding `EMBERFALL_*` variables for existing operator configurations.
- Private maintenance/signing backups retain their original recorded filenames.
  Keep them outside source control and deployment archives.

The historical Git commits retain their original contents and identities.
