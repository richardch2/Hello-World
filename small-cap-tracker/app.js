// Tracker shell: feature tabs, day picker and history. Views do the drawing.
//
// A view registers itself with Tracker.registerView(name, { render(root, ctx) }).
// ctx = { id, meta, options, day, previous, dates, format }
//   day      — the snapshot being shown ({date, source, items})
//   previous — the saved snapshot before it, or null
// A dataset picks its view in data/<id>/dataset.json ("view": "<name>").
(function () {
  const views = {};
  const state = { id: null, date: null };
  const $ = id => document.getElementById(id);

  const format = {
    date(d) {
      return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    },
    value(v, kind) {
      const n = Number(v);
      if (kind === "percent") return n.toFixed(2) + "%";
      if (kind === "change") return (n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(2) + "%";
      if (kind === "money") return "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      return n.toLocaleString("en-US");
    },
  };

  function datasets() {
    const all = (window.TRACKER_DATA && window.TRACKER_DATA.datasets) || {};
    return Object.entries(all)
      .map(([id, d]) => ({ id, ...d }))
      .sort((a, b) => (a.meta.order ?? 99) - (b.meta.order ?? 99) || a.id.localeCompare(b.id));
  }

  function current() { return datasets().find(d => d.id === state.id); }

  function buildTabs(list) {
    const tabs = $("tabs");
    tabs.innerHTML = "";
    tabs.hidden = list.length < 2;
    list.forEach(d => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "tab"; b.setAttribute("role", "tab");
      b.textContent = d.meta.title || d.id;
      b.dataset.id = d.id;
      b.addEventListener("click", () => go(d.id, null));
      tabs.appendChild(b);
    });
  }

  function buildDays(ds) {
    const sel = $("date");
    sel.innerHTML = "";
    ds.dates.forEach(d => {
      const o = document.createElement("option");
      o.value = d; o.textContent = format.date(d);
      sel.appendChild(o);
    });
  }

  function go(id, date) {
    const list = datasets();
    const ds = list.find(d => d.id === id) || list[0];
    if (!ds) return;
    if (ds.id !== state.id) { state.id = ds.id; buildDays(ds); }
    state.date = ds.dates.includes(date) ? date : ds.dates[0];
    try { history.replaceState(null, "", "#" + ds.id + "/" + state.date); } catch (e) {}
    draw();
  }

  function draw() {
    const ds = current();
    const meta = ds.meta;
    $("tabs").querySelectorAll(".tab").forEach(t => t.setAttribute("aria-selected", String(t.dataset.id === ds.id)));
    $("heading").textContent = meta.heading || meta.title || ds.id;
    $("lede").textContent = meta.lede || "";
    document.title = meta.heading || meta.title || "Small-Cap Tracker";

    const root = $("view");
    root.innerHTML = "";
    const i = ds.dates.indexOf(state.date);
    const day = ds.days[state.date];
    if (!day) {
      $("eyebrow").textContent = meta.eyebrow || "";
      $("compare").textContent = "";
      $("source").textContent = "";
      root.innerHTML = '<p class="empty">No days saved for this yet.</p>';
      return;
    }
    const previous = i < ds.dates.length - 1 ? ds.days[ds.dates[i + 1]] : null;
    $("date").value = state.date;
    $("prev").disabled = !previous;
    $("next").disabled = i <= 0;
    $("eyebrow").textContent = (meta.eyebrow ? meta.eyebrow + " · " : "") + "as of " + format.date(day.date);
    $("compare").textContent = previous ? "Changes vs " + format.date(previous.date) : "First saved day";
    $("source").textContent = day.source ? "Data from " + day.source + "." : "";

    const view = views[meta.view];
    if (!view) { root.innerHTML = '<p class="empty"></p>'; root.firstChild.textContent = "No view named " + meta.view + "."; return; }
    view.render(root, { id: ds.id, meta, options: meta.options || {}, day, previous, dates: ds.dates, format });
  }

  window.Tracker = {
    registerView(name, view) { views[name] = view; },
    redraw: draw,
  };

  document.addEventListener("DOMContentLoaded", () => {
    const list = datasets();
    if (!list.length) {
      $("view").innerHTML = '<p class="empty">Couldn’t find any saved data. Run scripts/add_snapshot.py to rebuild data/all.js, then reopen this page.</p>';
      return;
    }
    buildTabs(list);
    $("date").addEventListener("change", e => go(state.id, e.target.value));
    $("prev").addEventListener("click", () => { const ds = current(); go(ds.id, ds.dates[ds.dates.indexOf(state.date) + 1]); });
    $("next").addEventListener("click", () => { const ds = current(); go(ds.id, ds.dates[ds.dates.indexOf(state.date) - 1]); });
    const [id, date] = location.hash.slice(1).split("/");
    go(id, date);
  });
})();
