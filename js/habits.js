/* DayStart — habits.js
   Habit tracker with daily check-off and streak counting. */

const Habits = (() => {
  let habits = [];
  const todayKey = () => new Date().toISOString().slice(0, 10);
  const $ = (id) => document.getElementById(id);

  async function load() {
    habits = await Store.getData("habits", []);
    rollDay();
    render();
  }

  /* If the date changed since last visit, clear done flags and update streaks. */
  async function rollDay() {
    let changed = false;
    habits.forEach((h) => {
      if (h.lastDone && h.lastDone !== todayKey()) {
        // streak survives one gap? No — classic streak breaks if yesterday missed.
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (h.lastDone !== yesterday) h.streak = 0;
        h.doneToday = false;
        changed = true;
      }
      if (!h.lastDone) { h.doneToday = false; changed = true; }
    });
    if (changed) await persist();
  }

  async function persist() {
    await Store.setData("habits", habits);
  }

  function render() {
    const list = $("habits-list");
    list.innerHTML = "";

    if (habits.length === 0) {
      const empty = document.createElement("div");
      empty.className = "links-empty";
      empty.textContent = "Track daily habits here.";
      list.appendChild(empty);
      return;
    }

    habits.forEach((h, i) => {
      const row = document.createElement("div");
      row.className = "habit-row" + (h.doneToday ? " done" : "");

      const check = document.createElement("span");
      check.className = "habit-check";
      check.textContent = "\u2713";
      check.title = "Mark done for today";
      check.addEventListener("click", () => toggle(i));

      const name = document.createElement("span");
      name.className = "habit-name";
      name.textContent = h.name;

      const streak = document.createElement("span");
      streak.className = "habit-streak";
      streak.textContent = (h.streak || 0) + " \u{1F525}";

      const del = document.createElement("button");
      del.className = "habit-del";
      del.textContent = "\u2715";
      del.title = "Delete habit";
      del.addEventListener("click", () => remove(i));

      row.appendChild(check);
      row.appendChild(name);
      row.appendChild(streak);
      row.appendChild(del);
      list.appendChild(row);
    });
  }

  async function toggle(i) {
    const h = habits[i];
    const t = todayKey();
    if (h.doneToday && h.lastDone === t) {
      h.doneToday = false;
      h.streak = Math.max(0, (h.streak || 0) - 1);
      h.lastDone = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    } else {
      h.doneToday = true;
      h.lastDone = t;
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      h.streak = (h.lastStreakDay === yesterday) ? (h.streak || 0) + 1 : (h.lastStreakDay === t ? h.streak : 1);
      h.lastStreakDay = t;
    }
    await persist();
    render();
  }

  async function add(name) {
    name = name.trim();
    if (!name) return;
    habits.push({ name, streak: 0, doneToday: false, lastDone: null, lastStreakDay: null });
    await persist();
    render();
  }

  async function remove(i) {
    habits.splice(i, 1);
    await persist();
    render();
  }

  function bind() {
    $("habits-add").addEventListener("click", () => {
      const name = prompt("New habit to build:");
      if (name) add(name);
    });
  }

  return { init: async () => { await load(); bind(); } };
})();
