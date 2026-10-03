# Stable serialization inputs

These are the unchanged `editor-data/world-edits.json` and
`editor-data/world-scene.json` from the accepted Phase 1 commit
`f49ef4896b910a57bfc3dbd56948fcebca830c30`.

The native migration regression keeps its revision-8 and 29-entity assertions
against these fixed inputs. The owner's live editor files evolve independently;
tests never replace or truncate them to match an old fixture.
