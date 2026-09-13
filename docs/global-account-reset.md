# Global account reset protocol

A global reset directly deletes every row from `character_saves`, `game_sessions` and `player_presence`. It preserves usernames, password hashes and login rate limits. Players reload, sign in with their existing credentials, and create a new character at the beginning of Firstlight Isle.

## Run an authorized reset

Use only for an explicitly requested global reset. Run from the Emberfall checkout:

```sh
npm run accounts:reset -- --reason "Owner requested a fresh tutorial playthrough"
```

This command calls the live administrator endpoint immediately. It does not edit source, generate a migration, build the game or publish a version. Ordinary builds and publications never run it.

The operator key is loaded from the ignored `.env.reset.local` file or `EMBERFALL_RESET_TOKEN` in the operator environment. It must match the `ACCOUNT_RESET_TOKEN` secret in Sites. The local file is restricted to its owner and must never be committed or shared. `.env.reset.example` contains configuration names only. `EMBERFALL_SITE_URL` selects the HTTPS game origin.

## Interrupted or uncertain response

```sh
npm run accounts:reset -- --retry
```

The command stores its request ID before sending anything. A retry reuses that ID; the server returns the original receipt without deleting subsequent characters or sessions. A pending request blocks creation of another reset request until it is resolved. Do not discard a pending receipt to retry with a new ID.

Each completed receipt in `global_resets` records the reason, completion time, deleted character count, revoked session count and cleared presence count. The receipt and all deletions commit in one [D1 batch transaction](https://developers.cloudflare.com/d1/worker-api/d1-database/#batch). If any statement fails, none of them commit. A retry of an older completed request cannot change the current reset version.

## Verification

The command reports the server's completed receipt. Use the Sites database reader to verify the exact request ID in `global_resets`, the emptied save/session/presence tables and preserved login accounts. If a player has already rejoined, compare their new save's timestamp against the reset time instead of expecting the tables to remain empty. Tell players to reload and sign in again.

A small server reset version changes with each completed receipt. Both save validation and the final database write check it, so a request already in flight cannot recreate a deleted save. An old tab also cannot overwrite a new character merely because its revision number matches. The client always loads the server save; device backups cannot replace it.

## Maintenance

`npm run accounts:reset:check` exercises authorization, physical deletion, transaction rollback, fresh character creation, command replay and saves racing a reset against real SQLite. The protocol's schema is installed once. Future resets need only the command above.

If the operator key is lost or compromised, generate a new random key, replace the Sites secret, update the local operator environment and apply that environment change through the normal Sites deployment workflow. This is credential maintenance, not part of a routine reset. The endpoint rejects requests when no valid key is configured.

Resetting character progress is not undone by republishing an older application version. Keep past, applied migrations immutable. Historical reset migrations remain for the database's existing history; new resets use this direct protocol.
