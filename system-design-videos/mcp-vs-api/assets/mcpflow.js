/* MCP vs API: icon-card catalog + per-scene layouts for sdflow.js (9:16, flow zone y 680..1240). */
(function () {
  const CAT = {
    priya:   { icon: "📱", label: "Priya",       color: "#22c55e" },
    app:     { icon: "🤖", label: "AI App",      color: "#a78bfa" },
    yourapp: { icon: "📲", label: "Your App",    color: "#a78bfa" },
    dev:     { icon: "👩‍💻", label: "Dev code",   color: "#facc15" },
    weather: { icon: "☁️", label: "Weather API", color: "#38bdf8" },
    github:  { icon: "🗂", label: "GitHub",      color: "#e2e8f0" },
    slack:   { icon: "💬", label: "Slack",       color: "#f472b6" },
    db:      { icon: "🗄", label: "Database",    color: "#22c55e" },
    a1:      { icon: "🤖", label: "AI App 1",    color: "#a78bfa" },
    a2:      { icon: "🤖", label: "AI App 2",    color: "#a78bfa" },
    a3:      { icon: "🤖", label: "AI App 3",    color: "#a78bfa" },
    hub:     { icon: "🔌", label: "MCP",         color: "#fb923c" },
    mcpw:    { icon: "🧩", label: "MCP Server", color: "#fb923c" },
    api:     { icon: "🚪", label: "API",         color: "#38bdf8" },
    mcp:     { icon: "🔌", label: "MCP",         color: "#fb923c" },
    tools:   { icon: "🛠", label: "Tools",       color: "#facc15" },
    res:     { icon: "📄", label: "Resources",   color: "#22c55e" },
    prompts: { icon: "📝", label: "Prompts",     color: "#f472b6" },
    appS:    { icon: "🤖", label: "AI App",      color: "#a78bfa" },
    mcpS:    { icon: "🧩", label: "MCP",         color: "#fb923c" },
    apiS:    { icon: "☁️", label: "API",         color: "#38bdf8" },
  };
  const X = { c1: 225, c2: 540, c3: 855 }, Y = { r1: 730, r2: 880, r3: 1030, r4: 1180 };
  const LAYOUTS = {
    hook:    { app: [X.c2, Y.r2], api: [X.c1, Y.r4], mcp: [X.c3, Y.r4] },
    api:     { yourapp: [X.c1, Y.r2], weather: [X.c3, Y.r2], dev: [X.c1, Y.r4] },
    // N x M: 3 apps on the left, 4 services on the right, every pair wired by hand
    nxm:     { a1: [X.c1, 805], a2: [X.c1, 955], a3: [X.c1, 1105], weather: [X.c3, Y.r1], github: [X.c3, Y.r2], slack: [X.c3, Y.r3], db: [X.c3, Y.r4] },
    // N + M: everyone plugs into the protocol once
    nplusm:  { a1: [X.c1, 805], a2: [X.c1, 955], a3: [X.c1, 1105], hub: [X.c2, 955], weather: [X.c3, Y.r1], github: [X.c3, Y.r2], slack: [X.c3, Y.r3], db: [X.c3, Y.r4] },
    flow:    { priya: [X.c1, Y.r2], app: [X.c1, Y.r4], mcpw: [X.c3, Y.r4], weather: [X.c3, Y.r2] },
    prims:   { mcpw: [X.c2, Y.r1], tools: [X.c1, Y.r3], res: [X.c2, Y.r3], prompts: [X.c3, Y.r3] },
    layers:  { appS: [180, Y.r4], mcpS: [540, Y.r4], apiS: [900, Y.r4] },   // narrow cards (w 220) so the arrows show
  };
  const NXM = [];
  ["a1", "a2", "a3"].forEach((a) => ["weather", "github", "slack", "db"].forEach((s) => NXM.push([a, s])));
  const EDGES = {
    hook: [["app", "api"], ["app", "mcp"]],
    api: [["yourapp", "weather"], ["dev", "yourapp"]],
    nxm: NXM,
    nplusm: [["a1", "hub"], ["a2", "hub"], ["a3", "hub"], ["hub", "weather"], ["hub", "github"], ["hub", "slack"], ["hub", "db"]],
    flow: [["priya", "app"], ["app", "mcpw"], ["mcpw", "weather"]],
    prims: [["mcpw", "tools"], ["mcpw", "res"], ["mcpw", "prompts"]],
    layers: [["appS", "mcpS"], ["mcpS", "apiS"]],
  };
  window.McpFlow = function (el, layout, opts = {}) {
    const pos = LAYOUTS[layout], nodes = {};
    Object.keys(pos).forEach((id) => { nodes[id] = Object.assign({}, CAT[id], { x: pos[id][0], y: pos[id][1] }); });
    return SD.Flow(el, Object.assign({ nodes, edges: opts.guides === false ? [] : EDGES[layout],
      card: layout === "layers" ? { w: 220, h: 100 } : { w: 290, h: 100 } }, opts));
  };
  window.McpFlow.NXM = NXM;
})();
