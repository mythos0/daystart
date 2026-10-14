/* DayStart — background.js
   Wallpaper engine.
   Sources:
     curated   — hand-picked photo collections (forest, hills, mountains,
                 ocean, travel and the default "beautiful places" mix).
                 A fresh photo is picked for every new tab; photos can be
                 browsed with prev / next buttons and a history grid.
                 Default source.
     bing      — Microsoft Bing daily wallpaper (high-res curated
                 photography, fetched via host-permission so no CORS issues).
     daily     — rotating curated picsum photography, deterministic per day
     random    — random picsum photography on every tab
     custom    — one user-provided image URL
     playlist  — user-provided URL list, one per day
     gradient  — offline gradient
   Every source degrades gracefully to the previous one, ending at gradient,
   so the page never flashes or breaks offline. Wallpaper history is stored
   locally, so the prev/next browsing works across tabs and sessions. */

const Background = (() => {
  /* ---- Curated catalog ----------------------------------------------------
     Every id below was individually reviewed: it points at a real, stable
     Unsplash photograph served by picsum.photos at 1920x1080. */
  const CATALOG = {
    forest: [
      15, 17, 28, 81, 83, 127, 161, 186, 190, 216, 217, 227, 229, 243, 282,
      289, 1003, 1021, 1023, 1043, 1044, 1063
    ],
    hills: [
      11, 33, 62, 66, 67, 85, 93, 110, 118, 151, 165, 170, 187, 198, 206,
      222, 228, 241, 251, 255, 277, 287
    ],
    mountains: [
      29, 54, 79, 114, 121, 128, 177, 191, 231, 235, 256, 260, 272, 278,
      293, 294, 296, 1000, 1015, 1018, 1036, 1037, 1045
    ],
    ocean: [
      10, 16, 37, 77, 92, 108, 124, 125, 147, 154, 162, 176, 179, 199, 213,
      218, 230, 271, 295, 1001, 1002, 1011, 1041, 1049, 1050, 1051, 1061
    ],
    travel: [
      27, 43, 46, 49, 58, 116, 142, 164, 174, 184, 188, 196, 200, 211, 215,
      234, 238, 244, 247, 257, 261, 288, 290, 1016, 1067
    ],
    /* Default mix: forests, hills and the most beautiful places on Earth */
    places: [
      15, 28, 49, 62, 66, 81, 93, 110, 116, 118, 127, 128, 170, 177, 190,
      198, 206, 216, 229, 243, 251, 257, 287, 288, 29, 54, 294, 296, 1015,
      1018, 1022, 1035, 1036, 1039, 1040, 1042, 1043, 1044, 1049, 1050
    ]
  };

  const LABELS = {
    places: "Beautiful places",
    forest: "Forest",
    hills: "Hills",
    mountains: "Mountains",
    ocean: "Ocean & lakes",
    travel: "Travel & cities"
  };

  const HIST_MAX = 50;

  /* Legacy pool for the daily / random modes */
  const PHOTO_IDS = [
    1015, 1016, 1018, 1019, 1022, 1036, 1039, 1043, 1044, 1050,
    1053, 1057, 1060, 1067, 1069, 29, 33, 49, 54, 67,
    76, 78, 103, 110, 122, 147, 160, 175, 176, 190
  ];

  const GRADIENTS = [
    "linear-gradient(135deg, #1a2a6c 0%, #b21f1f 60%, #fdbb2d 100%)",
    "linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)",
    "linear-gradient(135deg, #232526 0%, #414345 100%)",
    "linear-gradient(135deg, #1e3c72 0%, #2a5298 60%, #7db9e8 100%)",
    "linear-gradient(135deg, #42275a 0%, #734b6d 100%)",
    "linear-gradient(135deg, #141e30 0%, #243b55 100%)",
    "linear-gradient(135deg, #2b5876 0%, #4e4376 100%)",
    "linear-gradient(135deg, #355c7d 0%, #6c5b7b 50%, #c06c84 100%)"
  ];

  const dayOfYear = () => Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
  );

  function photoUrl(id) {
    return `https://picsum.photos/id/${id}/1920/1080`;
  }
  function thumbUrl(id) {
    return `https://picsum.photos/id/${id}/320/200`;
  }

  function pickGradient() {
    return GRADIENTS[dayOfYear() % GRADIENTS.length];
  }

  /* ---- Crossfade layers --------------------------------------------------- */
  let layers = null;      // [#bg-photo, #bg-photo-b]
  let activeLayer = 0;    // index into layers

  function setLayer(el, css) {
    el.style.backgroundImage = css;
  }

  function apply(url) {
    if (!layers) {
      layers = [document.getElementById("bg-photo"),
                document.getElementById("bg-photo-b")];
    }
    const next = 1 - activeLayer;
    const img = new Image();
    const css = `url("${url}")`;
    img.onload = () => {
      setLayer(layers[next], css);
      layers[next].classList.add("bg-visible");
      layers[activeLayer].classList.remove("bg-visible");
      activeLayer = next;
    };
    img.onerror = () => { /* caller handles fallback */ };
    img.src = url;
  }

  function applyGradient() {
    if (!layers) {
      layers = [document.getElementById("bg-photo"),
                document.getElementById("bg-photo-b")];
    }
    setLayer(layers[activeLayer], pickGradient());
    layers[activeLayer].classList.add("bg-visible");
    layers[1 - activeLayer].classList.remove("bg-visible");
  }

  function preloadApply(url, fallbackFn) {
    const img = new Image();
    img.onload = () => apply(url);
    img.onerror = () => fallbackFn && fallbackFn();
    img.src = url;
  }

  /* ---- Bing daily wallpaper ---------------------------------------------- */
  async function bingPhotoUrl() {
    const today = new Date().toISOString().slice(0, 10);
    const cached = await Store.getData("bingCache", null);
    if (cached && cached.date === today && cached.url) return cached.url;

    const res = await fetch(
      "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US"
    );
    if (!res.ok) throw new Error("bing http " + res.status);
    const json = await res.json();
    const img = json && json.images && json.images[0];
    if (!img || !img.urlbase) throw new Error("bing response malformed");
    const url = "https://www.bing.com" + img.urlbase + "_1920x1080.jpg";
    Store.setData("bingCache", { date: today, url });
    return url;
  }

  function playlistUrls(raw) {
    return (raw || "").split(/\r?\n/).map((s) => s.trim())
      .filter((s) => s.length > 4 && /^https?:\/\//i.test(s));
  }

  /* ---- Curated engine: history + per-tab rotation ------------------------- */
  let hist = [];   // photo ids, chronological
  let pos = -1;    // index of the photo currently shown
  let cat = "places";
  let navWired = false;

  function pool() {
    const p = CATALOG[cat] || CATALOG.places;
    return p.length ? p : CATALOG.places;
  }

  function pickNewId() {
    const p = pool();
    const current = hist[pos];
    let id = p[Math.floor(Math.random() * p.length)];
    if (p.length > 1) {
      let guard = 0;
      while (id === current && guard++ < 12) {
        id = p[Math.floor(Math.random() * p.length)];
      }
    }
    return id;
  }

  async function persist() {
    await Store.setData("bgHist", { ids: hist, pos });
  }

  function toastMsg(text) {
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toastMsg._t);
    toastMsg._t = setTimeout(() => { el.hidden = true; }, 2400);
  }

  function announce() {
    const p = pool();
    const idx = p.indexOf(hist[pos]);
    const where = idx >= 0 ? `${idx + 1} of ${p.length}` : `${pos + 1} of ${hist.length}`;
    toastMsg(`${LABELS[cat] || "Wallpaper"} \u00b7 ${where}`);
  }

  function showCurrent(fade, retried) {
    const id = hist[pos];
    if (id == null) return;
    const img = new Image();
    const url = photoUrl(id);
    img.onload = () => {
      if (fade) apply(url);
      else if (layers) { setLayer(layers[activeLayer], `url("${url}")`); layers[activeLayer].classList.add("bg-visible"); }
    };
    img.onerror = () => {
      // one quiet retry (transient network hiccup), then gradient
      if (!retried) setTimeout(() => showCurrent(fade, true), 400);
      else applyGradient();
    };
    img.src = url;
  }

  async function pushId(id) {
    hist = hist.slice(0, pos + 1);   // browsing-forward replaces the future
    hist.push(id);
    if (hist.length > HIST_MAX) hist = hist.slice(hist.length - HIST_MAX);
    pos = hist.length - 1;
    await persist();
    showCurrent(true);
  }

  async function goPrev() {
    if (mode !== "curated" || pos <= 0) return;
    pos -= 1;
    await persist();
    showCurrent(true);
    announce();
  }

  async function goNext() {
    if (mode !== "curated") return;
    if (pos < hist.length - 1) {
      pos += 1;
      await persist();
      showCurrent(true);
      announce();
    } else {
      await pushId(pickNewId());
      announce();
    }
  }

  async function goShuffle() {
    if (mode !== "curated") return;
    await pushId(pickNewId());
    announce();
  }

  /* History popover */
  function wireNav() {
    if (navWired) return;
    navWired = true;
    const $ = (id) => document.getElementById(id);
    const bar = $("wallbar");
    if (!bar) return;
    $("wp-prev").addEventListener("click", goPrev);
    $("wp-next").addEventListener("click", goNext);
    $("wp-shuffle").addEventListener("click", goShuffle);

    const pop = $("wp-history-pop");
    const grid = $("wp-history-grid");
    $("wp-history").addEventListener("click", (e) => {
      e.stopPropagation();
      if (pop.hidden) openHistory(); else pop.hidden = true;
    });
    pop.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("click", () => { pop.hidden = true; });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !pop.hidden) pop.hidden = true;
    });

    function openHistory() {
      grid.innerHTML = "";
      const start = Math.max(0, hist.length - 18);
      for (let i = hist.length - 1; i >= start; i--) {
        const cell = document.createElement("button");
        cell.className = "wp-cell" + (i === pos ? " wp-current" : "");
        cell.title = `Photo ${i + 1} of ${hist.length}`;
        cell.style.backgroundImage = `url("${thumbUrl(hist[i])}")`;
        cell.addEventListener("click", async () => {
          pos = i;
          await persist();
          showCurrent(true);
          pop.hidden = true;
          announce();
        });
        grid.appendChild(cell);
      }
      pop.hidden = false;
    }
  }

  async function showCurated() {
    wireNav();

    const stored = await Store.getData("bgHist", null);
    if (stored && Array.isArray(stored.ids) && stored.ids.length) {
      hist = stored.ids.filter((n) => typeof n === "number" && CATALOGLookup(n));
      pos = Math.min(Math.max(stored.pos | 0, 0), hist.length - 1);
    } else {
      hist = [];
      pos = -1;
    }
    // Every new tab brings a new wallpaper: advance to a fresh pick,
    // replacing any "forward" history (like a browser back/forward stack)
    await pushId(pickNewId());
  }

  function CATALOGLookup(n) {
    return Object.values(CATALOG).some((arr) => arr.includes(n));
  }

  /* ---- Mode dispatch ------------------------------------------------------ */
  let mode = "curated";

  async function show() {
    mode = await Store.getSetting("bgMode", "curated");

    /* v1.5 migration: existing Bing users get the new curated collections once */
    if (mode === "bing" && !(await Store.getSetting("bgV15Migrated", false))) {
      mode = "curated";
      await Store.setSetting("bgMode", "curated");
    }
    await Store.setSetting("bgV15Migrated", true);

    document.body.classList.toggle("bg-nav-on", mode === "curated");

    if (mode === "gradient") { applyGradient(); return; }

    if (mode === "custom") {
      const url = (await Store.getSetting("bgCustomUrl", "")).trim();
      if (!url) { applyGradient(); return; }
      preloadApply(url, applyGradient);
      return;
    }

    if (mode === "playlist") {
      const urls = playlistUrls(await Store.getSetting("bgPlaylist", ""));
      if (!urls.length) { applyGradient(); return; }
      preloadApply(urls[dayOfYear() % urls.length], applyGradient);
      return;
    }

    if (mode === "bing") {
      try {
        const url = await bingPhotoUrl();
        preloadApply(url, () => {
          // Bing failed (offline / blocked) → picsum daily → gradient
          preloadApply(photoUrl(PHOTO_IDS[dayOfYear() % PHOTO_IDS.length]), applyGradient);
        });
      } catch (e) {
        preloadApply(photoUrl(PHOTO_IDS[dayOfYear() % PHOTO_IDS.length]), applyGradient);
      }
      return;
    }

    if (mode === "curated") {
      cat = await Store.getSetting("bgCategory", "places");
      await showCurated();
      return;
    }

    // daily | random (picsum)
    const pick = mode === "random"
      ? Math.floor(Math.random() * PHOTO_IDS.length)
      : dayOfYear() % PHOTO_IDS.length;
    preloadApply(photoUrl(PHOTO_IDS[pick]), applyGradient);
  }

  async function init() {
    await show();
  }

  return {
    init,
    refresh: show,
    prev: goPrev,
    next: goNext,
    shuffle: goShuffle
  };
})();
