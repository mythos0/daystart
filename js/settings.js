/* DayStart — settings.js
   Settings panel: personal, widgets, background, weather, data tools. */

const Settings = (() => {
  const $ = (id) => document.getElementById(id);

  const GRADIENT_SWATCHES = [
    "linear-gradient(135deg, #1a2a6c 0%, #b21f1f 60%, #fdbb2d 100%)",
    "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    "linear-gradient(135deg, #1e3c72 0%, #7db9e8 100%)",
    "linear-gradient(135deg, #42275a 0%, #734b6d 100%)",
    "linear-gradient(135deg, #355c7d 0%, #c06c84 100%)",
    "linear-gradient(135deg, #141e30 0%, #243b55 100%)"
  ];

  async function loadAll() {
    $("set-name").value = await Store.getSetting("userName", "");
    $("set-clock").value = await Store.getSetting("clockFormat", "24");
    $("set-seconds").checked = await Store.getSetting("clockSeconds", false);
    $("set-theme").value = await Store.getSetting("themeMode", "light");
    $("set-units").value = await Store.getSetting("units", "c");
    $("set-city").value = await Store.getSetting("city", "");
    $("set-bg-mode").value = await Store.getSetting("bgMode", "daily");
    $("set-bg-url").value = await Store.getSetting("bgCustomUrl", "");

    const widgets = await Store.getSetting("widgets", {});
    const defaults = ["todo", "habits", "weather", "links", "quote", "focus", "search"];
    defaults.forEach((w) => {
      const el = $("set-w-" + w);
      if (el) el.checked = widgets[w] !== false;
    });

    renderSwatches();
  }

  function renderSwatches() {
    const wrap = $("bg-swatches");
    wrap.innerHTML = "";
    GRADIENT_SWATCHES.forEach((g) => {
      const s = document.createElement("div");
      s.className = "swatch";
      s.style.background = g;
      s.title = "Apply this gradient now";
      s.addEventListener("click", async () => {
        document.getElementById("bg-photo").style.backgroundImage = g;
        await Store.setSetting("bgMode", "gradient");
        $("set-bg-mode").value = "gradient";
      });
      wrap.appendChild(s);
    });
  }

  async function applyWidgets() {
    const widgets = {
      todo: $("set-w-todo").checked,
      habits: $("set-w-habits").checked,
      weather: $("set-w-weather").checked,
      links: $("set-w-links").checked,
      quote: $("set-w-quote").checked,
      focus: $("set-w-focus").checked,
      search: $("set-w-search").checked
    };
    await Store.setSetting("widgets", widgets);
    App.applyWidgetVisibility();
  }

  function bind() {
    $("set-name").addEventListener("change", async (e) => {
      await Store.setSetting("userName", e.target.value.trim());
      Clock.refreshName();
    });
    $("set-clock").addEventListener("change", async (e) => {
      await Store.setSetting("clockFormat", e.target.value);
      Clock.refreshFormat();
    });
    $("set-seconds").addEventListener("change", async (e) => {
      await Store.setSetting("clockSeconds", e.target.checked);
      Clock.refreshFormat();
    });
    $("set-theme").addEventListener("change", async (e) => {
      await Store.setSetting("themeMode", e.target.value);
      await App.applyTheme();
    });
    $("set-units").addEventListener("change", async (e) => {
      await Store.setSetting("units", e.target.value);
      Weather.onUnitsChanged();
    });
    $("set-city").addEventListener("change", async (e) => {
      await Store.setSetting("city", e.target.value.trim());
      Weather.refresh();
    });
    $("set-bg-mode").addEventListener("change", async (e) => {
      await Store.setSetting("bgMode", e.target.value);
      Background.refresh();
    });
    $("set-bg-url").addEventListener("change", async (e) => {
      await Store.setSetting("bgCustomUrl", e.target.value.trim());
      if ($("set-bg-mode").value === "custom") Background.refresh();
    });

    ["todo", "habits", "weather", "links", "quote", "focus", "search"].forEach((w) => {
      $("set-w-" + w).addEventListener("change", applyWidgets);
    });

    // Data tools
    $("btn-export").addEventListener("click", async () => {
      const snapshot = await Store.exportAll();
      const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "daystart-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
      App.toast("Data exported");
    });

    $("btn-import").addEventListener("click", () => $("import-file").click());
    $("import-file").addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          await Store.importAll(JSON.parse(reader.result));
          App.toast("Data imported — reloading");
          setTimeout(() => location.reload(), 900);
        } catch (err) {
          App.toast("Import failed: invalid file");
        }
      };
      reader.readAsText(file);
    });

    $("btn-reset").addEventListener("click", async () => {
      if (!confirm("This will erase all DayStart data on this browser. Continue?")) return;
      if (typeof chrome !== "undefined" && chrome.storage) {
        chrome.storage.sync.clear();
        chrome.storage.local.clear();
      }
      localStorage.clear();
      location.reload();
    });
  }

  return { init: async () => { await loadAll(); bind(); } };
})();
