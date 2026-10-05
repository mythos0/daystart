/* DayStart — panels.js
   Side-panel open/close management (single panel at a time). */

const Panels = (() => {
  let active = null;
  const DOCK_MAP = {
    "panel-pomodoro": "btn-pomodoro",
    "panel-notes": "btn-notes",
    "panel-sounds": "btn-sounds",
    "panel-settings": "btn-settings"
  };

  function toggle(id) {
    if (active === id) { close(); return; }
    close();
    const el = document.getElementById(id);
    el.classList.add("open");
    el.setAttribute("aria-hidden", "false");
    active = id;
    const dockBtn = document.getElementById(DOCK_MAP[id]);
    if (dockBtn) dockBtn.classList.add("active");
    const focusTarget = el.querySelector("input, textarea");
    if (focusTarget && id !== "panel-pomodoro") focusTarget.focus();
  }

  function close() {
    if (!active) return;
    const el = document.getElementById(active);
    el.classList.remove("open");
    el.setAttribute("aria-hidden", "true");
    const dockBtn = document.getElementById(DOCK_MAP[active]);
    if (dockBtn) dockBtn.classList.remove("active");
    active = null;
    Sounds.stop();
  }

  function isOpen(id) { return active === id; }

  function bind() {
    document.querySelectorAll(".panel-close").forEach((btn) =>
      btn.addEventListener("click", close));

    document.getElementById("btn-pomodoro").addEventListener("click", () => toggle("panel-pomodoro"));
    document.getElementById("btn-notes").addEventListener("click", () => toggle("panel-notes"));
    document.getElementById("btn-sounds").addEventListener("click", () => toggle("panel-sounds"));
    document.getElementById("btn-settings").addEventListener("click", () => toggle("panel-settings"));
  }

  return { bind, toggle, close, isOpen };
})();
