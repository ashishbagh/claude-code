/* LRU cache stage (LeetCode 146) in the dark "blueprint glow" look borrowed from the system-design skill.
   Lru(canvas).draw(state) – everything from time:
     t, view [top, height]
     show      0..1   HEAD / TAIL sentinels + HASHMAP label
     title     0..1   particle title convergence (0 = hidden)
     keys      [{ key, born, died?, slots: [[sec, index]], lift?: [sec, dur] }]   index 0 = front (next to HEAD)
     links     0..1   dashed map → node pointers
     tags      { mru: 0..1, lruKey: key|null }
     hit       { key, at }  map slot pulse;  miss { key, at } red ghost slot                                  */
(function () {
  const SLOT_X = (i) => -1.35 + i * 2.7;          // two list slots between HEAD (-4.0) and TAIL (4.0)
  const MAP_X = { 1: -2.8, 2: 0, 3: 2.8 };
  const LIST_Y = 0.7, MAP_Y = 3.0;

  function Lru(canvas) {
    const LC = window.LC, SD = window.SD;
    const R = SD.renderer(canvas);
    const scene = new THREE.Scene(); SD.lights(scene);
    const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
    const C = (h) => new THREE.Color(h);
    const amber = C("#ff9f2e"), red = C("#f87171"), green = C("#34d399");

    const floor = SD.grid(22, 8, 0.6, 0x243055); floor.position.y = -0.05; scene.add(floor);
    const title = SD.particleText("LRU CACHE", { width: 8.2, seed: 21 }); title.position.set(0, 2.0, 0); scene.add(title);

    const head = SD.wireBox(1.1, 1.1, 1.1, C("#a1a1aa")); head.position.set(-4.0, LIST_Y, 0); scene.add(head);
    const tail = SD.wireBox(1.1, 1.1, 1.1, C("#a1a1aa")); tail.position.set(4.0, LIST_Y, 0); scene.add(tail);
    const lab = (txt, col, w, x, y, z = 0.9, font = "800 90px 'JetBrains Mono', monospace", opts = {}) => {
      const l = SD.label(txt, col, w, { font, w: opts.w, h: opts.h }); l.position.set(x, y, z); scene.add(l); return l; };
    const lHead = lab("HEAD", "#d4d4d8", 1.6, -4.0, -0.2), lTail = lab("TAIL", "#d4d4d8", 1.6, 4.0, -0.2);
    const lMap = lab("HASHMAP", "#22d3ee", 2.6, 0, MAP_Y + 0.78, 0);
    const lMru = lab("MRU ←", "#34d399", 1.9, -2.9, -0.25), lLru = lab("→ LRU", "#f87171", 1.9, 2.9, -0.25);

    // list nodes + map slots per key
    const K = {};
    [1, 2, 3].forEach((k) => {
      const node = SD.glowCube(1.0, amber.clone()); scene.add(node);
      const nl = lab(String(k), "#1a0d00", 0.9, 0, 0, 0.62, "900 110px Inter, sans-serif", { w: 128, h: 128 });
      const slot = SD.wireBox(1.5, 0.8, 0.8, C("#22d3ee")); slot.position.set(MAP_X[k], MAP_Y, 0); scene.add(slot);
      const sl = lab("key " + k, "#22d3ee", 1.4, MAP_X[k], MAP_Y, 0.45, "800 100px 'JetBrains Mono', monospace", { w: 384, h: 128 });
      K[k] = { node, nl, slot, sl };
    });
    const ghost = SD.wireBox(1.5, 0.8, 0.8, red); scene.add(ghost);
    const lGhost = lab("key 2 ✗", "#f87171", 1.6, 0, MAP_Y, 0.45, "800 100px 'JetBrains Mono', monospace", { w: 448, h: 128 });
    const lruTag = lab("LRU", "#f87171", 0.9, 0, 0, 0.7, "900 100px 'JetBrains Mono', monospace", { w: 256, h: 128 });

    // dynamic lines: list arrows (double) + map pointers (dashed look via segments)
    const MAXL = 64, lpos = new Float32Array(MAXL * 6);
    const lgeo = new THREE.BufferGeometry(); lgeo.setAttribute("position", new THREE.BufferAttribute(lpos, 3));
    const arrows = new THREE.LineSegments(lgeo, new THREE.LineBasicMaterial({ color: 0x9ca3af, transparent: true, opacity: 0.85 })); scene.add(arrows);
    const ppos = new Float32Array(MAXL * 6);
    const pgeo = new THREE.BufferGeometry(); pgeo.setAttribute("position", new THREE.BufferAttribute(ppos, 3));
    const ptrs = new THREE.LineSegments(pgeo, new THREE.LineBasicMaterial({ color: 0xf472b6, transparent: true, opacity: 0.9 })); scene.add(ptrs);

    function keyState(k, t) {
      const ks = k; if (!ks || t < ks.born) return null;
      let idx = ks.slots[0][1];
      for (let i = 1; i < ks.slots.length; i++) if (t >= ks.slots[i][0]) idx = idx + (ks.slots[i][1] - idx) * LC.prog(t, ks.slots[i][0], 0.8);
      const inK = LC.prog(t, ks.born, 0.6);
      let y = LIST_Y + (1 - inK) * 2.2, op = 1, col = amber;
      if (ks.lift) y += 1.6 * Math.sin(Math.PI * LC.clamp((t - ks.lift[0]) / ks.lift[1]));
      if (ks.died != null && t >= ks.died) { const d = LC.prog(t, ks.died, 0.9); y -= 1.6 * d; op = 1 - d; col = red; }
      return { x: SLOT_X(idx), y, op, col, inK };
    }

    function draw(st) {
      const t = st.t ?? 0, show = st.show ?? 0;
      R.clear();
      camera.position.set(0.55 * Math.sin(t * 0.3), 2.9 + 0.12 * Math.sin(t * 0.21), 9.2); camera.lookAt(0, 1.8, 0);
      floor.visible = show > 0.01;
      title.visible = (st.title ?? 0) > 0.001;
      if (title.visible) { title.update(st.title, t); title.material.opacity = Math.min(1, (st.titleOp ?? 1)); }
      [head, tail].forEach((b) => { b.visible = show > 0.01; b.alpha(show); b.fill(0.12); });
      [lHead, lTail, lMap].forEach((l) => { l.visible = show > 0.01; l.material.opacity = show; });
      const tg = st.tags || {};
      [lMru, lLru].forEach((l) => { l.visible = (tg.mru ?? 0) > 0.01; l.material.opacity = tg.mru ?? 0; });

      const live = [];
      [1, 2, 3].forEach((k) => {
        const o = K[k], ks = (st.keys || []).find((q) => q.key === k), s = ks ? keyState(ks, t) : null;
        o.node.visible = o.nl.visible = !!s && s.op > 0.02;
        const mapOn = ks && t >= ks.born + 0.2 && !(ks.mapGone != null && t >= ks.mapGone);
        const mk = ks ? LC.prog(t, ks.born + 0.2, 0.5) * (ks.mapGone != null ? 1 - LC.prog(t, ks.mapGone, 0.5) : 1) : 0;
        o.slot.visible = o.sl.visible = mk > 0.02; o.slot.alpha(mk); o.sl.material.opacity = mk;
        const hitK = st.hit && st.hit.key === k ? Math.sin(Math.PI * LC.clamp((t - st.hit.at) / 0.9)) : 0;
        o.slot.fill(0.1 + 0.7 * Math.max(0, hitK)); o.slot.scale.setScalar(1 + 0.12 * Math.max(0, hitK));
        if (!s) return;
        o.node.position.set(s.x, s.y, 0); o.node.material.opacity = s.op;
        o.node.material.color.copy(s.col); o.node.material.emissive.copy(s.col);
        o.node.scale.setScalar(0.5 + 0.5 * s.inK);
        o.nl.position.set(s.x, s.y, 0.62); o.nl.material.opacity = s.op;
        if (s.op > 0.5 && (ks.died == null || t < ks.died)) live.push({ k, x: s.x, y: s.y, mapOn: mapOn && mk > 0.5 });
      });

      // LRU tag under the back-most node
      const back = tg.lruKey != null ? live.find((n) => n.k === tg.lruKey) : null;
      lruTag.visible = !!back; if (back) { lruTag.position.set(back.x, back.y - 0.95, 0.7); lruTag.material.opacity = 0.6 + 0.4 * Math.sin(t * 6); }

      // ghost (miss)
      const mz = st.miss ? LC.prog(t, st.miss.at, 0.4) : 0;
      ghost.visible = lGhost.visible = mz > 0.01; ghost.position.set(MAP_X[2], MAP_Y, 0); ghost.alpha(mz); ghost.fill(0.3 + 0.2 * Math.sin(t * 9));
      lGhost.position.set(MAP_X[2], MAP_Y, 0.45); lGhost.material.opacity = mz;

      // arrows HEAD ⇄ nodes ⇄ TAIL (two parallel lines = doubly linked)
      let n = 0;
      const seg = (a, b, arr, i) => { arr.set([a[0], a[1], a[2], b[0], b[1], b[2]], i * 6); };
      if (show > 0.5) {
        const chain = [[-4.0 + 0.55, LIST_Y]].concat(live.sort((a, b) => a.x - b.x).map((q) => [q.x, q.y])).concat([[4.0 - 0.55, LIST_Y]]);
        for (let i = 0; i + 1 < chain.length; i++) {
          const ax = chain[i][0] + (i === 0 ? 0 : 0.55), bx = chain[i + 1][0] - (i + 1 === chain.length - 1 ? 0 : 0.55);
          seg([ax, chain[i][1] + 0.12, 0.3], [bx, chain[i + 1][1] + 0.12, 0.3], lpos, n++);
          seg([ax, chain[i][1] - 0.12, 0.3], [bx, chain[i + 1][1] - 0.12, 0.3], lpos, n++);
        }
      }
      for (let i = n; i < MAXL; i++) seg([0, -99, 0], [0, -99, 0], lpos, i);
      lgeo.attributes.position.needsUpdate = true; arrows.visible = show > 0.5;

      // map → node pointers (dashed: 6 short segments each)
      let m = 0; const lk = st.links ?? 0;
      if (lk > 0.01) live.filter((q) => q.mapOn).forEach((q) => {
        const a = [MAP_X[q.k], MAP_Y - 0.42, 0], b = [q.x, q.y + 0.55, 0];
        for (let s = 0; s < 6; s++) {
          const u0 = s / 6, u1 = u0 + 0.6 / 6;
          if (u0 > lk) break;
          seg([a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0, 0], [a[0] + (b[0] - a[0]) * Math.min(u1, lk), a[1] + (b[1] - a[1]) * Math.min(u1, lk), 0], ppos, m++);
        }
      });
      for (let i = m; i < MAXL; i++) seg([0, -99, 0], [0, -99, 0], ppos, i);
      pgeo.attributes.position.needsUpdate = true;

      if (st.view) R.view(scene, camera, st.view[0], st.view[1]);
    }
    return { draw };
  }
  window.Lru = Lru;
})();
