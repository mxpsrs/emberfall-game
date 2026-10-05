# Staff idle grip correction

The source staff idle animation kept its right wrist at the hip while rotating the palm to hold an upright staff. That put the shaft through the forearm and upper arm. The old test only checked the palm socket, so it did not detect the collision.

The shared skeleton pose now adds an outward upper-arm rotation and a forward elbow bend for staff rest, preserving the authored wrist orientation and curled fingers. The correction blends out when walking, running or casting takes over. Full movement/cast poses, weapon meshes, grip offsets and non-staff poses remain unchanged. Both CPU and GPU paths and local/remote avatars use the same skeleton function.

The new regression checks the shaft against the actual posed arm vertices across both body types' idle loops. Minimum radial arm clearance above the grip was 0.0025–0.0059 model units before the fix and is now 0.084–0.125. It also checks upright sockets, CPU/GPU agreement and finite transition matrices. The previous palm-only test remains as complementary coverage.

Actual production geometry, materials, lighting and shadows were rendered through native OpenGL ES for male and female poses, including a second female camera angle. Selected images are in `qa/staff-idle/`. These are offscreen renderer inspections, not live browser captures.

Passed: staff-idle regression, armour-loading mesh parity, rendering/skin weights, authored motion/joint lengths, tutorial/world fitting, shared observer action replication and built-asset validation. No server protocol, player state, world catalog or gameplay data changes are required, so publication keeps the game open.

The loading optimization is retained; see `LOADING-2026-09-16.md`. Automatic approval review rejected the follow-up GitHub main update because it requires explicit authorization to move the default branch for these fixes. Source can still be committed, built, validated and published through the existing Site workflow; do not bypass the rejected GitHub ref update. Request owner confirmation for the concrete prepared follow-up commit.
