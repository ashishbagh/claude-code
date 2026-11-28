/* Shared helpers for LeetCode explainer scenes (classic script, loaded once from index.html).
   Everything is a pure function of time: scenes call these while building their paused timeline. */
(function () {
  const LC = {};

  /** Fade a scene's caption <span>s in and out. spans: [[selector, startFrac], ...] (fractions of T). */
  LC.captions = function (tl, T, spans) {
    spans.forEach(([sel, at], i) => {
      const start = at * T;
      const end = i + 1 < spans.length ? spans[i + 1][1] * T : T - 0.05;
      tl.fromTo(sel, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }, start);
      tl.to(sel, { opacity: 0, duration: 0.25, ease: "power1.in" }, Math.max(start + 0.4, end - 0.25));
    });
  };

  /** Swap stacked value <span>s (e.g. a counter 0 → 1 → 2) with a pop. items: [[selector, timeSec], ...]. */
  LC.values = function (tl, items) {
    items.forEach(([sel, at], i) => {
      tl.fromTo(sel, { opacity: 0, scale: 1.45 }, { opacity: 1, scale: 1, duration: 0.45, ease: "back.out(2.4)" }, at);
      if (i + 1 < items.length) tl.to(sel, { opacity: 0, duration: 0.12 }, items[i + 1][1]);
    });
  };

  /** Pop list items (call log, stack, queue) in at given seconds. */
  LC.listItems = function (tl, items) {
    items.forEach(([sel, at]) => {
      tl.fromTo(sel, { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }, at);
    });
  };

  /** Code highlight box moving over line ranges. ranges: [[firstLine, lastLine, startFrac, endFrac]]. */
  LC.codeHighlight = function (tl, T, sel, ranges, lineH) {
    ranges.forEach(([a, b, s, e], i) => {
      const y = a * lineH - 4, h = (b - a + 1) * lineH + 8;
      if (i === 0) tl.fromTo(sel, { opacity: 0, y, height: h }, { opacity: 1, duration: 0.3 }, s * T);
      else tl.to(sel, { y, height: h, duration: 0.45, ease: "power3.inOut" }, s * T);
    });
  };

  /** Channel outro (last slide, always): the markup is LC_OUTRO_HTML in SKILL.md, ids <prefix>-thanks/-sub/-social. */
  LC.outro = function (tl, prefix, at) {
    tl.fromTo(`#${prefix}-thanks`, { opacity: 0, y: 30, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.7)" }, at);
    tl.fromTo(`#${prefix}-sub`, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, at + 0.45);
    tl.fromTo(`#${prefix}-social`, { opacity: 0, y: 20, scale: 0.9 }, { opacity: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(2)" }, at + 0.85);
  };

  /** Drive a draw(t) function (Three.js / canvas) from the scene timeline: deterministic per frame. */
  LC.drive = function (tl, T, draw) {
    const p = { t: 0 };
    tl.fromTo(p, { t: 0 }, { t: T, duration: T, ease: "none", onUpdate: () => draw(p.t) }, 0);
    draw(0);
  };

  /** Easing/progress helpers for draw(t). */
  LC.clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  LC.smooth = (x) => { x = LC.clamp(x); return x * x * (3 - 2 * x); };
  LC.prog = (t, start, dur) => (dur > 0 ? LC.smooth((t - start) / dur) : t >= start ? 1 : 0);
  LC.stepAt = (t, start, end, n) => (t < start ? 0 : Math.min(n - 1, Math.floor(((t - start) / Math.max(end - start, 1e-6)) * n)));

  /* ---------- Three.js helpers ---------- */

  /** Renderer + scene + camera + studio lights on a canvas. shiftX moves the subject left (+) / right (-) in px. */
  LC.three = function (canvas, { fov = 34, shiftX = 0, shiftY = 0 } = {}) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    renderer.setPixelRatio(1);
    const W = window.LC_W || 1920, H = window.LC_H || 1080;   // set by build.py (1080x1920 for vertical)
    renderer.setSize(W, H, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, W / H, 0.1, 200);
    if (shiftX || shiftY) camera.setViewOffset(W, H, shiftX, shiftY, W, H);
    scene.add(new THREE.HemisphereLight(0xc4d6ff, 0x141428, 1.0));
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const key = new THREE.DirectionalLight(0xffe4b8, 2.2); key.position.set(6, 12, 7); scene.add(key);
    const rim = new THREE.DirectionalLight(0x6fa8ff, 0.7); rim.position.set(-8, 5, -6); scene.add(rim);
    return { renderer, scene, camera, render: () => renderer.render(scene, camera) };
  };

  /** Canvas texture with centred text (tile digits, node labels).
      Used as a material .map it MULTIPLIES the material colour: keep bg white (shows the colour) and draw
      the text darker/translucent; a transparent bg would render black. */
  LC.textTexture = function (text, { size = 256, bg = "#ffffff", fg = "rgba(0,0,0,0.5)", font = "700 150px Inter" } = {}) {
    const c = document.createElement("canvas"); c.width = c.height = size;
    const g = c.getContext("2d");
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, size, size); }
    g.fillStyle = fg; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, size / 2, size / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return tex;
  };

  LC.color = (hex) => new THREE.Color(hex);
  LC.mix = (a, b, k) => a.clone().lerp(b, LC.clamp(k));

  window.LC = LC;
})();

/** "Asked at" chips: pop each `.sd-co` inside `sel` in turn, starting at `at` seconds. */
window.LC.askedAt = function (tl, sel, at, gap = 0.12) {
  tl.fromTo(sel + " > em", { opacity: 0 }, { opacity: 1, duration: 0.3 }, at);
  document.querySelectorAll(sel + " .sd-co").forEach((el, i) =>
    tl.fromTo(el, { opacity: 0, y: 16, scale: 0.85 }, { opacity: 1, y: 0, scale: 1, duration: 0.35, ease: "back.out(2.2)" }, at + 0.1 + i * gap));
};

/** Route strip (9:16 spotlight): light step `idx` of the `.v-step` chips inside `sel` at each time.
    beats: [[timeSec, idx], ...]; the rest of the chips stay dim. */
window.LC.route = function (tl, sel, beats) {
  const chips = Array.prototype.slice.call(document.querySelectorAll(sel + " .v-step"));
  tl.set(chips, { opacity: 0.35, scale: 1 }, 0);
  beats.forEach(([at, idx]) => {
    tl.to(chips, { opacity: 0.35, scale: 1, duration: 0.2 }, at);
    if (chips[idx]) tl.to(chips[idx], { opacity: 1, scale: 1.12, duration: 0.3, ease: "back.out(2)" }, at);
  });
};
