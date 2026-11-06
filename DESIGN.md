---
name: Little World
description: A public observatory for ten minds learning to live in one simulated world.
colors:
  forest-floor: "oklch(20% .025 166)"
  forest-panel: "oklch(24% .026 166)"
  raised-canopy: "oklch(28% .027 166)"
  limestone-ink: "oklch(94% .012 91)"
  sage-muted: "oklch(75% .023 158)"
  contour-line: "oklch(39% .026 164)"
  signal-lime: "oklch(86% .17 126)"
  signal-ink: "oklch(22% .04 159)"
  field-amber: "oklch(78% .13 61)"
  world-grass: "oklch(71% .07 139)"
  agent-marker: "oklch(74% .13 47)"
  forage-marker: "oklch(84% .13 93)"
  timber-marker: "oklch(63% .13 154)"
  berry-marker: "oklch(63% .18 21)"
  mineral-marker: "oklch(73% .025 240)"
typography:
  display:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(39px, 5vw, 78px)"
    fontWeight: 500
    lineHeight: 1.02
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "clamp(35px, 4vw, 55px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Alegreya, Georgia, serif"
    fontSize: "26px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  body:
    fontFamily: "IBM Plex Sans, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  tight: "3px"
  control: "4px"
  panel: "0px"
  pill: "99px"
  dialog: "12px"
spacing:
  compact: "7px"
  regular: "12px"
  generous: "17px"
components:
  button-primary:
    backgroundColor: "{colors.signal-lime}"
    textColor: "{colors.signal-ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.limestone-ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  panel:
    backgroundColor: "{colors.forest-panel}"
    textColor: "{colors.limestone-ink}"
    rounded: "{rounded.panel}"
  filter-chip:
    backgroundColor: "transparent"
    textColor: "{colors.sage-muted}"
    rounded: "{rounded.tight}"
    height: "44px"
---

# Design System: Little World

## Overview

**Creative North Star: "The Field Observatory"**

Little World presents a living simulation as a place to observe, not a conventional admin dashboard. The dark mineral-green frame gives the bright, detailed 3D terrain the visual focus. Editorial serif headlines bring a human point of view; compact sans-serif and mono labels keep changing world facts easy to scan.

The desktop composition gives most of the first view to the world and keeps resident-following and activity beside it. On smaller screens, the world stays first and the observer surfaces move below it. Camera controls remain directly under the scene; simulation controls appear only after the owner signs into the admin panel.

**Key Characteristics:**
- A large live 3D world framed by a quiet dark shell.
- One acid-lime signal color for primary actions and active states.
- Editorial serif headlines paired with practical sans and mono detail.
- Thin contour-like borders and restrained surface layering.

## Colors

The interface uses a mineral-green neutral family, a concentrated lime signal, and a muted amber for the running indicator; the terrain and resource legend keep their own natural colors.

### Primary
- **Signal Lime** (`oklch(86% .17 126)`): Primary buttons, active filters, selected resident state, focus outlines, and the running signal.
- **Signal Ink** (`oklch(22% .04 159)`): Text on lime-filled controls.

### Secondary
- **Field Amber** (`oklch(78% .13 61)`): Paused state marker, distinct from the lime running state.

### Neutral
- **Forest Floor** (`oklch(20% .025 166)`): Page background and the dark backing behind labels over the world.
- **Forest Panel** (`oklch(24% .026 166)`): Main panels and controls dialog.
- **Raised Canopy** (`oklch(28% .027 166)`): Hovered and selected rows, keycaps, and secondary-control hover surface.
- **Limestone Ink** (`oklch(94% .012 91)`): Primary text and icons.
- **Sage Muted** (`oklch(75% .023 158)`): Supporting text and unselected links.
- **Contour Line** (`oklch(39% .026 164)`): Panel borders, dividers, and secondary-control outlines.
- **World Grass** (`oklch(71% .07 139)`): Base color behind the 3D canvas.
- **Resource Markers**: Agent (`oklch(74% .13 47)`), forage (`oklch(84% .13 93)`), timber (`oklch(63% .13 154)`), berries (`oklch(63% .18 21)`), and minerals (`oklch(73% .025 240)`) distinguish the map legend.

### Named Rules
**The Signal Rule.** Reserve lime for actions and active states. Use amber to identify the paused state, while the map uses natural resource colors.

## Typography

**Display Font:** Alegreya (with Georgia, serif fallback)  
**Body Font:** IBM Plex Sans (with sans-serif fallback)  
**Label/Mono Font:** IBM Plex Mono (with monospace fallback)

**Character:** Alegreya gives the world and section titles an observatory journal voice. IBM Plex Sans handles readable interface copy, while IBM Plex Mono marks compact time, day, weather, and status data.

### Hierarchy
- **Display** (500, `clamp(39px, 5vw, 78px)`, `1.02`): Main page title; its emphasized phrase takes the lime accent.
- **Headline** (500, `clamp(35px, 4vw, 55px)`, `1.1`): Field Notes section heading.
- **Title** (500, `26px`, `1.2`): World and panel headings; smaller breakpoint-specific sizes are defined in the stylesheet.
- **Body** (400, `14px`, `1.5`): Default interface copy. Supporting copy steps down to 12–15px where the layout specifies it.
- **Label** (400, `12px`, `1.4`): Compact mono metadata and short state labels; small-screen data labels use the same mono face.

### Named Rules
**The Instrument Rule.** Use mono for measured or changing values; use the serif face for editorial framing and the sans face for instructions and resident details.

## Layout

The desktop page uses a centered content area capped at 1660px, with 32px outer gutters that tighten to 20px below 1100px and 13px on phones. The opening title precedes a two-column world layout: a flexible scene and a 315–350px observer panel, separated by 18px (12px below 1100px). The world canvas is deliberately tall (`min(68vw, 68vh, 710px)`, with a 480px minimum on desktop) so the simulation owns the first view.

At 850px, the scene spans the layout and the observer panel becomes a two-column surface beneath it. At 600px, the observer panel stacks, the canvas is 440px tall, controls form a two-column grid, the field notes become a single column, and touch-specific camera guidance replaces desktop instructions. Spacing clusters around 7–17px within controls and panels, with larger 32–75px section intervals.

## Elevation & Depth

Depth comes mainly from tonal shifts between the page, panel, and raised panel colors, with thin borders separating surfaces. The 3D scene supplies the strongest spatial depth. A single broad shadow lifts the controls dialog over a darkened backdrop; the rest of the interface stays flat.

### Shadow Vocabulary
- **Controls dialog** (`0 28px 80px oklch(5% .01 160 / .55)`): Separates the modal guide from its scrim.

### Named Rules
**The Terrain-First Rule.** Use surface layering to organize the frame; let the world scene provide the prominent depth and detail.

## Shapes

Panels are square-cornered and separated by one-pixel contour borders. Buttons use a restrained 4px radius; filter and keyboard controls use 3px. Status pills and resident-side tags use fully rounded ends. The controls dialog is the only large rounded surface at 12px. The canvas clips the scene and its legend to the panel bounds.

## Components

### Buttons
Controls are compact, direct, and sized for touch. Primary actions use lime fill and dark green text; secondary actions stay transparent with a contour border. Both are at least 44px tall with 16px horizontal padding (9px on phones), 4px corners, and a short hover lift. Keyboard focus uses a 2px lime outline offset by 3px.

### Chips
Resident filters and device tabs are full-width outlined controls with 44px minimum height and 3px corners. The selected option switches to lime fill and dark ink; the unselected option uses muted text and a transparent background.

### Cards / Containers
World and observer panels share the forest-panel fill and contour-line border, with square corners. The world panel uses 17px padding on desktop and 9px on phones; the observer panel uses 21px/20px on desktop and 18px on phones. Cards have no resting shadow.

### Navigation
The header is a 76px-high horizontal row with a serif wordmark, restrained sans links, and a mono live-status pill. It becomes 64px on phones, where section links are hidden and the status remains visible.

### Resident List
Each resident row has a unique initial in a colored circular marker, a name, a current activity, and a side tag. Rows use thin separators; hover and selection share the raised-panel fill, while selection also turns the side tag lime.

### World View
The canvas is the signature surface and occupies the largest area above the fold. A dark, translucent 12px mono label reports scene state; a matching 12px sans-serif legend anchors the resource colors over the terrain. Desktop camera instructions give way to touch gestures at the phone breakpoint.

### Controls Dialog
The guide is on-demand, constrained to the viewport, and shown above a dark scrim. It groups instructions by computer or touch device and uses outlined keycaps for physical controls.

### Admin Access
The public world exposes an **Admin login** action beside camera controls. Its password dialog explains that the Codex CLI on the homelab powers agent decisions. After sign-in, a separate admin surface exposes start, pause, reset, and sign-out actions. The server verifies the password and issues a random, HTTP-only session cookie; the password itself is never stored in the cookie.

## Do's and Don'ts

### Do:
- **Do** let the 3D world occupy the largest area in the first view.
- **Do** use lime for primary actions, active filters, selected states, and focus indication.
- **Do** keep world facts and time labels in the mono face, and keep the resident list directly accessible beside or below the scene.
- **Do** preserve the touch-specific camera guidance and 44px minimum control heights.

### Don't:
- **Don't** use lime as a general surface fill beyond active controls and signals.
- **Don't** place the help dialog over the scene on initial load; it is opened from Controls or the question-mark affordance.
- **Don't** replace the natural resource colors in the map key with the interface accent.
