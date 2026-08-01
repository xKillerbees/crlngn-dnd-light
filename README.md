# Dorako UI + Carolingian Bridge (PF2e)

Runs [PF2e Dorako UI](https://github.com/Dorako/pf2e-Dorako-UI)'s D&D light theme as the
primary look, while keeping [Carolingian UI](https://github.com/crlngn/crlngn-ui)'s scene
navigation and combat carousel.

The two modules normally fight, because both restyle the same elements. This one splits
the work between them and repaints the seam.

## Who does what

| | |
|---|---|
| **Dorako UI** | Windows, character sheets, chat, tooltips, dialogs — its own `dnd5e2-light` theme |
| **Carolingian UI** | Scene navigation, combat carousel, players list. Its theming is switched off, its layout kept |
| **This module** | Repaints Carolingian's leftover chrome in Dorako's palette, and configures both so they stop overlapping |

Carolingian replaces the scene nav and combat tracker DOM wholesale, so Dorako's selectors
never match them — they'd otherwise stay in Carolingian's own accent colour while
everything around them went parchment. That seam is the only thing this module styles.

## Install

Foundry → *Add-on Modules* → *Install Module* → **Manifest URL**:

```
https://raw.githubusercontent.com/xKillerbees/crlngn-dnd-light/refs/heads/main/module.json
```

Requires **both** `crlngn-ui` and `pf2e-dorako-ui` installed and active. Unlike v1.x, Dorako
should now be **enabled** — it is the primary theme.

On first launch it offers to apply the recommended setup. You can re-run it any time from
*Configure Settings → Dorako UI + Carolingian Bridge → Apply recommended setup*.

## What the setup changes

| module | setting | to | why |
|---|---|---|---|
| crlngn-ui | `v2-apply-theme-and-styles` | off | Dorako themes sheets |
| crlngn-ui | `v2-enable-chat-styles` | off | Dorako themes chat |
| crlngn-ui | `v2-enable-journal-styles` | off | Dorako themes journals |
| crlngn-ui | `v2-adjust-other-modules` | off | Dorako handles module support |
| pf2e-dorako-ui | `theme.application-theme` | `dnd5e2-light` | |
| pf2e-dorako-ui | `theme.interface-theme` | `dnd5e2-light` | |
| pf2e-dorako-ui | `theme.chat-message-standard-theme` | `dnd5e2-light` | |

Carolingian's combat tracker and scene navigation settings are deliberately untouched —
those are the features being kept. Each write is attempted independently, so a
world-scoped setting refused for a non-GM, or a key renamed upstream, won't take the rest
down with it; the result reports what changed and what didn't.

**Item rarity colours are fixed by this setup, not by CSS.** Carolingian's rarity
overrides live inside `body.crlngn-ui.crlngn-sheets`, so turning off its sheet styling
drops the class and Pathfinder 2e's own colours return — uncommon `#98513d`, rare
`#002664`, unique `#54166e`. Verified: with the class removed the overrides don't just
change, they stop applying entirely.

## Notes for anyone editing this

Two non-obvious things, both found the hard way.

**Styles are injected as `<link>`s from `scripts/`, not declared in `module.json`.**
Foundry v13+ assigns manifest-declared styles to a CSS cascade layer, and unlayered rules
beat layered ones *ahead of specificity*. Carolingian is unlayered on both counts — its
manifest ships `"styles": []` and it appends its own `<link>` from JS, plus a runtime
`<style>` from its colour picker. A manifest-declared stylesheet therefore loses every
contested rule no matter how specific it is, which is exactly how v1.0.x failed: only
`!important` rules and uncontested ones survived.

**The palette is aliased on `<html>`, not `<body>`.** Carolingian reassigns several of
Dorako's variables to its own accent inside `body.crlngn-ui`, including
`--dnd5e-color-maroon: var(--color-highlights)`. Sourcing the palette on `<body>` creates
a cycle — `--cdl-maroon` → `--dnd5e-color-maroon` → `--color-highlights` → `--cdl-maroon` —
and CSS resolves cycles by invalidating every property involved. The whole maroon family
silently computed to nothing while gold worked, because Carolingian doesn't touch gold. On
`<html>` the Dorako values are still pristine.

Colours are read from Dorako's variables (`var(--dnd5e-color-gold)` etc.), which it
declares at `:root` unconditionally, with hardcoded fallbacks so nothing collapses if
Dorako is absent or renames one.

The repeated `.crlngn-dnd-light` in selectors is deliberate: it lifts the anchor to 0-5-2
so specificity decides rather than load order, since Carolingian's runtime `<style>` is
appended after everything else. A single occurrence loses.

## Settings

| setting | default | |
|---|---|---|
| Enable bridge theme | on | Master switch. Off = Carolingian's nav and tracker revert to their own colours. Dorako unaffected. |
| Force light color scheme | on | Sets *your* Foundry colour scheme to light to match `dnd5e2-light`. Client-scoped. |

## Status

Verified in a browser harness that loads Carolingian's real stylesheets alongside Dorako's
`:root` palette and asserts computed values, including reproductions of Foundry's
cascade-layer behaviour and Carolingian's runtime colour-picker `<style>`. The harness uses
an approximation of the interface DOM rather than a running Foundry, so expect spot-fixing
in less common corners.

Tested against Carolingian UI 4.0.1, Dorako UI 1.11.3, Foundry v13–v14, PF2e 7.x–8.x.

## Layout

```
crlngn-dnd-light/
├── module.json
├── scripts/crlngn-dnd-light.js   style injection, setup helper, settings
├── styles/bridge.css             Carolingian's chrome, in Dorako's palette
└── lang/en.json
```

Carolingian UI is MIT. Dorako UI's colour values are referenced through its own CSS
variables; no code or assets from either module are redistributed here.

### History

v1.x tried the opposite arrangement — Dorako disabled, Carolingian primary, with this
module reproducing the D&D palette on top of it. That meant fighting Carolingian's
1718-line PF2e stylesheet for the sheets, a fight worth avoiding when Dorako already does
that job properly.
