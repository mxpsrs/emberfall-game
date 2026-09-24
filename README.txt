VELDREN EDITOR v6.3.2 — DISABLE FORCED TUTORIAL/CHAT IN EDITOR

Replace only:
  dist/editor/editor-runtime.js

Keep all other current editor, renderer and persistence files.

ACTUAL ROOT CAUSE
dist/tutorial-guidance.js is designed to aggressively keep a new player on the
tutorial path. It requeues guidance from:
  - every click
  - every pointer-up
  - movement changes
  - renderUI
  - tutorial state changes

When the guidance key changes it also calls gameMessage(...), injecting the
tutorial instruction into game chat, and creates #tutorialCoach over the game.

That behavior is correct for normal gameplay but wrong inside the world editor.

EDITOR FIX
- VELDREN_EDITOR_MODE is set.
- tutorialGuidanceActive() is disabled while editing.
- queueTutorialGuidance() becomes a no-op.
- renderTutorialGuidance() is replaced with cleanup only.
- Any already-created #tutorialCoach is removed.
- Any tutorial-next-control highlights are removed.
- The exact current tutorial chat-action line is removed if it was inserted
  during startup.
- Chat is forced closed in clean editor mode.
- #chatToggle and #tutorialCoach are explicitly hidden in clean viewport mode.
- Switching back from UI Edit to the clean world editor suppresses guidance
  again.

NORMAL /play GAME
UNCHANGED. This file is only loaded by the editor iframe workflow, so the real
tutorial remains intact for players.
