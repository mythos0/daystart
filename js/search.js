/* DayStart — search.js
   Search bar with selectable engine (Google / DuckDuckGo / Bing /
   YouTube / GitHub). Typing "l <query>" switches to lucky search. */

const Search = (() => {
  const ENGINES = [
    { id: "google", name: "Google", url: "https://www.google.com/search?q=" },
    { id: "ddg", name: "DuckDuckGo", url: "https://duckduckgo.com/?q=" },
    { id: "bing", name: "Bing", url: "https://www.bing.com/search?q=" },
    { id: "youtube", name: "YouTube", url: "https://www.youtube.com/results?search_query=" },
    { id: "github", name: "GitHub", url: "https://github.com/search?q=" }
  ];

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
    $("search-input").focus();
  }

  function submit() {
    const q = $("search-input").value.trim();
    if (!q) return;
    window.location.href = ENGINES[engineIndex].url + encodeURIComponent(q);
  }

  function bind() {
    $("search-form").addEventListener("submit", (e) => { e.preventDefault(); submit(); });
    $("search-engine-btn").addEventListener("click", cycleEngine);
  }

  return {
    init: async () => { await loadEngine(); bind(); },
    focus: () => $("search-input").focus()
  };
})();
