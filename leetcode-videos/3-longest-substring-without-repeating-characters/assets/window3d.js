/* 3D sliding window for LeetCode 3 (s = "pwwkew"), shared by the walkthrough scenes.
   Win(canvas).draw(state), state derived from time only:
     appear   0..1          blocks rise one by one
     L, R     floats        window bounds (interpolated while moving); R < 0 hides the window
     dup      [i, j] | null two blocks flashing red (the repeat), dupK 0..1
     gold     [a, b] | null final answer window, goldK 0..1
     orbit    radians                                                                    */
(function () {
  const S = "pwwkew";
  const GAP = 1.38;

  function Win(canvas, opts = {}) {
    const LC = window.LC;
    const ctx = LC.three(canvas, { fov: 30, shiftX: opts.shiftX ?? 300 });
    const { scene, camera } = ctx;
    const C = { base: LC.color("#3d5396"), win: LC.color("#22c55e"), dim: LC.color("#262d45"),
      red: LC.color("#ef4444"), gold: LC.color("#facc15") };
    const xOf = (i) => (i - (S.length - 1) / 2) * GAP;

    const ground = new THREE.Mesh(new THREE.BoxGeometry(S.length * GAP + 1.2, 0.12, 3.6),
      new THREE.MeshStandardMaterial({ color: 0x151b33, roughness: 0.8 }));
    ground.position.set(0, -0.06, 0.5); scene.add(ground);

    function label(text, fg, w = 0.7) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({
        map: LC.textTexture(text, { bg: "rgba(0,0,0,0)", fg, font: "800 130px Inter" }), transparent: true, depthWrite: false }));
      scene.add(m); return m;
    }

    const blocks = S.split("").map((ch, i) => {
      const side = new THREE.MeshStandardMaterial({ color: C.base, roughness: 0.55 });
      const face = new THREE.MeshStandardMaterial({ color: C.base, roughness: 0.5, map: LC.textTexture(ch, { font: "800 170px Inter" }) });
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), [side, side, face, side, face, side]);
      m.position.set(xOf(i), 0.55, 0); scene.add(m);
      const idx = label(String(i), "#8c98be", 0.55);
      return { m, side, face, idx };
    });

    // the window: translucent box + bright edges
    const winMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.16, depthWrite: false });
    const winBox = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, 1.5), winMat); scene.add(winBox);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true });
    const winEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1.5, 1.5)), edgeMat); scene.add(winEdges);

    // pointers on the ground in front of the blocks
    function pointer(text, color) {
      const g = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.36, 3), new THREE.MeshBasicMaterial({ color }));
      cone.rotation.x = -Math.PI / 2; cone.position.set(0, 0.05, 0); g.add(cone);
      scene.add(g);
      const lbl = label(text, "#" + color.toString(16).padStart(6, "0"), 0.75);
      lbl.material.depthTest = false; lbl.renderOrder = 10;
      return { g, lbl };
    }
    const PL = pointer("L", 0x38bdf8), PR = pointer("R", 0xfacc15);

    function draw(st) {
      const appear = st.appear ?? 1, a = st.orbit ?? 0;
      camera.position.set(Math.sin(a) * 11.5, 6.0, Math.cos(a) * 11.5 + 1.2);
      camera.lookAt(0, 0.35, 0.5);
      const L = st.L ?? 0, R = st.R ?? -1, showWin = R >= 0;
      blocks.forEach((b, i) => {
        const k = LC.smooth(appear * 1.6 - i * 0.12);
        b.m.visible = k > 0.01;
        b.m.position.y = 0.55 - (1 - k) * 1.5;
        let col = C.base;
        if (showWin) {
          const inside = i >= Math.round(L) && i <= Math.round(R);
          col = inside ? LC.mix(C.base, C.win, 0.85) : i > Math.round(R) ? C.base : C.dim;
        }
        if (st.dup && st.dup.includes(i)) col = LC.mix(col, C.red, (st.dupK || 0) * (0.8 + 0.2 * Math.sin((st.dupK || 0) * 20)));
        if (st.gold && i >= st.gold[0] && i <= st.gold[1]) col = LC.mix(col, C.gold, st.goldK || 0);
        b.side.color.copy(col); b.face.color.copy(col);
        b.idx.visible = k > 0.5;
        b.idx.position.set(xOf(i), 1.55, 0); b.idx.quaternion.copy(camera.quaternion);
      });
      const w = Math.max(0, R - L) * GAP + 1.32;
      winBox.visible = winEdges.visible = showWin;
      winBox.scale.set(w, 1, 1); winEdges.scale.set(w, 1, 1);
      winBox.position.set(xOf((L + R) / 2), 0.62, 0); winEdges.position.copy(winBox.position);
      edgeMat.opacity = showWin ? 1 : 0;
      [[PL, L, 0.95], [PR, R, 0.95]].forEach(([p, v, z], n) => {
        p.g.visible = p.lbl.visible = showWin;
        const x = xOf(v) + (Math.abs(L - R) < 0.01 ? (n ? 0.28 : -0.28) : 0);
        p.g.position.set(x, 0, z);
        p.lbl.position.set(x, 0.3, z + 1.15); p.lbl.quaternion.copy(camera.quaternion);
      });
      ctx.render();
    }
    return { draw };
  }

  /** Interpolate a pointer through steps [[timeSec, value]] (0.45 s glide between values). */
  Win.track = function (t, steps) {
    let v = steps[0][1];
    for (let i = 1; i < steps.length; i++) {
      const [s, nv] = steps[i];
      if (t >= s) v = v + (nv - v) * window.LC.prog(t, s, 0.45);
    }
    return v;
  };
  Win.S = S;
  window.Win = Win;
})();
