/**
 * PF2e Styled Character Sheet
 *
 * An alternate character sheet: portrait as the centre column, an icon rail for
 * navigation, dark gilded framing.
 *
 * The design decision that makes this tractable: rather than writing a sheet from
 * scratch, it subclasses the system's own CharacterSheetPF2e and overrides only
 * `template`. Everything behavioural — strikes, spellcasting, crafting, inventory,
 * drag and drop, every `data-action` handler — is inherited untouched, and the
 * replacement template re-includes the system's own tab partials verbatim. A
 * from-scratch sheet would mean reimplementing thousands of lines of PF2e logic and
 * losing a feature every time one was missed.
 *
 * This is viable because PF2e 8.x still builds on ApplicationV1
 * (`ActorSheetPF2e extends fav1.sheets.ActorSheet`), where the template is a single
 * overridable getter.
 */

const MODULE_ID = "pf2e-styled-character-sheet";
const SHEET_ID = `${MODULE_ID}.StyledCharacterSheetPF2e`;

/**
 * Stylesheets, injected as unlayered <link>s rather than declared in module.json.
 *
 * Foundry v13+ assigns manifest-declared styles to a CSS cascade layer, and
 * unlayered rules beat layered ones ahead of specificity. The system's own sheet
 * CSS is what this has to override — the template reuses PF2e's partials, so PF2e's
 * rules apply throughout — and fighting that from inside a layer means losing every
 * contested rule regardless of how specific the selector is.
 */
const STYLESHEETS = ["styles/sheet.css"];

function injectStyles() {
  const version = game.modules.get(MODULE_ID)?.version ?? "0";
  for (const path of STYLESHEETS) {
    const id = `${MODULE_ID}-${path.split("/").pop().replace(".css", "")}`;
    document.getElementById(id)?.remove();
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = `modules/${MODULE_ID}/${path}?v=${version}`;
    document.head.appendChild(link);
  }
}

/**
 * Resolves the system's registered character sheet class.
 *
 * Taken from the sheet registry rather than a global, because PF2e does not export
 * its sheet classes on `game.pf2e`. Returns null if PF2e is not the active system or
 * has not registered yet, so the caller can degrade rather than throw.
 *
 * @returns {typeof foundry.appv1.sheets.ActorSheet | null}
 */
function getSystemCharacterSheet() {
  const registered = CONFIG.Actor?.sheetClasses?.character ?? {};
  // Prefer the canonical id, but fall back to any pf2e-provided character sheet so a
  // rename upstream degrades into a warning instead of a hard failure.
  const entry =
    registered["pf2e.CharacterSheetPF2e"] ??
    Object.entries(registered).find(([key]) => key.startsWith("pf2e."))?.[1];
  return entry?.cls ?? null;
}

/**
 * Reads a module setting, tolerating being called before registration completes.
 * @param {string} key
 * @param {unknown} fallback
 */
function getSetting(key, fallback) {
  try {
    return game.settings.get(MODULE_ID, key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Registered in `init` so the value is available to `registerSheet` during `setup`.
 *
 * `makeDefault` is consumed at registration time, so it cannot take effect until the
 * next load — hence `requiresReload`. Without it the setting appears to do nothing,
 * which is a worse experience than being told to reload.
 */
function registerSettings() {
  game.settings.register(MODULE_ID, "makeDefault", {
    name: "PF2E_STYLED_SHEET.settings.makeDefault.name",
    hint: "PF2E_STYLED_SHEET.settings.makeDefault.hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true,
  });
}

/** Set once registration succeeds, so the retry below is a no-op afterwards. */
let sheetRegistered = false;

/**
 * Builds and registers the sheet, if PF2e's own is available yet.
 *
 * Called from both `setup` and `ready` because the timing is a race that cannot be
 * won by picking one hook. PF2e calls `registerSheets()` from inside its own
 * `Hooks.once("setup")` (scripts/hooks/setup.ts), and Foundry evaluates module
 * scripts before the system's — so a module's `setup` listener is attached first and
 * therefore fires first, finding the sheet registry still empty. Registering only on
 * `ready` would work today, but would break the moment that load order changed.
 * Trying at `setup` and again at `ready` is correct under either ordering.
 *
 * @param {"setup"|"ready"} phase
 */
function registerSheet(phase) {
  if (sheetRegistered) return;

  const SystemSheet = getSystemCharacterSheet();
  if (!SystemSheet) {
    // Not an error at `setup` — it's the expected state when we win the race.
    console.debug(
      `${MODULE_ID} | PF2e's character sheet is not registered yet (phase: ${phase}); will retry.`
    );
    return;
  }

  class StyledCharacterSheetPF2e extends SystemSheet {
    /**
     * Size *and position*, both decided up front.
     *
     * Three earlier attempts tried to correct the position after rendering — clamping
     * the size, then re-centring on measured dimensions, then waiting two animation
     * frames before measuring. All of them still opened in the top-left corner, because
     * they all shared the same flaw: they depended on measuring an element mid-layout,
     * and no amount of waiting makes that reliable when a portrait is still decoding.
     *
     * ApplicationV1 accepts `left` and `top` as options and uses them as the initial
     * position, so there is nothing to measure and nothing to correct. Foundry only
     * computes its own centring when these are null — supplying them takes that path
     * out of play entirely, and the window is in the right place on the first paint.
     */
    static get defaultOptions() {
      const options = super.defaultOptions;
      const margin = 80;
      // Floor first, then cap. Capping first and flooring after can hand back a size
      // larger than the viewport — a 640 floor applied to an available 560 gives 640.
      const fit = (available, min, max) => Math.min(max, Math.max(min, available));
      const width = fit(window.innerWidth - margin, 640, 1180);
      const height = fit(window.innerHeight - margin, 480, 880);

      return foundry.utils.mergeObject(options, {
        classes: [...(options.classes ?? []), "pf2e-styled-sheet"],
        width,
        height,
        left: Math.max(0, Math.round((window.innerWidth - width) / 2)),
        top: Math.max(0, Math.round((window.innerHeight - height) / 2)),
        resizable: true,
      });
    }

    /**
     * The one override that matters. Limited-permission actors fall through to the
     * system's own limited sheet: it shows a deliberately reduced view, and
     * reimplementing that would risk leaking data this sheet has no business showing.
     */
    get template() {
      if (this.actor.limited) return super.template;
      return `modules/${MODULE_ID}/templates/character-sheet.hbs`;
    }

    /**
     * Adds only what the frame needs, under a `pss` namespace so nothing can collide
     * with the system's context. Everything else the template renders comes from
     * PF2e's own context, untouched.
     */
    async getData(options) {
      const data = await super.getData(options);
      const actor = this.actor;
      const hp = actor.system?.attributes?.hp ?? {};

      data.pss = {
        level: actor.system?.details?.level?.value ?? 1,
        className: actor.class?.name ?? "",
        ancestryName: actor.ancestry?.name ?? "",
        heritageName: actor.heritage?.name ?? "",
        portrait: actor.img,

        // Only values the system's own context does not already expose in a form the
        // template can use directly. Everything else the tiles render — ac, abilities,
        // saves, perception, initiative — is read straight from PF2e's context using
        // the same expressions its own partials use, so it cannot drift out of sync.
        speed: actor.system?.attributes?.speed?.total ?? actor.system?.attributes?.speed?.value ?? 0,
        classDC: actor.classDC?.value ?? null,
        // Percentage for the HP bar's width. Clamped because temporary overheal and
        // a zero max both produce values that break the bar.
        hpPct: Math.max(0, Math.min(100, hp.max ? Math.round((hp.value / hp.max) * 100) : 0)),
        // Drives the bar's colour shift. A threshold beats a gradient here: the point is
        // to be noticeable across the table mid-combat, not to be subtle.
        hpLow: hp.max ? hp.value / hp.max <= 0.25 : false,

        // Dying / wounded / doomed, as pip arrays the template can iterate. Built here
        // rather than with a Handlebars counting helper so the filled/empty state is
        // decided in one place. `max` is read from the actor because dying's maximum
        // moves with the doomed condition — hardcoding 4 would misreport a doomed PC.
        conditions: ["dying", "wounded", "doomed"].map((slug) => {
          const c = actor.system?.attributes?.[slug] ?? {};
          const max = Number(c.max) || (slug === "dying" ? 4 : 3);
          const value = Math.max(0, Math.min(max, Number(c.value) || 0));
          return {
            slug,
            value,
            max,
            active: value > 0,
            pips: Array.from({ length: max }, (_, i) => ({ filled: i < value })),
          };
        }),

        xp: (() => {
          const xp = actor.system?.details?.xp ?? {};
          const max = Number(xp.max) || 1000;
          const value = Number(xp.value) || 0;
          return { value, max, pct: Math.max(0, Math.min(100, Math.round((value / max) * 100))) };
        })(),
      };
      return data;
    }
  }

  const Actors = foundry.documents?.collections?.Actors ?? globalThis.Actors;
  if (typeof Actors?.registerSheet !== "function") {
    console.error(`${MODULE_ID} | Actors.registerSheet is unavailable — not registering.`, Actors);
    return;
  }

  const makeDefault = getSetting("makeDefault", false);

  try {
    Actors.registerSheet(MODULE_ID, StyledCharacterSheetPF2e, {
      types: ["character"],
      makeDefault,
      // Localised here rather than passed as a key. Foundry does not localise this
      // label, so passing the raw key made the sheet show up in the picker as
      // "PF2E_STYLED_SHEET.sheetName" — present, but not obviously the right entry.
      label: game.i18n.localize("PF2E_STYLED_SHEET.sheetName"),
    });
  } catch (err) {
    console.error(`${MODULE_ID} | sheet registration threw:`, err);
    return;
  }

  sheetRegistered = !!CONFIG.Actor.sheetClasses?.character?.[SHEET_ID];
  console.log(
    `${MODULE_ID} | registered=${sheetRegistered} as "${SHEET_ID}" ` +
      `(phase: ${phase}, makeDefault: ${makeDefault})\n` +
      (makeDefault
        ? `${MODULE_ID} | it is the default character sheet; actors with an explicit ` +
          `sheet override still need switching individually.`
        : `${MODULE_ID} | not the default — pick it per actor from the sheet's ⚙ Sheet ` +
          `button, or enable "Use as default character sheet" in this module's settings.`)
  );
}

Hooks.once("init", () => {
  registerSettings();
  injectStyles();
});

// Attempted twice on purpose — see the note on registerSheet(). PF2e registers its
// own sheets from inside its `setup` listener, and module scripts are evaluated
// before the system's, so a module `setup` listener fires first and finds nothing.
Hooks.once("setup", () => {
  if (game.system.id !== "pf2e") {
    console.warn(`${MODULE_ID} | requires the PF2e system; not registering.`);
    return;
  }
  registerSheet("setup");
});

Hooks.once("ready", () => {
  if (game.system.id === "pf2e") {
    registerSheet("ready");
    if (!sheetRegistered) {
      // Genuinely wrong by this point: PF2e has finished setting up and its sheet
      // still is not in the registry.
      console.error(
        `${MODULE_ID} | could not find PF2e's character sheet class in ` +
          `CONFIG.Actor.sheetClasses.character. Registered keys: ` +
          `${Object.keys(CONFIG.Actor?.sheetClasses?.character ?? {}).join(", ") || "(none)"}`
      );
      ui.notifications?.error(game.i18n.localize("PF2E_STYLED_SHEET.notifications.registerFailed"), {
        permanent: true,
      });
    }
  }
  injectStyles();
});
