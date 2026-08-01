/**
 * Dorako UI + Carolingian Bridge (PF2e)
 *
 * Division of labour, and the reason this module is small:
 *
 *   PF2e Dorako UI  — windows, character sheets, chat, tooltips, dialogs, under
 *                     its own dnd5e2-light theme. It is mature and already does
 *                     this well; nothing here second-guesses it.
 *   Carolingian UI  — scene navigation, combat carousel, players list. Its
 *                     theming is switched off, its layout kept.
 *   This module     — two jobs only. Repaint Carolingian's leftover chrome using
 *                     Dorako's palette (styles/bridge.css), and configure both
 *                     modules so they stop overlapping (applyRecommendedSetup).
 *
 * Why the stylesheet is injected here instead of declared in module.json:
 * Foundry v13+ assigns styles listed in a manifest's `styles` array to a CSS
 * cascade layer. Unlayered declarations beat layered ones ahead of specificity,
 * so a manifest-declared sheet loses to any unlayered rule no matter how specific
 * it is. Carolingian is unlayered on both counts — its manifest ships
 * `"styles": []` and it appends its own <link> from JS at init, plus a runtime
 * <style> from its colour picker. Declaring styles the ordinary way therefore
 * lost every head-to-head against it, which is exactly how this module failed in
 * v1.0.x. Injecting real <link> elements puts us in the same unlayered cascade.
 */

const MODULE_ID = "crlngn-dnd-light";
const CRLNGN = "crlngn-ui";
const DORAKO = "pf2e-dorako-ui";

/** Injected as unlayered <link>s — see the note above. */
const STYLESHEETS = ["styles/bridge.css"];

/**
 * Settings changed by applyRecommendedSetup.
 *
 * The Carolingian keys are `v2-`-prefixed kebab-case rather than the camelCase
 * names its settings menus display — read from its src/constants/Settings.mjs,
 * not guessed. Its combat tracker and scene navigation settings are deliberately
 * absent: those are the features being kept.
 */
const RECOMMENDED = [
  { mod: CRLNGN, key: "v2-apply-theme-and-styles", value: false, why: "Dorako themes sheets" },
  { mod: CRLNGN, key: "v2-enable-chat-styles", value: false, why: "Dorako themes chat" },
  { mod: CRLNGN, key: "v2-enable-journal-styles", value: false, why: "Dorako themes journals" },
  { mod: CRLNGN, key: "v2-adjust-other-modules", value: false, why: "Dorako handles module support" },
  { mod: DORAKO, key: "theme.application-theme", value: "dnd5e2-light", why: "D&D light windows" },
  { mod: DORAKO, key: "theme.interface-theme", value: "dnd5e2-light", why: "D&D light interface" },
  { mod: DORAKO, key: "theme.chat-message-standard-theme", value: "dnd5e2-light", why: "D&D light chat" },
];

/** Tracks whether the color scheme has already been forced this session. */
let schemeForced = false;

/**
 * Reads a module setting, tolerating the window before registration completes.
 * @param {string} key
 * @param {boolean} fallback
 * @returns {boolean}
 */
function setting(key, fallback = true) {
  try {
    return game.settings.get(MODULE_ID, key) ?? fallback;
  } catch {
    return fallback;
  }
}

/**
 * Injects the stylesheet as an unlayered <link>, or moves it back to the end of
 * <head> if already present. Re-appending is belt-and-braces: our selectors
 * outrank Carolingian's, but it removes cascade order as a variable entirely.
 */
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

/** Syncs the bridge class onto <html> and <body>. */
function applyClasses() {
  if (!document.body) return;
  const on = setting("enabled");
  document.documentElement.classList.toggle(MODULE_ID, on);
  document.body.classList.toggle(MODULE_ID, on);
}

/**
 * Forces this client's Foundry color scheme to light. `core.uiConfig` is
 * client-scoped, so this only ever changes the local user's preference, and only
 * when it is not already light.
 */
async function forceLightScheme() {
  if (schemeForced) return;
  if (!setting("enabled") || !setting("forceLightScheme")) return;

  const uiConfig = game.settings.get("core", "uiConfig");
  const scheme = uiConfig?.colorScheme ?? {};
  if (scheme.applications === "light" && scheme.interface === "light") {
    schemeForced = true;
    return;
  }

  const updated = foundry.utils.deepClone(uiConfig ?? {});
  updated.colorScheme = { ...scheme, applications: "light", interface: "light" };

  try {
    await game.settings.set("core", "uiConfig", updated);
    schemeForced = true;
  } catch (err) {
    console.error(`${MODULE_ID} | could not set color scheme to light:`, err);
  }
}

/**
 * Writes the recommended settings into Carolingian UI and Dorako UI.
 *
 * Each write is attempted independently and failures are collected rather than
 * thrown: some of these are world-scoped and will be refused for non-GMs, and a
 * key renamed upstream should not take the rest of the setup down with it. The
 * caller reports exactly what changed and what did not.
 *
 * @returns {Promise<{changed: string[], skipped: string[], failed: string[]}>}
 */
async function applyRecommendedSetup() {
  const changed = [], skipped = [], failed = [];

  for (const { mod, key, value, why } of RECOMMENDED) {
    if (!game.modules.get(mod)?.active) {
      skipped.push(`${mod} not active — ${key}`);
      continue;
    }
    try {
      const current = game.settings.get(mod, key);
      if (current === value) {
        skipped.push(`${key} already ${value}`);
        continue;
      }
      await game.settings.set(mod, key, value);
      changed.push(`${key}: ${current} → ${value} (${why})`);
    } catch (err) {
      failed.push(`${key}: ${err.message}`);
    }
  }

  console.log(`${MODULE_ID} | recommended setup`, { changed, skipped, failed });
  return { changed, skipped, failed };
}

/** Confirmation dialog for the setup helper, then reports the result. */
async function promptRecommendedSetup() {
  const rows = RECOMMENDED.map(
    (r) => `<li><code>${r.mod}</code> → <code>${r.key}</code> = <b>${r.value}</b><br>
            <span style="opacity:.75">${r.why}</span></li>`
  ).join("");

  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: game.i18n.localize(`${MODULE_ID}.setup.title`) },
    content: `<p>${game.i18n.localize(`${MODULE_ID}.setup.intro`)}</p>
              <ul style="line-height:1.6">${rows}</ul>
              <p>${game.i18n.localize(`${MODULE_ID}.setup.note`)}</p>`,
    rejectClose: false,
    modal: true,
  });
  if (!ok) return;

  const { changed, skipped, failed } = await applyRecommendedSetup();

  if (failed.length) {
    ui.notifications.error(
      game.i18n.format(`${MODULE_ID}.setup.failed`, { count: failed.length }),
      { permanent: true }
    );
  }
  ui.notifications.info(
    game.i18n.format(`${MODULE_ID}.setup.done`, {
      changed: changed.length,
      skipped: skipped.length,
    })
  );
  if (changed.length) SettingsMenu.promptReload();
}

/** Offers a reload, since Carolingian and Dorako both re-theme on load. */
class SettingsMenu {
  static async promptReload() {
    const reload = await foundry.applications.api.DialogV2.confirm({
      window: { title: game.i18n.localize(`${MODULE_ID}.setup.reloadTitle`) },
      content: `<p>${game.i18n.localize(`${MODULE_ID}.setup.reloadBody`)}</p>`,
      rejectClose: false,
      modal: true,
    });
    if (reload) foundry.utils.debouncedReload();
  }
}

/**
 * Menu shim so "Apply recommended setup" can be a button in the settings list.
 * Foundry expects a constructible Application here; this one does its work on
 * render and never actually opens a window.
 */
class SetupMenu extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = { id: `${MODULE_ID}-setup`, window: { title: `${MODULE_ID}.setup.title` } };
  async render() {
    await promptRecommendedSetup();
    return this;
  }
}

function registerSettings() {
  const reapply = () => applyClasses();

  game.settings.registerMenu(MODULE_ID, "runSetup", {
    name: `${MODULE_ID}.setup.menuName`,
    label: `${MODULE_ID}.setup.menuLabel`,
    hint: `${MODULE_ID}.setup.menuHint`,
    icon: "fas fa-wand-magic-sparkles",
    type: SetupMenu,
    restricted: false,
  });

  game.settings.register(MODULE_ID, "enabled", {
    name: `${MODULE_ID}.settings.enabled.name`,
    hint: `${MODULE_ID}.settings.enabled.hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: reapply,
  });

  game.settings.register(MODULE_ID, "forceLightScheme", {
    name: `${MODULE_ID}.settings.forceLightScheme.name`,
    hint: `${MODULE_ID}.settings.forceLightScheme.hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: (value) => {
      if (!value) return;
      schemeForced = false;
      forceLightScheme();
    },
  });

  // Set once the setup helper has run, so the first-launch prompt appears only once.
  game.settings.register(MODULE_ID, "setupDone", {
    scope: "client",
    config: false,
    type: Boolean,
    default: false,
  });
}

Hooks.once("init", () => {
  registerSettings();
  injectStyles();
  applyClasses();
});

Hooks.once("ready", async () => {
  const missing = [CRLNGN, DORAKO].filter((id) => !game.modules.get(id)?.active);
  if (missing.length) {
    ui.notifications.warn(
      game.i18n.format(`${MODULE_ID}.notifications.missing`, { modules: missing.join(", ") }),
      { permanent: true }
    );
  }

  await forceLightScheme();
  injectStyles();
  applyClasses();

  // First launch with both modules present: offer to configure them.
  if (!missing.length && !game.settings.get(MODULE_ID, "setupDone")) {
    await game.settings.set(MODULE_ID, "setupDone", true);
    await promptRecommendedSetup();
  }
});

Hooks.on("closeSettingsConfig", () => {
  injectStyles();
  applyClasses();
});
