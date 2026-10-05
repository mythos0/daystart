/* DayStart — pomodoro.js
   Focus timer with configurable focus/break lengths, progress ring,
   desktop notification and a soft chime (Web Audio, no files needed). */

const Pomodoro = (() => {
  let focusMin = 25, breakMin = 5;
  let mode = "focus";           // focus | break
  let remaining = 0;            // seconds
  let total = 0;                // seconds of current phase
  let running = false;
  let ticker = null;
  let sessionsToday = 0;
  let lastCountDate = null;
  let audioCtx = null;

  const $ = (id) => document.getElementById(id);
  const RING_LEN = 2 * Math.PI * 54;

  function ctx() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function chime(kind) {
    try {
      const ac = ctx();
      const now = ac.currentTime;
      const notes = kind === "done" ? [523.25, 659.25, 783.99] : [659.25, 523.25];
      notes.forEach((f, i) => {
        const osc = ac.createOscillator();
        const gain = ac.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        gain.gain.setValueAtTime(0.0001, now + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.18 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.9);
        osc.connect(gain).connect(ac.destination);
        osc.start(now + i * 0.18);
        osc.stop(now + i * 0.18 + 1);
      });
    } catch (e) { /* audio unavailable */ }
  }

  function notify(title, body) {
    try {
      if (chrome.notifications) {
        chrome.notifications.create({
          type: "basic",
          iconUrl: chrome.runtime.getURL("icons/icon128.png"),
          title,
          message: body
        });
      }
    } catch (e) { /* notifications unavailable */ }
  }

  function render() {
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    $("pomo-face").textContent = String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    $("pomo-mode").textContent = mode === "focus" ? "Focus session" : "Break time";
    const ring = $("pomo-ring");
    ring.classList.toggle("break", mode === "break");
    const frac = total > 0 ? remaining / total : 0;
    ring.style.strokeDashoffset = String(RING_LEN * (1 - frac));
    $("pomo-count").textContent = String(sessionsToday);
    $("pomo-start").textContent = running ? "Pause" : "Start";
  }

  function tick() {
    remaining--;
    if (remaining <= 0) {
      if (mode === "focus") {
        sessionsToday++;
        Store.setData("pomoSessions", { date: new Date().toISOString().slice(0, 10), count: sessionsToday });
        chime("done");
        notify("Focus session complete", "Well done. Time for a break.");
        setMode("break");
      } else {
        chime("break");
        notify("Break finished", "Ready for the next focus session?");
        setMode("focus");
      }
      running = false;
      clearInterval(ticker);
    }
    render();
  }

  function setMode(m) {
    mode = m;
    total = (mode === "focus" ? focusMin : breakMin) * 60;
    remaining = total;
  }

  function startPause() {
    if (running) {
      clearInterval(ticker);
      running = false;
    } else {
      if (remaining <= 0) setMode(mode);
      running = true;
      ticker = setInterval(tick, 1000);
      try { ctx().resume(); } catch (e) { }
    }
    render();
  }

  function reset() {
    clearInterval(ticker);
    running = false;
    setMode(mode);
    render();
  }

  function skip() {
    if (mode === "focus") { setMode("break"); } else { setMode("focus"); }
    clearInterval(ticker);
    running = false;
    render();
  }

  async function loadStats() {
    const s = await Store.getData("pomoSessions", null);
    const today = new Date().toISOString().slice(0, 10);
    sessionsToday = s && s.date === today ? s.count : 0;
  }

  async function init() {
    focusMin = await Store.getSetting("pomoFocus", 25);
    breakMin = await Store.getSetting("pomoBreak", 5);
    $("pomo-focus-min").value = focusMin;
    $("pomo-break-min").value = breakMin;
    await loadStats();
    setMode("focus");
    render();

    $("pomo-start").addEventListener("click", startPause);
    $("pomo-reset").addEventListener("click", reset);
    $("pomo-skip").addEventListener("click", skip);

    $("pomo-focus-min").addEventListener("change", async (e) => {
      focusMin = Math.min(90, Math.max(5, parseInt(e.target.value, 10) || 25));
      e.target.value = focusMin;
      await Store.setSetting("pomoFocus", focusMin);
      if (mode === "focus" && !running) { setMode("focus"); render(); }
    });
    $("pomo-break-min").addEventListener("change", async (e) => {
      breakMin = Math.min(30, Math.max(1, parseInt(e.target.value, 10) || 5));
      e.target.value = breakMin;
      await Store.setSetting("pomoBreak", breakMin);
      if (mode === "break" && !running) { setMode("break"); render(); }
    });
  }

  return { init };
})();
