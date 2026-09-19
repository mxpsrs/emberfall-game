# Veldren native migration — incomplete

Baseline: 439dfaaea6e144ab9f2e8ab30304f9c34c1915b2. Only mxpsrs/emberfall-game is changed. No Vervesis workspace, server deployment, production account or save is modified.

Implemented source extraction recovers real adapted geometry, skinning, named bones, available clips, equipment, icons, and deterministic world data. These are standard assets and content evidence, **not an invented Vervesis project format**. Browser JavaScript is used only by build-time recovery/testing tools. No JavaScript VM, renderer or engine is added to the game.

Current Vervesis Rust/Filament schemas, SDK, runtime and Windows exporter were not accessible. The available Vervesis archive describes an older Electron/Three implementation and cannot establish the new engine contract. Phases 2 and 3 cannot be represented as complete. The existing browser game remains the reference and rollback point; dist/ contains authored source.

Run recovery/verification using the branch-scoped GitHub workflow or the commands in that workflow. It generates individual standard models, scene visual exports, source-content snapshots and machine-readable reports, and commits only assets and migration content/reports to this migration branch. It does not deploy.

Do not infer native gameplay, multiplayer, UI, Windows packaging or performance from asset validation, CPU pose comparisons or local worker tests. See forthcoming detailed compatibility/handoff reports and the exact executed reports in migration/reports.
