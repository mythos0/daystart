/* DayStart — app.js
   Bootstrap, keyboard shortcuts, zen mode, dark mode,
   onboarding and toasts. */

const App = (() => {
  const $ = (id) => document.getElementById(id);
  let toastTimer = null;

  function toast(text) {
    const el = $("toast");
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
  }

  async function applyWidgetVisibility() {
    const widgets = await Store.getSetting("widgets", {});
    const map = {
      todo: "todo-panel",
      habits: "habits-panel",
      links: "links-panel",
      quote: "quote-box",
      search: null
    };
    Object.entries(map).forEach(([key, id]) => {
      if (id) $(id).style.display = widgets[key] === false ? "none" : "";
    });
    $("search-wrap").style.visibility = widgets.search === false ? "hidden" : "visible";
    $("focus-wrap").style.display = widgets.focus === false ? "none" : "";
    $("weather").style.visibility = widgets.weather === false ? "hidden" : "visible";
  }

  function isNightNow() {
    const h = new Date().getHours();
    return h >= 19 || h < 6;
  }

  /* Theme engine: light | dark | auto. Migrates legacy darkMode boolean. */
  async function applyTheme() {
    let mode = await Store.getSetting("themeMode", null);
    if (mode === null) {
      const legacyDark = await Store.getSetting("darkMode", false);
      mode = legacyDark ? "dark" : "light";
      await Store.setSetting("themeMode", mode);
    }
    const dark = mode === "dark" || (mode === "auto" && isNightNow());
    document.body.classList.toggle("dark", dark);
    $("btn-dark").textContent = dark ? "\u2600" : "\u263D";
  }

  async function toggleDark() {
    const mode = await Store.getSetting("themeMode", "light");
    const currentlyDark = mode === "dark" || (mode === "auto" && isNightNow());
    await Store.setSetting("themeMode", currentlyDark ? "light" : "dark");
    applyTheme();
  }

  async function toggleZen() {
    const zen = !(await Store.getSetting("zenMode", false));
    await Store.setSetting("zenMode", zen);
    document.body.classList.toggle("zen", zen);
    toast(zen ? "Zen mode — press Z to exit" : "Zen mode off");
  }

  async function restoreZen() {
    const zen = await Store.getSetting("zenMode", false);
    document.body.classList.toggle("zen", !!zen);
  }

  async function maybeOnboard() {
    const onboarded = await Store.getSetting("onboarded", false);
    if (!onboarded) {
      $("onboarding").hidden = false;
      $("onboard-name").focus();
    }
  }

  function bindOnboarding() {
    $("onboard-go").addEventListener("click", finishOnboarding);
    $("onboard-name").addEventListener("keydown", (e) => {
      if (e.key === "Enter") finishOnboarding();
    });
  }

  async function finishOnboarding() {
    const name = $("onboard-name").value.trim();
    await Store.setSetting("userName", name);
    await Store.setSetting("onboarded", true);
    $("onboarding").hidden = true;
    Clock.refreshName();
    Settings.init();
    Weather.refresh();
    toast("Welcome" + (name ? ", " + name : "") + "!");
  }

  function bindShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Ignore when typing into an input
      const tag = document.activeElement && document.activeElement.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (e.key === "Escape") {
          e.preventDefault();
          document.activeElement.blur();
          Panels.close();
        }
        return;
      }
      switch (e.key.toLowerCase()) {
        case "t": e.preventDefault(); $("todo-input").focus(); break;
        case "f": e.preventDefault(); $("focus-input").focus(); break;
        case "s": e.preventDefault(); if (!Panels.isOpen("panel-sounds")) Search.focus(); break;
        case "n": e.preventDefault(); Panels.toggle("panel-notes"); break;
        case "p": e.preventDefault(); Panels.toggle("panel-pomodoro"); break;
        case "c": e.preventDefault(); Panels.toggle("panel-countdowns"); break;
        case "z": e.preventDefault(); toggleZen(); break;
        case "d": e.preventDefault(); toggleDark(); break;
        case "escape": Panels.close(); break;
      }
    });
  }

  function bindMisc() {
    $("btn-dark").addEventListener("click", toggleDark);
    $("btn-zen").addEventListener("click", toggleZen);
  }

  async function init() {
    bindMisc();
    bindOnboarding();
    bindShortcuts();
    Panels.bind();

    await Promise.all([
      Clock.init(),
      Focus.init(),
      Todo.init(),
      Habits.init(),
      Links.init(),
      Quote.init(),
      Weather.init(),
      Background.init(),
      Search.init(),
      Pomodoro.init(),
      Notes.init(),
      Sounds.init(),
      Countdowns.init(),
      Settings.init()
    ]);

    await applyWidgetVisibility();
    await applyTheme();
    await restoreZen();
    await maybeOnboard();

    // Keep auto theme in sync while the tab stays open
    setInterval(applyTheme, 60000);
  }

  document.addEventListener("DOMContentLoaded", init);

  return { toast, applyWidgetVisibility, applyTheme };
})();
