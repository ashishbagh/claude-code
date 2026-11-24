/* WhatsApp architecture, laid out top-to-bottom for a 9:16 frame (spotlight style).
   A message travels DOWN the screen: phones (top) -> load balancer -> chat servers -> Redis / storage.
   Scenes frame 2-3 nodes at a time with A.spot(t, beats); everything else dims.                    */
(function () {
  const NODES = [
    { id: "priya", kind: "phone", x: -1.7, z: -6.0, label: "Priya" },
    { id: "rahul", kind: "phone", x: 1.7, z: -6.0, label: "Rahul", color: "#38bdf8" },
    { id: "lb", kind: "lb", x: 0, z: -3.6, label: "Load Balancer" },
    { id: "chatA", kind: "server", x: -1.7, z: -1.2, label: "Server A" },
    { id: "chatB", kind: "server", x: 1.7, z: -1.2, label: "Server B" },
    { id: "session", kind: "cache", x: 0, z: 1.2, label: "Redis" },
    { id: "push", kind: "cdn", x: 2.3, z: 1.4, label: "Push", scale: 0.8 },
    { id: "db", kind: "db", x: -1.9, z: 3.6, label: "Cassandra" },
    { id: "kafka", kind: "queue", x: 1.7, z: 3.8, label: "Kafka" },
    { id: "w1", kind: "worker", x: 0.7, z: 6.2, scale: 0.75, label: "Workers" },
    { id: "w2", kind: "worker", x: 2.7, z: 6.2, scale: 0.75 },
    { id: "g1", kind: "phone", x: -1.0, z: 6.6, scale: 0.65, color: "#a78bfa" },
    { id: "g2", kind: "phone", x: -2.5, z: 6.6, scale: 0.65, color: "#f472b6", label: "Group" },
    { id: "sh1", kind: "db", x: -2.9, z: 3.6, scale: 0.8, label: "Shard 1" },
    { id: "sh2", kind: "db", x: -0.9, z: 3.6, scale: 0.8, label: "Shard 2" },
  ];
  const EDGES = [
    ["priya", "lb"], ["rahul", "lb"], ["lb", "chatA"], ["lb", "chatB"],
    ["chatA", "session"], ["chatB", "session"], ["chatA", "db"], ["chatB", "db"], ["chatB", "push"],
    ["chatA", "kafka"], ["kafka", "w1"], ["kafka", "w2"], ["w1", "g1"], ["w1", "g2"],
    ["chatA", "sh1"], ["chatA", "sh2"],
  ];
  const LATER = ["push", "kafka", "w1", "w2", "g1", "g2", "sh1", "sh2"];

  window.ChatArch = function (canvas, opts = {}) {
    const A = SD.Arch(canvas, Object.assign({
      nodes: NODES, edges: EDGES, fov: 50, band: 0.35, shiftY: -110, labelScale: 1.35, packetScale: 1.6, edgeScale: 1.7,
      cam: { dist: 16, elev: 1.1, target: [0, 0.5, 0] },
    }, opts));
    /** core nodes at 1, the later (offline / scale) ones at 0, then `extra` on top */
    A.base = (extra = {}) => {
      const m = {};
      NODES.forEach((n) => { m[n.id] = LATER.includes(n.id) ? 0 : 1; });
      return Object.assign(m, extra);
    };
    return A;
  };
})();
