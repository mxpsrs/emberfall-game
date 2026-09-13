# Global account reset protocol

Use this only when the owner explicitly requests a global reset. The standard reset means all character progress, including character appearance, skills, inventory, equipment, bank, currency, quests, tutorial progress and boss progress. Usernames and password hashes remain intact. Active sessions and multiplayer presence are cleared, so everyone signs in again and creates a new character on Firstlight Isle.

## Prepare one reset

```sh
npm run accounts:reset -- --reason "Owner requested a fresh tutorial playthrough"
npm run accounts:reset:check
```

The first command generates a new custom Drizzle migration, its snapshot and journal entry, and the matching server reset version. It records the reason in source. It does not contact production. The check exercises the latest reset against real SQLite and account/save handlers, including replay, stale tabs and a fresh character save.

Run the command once per requested reset. It refuses to stack a second reset on uncommitted migrations. Never add it to the normal build or startup scripts. Do not run it again merely because publication is still pending or needs a retry.

## Publish and verify

1. Review the new migration and `worker/reset-policy.js`. Leave all previously applied migrations unchanged.
2. Use the existing Sites build helper, then run `node tests/built-assets.mjs`.
3. Commit and push this exact source, package the build, save a version and publish it to the existing Emberfall Site. Preserve its audience. Follow the Sites publishing workflow; do not run arbitrary production SQL or add a public reset endpoint.
4. Wait for the deployment's terminal status. Inspect the live `game_resets` table for this exact reset ID, its affected save count and timestamp. Verify character saves contain the reset marker, sessions and presence were cleared, and login accounts remain. Players may already have signed in and created new saves by the time verification runs; compare their update times with the reset timestamp.
5. Tell players to reload and sign in with their existing credentials. They will return to character creation and the beginning of the tutorial.

The migration ledger applies each reset once. Every reset statement also checks its audit ID, so replaying the same batch leaves subsequent progress and new sessions intact. Save revisions increase and the server reset version changes, preventing old tabs from restoring wiped characters even after another tab signs back in. The client always loads the server save; device backups are never restored over it.

If publication fails, first inspect deployment status and the reset audit. Database migrations can finish before the new Worker publishes. Continue the same saved version after resolving a transient failure; do not create another reset batch. If the state is uncertain, inspect it before changing anything. A character reset is not reversed by republishing an old application version.
