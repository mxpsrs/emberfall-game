# Editor startup repair

The reported symptom was a blank editor or stalled loading after v238. Production Worker error logs contained no matching startup failure, so the exact device failure was not captured.

Two startup weaknesses were reproduced in source and the complete native-world fixture: the viewport depended on a timed parent-frame injection for its controls, and native construction restoration selected the fresh-player tutorial scene. The loading overlay was dismissed before control initialization, preventing later initialization failures from being presented by startup diagnostics.

The authenticated viewport now loads its controls before its entry point. Its critical startup/control scripts are embedded in the published HTML, with versioned asset URLs and the current release map. The editor explicitly selects the overworld and completes loading only after controls and the canonical document are ready. The outer page waits for readiness and connects once. Editor readiness is set after tool setup succeeds.

Validation: complete native editor startup with 259 canonical scenes, overworld camera at 55/50 and controls ready before completion; startup missing-control failure stays visible; camera/navigation, canonical editing and verified save/reload; playerless frame behavior and terrain history; authenticated compiled viewport and all external script routes; Filament resource lifecycle using its actual WASM NOOP backend. Browser and physical-device rendering were unavailable in this environment, so these checks do not establish GPU or phone visual correctness. Accounts, character saves, schema, server gameplay behavior and terrain worker architecture are preserved.
