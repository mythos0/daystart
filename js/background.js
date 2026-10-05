/* DayStart — background.js
   Daily rotating landscape photography with graceful gradient fallback.
   Modes: daily | random | gradient. Preloads to avoid flashes. */

const Background = (() => {
  // Curated scenic photo IDs (picsum.photos — free placeholder photography)
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

  const todayKey = () => new Date().toISOString().slice(0, 10);

  function photoUrl(id) {
    return `https://picsum.photos/id/${id}/1920/1080`;
  }

  function pickGradient() {
    const dayOfYear = Math.floor(
      (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
    );
    return GRADIENTS[dayOfYear % GRADIENTS.length];
  }

  function apply(url) {
    const el = document.getElementById("bg-photo");
    el.style.backgroundImage = `url("${url}")`;
  }

  function applyGradient() {
    document.getElementById("bg-photo").style.backgroundImage = pickGradient();
  }

  async function show() {
    const mode = await Store.getSetting("bgMode", "daily");
    if (mode === "gradient") { applyGradient(); return; }

    let pick;
    if (mode === "random") {
      pick = Math.floor(Math.random() * PHOTO_IDS.length);
    } else {
      // daily: deterministic per calendar day
      const dayOfYear = Math.floor(
        (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000
      );
      pick = dayOfYear % PHOTO_IDS.length;
    }

    const url = photoUrl(PHOTO_IDS[pick]);

    // Preload then swap; gradient stays visible underneath if load fails
    const img = new Image();
    img.onload = () => apply(url);
    img.onerror = () => applyGradient();
    img.src = url;
  }

  async function init() {
    await show();
  }

  return { init, refresh: show };
})();
