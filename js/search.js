/* DayStart — search.js
   Search bar with 6 engines (Google / DuckDuckGo / Bing / YouTube /
   GitHub / Wikipedia). Tab or the engine chip cycles engines.
   Bangs pick an engine for a single search: "!gh playwright",
   "!y lofi beats", "!w zen garden" … */

const Search = (() => {
  const ENGINES = [
    { id: "google", name: "Google", url: "https://www.google.com/search?q=" },
    { id: "ddg", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=" },
    { id: "youtube", name: "YouTube", url: "https://www.youtube.com/results?search_query=" },
    { id: "github", name: "GitHub", url: "https://github.com/search?q=" },
    { id: "wikipedia", name: "Wikipedia", url: "https://en.wikipedia.org/w/index.php?search=" }
  ];

  const BANGS = {
    "!g": 0, "!google": 0,
    "!d": 1, "!ddg": 1, "!duck": 1,
    "!b": 2, "!bing": 2,
    "!y": 3, "!yt": 3, "!youtube": 3,
    "!gh": 4, "!github": 4,
    "!w": 5, "!wiki": 5, "!wikipedia": 5
  };

  let engineIndex = 0;
  const $ = (id) => document.getElementById(id);

  function renderEngine() {
    $("search-engine-btn").textContent = ENGINES[engineIndex].name;
  }

  async function loadEngine() {
    const saved = await Store.getSetting("searchEngine", "google");
    engineIndex = Math.max(0, ENGINES.findIndex((e) => e.id === saved));
    renderEngine();
  }

  function cycleEngine() {
    engineIndex = (engineIndex + 1) % ENGINES.length;
    Store.setSetting("searchEngine", ENGINES[engineIndex].id);
    renderEngine();
  }

  function submit() {
    let q = $("search-input").value.trim();
    if (!q) return;
    let idx = engineIndex;
    // Bang support: "!gh playwright" searches GitHub once
    const m = q.match(/^(!\w+)\s+(.+)$/);
    if (m && BANGS[m[1].toLowerCase()] !== undefined) {
      idx = BANGS[m[1].toLowerCase()];
      q = m[2];
    }
    window.location.href = ENGINES[idx].url + encodeURIComponent(q);
  }

  function bind() {
    $("search-form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    $("search-engine-btn").addEventListener("click", cycleEngine);
    $("search-input").addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        cycleEngine();
      }
    });
  }

  return {
    init: async () => { await loadEngine(); bind(); },
    focus: () => $("search-input").focus()
  };
})();
