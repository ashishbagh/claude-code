/* 3D architecture diagrams for system-design explainer scenes (classic script, needs THREE + LC).

   const A = SD.Arch(canvas, {
     nodes: [{ id, kind, x, z, label, color, scale, labelDy, labelPos: "front" }],  // "front": label on the floor in front
                                                         // kinds: client phone lb server cache db kgs queue worker cdn   // kind: client|lb|server|cache|db|kgs|queue|worker|cdn
     edges: [["client", "lb"], ...],                    // drawn on the floor, grow with the nodes they join
     shiftX: 0, fov: 34, cam: { dist: 15, elev: 0.95, target: [0, 0, 0] },
   });
   A.draw({                     // every value is a pure function of t – call it from LC.drive
     appear: { id: 0..1 },      // node rises in (default 1 for every node not listed when appearAll=true)
     appearAll: true,
     fade:   { id: 0..1 },      // 1 = dimmed / ghosted (a node being replaced, e.g. one DB -> shards)
     glow:   { id: 0..1 },      // yellow highlight on a node (it is doing the work right now)
     edges:  { "a>b": 0..1 },   // override an edge's growth; "a>b" is the key of edge [a, b]
     hot:    { "a>b": 0..1 },   // edge lit up (a packet just travelled it)
     packets: [{ from, to, p: 0..1, color: "#facc15", label: "GET /g7Rk2Xp" }],
     orbit: 0, dist: 15, elev: 0.95, target: [x, y, z],
   });
   SD.hop(t, [[from, to, start, dur, label, color], ...]) -> packets for draw() (one packet per active hop).
   SD.lit(t, hops, fadeAfter) -> { "a>b": k } edges lit by those hops (for draw().hot).
   Spotlight (9:16): A.spot(t, [[sec, ["priya","lb"]], [sec, ["lb","chatA","chatB"]], ...]) -> { target, dist, fade }
   – spread it into draw(); cfg labelScale / packetScale / edgeScale enlarge labels, packets, edges.            */
(function () {
  const SD = {};
  const LCx = () => window.LC;

  const KIND_COLOR = {
    client: "#38bdf8", phone: "#22c55e", lb: "#a78bfa", server: "#4c66b5", cache: "#ef4444", db: "#22c55e",
    kgs: "#facc15", queue: "#fb923c", worker: "#ec4899", cdn: "#2dd4bf",
  };

  /** Wide text label texture (transparent background, optional pill). Returns { tex, aspect }. */
  SD.labelTexture = function (text, { fg = "#ebf0ff", bg = "rgba(13,17,33,0.82)", edge = "#2c3658",
    weight = 700, size = 64, mono = false, h = 112 } = {}) {
    const c = document.createElement("canvas");
    const g = c.getContext("2d");
    const font = `${weight} ${size}px ${mono ? "'JetBrains Mono', monospace" : "Inter, sans-serif"}`;
    g.font = font;
    const w = Math.ceil(g.measureText(text).width) + 72;
    c.width = w; c.height = h;
    g.font = font;
    if (bg) {
      const r = h / 2 - 6;
      g.fillStyle = bg; g.strokeStyle = edge; g.lineWidth = 5;
      g.beginPath(); g.roundRect(4, 4, w - 8, h - 8, r); g.fill(); if (edge) g.stroke();
    }
    g.fillStyle = fg; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, w / 2, h / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    return { tex, aspect: w / h };
  };

  function std(color, extra = {}) {
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0.1 }, extra));
  }

  /** Geometry for one node kind. Returns { group, mats, height }. */
  function buildKind(kind, colorHex) {
    const g = new THREE.Group();
    const col = new THREE.Color(colorHex);
    const dark = col.clone().multiplyScalar(0.45);
    const mats = [];
    const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    let height = 1;
    if (kind === "client") {
      const body = std(0x2a3358); mats.push(body);
      const scr = std(col, { emissive: col.clone().multiplyScalar(0.55) }); mats.push(scr);
      add(new THREE.BoxGeometry(1.5, 0.95, 0.1), body, 0, 0.95, 0);
      add(new THREE.BoxGeometry(1.36, 0.8, 0.02), scr, 0, 0.95, 0.06);
      add(new THREE.BoxGeometry(0.12, 0.45, 0.12), body, 0, 0.25, 0);
      add(new THREE.BoxGeometry(0.7, 0.06, 0.45), body, 0, 0.03, 0);
      height = 1.45;
    } else if (kind === "phone") {
      const body = std(0x1b2140); mats.push(body);
      const scr = std(col, { emissive: col.clone().multiplyScalar(0.5) }); mats.push(scr);
      add(new THREE.BoxGeometry(0.9, 1.7, 0.12), body, 0, 0.95, 0);
      add(new THREE.BoxGeometry(0.78, 1.5, 0.02), scr, 0, 0.97, 0.07);
      const notch = std(0x0b0f20); mats.push(notch);
      add(new THREE.BoxGeometry(0.26, 0.05, 0.02), notch, 0, 1.68, 0.08);
      const g2 = new THREE.Group(); g2.add(...g.children.splice(0)); g2.rotation.x = -0.35; g.add(g2);
      height = 1.9;
    } else if (kind === "lb") {
      const m = std(col); mats.push(m);
      add(new THREE.CylinderGeometry(0.8, 0.85, 0.42, 8), m, 0, 0.21, 0);
      const top = std(0xffffff, { emissive: col.clone().multiplyScalar(0.6) }); mats.push(top);
      const ring = add(new THREE.TorusGeometry(0.5, 0.05, 8, 32), top, 0, 0.43, 0); ring.rotation.x = Math.PI / 2;
      height = 0.5;
    } else if (kind === "server" || kind === "worker") {
      const m = std(col); mats.push(m);
      const led = std(0x22c55e, { emissive: 0x22c55e, emissiveIntensity: 0.9 }); mats.push(led);
      for (let i = 0; i < 3; i++) {
        add(new THREE.BoxGeometry(1.15, 0.3, 0.95), m, 0, 0.16 + i * 0.36, 0);
        add(new THREE.BoxGeometry(0.5, 0.05, 0.02), led, -0.2, 0.16 + i * 0.36, 0.48);
        add(new THREE.BoxGeometry(0.08, 0.08, 0.02), led, 0.4, 0.16 + i * 0.36, 0.48);
      }
      height = 1.05;
    } else if (kind === "cache") {
      const m = std(col); mats.push(m);
      const glow = std(0xffffff, { emissive: col.clone().multiplyScalar(0.8) }); mats.push(glow);
      add(new THREE.BoxGeometry(1.2, 0.8, 1.0), m, 0, 0.4, 0);
      for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(1.22, 0.05, 1.02), glow, 0, 0.18 + i * 0.22, 0);
      height = 0.8;
    } else if (kind === "db") {
      const m = std(col); mats.push(m);
      const rim = std(dark); mats.push(rim);
      for (let i = 0; i < 3; i++) {
        add(new THREE.CylinderGeometry(0.66, 0.66, 0.3, 32), m, 0, 0.16 + i * 0.36, 0);
        add(new THREE.CylinderGeometry(0.67, 0.67, 0.04, 32), rim, 0, 0.33 + i * 0.36, 0);
      }
      height = 1.05;
    } else if (kind === "kgs") {
      const m = std(col, { emissive: col.clone().multiplyScalar(0.15) }); mats.push(m);
      add(new THREE.CylinderGeometry(0.72, 0.72, 0.75, 6), m, 0, 0.38, 0);
      const k = std(0x1a1f36); mats.push(k);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.77, 6), k, 0, 0.38, 0);
      height = 0.75;
    } else if (kind === "queue") {
      const m = std(col); mats.push(m);
      for (let i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.3, 0.5, 0.7), m, -0.72 + i * 0.36, 0.25, 0);
      height = 0.5;
    } else { // cdn / generic
      const m = std(col); mats.push(m);
      add(new THREE.IcosahedronGeometry(0.6, 1), m, 0, 0.6, 0);
      height = 1.2;
    }
    mats.forEach((mm) => { mm.userData.baseEmissive = mm.emissive.clone(); mm.transparent = true; });
    return { group: g, mats, height };
  }

  SD.Arch = function (canvas, cfg) {
    const LC = LCx();
    const ctx = LC.three(canvas, { fov: cfg.fov || 34, shiftX: cfg.shiftX || 0, shiftY: cfg.shiftY || 0 });
    const { scene, camera, renderer } = ctx;
    const cam = Object.assign({ dist: 15, elev: 0.95, target: [0, 0, 0] }, cfg.cam || {});
    const LS = cfg.labelScale || 1, PS = cfg.packetScale || 1, ES = cfg.edgeScale || 1;   // bigger for 9:16

    const grid = new THREE.GridHelper(44, 44, 0x26305a, 0x1a2140);
    grid.material.transparent = true; grid.material.opacity = 0.55;
    scene.add(grid);

    const yellow = new THREE.Color("#facc15");
    const nodes = {};
    (cfg.nodes || []).forEach((n) => {
      const color = n.color || KIND_COLOR[n.kind] || "#4c66b5";
      const b = buildKind(n.kind, color);
      const holder = new THREE.Group();
      holder.add(b.group);
      holder.position.set(n.x, 0, n.z);
      scene.add(holder);
      let label = null;
      if (n.label) {
        const { tex, aspect } = SD.labelTexture(n.label, { size: 58 });
        const h = 0.48 * (n.labelScale || 1) * LS;
        label = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
        label.renderOrder = 10;
        scene.add(label);
      }
      // floor halo for glow
      const halo = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.12, 48),
        new THREE.MeshBasicMaterial({ color: yellow, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
      halo.rotation.x = -Math.PI / 2; halo.position.set(n.x, 0.02, n.z);
      scene.add(halo);
      nodes[n.id] = { cfg: n, holder, inner: b.group, mats: b.mats, height: b.height * (n.scale || 1), label, halo,
        scale: n.scale || 1, labelDy: n.labelDy || 0, labelFront: n.labelPos === "front" };
    });

    const edgeBase = new THREE.Color("#3b4a80"), edgeHot = new THREE.Color("#facc15");
    const edges = (cfg.edges || []).map(([a, b]) => {
      const mat = new THREE.MeshBasicMaterial({ color: edgeBase.clone(), transparent: true });
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.045 * ES, 0.045 * ES, 1, 8), mat);
      scene.add(mesh);
      return { a, b, key: `${a}>${b}`, mesh, mat };
    });

    // packet pool
    const packets = [];
    const labelCache = {};
    function packetLabel(text, color) {
      const k = text + "|" + color;
      if (!labelCache[k]) {
        const { tex, aspect } = SD.labelTexture(text, { fg: "#0d1121", bg: color, edge: null, size: 54, mono: true, weight: 700 });
        const h = 0.42 * PS;
        const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h),
          new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false }));
        m.renderOrder = 20; m.visible = false; scene.add(m);
        labelCache[k] = m;
      }
      return labelCache[k];
    }
    function packetMesh(i) {
      while (packets.length <= i) {
        const mat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xfacc15, emissiveIntensity: 0.8 });
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.17 * PS, 24, 16), mat);
        m.visible = false; scene.add(m); packets.push(m);
      }
      return packets[i];
    }

    const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);

    function draw(st = {}) {
      const appear = st.appear || {}, fade = st.fade || {}, glow = st.glow || {};
      const appearAll = st.appearAll !== false;
      const orbit = st.orbit ?? 0, dist = st.dist ?? cam.dist, elev = st.elev ?? cam.elev;
      const tg = st.target || cam.target;
      camera.position.set(tg[0] + Math.sin(orbit) * Math.cos(elev) * dist, tg[1] + Math.sin(elev) * dist,
        tg[2] + Math.cos(orbit) * Math.cos(elev) * dist);
      camera.lookAt(tg[0], tg[1], tg[2]);

      const vis = {};
      Object.entries(nodes).forEach(([id, n]) => {
        const a = id in appear ? appear[id] : appearAll ? 1 : 0;
        const k = LC.smooth(a);
        vis[id] = k;
        const f = LC.clamp(fade[id] || 0), gl = LC.clamp(glow[id] || 0);
        n.holder.visible = k > 0.01;
        const pulse = 1 + 0.06 * gl;
        n.inner.scale.setScalar(n.scale * (0.55 + 0.45 * k) * pulse);
        n.inner.position.y = -(1 - k) * 1.2;
        n.mats.forEach((m) => {
          m.opacity = (1 - 0.8 * f) * LC.clamp(k * 1.5);
          m.emissive.copy(m.userData.baseEmissive).lerp(yellow, 0.45 * gl);
        });
        n.halo.material.opacity = 0.9 * gl * k;
        if (n.label) {
          n.label.visible = k > 0.05;
          n.label.material.opacity = LC.clamp((k - 0.3) / 0.7) * (1 - 0.95 * f);
          if (n.labelFront) n.label.position.set(n.cfg.x, 0.3 + n.labelDy, n.cfg.z + 1.05);
          else n.label.position.set(n.cfg.x, n.height + 0.42 + n.labelDy, n.cfg.z);
          n.label.quaternion.copy(camera.quaternion);
        }
      });

      edges.forEach((e) => {
        const A = nodes[e.a], B = nodes[e.b];
        if (!A || !B) return;
        const g = st.edges && e.key in st.edges ? st.edges[e.key] : Math.min(vis[e.a], vis[e.b]);
        const k = LC.smooth(g);
        const fd = Math.max(fade[e.a] || 0, fade[e.b] || 0);
        e.mesh.visible = k > 0.01;
        tmpA.set(A.cfg.x, 0.1, A.cfg.z); tmpB.set(B.cfg.x, 0.1, B.cfg.z);
        const dir = tmpB.clone().sub(tmpA); const len = dir.length(); dir.normalize();
        e.mesh.quaternion.setFromUnitVectors(up, dir);
        e.mesh.scale.set(1, Math.max(len * k, 1e-4), 1);
        e.mesh.position.copy(tmpA).addScaledVector(dir, (len * k) / 2);
        const hot = LC.clamp((st.hot && st.hot[e.key]) || (st.hot && st.hot[`${e.b}>${e.a}`]) || 0);
        e.mat.color.copy(edgeBase).lerp(edgeHot, hot);
        e.mat.opacity = 0.9 * (1 - 0.75 * fd);
      });

      Object.values(labelCache).forEach((m) => { m.visible = false; });
      packets.forEach((m) => { m.visible = false; });
      (st.packets || []).forEach((pk, i) => {
        const A = nodes[pk.from], B = nodes[pk.to];
        if (!A || !B) return;
        const p = LC.clamp(pk.p);
        const m = packetMesh(i);
        const x = A.cfg.x + (B.cfg.x - A.cfg.x) * p, z = A.cfg.z + (B.cfg.z - A.cfg.z) * p;
        const y = 0.45 + Math.sin(p * Math.PI) * 0.55;
        const col = new THREE.Color(pk.color || "#facc15");
        m.material.color.copy(col); m.material.emissive.copy(col);
        const s = LC.smooth(Math.min(p, 1 - p) * 8);
        m.scale.setScalar(0.3 + 0.7 * s);
        m.position.set(x, y, z); m.visible = true;
        if (pk.label) {
          const l = packetLabel(pk.label, pk.color || "#facc15");
          l.position.set(x, y + 0.5 * PS, z); l.quaternion.copy(camera.quaternion);
          l.material.opacity = s; l.visible = true;
        }
      });
      renderer.render(scene, camera);
    }

    /** Camera that frames these nodes: { target, dist } (for elev `elev`, frame aspect W/H). `band` = the
        fraction of the frame height the nodes may use (0.3 in 9:16 to leave room for text). */
    function frame(ids, { band = cfg.band || 0.3, elev = cam.elev, minDist = 7 } = {}) {
      const ns = ids.map((id) => nodes[id]).filter(Boolean);
      if (!ns.length) return { target: cam.target, dist: cam.dist };
      const xs = ns.map((n) => n.cfg.x), zs = ns.map((n) => n.cfg.z);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
      const W = window.LC_W || 1920, H = window.LC_H || 1080;
      const tv = Math.tan(((cfg.fov || 34) * Math.PI) / 360), th = tv * (W / H);
      const needH = ((z1 - z0) * Math.sin(elev) + 2.2) / (2 * tv * band);   // depth + node height + label
      const needW = (x1 - x0 + 3.2) / (2 * th * 0.9);                       // width + label overhang
      return { target: [(x0 + x1) / 2, 0.5, (z0 + z1) / 2], dist: Math.max(minDist, needH, needW) };
    }

    /** Spotlight: beats = [[timeSec, [ids]], ...]. Returns { target, dist, fade } blended between beats
        over `trans` seconds – the camera frames the beat's nodes and every other node dims. */
    function spot(t, beats, { trans = 1.0, dim = 0.88, band, elev } = {}) {
      let i = 0;
      beats.forEach((b, k) => { if (t >= b[0]) i = k; });
      const cur = beats[i], prev = beats[Math.max(0, i - 1)];
      const k = i === 0 ? 1 : LC.smooth((t - cur[0]) / trans);
      const fa = frame(prev[1], { band, elev }), fb = frame(cur[1], { band, elev });
      const lerp = (a, b) => a + (b - a) * k;
      const fade = {};
      Object.keys(nodes).forEach((id) => {
        const wa = prev[1].includes(id) ? 1 : 0, wb = cur[1].includes(id) ? 1 : 0;
        fade[id] = dim * (1 - lerp(wa, wb));
      });
      return { target: fa.target.map((v, j) => lerp(v, fb.target[j])), dist: lerp(fa.dist, fb.dist), fade };
    }

    return { draw, nodes, scene, camera, frame, spot };
  };

  /** Packets for draw(): hops = [[from, to, startSec, durSec, label, color], ...]. */
  SD.hop = function (t, hops) {
    const out = [];
    hops.forEach(([from, to, s, d, label, color]) => {
      if (t >= s && t <= s + d) out.push({ from, to, p: (t - s) / d, label, color });
    });
    return out;
  };

  /** Edges lit by hops: lights up while travelling, fades over `fadeAfter` seconds after arrival. */
  SD.lit = function (t, hops, fadeAfter = 1.2) {
    const out = {};
    hops.forEach(([from, to, s, d]) => {
      if (t < s) return;
      const k = t <= s + d ? 1 : Math.max(0, 1 - (t - s - d) / fadeAfter);
      const key = `${from}>${to}`;
      out[key] = Math.max(out[key] || 0, k);
      out[`${to}>${from}`] = Math.max(out[`${to}>${from}`] || 0, k);
    });
    return out;
  };

  /** Glow per node from hops: a node glows while a packet arrives at it (and briefly after). */
  SD.glowFrom = function (t, hops, hold = 0.9) {
    const out = {};
    hops.forEach(([, to, s, d]) => {
      const a = s + d;
      if (t >= a - 0.15 && t <= a + hold) out[to] = Math.max(out[to] || 0, 1 - Math.max(0, t - a) / hold);
    });
    return out;
  };

  window.SD = SD;
})();
