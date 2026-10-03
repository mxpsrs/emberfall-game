# Briar Haven implementation checkpoint

Work continues on `briar-haven-visual-overhaul-wip`. The existing engine, editor,
building and streaming changes from `6e8cdd192f7a26366eef0f0e1c0bfea03e019eed`
were merged without resetting the branch or replacing newer work.

Implemented: twelve deliberately different modular building plans; joined wings,
gable/hip/lean roofs; continuous ground floors; aligned portals and collision;
supported lofts and furniture; ground-level counters and attendants; clear cellar
access; recognizable services; connected lanes and porches; short clustered
vegetation; authored textures; bounded forge smoke and work animation. Existing
generated IDs and saved editor objects are retained. Canonical camera projection,
picking and obstruction handling were pushed in the preceding milestone.

The native building acceptance regression passes floor coverage, entrance/collision,
cutaways, stair travel, the accepted building/actor/service identities and native
serialization. Building, camera, editor separation/selection, lighting boundary,
Scene serialization and two-client identity regressions have passed. The full build
and actual Filament verification passed. Canonical render construction now makes
bounded progress during continuous legacy construction demand; regression tests
cover that starvation case.

This is an implementation checkpoint, **not visual acceptance or a deployment**.
An actual production-Filament capture exposed incomplete resource construction.
The construction/culling fix is under rendered verification. Final comparable
screenshots, walkthrough, performance results and live deployment evidence must
be recorded before calling the overhaul complete.

Known verification gaps: physical Ryzen/RTX and phone measurements, sustained
39-client hosted capacity, and a fresh Emscripten build (`em++` unavailable here).
Six civic-banker counter checks also fail in the accepted engine baseline; they
have not been concealed or disabled.
