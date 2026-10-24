// View "ranked-list": a ranked ledger with group filter chips, a value bar per row,
// rank moves since the previous saved day, and the items that dropped out.
//
// Options (dataset.json "options"):
//   valueField  — item field shown on the right and as the bar (required)
//   valueFormat — "percent", "money" or "number"
//   valueLabel  — label for the summed value in the summary line
//   groupField  — item field used for filter chips (optional)
//   keyField    — item field that identifies the same item across days (default "name")
(function () {
  const filters = {};   // per dataset: chosen group
  const sorts = {};     // per dataset: "rank" or "name"

  function quoteUrl(t) { return "https://finance.yahoo.com/quote/" + encodeURIComponent(t.replace(".", "-")); }

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  Tracker.registerView("ranked-list", {
    render(root, ctx) {
      const { id, options: o, day, previous, format } = ctx;
      const key = o.keyField || "name";
      const items = day.items;
      const groups = o.groupField ? ["All", ...new Set(items.map(s => s[o.groupField]).filter(Boolean))] : [];
      let active = filters[id] || "All";
      if (!groups.includes(active)) active = "All";
      const sort = sorts[id] || "rank";

      const controls = el("div", "controls");
      const chips = el("div", "chips");
      chips.setAttribute("role", "group");
      chips.setAttribute("aria-label", "Filter");
      groups.forEach(g => {
        const n = g === "All" ? items.length : items.filter(s => s[o.groupField] === g).length;
        const b = el("button", "chip", `${g} (${n})`);
        b.type = "button";
        b.setAttribute("aria-pressed", String(g === active));
        b.addEventListener("click", () => { filters[id] = g; Tracker.redraw(); });
        chips.appendChild(b);
      });
      const sortBtn = el("button", "sort", sort === "rank" ? "Sort: by rank" : "Sort: A–Z");
      sortBtn.type = "button";
      sortBtn.addEventListener("click", () => { sorts[id] = sort === "rank" ? "name" : "rank"; Tracker.redraw(); });
      controls.append(chips, sortBtn);

      let rows = items.filter(s => active === "All" || s[o.groupField] === active);
      rows = rows.slice().sort(sort === "rank" ? (a, b) => a.rank - b.rank : (a, b) => String(a.name).localeCompare(b.name));

      const summary = el("div", "summary");
      const stats = [["Showing", rows.length + " of " + items.length]];
      if (o.valueLabel) stats.push([o.valueLabel, format.value(rows.reduce((t, s) => t + Number(s[o.valueField]), 0), o.valueFormat)]);
      stats.push(["Days saved", String(ctx.dates.length)]);
      stats.forEach(([label, value]) => {
        const span = el("span");
        span.append(label + " ", el("strong", null, value));
        summary.appendChild(span);
      });

      const list = el("ol", "list");
      const maxV = Math.max(...items.map(s => Math.abs(Number(s[o.valueField]))));
      if (!rows.length) list.appendChild(el("li", "empty", "Nothing in this group."));
      rows.forEach(s => {
        const li = el("li", "row");
        li.appendChild(el("span", "rank", "#" + s.rank));
        const name = el("div", "name");
        const b = el("b");
        if (s.ticker) {
          const a = el("a", null, s.name);
          a.href = quoteUrl(s.ticker); a.target = "_blank"; a.rel = "noopener";
          b.appendChild(a);
        } else b.textContent = s.name;
        const meta = el("div", "meta");
        if (s.ticker) meta.appendChild(el("span", "ticker", s.ticker));
        if (o.groupField && s[o.groupField]) meta.appendChild(el("span", "group", s[o.groupField]));
        if (previous) {
          const before = previous.items.find(p => p[key] === s[key]);
          const d = before ? before.rank - s.rank : null;
          const mv = el("span", "move", !before ? "new" : d > 0 ? "▲" + d : d < 0 ? "▼" + -d : "–");
          if (!before || d > 0) mv.classList.add("up"); else if (d < 0) mv.classList.add("down");
          meta.appendChild(mv);
        }
        name.append(b, meta);
        li.append(name, el("span", "value", format.value(s[o.valueField], o.valueFormat)));
        const bar = el("div", "bar"), fill = el("span");
        bar.setAttribute("aria-hidden", "true");
        fill.style.width = (maxV ? Math.abs(Number(s[o.valueField])) / maxV * 100 : 0).toFixed(1) + "%";
        bar.appendChild(fill);
        li.appendChild(bar);
        if (s.blurb) li.appendChild(el("p", "blurb", s.blurb));
        list.appendChild(li);
      });

      root.append(controls, summary, list);
      const gone = previous ? previous.items.filter(p => !items.some(s => s[key] === p[key])) : [];
      if (gone.length) root.appendChild(el("p", "dropped", "Dropped out since " + format.date(previous.date) + ": " + gone.map(p => p[key]).join(", ")));
    },
  });
})();
