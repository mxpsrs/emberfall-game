# Owner character reset and authored locomotion

The owner requested the supplied Quaternius walk/run animations and a reset of
only login `owner`, character `mxpsrs`. Live account/save inspection resolved that
login to account `2db1d2ba-75e2-4c27-bcdf-94e742f95c86`. The separately registered
`Mxpsrs` account is excluded.

Both character frames now use the complete `Walk_Loop` and `Jog_Fwd_Loop` from
the pinned Quaternius Universal Animation Library Standard source. The previous
run was a 50/50 walk/jog blend; that layer is removed. The authored cycle durations
are retained. The existing distance-based playback cadence, smooth interpolation,
actor transitions, clothing, hair, textures, bind poses and other clips remain.
The importer supports `--locomotion-only` to update these two clips without
overwriting independently imported combat/work clips.

Original animation SHA-256:
`69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997`.
All 140 sampled male/female locomotion frames match the directly retargeted source
across 65 joints, within float precision. Root height may only be raised to avoid
floor penetration. See `qa/owner-locomotion-2026-09-30.json`.

Migration `0020_owner_mxpsrs_character_reset` replaces only the verified owner's
character state with a fresh-start marker and increments its existing revision.
It retains all account credentials and other characters, leaves global reset
state unchanged, and records one affected character. Account identity and receipt
guards prevent a replay from erasing subsequently created progress.

Validation covers actual authenticated stale/fresh save requests, safe migration
replay, exclusion of the separate Mxpsrs login, unchanged other database tables,
authored locomotion, bone lengths, floor contact, smooth interrupted transitions,
movement completion and Filament appearance parity. Publication requires the
existing system-update countdown and maintenance lock because saved player data
changes. Maintenance must be reopened after the scoped reset is verified.
