# Small-Cap Tracker

A tracker that keeps a daily history of small-cap data. Its first feature is the **Top 10 holdings** of the iShares Russell 2000 ETF (IWM).

Double-click `index.html` to open it in your browser. It needs no server and no install, and it also works on GitHub Pages.

## Phone home-screen icon

The app has its own icon in `icons/`. To put it on an Android home screen:

1. Open https://richardch2.github.io/Hello-World/ in Chrome. GitHub Pages hosts the app from this repo.
2. Tap ⋮ → **Add to Home screen** (or **Install app**).

The icon then opens the tracker full screen, like an app.

## Layout

```
index.html            page shell: header, feature tabs, day picker
app.js                tabs, day picker, history and links (#<dataset>/<date>)
styles.css            shared colors and type, plus each view's styles
icons/                app icon and manifest for "Add to Home screen"
views/<view>.js       one file per kind of display, e.g. ranked-list.js
data/<dataset>/
  dataset.json        title, wording, which view to use, view options
  YYYY-MM-DD.json     one saved day: {"date", "source", "items": [...]}
  index.json          generated list of days
data/all.js           generated: every dataset in one file, which the page reads
scripts/add_snapshot.py  adds a day, validates it, rebuilds the generated files
```

Git keeps every day's file, so the full history is always there.

## Adding a day

```
python3 scripts/add_snapshot.py top10 path/to/2026-10-22.json
```

To start a new day, copy the latest one and edit it. The script checks the new day against the dataset's rules, saves it and rebuilds `all.js`. Run the script with no arguments to just rebuild.

## Adding a feature

**A new dataset that uses an existing view** (for example, daily top gainers as a ranked list):

1. Create `data/<name>/dataset.json` and set `"view": "ranked-list"`. Set `options.valueField` to the field to show, such as `change_pct`.
2. Add days with `add_snapshot.py <name> day.json`.

A tab appears on its own once there are two or more datasets.

**A new kind of display** (a chart, a table, a calendar of changes):

1. Create `views/<view>.js` that calls `Tracker.registerView("<view>", { render(root, ctx) { … } })`. `ctx` holds the dataset's options, the day being shown, the previous day and every saved date. See the comment at the top of `app.js`.
2. Add a `<script src="views/<view>.js">` tag to `index.html`.
3. Add the fields each item must have to `VIEW_FIELDS` in `scripts/add_snapshot.py`.
4. Put its styles under a new heading in `styles.css`.

Views draw data with `textContent`, never `innerHTML`, so values from a data file can't run as code.
