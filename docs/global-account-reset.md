# Reversible beta character resets

Permanent character deletion is disabled. Every reset archives all active character rows, including complete state, revisions and timestamps, in durable database tables before starting fresh. Existing usernames, password hashes, friends, privacy settings and chat history remain unchanged. Pending trades are cancelled; their records remain. Sessions and online presence are cleared.

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

A single transactional batch covers the snapshot, active save replacement, session invalidation and reset version. Failure rolls the batch back. Successful requests are idempotent; older clients cannot overwrite the new state using stale save versions. No archive removal operation is implemented.

`npm run accounts:reset:check` verifies authorization, locked maintenance, snapshot rollback, byte-identical restoration, preservation of newer progress, login preservation, replay safety and concurrent stale-save rejection against SQLite.
