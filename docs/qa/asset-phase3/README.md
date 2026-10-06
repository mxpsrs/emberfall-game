# October performance phase three: separate asset delivery

Models, textures, audio, native WebAssembly, terrain pages and other bulk browser
payloads live in the Site's `GAME_ASSETS` object bucket. The Worker contains the
API, startup documents, small scripts and a bounded metadata manifest. Asset URLs,
versions, decoded bytes, account state and canonical native model formats remain
compatible.

The build writes content addressed payloads under `.asset-cache/public-assets`.
Text and WASM use precompressed Brotli when useful. The server streams stored
bytes to browsers that accept Brotli and streams decompression otherwise. Runtime
scripts retain their previous identity delivery. Filament atlases retain PNG
bytes. Audio supports byte ranges. Versioned public assets use browser caching
and optional edge caching where the runtime permits it; editor access rules
still run before asset delivery. The current Sites dispatch runtime prohibits
access to the default edge cache. That restriction bypasses the optional cache
and cannot block direct bucket reads or browser caching.

Uploads require the existing private operator credential. SHA-256 must match the
object key before a payload can be written. Repeating an upload is safe. Missing
storage, mismatched metadata or failed reads return a recoverable 503 response
rather than an empty successful asset.

A bootstrap build keeps existing embedded delivery while provisioning the bucket.
Every unique object is uploaded and checked remotely before publishing the slim
Worker. Existing keys are retained for rollback and future builds reuse identical
objects. No account resets, player-data migrations or protocol changes are needed.
The `--delivery-only` build option requires an exact fingerprint match for world
and asset preparation inputs and outputs; changed inputs require a full build.

Software integration and byte comparisons do not certify physical phone frame
times, rendered visuals or 39-player hosted capacity.
