# Veldren source recovery history

Overall native migration status remains **incomplete**; see STATUS.md.

The initial local checkout disappeared during publication of commit 2fd1a54015886accc4be3c043404da54cee3960d. That unpushed commit and its lost reports are not delivered evidence.

Remote checkpoint 18420cea33fcdc1a1c2af4ead7b0961418f5f080 preserved available asset blobs. A read-only GitHub workflow produced a verified full-history source bundle. The repository was restored from that bundle, all migration tools were reconstructed, game models and world data regenerated, and tests executed again.

The subsequent asset/world workflow completed successfully from source commit f13f938cda4d4e47c8ab8e3fde6c99fcd7e270f0 and committed generated files as 7bd6c973c72f4a03202d16e67c681b9f502808ef. The reports delivered on this branch are the regenerated results, not the lost original run.

Source acquisitions larger than the connector's 16 MiB request limit were transferred in verified chunks. The source-validation workflow reconstructs each individual original, checks its complete Git blob hash, and removes transfer chunks from the final tree.

All workflows are restricted to mxpsrs/emberfall-game and the migration branch. They do not deploy, call live game APIs, reset player data or modify Vervesis. Full Git history and the reference client/server remain intact.
