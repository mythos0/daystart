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

  async function applyDarkMode() {
    const dark = await Store.getSetting("darkMode", false);
    document.body.classList.toggle("dark", !!dark);
    $("btn-dark").textContent = dark ? "\u2600" : "\u263D";
  }

  async function toggleDark() {
    const dark = !(await Store.getSetting("darkMode", false));
    await Store.setSetting("darkMode", dark);
    applyDarkMode();
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
        if (e.key === "Escape") document.activeElement.blur();
        return;
      }
      switch (e.key.toLowerCase()) {
        case "t": $("todo-input").focus(); break;
        case "f": $("focus-input").focus(); break;
        case "s": if (!Panels.isOpen("panel-sounds")) Search.focus(); break;
        case "n": Panels.toggle("panel-notes"); break;
        case "p": Panels.toggle("panel-pomodoro"); break;
        case "z": toggleZen(); break;
        case "d": toggleDark(); break;
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
      Settings.init()
    ]);

    await applyWidgetVisibility();
    await applyDarkMode();
    await restoreZen();
    await maybeOnboard();
  }

  document.addEventListener("DOMContentLoaded", init);

  return { toast, applyWidgetVisibility };
})();
