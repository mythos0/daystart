/* DayStart — weather.js
   Weather via Open-Meteo (free, keyless). Auto-location via geolocation
   (cached for 7 days so the permission prompt is not repeated every tab),
   or manual city via Open-Meteo geocoding. 3-day mini forecast shown in
   a popover when the weather pill is clicked. */

const Weather = (() => {
  let units = "c";
  let cache = null; // { ts, data, place }
  const $ = (id) => document.getElementById(id);
  const TTL = 30 * 60 * 1000;        // 30 min weather cache
  const GEO_TTL = 7 * 24 * 3600 * 1000; // 7 day coordinate cache

  const CODES = {
    0: ["\u2600", "Clear sky"],
    1: ["\uD83C\uDF24", "Mainly clear"], 2: ["\u26C5", "Partly cloudy"], 3: ["\u2601", "Overcast"],
    45: ["\uD83C\uDF2B", "Fog"], 48: ["\uD83C\uDF2B", "Freezing fog"],
    51: ["\uD83C\uDF27", "Light drizzle"], 53: ["\uD83C\uDF27", "Drizzle"], 55: ["\uD83C\uDF27", "Heavy drizzle"],
    61: ["\uD83C\uDF27", "Light rain"], 63: ["\uD83C\uDF27", "Rain"], 65: ["\uD83C\uDF27", "Heavy rain"],
    71: ["\uD83C\uDF28", "Light snow"], 73: ["\uD83C\uDF28", "Snow"], 75: ["\uD83C\uDF28", "Heavy snow"],
    77: ["\uD83C\uDF28", "Snow grains"],
    80: ["\uD83C\uDF27", "Showers"], 81: ["\uD83C\uDF27", "Showers"], 82: ["\uD83C\uDF27", "Violent showers"],
    85: ["\uD83C\uDF28", "Snow showers"], 86: ["\uD83C\uDF28", "Snow showers"],
    95: ["\u26C8", "Thunderstorm"], 96: ["\u26C8", "Storm & hail"], 99: ["\u26C8", "Storm & hail"]
  };

  function toF(c) { return c * 9 / 5 + 32; }
  function fmtTemp(c) {
    const v = units === "f" ? toF(c) : c;
    return Math.round(v) + "\u00B0";
  }

  function codeIcon(code) { return (CODES[code] || ["\uD83C\uDF24", "—"])[0]; }
  function codeDesc(code) { return (CODES[code] || ["", "—"])[1]; }

  function render(data, place) {
    if (!data) return;
    const cur = data.current;
    $("weather-icon").textContent = codeIcon(cur.weather_code);
    $("weather-temp").textContent = fmtTemp(cur.temperature_2m);
    $("weather-desc").textContent = codeDesc(cur.weather_code);

    // 3-day forecast: today + next two (icon, hi/lo)
    const daily = data.daily;
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const wrap = $("weather-forecast");
    wrap.innerHTML = "";
    for (let i = 0; i < 3 && i < daily.time.length; i++) {
      const d = new Date(daily.time[i] + "T00:00:00");
      const row = document.createElement("div");
      row.className = "forecast-row";
      const day = document.createElement("span");
      day.className = "fc-day";
      day.textContent = i === 0 ? "Today" : names[d.getDay()];
      const ic = document.createElement("span");
      ic.className = "fc-icon";
      ic.textContent = codeIcon(daily.weather_code[i]);
      const temps = document.createElement("span");
      temps.className = "fc-temps";
      temps.textContent = fmtTemp(daily.temperature_2m_max[i]) +
        " / " + fmtTemp(daily.temperature_2m_min[i]);
      row.appendChild(day); row.appendChild(ic); row.appendChild(temps);
      wrap.appendChild(row);
    }
    if (place) $("weather-city").textContent = place;
    else $("weather-city").textContent = "Current location";
  }

  async function fetchWeather(lat, lon) {
    const unitParam = units === "f" ? "fahrenheit" : "celsius";
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code,apparent_temperature` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&forecast_days=3&temperature_unit=${unitParam}&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("weather http " + res.status);
    return res.json();
  }

  async function geocodeCity(city) {
    const url = "https://geocoding-api.open-meteo.com/v1/search?count=1&name=" + encodeURIComponent(city);
    const res = await fetch(url);
    if (!res.ok) throw new Error("geocode http " + res.status);
    const json = await res.json();
    if (!json.results || !json.results.length) throw new Error("city not found");
    return { lat: json.results[0].latitude, lon: json.results[0].longitude,
             place: json.results[0].name };
  }

  /* Coordinates are cached so the geolocation permission prompt is not
     re-triggered on every new tab. */
  async function getCoords() {
    const city = await Store.getSetting("city", "");
    if (city) {
      const c = await geocodeCity(city);
      return { lat: c.lat, lon: c.lon, place: city };
    }
    const cached = await Store.getData("geoCache", null);
    if (cached && cached.lat && Date.now() - cached.ts < GEO_TTL) {
      return { lat: cached.lat, lon: cached.lon, place: cached.place || "" };
    }
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(new Error("no geolocation"));
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lon: pos.coords.longitude, place: "" };
          Store.setData("geoCache", { lat: coords.lat, lon: coords.lon, ts: Date.now() });
          resolve(coords);
        },
        (err) => reject(err),
        { timeout: 8000 }
      );
    });
  }

  async function update(force) {
    if (cache && !force && Date.now() - cache.ts < TTL) { render(cache.data, cache.place); return; }
    units = await Store.getSetting("units", "c");

    try {
      const coords = await getCoords();
      const data = await fetchWeather(coords.lat, coords.lon);
      cache = { ts: Date.now(), data, place: coords.place };
      render(data, coords.place);
    } catch (e) {
      $("weather-desc").textContent = "Weather unavailable";
      if (cache) render(cache.data, cache.place);
    }
  }

  async function init() {
    $("weather").addEventListener("click", (e) => {
      e.stopPropagation();
      const open = $("weather-detail").classList.toggle("open");
      $("weather").setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", (e) => {
      const detail = $("weather-detail");
      if (detail.classList.contains("open") &&
          !detail.contains(e.target) &&
          !$("weather").contains(e.target)) {
        detail.classList.remove("open");
      }
    });
    await update(false);
  }

  return {
    init,
    refresh: () => update(true),
    onUnitsChanged: () => { cache = null; update(true); }
  };
})();
