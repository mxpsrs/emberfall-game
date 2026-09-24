# Veldren rename compatibility

Player-facing branding is Veldren. Package metadata, web login, page header, character creator, installable web-app manifest, Android labels and messages, API messages, credits, and documentation have been updated.

Some old identifiers are intentionally retained:
- Existing server hostname: no domain migration has been performed.
- Browser save, cloud backup, and camera keys: existing data remains accessible.
- Android package ID, Java package path, signing alias and key filename: installed-client update identity remains intact.
- Operator environment variables and the exact private maintenance-backup filename: existing operator setup and credential recovery remain valid.
- Mesh IDs and authored animation clip provenance: existing asset references remain compatible.
- Repository name, Android source directory, and packaging script path: existing remotes and command entry points remain valid.

This commit does not deploy the website or build a new signed APK. Production publishing must follow AGENTS.md's maintenance procedure.

Verification: run `node tests/branding.cjs` and `node tests/account-flow.cjs`.
