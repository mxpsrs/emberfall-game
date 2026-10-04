# Editor workspace repair, 2026-10-04

The toolbar wrapped inside a fixed 58-pixel row, leaving controls clipped.
Building-state messages hid the asset browser, and several sidebar sections
could compete for the same height. Author display rules also overrode hidden
fields. The model list was below the entire building form, and selecting a
modular model rebuilt the list and discarded its loaded pages.

The editor now groups its top controls under File, Edit, Tools, Build, Snap and
View. Disclosure menus support keyboard navigation, Escape, outside-click
dismissal, one open menu and viewport clamping. The header grows with its rows.
Existing command IDs, history, save and snap handlers remain in use.

World and modular models share a separate bottom library with search/category
filters, scrolling thumbnail cards and a preview pane. Expand fills the
workspace on desktop; Restore or View returns to the normal layout. Building
updates keep the library open. Selecting a later model retains loaded pages,
and filtering retains its placement reference. Browsing building models alone
does not create a building. Arming placement switches to the viewport.

At widths up to 1,000 pixels, Scene, Viewport, Inspector and Models buttons select
one workspace panel. The model list and preview have their own switches. The
console starts collapsed and occupies a separate row when expanded. Hidden
elements are explicitly excluded from layout.

## Verification

- `node tests/editor-workspace.cjs` passes with the actual HTML and production
  outer-page scripts in a DOM fixture: menu/keyboard dismissal, popup bounds,
  panel and console switching, expanded library, world/part previews, later
  pages, filtering, placement and library persistence across building messages.
- `node tests/editor-camera.cjs`, `node tests/editor-context.cjs` and
  `node tests/editor-modular-start.cjs` pass, covering existing camera controls,
  editor separation, placement, saved transforms and modular assemblies.
- `npm run build`, `node tests/built-assets.mjs` and
  `node tests/editor-production.mjs` pass. Authenticated editor shell scripts
  are served; save/readback, permission checks and account preservation pass
  against an isolated in-memory database. CSS compiles without warnings.
- The Worker is 67,091,368 bytes, within the 64 MiB hosting limit.

Visual browser QA is unverified: this managed environment lacks the supported
browser skill. DOM fixtures do not calculate CSS layout or simulate device
touch behavior. No browser was installed or substituted for that workflow.

This is a compatible editor-client update. Server logic, account/character
data, saved world, renderer/lighting and hosting settings are unchanged.
Publish with the game open under the current maintenance scope in `AGENTS.md`.
