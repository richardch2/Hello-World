#!/usr/bin/env python3
"""Add a day to a dataset and rebuild the generated data files.

Usage:
    python3 scripts/add_snapshot.py top10 path/to/day.json   # add or replace one day
    python3 scripts/add_snapshot.py                          # just rebuild

Each dataset is a folder under data/ with a dataset.json (title, view, options)
and one YYYY-MM-DD.json per day. A day is {"date", "source", "items": [...]}.
Rebuilding writes data/<dataset>/index.json and data/all.js, which the page reads.
"""
import datetime
import json
import pathlib
import sys

DATA_DIR = pathlib.Path(__file__).resolve().parent.parent / "data"

# Fields each view needs on every item. Add an entry when you add a view.
VIEW_FIELDS = {
    "ranked-list": ("rank", "name"),
}


def fail(msg):
    sys.exit(f"error: {msg}")


def validate_day(day, meta, label):
    try:
        datetime.date.fromisoformat(day["date"])
    except (KeyError, TypeError, ValueError):
        fail(f"{label}: 'date' must be YYYY-MM-DD")
    items = day.get("items")
    if not isinstance(items, list) or not items:
        fail(f"{label}: 'items' must be a non-empty list")
    opts = meta.get("options", {})
    size = opts.get("size")
    if size and len(items) != size:
        fail(f"{label}: expected {size} items, found {len(items)}")
    needed = VIEW_FIELDS.get(meta["view"], ()) + tuple(
        opts[k] for k in ("valueField", "keyField") if k in opts
    )
    for item in items:
        missing = [k for k in needed if k not in item]
        if missing:
            fail(f"{label}: an item is missing {', '.join(missing)}")


def load_meta(folder):
    meta_path = folder / "dataset.json"
    if not meta_path.exists():
        fail(f"{folder.name}: no dataset.json")
    meta = json.loads(meta_path.read_text())
    if meta.get("view") not in VIEW_FIELDS:
        fail(f"{folder.name}: unknown view {meta.get('view')!r}; known: {', '.join(VIEW_FIELDS)}")
    return meta


def rebuild():
    bundle = {}
    for folder in sorted(p for p in DATA_DIR.iterdir() if p.is_dir()):
        meta = load_meta(folder)
        days = {}
        for path in sorted(folder.glob("????-??-??.json")):
            day = json.loads(path.read_text())
            validate_day(day, meta, f"{folder.name}/{path.name}")
            if path.stem != day["date"]:
                fail(f"{folder.name}/{path.name}: file name does not match date {day['date']}")
            days[day["date"]] = day
        dates = sorted(days, reverse=True)
        (folder / "index.json").write_text(json.dumps({"dates": dates}, indent=2) + "\n")
        bundle[folder.name] = {"meta": meta, "dates": dates, "days": days}
        print(f"{folder.name}: {len(dates)} day(s), latest {dates[0] if dates else 'none'}")
    # A script rather than JSON so index.html also works opened straight from disk.
    text = json.dumps({"datasets": bundle}, ensure_ascii=False)
    (DATA_DIR / "all.js").write_text(f"window.TRACKER_DATA = {text};\n")


def main():
    if len(sys.argv) == 3:
        folder = DATA_DIR / sys.argv[1]
        meta = load_meta(folder)
        day = json.loads(pathlib.Path(sys.argv[2]).read_text())
        validate_day(day, meta, sys.argv[2])
        out = folder / f"{day['date']}.json"
        out.write_text(json.dumps(day, indent=2, ensure_ascii=False) + "\n")
        print(f"wrote data/{folder.name}/{out.name}")
    elif len(sys.argv) != 1:
        fail("usage: add_snapshot.py [<dataset> <day.json>]")
    rebuild()


if __name__ == "__main__":
    main()
