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

/** Builds and registers the sheet. Deferred to `setup`, once PF2e has registered its own. */
function registerSheet() {
  const SystemSheet = getSystemCharacterSheet();
  if (!SystemSheet) {
    console.error(`${MODULE_ID} | could not find PF2e's character sheet class — not registering.`);
    return;
  }

  class StyledCharacterSheetPF2e extends SystemSheet {
    static get defaultOptions() {
      const options = super.defaultOptions;
      return foundry.utils.mergeObject(options, {
        classes: [...(options.classes ?? []), "pf2e-styled-sheet"],
        width: 1180,
        height: 860,
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
      data.pss = {
        level: actor.system?.details?.level?.value ?? 1,
        className: actor.class?.name ?? "",
        ancestryName: actor.ancestry?.name ?? "",
        heritageName: actor.heritage?.name ?? "",
        portrait: actor.img,
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

  const registered = !!CONFIG.Actor.sheetClasses?.character?.[SHEET_ID];
  console.log(
    `${MODULE_ID} | registered=${registered} as "${SHEET_ID}" | makeDefault=${makeDefault}\n` +
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

// setup, not init: PF2e registers its own sheets during init, and reading the
// registry before that has happened would find nothing.
Hooks.once("setup", () => {
  if (game.system.id !== "pf2e") {
    console.warn(`${MODULE_ID} | requires the PF2e system; not registering.`);
    return;
  }
  registerSheet();
});

Hooks.once("ready", () => {
  injectStyles();
});
