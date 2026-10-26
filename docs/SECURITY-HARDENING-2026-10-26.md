# Veldren security hardening — 2026-10-26

This branch is a source-code change, **not** proof that production has been updated.

## Changes

- Add defense-in-depth HTTP headers to all responses from the built game Worker.
  HTML responses get a narrow, compatibility-first Content Security Policy
  (`base-uri`, `object-src`, and `frame-ancestors`) without tightening
  `script-src`, which would break currently embedded game scripts.
- Require at least 15 Unicode characters for **new hosted registrations**.
  Existing accounts still authenticate with their original passwords.
  The sign-up UI matches this behavior.
- Add a GitHub Actions security audit and Dependabot coverage for npm and
  GitHub Actions.
- Set a minimum intended Node.js 24 maintenance release in .node-version.

## Verified gaps still requiring work

1. `package-lock.json` pins Vite 8.3.0. Multiple vulnerabilities affect
   this release. Update to Vite 8.3.5 or newer on the supported 8.3 line,
   regenerate the lockfile using a trusted npm registry, run `npm ci`,
   `npm audit` and a production build, then commit both manifests.
   Do **not** edit the lockfile integrity hashes by hand.
2. The repository's visibility was reported as public. Review whether it
   should be private. Visibility changes require GitHub repository
   administration. Review commit history and rotate any credentials found
   exposed; do not store production credentials in this repository.
3. The character-save API currently accepts substantial client-supplied
   progression state. Moving currency, experience, inventory, and combat
   rewards to server-authoritative validation is a distinct architectural
   security task.
4. Code Trail and Rack Royale live sources, deploy environments, and
   their specific packages have not been examined as part of this
   repository-only branch.

## Rollout

- Build and test this branch in an environment that can install dependencies.
- Verify sign-up (14-character password rejected, 15-character accepted);
  existing account login; `/api/auth/session`; game load, audio and assets;
  play, editor and maintenance endpoints; cache behavior and HTTP headers.
- Confirm the deployed project uses this repository version before publishing.
- If changing Worker/API behavior requires disconnecting players, follow the
  documented 2-minute maintenance lock and reopen sequence.
  Do not reset any account, character or database.
- After release, inspect HTTP headers and verify live routes, registration,
  editor, game sessions, and save/reconnect across two devices.
- Keep credentials, customer accounts and maintenance tokens private.
