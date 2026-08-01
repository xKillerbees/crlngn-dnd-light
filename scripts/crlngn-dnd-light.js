/**
 * Carolingian UI — D&D Light (PF2e)
 *
 * This module ships no layout of its own. It is a palette overlay: it toggles a
 * small set of classes on <html> and <body>, and the three stylesheets in
 * styles/ hang off those classes to repaint Carolingian UI in the D&D 5e-style
 * light theme borrowed from PF2e Dorako UI.
 *
 * Why classes on both <html> and <body>: Carolingian UI writes its own palette
 * from two places — a static stylesheet (`body.crlngn-ui.crlngn-theme-*`) and a
 * runtime <style> element rebuilt by ColorPickerUtil.applyCustomTheme() whenever
 * its settings change (`body.crlngn-ui`, `body.crlngn-ui.game .app`). Because the
 * runtime element is appended to <head> after ours, DOM order can never be relied
 * on. Anchoring every selector to `html.crlngn-dnd-light body.crlngn-ui.crlngn-dnd-light`
 * outruns all of them on specificity instead, so load order stops mattering.
 */

const MODULE_ID = "crlngn-dnd-light";

/** Classes toggled on the document root and body, keyed by the setting that owns each. */
const TOGGLES = {
  enabled: "crlngn-dnd-light",
  restoreRarityColors: "crlngn-dl-rarity",
  parchmentSheets: "crlngn-dl-parchment",
};

/** Tracks whether the color scheme has already been forced this session. */
let schemeForced = false;

/**
 * Reads a module setting, tolerating the window between registration and first
 * access (Foundry throws for unregistered keys).
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
 * Syncs every toggle class onto <html> and <body>. The master `enabled` switch
 * gates the others, so turning the module off strips all of them and leaves
 * Carolingian UI's own palette untouched.
 */
function applyClasses() {
  const root = document.documentElement;
  const body = document.body;
  if (!body) return;

  const on = setting("enabled");
  for (const [key, cls] of Object.entries(TOGGLES)) {
    const active = on && (key === "enabled" || setting(key));
    root.classList.toggle(cls, active);
    body.classList.toggle(cls, active);
  }
}

/**
 * Forces this client's Foundry color scheme to light.
 *
 * The theme is a light theme; Carolingian UI keys most of its own palette off
 * the `theme-light` / `theme-dark` classes Foundry derives from core's uiConfig,
 * so leaving the client on dark would fight every rule in styles/theme.css.
 * `core.uiConfig` is client-scoped, so this only ever changes the local user's
 * preference, and only when it is not already light.
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
    console.log(`${MODULE_ID} | forced this client's color scheme to light`);
  } catch (err) {
    console.error(`${MODULE_ID} | could not set core color scheme to light:`, err);
  }
}

/**
 * Registers the four client-scoped toggles. Each one only adds or removes a
 * class, so `requiresReload` is never needed.
 */
function registerSettings() {
  const reapply = () => applyClasses();

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

  game.settings.register(MODULE_ID, "restoreRarityColors", {
    name: `${MODULE_ID}.settings.restoreRarityColors.name`,
    hint: `${MODULE_ID}.settings.restoreRarityColors.hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: reapply,
  });

  game.settings.register(MODULE_ID, "parchmentSheets", {
    name: `${MODULE_ID}.settings.parchmentSheets.name`,
    hint: `${MODULE_ID}.settings.parchmentSheets.hint`,
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    onChange: reapply,
  });
}

Hooks.once("init", () => {
  registerSettings();
  applyClasses();
});

Hooks.once("ready", async () => {
  if (!game.modules.get("crlngn-ui")?.active) {
    ui.notifications?.warn(game.i18n.localize(`${MODULE_ID}.notifications.missingCrlngn`), {
      permanent: true,
    });
  }
  if (game.modules.get("pf2e-dorako-ui")?.active) {
    ui.notifications?.warn(game.i18n.localize(`${MODULE_ID}.notifications.dorakoActive`), {
      permanent: true,
    });
  }

  await forceLightScheme();
  applyClasses();
});

// Carolingian UI rebuilds its runtime palette <style> on its own settings changes
// and can re-run its body-class pass at the same time. Re-assert our classes after
// any setting write so the overlay never ends up half-applied.
Hooks.on("closeSettingsConfig", () => applyClasses());
