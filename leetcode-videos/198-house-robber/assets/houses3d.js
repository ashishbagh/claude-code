/* 3D street for LeetCode 198 House Robber, shared by the house scenes.
   Street(canvas).draw(state), state derived from time only:
     appear  0..1            houses rise one by one
     current i | null        yellow ring under the house being decided, ringAlpha 0..1
     dp      [p0..p4]        0..1 appear progress of each dp tile (value + rob/skip colour)
     alarm   0..1            houses 1 and 2 flash red (the adjacent-houses rule)
     final   0..1            robbed set {0,2,4} turns gold, the rest dims
     orbit   radians                                                                       */
(function () {
  const NUMS = [2, 7, 9, 3, 1];
  const DP = [2, 7, 11, 11, 12];
  const KIND = ["rob", "rob", "rob", "skip", "rob"];
  const ROBBED = [0, 2, 4];
  const SPACING = 1.42;

  function Street(canvas, opts = {}) {
    const LC = window.LC;
    const ctx = LC.three(canvas, { fov: 30, shiftX: opts.shiftX ?? 300 });
    const { scene, camera } = ctx;
    const C = {
      body: LC.color("#3d5396"), roof: LC.color("#b4532a"), gold: LC.color("#facc15"),
      dim: LC.color("#262d45"), red: LC.color("#ef4444"), rob: LC.color("#22c55e"), skip: LC.color("#38bdf8"),
    };

    const ground = new THREE.Mesh(new THREE.BoxGeometry(5 * SPACING + 0.9, 0.12, 4.6),
      new THREE.MeshStandardMaterial({ color: 0x151b33, roughness: 0.8 }));
    ground.position.set(0, -0.06, 0.6); scene.add(ground);
    const road = new THREE.Mesh(new THREE.BoxGeometry(5 * SPACING + 0.9, 0.02, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x232b4a, roughness: 0.9 }));
    road.position.set(0, 0.01, 0.75); scene.add(road);

    function label(text, fg, w = 0.95) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w),
        new THREE.MeshBasicMaterial({ map: LC.textTexture(text, { bg: "rgba(0,0,0,0)", fg, font: "800 118px Inter" }),
          transparent: true, depthWrite: false }));
      scene.add(m);
      return m;
    }

    const houses = NUMS.map((v, i) => {
      const g = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.6 });
      const roofMat = new THREE.MeshStandardMaterial({ color: C.roof, roughness: 0.55 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.9, 1.0), bodyMat); body.position.y = 0.45; g.add(body);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.86, 0.6, 4), roofMat);
      roof.rotation.y = Math.PI / 4; roof.position.y = 1.2; g.add(roof);
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.42, 0.04), new THREE.MeshStandardMaterial({ color: 0x14182a }));
      door.position.set(0, 0.21, 0.51); g.add(door);
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.04), new THREE.MeshStandardMaterial({ color: 0xfde68a, emissive: 0x6b5a1a }));
      win.position.set(0.3, 0.6, 0.51); g.add(win);
      g.position.set((i - 2) * SPACING, 0, -0.5);
      scene.add(g);
      const money = label("$" + v, "#facc15");
      const tileMat = new THREE.MeshStandardMaterial({ color: C.rob, roughness: 0.5 });
      const tile = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.16, 0.85), tileMat);
      tile.position.set((i - 2) * SPACING, 0.08, 1.75); scene.add(tile);
      const dpLabel = label(String(DP[i]), "#ebf0ff", 0.8);
      return { g, bodyMat, roofMat, money, tile, tileMat, dpLabel, x: (i - 2) * SPACING };
    });
    const dpTag = label("dp", "#8c98be", 0.7);
    dpTag.position.set(-2 * SPACING - 1.05, 0.45, 1.75);

    // yellow ring (four bars) on the ground around the current house
    const ring = new THREE.Group();
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true });
    [[1.45, 0.07, 0, -0.75], [1.45, 0.07, 0, 0.75], [0.07, 1.5, -0.72, 0], [0.07, 1.5, 0.72, 0]].forEach(([w, d, x, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), ringMat); m.position.set(x, 0.03, z); ring.add(m);
    });
    scene.add(ring);

    function draw(st) {
      const appear = st.appear ?? 1, dp = st.dp || [], alarm = st.alarm || 0, fin = st.final || 0;
      const a = st.orbit ?? 0;
      camera.position.set(Math.sin(a) * 11.4, 6.6, Math.cos(a) * 11.4 + 1.0);
      camera.lookAt(0, 0.55, 0.45);
      houses.forEach((h, i) => {
        const k = LC.smooth(appear * 1.6 - i * 0.12);
        h.g.visible = k > 0.01;
        h.g.position.y = -(1 - k) * 1.6;
        h.g.scale.setScalar(0.6 + 0.4 * k);
        let body = C.body.clone();
        if ((i === 1 || i === 2) && alarm > 0) body = LC.mix(body, C.red, alarm * (0.75 + 0.25 * Math.sin(alarm * 18)));
        if (fin > 0) body = LC.mix(body, ROBBED.includes(i) ? C.gold : C.dim, fin);
        h.bodyMat.color.copy(body);
        h.roofMat.color.copy(fin > 0 && !ROBBED.includes(i) ? LC.mix(C.roof, C.dim, fin) : C.roof);
        h.money.visible = k > 0.5;
        h.money.position.set(h.x, 2.0 + (1 - k) * 0.5 + (ROBBED.includes(i) ? fin * 0.15 : 0), -0.5);
        h.money.quaternion.copy(camera.quaternion);
        h.money.material.opacity = LC.clamp(k * 2 - 1) * (fin > 0 && !ROBBED.includes(i) ? 1 - 0.6 * fin : 1);
        const p = dp[i] || 0;
        h.tile.visible = p > 0.01; h.dpLabel.visible = p > 0.01;
        h.tile.scale.set(1, 0.3 + 0.7 * p, 1);
        h.tileMat.color.copy(KIND[i] === "rob" ? C.rob : C.skip);
        h.dpLabel.position.set(h.x, 0.55 + 0.25 * p, 1.75);
        h.dpLabel.quaternion.copy(camera.quaternion);
        h.dpLabel.material.opacity = p;
        h.dpLabel.scale.setScalar(0.7 + 0.3 * p + 0.25 * Math.sin(Math.PI * p));
      });
      dpTag.visible = false; // panel title already says dp
      dpTag.quaternion.copy(camera.quaternion);
      const ra = st.current != null ? (st.ringAlpha ?? 1) : 0;
      ring.visible = ra > 0.01;
      if (st.current != null) ring.position.set(houses[st.current].x, 0, -0.5);
      ringMat.opacity = ra;
      ctx.render();
    }
    return { draw };
  }

  /** dp tile progress array for time t: tiles listed as [[index, startSec]], already-done tiles at 1. */
  Street.dpAt = function (t, done, events) {
    const dp = [0, 0, 0, 0, 0];
    for (let i = 0; i < done; i++) dp[i] = 1;
    events.forEach(([i, s]) => { dp[i] = window.LC.prog(t, s, 0.6); });
    return dp;
  };
  Street.NUMS = NUMS; Street.DP = DP; Street.KIND = KIND;
  window.Street = Street;
})();
