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

Double-click `index.html` to open it in your browser. No server is needed, because the page reads `data/top10/all.js`, which the script rebuilds along with the index. The page also works on GitHub Pages or any web server.
