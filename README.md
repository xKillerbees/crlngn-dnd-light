# Carolingian UI — D&D Light (PF2e)

Keeps [Carolingian UI](https://github.com/crlngn/crlngn-ui)'s layout — character sheets,
scene navigation, combat carousel — and recolours all of it in the D&D 5e-style light
theme from [PF2e Dorako UI](https://github.com/Dorako/pf2e-Dorako-UI): parchment, gold
borders, maroon accents, dark text. Also restores Pathfinder 2e's item rarity colours,
which Carolingian flattens out.

Carolingian keeps its layout. This module only changes colours.

**The palette applies under either Foundry colour scheme.** It does not depend on
`core.uiConfig` being set to light — see the notes below, because that assumption is what
broke every earlier version.

## Install

Foundry → *Add-on Modules* → *Install Module* → **Manifest URL**:

```
https://raw.githubusercontent.com/xKillerbees/crlngn-dnd-light/refs/heads/main/module.json
```

Requires `crlngn-ui`. **Dorako UI is optional** — if it's installed the setup switches it
to `no-theme` so it stops competing; if it isn't installed nothing is lost, since the D&D
palette is reproduced here rather than borrowed at runtime.

On first launch it offers to apply the recommended setup. You can re-run it any time from
*Configure Settings → Carolingian UI — D&D Light → Apply recommended setup*.

## What the setup changes

| module | setting | to | why |
|---|---|---|---|
| crlngn-ui | `v2-apply-theme-and-styles` | **on** | Carolingian's sheet layout |
| crlngn-ui | `v2-enable-chat-styles` | **on** | Carolingian's chat layout |
| crlngn-ui | `v2-enable-journal-styles` | **on** | Carolingian's journal layout |
| crlngn-ui | `v2-adjust-other-modules` | **on** | Carolingian's module support |
| pf2e-dorako-ui *(if active)* | all four `theme.*` settings | `no-theme` | stops it fighting Carolingian |

Carolingian's combat tracker and scene navigation settings are left alone. Every value is
validated against the target setting's own choices before being written, and each write is
attempted independently — so a world-scoped setting refused for a non-GM, or a key removed
upstream, reports instead of silently doing nothing.

## Settings

| setting | default | |
|---|---|---|
| Enable D&D Light theme | on | Master switch. Off = Carolingian reverts to its own colour theme. |
| Force light color scheme | on | Sets *your* Foundry colour scheme to light. Optional — the palette works either way — but Foundry's own widgets look better in light. Client-scoped. |

## Notes for anyone editing this

Four things that are not obvious, each of which caused a shipped bug.

**Styles are injected as `<link>`s from `scripts/`, not declared in `module.json`.**
Foundry v13+ assigns manifest-declared styles to a CSS cascade layer, and unlayered rules
beat layered ones *ahead of specificity*. Carolingian is unlayered on both counts — its
manifest ships `"styles": []` and it appends its own `<link>` from JS, plus a runtime
`<style>` from its colour picker. A manifest-declared stylesheet therefore loses every
contested rule no matter how specific it is. In v1.0.x only the `!important` rules and the
uncontested ones survived, which looked exactly like the module not loading.

**No selector mentions a colour scheme.** Gating the palette behind `.theme-light` made it
depend on `core.uiConfig`, which does not hold — the user can change it, another module can
re-enforce its own, and Foundry does not stamp a scheme class on every element anyway.
Three separate rounds of "still dark" traced here. This is unconditionally a light theme,
so the selectors say so. Verified in the harness with the page in `theme-dark`, in
`theme-light`, and with no scheme class at all: identical computed values.

**Never source a colour through a variable Carolingian reassigns.** It sets
`--dnd5e-color-maroon: var(--color-highlights)` inside `body.crlngn-ui`. An earlier build
read Dorako's palette from there and created a cycle — `--cdl-maroon` →
`--dnd5e-color-maroon` → `--color-highlights` → `--cdl-maroon`. CSS resolves cycles by
invalidating every property involved, so the whole maroon family computed to *nothing*
while gold worked fine, because Carolingian doesn't touch gold. The palette is now
hardcoded, which also means Dorako isn't required at runtime.

**Target module setting keys are not what their menus display.** Carolingian's are
`v2-`-prefixed kebab-case (`v2-apply-theme-and-styles`, not `applyThemeToSheets`). Dorako
1.11.3 commented `dnd5e2-light` out of the choices for `theme.application-theme` and
`theme.interface-theme`. Foundry does not reject an out-of-range choice loudly — it just
sits there doing nothing — so `applyRecommendedSetup` validates against
`game.settings.settings.get(...).choices` before writing.

The repeated `.crlngn-dnd-light` in selectors is deliberate: the anchor is 0-6-2, which
clears Carolingian's deepest PF2e selectors at 0-6-1. A single occurrence gives 0-3-2 and
loses on class count — verified, sheets kept Carolingian's lilac `--color-secondary` until
the anchor was raised. It went from three repetitions to four when the scheme class was
dropped, to pay back the specificity that removal cost.

Only the rarity and proficiency custom properties use `!important`. Everything else relies
on specificity and stays overridable from Carolingian's own **Custom CSS** box.

## Tweaking colours

Source colours are declared once at the top of `styles/theme.css` as `--cdl-*`. For a
different accent, change `rgb(116, 27, 43)` (maroon) and `rgb(159, 146, 117)` (gold)
throughout that file. `hotReload` is declared for `.css`, so edits apply without
restarting Foundry.

## Status

Verified in a browser harness that loads Carolingian's real stylesheets and asserts
computed values, including reproductions of Foundry's cascade-layer behaviour and
Carolingian's runtime colour-picker `<style>` carrying a custom accent. The harness uses an
approximation of the sheet and interface DOM rather than a running Foundry, so expect
spot-fixing in less common corners.

Tested against Carolingian UI 4.0.1, Dorako UI 1.11.3, Foundry v13–v14, PF2e 7.x–8.x.

## Layout

```
crlngn-dnd-light/
├── module.json
├── scripts/crlngn-dnd-light.js   style injection, setup helper, settings
├── styles/theme.css              palette translation
├── styles/sheets.css             parchment windows, gold borders, maroon tabs
├── styles/pf2e-rarity.css        rarity + proficiency restoration
└── lang/en.json
```

Carolingian UI is MIT. Dorako UI's colour values are reproduced as plain hex; no code or
assets from either module are redistributed here.

### History

v2.x tried the opposite arrangement — Dorako primary, Carolingian reduced to scene nav and
combat tracker. That gave up Carolingian's character sheets, which were the reason for
using it. v3 returns to Carolingian owning the layout, with the cascade-layer, colour-scheme
and variable-cycle bugs that sank v1.x now fixed.
