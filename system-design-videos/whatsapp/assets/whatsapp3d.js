/* WhatsApp architecture for a vertical (1080x1920) frame, shared by every scene.
   Floor: x left/right (narrow), z back (top of frame) -> front (bottom of frame).
   Priya (sender) and Rahul (receiver) sit at the top; storage and async at the bottom.     */
(function () {
  const NODES = [
    { id: "priya", kind: "phone", x: -2.5, z: -6.4, label: "Priya" },
    { id: "rahul", kind: "phone", x: 2.5, z: -6.4, label: "Rahul", color: "#38bdf8" },
    { id: "lb", kind: "lb", x: 0, z: -3.9, label: "Load Balancer" },
    { id: "chatA", kind: "server", x: -2.4, z: -1.4, label: "Chat Server A" },
    { id: "chatB", kind: "server", x: 2.4, z: -1.4, label: "Chat Server B" },
    { id: "session", kind: "cache", x: 0, z: 0.9, label: "Session · Redis" },
    { id: "db", kind: "db", x: -2.4, z: 3.3, label: "Cassandra" },
    { id: "push", kind: "cdn", x: 2.6, z: 1.2, label: "Push Notify", scale: 0.8 },
    { id: "kafka", kind: "queue", x: 2.2, z: 3.6, label: "Kafka" },
    { id: "w1", kind: "worker", x: 0.6, z: 5.7, scale: 0.75 },
    { id: "w2", kind: "worker", x: 2.4, z: 5.7, scale: 0.75, label: "Fan-out Workers" },
    { id: "g1", kind: "phone", x: -2.9, z: 6.0, scale: 0.6, color: "#a78bfa" },
    { id: "g2", kind: "phone", x: -1.9, z: 6.3, scale: 0.6, color: "#f472b6" },
    { id: "sh1", kind: "db", x: -3.3, z: 3.3, scale: 0.7, label: "S1" },
    { id: "sh2", kind: "db", x: -1.5, z: 3.3, scale: 0.7, label: "S2" },
  ];
  const EDGES = [
    ["priya", "lb"], ["rahul", "lb"], ["lb", "chatA"], ["lb", "chatB"],
    ["chatA", "session"], ["chatB", "session"], ["chatA", "db"], ["chatB", "push"],
    ["chatA", "kafka"], ["kafka", "w1"], ["kafka", "w2"], ["w1", "g2"], ["w1", "g1"],
    ["chatA", "sh1"], ["chatA", "sh2"],
  ];
  const LATER = ["push", "kafka", "w1", "w2", "g1", "g2", "sh1", "sh2"];

  window.ChatArch = function (canvas, opts = {}) {
    const A = SD.Arch(canvas, Object.assign({
      nodes: NODES, edges: EDGES, fov: 50, shiftY: -300,   // push the diagram below the top text band
      cam: { dist: 15.5, elev: 1.0, target: [0, 0, -1.2] },
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
