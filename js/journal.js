/* DayStart — journal.js
   Daily journal: one entry per day with a reflective prompt,
   a mood check-in and three gratitude lines. Entries are stored
   locally (they can be personal) and are included in data export.
   Navigate between days with the arrows. Autosaves. */

const Journal = (() => {
  let entries = {};              // { "YYYY-MM-DD": { text, mood, gratitude:[..], ts } }
  let viewDate = null;           // ISO date string currently shown
  let saveTimer = null;
  let browsingPast = false;

  const $ = (id) => document.getElementById(id);
  const DEBOUNCE = 600;

  const PROMPTS = [
    "What are you looking forward to today?",
    "What would make today feel like a win?",
    "What is one thing you can do more slowly today?",
    "What drained your energy yesterday — and what refilled it?",
    "What are you avoiding, and what is the first tiny step?",
    "Who deserves a thank-you from you today?",
    "What did you learn recently that changed your thinking?",
    "If today were a chapter title, what would it be?",
    "What is something small you are grateful for right now?",
    "Where do you want to be one year from today?",
    "What worked well yesterday? Do more of it.",
    "What does your ideal calm evening look like?",
    "Which of your values do you want to honor today?",
    "What is one fear that shrinks when you write it down?",
    "What are you proud of this week?",
    "What would you tell a friend who had your to-do list?",
    "What is one habit your future self will thank you for?",
    "What sound, place or person makes you feel at peace?",
    "What is the most important thing — for real?",
    "What did you do today that your past self couldn't?",
    "If you had one extra free hour today, what would you do with it?",
    "What is a boundary you need to hold this week?",
    "What made you smile recently?",
    "How do you want to feel when you go to bed tonight?",
    "What is something you are ready to let go of?",
    "Which small win is hiding in today?",
    "What does rest look like for you — not just sleep?",
    "What is one thing you know is right but keep postponing?",
    "Describe today's weather inside you.",
    "What would 'enough' look like today?",
    "Who do you want to be in today's story?"
  ];

  const MOODS = ["\u{1F61E}", "\u{1F610}", "\u{1F642}", "\u{1F604}", "\u{1F929}"];
  const MOOD_LABELS = ["Rough", "Meh", "Okay", "Good", "Amazing"];

  function dateKey(offsetDays = 0) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.getFullYear() + "-" +
      String(d.getMonth() + 1).padStart(2, "0") + "-" +
      String(d.getDate()).padStart(2, "0");
  }

  function promptFor(key) {
    // deterministic per calendar day
    const n = key.split("-").reduce((a, p) => a + parseInt(p, 10), 0);
    return PROMPTS[n % PROMPTS.length];
  }

  function currentEntry() {
    return entries[viewDate] || { text: "", mood: 0, gratitude: ["", "", ""] };
  }

  function fmtHeader(key) {
    const d = new Date(key + "T00:00:00");
    const today = dateKey();
    if (key === today) return "Today — " + d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    const yest = dateKey(-1);
    if (key === yest) return "Yesterday — " + d.toLocaleDateString(undefined, { month: "long", day: "numeric" });
    return d.toLocaleDateString(undefined, { weekday: "short", month: "long", day: "numeric" });
  }

  function status(text) { $("journal-saved").textContent = text; }

  function render() {
    const e = currentEntry();
    $("journal-date").textContent = fmtHeader(viewDate);
    $("journal-prompt").textContent = promptFor(viewDate);
    $("journal-text").value = e.text || "";
    document.querySelectorAll(".mood-btn").forEach((b, i) =>
      b.classList.toggle("active", (e.mood || 0) === i + 1));
    ["g1", "g2", "g3"].forEach((id, i) => {
      $("journal-g" + (i + 1)).value = (e.gratitude && e.gratitude[i]) || "";
    });
    $("journal-prev").disabled = viewDate <= "2000-01-01";
    $("journal-next").disabled = viewDate >= dateKey();
    status("Saved");
  }

  function scheduleSave() {
    status("Typing\u2026");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, DEBOUNCE);
  }

  async function save() {
    entries[viewDate] = {
      text: $("journal-text").value,
      mood: moodValue(),
      gratitude: [$("journal-g1").value, $("journal-g2").value, $("journal-g3").value],
      ts: Date.now()
    };
    // Keep at most 730 entries (~2 years)
    const keys = Object.keys(entries).sort();
    while (keys.length > 730) delete entries[keys.shift()];
    await Store.setData("journal", entries);
    status("Saved \u00B7 " + new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    renderDots();
  }

  function moodValue() {
    const active = document.querySelector(".mood-btn.active");
    return active ? parseInt(active.dataset.mood, 10) : 0;
  }

  function renderDots() {
    // small hint of how many days have entries in the last 14 days
    const el = $("journal-history");
    if (!el) return;
    let count = 0;
    for (let i = 0; i < 14; i++) if (entries[dateKey(-i)]) count++;
    el.textContent = count ? (count + (count === 1 ? " entry" : " entries") + " in the last 2 weeks") : "";
  }

  function bind() {
    $("journal-prev").addEventListener("click", () => {
      const d = new Date(viewDate + "T00:00:00");
      d.setDate(d.getDate() - 1);
      commit(); // save current before navigating
      viewDate = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
      render();
    });
    $("journal-next").addEventListener("click", () => {
      if (viewDate >= dateKey()) return;
      const d = new Date(viewDate + "T00:00:00");
      d.setDate(d.getDate() + 1);
      commit();
      viewDate = d.getFullYear() + "-" +
        String(d.getMonth() + 1).padStart(2, "0") + "-" +
        String(d.getDate()).padStart(2, "0");
      render();
    });
    document.querySelectorAll(".mood-btn").forEach((b) =>
      b.addEventListener("click", () => {
        const e = currentEntry();
        e.mood = parseInt(b.dataset.mood, 10);
        entries[viewDate] = e;
        document.querySelectorAll(".mood-btn").forEach((x) =>
          x.classList.toggle("active", x === b));
        save();
      }));
    ["journal-text", "journal-g1", "journal-g2", "journal-g3"].forEach((id) =>
      $(id).addEventListener("input", scheduleSave));
  }

  function commit() {
    clearTimeout(saveTimer);
    save();
  }

  async function init() {
    entries = await Store.getData("journal", {});
    viewDate = dateKey();
    render();
    bind();
    renderDots();
  }

  return { init };
})();
