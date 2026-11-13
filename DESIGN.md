---
name: Marées noires
description: A turn-based strategy game about four cults on a sinking archipelago; the interface is a quiet night alcove around a lit island.
colors:
  lantern-amber: "#e8a33d"
  lantern-amber-hi: "#f2b75c"
  on-amber: "#171007"
  night-ground: "#03090b"
  fog-rail: "rgba(10, 20, 22, 0.88)"
  hud-surface: "rgba(10, 20, 22, 0.9)"
  field-well: "rgba(7, 15, 17, 0.7)"
  deep-veil: "rgba(3, 9, 11, 0.96)"
  plaster-ink: "#e7e2d6"
  ash: "#b8b09f"
  faint-ink: "rgba(231, 226, 214, 0.38)"
  hairline: "rgba(231, 226, 214, 0.22)"
  hairline-strong: "rgba(231, 226, 214, 0.55)"
  vigil-green: "#8fc9a0"
  tide-pale: "#9fc3c9"
  wound: "#e58c7a"
  cult-lanterne: "#e8a33d"
  cult-recif: "#7fd1b9"
  cult-sang: "#d9604f"
  cult-veilleurs: "#a99bef"
  branch-mer: "#6f9fb8"
  branch-recoltes: "#c9b98a"
  branch-guerre: "#a8664a"
  branch-lumiere: "#e2d3a3"
  branch-foi: "#93a77f"
typography:
  display:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "clamp(64px, 6.6vw, 96px)"
    fontWeight: 400
    lineHeight: 1
    letterSpacing: "0.005em"
  headline:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "clamp(44px, 4.2vw, 60px)"
    fontWeight: 400
    lineHeight: 1.05
  title:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "21px"
    fontWeight: 400
    lineHeight: 1.15
  numeral:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "22px"
    fontWeight: 400
    fontFeature: "tnum"
  lede:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 300
    lineHeight: 1.7
    letterSpacing: "0.02em"
  body:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 300
    lineHeight: 1.6
  control:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.28em"
  label:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.26em"
  hud-headline:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 1.05
  hud-counter:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "34px"
    fontWeight: 400
    lineHeight: 1
    fontFeature: "tnum"
  hud-title:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "28px"
    fontWeight: 400
    lineHeight: 1.1
  hud-name:
    fontFamily: "Bellefair, 'Times New Roman', serif"
    fontSize: "17px"
    fontWeight: 400
  hud-body:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 300
    lineHeight: 1.55
  hud-note:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  hud-button:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "0.22em"
  hud-label:
    fontFamily: "Jost, 'Helvetica Neue', Arial, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.24em"
rounded:
  none: "0px"
  dot: "50%"
spacing:
  hud-gap: "8px"
  tight: "12px"
  base: "16px"
  field: "28px"
  group: "32px"
  breath: "44px"
components:
  button-primary:
    backgroundColor: "{colors.lantern-amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0 30px"
    height: "58px"
  button-primary-hover:
    backgroundColor: "{colors.lantern-amber-hi}"
    textColor: "{colors.on-amber}"
  button-ghost:
    backgroundColor: "rgba(3, 9, 11, 0.35)"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.control}"
    rounded: "{rounded.none}"
    padding: "0 30px"
    height: "58px"
  button-ghost-hover:
    backgroundColor: "rgba(231, 226, 214, 0.06)"
    textColor: "{colors.plaster-ink}"
  nav-item:
    textColor: "{colors.ash}"
    padding: "14px 0 14px 26px"
  nav-item-active:
    textColor: "{colors.plaster-ink}"
  cult-card:
    backgroundColor: "{colors.field-well}"
    textColor: "{colors.plaster-ink}"
    rounded: "{rounded.none}"
    padding: "16px 18px"
  segment:
    backgroundColor: "{colors.field-well}"
    textColor: "{colors.ash}"
    rounded: "{rounded.none}"
    height: "48px"
  segment-selected:
    backgroundColor: "rgba(232, 163, 61, 0.08)"
    textColor: "{colors.lantern-amber}"
  checkbox:
    rounded: "{rounded.none}"
    size: "16px"
  checkbox-checked:
    backgroundColor: "{colors.lantern-amber}"
    textColor: "{colors.on-amber}"
  end-card:
    backgroundColor: "{colors.fog-rail}"
    textColor: "{colors.plaster-ink}"
    rounded: "{rounded.none}"
    padding: "48px 44px 44px"
    width: "min(520px, 100%)"
  key-cap:
    textColor: "{colors.plaster-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "4px 8px"
  hud-button:
    backgroundColor: "{colors.field-well}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-button}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  hud-button-hover:
    backgroundColor: "rgba(231, 226, 214, 0.06)"
    textColor: "{colors.plaster-ink}"
  hud-button-accent:
    backgroundColor: "{colors.lantern-amber}"
    textColor: "{colors.on-amber}"
    typography: "{typography.hud-button}"
    rounded: "{rounded.none}"
    padding: "0 20px"
    height: "44px"
  hud-button-accent-hover:
    backgroundColor: "{colors.lantern-amber-hi}"
    textColor: "{colors.on-amber}"
  icon-tile:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    rounded: "{rounded.none}"
    size: "56px"
  icon-tile-end-turn:
    backgroundColor: "{colors.lantern-amber}"
    textColor: "{colors.on-amber}"
    rounded: "{rounded.none}"
    size: "76px"
  icon-tile-caption:
    textColor: "{colors.ash}"
    typography: "{typography.hud-label}"
  corner-card:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    rounded: "{rounded.none}"
  cult-registry:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    rounded: "{rounded.none}"
    padding: "14px 18px"
    width: "252px"
  selection-panel:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-body}"
    rounded: "{rounded.none}"
    padding: "20px 22px 22px"
    width: "360px"
  recruit-tile:
    backgroundColor: "{colors.field-well}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-name}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
    height: "58px"
  recruit-tile-disabled:
    textColor: "{colors.faint-ink}"
  unit-plate:
    textColor: "{colors.on-amber}"
    typography: "{typography.hud-note}"
    rounded: "{rounded.none}"
    padding: "0 5px"
    height: "20px"
  unit-plate-low:
    backgroundColor: "{colors.wound}"
    textColor: "{colors.on-amber}"
  unit-plate-spent:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.ash}"
  city-label:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    rounded: "{rounded.none}"
    height: "20px"
  toast:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-body}"
    rounded: "{rounded.none}"
    padding: "12px 18px"
  tooltip:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-note}"
    rounded: "{rounded.none}"
    padding: "10px 14px"
  banner:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-body}"
    rounded: "{rounded.none}"
    padding: "10px 20px 10px 12px"
  tech-node:
    backgroundColor: "{colors.night-ground}"
    rounded: "{rounded.dot}"
    size: "54px"
  tech-price:
    backgroundColor: "{colors.night-ground}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-label}"
    rounded: "{rounded.none}"
    height: "18px"
    padding: "0 5px"
  tech-card:
    backgroundColor: "{colors.hud-surface}"
    textColor: "{colors.plaster-ink}"
    typography: "{typography.hud-body}"
    rounded: "{rounded.none}"
    padding: "26px"
    width: "330px"
  close-button:
    textColor: "{colors.plaster-ink}"
    rounded: "{rounded.none}"
    size: "44px"
---

# Design System: Marées noires

<!-- Scope: this system covers the whole UI. Start menu and end screen (index.html #startScreen, #endScreen) are styled by src/ui/menu.css at Experience density; the in-game HUD (index.html #hud, #panel, #tooltip, #toasts, #banner, #techModal) is styled by src/style.css and src/ui/hud.js at Operate density. Both load only Bellefair and Jost, self-hosted from public/fonts via @font-face. Cult sigils come from src/ui/sigil.js, always with the hairline variant (line: true); the older filled, haloed variant still exists in that file but no UI calls it. The 3D scenes (src/three/*) follow the approved art direction "Lanterne & Brume" and are not UI tokens, except the HTML overlay they position (unit plates, city labels, floating numbers), which is documented here. -->

## Overview

**Creative North Star: "The Alcove Around the Lighthouse"**

Ikebana restraint transposed to a night sea. The lit island and its lighthouse in the live 3D scene are the one branch of the arrangement; the interface is the quiet alcove around it, and emptiness does the work. Everything the UI adds is a hairline, a spaced capital, or a large, light serif word set on fog; nothing glows, nothing is rounded except where the world itself draws a circle, nothing is stacked into a column of heavy buttons.

Density follows the surface. The menu is low and deliberate: a full-height fog rail on the left, a main column with one display title, one sentence of lede and a short row of actions, and the right third left to the island. In play, the same alcove becomes four quiet corners around the map: identity and oil top left, turn and tide top right with the cult registry beneath, minimap and two square action tiles bottom right, and the selection panel rising bottom left. The map stays open in the middle. Dread comes from darkness, silence and precision, not ornament.

Warm color is meaningful. Lantern amber marks the action you are invited to take; each cult's own light colors its sigil, its name in the registry, its swatches and its plates. The five branches of forbidden knowledge have their own muted, earthy lights that never repeat a cult color or amber. Everything else is plaster-colored ink and ash on near-black fog.

**Key Characteristics:**
- Near-black fog surfaces, translucent over the live 3D scene in both menu and play.
- Bellefair for words that name things and for counted numbers; Jost in letter-spaced capitals for everything you press or read as a label.
- Square-cornered hairline controls and cards; amber fills only the action being offered.
- No shadows and no glows; the single exception is the legibility shadow under floating combat numbers.
- Arrows, chevrons, ticks, oil drops and sigils are drawn (SVG or CSS mask), never typed.
- Slow, settling motion on one long-tailed ease.

## Colors

A dark, desaturated night palette where the only warmth is a lantern and the cults' own lights.

### Primary
- **Lantern Amber** (lantern-amber): the filled primary button, the end-turn tile, the learn button in the tech card, the in-panel capture action, the checked checkbox, the selected segment's stroke and text, the ripple around the end-turn tile, the drawn oil drop, and text selection. Hover lifts to **Lantern Amber High** (lantern-amber-hi). Text and marks on amber are **Tar Ink** (on-amber), a near-black brown; the oil drop inside an amber button turns Tar Ink too.

### Secondary
- **Branch Lights** (branch-mer, branch-recoltes, branch-guerre, branch-lumiere, branch-foi): one muted light per branch of the tech tree (sea slate blue, harvest straw, war rust, light parchment, faith sage). They color a learned node's fill, an available node's ring and icon, the links between learned nodes, and the tech card's badge frame and meta line. They exist only inside the tech tree.

### Tertiary
- **Cult Lights** (cult-lanterne, cult-recif, cult-sang, cult-veilleurs): each cult's own color, applied to its hairline sigil, its selected card in the menu, its name and city pips in the registry, the 8px owner swatch in the selection panel, population pips, unit plates, city level squares, the selected city label's frame, and the 6px swatch on toasts about that cult. These are game identity, not a decorative palette. The player's cult color is set at runtime as the HUD accent.

### Neutral
- **Night Ground** (night-ground): the base under the 3D canvas, every reading veil, the fill of tech nodes and price tags, the tide gauge well.
- **Fog Rail** (fog-rail): the translucent surface of the menu rail and the end-screen card.
- **HUD Surface** (hud-surface): the same fog at 90%, the surface of every in-game card, the panel, tooltips, toasts, banner, city labels and resting icon tiles.
- **Field Well** (field-well): the darker translucent fill inside choice controls (cult cards, segments, recruit tiles, HUD buttons).
- **Deep Veil** (deep-veil): the near-opaque night that covers the map while the tech tree is open.
- **Plaster Ink** (plaster-ink): primary text, active nav items, the nav dot, focus outlines, counted numbers, oil totals and recruit costs.
- **Ash** (ash): secondary text, labels, captions, inactive nav items, metadata.
- **Faint Ink** (faint-ink): locked tech labels and icons, disabled recruit names, empty registry notes (38% plaster ink).
- **Hairline** (hairline): every divider, resting card and control border, unlit tech links, empty bar tracks (22% plaster ink).
- **Strong Hairline** (hairline-strong): ghost and HUD button borders, icon tile frames, tooltip and close-button frames, price tags, short rules under headings, checkbox frames, key caps (55% plaster ink).
- **Vigil Green** (vigil-green): the health bar fill and the "+income" figure next to oil.
- **Tide Pale** (tide-pale): the rising sea as a status: the tide gauge's water gradient, the tide stage figure, and warnings that a tile is sinking. A cold pale blue-green kept clear of the Récif light.
- **Wound** (wound): low health and damage: the low-health unit plate (with Tar Ink text) and the damage figure in the tooltip. A soft coral kept clear of the Sang light.
- Status colors (Vigil Green, Tide Pale, Wound) mark a state on text, bars or plates; never a fill for cards or surfaces.

### Named Rules
**The One Lantern Rule.** Amber fills only an action being offered: the primary button, the end-turn tile, the learn button, the capture action, and checked or selected marks. Oil numerals and recruit costs stay ink; the only resting amber that is not an action is the small drawn oil drop. If amber is on something that cannot be pressed or chosen, remove it.

**The Cult Light Rule.** A cult color appears only where that cult is being identified: its sigil, its name, its swatch, its plates and pips. Never as a section color, a status color or ornament; status has its own colors (Vigil Green, Tide Pale, Wound).

**The Separate Branches Rule.** Tech branches never borrow a cult color or amber; a lit link or node reads as knowledge, not as a cult.

## Typography

**Display Font:** Bellefair (with 'Times New Roman', serif), self-hosted at public/fonts/bellefair-latin.woff2 via @font-face, weight 400 only.
**Body and Label Font:** Jost (with 'Helvetica Neue', Arial, sans-serif), self-hosted variable at public/fonts/jost-latin.woff2 via @font-face, weights 300 to 500.

**Character:** A light, airy, high-contrast serif that names and counts, against a geometric sans that whispers in tracked capitals. Elegant and calm, never gothic.

### Hierarchy (menu, Experience density)
- **Display** (Bellefair 400, clamp(64px, 6.6vw, 96px), line-height 1): the game title on the home view only, broken over two lines. Settles from 0.12em tracking to its rest tracking on load. 54px under 980px.
- **Headline** (Bellefair 400, clamp(44px, 4.2vw, 60px), line-height 1.05): panel and end-screen titles, always followed by a 40px strong hairline 22px below.
- **Title** (Bellefair 400, 21px, line-height 1.15 to 1.2): cult names on cards, the tide note in the rail.
- **Numeral** (Bellefair 400, 22px, tabular figures): scores, right-aligned.
- **Lede** (Jost 300, 18px, line-height 1.7, 0.02em): the one sentence under the title, max 27em.
- **Body** (Jost 300, 16px, line-height 1.6): panel intros (in ash) and rule definitions (in ink). Smaller steps of 15px and 13px carry option text, cult mottos and key hints.
- **Control** (Jost 500, 13px, 0.28em, uppercase): button text. Nav items and segments use the same 13px at weight 400 and 0.24em / 0.2em tracking.
- **Label** (Jost 500, 11px, 0.24 to 0.26em, uppercase, ash): field legends and rule terms, each sitting on a hairline.

### Hierarchy (HUD, Operate density)
The same two voices, one step tighter. Jost runs on four sizes (11, 12, 13, 14px); Bellefair carries names and counted numbers.
- **HUD Headline** (Bellefair 400, 40px, line-height 1.05): the tech tree title, followed by the 40px strong hairline.
- **HUD Counter** (Bellefair 400, 34px, line-height 1, tabular figures): the oil total and the turn number in the top corners; 26px under 860px.
- **HUD Title** (Bellefair 400, 28px, line-height 1.1): the selection panel title and the tech card title, each followed by the 40px strong hairline 14px below.
- **Numerals in Operate** (Bellefair 400, tabular figures): 22px in the stats grid (the Numeral token) and on floating combat numbers, 20px for registry scores.
- **HUD Name** (Bellefair 400, 17px): recruit names. City names on the map use 15px, tech lore lines 16px in ash.
- **HUD Body** (Jost 300, 14px, line-height 1.55 to 1.6): panel paragraphs, tech descriptions, toasts and the banner; registry cult names use 14px at 400.
- **HUD Note** (Jost 13px, 300 to 500): notes and warnings under the panel, tooltip body, tech count, recruit costs (500, ink), the income figure.
- **HUD Button** (Jost 500, 12px, 0.22em, uppercase): HUD button text; 13px on the large variant. Unit plates and recruit sub-lines also sit at 12px.
- **HUD Label** (Jost 500, 11px, 0.12 to 0.24em, uppercase, ash): the faction name, stat captions, tide line, registry tab, panel section heads, owner line, tile captions, tooltip header, tech card meta, branch names, price tags. Tech node labels use 11px at 400 in sentence case.

### Named Rules
**The Two Voices Rule.** Bellefair names and counts; Jost instructs. Anything clickable or any label is Jost in spaced capitals; Bellefair is never uppercase-tracked, and Jost never sets a title or a counted total.

**The Light Weight Rule.** Bellefair stays at 400 and Jost reading text at 300. Weight 500 is reserved for button text, labels, costs and inline bold names.

## Layout

**Menu.** A fixed two-zone composition over a full-bleed 3D canvas. On desktop, a 264px rail spans the full height at the left (padding 44px 36px 36px): logotype at the top, vertical nav 88px below (48px when the viewport is under 760px tall), and a foot block pushed down with auto margin and separated by a hairline. The stage begins at 264px; views sit at left clamp(48px, 6.5vw, 120px). The home view is vertically centered with width min(520px, 38vw); panels run top to bottom, scroll internally with a thin ash scrollbar, and are capped at min(600px, 66vw minus the rail and inset) so they always end before the island. Spacing rhythm: 12px between grid tiles, 16px between actions, 28px between fields, 32px between paired fields and before panel actions, 44px before home actions. Under 980px wide, the rail collapses into a 64px top bar, the home view anchors to the bottom, buttons go full width, grids become single column and the reading veil turns bottom-up.

**HUD.** Four corners, each 16px from the viewport edge, around an open map. Top left: an identity card (40px hairline sigil, faction label, oil counter with a drawn drop and income). Top right: a 252px card with the turn counter and the tide gauge; the 252px cult registry hangs beneath it. Bottom right: the 220 by 132px minimap (its view frame drawn in Plaster Ink) and the two icon tiles (56px Savoirs, 76px Fin du tour), 16 to 18px apart. Bottom left: the 360px selection panel, capped at the viewport height minus 120px, scrolling with a thin hairline scrollbar. Toasts stack bottom-center (min(460px, 60vw), 8px apart); the turn banner sits top-center; the tooltip follows the pointer 16px down and right. The tech tree is a full-screen layer: title top left at 36px, close square top right at 28px, radial constellation centered on the player's sigil with dotted hairline rings, and the 330px tech card docked right. Inner rhythm is 8px between buttons and tiles, 12 to 14px between panel blocks, 20px before a hairline section head.

Under 860px wide the corners pull to 8px; the sigil, faction label, registry and minimap disappear; the panel spans the width above the action tiles (max 40vh); toasts move to the top; node labels hide and the tech card docks to the bottom.

## Elevation & Depth

Flat. There are no box shadows anywhere in the system. Depth comes from translucency and veils: the rail, HUD cards and panels are translucent fog over the live scene, and a horizontal Night Ground gradient keeps the menu's text column legible (a denser veil fades in over 0.6s when a panel opens). The tech tree replaces the map with the 96% Deep Veil rather than lifting a dialog above it.

### Shadow Vocabulary
- **Floating number legibility** (`text-shadow: 0 1px 6px rgba(0, 0, 0, 0.85)`): only on the Bellefair numbers that float up from units in world space. They sit directly on the moving 3D scene with no surface behind them, so the soft dark halo is what keeps them readable. It is a legibility device, not elevation.

### Named Rules
**The No Shadow Rule.** Nothing casts a shadow and nothing glows. Separation is a 1px hairline or a change of translucent fill. The one named exception is the floating-number text shadow above; no card, control or label may use it.

## Shapes

Square corners on every control and container: buttons, icon tiles, cards, panel, segments, checkboxes, recruit tiles, toasts, tooltips, plates, price tags, key caps, the close square (0px). Borders are 1px. Round forms appear only where the world draws a circle: the 6px nav dot, the circle framing each cult sigil, and the tech nodes, which are hairline circles in the same family as the sigils. Bars are 3px: health, population pips, registry city pips, city label pips. Swatches are small squares: 8px owner, 6px toast. Short rules repeat as a signature: 40px strong hairlines under headlines and HUD titles, hairline section heads in the panel and registry. Arrows (1.2px, 26 by 12, scaled to 18 by 9 in the tooltip), the registry chevron (1.2px) and tech links (1.2px) are drawn strokes, never glyphs.

### Named Rules
**The Hairline Rule.** Every edge is a 1px line at 22% or 55% plaster ink; selection changes the line's color (amber or a cult or branch light), not its weight. The only heavier rings are drawn marks: sigil strokes (1.2 to 1.5px) and the 1.5px ring of an available tech node.

## Components

### Buttons
Rectangular, tracked, and few; amber is the one being offered.
- **Shape:** square corners (0px). Menu buttons are 58px tall with 0 30px padding and an 18px gap before the arrow; HUD buttons are 44px tall with 0 20px padding (54px and 0 28px on the large variant, 50px in the tech card).
- **Primary:** Lantern Amber fill and border, Tar Ink text. Menu: one per view. HUD: the capture action in the panel and the learn button in the tech card.
- **Ghost / HUD default:** Night Ground at 35% (menu) or Field Well (HUD), Strong Hairline border, Plaster Ink text. Hover brightens the border to full ink and adds a 6% ink wash.
- **States:** 0.3s color transitions on the shared ease; menu arrows slide 5px; active nudges down 1px; disabled drops to 40% opacity; focus-visible draws a 1px ink outline 4px out.
- **Text link (narrow menu only):** Jost 12px spaced capitals in ash, underlined with a strong hairline 6px below.

### Icon Tiles
Square tiles with a drawn icon and a caption beneath, the HUD's standing actions.
- **Shape:** 56px square (76px for Fin du tour), HUD Surface fill, Strong Hairline frame, a 1.4 to 1.6px stroked SVG icon in ink. The caption below is HUD Label in ash, turning ink on hover.
- **End turn:** the only tile filled amber, with a Tar Ink tick. When the turn is ready to end, a 1px amber ring ripples out from it (2.2s, inset -1px to -14px, fading out).
- **States:** hover takes the frame to full ink (amber-hi on the end tile); active nudges 1px; disabled 40%.

### Cards / Containers
- **Corner card:** HUD Surface with a Hairline frame, square, no shadow. The identity card pairs the sigil with a faction label and the oil counter; the turn card stacks the counter over the tide gauge.
- **Tide gauge:** a 220 by 34px SVG stretched to the card width (preserveAspectRatio none), Night Ground well, Hairline frame, a wave filled with a vertical Tide Pale gradient (75% to 15%) that clips from the left as the tide approaches; the label above reads in HUD Label with the stage figure in Tide Pale bold. When the tide is about to rise, the figure turns ink with a Tide Pale underline 4px below; it never turns amber.
- **Cult registry:** a 252px card under the turn card. Its tab is a full-width HUD Label button with a drawn 10 by 6px chevron that rotates -90° when folded (0.3s). Rows are separated by hairlines: cult name in its own color, score in Bellefair 20px, then one 16 by 3px pip per city in the cult color. Extinct cults drop to 40%.
- **Cult card (menu):** square, Field Well, Hairline frame, 40px hairline sigil beside the name (Title) and motto. Hover strengthens the frame; selected takes the cult color as frame and a 9% tint.
- **End card (menu):** Fog Rail, Hairline frame, 48px 44px 44px padding, width min(520px, 100%), centered on an 86% Night Ground overlay; a Headline, an intro, a hairline-ruled score table with hairline sigils, one primary button.

### Selection Panel
The bottom-left card that explains whatever is selected.
- **Structure:** HUD Title with its 40px rule and an optional HUD Label subtitle beneath; an owner line (8px square swatch in the owner's cult color, Faint Ink when unowned, then the name in HUD Label ink); HUD Body paragraphs; flavor in ash; notes in HUD Note, sinking warnings in Tide Pale.
- **Bars:** 3px tracks in Hairline: health filled with Vigil Green, population as a row of 3px segments lit in the owner's color.
- **Stats grid:** four equal cells in a Hairline frame divided by hairlines, each a 22px Bellefair number in ink over an 11px label at 0.12em in ash.
- **Recruit tiles:** a two-column grid, 8px gap. Each tile is Field Well with a Hairline frame, 58px minimum: Bellefair 17px name with the cost (Jost 13px 500 in ink plus the drawn drop) on the right, a 12px ash sub-line below. Hover strengthens the frame and adds a 5% ink wash. Disabled keeps the tile in place with a 10% frame, the name in Faint Ink and the cost at 40%.
- **Section heads:** HUD Label in ash on a hairline 20px above.
- **Motion:** rises 8px and fades in over 0.45s.

### Map Overlay
HTML labels positioned over the 3D scene.
- **Unit plate:** a 20px tall square plate in the owner's cult color with the hit points in Jost 12px 500 Tar Ink. Low health switches the fill to Wound, text staying Tar Ink. A spent unit reads as HUD Surface with a hairline and ash text.
- **City label:** a HUD Surface strip with a Hairline frame: a 20px level square in the owner's color (Tar Ink figure), then the city name in Bellefair 15px. Neutral cities show the name only, in ash. A selected city's frame takes the owner color. Beneath, 10 by 3px population pips.
- **Floating numbers:** Bellefair 22px in the event color, rising from the unit, with the one permitted text shadow.

### Toasts, Tooltip, Banner
- **Toast:** HUD Surface, Hairline frame, 12px 18px, HUD Body; a 6px square swatch leads, in the color of the cult concerned (the player's by default). Enters with a 10px rise over 0.45s, leaves with a 6px drop and fade.
- **Tooltip:** HUD Surface with a Strong Hairline frame, 10px 14px, offset 16px from the pointer. A HUD Label header names attacker and target joined by a drawn 18 by 9px arrow; the body is HUD Note, with the damage figure in Wound.
- **Banner:** top-center HUD Surface strip announcing whose turn runs, led by a 26px hairline sigil, HUD Body at 300; rises in over 0.45s.

### Tech Tree (Savoirs interdits)
A night constellation of forbidden knowledge.
- **Layer:** the Deep Veil over the whole screen, fading in over 0.4s; HUD Headline top left with its rule and a HUD Note count in ash; a 44px square close button with a Strong Hairline frame and a drawn 1.4px cross.
- **Nodes:** 54px hairline circles on Night Ground, each holding a 24px stroked icon. Locked: Hairline ring, icon and label in Faint Ink. Available: 1.5px ring and icon in the branch light. Learned: filled with the branch light, icon in Night Ground. Selected: a 1px ink outline 5px out. Labels sit 36px below in Jost 11px.
- **Price tag:** an outlined square tag at the node's upper right, Night Ground with a Strong Hairline frame, Jost 11px 500 in ink; hidden once learned or while locked.
- **Links:** 1.2px lines, Hairline when unlit, branch light once the target is learned; concentric dotted rings at 8% ink mark the tiers.
- **Tech card:** 330px, HUD Surface, Hairline frame, 26px padding, 16px gaps. A 64px square badge framed in the branch light holds the icon; then the HUD Title with the meta line (branch and rank, HUD Label in the branch light) set below the title, the 40px rule, the description in HUD Body, an optional lore line in Bellefair 16px ash above a hairline, and the learn button (amber only when it can be learned).

### Navigation (menu)
- **Rail nav:** vertical list of Jost 13px items at 0.24em in ash, 14px vertical padding and a 26px left indent. Hover and the active item turn to ink.
- **The gliding dot:** a single 6px ink dot glides (0.45s) to whichever item is hovered or focused, returning to the active item when the pointer leaves. Panels cross-fade in place.

### Inputs / Fields (menu)
- **Checkbox:** a 16px square with a Strong Hairline frame stands in for the hidden native input. Checked fills amber with a drawn Tar Ink tick.
- **Segments:** a row of 48px Field Well cells with Hairline frames overlapping by 1px; selected takes an amber frame, amber text and an 8% amber wash.
- **Field legend:** Label type on a full-width hairline.
- **Focus:** the 1px ink outline at 4px offset everywhere.

### Hairline Sigil (signature)
Each cult's mark drawn as a thin stroke: a 1.2px circle and a 1.5px mark, both in the cult color, no tinted disc and no filled shapes. Used at 40px on cult cards and in the HUD identity card, 28px in the score table, 26px in the turn banner and 60px at the center of the tech tree. The filled, haloed variant remains in the sigil module but is not used by any interface and is not part of the system.

### Oil Drop
The resource mark, drawn as an 8 by 11px drop through a CSS mask so it takes any fill: amber at rest beside ink numerals and costs, Tar Ink inside an amber button.

### Key Caps (menu)
Square 1px Strong Hairline frames around Label-type key names (4px 8px), in ink, followed by the action in 13px ash.

## Do's and Don'ts

### Do:
- **Do** keep amber for the action being offered: one primary per menu view, and in play only the end-turn tile, the capture action and the learn button; every other action is a hairline button.
- **Do** set counted numbers (oil, turn, scores, stats, damage) in Bellefair with tabular figures, in ink, and every control or label in Jost spaced capitals (0.2 to 0.28em).
- **Do** draw every edge as a 1px hairline (22% or 55% plaster ink) and keep corners square; let circles appear only as sigils, the nav dot and tech nodes.
- **Do** draw arrows, chevrons, ticks, icons, drops and sigils as thin strokes or masks in currentColor, a cult light or a branch light.
- **Do** identify a cult with its light and a small square (8px owner swatch, 6px toast swatch, 3px pips), never with a colored surface.
- **Do** keep the HUD in the four corners at 16px and leave the middle of the map open.
- **Do** move on the shared ease cubic-bezier(0.16, 1, 0.3, 1): 0.3s for color, 0.45s for the nav dot and HUD rises, 0.6 to 0.8s for menu entrances, and honor reduced motion by removing all of it.

### Don't:
- **Don't** use rounded, filled button stacks, gothic display faces, or glowing ornament; the user rejected all three.
- **Don't** add box shadows or glows to any surface or control; the floating-number text shadow is the only exception and stays on world-space numbers.
- **Don't** color oil totals, costs or other figures amber; only the drawn drop carries the lantern.
- **Don't** let a tech branch or a status (tide, wound, health) reuse a cult color or amber.
- **Don't** use amber or a cult color as decoration, section color or background fill beyond the documented 5 to 9% washes.
- **Don't** type arrows or icons as text glyphs or icon fonts.
- **Don't** place UI over the right third of the menu home view, where the island and lighthouse live.
