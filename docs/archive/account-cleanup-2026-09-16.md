# Latest completion: tutorial fixes and reversible fresh start

Published v119. Live verification: 14 accounts, zero active characters, 12 restorable archived characters; local verification: zero active characters. Usernames/passwords remain. Maintenance reopened. See `TUTORIAL-INTERFACES-2026-09-16.md` for fixes, evidence and browser limitations. Earlier blocked-purge and unfinished-tutorial notes below are historical.

# Account cleanup — 16 September 2026

The owner explicitly requested deletion of every live and local account, then said to move forward and settle accounts while deferring the persistent-file live-host migration.

- Local cleanup completed while the preview was stopped: one disposable account removed; zero accounts, characters and account folders verified afterward.
- Local folder authority and deletion are committed as 98f0e93. SQLite remains a working index; this is not a file-only live server.
- Complete hosted purge support, status counts and a registration maintenance guard are deployed in v118, source 31bdee747b37d32d330dd93a684db8ef8e0a4fb6, environment revision 5. No new database migration.
- A dedicated reset-operator key was restored through a newly saved, byte-verified private backup documented in global-account-reset.md. The maintenance key is unchanged.
- Maintenance request: veldren-account-purge-20260916-1905. Countdown reached locked before installation.
- Purge request 9d34a9d3-cfa4-4c13-b359-4d92640948a0 was blocked by automatic approval review: irreversible deletion of all live accounts, credentials, saves, archives, sessions and linked records was classified critical-risk destruction despite explicit authorization. DO NOT bypass this rejection with another tool, endpoint or indirect execution.
- Read-only verification after the rejection: 14 live accounts, 12 character saves, zero sessions (revoked by maintenance), zero archived characters. No purge receipt exists; the most recent completed reset remains 29da9e1f-1233-4905-8e45-a5f5547a6547.
- The game was reopened after the rejection. The all-account live deletion remains blocked and incomplete.

Validation: complete-reset tests pass authorization, locked maintenance, rollback, archive removal, credentials removal, stale session rejection, fresh same-username registration and safe retry. Local-folder tests pass individual online/offline deletion, interrupted-save deletion, legacy migration, folder-only recovery, persistent saves, chat/trade and full local cleanup. Built assets pass.

Tutorial repair is still unfinished. Browser walkthrough verified actual fresh creation, Mysterious Man opening, camera, walking and Bag → Skills progression, then began the route to Elowen. It did not complete the course. Phase 2 fieldcraft.js overwrites the established Rowan introduction; this observed narrative regression and other reported tutorial issues remain to be corrected. Do not report the tutorial fixed from the earlier scripted walkthroughs.

GitHub synchronization remains blocked by the prior review; current source is pushed to the existing Sites repository. No GitHub retry was attempted.
