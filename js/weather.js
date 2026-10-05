/* DayStart — weather.js
   Weather via Open-Meteo (free, keyless). Auto-location via geolocation,
   or manual city via Open-Meteo geocoding. 5-day mini forecast. */

const Weather = (() => {
  let units = "c";
  let cache = null; // { ts, data }
  const $ = (id) => document.getElementById(id);
  const TTL = 30 * 60 * 1000; // 30 min cache

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

  function setDetail(text) {
    $("weather-desc").textContent = text;
  }

  function render(data) {
    if (!data) return;
    const cur = data.current;
    const [icon, desc] = CODES[cur.weather_code] || ["\uD83C\uDF24", "—"];
    $("weather-icon").textContent = icon;
    $("weather-temp").textContent = fmtTemp(cur.temperature_2m);
    setDetail(desc);

    // 3-day forecast: today + next two
    const daily = data.daily;
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const parts = [];
    for (let i = 1; i <= 3 && i < daily.time.length; i++) {
      const d = new Date(daily.time[i]);
      parts.push(`${names[d.getDay()]} ${fmtTemp(daily.temperature_2m_max[i])}`);
    }
    $("weather-forecast").textContent = parts.join("  \u00B7  ");
  }

  async function fetchWeather(lat, lon) {
    const unitParam = units === "f" ? "fahrenheit" : "celsius";
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,weather_code&daily=weather_code,temperature_2m_max` +
      `&forecast_days=4&temperature_unit=${unitParam}&timezone=auto`;
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
    return { lat: json.results[0].latitude, lon: json.results[0].longitude };
  }

  async function update(force) {
    if (cache && !force && Date.now() - cache.ts < TTL) { render(cache.data); return; }
    units = await Store.getSetting("units", "c");
    const city = await Store.getSetting("city", "");

    try {
      let coords;
      if (city) {
        coords = await geocodeCity(city);
      } else {
        coords = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject(new Error("no geolocation"));
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
            (err) => reject(err),
            { timeout: 8000 }
          );
        });
      }
      const data = await fetchWeather(coords.lat, coords.lon);
      cache = { ts: Date.now(), data };
      render(data);
    } catch (e) {
      setDetail("Weather unavailable");
    }
  }

  async function init() {
    $("weather").addEventListener("click", () => update(true));
    await update(false);
  }

  return {
    init,
    refresh: () => update(true),
    onUnitsChanged: () => { cache = null; update(true); }
  };
})();
