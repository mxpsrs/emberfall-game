# Veldren: The Unwritten Age

Welcome to the land of Veldren: a shared fantasy world with character progression,
quests, gathering, crafting, combat, trading, and elemental spirits.

## Run locally

Use Node.js 24, then run:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/play** and create a local account. No Cloudflare
account, API key or cloud server is needed. Stop with Ctrl+C and run the same
command to resume. Use `npm run dev -- --host 0.0.0.0` to test another device
on your local network.

- **`player-saves/<username>.json`**: the character saves the server loads on startup and writes after
  successful saves and committed trades. Each contains the character's state,
  inventory, equipment, bank, skills, tutorial progress and save revision.
- **`server-data/veldren.sqlite`**: local accounts, password hashes, friends, chat,
  trades, shared world data and the transaction journal for file writes. SQLite runs entirely
  on your computer; no database service needs installing.

Both folders are created automatically in the project root and excluded from
Git and public web access. Back up **both folders with the server stopped** to
move the whole local game to another computer. Restore both in the same places
before starting it. The server loads characters from `player-saves/` on startup. To edit or restore
a character, stop the server, edit or replace that account's JSON file, then
restart it. The file takes precedence over cached character state. Leave its
account ID and username intact. A malformed file stops startup with an error
instead of silently creating an empty character. Interrupted saves or trades
are finished from the local transaction journal before files are loaded.
Set `VELDREN_DATA_DIR` to keep both folders in another directory.

The hosted game's existing accounts remain in its live database. Local accounts
are separate; downloading source does not download private production saves.

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
