/* 3D sorted array for LeetCode 704 Binary Search (designed for the 1080x1920 reel).
   Arr(canvas).draw(state), state derived from time only:
     appear   0..1             blocks rise one by one
     lo, hi   floats | null    pointer positions (glide between indices); null hides them
     mid      int | null       highlighted middle block, midK 0..1
     alive    fn(i) -> 0..1    1 = still in the search space, 0 = discarded (dim + sunk)
     found    0..1             mid block turns green and pops
     orbit    radians                                                                      */
(function () {
  const NUMS = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
  const GAP = 1.0;

  function Arr(canvas) {
    const LC = window.LC;
    const ctx = LC.three(canvas, { fov: 34, shiftX: 0, portraitFov: 64, portraitShiftY: 420 });
    const { scene, camera } = ctx;
    const C = { base: LC.color("#3d5396"), dim: LC.color("#1f2540"), mid: LC.color("#facc15"),
      found: LC.color("#22c55e") };
    const xOf = (i) => (i - (NUMS.length - 1) / 2) * GAP;

    const ground = new THREE.Mesh(new THREE.BoxGeometry(NUMS.length * GAP + 0.8, 0.1, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x151b33, roughness: 0.85 }));
    ground.position.set(0, -0.05, 0.7); scene.add(ground);

    function label(text, fg, w) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({
        map: LC.textTexture(text, { bg: "rgba(0,0,0,0)", fg, font: "800 140px Inter" }), transparent: true, depthWrite: false }));
      m.material.depthTest = false; m.renderOrder = 10;
      scene.add(m); return m;
    }

    const blocks = NUMS.map((v, i) => {
      const side = new THREE.MeshStandardMaterial({ color: C.base, roughness: 0.55 });
      const face = new THREE.MeshStandardMaterial({ color: C.base, roughness: 0.5,
        map: LC.textTexture(String(v), { font: v > 9 ? "800 120px Inter" : "800 150px Inter" }) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.86, 0.86), [side, side, face, side, face, side]);
      m.position.set(xOf(i), 0.43, 0); scene.add(m);
      const idx = label(String(i), "#8c98be", 0.42);
      return { m, side, face, idx };
    });

    function pointer(text, color) {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.3, 3), new THREE.MeshBasicMaterial({ color }));
      cone.rotation.x = -Math.PI / 2; scene.add(cone);
      const lbl = label(text, "#" + color.toString(16).padStart(6, "0"), 0.62);
      return { cone, lbl };
    }
    const P = { lo: pointer("lo", 0x38bdf8), mid: pointer("mid", 0xfacc15), hi: pointer("hi", 0xf472b6) };

    function draw(st) {
      const appear = st.appear ?? 1, a = st.orbit ?? 0;
      const D = LC.portrait ? 14.2 : 11, Hc = LC.portrait ? 6.4 : 5.2;   // portrait: pull back so all 10 fit
      camera.position.set(Math.sin(a) * D, Hc, Math.cos(a) * D + 1.2);
      camera.lookAt(0, 0.2, 0.6);
      blocks.forEach((b, i) => {
        const k = LC.smooth(appear * 1.7 - i * 0.07);
        const alive = st.alive ? st.alive(i) : 1;
        b.m.visible = k > 0.01;
        let col = LC.mix(C.dim, C.base, alive);
        let lift = 0, sc = 1;
        if (st.mid === i) {
          const mk = st.midK ?? 1;
          col = LC.mix(col, C.mid, mk); lift = 0.35 * mk;
          if (st.found) { col = LC.mix(col, C.found, st.found); sc = 1 + 0.18 * Math.sin(Math.PI * LC.clamp(st.found)); lift += 0.15 * st.found; }
        }
        b.side.color.copy(col); b.face.color.copy(col);
        b.m.scale.setScalar(sc * (0.6 + 0.4 * k));
        b.m.position.y = 0.43 + lift - (1 - alive) * 0.28 - (1 - k) * 1.4;
        b.idx.visible = k > 0.5;
        b.idx.position.set(xOf(i), 1.25 + lift, 0); b.idx.quaternion.copy(camera.quaternion);
        b.idx.material.opacity = 0.4 + 0.6 * alive;
      });
      // pointers in front of the row; lo/hi stagger in z so they never sit on top of each other
      [["lo", st.lo, 1.05], ["hi", st.hi, 1.05], ["mid", st.mid, 1.85]].forEach(([n, v, z]) => {
        const p = P[n], show = v != null && v >= 0 && (n !== "mid" || (st.midK ?? 1) > 0.05);
        p.cone.visible = p.lbl.visible = show;
        if (!show) return;
        let x = xOf(v);
        if (n !== "mid" && st.lo != null && st.hi != null && Math.abs(st.lo - st.hi) < 0.6) x += n === "lo" ? -0.3 : 0.3;
        p.cone.position.set(x, 0.05, z - 0.35);
        p.lbl.position.set(x, 0.25, z + 0.05); p.lbl.quaternion.copy(camera.quaternion);
      });
      ctx.render();
    }
    return { draw };
  }

  /** Glide a pointer through [[timeSec, index]] steps (0.5 s per move). */
  Arr.track = function (t, steps) {
    let v = steps[0][1];
    for (let i = 1; i < steps.length; i++) if (t >= steps[i][0]) v = v + (steps[i][1] - v) * window.LC.prog(t, steps[i][0], 0.5);
    return v;
  };
  Arr.NUMS = NUMS;
  window.Arr = Arr;
})();
