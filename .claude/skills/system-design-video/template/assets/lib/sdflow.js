/* Flat 2D flowchart for 9:16 system-design scenes (classic script, needs LC). No WebGL.

   const F = SD.Flow(el, {                       // el: an empty absolutely-positioned div in the scene
     nodes: { priya: { icon: "📱", label: "Priya", color: "#22c55e", x: 250, y: 730 }, ... },   // x/y = card centre (px)
     edges: [["priya", "lb"], ...],              // faint guide lines (no direction) between cards
     card: { w: 260, h: 100 },
   });
   F.draw(t, {
     appear: { id: 0..1 },                       // card pops in (default 1)
     dim:    { id: 0..1 },                       // greyed out (e.g. a user who is offline)
     glow:   { id: 0..1 },                       // yellow ring: this card is doing the work
     hops:   [[from, to, startSec, durSec, label, color, keepSec?], ...],   // keepSec 99 = stays (open connection)
   });

   Every hop is drawn as an ARROW that grows from `from` to `to` (direction is never ambiguous), with its
   label riding the arrow tip; after arrival it stays lit for `hold` s, then fades back to the guide line.
   Cards glow automatically while a hop arrives at them.                                                   */
(function () {
  const SD = window.SD || (window.SD = {});
  const NS = "http://www.w3.org/2000/svg";

  SD.Flow = function (el, cfg) {
    const LC = window.LC;
    const W = window.LC_W || 1080, H = window.LC_H || 1920;
    const cw = (cfg.card && cfg.card.w) || 260, ch = (cfg.card && cfg.card.h) || 100;
    const hold = cfg.hold ?? 1.6;
    el.style.position = "absolute"; el.style.left = "0"; el.style.top = "0";
    el.style.width = W + "px"; el.style.height = H + "px";

    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", W); svg.setAttribute("height", H);
    svg.style.position = "absolute"; svg.style.left = "0"; svg.style.top = "0";
    el.appendChild(svg);
    const defs = document.createElementNS(NS, "defs"); svg.appendChild(defs);
    const markers = {};
    function marker(color) {
      if (markers[color]) return markers[color];
      const id = "fa" + Object.keys(markers).length + "-" + Math.round(Math.abs(Math.sin(W + Object.keys(markers).length)) * 1e6);
      const m = document.createElementNS(NS, "marker");
      m.setAttribute("id", id); m.setAttribute("viewBox", "0 0 10 10"); m.setAttribute("refX", "6"); m.setAttribute("refY", "5");
      m.setAttribute("markerWidth", "4"); m.setAttribute("markerHeight", "4"); m.setAttribute("orient", "auto-start-reverse");
      const p = document.createElementNS(NS, "path"); p.setAttribute("d", "M0,0 L10,5 L0,10 z"); p.setAttribute("fill", color);
      m.appendChild(p); defs.appendChild(m);
      markers[color] = id;
      return id;
    }

    // cards
    const cards = {};
    Object.entries(cfg.nodes).forEach(([id, n]) => {
      const d = document.createElement("div");
      d.className = "f-card";
      d.style.left = (n.x - cw / 2) + "px"; d.style.top = (n.y - ch / 2) + "px";
      d.style.width = cw + "px"; d.style.height = ch + "px";
      d.style.setProperty("--c", n.color || "#38bdf8");
      d.innerHTML = `<i>${n.icon || ""}</i><span>${n.label || id}</span>`;
      el.appendChild(d);
      cards[id] = { el: d, n };
    });

    // anchor on the card border along the line between two centres
    function anchor(a, b, gap) {
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy) || 1;
      const s = Math.min((cw / 2) / Math.max(Math.abs(dx), 1e-6), (ch / 2) / Math.max(Math.abs(dy), 1e-6));
      const k = Math.min(s, 1) * len + gap;
      return { x: a.x + (dx / len) * k, y: a.y + (dy / len) * k };
    }
    function seg(from, to) {
      const A = cards[from].n, B = cards[to].n;
      return { p: anchor(A, B, 10), q: anchor(B, A, 14) };
    }

    // guide lines
    const guides = (cfg.edges || []).map(([a, b]) => {
      const l = document.createElementNS(NS, "line");
      const { p, q } = seg(a, b);
      l.setAttribute("x1", p.x); l.setAttribute("y1", p.y); l.setAttribute("x2", q.x); l.setAttribute("y2", q.y);
      l.setAttribute("stroke", "#33406b"); l.setAttribute("stroke-width", "6"); l.setAttribute("stroke-linecap", "round");
      l.setAttribute("stroke-dasharray", "2 14");
      svg.appendChild(l);
      return { a, b, l };
    });

    // arrow + label pools
    const arrows = [], pills = [];
    function arrow(i) {
      while (arrows.length <= i) {
        const l = document.createElementNS(NS, "line");
        l.setAttribute("stroke-width", "12"); l.setAttribute("stroke-linecap", "round");
        svg.appendChild(l); arrows.push(l);
      }
      return arrows[i];
    }
    function pill(i) {
      while (pills.length <= i) {
        const d = document.createElement("div"); d.className = "f-pill"; d.setAttribute("data-layout-allow-overlap", ""); el.appendChild(d); pills.push(d);
      }
      return pills[i];
    }

    function draw(t, st = {}) {
      const appear = st.appear || {}, glowIn = st.glow || {}, dim = st.dim || {};
      const hops = st.hops || [];
      const glow = Object.assign({}, glowIn);
      Object.entries(cards).forEach(([id, c]) => {
        const k = LC.smooth(id in appear ? appear[id] : 1);
        c.k = k;
        c.el.style.opacity = k * (1 - 0.65 * LC.clamp(dim[id] || 0));
        c.el.style.transform = `scale(${0.7 + 0.3 * k})`;
      });
      guides.forEach((g) => { g.l.setAttribute("opacity", 0.9 * Math.min(cards[g.a].k, cards[g.b].k)); });

      let ai = 0;
      arrows.forEach((a) => a.setAttribute("opacity", 0));
      pills.forEach((p) => { p.style.opacity = 0; });
      hops.forEach(([from, to, s, d, label, color, keep]) => {
        if (!cards[from] || !cards[to] || t < s) return;
        const p = LC.clamp((t - s) / d);
        const hh = keep ?? hold;   // 7th field: seconds to stay lit after arrival (99 = a connection that stays open)
        const fade = t <= s + d ? 1 : Math.max(0, 1 - (t - s - d - hh) / 0.5);
        if (fade <= 0) return;
        const col = color || "#facc15";
        const { p: P, q: Q } = seg(from, to);
        const e = LC.smooth(p);
        const x2 = P.x + (Q.x - P.x) * e, y2 = P.y + (Q.y - P.y) * e;
        const a = arrow(ai);
        a.setAttribute("x1", P.x); a.setAttribute("y1", P.y); a.setAttribute("x2", x2); a.setAttribute("y2", y2);
        a.setAttribute("stroke", col); a.setAttribute("marker-end", `url(#${marker(col)})`);
        a.setAttribute("opacity", fade);
        if (label && p < 1) {
          const pl = pill(ai);
          pl.textContent = label;
          pl.style.background = col;
          const vertical = Math.abs(Q.y - P.y) > Math.abs(Q.x - P.x);
          const cap = Math.min(e, 0.7);   // label stops at 70% of the arrow so it never covers the target card
          const mx = P.x + (Q.x - P.x) * cap, my = P.y + (Q.y - P.y) * cap;
          pl.style.left = mx + "px"; pl.style.top = my + "px";
          // vertical arrows: label rides beside the arrow, so it never sits on a card
          pl.style.transform = !vertical ? "translate(-50%, -130%)" : mx > W / 2 ? "translate(calc(-100% - 18px), -50%)" : "translate(18px, -50%)";
          pl.style.opacity = Math.min(1, p * 6, (1 - p) * 8 + 0.2);
        }
        if (p > 0.85 && t <= s + d + 0.9) glow[to] = Math.max(glow[to] || 0, 1 - Math.max(0, t - s - d) / 0.9);
        ai++;
      });
      Object.entries(cards).forEach(([id, c]) => {
        const g = LC.clamp(glow[id] || 0);
        c.el.style.boxShadow = g > 0.01 ? `0 0 0 ${6 * g}px rgba(250,204,21,${0.9 * g}), 0 0 ${40 * g}px rgba(250,204,21,${0.5 * g})` : "none";
        c.el.style.transform = `scale(${(0.7 + 0.3 * c.k) * (1 + 0.06 * g)})`;
      });
    }
    return { draw, cards };
  };
})();
