# PF2e Styled Character Sheet

An alternate Pathfinder 2e character sheet: a portrait as the centre column, an icon
rail for navigation, and a dark gilded frame with ornate corner bracketing.

**Every roll, strike, spell, feat and inventory action behaves exactly as it does on
the system sheet.** This is a reskin of the frame, not a reimplementation.

## Install

Foundry → *Add-on Modules* → *Install Module* → **Manifest URL**:

```
https://raw.githubusercontent.com/xKillerbees/pf2e-styled-character-sheet/refs/heads/main/module.json
```

Then pick it per actor, or make it the default:

- **One actor:** open the sheet → the ⚙ *Sheet* button in the window header →
  *PF2e Styled Character Sheet*.
- **Everyone:** *Game Settings → Configure Settings → Sheet Configuration* → set the
  default `character` sheet.

It registers alongside the system sheet rather than replacing it, so you can switch
back per-actor at any time.

## How it works

The design decision that makes this maintainable: it **subclasses the system's own
`CharacterSheetPF2e`** and overrides exactly one thing — `get template()`. Every
behaviour is inherited untouched, and the replacement template re-includes PF2e's own
tab partials verbatim:

```hbs
{{> (resolvePath "templates/actors/character/tabs/inventory.hbs")}}
```

So the inventory tab *is* PF2e's inventory tab. When the system adds a feature or
fixes a bug in a tab, this sheet gets it for free.

This is possible because PF2e 8.x still builds on ApplicationV1 —
`ActorSheetPF2e extends fav1.sheets.ActorSheet` — where the template is a single
overridable getter. A from-scratch sheet would mean reimplementing thousands of lines
of strike, spellcasting and crafting logic, and silently losing a feature every time
one was missed.

### Contracts that must not be broken

If you edit `templates/character-sheet.hbs`, three things are load-bearing:

| | why |
|---|---|
| `crb-style` on the `<form>` | the system's partials are styled through it |
| `nav.sheet-navigation` + `.sheet-content` | the tab controller is configured with exactly those selectors (`sheet.ts` → `defaultOptions.tabs`) |
| `data-tab` values | must match the tab partials' own names |

`limited`-permission actors deliberately fall through to the system's own limited
sheet. That view is intentionally reduced, and reimplementing it risks showing data
the sheet shouldn't.

### Styling

`styles/sheet.css` is scoped entirely under `.pf2e-styled-sheet`, the class added in
`defaultOptions`. Selecting the system sheet on another actor leaves it untouched;
nothing here is global.

It's injected as an unlayered `<link>` from `scripts/module.js` rather than declared
in `module.json`. Foundry v13+ puts manifest-declared styles in a CSS cascade layer,
and unlayered rules beat layered ones *ahead of specificity* — this has to override
the system's own sheet CSS, which applies throughout because the template reuses
PF2e's partials.

Inside the tab partials, only **variable overrides** are used wherever the system
exposes one. Prefer adding a variable override over writing a rule against PF2e's
internal markup — the latter is what makes custom sheets rot across releases.

The corner brackets are eight background gradients rather than pseudo-elements:
`::before`/`::after` only give two corners, the panels need four, and both pseudos
stay free for content. The whole motif scales from `--pss-bracket`.

## Palette

Change these at the top of `styles/sheet.css`:

| variable | |
|---|---|
| `--pss-gold` `#c9a227` | active nav, headings, level numeral |
| `--pss-gold-soft` `#b08d4f` | corner brackets, borders |
| `--pss-panel` `#14100d` | panel fill |
| `--pss-blood` `#7c1f1f` | HP bar |
| `--pss-serif` | display face; falls back through Trajan / Palatino / Georgia |

`hotReload` is declared for `.css` and `.hbs`, so edits apply without restarting
Foundry.

## Status

**v0.1.0 — first working version.** The frame, rail, portrait column and panel
treatment are built and verified; the tab contents are the system's own and render
inside the new frame.

Verified so far: template contracts, Handlebars and HTML balance, tab/partial parity,
CSS scoping, and the rendered three-column layout measured in a browser. **Not yet
opened in a live Foundry world** — expect spot-fixing where the system's inner tables
meet the dark palette, since those are styled by PF2e rules this only recolours.

Known to still need work:

- The system `header.hbs` strip is included as-is; the screenshot's AC / Perception /
  Speed / Initiative row would need its own markup to match exactly.
- Inner tab tables are recoloured by variable only, so anything PF2e hardcodes will
  still read light-on-light or dark-on-dark until it's found and overridden.
- No compact/narrow layout beyond the 900px container query.

Built against PF2e 8.4.0, Foundry v14.

## Layout

```
pf2e-styled-character-sheet/
├── module.json
├── scripts/module.js                 sheet subclass, registration, style injection
├── templates/character-sheet.hbs     the frame; content is PF2e's own partials
├── styles/sheet.css                  dark gilded treatment, scoped to the sheet
└── lang/en.json
```

MIT. No system code or assets are redistributed; PF2e's partials are referenced at
runtime, not copied.
