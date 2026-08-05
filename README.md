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

**v0.3.0 — running in a live world.** Frame, navigation rail, full-height portrait
column, panel treatment and the bespoke stat tiles are all in place, with the tab
contents rendering as the system's own inside the new frame.

Three things were fixed after first contact with a real world, each worth knowing
about before editing:

1. **Registration is a hook race.** PF2e calls `registerSheets()` from inside its own
   `Hooks.once("setup")`, and Foundry evaluates module scripts *before* the system's —
   so a module's `setup` listener fires first and finds the registry empty.
   Registration is attempted at `setup` and retried at `ready`.
2. **The sheet label must be localised at registration.** Foundry does not localise
   that field, so passing an i18n key put the literal key in the sheet picker.
3. **`crb-style` is also the frame**, not just partial styling — see the note at the
   top of `styles/sheet.css`. Left active it placed this template's children into the
   system's named grid areas and painted parchment behind them.

### Stat tiles

The tiles across the top of the right column are the only markup in this sheet not
inherited from the system. They replace PF2e's sidebar rather than sitting beside it,
because the reference puts these values in boxes and keeping both would duplicate
every number.

They stay functional by carrying the system's own hooks, copied from its
`sidebar.hbs`: `data-action="roll-check"` with `data-statistic` for perception and
each save, `data-action="roll-initiative"`, and the immunity/weakness/resistance
editors. The handlers inherited from `CharacterSheetPF2e` fire exactly as they do
natively. HP fields are plain named inputs, so they submit through the normal form
path.

Values are read with the same expressions the system's own partials use
(`data.attributes.ac.value`, `data.abilities`, `data.saves`, `data.perception.value`,
`data.initiative.totalModifier`) rather than re-derived, so they cannot drift. Only
speed, class DC and the HP bar percentage are computed in `getData`, under a `pss`
namespace that cannot collide with the system's context.

**If you add a tile, copy its hook from the system's `sidebar.hbs`.** A tile without
the right `data-action` renders fine and silently does nothing when clicked.

Known to still need work:

- Inner tab tables are recoloured by variable only, so anything PF2e hardcodes will
  still read light-on-light or dark-on-dark until it's found and overridden.
- Dying/wounded pips and the XP bar are still only in the system header strip.
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
