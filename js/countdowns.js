/* DayStart — countdowns.js
   Event countdowns: name + target date. The next upcoming event is shown
   as a subtle chip under the clock; full list managed in its own panel. */

const Countdowns = (() => {
  let events = [];
  const $ = (id) => document.getElementById(id);
  const DAY = 86400000;

  async function load() {
    events = await Store.getSynced("countdowns", []);
    events.forEach((e) => { if (e.date) e.date = String(e.date).slice(0, 10); });
    render();
  }

  async function persist() {
    await Store.setSetting("countdowns", events);
  }

  function daysUntil(dateStr) {
    const target = new Date(dateStr + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.round((target - today) / DAY);
  }

  function labelFor(days) {
    if (days < 0) return "passed";
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return days + " days";
  }

  function render() {
    // Sort by date ascending
    events.sort((a, b) => a.date.localeCompare(b.date));

    // Chip under the clock: next upcoming event only
    const chip = $("countdown-chip");
    const next = events.find((e) => daysUntil(e.date) >= 0);
    if (next) {
      const d = daysUntil(next.date);
      chip.textContent = (d === 0 ? "\u{1F389} " : "\u23F3 ") +
        `${next.name} \u2014 ${labelFor(d)}`;
      chip.style.display = "";
    } else {
      chip.style.display = "none";
    }

    // Panel list
    const list = $("countdowns-list");
    list.innerHTML = "";
    if (events.length === 0) {
      const empty = document.createElement("div");
      empty.className = "links-empty";
      empty.textContent = "No events yet. Add one below.";
      list.appendChild(empty);
      return;
    }
    events.forEach((e, i) => {
      const row = document.createElement("div");
      row.className = "countdown-row" + (daysUntil(e.date) < 0 ? " past" : "");

      const left = document.createElement("div");
      left.className = "countdown-info";
      const name = document.createElement("span");
      name.className = "countdown-name";
      name.textContent = e.name;
      const date = document.createElement("span");
      date.className = "countdown-date";
      date.textContent = e.date;
      left.appendChild(name);
      left.appendChild(date);

      const badge = document.createElement("span");
      badge.className = "countdown-badge";
      badge.textContent = labelFor(daysUntil(e.date));

      const del = document.createElement("button");
      del.className = "habit-del";
      del.textContent = "\u2715";
      del.title = "Remove event";
      del.addEventListener("click", () => remove(i));

      row.appendChild(left);
      row.appendChild(badge);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  async function add(name, date) {
    name = (name || "").trim();
    if (!name || !date) return;
    events.push({ name, date });
    await persist();
    render();
  }

  async function remove(i) {
    events.splice(i, 1);
    await persist();
    render();
  }

  function bind() {
    $("countdown-add").addEventListener("click", async () => {
      const name = $("countdown-name-input").value.trim();
      const date = $("countdown-date-input").value;
      await add(name, date);
      $("countdown-name-input").value = "";
      $("countdown-date-input").value = "";
    });
    $("countdown-date-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter") $("countdown-add").click();
    });
  }

  return { init: async () => { await load(); bind(); } };
})();
