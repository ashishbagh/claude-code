/* TinyURL architecture layout, shared by scenes s4–s7. TinyArch(canvas, opts) -> SD.Arch.
   Floor coordinates: x left→right, z back→front (camera looks from +z, above).            */
(function () {
  const NODES = [
    { id: "client", kind: "client", x: -6.4, z: 0.4, label: "Client" },
    { id: "lb", kind: "lb", x: -3.5, z: 0.4, label: "Load Balancer" },
    { id: "app1", kind: "server", x: -0.8, z: -1.7 },
    { id: "app2", kind: "server", x: -0.5, z: 0.4 },
    { id: "app3", kind: "server", x: -0.2, z: 2.5, label: "App Servers", labelPos: "front" },
    { id: "kgs", kind: "kgs", x: -0.8, z: -4.3, label: "Key Gen Service" },
    { id: "cache", kind: "cache", x: 2.8, z: -1.4, label: "Redis Cache" },
    { id: "db", kind: "db", x: 2.8, z: 1.9, label: "Key-Value DB" },
    // scale-out (s7)
    { id: "sh1", kind: "db", x: 2.0, z: 1.6, label: "S1", scale: 0.85 },
    { id: "sh2", kind: "db", x: 3.5, z: 1.6, label: "S2", scale: 0.85 },
    { id: "sh3", kind: "db", x: 5.0, z: 1.6, label: "S3", scale: 0.85 },
    { id: "rp1", kind: "db", x: 2.0, z: 3.3, scale: 0.55, color: "#15803d" },
    { id: "rp2", kind: "db", x: 3.5, z: 3.3, scale: 0.55, color: "#15803d" },
    { id: "rp3", kind: "db", x: 5.0, z: 3.3, scale: 0.55, color: "#15803d" },
    { id: "queue", kind: "queue", x: 0.9, z: 5.0, label: "Kafka" },
    { id: "worker", kind: "worker", x: -2.6, z: 5.0, label: "Analytics Workers" },
  ];
  const EDGES = [
    ["client", "lb"], ["lb", "app1"], ["lb", "app2"], ["lb", "app3"],
    ["kgs", "app1"], ["app1", "app2"], ["app2", "app3"],
    ["app2", "cache"], ["app2", "db"],
    ["app2", "sh1"], ["app2", "sh2"], ["app2", "sh3"],
    ["sh1", "rp1"], ["sh2", "rp2"], ["sh3", "rp3"],
    ["app3", "queue"], ["queue", "worker"],
  ];
  const SCALE_OUT = ["sh1", "sh2", "sh3", "rp1", "rp2", "rp3", "queue", "worker"];

  window.TinyArch = function (canvas, opts = {}) {
    const A = SD.Arch(canvas, Object.assign({
      nodes: NODES, edges: EDGES, fov: 34,
      cam: { dist: 18.5, elev: 0.86, target: [-1.4, 0, 0.9] },
    }, opts));
    /** appear map with every node at 1 except the scale-out ones (0) – merge your own on top. */
    A.base = (extra = {}) => {
      const m = {};
      NODES.forEach((n) => { m[n.id] = SCALE_OUT.includes(n.id) ? 0 : 1; });
      return Object.assign(m, extra);
    };
    return A;
  };
})();
