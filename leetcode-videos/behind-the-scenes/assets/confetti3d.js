/* Floating pastel 3D shapes (Three.js) for the bright intro/outro. Deterministic: draw(t) only. */
(function () {
  function hash(i) { let x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
  const COLORS = [0xec4899, 0xf97316, 0xeab308, 0x22c55e, 0x0ea5e9, 0x8b5cf6];

  function Floaty(canvas, { count = 22 } = {}) {
    const ctx = window.LC.three(canvas, { fov: 40, portraitFov: 62 });
    const { scene, camera } = ctx;
    camera.position.set(0, 0, 16); camera.lookAt(0, 0, 0);
    const geos = [new THREE.BoxGeometry(1, 1, 1), new THREE.SphereGeometry(0.62, 24, 16),
      new THREE.TorusGeometry(0.55, 0.22, 14, 32), new THREE.OctahedronGeometry(0.75), new THREE.ConeGeometry(0.6, 1.1, 24)];
    const items = [];
    for (let i = 0; i < count; i++) {
      const m = new THREE.Mesh(geos[i % geos.length],
        new THREE.MeshStandardMaterial({ color: COLORS[i % COLORS.length], roughness: 0.35, metalness: 0.05 }));
      // keep the centre column (text) clear: shapes live in the left and right side bands
      const side = i % 2 ? 1 : -1;
      // landscape: left/right bands; portrait (vertical reel): top/bottom bands around the content
      const pos = window.LC.portrait
        ? { x: (hash(i) - 0.5) * 9, y: side * (8.5 + hash(i + 50) * 1.3) }
        : { x: side * (7.2 + hash(i + 50) * 4), y: (hash(i) - 0.5) * 10.5 };
      items.push({ m, x: pos.x, y: pos.y, z: -3 + hash(i + 9) * 3,
        s: 0.55 + hash(i + 3) * 0.7, sp: 0.3 + hash(i + 7) * 0.5, ph: hash(i + 11) * 6.28 });
      scene.add(m);
    }
    function draw(t, appear = 1) {
      items.forEach((it, i) => {
        const k = window.LC.smooth(appear * 1.5 - i * 0.025);
        it.m.visible = k > 0.01;
        it.m.scale.setScalar(it.s * k);
        it.m.position.set(it.x, it.y + Math.sin(t * it.sp + it.ph) * 0.45, it.z);
        it.m.rotation.set(t * it.sp * 0.8 + it.ph, t * it.sp + it.ph * 0.5, 0);
      });
      ctx.render();
    }
    return { draw };
  }
  window.Floaty = Floaty;
})();
