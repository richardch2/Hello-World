// View "price-chart": one line chart per stock, with a time-range picker and a
// readout you can drag across (or hover) to see the close on any day.
//
// Items: { rank, ticker, name, closes: [["YYYY-MM-DD", close], ...] } oldest first.
// Options (dataset.json "options"):
//   ranges       — [[label, trading days], ...], e.g. [["1M", 21], ["3M", 65]]
//   defaultRange — label picked at first
//   groupField   — item field shown as a tag (optional)
(function () {
  const NS = "http://www.w3.org/2000/svg";
  const W = 300, H = 100;
  const picked = {};   // per dataset: range label
  const sorts = {};    // per dataset: "rank" or "change"

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function svg(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
  }
  function quoteUrl(t) { return "https://finance.yahoo.com/quote/" + encodeURIComponent(t.replace(".", "-")); }
  function pct(a, b) { return (b / a - 1) * 100; }

  function chart(points, up, format) {
    const wrap = el("div", "chart");
    const closes = points.map(p => p[1]);
    const lo = Math.min(...closes), hi = Math.max(...closes);
    const pad = (hi - lo) * 0.08 || 1;
    const x = i => points.length > 1 ? (i / (points.length - 1)) * W : W / 2;
    const y = v => H - ((v - lo + pad) / (hi - lo + 2 * pad)) * H;
    const line = points.map((p, i) => (i ? "L" : "M") + x(i).toFixed(2) + " " + y(p[1]).toFixed(2)).join(" ");

    const s = svg("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: up ? "up" : "down", role: "img" });
    s.setAttribute("aria-label", `Closing price from ${format.date(points[0][0])} to ${format.date(points[points.length - 1][0])}, low $${lo.toFixed(2)}, high $${hi.toFixed(2)}`);
    s.append(
      svg("line", { x1: 0, x2: W, y1: y(closes[0]), y2: y(closes[0]), class: "base", "vector-effect": "non-scaling-stroke" }),
      svg("path", { d: line + ` L${W} ${H} L0 ${H} Z`, class: "area" }),
      svg("path", { d: line, class: "line", "vector-effect": "non-scaling-stroke" }),
    );
    const cursor = svg("line", { y1: 0, y2: H, class: "cursor", "vector-effect": "non-scaling-stroke", visibility: "hidden" });
    s.appendChild(cursor);

    const axis = el("div", "axis");
    const left = el("span", null, format.date(points[0][0]));
    const readout = el("span", "readout", "");
    const right = el("span", null, format.date(points[points.length - 1][0]));
    axis.append(left, readout, right);

    function show(evt) {
      const r = s.getBoundingClientRect();
      const i = Math.round(Math.min(Math.max((evt.clientX - r.left) / r.width, 0), 1) * (points.length - 1));
      const xi = x(i).toFixed(2);
      cursor.setAttribute("x1", xi); cursor.setAttribute("x2", xi); cursor.setAttribute("visibility", "visible");
      readout.textContent = format.date(points[i][0]) + " · " + format.value(points[i][1], "money");
    }
    function hide() { cursor.setAttribute("visibility", "hidden"); readout.textContent = ""; }
    s.addEventListener("pointermove", show);
    s.addEventListener("pointerdown", show);
    s.addEventListener("pointerleave", hide);

    const range = el("div", "range");
    range.append(el("span", null, "Low " + format.value(lo, "money")), el("span", null, "High " + format.value(hi, "money")));
    wrap.append(s, axis, range);
    return wrap;
  }

  Tracker.registerView("price-chart", {
    render(root, ctx) {
      const { id, options: o, day, format } = ctx;
      const ranges = o.ranges || [["All", Infinity]];
      let label = picked[id] || o.defaultRange || ranges[0][0];
      if (!ranges.some(r => r[0] === label)) label = ranges[0][0];
      const span = ranges.find(r => r[0] === label)[1];
      const sort = sorts[id] || "rank";

      const controls = el("div", "controls");
      const chips = el("div", "chips");
      chips.setAttribute("role", "group");
      chips.setAttribute("aria-label", "Time range");
      ranges.forEach(([l]) => {
        const b = el("button", "chip", l);
        b.type = "button";
        b.setAttribute("aria-pressed", String(l === label));
        b.addEventListener("click", () => { picked[id] = l; Tracker.redraw(); });
        chips.appendChild(b);
      });
      const sortBtn = el("button", "sort", sort === "rank" ? "Sort: by rank" : "Sort: by change");
      sortBtn.type = "button";
      sortBtn.addEventListener("click", () => { sorts[id] = sort === "rank" ? "change" : "rank"; Tracker.redraw(); });
      controls.append(chips, sortBtn);

      // A range of N trading days compares against the close N days before the last one.
      const rows = day.items.map(s => {
        const points = s.closes.slice(-Math.min(span + 1, s.closes.length));
        return { s, points, change: pct(points[0][1], points[points.length - 1][1]) };
      });
      if (sort === "change") rows.sort((a, b) => b.change - a.change);
      else rows.sort((a, b) => a.s.rank - b.s.rank);

      const summary = el("div", "summary");
      const ups = rows.filter(r => r.change > 0).length;
      [["Up over " + label, String(ups)], ["Down", String(rows.length - ups)], ["Days saved", String(ctx.dates.length)]].forEach(([l, v]) => {
        const sp = el("span");
        sp.append(l + " ", el("strong", null, v));
        summary.appendChild(sp);
      });

      const grid = el("div", "charts");
      rows.forEach(({ s, points, change }) => {
        const card = el("article", "card");
        const head = el("div", "card-head");
        const name = el("div", "name");
        const b = el("b");
        const a = el("a", null, s.name);
        a.href = quoteUrl(s.ticker); a.target = "_blank"; a.rel = "noopener";
        b.appendChild(a);
        const meta = el("div", "meta");
        meta.appendChild(el("span", "ticker", s.ticker));
        if (o.groupField && s[o.groupField]) meta.appendChild(el("span", "group", s[o.groupField]));
        name.append(b, meta);
        const nums = el("div", "nums");
        nums.append(
          el("span", "price", format.value(points[points.length - 1][1], "money")),
          el("span", "value " + (change < 0 ? "down" : "up"), format.value(change, "change")),
        );
        head.append(name, nums);
        card.append(head, chart(points, change >= 0, format));
        grid.appendChild(card);
      });

      root.append(controls, summary, grid);
    },
  });
})();
