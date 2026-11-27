/* 3D banana piles for LeetCode 875 Koko Eating Bananas (designed for the 1080x1920 reel).
   Piles(canvas).draw(state), state derived from time only:
     appear  0..1        piles grow banana by banana
     k       int | null  eating speed: each pile splits into chunks of k (one chunk = one hour)
     kK      0..1        how far the split has opened (chunk gaps + colours + hour labels)
     orbit   radians                                                                       */
(function () {
  const PILES = [3, 6, 7, 11];
  const GAP_X = 2.05, STEP_Y = 0.36;

  function Piles(canvas) {
    const LC = window.LC;
    const ctx = LC.three(canvas, { fov: 34, portraitFov: 58, portraitShiftY: 430 });
    const { scene, camera } = ctx;
    const xOf = (i) => (i - (PILES.length - 1) / 2) * GAP_X;
    const Y = [LC.color("#facc15"), LC.color("#fb923c")];   // alternate per hour chunk
    const base = LC.color("#fde047");

    const ground = new THREE.Mesh(new THREE.BoxGeometry(PILES.length * GAP_X + 0.8, 0.12, 2.4),
      new THREE.MeshStandardMaterial({ color: 0x1b2a1b, roughness: 0.9 }));
    ground.position.set(0, -0.06, 0.2); scene.add(ground);

    function label(text, fg, w) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, w), new THREE.MeshBasicMaterial({
        map: LC.textTexture(text, { bg: "rgba(0,0,0,0)", fg, font: "800 130px Inter" }), transparent: true, depthWrite: false }));
      m.material.depthTest = false; m.renderOrder = 10; scene.add(m); return m;
    }
    const hourTex = {};
    const hourTexture = (h) => (hourTex[h] = hourTex[h] || LC.textTexture(h + "h", { bg: "rgba(0,0,0,0)", fg: "#86efac", font: "800 120px Inter" }));

    const geo = new THREE.CapsuleGeometry(0.15, 0.55, 6, 14);
    const piles = PILES.map((n, i) => {
      const items = [];
      for (let j = 0; j < n; j++) {
        const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.45 });
        const m = new THREE.Mesh(geo, mat);
        m.rotation.z = Math.PI / 2 + (j % 2 ? 0.12 : -0.12);   // slight banana-ish tilt
        scene.add(m); items.push({ m, mat });
      }
      const count = label(String(n), "#ebf0ff", 0.7);
      const hours = label("1h", "#86efac", 0.8);
      return { n, items, count, hours };
    });

    function draw(st) {
      const appear = st.appear ?? 1, a = st.orbit ?? 0, k = st.k, kK = k ? (st.kK ?? 1) : 0;
      camera.position.set(Math.sin(a) * 14.8, 3.6, Math.cos(a) * 14.8);
      camera.lookAt(0, 2.0, 0);
      piles.forEach((p, i) => {
        let topY = 0;
        p.items.forEach((it, j) => {
          const vis = LC.smooth(appear * 2.2 - (i * 0.25 + j * 0.06));
          const chunk = k ? Math.floor(j / k) : 0;
          const y = 0.2 + j * STEP_Y + chunk * 0.2 * kK;
          it.m.visible = vis > 0.01;
          it.m.position.set(xOf(i), y + (1 - vis) * 1.2, 0);
          it.m.scale.setScalar(0.5 + 0.5 * vis);
          it.mat.color.copy(k ? LC.mix(base, Y[chunk % 2], kK) : base);
          topY = y;
        });
        p.count.position.set(xOf(i), -0.05, 1.35); p.count.quaternion.copy(camera.quaternion);
        p.count.visible = appear > 0.6;
        const h = k ? Math.ceil(p.n / k) : 0;
        p.hours.visible = kK > 0.05;
        if (k) { p.hours.material.map = hourTexture(h); p.hours.material.opacity = kK; }
        p.hours.position.set(xOf(i), topY + 0.65, 0); p.hours.quaternion.copy(camera.quaternion);
      });
      ctx.render();
    }
    return { draw };
  }
  Piles.PILES = PILES;
  window.Piles = Piles;
})();
