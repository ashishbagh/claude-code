/* 3D number row for LeetCode 152 Maximum Product Subarray (designed for the 1080x1920 reel).
   Row(canvas).draw(state), state derived from time only:
     appear  0..1           blocks rise one by one
     cur     float | null   scan pointer (glides between indices)
     seen    fn(i) -> 0..1  1 = already processed (lit)
     flip    fn(i) -> 0..1  a negative block spins 360° and glows red as it flips the sign
     best    [a, b] | null  best subarray so far, bestK 0..1 (gold frame under it)
     win     0..1           final pop of the best range
     orbit   radians                                                                     */
(function () {
  const NUMS = [2, 3, -2, 4, -1];
  const GAP = 1.45;

  function Row(canvas) {
    const LC = window.LC;
    const ctx = LC.three(canvas, { fov: 34, portraitFov: 52, portraitShiftY: 430 });
    const { scene, camera } = ctx;
    const C = { pos: LC.color("#3d5396"), neg: LC.color("#7a2a4a"), lit: LC.color("#4f6fd0"), negLit: LC.color("#c2416c"),
      red: LC.color("#ef4444"), gold: LC.color("#facc15") };
    const xOf = (i) => (i - (NUMS.length - 1) / 2) * GAP;

    const ground = new THREE.Mesh(new THREE.BoxGeometry(NUMS.length * GAP + 0.8, 0.1, 2.6),
      new THREE.MeshStandardMaterial({ color: 0x151b33, roughness: 0.85 }));
    ground.position.set(0, -0.05, 0.4); scene.add(ground);

    function label(text, fg, w, font = "800 140px Inter") {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({
        map: LC.textTexture(text, { bg: "rgba(0,0,0,0)", fg, font }), transparent: true, depthWrite: false }));
      m.material.depthTest = false; m.renderOrder = 10; scene.add(m); return m;
    }

    const blocks = NUMS.map((v, i) => {
      const base = v < 0 ? C.neg : C.pos;
      const side = new THREE.MeshStandardMaterial({ color: base, roughness: 0.55 });
      const face = new THREE.MeshStandardMaterial({ color: base, roughness: 0.5,
        map: LC.textTexture(String(v), { font: v < 0 ? "800 120px Inter" : "800 150px Inter" }) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), [side, side, face, side, face, side]);
      scene.add(m);
      const idx = label(String(i), "#8c98be", 0.5);
      return { m, side, face, idx, base, neg: v < 0 };
    });

    const frame = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, 1.6),
      new THREE.MeshStandardMaterial({ color: C.gold, emissive: C.gold, emissiveIntensity: 0.35, roughness: 0.4 }));
    scene.add(frame);
    const ptr = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.42, 3), new THREE.MeshBasicMaterial({ color: 0xfacc15 }));
    ptr.rotation.x = Math.PI; scene.add(ptr);
    const ptrLbl = label("x", "#facc15", 0.7);

    function draw(st) {
      const appear = st.appear ?? 1, a = st.orbit ?? 0;
      camera.position.set(Math.sin(a) * 13.5, 5.4, Math.cos(a) * 13.5 + 0.6);
      ground.visible = appear > 0.02;
      camera.lookAt(0, 0.6, 0.3);
      blocks.forEach((b, i) => {
        const k = LC.smooth(appear * 1.6 - i * 0.12);
        const seen = st.seen ? st.seen(i) : 0, fl = st.flip ? st.flip(i) : 0;
        const isCur = st.cur != null && Math.abs(st.cur - i) < 0.5;
        let col = LC.mix(b.base, b.neg ? C.negLit : C.lit, seen);
        col = LC.mix(col, C.red, Math.sin(Math.PI * fl) * 0.8);
        const inBest = st.best && i >= st.best[0] && i <= st.best[1];
        if (inBest && st.win) col = LC.mix(col, C.gold, 0.55 * st.win);
        b.side.color.copy(col); b.face.color.copy(col);
        b.m.visible = k > 0.01;
        const pop = st.win && inBest ? 0.12 * Math.sin(Math.PI * LC.clamp(st.win)) : 0;
        b.m.scale.setScalar((0.6 + 0.4 * k) * (1 + pop));
        b.m.rotation.x = -fl * Math.PI * 2;
        b.m.position.set(xOf(i), 0.55 + (isCur ? 0.3 : 0) + Math.sin(Math.PI * fl) * 0.6 - (1 - k) * 1.4, 0);
        b.idx.visible = k > 0.5;
        b.idx.position.set(xOf(i), -0.05, 1.15); b.idx.quaternion.copy(camera.quaternion);
      });
      // gold frame under the best subarray so far
      const bk = st.best ? (st.bestK ?? 1) : 0;
      frame.visible = bk > 0.02;
      if (st.best) {
        const [l, r] = st.best, w = (r - l) * GAP + 1.3;
        frame.scale.set(w * bk, 1, 1); frame.position.set((xOf(l) + xOf(r)) / 2, 0.02, 0);
      }
      // scan pointer above the current block
      const show = st.cur != null;
      ptr.visible = ptrLbl.visible = show;
      if (show) {
        const x = xOf(st.cur);
        ptr.position.set(x, 1.62, 0); ptrLbl.position.set(x, 2.1, 0); ptrLbl.quaternion.copy(camera.quaternion);
      }
      ctx.render();
    }
    return { draw };
  }

  /** Glide a value through [[timeSec, value]] steps (0.5 s per move). */
  Row.track = function (t, steps) {
    let v = steps[0][1];
    for (let i = 1; i < steps.length; i++) if (t >= steps[i][0]) v = v + (steps[i][1] - v) * window.LC.prog(t, steps[i][0], 0.5);
    return v;
  };
  /** A .lc-value box that starts on `prev` (already showing) and pops through items [[text, sec]]. */
  Row.vals = function (tl, sel, prev, items) {
    const box = document.querySelector(sel);
    const mk = (txt, op) => { const s = document.createElement("span"); s.textContent = txt; s.style.opacity = op; box.appendChild(s); return s; };
    const first = prev != null ? mk(prev, 1) : null;
    const spans = items.map(([txt]) => mk(txt, 0));
    if (first && items.length) tl.to(first, { opacity: 0, duration: 0.12 }, items[0][1]);
    window.LC.values(tl, spans.map((s, i) => [s, items[i][1]]));
  };
  Row.NUMS = NUMS;
  window.Row = Row;
})();
