/* SD – 3D toolkit for the "blueprint glow" system-design theme (needs three.min.js + lc.js).
   One WebGL canvas per scene, drawn in two viewports: the pipeline STRIP at the top (y 290–630)
   and the MAIN stage inside the frame (any y range). Everything is a pure function of time. */
(function () {
  const SD = {};

  /** Seeded PRNG (mulberry32) – deterministic "random" for particles. */
  SD.rand = function (seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  /** Renderer covering the whole frame; view(scene, camera, top, height) draws into a horizontal band. */
  SD.renderer = function (canvas) {
    const W = window.LC.W, H = window.LC.H;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true });
    r.setPixelRatio(1); r.setSize(W, H, false); r.setClearColor(0x000000, 0);
    r.outputColorSpace = THREE.SRGBColorSpace; r.autoClear = false; r.setScissorTest(true);
    return {
      r, W, H,
      clear() { r.setScissor(0, 0, W, H); r.setViewport(0, 0, W, H); r.clear(); },
      view(scene, camera, top, height) {
        camera.aspect = W / height; camera.updateProjectionMatrix();
        r.setViewport(0, H - top - height, W, height); r.setScissor(0, H - top - height, W, height);
        r.render(scene, camera);
      },
    };
  };

  SD.lights = function (scene) {
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const k = new THREE.DirectionalLight(0xfff0dd, 1.6); k.position.set(4, 8, 6); scene.add(k);
    const f = new THREE.DirectionalLight(0x88aaff, 0.5); f.position.set(-6, 3, -4); scene.add(f);
  };

  /** Text on a transparent plane (labels, ticks). Mono by default. */
  SD.textTex = function (text, { fg = "#ffffff", font = "700 64px 'JetBrains Mono', monospace", w = 512, h = 128, align = "center" } = {}) {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    const g = c.getContext("2d"); g.fillStyle = fg; g.font = font; g.textAlign = align; g.textBaseline = "middle";
    g.fillText(text, align === "center" ? w / 2 : 8, h / 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  };
  SD.label = function (text, color, width, opts = {}) {
    const w = opts.w || 512, h = opts.h || 128;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(width, width * h / w), new THREE.MeshBasicMaterial({
      map: SD.textTex(text, { fg: color, w, h, font: opts.font }), transparent: true, depthWrite: false }));
    m.material.depthTest = false; m.renderOrder = 20; return m;
  };

  /** Wireframe box: glowing edges + a faint glass face; .fill(k) brightens the faces, .tint(color). */
  SD.wireBox = function (w, h, d, color) {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(w, h, d);
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color, transparent: true }));
    const face = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25,
      transparent: true, opacity: 0.07, roughness: 0.6, depthWrite: false }));
    g.add(face, edges);
    g.fill = (k) => { face.material.opacity = 0.07 + 0.5 * k; face.material.emissiveIntensity = 0.25 + 0.6 * k; };
    g.tint = (c) => { edges.material.color.copy(c); face.material.color.copy(c); face.material.emissive.copy(c); };
    g.alpha = (a) => { edges.material.opacity = a; face.material.opacity = Math.min(face.material.opacity, a); };
    return g;
  };

  /** Solid glowing cube (tokens, requests, test cubes). */
  SD.glowCube = function (s, color) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshStandardMaterial({
      color, emissive: color, emissiveIntensity: 0.45, roughness: 0.35, transparent: true }));
    return m;
  };

  /** Floor grid of square cells (the tiled floor under 3D subjects). */
  SD.grid = function (nx, nz, cell, color = 0x3a2a18) {
    const pts = [];
    for (let i = 0; i <= nx; i++) pts.push(new THREE.Vector3(i * cell - nx * cell / 2, 0, -nz * cell / 2), new THREE.Vector3(i * cell - nx * cell / 2, 0, nz * cell / 2));
    for (let j = 0; j <= nz; j++) pts.push(new THREE.Vector3(-nx * cell / 2, 0, j * cell - nz * cell / 2), new THREE.Vector3(nx * cell / 2, 0, j * cell - nz * cell / 2));
    return new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }));
  };

  /** Particle text: points scattered in a cloud that converge into `text` (multi-colour), p 0..1. */
  SD.particleText = function (text, { count = 2200, width = 9, seed = 7, font = "900 150px Inter, sans-serif",
    colors = ["#34d399", "#ff9f2e", "#22d3ee", "#f472b6", "#a78bfa", "#facc15"] } = {}) {
    const c = document.createElement("canvas"); c.width = 1400; c.height = 260;
    const g = c.getContext("2d"); g.fillStyle = "#fff"; g.font = font; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 700, 130);
    const data = g.getImageData(0, 0, 1400, 260).data, hits = [];
    for (let y = 0; y < 260; y += 3) for (let x = 0; x < 1400; x += 3) if (data[(y * 1400 + x) * 4 + 3] > 128) hits.push([x, y]);
    let minX = 1400, maxX = 0; hits.forEach(([x]) => { minX = Math.min(minX, x); maxX = Math.max(maxX, x); });
    const sc = width / Math.max(1, maxX - minX), R = SD.rand(seed);
    const N = Math.min(count, hits.length * 3), start = new Float32Array(N * 3), end = new Float32Array(N * 3), delay = new Float32Array(N);
    const col = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const [hx, hy] = hits[Math.floor(R() * hits.length)];
      end[i * 3] = (hx - (minX + maxX) / 2) * sc + (R() - 0.5) * 0.04; end[i * 3 + 1] = (130 - hy) * sc; end[i * 3 + 2] = (R() - 0.5) * 0.25;
      const th = R() * Math.PI * 2, ph = Math.acos(2 * R() - 1), rr = 2.2 + R() * 2.2;
      start[i * 3] = rr * Math.sin(ph) * Math.cos(th) * 1.3; start[i * 3 + 1] = rr * Math.cos(ph) * 0.9; start[i * 3 + 2] = rr * Math.sin(ph) * Math.sin(th);
      delay[i] = R() * 0.35;
      const cc = new THREE.Color(colors[Math.floor((hx - minX) / Math.max(1, maxX - minX) * colors.length * 0.999)]);
      col[i * 3] = cc.r; col[i * 3 + 1] = cc.g; col[i * 3 + 2] = cc.b;
    }
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(start); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.055, vertexColors: true, transparent: true, depthWrite: false }));
    pts.update = function (p, t) {
      for (let i = 0; i < N; i++) {
        const k = window.LC.smooth((p - delay[i]) / 0.65);
        const wob = (1 - k) * 0.15;
        for (let a = 0; a < 3; a++) pos[i * 3 + a] = start[i * 3 + a] + (end[i * 3 + a] - start[i * 3 + a]) * k + wob * Math.sin(t * 1.7 + i * 0.37 + a);
      }
      geo.attributes.position.needsUpdate = true;
    };
    return pts;
  };

  /** Pipeline strip: a row of coloured wireframe stages on a rail.
      stages: [{name, color}]. draw({appear, status:[0 idle|1 active|2 done|3 error], t}) */
  SD.strip = function (stages) {
    const scene = new THREE.Scene(); SD.lights(scene);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    const n = stages.length, GAP = 1.75, xOf = (i) => (i - (n - 1) / 2) * GAP;
    const rail = new THREE.Mesh(new THREE.BoxGeometry(n * GAP + 0.6, 0.04, 1.5), new THREE.MeshStandardMaterial({ color: 0x121214, roughness: 0.9 }));
    rail.position.y = -0.62; scene.add(rail);
    const railGrid = SD.grid(Math.round((n * GAP + 0.6) / 0.25), 6, 0.25, 0x26262c); railGrid.position.y = -0.595; scene.add(railGrid);
    const lit = new THREE.Mesh(new THREE.BoxGeometry(1, 0.03, 0.06), new THREE.MeshBasicMaterial({ color: 0x34d399 }));
    lit.position.set(0, -0.58, 0.72); scene.add(lit);
    const checkTex = (col) => {
      const c = document.createElement("canvas"); c.width = c.height = 128; const g = c.getContext("2d");
      g.fillStyle = col; g.beginPath(); g.arc(64, 64, 60, 0, Math.PI * 2); g.fill();
      g.strokeStyle = "#08110c"; g.lineWidth = 14; g.lineCap = "round"; g.lineJoin = "round";
      g.beginPath(); g.moveTo(36, 66); g.lineTo(56, 86); g.lineTo(93, 44); g.stroke();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const S = stages.map((s, i) => {
      const c = new THREE.Color(s.color);
      const box = SD.wireBox(1.0, 1.0, 1.0, c); box.position.set(xOf(i), 0, 0); scene.add(box);
      const core = SD.glowCube(0.42, c); core.position.copy(box.position); scene.add(core);
      const name = SD.label(s.name, s.color, 1.75, { font: "800 72px 'JetBrains Mono', monospace" }); name.position.set(xOf(i), -1.0, 0.75); scene.add(name);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: c })); dot.position.set(xOf(i), 0.95, 0); scene.add(dot);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.13, 0.17, 32, 1, 0, Math.PI * 1.5), new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
      ring.position.set(xOf(i), 1.0, 0); scene.add(ring);
      const ok = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.42), new THREE.MeshBasicMaterial({ map: checkTex(s.color), transparent: true, depthWrite: false }));
      ok.position.set(xOf(i), 1.0, 0); scene.add(ok);
      return { box, core, name, dot, ring, ok, c };
    });
    const red = new THREE.Color("#f87171");
    function draw(st) {
      const appear = st.appear ?? 1, t = st.t ?? 0;
      camera.position.set(1.0, 2.0, 6.4); camera.lookAt(0.2, -0.2, 0);
      scene.visible = appear > 0.01;
      let lastDone = -1;
      S.forEach((s, i) => {
        const k = window.LC.smooth(appear * 1.8 - i * 0.12), stt = (st.status || [])[i] || 0;
        [s.box, s.core, s.name, s.dot, s.ring, s.ok].forEach((o) => { o.visible = k > 0.01; });
        s.box.scale.setScalar(0.5 + 0.5 * k); s.box.position.y = (1 - k) * -0.6;
        const col = stt === 3 ? red : s.c; s.box.tint(col);
        s.box.fill(stt === 2 ? 0.55 : stt === 3 ? 0.5 + 0.2 * Math.sin(t * 9) : stt === 1 ? 0.15 : 0);
        s.core.visible = k > 0.01 && (stt === 1 || stt === 3);
        s.core.material.color.copy(col); s.core.material.emissive.copy(col);
        s.core.scale.setScalar(1 + 0.12 * Math.sin(t * 5));
        s.dot.visible = k > 0.5 && stt === 0;
        s.ring.visible = k > 0.5 && stt === 1; s.ring.rotation.z = -t * 5;
        s.ok.visible = k > 0.5 && stt === 2;
        [s.name, s.ring, s.ok].forEach((o) => o.quaternion.copy(camera.quaternion));
        if (stt === 2) lastDone = i;
      });
      lit.visible = lastDone >= 0 && appear > 0.5;
      if (lastDone >= 0) { const w = xOf(lastDone) - xOf(0) + 0.6; lit.scale.x = w; lit.position.x = xOf(0) - 0.3 + w / 2; }
    }
    return { scene, camera, draw };
  };

  /** Rail progress: mark segment i of `.sd-rail` as filling over [a, b] seconds of the scene timeline. */
  SD.rail = function (tl, sel, i, a, b) {
    const host = document.querySelector(sel), seg = host && host.querySelectorAll("i")[i];
    if (seg) tl.fromTo(seg, { "--f": "0%" }, { "--f": "100%", duration: Math.max(0.1, b - a), ease: "none" }, a);
  };

  /** Type a command line: reveal characters with steps(). */
  SD.type = function (tl, sel, at, cps = 22) {
    const el = document.querySelector(sel); if (!el) return;
    const n = el.textContent.length + 2;
    tl.set(el, { opacity: 1, width: "0ch" }, at);
    tl.to(el, { width: n + "ch", duration: n / cps, ease: `steps(${n})` }, at);
  };

  /** A value slot that starts on `prev` (already showing) and pops through items [[text, sec]]. */
  SD.vals = function (tl, sel, prev, items) {
    const box = document.querySelector(sel); if (!box) return;
    box.style.position = "relative"; box.style.display = "inline-block";
    const mk = (txt, op, abs) => { const s = document.createElement("span"); s.textContent = txt; s.style.opacity = op;
      if (abs) { s.style.position = "absolute"; s.style.left = "0"; s.style.top = "0"; } box.appendChild(s); return s; };
    const first = mk(prev ?? "", 1, false);
    const spans = items.map(([txt]) => mk(txt, 0, true));
    items.forEach(([, at], i) => {
      tl.to(i === 0 ? first : spans[i - 1], { opacity: 0, duration: 0.1 }, at);
      tl.fromTo(spans[i], { opacity: 0, scale: 1.4 }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2.2)" }, at);
    });
  };
  /** Ticking counter: tween a number into `sel` (Indian grouping, e.g. 2,33,600). */
  SD.count = function (tl, sel, from, to, at, dur, suffix = "") {
    const el = document.querySelector(sel); if (!el) return;
    const o = { v: from }, put = () => { el.textContent = Math.round(o.v).toLocaleString("en-IN") + suffix; };
    put();
    tl.fromTo(o, { v: from }, { v: to, duration: dur, ease: "power2.out", onUpdate: put }, at);
  };

  /** Glowing dot crowd (users / servers / restaurants): seeded points in an ellipse, twinkling.
      update(t, k) – k 0..1 reveal. .pts = the positions (Vector3) to aim rays from. */
  SD.dotField = function ({ count = 260, cx = 0, cy = 1, rx = 1.5, ry = 0.9, rz = 0.8, seed = 3, color = "#ffb347", size = 0.07 } = {}) {
    const R = SD.rand(seed), pts = [], pos = new Float32Array(count * 3), ph = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = R() * Math.PI * 2, r = Math.sqrt(R());
      const p = new THREE.Vector3(cx + Math.cos(a) * r * rx, cy + Math.sin(a) * r * ry, (R() - 0.5) * 2 * rz);
      pts.push(p); pos.set([p.x, p.y, p.z], i * 3); ph[i] = R() * 6.28;
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({ color, size, transparent: true, depthWrite: false });
    const o = new THREE.Points(geo, mat);
    o.pts = pts;
    o.update = (t, k = 1) => { o.visible = k > 0.01; mat.opacity = k * (0.75 + 0.25 * Math.sin(t * 3)); mat.size = size * (0.9 + 0.1 * Math.sin(t * 5)); };
    return o;
  };

  /** Rays from source points to one target, each shooting out with its own delay.
      update(p) – p 0..1 overall progress; .color(c) recolours (amber → red when it breaks). */
  SD.rays = function (sources, target, { seed = 5, color = "#ff9f2e", opacity = 0.55 } = {}) {
    const R = SD.rand(seed), n = sources.length, pos = new Float32Array(n * 6), delay = sources.map(() => R() * 0.6);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
    const o = new THREE.LineSegments(geo, mat);
    o.update = (p) => {
      o.visible = p > 0.001;
      sources.forEach((s, i) => {
        const k = window.LC.smooth((p - delay[i]) / 0.4);
        pos.set([s.x, s.y, s.z, s.x + (target.x - s.x) * k, s.y + (target.y - s.y) * k, s.z + (target.z - s.z) * k], i * 6);
      });
      geo.attributes.position.needsUpdate = true;
    };
    o.color = (c) => mat.color.copy(c);
    return o;
  };
  window.SD = SD;
})();
