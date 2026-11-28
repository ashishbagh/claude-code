/* Rate Limiter part 2 – sliding window counter vs token bucket, "blueprint glow" stage.
   SWC(canvas).draw(state), every value derived from scene time:
     t        scene time (s)
     strip    { appear, status:[...] }   same pipeline strip as part 1 (CLIENT · LIMITER · API · REDIS · DB)
     view     [top, height]              main-stage band in px
     win      0..1                       the two minute-windows (PREV MIN | CURR MIN) on stage
     labels   ["12:00", "12:01"]         window captions (default PREV MIN / CURR MIN)
     reqs     [{ w: 0|1, f: 0..1, at: sec, ok: true|false }]   request cubes dropped into window w at fraction f
     boundary 0..1                       red pulse on the line between the two windows (boundary burst)
     now      { f: 0..1, k: 0..1 }       NOW marker at fraction f of the current window; k = visibility
     slide    0..1                       amber "last 60 s" frame ending at NOW, prev overlap shaded
     counts   { prev, curr, k }          numbers floating above each window
     bucket   0..1                       token bucket (part 1) on the left, windows shrink to the right
     tokens   n (0..4)                   tokens sitting in the bucket                                      */
(function () {
  const STAGES = [{ name: "CLIENT", color: "#34d399" }, { name: "LIMITER", color: "#ff9f2e" }, { name: "API", color: "#22d3ee" },
    { name: "REDIS", color: "#f472b6" }, { name: "DB", color: "#a78bfa" }];
  const WW = 3.3, WH = 1.7, GAP = 0.08;               // window width / height (scene units)
  const X0 = -WW - GAP / 2;                          // left edge of the prev window
  const xOf = (w, f) => X0 + w * (WW + GAP) + f * WW;  // x of fraction f inside window w

  function SWC(canvas) {
    const LC = window.LC, SD = window.SD;
    const R = SD.renderer(canvas);
    const strip = SD.strip(STAGES);
    const scene = new THREE.Scene(); SD.lights(scene);
    const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
    const C = (h) => new THREE.Color(h);
    const floor = SD.grid(20, 8, 0.6, 0x3b2a14); floor.position.y = -0.02; scene.add(floor);
    const lab = (txt, col, width = 2.0) => { const l = SD.label(txt, col, width, { font: "800 72px 'JetBrains Mono', monospace" }); return l; };

    // windows group (so it can shrink aside for the comparison)
    const G = new THREE.Group(); scene.add(G);
    const wins = [0, 1].map((w) => {
      const b = SD.wireBox(WW, WH, 1.2, C(w ? "#22d3ee" : "#a78bfa")); b.position.set(xOf(w, 0.5), WH / 2, 0); G.add(b); return b;
    });
    const wLab = [0, 1].map((w) => { const l = lab(w ? "CURR MIN" : "PREV MIN", w ? "#22d3ee" : "#a78bfa", 2.4); l.position.set(xOf(w, 0.5), -0.32, 0.9); G.add(l); return l; });
    const cLab = [0, 1].map((w) => { const l = lab("0", "#facc15", 1.7); l.position.set(xOf(w, w ? 0.62 : 0.18), WH - 0.35, 0.65); G.add(l); return l; });
    const cCache = {};
    const setCount = (w, n) => {
      const key = w + ":" + n;
      if (!cCache[key]) cCache[key] = SD.textTex(String(n), { fg: w ? "#22d3ee" : "#c4b5fd", font: "900 96px 'JetBrains Mono', monospace" });
      cLab[w].material.map = cCache[key]; cLab[w].material.needsUpdate = true;
    };
    const tLab = {};
    const setText = (w, txt) => {
      const key = "w" + w + txt;
      if (!tLab[key]) tLab[key] = SD.textTex(txt, { fg: w ? "#22d3ee" : "#a78bfa", font: "800 72px 'JetBrains Mono', monospace" });
      wLab[w].material.map = tLab[key];
    };
    // boundary line
    const bLine = new THREE.Mesh(new THREE.BoxGeometry(0.05, WH + 0.5, 0.05), new THREE.MeshBasicMaterial({ color: 0xf87171, transparent: true }));
    bLine.position.set(0, WH / 2 + 0.1, 0.62); G.add(bLine);
    // request cubes
    const reqs = Array.from({ length: 12 }, () => { const m = SD.glowCube(0.3, C("#e5e7eb")); G.add(m); return m; });
    // NOW marker + sliding 60 s frame + shaded overlap
    const nowM = new THREE.Mesh(new THREE.BoxGeometry(0.06, WH + 0.1, 0.06), new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true }));
    G.add(nowM);
    const nowL = lab("NOW", "#facc15", 1.6); G.add(nowL);
    const frame = SD.wireBox(WW, WH + 0.25, 1.45, C("#ff9f2e")); G.add(frame);
    const shade = new THREE.Mesh(new THREE.BoxGeometry(1, WH - 0.1, 1.1), new THREE.MeshBasicMaterial({ color: 0xff9f2e, transparent: true, opacity: 0.22, depthWrite: false }));
    G.add(shade);
    const pLab = lab("75%", "#ff9f2e", 1.9); G.add(pLab);
    const pCache = {};

    // token bucket (part 1) for the comparison
    const bucket = SD.wireBox(1.5, 2.3, 1.5, C("#ff9f2e")); bucket.position.set(-2.7, 1.15, 0); scene.add(bucket);
    const bLab = lab("TOKEN BUCKET", "#ff9f2e", 2.6); bLab.position.set(-2.7, -0.32, 1.0); scene.add(bLab);
    const toks = [0, 1, 2, 3].map((i) => { const m = SD.glowCube(0.4, C("#ffb347")); m.position.set(-2.7, 0.32 + i * 0.5, 0); scene.add(m); return m; });

    const white = C("#e5e7eb"), green = C("#34d399"), red = C("#f87171");

    function draw(st) {
      const t = st.t ?? 0;
      R.clear();
      if (st.strip) { strip.draw({ ...st.strip, t }); R.view(strip.scene, strip.camera, 290, 340); }
      camera.position.set(0, 2.4, 6.1); camera.lookAt(0, 0.88, 0); camera.fov = 30;

      const win = st.win ?? 0, bk = st.bucket ?? 0;
      floor.visible = win > 0.01 || bk > 0.01;
      // windows shrink to the right when the bucket comes in
      G.scale.setScalar(1 - 0.42 * bk); G.position.x = 2.1 * bk;
      wins.forEach((b, w) => { b.visible = win > 0.01; b.alpha(win); b.fill(0.05); });
      const labels = st.labels || ["PREV MIN", "CURR MIN"];
      wLab.forEach((l, w) => { l.visible = win > 0.01; setText(w, labels[w]); l.material.opacity = win; l.quaternion.copy(camera.quaternion); });

      // boundary pulse
      const bd = st.boundary ?? 0;
      bLine.visible = win > 0.01; bLine.material.opacity = 0.25 + 0.75 * bd * (0.6 + 0.4 * Math.sin(t * 9));
      bLine.material.color.copy(bd > 0.01 ? red : C("#52525b"));

      // request cubes, stacked per (window, f) column
      const stack = {};
      (st.reqs || []).forEach((r, i) => {
        const m = reqs[i]; if (!m) return;
        if (t < r.at || win < 0.01) { m.visible = false; return; }
        const key = r.w + ":" + Math.round(r.f * 40);
        const level = stack[key] = (stack[key] ?? -1) + 1;
        const k = LC.prog(t, r.at, 0.45);
        const y = 0.22 + level * 0.36 + (1 - k) * 1.8;
        m.visible = true; m.position.set(xOf(r.w, r.f), y, 0.15); m.rotation.set(0, (1 - k) * 2, 0);
        const col = r.ok === false ? red : r.ok === true ? LC.mix(white, green, LC.prog(t, r.at + 0.4, 0.3)) : white;
        m.material.color.copy(col); m.material.emissive.copy(col); m.material.opacity = 1;
      });
      for (let i = (st.reqs || []).length; i < reqs.length; i++) reqs[i].visible = false;

      // counts
      const cn = st.counts;
      cLab.forEach((l, w) => {
        l.visible = !!cn && (cn.k ?? 1) > 0.01 && win > 0.01;
        if (!l.visible) return;
        setCount(w, w ? cn.curr : cn.prev); l.material.opacity = cn.k ?? 1; l.quaternion.copy(camera.quaternion);
      });

      // NOW + sliding frame + overlap shade
      const nw = st.now || { f: 0, k: 0 }, nx = xOf(1, nw.f);
      nowM.visible = nw.k > 0.01; nowM.material.opacity = nw.k; nowM.position.set(nx, WH / 2 - 0.05, 0.7);
      nowL.visible = nw.k > 0.01; nowL.material.opacity = nw.k; nowL.position.set(nx, WH + 0.22, 0.7); nowL.quaternion.copy(camera.quaternion);
      const sl = st.slide ?? 0;
      frame.visible = sl > 0.01; frame.alpha(sl); frame.fill(0.04);
      frame.position.set(nx - WW / 2, WH / 2 + 0.05, 0);
      const ovStart = nx - WW, ovEnd = xOf(0, 1);            // overlap with the prev window
      const ovW = Math.max(0.001, ovEnd - ovStart);
      shade.visible = sl > 0.01 && ovW > 0.01; shade.material.opacity = 0.22 * sl;
      shade.scale.x = ovW; shade.position.set((ovStart + ovEnd) / 2, WH / 2, 0);
      const pct = Math.round((1 - nw.f) * 100) + "%";
      if (!pCache[pct]) pCache[pct] = SD.textTex(pct, { fg: "#ff9f2e", font: "900 84px 'JetBrains Mono', monospace" });
      pLab.material.map = pCache[pct];
      pLab.visible = sl > 0.3; pLab.material.opacity = sl; pLab.position.set((ovStart + ovEnd) / 2, WH - 0.35, 0.75); pLab.quaternion.copy(camera.quaternion);

      // bucket
      bucket.visible = bk > 0.01; bucket.alpha(bk); bucket.fill(0.08);
      bLab.visible = bk > 0.01; bLab.material.opacity = bk; bLab.quaternion.copy(camera.quaternion);
      toks.forEach((m, i) => { m.visible = bk > 0.01 && i < (st.tokens ?? 0); m.material.opacity = bk; m.scale.setScalar(1 + 0.05 * Math.sin(t * 4 + i)); });

      if (st.view) R.view(scene, camera, st.view[0], st.view[1]);
    }
    return { draw };
  }
  SWC.STAGES = STAGES;
  window.SWC = SWC;
})();
