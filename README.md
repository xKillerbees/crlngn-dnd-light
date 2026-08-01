# Carolingian UI — D&D Light (PF2e)

Keeps [Carolingian UI](https://github.com/crlngn/crlngn-ui)'s combat tracker, scene
navigation and sheet layout, and repaints it in the D&D 5e-style light theme from
[PF2e Dorako UI](https://github.com/Dorako/pf2e-Dorako-UI) — parchment, gold borders,
maroon accents, dark text. Also puts back Pathfinder 2e's item rarity colours, which
Carolingian flattens out.

This is a palette overlay, not a fork. It ships no layout of its own.

## Install

Manual install — this is not on the Foundry package registry.

1. Copy the `crlngn-dnd-light` folder into your Foundry data directory under
   `Data/modules/`, so you end up with `Data/modules/crlngn-dnd-light/module.json`.
2. Restart Foundry, then enable **Carolingian UI — D&D Light (PF2e)** in
   *Manage Modules*.

Requirements:

- **Carolingian UI (`crlngn-ui`) must stay installed and active.** This module only
  redefines its variables; on its own it does nothing.
- **Disable PF2e Dorako UI.** Both modules restyle the same elements and will fight.
  The palette you want is reproduced here. The module warns you if it sees Dorako
  active.

## What it does

**Palette.** Dorako's `dnd5e2` light theme could not simply be copied — it publishes
its colours into its own `--dui-*` / `--color-primary-N` namespace, which Carolingian
never reads. The colours are Dorako's, translated onto Carolingian's variable names:

| | |
|---|---|
| Parchment `#f1ebe8` | window backgrounds |
| Card `#f8f4f1` | raised panels, fieldsets, buttons |
| Gold `#9f9275` | borders, scrollbars, filigree |
| Maroon `#741b2b` | accents, links, underlines, active items |
| Ink `#191813` | text |

D&D's sheet uses two accent hues where Carolingian derives everything from one:
maroon for anything that reads as text or state, gold for anything that reads as an
edge. Splitting them is what makes it look like the 5e sheet rather than a
maroon-tinted Carolingian.

**Rarity colours.** Carolingian's `pf2e-sheets.css` replaces PF2e's rarity and
proficiency colours with desaturated 70%-alpha variants tuned for its dark teal
theme, and pins `--tag-color` to a single flat value sheet-wide. On parchment those
all wash out to roughly the same beige. The system's own values go back:

| | Carolingian UI | restored |
|---|---|---|
| common | `rgba(138,138,138,.7)` | `#323232` |
| uncommon | `rgba(168,112,95,.7)` | `#98513d` |
| rare | `rgba(74,106,148,.7)` | `#002664` |
| unique | `rgba(122,80,144,.7)` | `#54166e` |

Same for the five proficiency ranks. Item names in inventory and spell lists are also
tinted by rarity — common is left alone so ordinary gear keeps the sheet's text
colour. PF2e Workbench's rarity labels are restored too.

Values are read from `foundryvtt/pf2e` `src/styles/_colors.scss`, lines 111-122.

## Settings

All client-scoped, so each player chooses independently.

| Setting | Default | |
|---|---|---|
| Enable D&D Light theme | on | Master switch. Off = plain Carolingian UI. |
| Force light color scheme | on | Sets *your* Foundry colour scheme to light. This is a light theme and Carolingian keys its palette off Foundry's light/dark classes, so dark will look wrong. |
| Restore PF2e rarity colors | on | The rarity and proficiency fix above. |
| Parchment sheets and windows | on | Parchment backgrounds, gold borders, maroon tabs. Off keeps the colours but leaves Carolingian's flat window styling. |

## How it stays on top

Carolingian writes its palette from three places, all of which have to be outranked:

- static presets — `body.crlngn-ui.crlngn-theme-*` (0-2-1)
- a runtime `<style>` its colour picker rebuilds on every settings change, appended
  to `<head>` after every stylesheet — `body.crlngn-ui`, `body.crlngn-ui.game .app`
- PF2e-specific rules as deep as
  `body.crlngn-ui.crlngn-sheets.theme-light .app.pf2e.sheet` (0-6-1)

Because the runtime element is appended last, load order can never be relied on. So
every selector here is anchored to
`html.crlngn-dnd-light body.crlngn-ui.crlngn-dnd-light.crlngn-dnd-light.crlngn-dnd-light`
(0-5-2) instead, which wins on specificity regardless of order. The class is repeated
deliberately — a single occurrence gives 0-3-2 and loses to 0-6-1 on class count, which
in testing left character sheets on Carolingian's lilac secondary colour.

The stylesheets are injected as `<link>` elements from `scripts/`, not declared in
`module.json`. Foundry v13+ assigns manifest-declared styles to a CSS cascade layer,
and unlayered rules beat layered ones *ahead of specificity* — so a manifest-declared
sheet loses every contested rule against Carolingian no matter how specific it is.
Carolingian is unlayered on both counts (`"styles": []` plus a JS-injected `<link>`,
and a runtime `<style>` from its colour picker). Injecting real `<link>`s puts this
module in the same unlayered cascade, where the specificity work above applies.

Only the rarity and proficiency custom properties use `!important`. That is the one
thing this module exists to fix, and Carolingian's PF2e stylesheet is 1718 lines that
change between releases. Everything else relies on specificity alone and stays
overridable from Carolingian's own **Custom CSS** setting.

## Tweaking colours

Source colours are declared once at the top of `styles/theme.css` as `--cdl-*`, then
mapped onto Carolingian's variables below. For a different accent, change
`rgb(116, 27, 43)` (maroon) and `rgb(159, 146, 117)` (gold) throughout that file.

`module.json` declares `hotReload` for `.css`, so edits apply without restarting
Foundry.

## Caveats

- Verified in a browser harness that loads Carolingian's actual stylesheets and
  asserts computed values, including a reproduction of Foundry's cascade-layer
  behaviour. The harness uses a hand-built approximation of the sheet DOM rather than
  real rendered PF2e sheets, so expect some spot-fixing in less common sheet areas.
- Carolingian UI's own colour picker and theme presets are overridden while this
  module is enabled.
- No fonts or textures are shipped. Dorako's `dnd5e2` theme layers two `.webp`
  textures plus the dnd5e system's `parchment.jpg`; none can be relied on in a PF2e
  world. The paper grain here is a pair of low-contrast radial gradients instead.
- Tested against Carolingian UI 4.0.1 (Foundry v13-v14, PF2e 7.x).

## Layout

```
crlngn-dnd-light/
├── module.json
├── scripts/crlngn-dnd-light.js   toggles classes, forces light scheme, settings
├── styles/theme.css              palette translation
├── styles/sheets.css             parchment windows, gold borders, maroon tabs
├── styles/pf2e-rarity.css        rarity + proficiency restoration
└── lang/en.json
```

Carolingian UI is MIT. Dorako UI's colour values are used under its licence; no code
or assets from either module are redistributed here.
