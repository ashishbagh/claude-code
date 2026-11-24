/* WhatsApp components as flat icon cards (sdflow.js). Each scene places only the cards it talks about.
   Flow zone in 9:16: y 680..1240 (below the headline / chat bubble, above the app's own UI).          */
(function () {
  const CAT = {
    priya:   { icon: "📱", label: "Priya",     color: "#22c55e" },
    rahul:   { icon: "📱", label: "Rahul",     color: "#38bdf8" },
    lb:      { icon: "⚖️", label: "Load Bal.", color: "#a78bfa" },
    chatA:   { icon: "🖥", label: "Server A",  color: "#60a5fa" },
    chatB:   { icon: "🖥", label: "Server B",  color: "#60a5fa" },
    session: { icon: "🗺", label: "Redis",     color: "#ef4444" },
    db:      { icon: "🗄", label: "Cassandra", color: "#22c55e" },
    push:    { icon: "🔔", label: "Push",      color: "#2dd4bf" },
    kafka:   { icon: "📨", label: "Kafka",     color: "#fb923c" },
    workers: { icon: "⚙️", label: "Workers",   color: "#ec4899" },
    group:   { icon: "👥", label: "Group",     color: "#a78bfa" },
    sh1:     { icon: "🗄", label: "Shard 1",   color: "#22c55e" },
    sh2:     { icon: "🗄", label: "Shard 2",   color: "#22c55e" },
  };
  // rows 150 px apart, 3 columns (centres 230 / 540 / 850), cards 270 x 100
  const L = { r1: 730, r2: 880, r3: 1030, r4: 1180, c1: 225, c2: 540, c3: 855 };
  const LAYOUTS = {
    // A -> B runs straight across row 3; Redis sits below between them; Push sits between Rahul and Server B
    core: { priya: [L.c1, L.r1], rahul: [L.c3, L.r1], lb: [L.c2, L.r2], push: [L.c3, L.r2], chatA: [L.c1, L.r3], chatB: [L.c3, L.r3], db: [L.c1, L.r4], session: [L.c2, L.r4] },
    scale: { chatA: [L.c1, L.r1], priya: [L.c3, L.r1], kafka: [L.c1, L.r2], workers: [L.c1, L.r3], group: [L.c1, L.r4], sh1: [L.c3, L.r3 - 75], sh2: [L.c3, L.r4] },
  };
  const EDGES = {
    core: [["priya", "lb"], ["rahul", "lb"], ["lb", "chatA"], ["lb", "chatB"], ["chatA", "chatB"], ["chatA", "session"], ["session", "chatB"], ["chatA", "db"], ["chatB", "push"], ["push", "rahul"], ["priya", "chatA"], ["rahul", "chatB"]],
    scale: [["chatA", "kafka"], ["kafka", "workers"], ["workers", "group"], ["chatA", "sh1"], ["chatA", "sh2"], ["priya", "chatA"]],
  };
  /** WaFlow(el, "core" | "scale", ["priya", ...]?) – only the listed ids (default: whole layout) */
  window.WaFlow = function (el, layout, only) {
    const pos = LAYOUTS[layout], nodes = {};
    Object.keys(pos).forEach((id) => {
      if (only && !only.includes(id)) return;
      nodes[id] = Object.assign({}, CAT[id], { x: pos[id][0], y: pos[id][1] });
    });
    const edges = EDGES[layout].filter(([a, b]) => nodes[a] && nodes[b]);
    return SD.Flow(el, { nodes, edges, card: { w: 290, h: 100 } });
  };
})();
