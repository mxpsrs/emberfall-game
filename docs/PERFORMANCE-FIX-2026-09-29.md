# Client performance repair

Structures and bridges now use the existing native visibility result before submitting geometry. Previously their independent draw stages bypassed the frame visibility set, including walls across the overworld. Native ownership, collision and persistence are unchanged.

World membership maintains a derived timer candidate list for actors, session objects and explicit expiry fields. Quarter-second timer passes no longer traverse permanent scenery and gatherables; gatherables retain their native lifecycle. Actor relocation and session membership changes refresh this list.

The build embeds the landing page's small stylesheet and scripts and versions image URLs. This removes three dependent asset requests and enables immutable image caching.

Validation: native visibility and fallback behavior; offscreen bridge and structure submission; native membership and timer filtering; offscene respawn, saved loot expiry and temporary fire lifecycle; canonical serialization and reload. The production asset test checks the built landing page and game resources. Browser/iPhone frame rates have not been measured in this environment. No player/account data or server protocol changes are included.
