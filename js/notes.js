/* DayStart — notes.js
   Fast notepad with debounced autosave. */

const Notes = (() => {
  let saveTimer = null;
  const $ = (id) => document.getElementById(id);
  const DEBOUNCE = 600;

  function status(text) {
    $("notes-saved").textContent = text;
  }

  function scheduleSave() {
    status("Typing\u2026");
    clearTimeout(saveTimer);
    saveTimer = setTimeout(save, DEBOUNCE);
  }

  async function save() {
    await Store.setData("notes", $("notes-area").value);
    const t = new Date();
    status("Saved at " + t.getHours().toString().padStart(2, "0") + ":" +
      t.getMinutes().toString().padStart(2, "0"));
  }

  async function init() {
    $("notes-area").value = await Store.getData("notes", "");
    $("notes-area").addEventListener("input", scheduleSave);
    status("Saved");
  }

  return { init };
})();
