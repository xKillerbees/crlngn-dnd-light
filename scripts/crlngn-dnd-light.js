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
const STYLESHEETS = ["styles/theme.css", "styles/sheets.css", "styles/pf2e-rarity.css"];

/**
 * Settings changed by applyRecommendedSetup.
 *
 * The Carolingian keys are `v2-`-prefixed kebab-case rather than the camelCase
 * names its settings menus display — read from its src/constants/Settings.mjs,
 * not guessed. Its combat tracker and scene navigation settings are deliberately
 * absent: those are the features being kept.
 */
const RECOMMENDED = [
  // Carolingian owns the layout, including the character sheets — that is the whole
  // point of using it. Its styling is switched on, then recoloured by styles/.
  { mod: CRLNGN, key: "v2-apply-theme-and-styles", value: true, why: "Carolingian sheet layout" },
  { mod: CRLNGN, key: "v2-enable-chat-styles", value: true, why: "Carolingian chat layout" },
  { mod: CRLNGN, key: "v2-enable-journal-styles", value: true, why: "Carolingian journal layout" },
  { mod: CRLNGN, key: "v2-adjust-other-modules", value: true, why: "Carolingian module support" },

  // Dorako is neutralised rather than uninstalled. Its dnd5e2 theme would fight
  // Carolingian for the same elements, and Carolingian is the one being kept; the
  // D&D palette is reproduced in styles/theme.css instead. "no-theme" is a valid
  // choice for all four of these — checked against its theme-settings.js, not
  // assumed. Skipped entirely when Dorako is not active.
  { mod: DORAKO, key: "theme.application-theme", value: "no-theme", why: "Carolingian styles sheets" },
  { mod: DORAKO, key: "theme.interface-theme", value: "no-theme", why: "Carolingian styles the interface" },
  { mod: DORAKO, key: "theme.chat-message-standard-theme", value: "no-theme", why: "Carolingian styles chat" },
  { mod: DORAKO, key: "theme.chat-message-opposition-theme", value: "no-theme", why: "Carolingian styles chat" },
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
 * Forces this client's Foundry color scheme to light, and verifies it stuck.
 *
 * This is load-bearing, not cosmetic. Dorako's `dnd5e2` theme carries no colour
 * scheme of its own — its ui-theme.js only sets `data-color-scheme` when the theme
 * key has an explicit `-light`/`-dark` suffix, and the suffixed variants were
 * removed from the sheet and interface choices. So the entire light-vs-dark
 * outcome comes from Foundry's own setting. If this silently fails, everything
 * renders dark and looks like the theme didn't apply at all.
 *
 * `core.uiConfig` is client-scoped, so this only ever changes the local user.
 *
 * @returns {Promise<{ok: boolean, changed: boolean, reason?: string}>}
 */
async function forceLightScheme() {
  if (!setting("enabled") || !setting("forceLightScheme")) {
    return { ok: true, changed: false, reason: "disabled by setting" };
  }

  const uiConfig = game.settings.get("core", "uiConfig");
  const scheme = uiConfig?.colorScheme ?? {};
  if (scheme.applications === "light" && scheme.interface === "light") {
    schemeForced = true;
    return { ok: true, changed: false, reason: "already light" };
  }

  const updated = foundry.utils.deepClone(uiConfig ?? {});
  updated.colorScheme = { ...scheme, applications: "light", interface: "light" };

  try {
    await game.settings.set("core", "uiConfig", updated);
  } catch (err) {
    console.error(`${MODULE_ID} | could not set color scheme to light:`, err);
    return { ok: false, changed: false, reason: err.message };
  }

  // Read back rather than trusting the write. Another module can re-enforce its own
  // colour scheme over the top, and a silent revert here is indistinguishable from
  // the theme being broken.
  const after = game.settings.get("core", "uiConfig")?.colorScheme ?? {};
  const ok = after.applications === "light" && after.interface === "light";
  schemeForced = ok;
  if (!ok) {
    console.error(
      `${MODULE_ID} | color scheme did not stick — something reverted it:`,
      after
    );
  }
  return { ok, changed: true, reason: ok ? undefined : JSON.stringify(after) };
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
      // Validate against the setting's own choices before writing. Foundry does not
      // reject an out-of-range choice loudly, so a value the target module has since
      // removed just sits there doing nothing — which is exactly how v2.0.0 shipped
      // "dnd5e2-light" into a Dorako setting that no longer offers it, leaving the
      // whole UI dark with no error anywhere.
      const config = game.settings.settings.get(`${mod}.${key}`);
      if (config?.choices && !(value in config.choices)) {
        failed.push(`${key}: "${value}" is not a valid choice (have: ${Object.keys(config.choices).join(", ")})`);
        continue;
      }

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
  // Only Carolingian is required. Dorako is optional and, if present, gets switched
  // to no-theme by the setup so the two stop fighting over the same elements.
  const crlngnActive = !!game.modules.get(CRLNGN)?.active;
  if (!crlngnActive) {
    ui.notifications.warn(
      game.i18n.format(`${MODULE_ID}.notifications.missing`, { modules: CRLNGN }),
      { permanent: true }
    );
  }

  // Best-effort now rather than load-bearing: the palette applies under either
  // colour scheme, so a failure here is cosmetic. Logged, not shouted about.
  const scheme = await forceLightScheme();
  if (!scheme.ok) {
    console.warn(`${MODULE_ID} | colour scheme not set to light (${scheme.reason}) — ` +
                 `harmless, the palette does not depend on it.`);
  }

  injectStyles();
  applyClasses();

  if (crlngnActive && !game.settings.get(MODULE_ID, "setupDone")) {
    await game.settings.set(MODULE_ID, "setupDone", true);
    await promptRecommendedSetup();
  }
});

Hooks.on("closeSettingsConfig", () => {
  injectStyles();
  applyClasses();
});
