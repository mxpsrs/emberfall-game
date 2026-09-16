# Complete account removal and beta checkpoints

The owner explicitly authorized deleting **all local and live accounts** on 16 September 2026. The local-folder fix is separate from hosted storage; hosted gameplay still uses D1. The requested VPS/file-only migration is deferred by the owner.

For complete deletion, lock maintenance first, then run:

```sh
npm run accounts:reset -- --purge --reason "Owner requested deletion of all accounts"
```

This permanently removes logins, active characters, archived characters, sessions,
social records and shared runtime state. It retains non-personal reset receipts
and the maintenance lock. Everyone must register again. This is not an archive.
`--status` reports remaining accounts, characters, sessions and archived characters.
Retries use the same request ID and cannot delete accounts registered afterward.

The reset operator key is privately backed up as `Veldren-Account-Reset-Operator-Backup.json`, Library `libfile_fa7cd11964288191a0db36e7f9824805`. Restore it into ignored `.env.reset.local` as `VELDREN_RESET_TOKEN`; never print or commit the key. The dedicated maintenance key remains unchanged.

# Reversible character-only resets

The separate archive/restore modes retain accounts. Each archive-mode reset archives all active character rows, including complete state, revisions and timestamps, in durable database tables before starting fresh. Existing usernames, password hashes, friends, privacy settings and chat history remain unchanged. Pending trades are cancelled; their records remain. Sessions and online presence are cleared.

Both reset and restoration require locked maintenance. Follow AGENTS.md to announce maintenance, wait two minutes, verify the lock, and keep login locked until the operation succeeds.

Use the dedicated operator key in the ignored `.env.reset.local`. Never commit or print it.

Archive current characters and start fresh:

```sh
npm run accounts:reset -- --archive --reason "Owner requested a fresh beta playthrough"
```

The output request ID is also the durable checkpoint ID. The local receipt is `.reset-requests/beta-latest.json`. Preserve the receipt; archives remain in the database even if the local receipt is lost.

Restore all characters from a checkpoint:

```sh
npm run accounts:reset -- --restore CHECKPOINT_ID --reason "Restore beta progress"
```

Restoration first archives the current characters under its own new checkpoint ID, so newer progress can also be restored. Accounts created since the restored snapshot keep their login and start without a character until their newer checkpoint is restored.

If the response is interrupted or uncertain, retry the SAME request rather than initiating another:

```sh
npm run accounts:reset -- --retry
```

Read the most recent completed reset receipt without changing data:

```sh
npm run accounts:reset -- --status
```

A single transactional batch covers the snapshot, active save replacement, session invalidation and reset version. Failure rolls the batch back. Successful requests are idempotent; older clients cannot overwrite the new state using stale save versions. Complete purge also removes all archived checkpoints and characters.

`npm run accounts:reset:check` verifies authorization, locked maintenance, snapshot rollback, byte-identical restoration, preservation of newer progress, login preservation, replay safety and concurrent stale-save rejection against SQLite.
