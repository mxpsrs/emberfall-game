VELDREN WORLD EDITOR v1

Install:
1. Copy the included `editor` folder into your project's `dist` folder.
   Final paths:
   dist/editor/index.html
   dist/editor/editor.css
   dist/editor/editor.js
   dist/editor/editor-runtime.js

2. Start Veldren normally:
   npm.cmd run dev

3. Open:
   http://127.0.0.1:5173/editor/

What works in v1:
- Uses the real running Veldren world inside the editor.
- Click real scenery to select it.
- Drag selected scenery across the real world.
- Edit X / Y(Z), rotation, and scale.
- Duplicate and delete safe scenery objects.
- Camera mode hands controls back to the normal Veldren camera.
- Save persists the edit layer in browser localStorage.
- Reloading /editor/ reapplies saved edits.
- Export JSON downloads the edit layer as veldren-world-edits.json.

Protected in v1:
- Quest NPCs
- Enemies
- Doors/exits
- Service objects
- Buildings

Those are intentionally protected until their integrity rules are implemented.
