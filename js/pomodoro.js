/* DayStart — pomodoro.js
   Focus timer with configurable focus/break lengths, progress ring,
   desktop notification and a soft chime (Web Audio, no files needed).
   The running timer is persisted with an absolute end timestamp so it
   survives tab reloads and new tabs. */

const Pomodoro = (() => {
  let focusMin = 25, breakMin = 5;
  let mode = "focus";           // focus | break
  let remaining = 0;            // seconds
  let total = 0;                // seconds of current phase
  let running = false;
  let autoStart = false;
  let ticker = null;
  let sessionsToday = 0;
  let audioCtx = null;

  const $ = (id) => document.getElementById(id);
  const RING_LEN = 2 * Math.PI * 54;

  function todayKey() { return new Date().toISOString().slice(0, 10); }

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

  /* Persist an absolute end timestamp so the timer survives reloads. */
  async function persistState() {
    await Store.setData("pomoState", {
      mode, running,
      remaining,
      endAt: running ? Date.now() + remaining * 1000 : null
    });
  }

  function phaseComplete() {
    if (mode === "focus") {
      sessionsToday++;
      Store.setData("pomoSessions", { date: todayKey(), count: sessionsToday });
      chime("done");
      notify("Focus session complete", "Well done. Time for a break.");
    } else {
      chime("break");
      notify("Break finished", "Ready for the next focus session?");
    }
    const next = mode === "focus" ? "break" : "focus";
    setMode(next);
    if (autoStart) {
      running = true;
      persistState();
    } else {
      running = false;
      clearInterval(ticker);
      persistState();
    }
  }

  function tick() {
    remaining--;
    if (remaining <= 0) {
      phaseComplete();
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
      persistState();
    } else {
      if (remaining <= 0) setMode(mode);
      running = true;
      ticker = setInterval(tick, 1000);
      persistState();
      try { ctx().resume(); } catch (e) { }
    }
    render();
  }

  function reset() {
    clearInterval(ticker);
    running = false;
    setMode(mode);
    persistState();
    render();
  }

  function skip() {
    clearInterval(ticker);
    running = false;
    setMode(mode === "focus" ? "break" : "focus");
    persistState();
    render();
  }

  function startTicking() {
    clearInterval(ticker);
    ticker = setInterval(tick, 1000);
  }

  async function loadStats() {
    const s = await Store.getData("pomoSessions", null);
    sessionsToday = s && s.date === todayKey() ? s.count : 0;
  }

  /* Restore a timer that was running before the tab was closed/reloaded. */
  async function restoreState() {
    const st = await Store.getData("pomoState", null);
    if (!st) return;
    if (st.mode === "break" || st.mode === "focus") mode = st.mode;
    total = (mode === "focus" ? focusMin : breakMin) * 60;
    if (st.running && st.endAt) {
      const leftMs = st.endAt - Date.now();
      if (leftMs > 0) {
        remaining = Math.ceil(leftMs / 1000);
        running = true;
        startTicking();
        return;
      }
      // Phase finished while the tab was closed
      if (mode === "focus") {
        sessionsToday++;
        Store.setData("pomoSessions", { date: todayKey(), count: sessionsToday });
      }
      setMode(mode === "focus" ? "break" : "focus");
      running = false;
      persistState();
      return;
    }
    remaining = typeof st.remaining === "number" && st.remaining > 0
      ? Math.min(st.remaining, total) : total;
    running = false;
  }

  async function init() {
    focusMin = await Store.getSetting("pomoFocus", 25);
    breakMin = await Store.getSetting("pomoBreak", 5);
    autoStart = await Store.getSetting("pomoAuto", false);
    $("pomo-focus-min").value = focusMin;
    $("pomo-break-min").value = breakMin;
    $("pomo-auto").checked = autoStart;
    await loadStats();
    await restoreState();
    if (!running) { if (remaining <= 0) setMode(mode); }
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
    $("pomo-auto").addEventListener("change", async (e) => {
      autoStart = e.target.checked;
      await Store.setSetting("pomoAuto", autoStart);
    });
  }

  return { init };
})();
