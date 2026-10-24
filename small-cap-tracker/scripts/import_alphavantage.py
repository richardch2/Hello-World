#!/usr/bin/env python3
"""Turn Alpha Vantage downloads into tracker days, then rebuild the page data.

Usage:
    python3 scripts/import_alphavantage.py movers movers.json
        movers.json is a TOP_GAINERS_LOSERS response. Writes a day to
        data/gainers/ and data/losers/.
    python3 scripts/import_alphavantage.py prices folder/
        folder/ holds one <TICKER>.csv per stock, each a TIME_SERIES_DAILY
        response (the full CSV, or just "date,close" lines). Writes a day to
        data/charts/ for the stocks in the latest top10 day.
"""
import csv
import datetime
import json
import pathlib
import sys

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
import add_snapshot  # noqa: E402

DATA_DIR = add_snapshot.DATA_DIR
CHART_DAYS = 65  # about three months of trading days


def save(dataset, day):
    meta = add_snapshot.load_meta(DATA_DIR / dataset)
    add_snapshot.validate_day(day, meta, dataset)
    out = DATA_DIR / dataset / f"{day['date']}.json"
    out.write_text(json.dumps(day, indent=2, ensure_ascii=False) + "\n")
    print(f"wrote data/{dataset}/{out.name}")


def is_common_stock(row):
    """Drop sub-$1 prices, warrants, rights and units, which crowd the raw list."""
    t = row["ticker"]
    if not t.isalpha() or float(row["price"]) < 1:
        return False
    return not (len(t) == 5 and t[-1] in "WRUZ")


def movers(path):
    raw = json.loads(pathlib.Path(path).read_text())
    date = raw["last_updated"][:10]
    for dataset, key, word in (("gainers", "top_gainers", "up"), ("losers", "top_losers", "down")):
        rows = [r for r in raw[key] if is_common_stock(r)][:10]
        items = []
        for i, r in enumerate(rows, 1):
            price, amount = float(r["price"]), abs(float(r["change_amount"]))
            items.append({
                "rank": i,
                "ticker": r["ticker"],
                "name": r["ticker"],
                "change_pct": round(float(r["change_percentage"].rstrip("%")), 2),
                "price": price,
                "volume": int(r["volume"]),
                "blurb": f"Closed at ${price:,.2f}, {word} ${amount:,.2f} on {int(r['volume']):,} shares traded.",
            })
        save(dataset, {
            "date": date,
            "source": "Alpha Vantage top gainers and losers, " + raw["last_updated"],
            "items": items,
        })


def read_closes(path):
    closes = []
    with open(path, newline="") as f:
        for row in csv.reader(f):
            if not row or row[0] == "timestamp":
                continue
            datetime.date.fromisoformat(row[0])
            # Full responses are date,open,high,low,close,volume.
            closes.append([row[0], round(float(row[4] if len(row) >= 5 else row[1]), 2)])
    closes.sort()
    return closes[-CHART_DAYS:]


def prices(folder):
    folder = pathlib.Path(folder)
    top10 = DATA_DIR / "top10"
    latest = json.loads((top10 / "index.json").read_text())["dates"][0]
    holdings = json.loads((top10 / f"{latest}.json").read_text())["items"]
    items = []
    for h in holdings:
        path = folder / f"{h['ticker']}.csv"
        if not path.exists():
            add_snapshot.fail(f"no price file for {h['ticker']} ({path})")
        items.append({
            "rank": h["rank"],
            "ticker": h["ticker"],
            "name": h["name"],
            "sector": h.get("sector"),
            "closes": read_closes(path),
        })
    last = max(i["closes"][-1][0] for i in items)
    save("charts", {
        "date": last,
        "source": f"Alpha Vantage daily closing prices; stocks are the top 10 IWM holdings from {latest}",
        "items": items,
    })


def main():
    if len(sys.argv) != 3 or sys.argv[1] not in ("movers", "prices"):
        add_snapshot.fail("usage: import_alphavantage.py movers <file.json> | prices <folder>")
    (movers if sys.argv[1] == "movers" else prices)(sys.argv[2])
    add_snapshot.rebuild()


if __name__ == "__main__":
    main()
