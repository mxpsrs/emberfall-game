# Local development

## Start the server

Use Node.js 24, then run:

```sh
npm ci
npm run dev
```

Open **http://127.0.0.1:5173/play** and create a local account. No Cloudflare
account, API key or cloud server is needed. Stop with Ctrl+C and run the same
command to resume. Use `npm run dev -- --host 0.0.0.0` to test another device
on your local network.

- **`player-saves/<username>/account.json`**: the account identity and password hash (never a plain-text password).
- **`player-saves/<username>/character.json`**: character, inventory, equipment, bank, skills, tutorial progress and save revision. Created on the first save.
- **`server-data/veldren.sqlite`**: the local working index, social/shared-world state and crash-recovery journal. No database service needs installing.

The server loads accounts and characters from their folders on startup and writes
successful registrations, saves and committed trades back to those folders.
Existing flat character files migrate automatically into the account folders.
Malformed files stop startup instead of silently creating empty characters.
To edit or restore character progress, stop the server, replace `character.json`
inside that account's folder, and restart. Keep its account ID and username intact.

**To delete an entire local account, delete `player-saves/<username>/`.**
The next server request (or restart) removes its cached login, sessions, character,
archives and linked social records. Old sessions and pending saves cannot recreate
that folder. The username becomes available for a new account with no old progress.
Other accounts are preserved. To remove all local accounts, delete every account
folder in `player-saves/`; you do not need to delete `server-data/`.

Both storage folders are private and excluded from Git and public web access.
Back up both with the server stopped to preserve the whole local world. Account
folders alone can restore logins and characters, but not social/shared-world state.
Set `VELDREN_DATA_DIR` to choose another storage location. Do not move folders
away temporarily while the server is running: missing folders mean deletion.

The hosted game's accounts remain separate in its live database. Local operation
never pulls cloud saves; downloading source does not download production accounts.
