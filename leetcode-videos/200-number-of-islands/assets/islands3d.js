/* 3D island grid for LeetCode 200, shared by the grid scenes.
   IslandGrid(canvas).draw(state) renders one frame; state is derived from time only:
     appear   0..1   tiles rise out of the water one by one
     sunk     {"r,c": [islandIndex, progress 0..1]}   land sinking into the water, recoloured
     scan     [r, c] | null   yellow scan frame,  scanAlpha 0..1
     dfs      [r, c] | null   white frame on the cell DFS is visiting
     orbit    radians         slow camera drift                                              */
(function () {
  const GRID = [
    [1, 1, 0, 0, 0],
    [1, 1, 0, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 1],
  ];
  const ISLANDS = [[[0, 0], [0, 1], [1, 1], [1, 0]], [[2, 2]], [[3, 3], [3, 4]]];
  const ISLAND_COLORS = ["#fb923c", "#ec4899", "#a78bfa"];
  const ROWS = 4, COLS = 5, GAP = 1.08, LAND_H = 0.75;

  function frame(color, size, thick) {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    const bars = [[size, thick, 0, -size / 2], [size, thick, 0, size / 2], [thick, size, -size / 2, 0], [thick, size, size / 2, 0]];
    bars.forEach(([w, d, x, z]) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.05, d), mat);
      m.position.set(x, 0, z); g.add(m);
    });
    g.userData.mat = mat;
    return g;
  }

  function IslandGrid(canvas, opts = {}) {
    const LC = window.LC;
    const ctx = LC.three(canvas, { fov: 30, shiftX: opts.shiftX ?? 330, shiftY: opts.shiftY ?? 0 });
    const { scene, camera } = ctx;

    // water: a slab under the grid that rises with it
    const water = new THREE.Mesh(new THREE.BoxGeometry(COLS * GAP + 0.7, 0.1, ROWS * GAP + 0.7),
      new THREE.MeshStandardMaterial({ color: 0x0f2a5c, roughness: 0.3, metalness: 0.15 }));
    water.position.y = -0.05; scene.add(water);

    const green = LC.color("#22c55e"), waterTile = LC.color("#1e3a78");
    const digit1 = LC.textTexture("1"), digit0 = LC.textTexture("0", { fg: "rgba(255,255,255,0.0)" });
    const digit0dark = LC.textTexture("0");
    // water cells: light digit drawn on a separate transparent plane (a map can only darken)
    const digit0light = LC.textTexture("0", { bg: "rgba(0,0,0,0)", fg: "#9fb8ee" });
    const tiles = {};
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const land = GRID[r][c] === 1;
      const side = new THREE.MeshStandardMaterial({ color: land ? green : waterTile, roughness: 0.55 });
      const top = new THREE.MeshStandardMaterial({ color: land ? green : waterTile, roughness: 0.5, map: land ? digit1 : digit0 });
      const h = land ? LAND_H : 0.12;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.94, h, 0.94), [side, side, top, side, side, side]);
      mesh.position.set((c - (COLS - 1) / 2) * GAP, h / 2, (r - (ROWS - 1) / 2) * GAP);
      scene.add(mesh);
      if (!land) {
        const lbl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8),
          new THREE.MeshBasicMaterial({ map: digit0light, transparent: true, depthWrite: false }));
        lbl.rotation.x = -Math.PI / 2; lbl.position.y = h / 2 + 0.005; mesh.add(lbl);
      }
      tiles[r + "," + c] = { mesh, side, top, land, h, base: mesh.position.clone() };
    }
    const scanFrame = frame(0xfacc15, 1.12, 0.08); scene.add(scanFrame);
    const dfsFrame = frame(0xffffff, 1.06, 0.05); scene.add(dfsFrame);

    function cellPos(r, c) { return tiles[r + "," + c].base; }

    function draw(st) {
      const appear = st.appear ?? 1, sunk = st.sunk || {};
      let i = 0;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++, i++) {
        const t = tiles[r + "," + c];
        const k = LC.smooth(appear * 1.7 - i * 0.035);
        let y = t.h / 2 - (1 - k) * 1.2;
        let col = t.land ? green : waterTile;
        const s = sunk[r + "," + c];
        if (s) {
          const [idx, p] = s;
          col = LC.mix(green, LC.color(ISLAND_COLORS[idx]), p);
          y -= p * (t.h - 0.16);
          t.top.map = p > 0.5 ? digit0dark : digit1;
          t.mesh.scale.setScalar(1 + 0.08 * Math.sin(Math.PI * p));
        } else {
          t.top.map = t.land ? digit1 : digit0;
          t.mesh.scale.setScalar(1);
        }
        t.side.color.copy(col); t.top.color.copy(col);
        t.mesh.position.y = y;
        t.mesh.visible = k > 0.01;
      }
      water.visible = appear > 0.01;
      water.position.y = -0.05 - (1 - LC.smooth(appear * 1.4)) * 1.2;
      const sa = st.scan ? (st.scanAlpha ?? 1) : 0;
      scanFrame.visible = sa > 0.01;
      if (st.scan) { const p = cellPos(...st.scan); scanFrame.position.set(p.x, LAND_H + 0.06, p.z); }
      scanFrame.userData.mat.opacity = sa;
      dfsFrame.visible = !!st.dfs;
      if (st.dfs) { const p = cellPos(...st.dfs); dfsFrame.position.set(p.x, LAND_H + 0.1, p.z); }

      const a = (st.orbit ?? 0);
      camera.position.set(Math.sin(a) * 9.5, 8.6, Math.cos(a) * 9.5 + 0.6);
      camera.lookAt(0, -0.2, 0.25);
      ctx.render();
    }
    return { draw, GRID, ISLANDS, ISLAND_COLORS, ROWS, COLS };
  }

  /** Sinking state for island `idx` whose cells start at `start` s, one every `step` s. Returns calls made so far. */
  IslandGrid.sink = function (t, sunk, idx, start, step) {
    const calls = [];
    let dfs = null;
    ISLANDS[idx].forEach(([r, c], j) => {
      const s = start + j * step;
      if (t >= s) {
        const p = window.LC.prog(t, s, step * 0.8);
        sunk[r + "," + c] = [idx, p];
        if (p < 1) dfs = [r, c];
        calls.push([r, c, s]);
      }
    });
    return { calls, dfs };
  };
  IslandGrid.ISLANDS = ISLANDS;
  IslandGrid.ORDER = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) IslandGrid.ORDER.push([r, c]);

  window.IslandGrid = IslandGrid;
})();
