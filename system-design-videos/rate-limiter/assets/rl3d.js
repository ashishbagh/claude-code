/* Rate limiter (token bucket) stage for the blueprint-glow theme. RL(canvas).draw(state):
     t        scene time (s)
     strip    { appear, status:[...] }      pipeline strip on top (CLIENT · LIMITER · API · REDIS · DB)
     view     [top, height]                  main-stage band in px
     show     { title, client, bucket, server, cluster }  which props are on stage (0..1 each)
     title    0..1                           particle title convergence
     heat     0..1                           API server overload (red pulse)
     flood    [t0, t1]                       stream of requests client → server without a limiter
     tokens   [{ slot, in, out }]            in = time it drops in (-1 = already there), out = time a request takes it
     reqs     [{ t0, ok }]                   request cubes: client → bucket → server (ok) or bounce back (429)
     pulses   true                           cluster mode: API servers ping Redis                                    */
(function () {
  const STAGES = [{ name: "CLIENT", color: "#34d399" }, { name: "LIMITER", color: "#ff9f2e" }, { name: "API", color: "#22d3ee" },
    { name: "REDIS", color: "#f472b6" }, { name: "DB", color: "#a78bfa" }];
  const CX = -3.7, SX = 3.7, BX = 0;
  const slotY = (s) => 0.32 + s * 0.5;

  function RL(canvas) {
    const LC = window.LC, SD = window.SD;
    const R = SD.renderer(canvas);
    const strip = SD.strip(STAGES);
    const scene = new THREE.Scene(); SD.lights(scene);
    const camera = new THREE.PerspectiveCamera(30, 2, 0.1, 100);
    const C = (h) => new THREE.Color(h);

    const floor = SD.grid(20, 8, 0.6, 0x3b2a14); floor.position.y = -0.02; scene.add(floor);

    const title = SD.particleText("RATE LIMITER", { width: 8.6 }); title.position.set(0, 1.0, 0); title.scale.setScalar(0.8); scene.add(title);

    const client = SD.wireBox(1.4, 1.4, 1.4, C("#34d399")); client.position.set(CX, 0.7, 0); scene.add(client);
    const server = SD.wireBox(1.6, 1.8, 1.6, C("#22d3ee")); server.position.set(SX, 0.9, 0); scene.add(server);
    const bucket = SD.wireBox(1.5, 2.3, 1.5, C("#ff9f2e")); bucket.position.set(BX, 1.15, 0); scene.add(bucket);
    const lab = (txt, col, x, z = 1.25) => { const l = SD.label(txt, col, 2.0, { font: "800 72px 'JetBrains Mono', monospace" }); l.position.set(x, -0.3, z); scene.add(l); return l; };
    const lClient = lab("CLIENT", "#34d399", CX), lServer = lab("API", "#22d3ee", SX), lBucket = lab("BUCKET", "#ff9f2e", BX);

    const tokens = [0, 1, 2, 3, 4].map(() => { const m = SD.glowCube(0.4, C("#ffb347")); scene.add(m); return m; });
    const reqs = [0, 1, 2, 3, 4, 5, 6, 7].map(() => { const m = SD.glowCube(0.36, C("#e5e7eb")); scene.add(m); return m; });
    const flood = Array.from({ length: 30 }, () => { const m = SD.glowCube(0.22, C("#e5e7eb")); scene.add(m); return m; });

    // cluster: three API servers sharing one Redis
    const apis = [-3.2, 0, 3.2].map((x) => { const b = SD.wireBox(1.3, 0.9, 1.0, C("#22d3ee")); b.position.set(x, 2.1, 0); scene.add(b); return b; });
    const lApis = [-3.2, 0, 3.2].map((x, i) => { const l = SD.label("API " + (i + 1), "#22d3ee", 1.8, { font: "800 72px 'JetBrains Mono', monospace" }); l.position.set(x, 2.85, 0); scene.add(l); return l; });
    const redis = SD.wireBox(2.2, 0.9, 1.2, C("#f472b6")); redis.position.set(0, 0.45, 0); scene.add(redis);
    const lRedis = SD.label("REDIS", "#f472b6", 2.0, { font: "800 72px 'JetBrains Mono', monospace" }); lRedis.position.set(0, -0.3, 1.0); scene.add(lRedis);
    const links = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([-3.2, 0, 3.2].flatMap((x) => [new THREE.Vector3(x, 1.65, 0), new THREE.Vector3(x * 0.25, 0.9, 0)])),
      new THREE.LineDashedMaterial({ color: 0xf472b6, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity: 0.7 }));
    links.computeLineDistances(); scene.add(links);
    const pulses = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffd1ea })); scene.add(m); return m; });

    const green = C("#34d399"), red = C("#f87171"), white = C("#e5e7eb"), cyan = C("#22d3ee");

    function draw(st) {
      const t = st.t ?? 0, show = st.show || {};
      const vis = (o, k) => { o.visible = k > 0.01; if (o.alpha) o.alpha(Math.min(1, k)); if (o.material && o.material.opacity !== undefined && !o.alpha) { o.material.opacity = Math.min(1, k); } };
      R.clear();
      if (st.strip) { strip.draw({ ...st.strip, t }); R.view(strip.scene, strip.camera, 290, 340); }

      camera.position.set(0, 2.6, 7.4); camera.lookAt(0, 1.0, 0); camera.fov = st.fov || 30;
      floor.visible = !show.title || show.client || show.bucket || show.cluster;

      // particle title
      title.visible = (show.title ?? 0) > 0.01;
      if (title.visible) { title.update(st.title ?? 1, t); title.material.opacity = show.title; title.rotation.y = 0.15 * Math.sin(t * 0.4); }

      // props
      vis(client, show.client ?? 0); vis(lClient, show.client ?? 0);
      vis(server, show.server ?? 0); vis(lServer, show.server ?? 0);
      vis(bucket, show.bucket ?? 0); vis(lBucket, show.bucket ?? 0);
      const heat = st.heat ?? 0;
      server.tint(LC.mix(cyan, red, heat)); server.fill(heat * (0.5 + 0.3 * Math.sin(t * 10)));
      server.position.x = SX + heat * 0.05 * Math.sin(t * 40);

      // flood (no limiter): small cubes streaming client → server
      flood.forEach((m, i) => {
        if (!st.flood) { m.visible = false; return; }
        const [a, b] = st.flood, period = 1.1, ph = ((t - a) / period - i / flood.length) % 1;
        const on = t >= a + (i / flood.length) * period && t < b;
        m.visible = on;
        if (on) { const p = ph < 0 ? ph + 1 : ph; m.position.set(CX + 0.7 + (SX - CX - 1.5) * p, 0.5 + 0.35 * Math.sin(i * 2.1), 0.7 * Math.cos(i * 1.3)); m.rotation.set(t * 3 + i, t * 2, 0); }
      });

      // tokens
      const reqList = st.reqs || [];
      tokens.forEach((m, i) => {
        const tk = (st.tokens || [])[i];
        if (!tk || (show.bucket ?? 0) < 0.01) { m.visible = false; return; }
        const base = new THREE.Vector3(BX, slotY(tk.slot), 0);
        let pos = base.clone(), op = 1, sc = 1;
        if (tk.in >= 0) { const k = LC.prog(t, tk.in, 0.6); if (t < tk.in) { m.visible = false; return; } pos.y += (1 - k) * 2.6; sc = 0.6 + 0.4 * k; }
        if (tk.out != null && t >= tk.out) {   // travels with the request that took it
          const k = LC.prog(t, tk.out, 0.7);
          pos = new THREE.Vector3(BX + 0.9 + (SX - 0.8 - BX - 0.9) * k, slotY(tk.slot) + (0.95 - slotY(tk.slot)) * k + 0.45, 0.9 * k);
          op = 1 - LC.prog(t, tk.out + 0.7, 0.3); sc = 1 - 0.3 * k;
        }
        m.visible = op > 0.02; m.position.copy(pos); m.scale.setScalar(sc * (1 + 0.05 * Math.sin(t * 4 + i))); m.material.opacity = op;
      });

      // requests: client → bucket → server (ok) or bounce (429)
      reqs.forEach((m, i) => {
        const r = reqList[i];
        if (!r || t < r.t0) { m.visible = false; return; }
        const u = t - r.t0; let x, y = 0.95, z = 0.9, col = white, op = 1;
        if (u < 0.6) { x = CX + 0.75 + (BX - 0.9 - CX - 0.75) * LC.smooth(u / 0.6); }
        else if (r.ok) { const k = LC.smooth((u - 0.6) / 0.7); x = BX - 0.9 + (SX - 0.8 - (BX - 0.9)) * k; col = LC.mix(white, green, Math.min(1, (u - 0.6) * 3)); op = 1 - LC.prog(u, 1.3, 0.3); }
        else { const k = LC.smooth((u - 0.6) / 0.5); x = BX - 0.9 - 1.6 * k; y = 0.95 + 0.6 * Math.sin(Math.PI * k); col = red; op = 1 - LC.prog(u, 1.2, 0.4); }
        m.visible = op > 0.02; m.position.set(x, y, z); m.rotation.set(u * 2, u * 3, 0);
        m.material.color.copy(col); m.material.emissive.copy(col); m.material.opacity = op;
      });

      // cluster
      const cl = show.cluster ?? 0;
      apis.forEach((b, i) => { vis(b, cl); vis(lApis[i], cl); b.fill(0.15 + 0.25 * Math.max(0, Math.sin(t * 2.2 - i * 2.1))); });
      vis(redis, cl); vis(lRedis, cl); links.visible = cl > 0.01; links.material.opacity = 0.7 * cl;
      redis.fill(0.2 + 0.2 * Math.sin(t * 3));
      pulses.forEach((p, i) => {
        p.visible = cl > 0.5 && !!st.pulses;
        if (!p.visible) return;
        const x = [-3.2, 0, 3.2][i], ph = ((t * 0.7 + i * 0.33) % 1), k = ph < 0.5 ? ph * 2 : 2 - ph * 2;
        p.position.set(x + (x * 0.25 - x) * k, 1.65 + (0.9 - 1.65) * k, 0);
      });

      if (st.view) R.view(scene, camera, st.view[0], st.view[1]);
    }
    return { draw };
  }
  RL.STAGES = STAGES;
  window.RL = RL;
})();
