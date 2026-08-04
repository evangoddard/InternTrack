#!/usr/bin/env python3
"""InternTrack.

Fetch internship postings (aggregators + Greenhouse/Lever/Ashby boards),
dedupe across sources, filter them, remember what's been seen before, and
print them. No notifications -- this just fetches and stores; run it
whenever you want to see what's current.

    python main.py                    # matching postings, newest first
    python main.py --new              # only postings never seen in a prior run
    python main.py --all              # every posting, unfiltered
    python main.py --explain          # why postings were rejected
    python main.py --company nvidia   # search within results
    python main.py --category quant   # only Quant, Software, Hardware, etc.
"""

from __future__ import annotations

import argparse
import logging
import sys
from collections import Counter
from pathlib import Path

import yaml

import dedupe
import filters
import sources
import storage
from models import Posting

log = logging.getLogger(__name__)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fetch and filter internship postings.")
    parser.add_argument("--config", default="config.yaml", help="path to config file")
    parser.add_argument("--db", default="interntrack.db", help="path to the history database")
    parser.add_argument("--all", action="store_true", help="skip filtering")
    parser.add_argument(
        "--new", action="store_true", help="only show postings never seen in a prior run"
    )
    parser.add_argument(
        "--explain", action="store_true", help="report why postings were rejected"
    )
    parser.add_argument("--company", help="only show companies matching this substring")
    parser.add_argument(
        "--category",
        help="only show postings whose category contains this substring "
        "(e.g. software, hardware, quant, product, ai) -- only Simplify sets this field",
    )
    parser.add_argument("--limit", type=int, default=40, help="max postings to print")
    parser.add_argument("--verbose", "-v", action="store_true", help="debug logging")
    return parser.parse_args()


def print_postings(postings: list[Posting], limit: int) -> None:
    if not postings:
        print("No postings matched.")
        return

    # Newest first; fall back to epoch 0 for records with no date.
    postings = sorted(
        postings,
        key=lambda p: p.date_posted.timestamp() if p.date_posted else 0,
        reverse=True,
    )

    for posting in postings[:limit]:
        posted = posting.date_posted.strftime("%Y-%m-%d") if posting.date_posted else "unknown"
        flag = "" if posting.active else "  [CLOSED]"
        print(f"\n{posting.company} - {posting.title}{flag}")
        category = f"{posting.category}  |  " if posting.category else ""
        print(f"  {posting.location_str}  |  posted {posted}  |  {category}{posting.sponsorship or 'n/a'}")
        print(f"  {posting.url}")

    if len(postings) > limit:
        print(f"\n... and {len(postings) - limit} more (raise --limit to see them)")


def print_explanation(postings: list[Posting], config: filters.FilterConfig) -> None:
    reasons = Counter()
    for posting in postings:
        reason = filters.rejection_reason(posting, config)
        if reason:
            reasons[reason] += 1

    print("\nFiltered out:")
    for reason, count in reasons.most_common():
        print(f"  {count:>4}  {reason}")


def main() -> int:
    args = parse_args()
    logging.basicConfig(
        level=logging.DEBUG if args.verbose else logging.INFO,
        format="%(levelname)s  %(message)s",
    )

    with open(args.config) as handle:
        raw_config = yaml.safe_load(handle) or {}
    sources_config = raw_config.get("sources", {})

    try:
        postings = sources.fetch_all(sources_config)
    except sources.FetchError as exc:
        # Exiting non-zero matters: it's what makes GitHub Actions mark the
        # run failed instead of silently passing.
        print(f"\nFETCH FAILED: {exc}", file=sys.stderr)
        return 1

    postings = dedupe.deduplicate(postings)
    total = len(postings)
    config = None

    is_first_run = not Path(args.db).exists()

    conn = storage.connect(args.db)
    new_keys = {p.key for p in storage.sync(postings, conn)}
    conn.close()

    if args.all:
        selected = postings
    else:
        config = filters.FilterConfig.load(args.config)
        selected = filters.apply(postings, config)

    if args.company:
        needle = args.company.lower()
        selected = [p for p in selected if needle in p.company.lower()]

    if args.category:
        needle = args.category.lower()
        selected = [p for p in selected if needle in p.category.lower()]

    new_and_matched = [p for p in selected if p.key in new_keys]

    display = new_and_matched if args.new else selected
    label = "new" if args.new else "matched"
    print(f"\n{len(display)} of {total} postings {label}.")
    print_postings(display, args.limit)

    if args.explain and config is not None:
        print_explanation(postings, config)

    if is_first_run:
        print(f"\n(seeded history db at {args.db})")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
