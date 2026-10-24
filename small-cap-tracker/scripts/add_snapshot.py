#!/usr/bin/env python3
"""Add or replace one day's top-10 snapshot and rebuild the date index.

Usage:
    python3 scripts/add_snapshot.py path/to/snapshot.json   # copy a new day in
    python3 scripts/add_snapshot.py                          # just rebuild index.json

A snapshot is a JSON object with "date" (YYYY-MM-DD), "fund", "source" and
"stocks" (exactly 10 entries with rank, ticker, name, sector, weight).
"""
import datetime
import json
import pathlib
import sys

DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "data" / "top10"
REQUIRED = ("rank", "ticker", "name", "sector", "weight")


def validate(snap, label):
    try:
        datetime.date.fromisoformat(snap["date"])
    except (KeyError, TypeError, ValueError):
        sys.exit(f"{label}: 'date' must be YYYY-MM-DD")
    stocks = snap.get("stocks")
    if not isinstance(stocks, list) or len(stocks) != 10:
        sys.exit(f"{label}: 'stocks' must list exactly 10 entries")
    for s in stocks:
        missing = [k for k in REQUIRED if k not in s]
        if missing:
            sys.exit(f"{label}: {s.get('ticker', '?')} is missing {', '.join(missing)}")
    if sorted(s["rank"] for s in stocks) != list(range(1, 11)):
        sys.exit(f"{label}: ranks must be 1 through 10")


def rebuild_index():
    dates = []
    for path in sorted(DATA_DIR.glob("????-??-??.json")):
        snap = json.loads(path.read_text())
        validate(snap, path.name)
        if path.stem != snap["date"]:
            sys.exit(f"{path.name}: file name does not match date {snap['date']}")
        dates.append(snap["date"])
    index = {"dates": sorted(dates, reverse=True)}
    (DATA_DIR / "index.json").write_text(json.dumps(index, indent=2) + "\n")
    return index


def main():
    if len(sys.argv) > 1:
        snap = json.loads(pathlib.Path(sys.argv[1]).read_text())
        validate(snap, sys.argv[1])
        out = DATA_DIR / f"{snap['date']}.json"
        out.write_text(json.dumps(snap, indent=2, ensure_ascii=False) + "\n")
        print(f"wrote {out.relative_to(DATA_DIR.parent.parent)}")
    index = rebuild_index()
    print(f"index has {len(index['dates'])} day(s), latest {index['dates'][0] if index['dates'] else 'none'}")


if __name__ == "__main__":
    main()
