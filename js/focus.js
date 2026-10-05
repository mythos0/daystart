/* DayStart — focus.js
   Daily focus: "What is your main focus for today?" Resets each day. */

const Focus = (() => {
  const todayKey = () => new Date().toISOString().slice(0, 10);
  let state = { date: "", text: "", done: false };
  const $ = (id) => document.getElementById(id);

  async function load() {
    const saved = await Store.getData("focus", null);
    if (saved && saved.date === todayKey()) {
      state = saved;
    } else if (saved && saved.text && !saved.date) {
      // migration safety
      state = { date: todayKey(), text: saved.text, done: false };
    } else {
      state = { date: todayKey(), text: "", done: false };
    }
    render();
  }

  async function save() {
    await Store.setData("focus", state);
  }

  function render() {
    const input = $("focus-input");
    input.value = state.text;
    input.classList.toggle("done", !!state.done);
    $("focus-done").style.display = state.text ? "" : "none";
    $("focus-clear").style.display = state.text ? "" : "none";
    $("focus-prompt").textContent = state.text
      ? "Your main focus for today:"
      : "What is your main focus for today?";
  }

  async function setText(text) {
    state = { date: todayKey(), text: text.trim(), done: false };
    await save();
    render();
  }

  function bind() {
    const input = $("focus-input");
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { input.blur(); }
    });
    input.addEventListener("blur", () => {
      if (input.value.trim() !== state.text) setText(input.value);
    });
    $("focus-done").addEventListener("click", async () => {
      if (!state.text) return;
      state.done = !state.done;
      await save();
      render();
    });
    $("focus-clear").addEventListener("click", () => setText(""));
  }

  return { init: async () => { await load(); bind(); } };
})();
