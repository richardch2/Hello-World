# Small-Cap Top 10

A daily history of the ten largest holdings in the iShares Russell 2000 ETF (IWM).

- `index.html` shows any saved day. It marks rank changes against the previous saved day and lists the stocks that dropped out.
- `data/top10/YYYY-MM-DD.json` holds one file per day. Git keeps the full history.
- `data/top10/index.json` lists the saved days. `scripts/add_snapshot.py` rebuilds it, so don't edit it by hand.

## Adding a day

1. Copy the latest snapshot. Change `date` and `source`, then update the ten `stocks` entries.
2. Run `python3 small-cap-tracker/scripts/add_snapshot.py path/to/new-day.json`.
   The script validates the snapshot, writes `data/top10/<date>.json` and rebuilds the index.
3. Commit and push.

## Viewing

The page loads the JSON files with `fetch`, so it needs a web server. Opening the file straight from disk won't work. Either turn on GitHub Pages for the repo or run this locally:

```
cd small-cap-tracker && python3 -m http.server 8000
```
