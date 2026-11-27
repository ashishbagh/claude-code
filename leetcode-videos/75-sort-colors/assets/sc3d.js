/* 3D colour blocks for LeetCode 75 Sort Colors (Dutch National Flag), designed for the 1080x1920 reel.
   Flag(canvas, nums).draw(state), state derived from time only:
     appear  0..1                 blocks rise one by one
     t       seconds              scene time (drives the swaps)
     swaps   [[sec, i, j], ...]   slot swaps, each animated as a 0.7 s arc (one block over, one under)
     lo, mid, hi  float | null    pointer positions (glide with Flag.track); null hides
     zones   0..1                 red strip under [0, lo), blue strip under (hi, n-1]
     win     0..1                 final pop of every block
     orbit   radians                                                                       */
(function () {
  const GAP = 1.3, SWAP = 0.7;
  const COL = ["#ef4444", "#f1f5f9", "#3b82f6"];

  function Flag(canvas, nums) {
    const LC = window.LC, N = nums.length;
    const ctx = LC.three(canvas, { fov: 34, portraitFov: 52, portraitShiftY: 430 });
    const { scene, camera } = ctx;
    const xOf = (i) => (i - (N - 1) / 2) * GAP;

    const ground = new THREE.Mesh(new THREE.BoxGeometry(N * GAP + 0.8, 0.1, 3.4),
      new THREE.MeshStandardMaterial({ color: 0x151b33, roughness: 0.85 }));
    ground.position.set(0, -0.05, 0.8); scene.add(ground);
    const strip = (hex) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1.5),
      new THREE.MeshStandardMaterial({ color: hex, emissive: hex, emissiveIntensity: 0.35, roughness: 0.4 })); scene.add(m); return m; };
    const zLo = strip(0xef4444), zHi = strip(0x3b82f6);

    function label(text, fg, w, font = "800 140px Inter") {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({
        map: LC.textTexture(text, { bg: "rgba(0,0,0,0)", fg, font }), transparent: true, depthWrite: false }));
      m.material.depthTest = false; m.renderOrder = 10; scene.add(m); return m;
    }

    const blocks = nums.map((v) => {
      const c = LC.color(COL[v]);
      const side = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
      const face = new THREE.MeshStandardMaterial({ color: c, roughness: 0.45,
        map: LC.textTexture(String(v), { fg: v === 1 ? "rgba(15,23,42,0.75)" : "rgba(0,0,0,0.45)", font: "800 150px Inter" }) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.0, 1.0), [side, side, face, side, face, side]);
      scene.add(m); return { m };
    });
    const idx = nums.map((_, i) => label(String(i), "#8c98be", 0.45));

    function pointer(text, color) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.32, 3), new THREE.MeshBasicMaterial({ color }));
      cone.rotation.x = -Math.PI / 2; scene.add(cone);
      const lbl = label(text, "#" + color.toString(16).padStart(6, "0"), 0.72);
      return { cone, lbl };
    }
    const P = { lo: pointer("lo", 0xf87171), mid: pointer("mid", 0xfacc15), hi: pointer("hi", 0x60a5fa) };

    function draw(st) {
      const appear = st.appear ?? 1, a = st.orbit ?? 0, t = st.t ?? 0;
      camera.position.set(Math.sin(a) * 14, 6.0, Math.cos(a) * 14 + 1.0);
      camera.lookAt(0, 0.3, 0.8);
      ground.visible = appear > 0.02;

      // where is every block: replay the swaps up to t
      const at = nums.map((_, i) => i);          // at[slot] = block
      const pos = nums.map((_, b) => ({ x: xOf(b), y: 0, z: 0 }));
      (st.swaps || []).forEach(([ts, i, j]) => {
        if (t < ts) return;
        const p = LC.prog(t, ts, SWAP), bi = at[i], bj = at[j];
        if (p < 1 && i !== j) {
          const arc = Math.sin(Math.PI * p);
          pos[bi] = { x: xOf(i) + (xOf(j) - xOf(i)) * p, y: arc * 1.3, z: 0 };
          pos[bj] = { x: xOf(j) + (xOf(i) - xOf(j)) * p, y: 0, z: arc * 1.4 };
        } else { pos[bi] = { x: xOf(j), y: 0, z: 0 }; pos[bj] = { x: xOf(i), y: 0, z: 0 }; }
        at[i] = bj; at[j] = bi;
      });

      blocks.forEach((b, i) => {
        const k = LC.smooth(appear * 1.6 - i * 0.1);
        const pop = st.win ? 0.15 * Math.sin(Math.PI * LC.clamp(st.win - i * 0.06)) : 0;
        b.m.visible = k > 0.01;
        b.m.scale.setScalar((0.6 + 0.4 * k) * (1 + pop));
        b.m.position.set(pos[i].x, 0.55 + pos[i].y + pop * 2 - (1 - k) * 1.4, pos[i].z);
      });
      idx.forEach((l, i) => { l.visible = appear > 0.5; l.position.set(xOf(i), -0.05, 2.35); l.quaternion.copy(camera.quaternion); });

      // sorted zones
      const zk = st.zones ?? 0;
      const setStrip = (m, l, r) => {
        m.visible = zk > 0.02 && r >= l;
        if (m.visible) { m.scale.set(((r - l) * GAP + 1.1) * zk, 1, 1); m.position.set((xOf(l) + xOf(r)) / 2, 0.0, 0); }
      };
      setStrip(zLo, 0, st.lo != null ? Math.round(st.lo) - 1 : -1);
      setStrip(zHi, st.hi != null ? Math.round(st.hi) + 1 : N, N - 1);

      // pointers in front of the row: lo / hi on one lane, mid on a lane further forward
      // lo / hi sit in front of the row, mid hangs above its block
      ["lo", "hi", "mid"].forEach((n) => {
        const p = P[n], v = st[n], show = v != null;
        p.cone.visible = p.lbl.visible = show;
        if (!show) return;
        let x = xOf(v);
        if (n !== "mid" && st.lo != null && st.hi != null && Math.abs(st.lo - st.hi) < 0.6) x += n === "lo" ? -0.3 : 0.3;
        if (n === "mid") {
          p.cone.rotation.set(Math.PI, 0, 0); p.cone.position.set(x, 1.38, 0);
          p.lbl.position.set(x, 1.82, 0);
        } else {
          p.cone.position.set(x, 0.05, 0.78);
          p.lbl.position.set(x, 0.12, 1.55);
        }
        p.lbl.quaternion.copy(camera.quaternion);
      });
      ctx.render();
    }
    return { draw };
  }

  /** Glide a pointer through [[timeSec, index]] steps (0.5 s per move). */
  Flag.track = function (t, steps) {
    let v = steps[0][1];
    for (let i = 1; i < steps.length; i++) if (t >= steps[i][0]) v = v + (steps[i][1] - v) * window.LC.prog(t, steps[i][0], 0.5);
    return v;
  };
  /** A .lc-value box that starts on `prev` (already showing) and pops through items [[text, sec]]. */
  Flag.vals = function (tl, sel, prev, items) {
    const box = document.querySelector(sel);
    const mk = (txt, op) => { const s = document.createElement("span"); s.textContent = txt; s.style.opacity = op; box.appendChild(s); return s; };
    const first = prev != null ? mk(prev, 1) : null;
    const spans = items.map(([txt]) => mk(txt, 0));
    if (first && items.length) tl.to(first, { opacity: 0, duration: 0.12 }, items[0][1]);
    window.LC.values(tl, spans.map((s, i) => [s, items[i][1]]));
  };
  window.Flag = Flag;
})();
