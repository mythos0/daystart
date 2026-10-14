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
    /* Layered summer-night chorus:
       - a soft low "night air" bed
       - several close field crickets: chirps of 3-5 sine pulses (~4.2-4.8 kHz)
       - distant crickets, quieter and higher, wide stereo field
       - one trilling tree cricket with a fast continuous pulse train
       Each voice schedules its own chirps on a randomized timer so the
       chorus never sounds mechanical. All timers/nodes cleaned up on stop. */
    const timers = [];
    const stops = [loopingNoise(ac, "lowpass", 200, 0.4).src];

    function cricket(opts) {
      const { freq, gain, every, pulseMin, pulseMax, pulseGap, pan } = opts;
      const out = ac.createGain();
      out.gain.value = 0.0001;
      if (ac.createStereoPanner) {
        const panner = ac.createStereoPanner();
        panner.pan.value = pan;
        out.connect(panner).connect(master);
      } else {
        out.connect(master);
      }

      function chirp() {
        const n = pulseMin + Math.floor(Math.random() * (pulseMax - pulseMin + 1));
        const f = freq + Math.random() * 320;
        const t0 = ac.currentTime + 0.04;
        for (let k = 0; k < n; k++) {
          const ts = t0 + k * pulseGap;
          out.gain.setValueAtTime(0.0001, ts);
          out.gain.exponentialRampToValueAtTime(gain, ts + 0.012);
          out.gain.exponentialRampToValueAtTime(0.0001, ts + pulseGap * 0.72);
        }
        const o = ac.createOscillator();
        o.type = "sine";
        o.frequency.value = f;
        o.connect(out);
        o.start(t0);
        o.stop(t0 + n * pulseGap + 0.1);
        const next = every[0] + Math.random() * (every[1] - every[0]);
        timers.push(setTimeout(chirp, next * 1000));
      }
      timers.push(setTimeout(chirp, Math.random() * 900));
    }

    // close, full-sounding field crickets
    cricket({ freq: 4250, gain: 0.035, every: [0.8, 1.9],  pulseMin: 3, pulseMax: 4, pulseGap: 0.075, pan: -0.55 });
    cricket({ freq: 4550, gain: 0.032, every: [0.9, 2.2],  pulseMin: 3, pulseMax: 4, pulseGap: 0.07,  pan: 0.45 });
    cricket({ freq: 4400, gain: 0.03,  every: [1.1, 2.6],  pulseMin: 3, pulseMax: 5, pulseGap: 0.08,  pan: -0.15 });
    // distant crickets — quieter, higher, far sides
    cricket({ freq: 5150, gain: 0.016, every: [1.0, 2.8],  pulseMin: 3, pulseMax: 5, pulseGap: 0.065, pan: -0.9 });
    cricket({ freq: 5350, gain: 0.014, every: [1.3, 3.0],  pulseMin: 3, pulseMax: 5, pulseGap: 0.06,  pan: 0.85 });
    // one slow trilling tree cricket in the background
    cricket({ freq: 4700, gain: 0.012, every: [2.4, 4.5],  pulseMin: 9, pulseMax: 14, pulseGap: 0.046, pan: 0.2 });

    return () => {
      timers.forEach(clearTimeout);
      stops.forEach((s) => { try { s.stop(); } catch (e) {} });
    };
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
