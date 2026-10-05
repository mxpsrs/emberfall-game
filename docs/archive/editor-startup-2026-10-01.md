# Editor startup repair

The reported symptom was a blank editor or stalled loading after v238. Production Worker error logs contained no matching startup failure, so the exact device failure was not captured.

Two startup weaknesses were reproduced in source and the complete native-world fixture: the viewport depended on a timed parent-frame injection for its controls, and native construction restoration selected the fresh-player tutorial scene. The loading overlay was dismissed before control initialization, preventing later initialization failures from being presented by startup diagnostics.

The authenticated viewport now loads its controls before its entry point. Its critical startup/control scripts are embedded in the published HTML, with versioned asset URLs and the current release map. The editor explicitly selects the overworld and completes loading only after controls and the canonical document are ready. The outer page waits for readiness and connects once. Editor readiness is set after tool setup succeeds.

Validation: complete native editor startup with 259 canonical scenes, overworld camera at 55/50 and controls ready before completion; startup missing-control failure stays visible; camera/navigation, canonical editing and verified save/reload; playerless frame behavior and terrain history; authenticated compiled viewport and all external script routes; Filament resource lifecycle using its actual WASM NOOP backend. Browser and physical-device rendering were unavailable in this environment, so these checks do not establish GPU or phone visual correctness. Accounts, character saves, schema, server gameplay behavior and terrain worker architecture are preserved.

## Confirmed head-script failure follow-up

The owner then reported that the editor remained on “Preparing the realm”. The production diagnostic at 2026-10-01 07:47:09 UTC identified `VLD-SDL`: the browser failed to download `asset-materials.js?v=74ddb71b36caee73`. This script executes in the head. Startup recorded a fatal failure before the loading elements existed and never replayed that failure when the body was parsed; the editor entry point then returned because startup was already failed.

All small renderer resource dependencies in the viewport head now ship in its HTML alongside the previously embedded startup controls. Filament's vendor loader remains external because it resolves its WASM from its script URL. Startup retains failure/status state and renders it on DOMContentLoaded, so a pre-body failure displays its diagnostic and Retry loading instead of the initial placeholder. Repeated replay produces one failure panel and one diagnostic report.

The regression test reproduces the reported material-script failure with no loading DOM, mounts the body, and verifies the visible retry/diagnostic. It also verifies that renderer progress recorded in the head appears after mounting. The compiled authenticated viewport test verifies embedded renderer dependencies and remaining external script routes. The terrain cook reuses identical validated samples because only startup diagnostics changed among root runtime scripts; no terrain inputs or native Scene data changed. Browser GPU/device QA remains unavailable.
