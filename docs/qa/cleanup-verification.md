# Cleanup verification — 5 October 2026

Newly inserted scene props now enter the live object projection. The insertion
check uses the existing projection rather than parent bookkeeping, which already
contains the new entity when its event is processed.

Seven woodland resources moved 5–8 tiles onto connected harvesting approaches.
Their authored scene identities remain fixed when ecology placement is rebuilt.
All 21,747 scene entity IDs and 4,674 shared catalog IDs are preserved; only the
seven resource transforms changed. Item definitions and tutorial contracts are
unchanged.

The regression fixtures now load current production dependencies and the current
tutorial. Tests for the retired spirit feature were replaced with migration and
neutral-behavior checks. Armour fitting is compared against an uncached reference
using the current authored bodies. Rendering checks account for queued terrain
construction and the current camera reach.

## Validation

- Initial full run: 204 passed, 40 failed, 244 total.
- Current test set: 240 passing results, combining the full run with targeted
  reruns after repairs. Five retired-feature tests were removed and one migration
  test was added.
- Complete story arc and six fresh-runtime save recoveries passed.
- Authenticated local two-client combat, observer animations, activity streaming,
  private loot, and stalled-client behavior passed.
- Whole-world resource, settlement, and room connectivity passed.
- Native resource relocation retains scene and catalog identities.
- All 1,408 terrain pages passed native height and normal parity (5,632 samples).
  Maximum height error: 0.00005010; maximum normal error: 0.00009778.
- Source parsing, imports, documentation links, and the deployment build passed.

## Live verification limits

The public game page reached the login screen. An earlier Filament script-load
failure recovered through Retry loading; its transport cause was not established.
The secure login handoff was cancelled, so signed-in production movement, combat,
character saving, and editor interaction remain unverified. Desktop and mobile
rendering fixtures are automated checks; no physical-phone session was tested.
Local multiplayer checks do not establish sustained hosted capacity for 39 users.

The shared-resource update requires the normal in-game warning, full countdown,
and maintenance lock before deployment. Existing accounts and character saves
must remain intact.
