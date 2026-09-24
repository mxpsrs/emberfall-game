# Icons and equipment interface

The shared interface uses a curated selection of Game-icons.net artwork, with
source SVGs and individual author/source links in `art/ui-icons/manifest.json`.
`npm run icons:build` embeds the selected paths and writes the in-game credits.
The ordinary build also runs this step. No icon font or external runtime download
is required. Canvas maps cache their rasterized symbols rather than replaying
vector paths on every frame.

Each of the 15 skills has its own symbol. Settings is a cog, Woodcutting a tree,
Firemaking a campfire, Fletching a feather, Farming a rake, and Ranged a bow.
Music and sound have separate symbols. Spells use their element plus one through
four tier dots; spirit choices use their corresponding elements. Map tutors use
the symbol for their subject, while the general tutor filter uses a graduation
cap. All 72 shared symbols render consistently in SVG and canvas.

All 194 item definitions retain their physical model in inventory, equipment and
ground loot. The icon camera now faces armour and supplies more clearly. Thin
weapons, shafts and arrows use diagonal framing and a small optical stroke so
they remain visible at inventory size. Bow wood and arrowhead metal distinguish
tiers consistently in inventory, equipped props, projectiles and ground drops.
Food icons use their model and colour; their item names identify raw/cooked state.

Equipment opens a compact paper-doll window beside the usable bag. Its bottom
buttons are Combat stats, Tool belt and Elemental spirits. Combat stats expand
only when that button is selected. Tool belt must not be a main navigation tab.
The ammunition slot keeps its equipped count and existing equip/unequip actions.
Neither equipment view blocks bag clicks. Closing, switching tabs, talking,
changing scenes, and opening a bank clean up both equipment states.

Hover and keyboard focus show labels; skills include XP and spells list their
requirements. Holding menu/skill icons on a phone shows help without activating
them. Item and player/world long presses keep their existing context menus.

Validation: `tests/icon-system.cjs`, `tests/icon-tooltips.cjs`,
`tests/item-models.cjs`, `tests/equipment-interface.cjs`, `tests/classic-ui.cjs`,
`tests/map-services.cjs`, `tests/item-input.cjs`, `tests/ranged-overhaul.cjs`,
`tests/trading.cjs`, `tests/social-ui.cjs`, `tests/play-display.cjs` and the built
asset checks. `node scripts/review-icons.cjs OUTPUT_DIRECTORY` produces offline
contact sheets for the interface, all spells and every item at 48 and 25 pixels.

Publishing still follows the two-minute maintenance procedure in `AGENTS.md`.
