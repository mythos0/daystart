/* DayStart — background.js
   Background sources:
     bing      — Microsoft Bing daily wallpaper (high-res curated photography,
                 fetched via host-permission so no CORS issues). Default.
     daily     — rotating curated picsum photography, deterministic per day
     random    — random picsum photography on every tab
     custom    — one user-provided image URL
     playlist  — user-provided URL list, one per day
     gradient  — offline gradient
   Every source degrades gracefully to the previous one, ending at gradient,
   so the page never flashes or breaks offline. */

const Background = (() => {
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

  function pickGradient() {
    return GRADIENTS[dayOfYear() % GRADIENTS.length];
  }

  function apply(url) {
    const el = document.getElementById("bg-photo");
    el.style.backgroundImage = `url("${url}")`;
  }

  function applyGradient() {
    document.getElementById("bg-photo").style.backgroundImage = pickGradient();
  }

  /* Bing daily wallpaper archive (public JSON endpoint, no key).
     Result cached for the whole day in local storage. */
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

  function preloadApply(url, fallbackFn) {
    const img = new Image();
    img.onload = () => apply(url);
    img.onerror = () => fallbackFn && fallbackFn();
    img.src = url;
  }

  function playlistUrls(raw) {
    return (raw || "").split(/\r?\n/).map((s) => s.trim())
      .filter((s) => s.length > 4 && /^https?:\/\//i.test(s));
  }

  async function show() {
    const mode = await Store.getSetting("bgMode", "bing");

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

    // daily | random (picsum)
    const pick = mode === "random"
      ? Math.floor(Math.random() * PHOTO_IDS.length)
      : dayOfYear() % PHOTO_IDS.length;
    preloadApply(photoUrl(PHOTO_IDS[pick]), applyGradient);
  }

  async function init() {
    await show();
  }

  return { init, refresh: show };
})();
