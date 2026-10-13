/* DayStart — sounds.js
   Ambient soundscapes synthesized with the Web Audio API.
   No audio files, fully offline: rain, ocean, stream, wind,
   fireplace and night crickets.
   One cached AudioContext is reused for the whole session —
   creating a fresh context per play breaks cross-context node
   connections and leaks handles. Audio keeps playing when the
   panel closes (ambient), and is stopped explicitly. */

const Sounds = (() => {
  let master = null;
  let audioCtx = null;
  let current = null;         // id of active sound
  let stopFn = null;
  let volume = 0.6;
  const $ = (id) => document.getElementById(id);

  function ctx() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      master = audioCtx.createGain();
      master.gain.value = volume;
      master.connect(audioCtx.destination);
    }
    return audioCtx;
  }

  /* --- noise buffer helper --- */
  function noiseBuffer(ac, seconds = 2) {
    const buf = ac.createBuffer(1, ac.sampleRate * seconds, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function loopingNoise(ac, filterType, freq, q = 1) {
    const src = ac.createBufferSource();
    src.buffer = noiseBuffer(ac);
    src.loop = true;
    const filter = ac.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    filter.Q.value = q;
    src.connect(filter).connect(master);
    src.start();
    return { src, filter };
  }

  function lfoTo(param, ac, rate, depth, base) {
    param.value = base;
    const lfo = ac.createOscillator();
    const g = ac.createGain();
    lfo.frequency.value = rate;
    g.gain.value = depth;
    lfo.connect(g).connect(param);
    lfo.start();
    return lfo;
  }

  /* --- generators: each returns a stop() function --- */

  function rain(ac) {
    const { src, filter } = loopingNoise(ac, "bandpass", 1400, 0.6);
    const lfo = lfoTo(filter.frequency, ac, 0.2, 350, 1400);
    return () => { try { lfo.stop(); } catch (e) {} try { src.stop(); } catch (e) {} };
  }

  function ocean(ac) {
    const { src, filter } = loopingNoise(ac, "lowpass", 480, 0.8);
    const lfo = lfoTo(filter.frequency, ac, 0.11, 320, 480);
    return () => { try { lfo.stop(); } catch (e) {} try { src.stop(); } catch (e) {} };
  }

  function stream(ac) {
    const { src, filter } = loopingNoise(ac, "bandpass", 2600, 2.5);
    const bub = ac.createOscillator();
    const bg = ac.createGain();
    bub.frequency.value = 8; bg.gain.value = 900;
    bub.connect(bg).connect(filter.frequency);
    bub.start();
    return () => { try { src.stop(); } catch (e) {} try { bub.stop(); } catch (e) {} };
  }

  function wind(ac) {
    const { src, filter } = loopingNoise(ac, "bandpass", 420, 1.4);
    const lfo = lfoTo(filter.frequency, ac, 0.07, 260, 420);
    return () => { try { lfo.stop(); } catch (e) {} try { src.stop(); } catch (e) {} };
  }

  function fire(ac) {
    const { src, filter } = loopingNoise(ac, "lowpass", 900, 0.7);
    // random crackle bursts
    const crackle = setInterval(() => {
      if (Math.random() < 0.4) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "triangle";
        o.frequency.value = 90 + Math.random() * 200;
        g.gain.setValueAtTime(0.05 + Math.random() * 0.08, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.12);
        o.connect(g).connect(master);
        o.start(); o.stop(ac.currentTime + 0.15);
      }
    }, 140);
    return () => { clearInterval(crackle); try { src.stop(); } catch (e) {} };
  }

  function night(ac) {
    const { src } = loopingNoise(ac, "lowpass", 260, 0.5);
    const crickets = setInterval(() => {
      if (Math.random() < 0.65) {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = "sine";
        o.frequency.value = 4200 + Math.random() * 800;
        const t0 = ac.currentTime;
        for (let k = 0; k < 3; k++) {
          g.gain.setValueAtTime(0.0001, t0 + k * 0.09);
          g.gain.exponentialRampToValueAtTime(0.03, t0 + k * 0.09 + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, t0 + k * 0.09 + 0.07);
        }
        o.connect(g).connect(master);
        o.start(t0); o.stop(t0 + 0.35);
      }
    }, 900);
    return () => { clearInterval(crickets); try { src.stop(); } catch (e) {} };
  }

  const GENERATORS = { rain, ocean, stream, wind, fire, night };

  function updateIndicator() {
    const btn = document.getElementById("btn-sounds");
    if (btn) btn.classList.toggle("playing", !!current);
    const stopBtn = $("sound-stop");
    if (stopBtn) stopBtn.hidden = !current;
  }

  function play(id) {
    stop();
    const ac = ctx();
    ac.resume();
    stopFn = GENERATORS[id](ac);
    current = id;
    document.querySelectorAll(".sound-btn").forEach((b) =>
      b.classList.toggle("playing", b.dataset.sound === id));
    updateIndicator();
  }

  function stop() {
    if (stopFn) { try { stopFn(); } catch (e) { } stopFn = null; }
    current = null;
    document.querySelectorAll(".sound-btn").forEach((b) => b.classList.remove("playing"));
    updateIndicator();
  }

  function toggle(id) {
    if (current === id) stop();
    else play(id);
  }

  function setVolume(v) {
    volume = v;
    if (master) master.gain.value = v;
  }

  async function init() {
    volume = (await Store.getSetting("soundVolume", 60)) / 100;
    $("sound-volume").value = Math.round(volume * 100);
    document.querySelectorAll(".sound-btn").forEach((b) =>
      b.addEventListener("click", () => toggle(b.dataset.sound)));
    $("sound-stop").addEventListener("click", stop);
    $("sound-volume").addEventListener("input", async (e) => {
      setVolume(parseInt(e.target.value, 10) / 100);
      await Store.setSetting("soundVolume", parseInt(e.target.value, 10));
    });
  }

  return { init, stop, isPlaying: () => !!current };
})();
