# Working on Veldren

Read [README.md](README.md) for the project layout and commands, and
[docs/README.md](docs/README.md) for the engine, asset, editor, and world specifications.
Keep authored browser files in `client/`; `dist/` is generated deployment output.

Preserve every account and character save, stable asset and entity identifiers,
storage keys, database migrations, and Android signing identity. Spirits are retired;
keep the old-save migration and legacy call compatibility without restoring the feature.
Never run global account reset as part of publishing.

## Publication

Publish compatible website, copy, metadata, and source organization changes while
the game stays open. Use the in-game warning, full countdown, and maintenance lock
for server behavior, shared-world protocol, or player-data updates that require a
disconnection, and whenever the owner explicitly requests maintenance. Wait for
`locked`, publish, finish the same request, and verify reopening. Urgency does not
waive this procedure.

Use `node --env-file-if-exists=.env.maintenance.local scripts/maintenance.mjs
start|check|finish REQUEST_ID`. Never print or commit the operator credential.
If the ignored operator file is missing, restore the existing private Library backup
`Emberfall-Maintenance-Operator-Backup.json`, file
`libfile_a9894717579881919d1c6c5566123daf`. Write its `MAINTENANCE_TOKEN` as
`EMBERFALL_MAINTENANCE_TOKEN` in the operator file with permissions 0600. Attempt
this recovery before proposing a key rotation; any replacement needs a verified
private durable backup before activation.

The required capacity is at least 39 simultaneous playtesters. Local integration
checks do not certify hosted capacity; require sustained authenticated production
evidence before claiming that requirement is met. Report unresolved failures and
browser or device verification limits honestly.

[Publishing history](docs/archive/publishing-history.md) retains prior exceptions,
credential recovery, and the September 2026 playtest handoff. Those deployment
exceptions are consumed and do not authorize future maintenance bypasses.
