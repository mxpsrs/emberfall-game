# Briar Haven live update — execution checkpoint

The existing live game is https://playveldren.com. It remains on version **241**;
this overhaul has **not** been published. The execution environment disconnected
during the final terrain correction, preventing rebuilding and the remaining
browser checks and packaging.

The branch contains twelve distinct native building plans, assembled authored
floors/roofs/gables, aligned door collision, stairs and lofts, settlement routes,
vegetation, forge activity, warm runtime daylight, shared third-person camera,
wall obstruction, occupied-floor cutaways and editor fixes. Existing saved-world
revision 26, all 103 edits, accounts, saves, gameplay data and entity IDs are
preserved. No main/PR #4 merge, reset or production database rewrite occurred.

See [the exact checkpoint, tests, performance, defects and next steps](EXECUTION-CHECKPOINT.md).
The pending far-terrain coverage and final-step test corrections passed syntax
parsing only; they still require regressions, a build and actual rendered checks.
The release receipt intentionally pins the earlier tested Worker and will reject
the unbuilt correction.

These are actual settled screenshots of that tested Worker, saved to GitHub:

| Main street | Services/smithy | Varied houses | School approach |
| --- | --- | --- | --- |
| [View](after-live/main-street.jpg) | [View](after-live/services-smithy.jpg) | [View](after-live/houses.jpg) | [View](after-live/magic-school.jpg) |

All six routes were captured and inspected locally; the last two image files
could not be uploaded before the execution server disconnected. Distant terrain
coverage remained visibly incomplete, so visual acceptance is unfinished.
The twelve physical door walks, latest actual editor GUI, School facade and live
publication remain. This is not a finished delivery or a separate-game preview.

The software GPU recorded CPU p50 **289–782 ms** and frame-interval p95
**2.30–4.26 seconds**. Those slow results are not performance acceptance.
Physical desktop/phone FPS targets and 39-player hosting capacity are unverified.
Full measurements, passing checks, missing `em++` and six pre-existing other-city
banker-counter failures are recorded in the checkpoint.
