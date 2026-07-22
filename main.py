#!/usr/bin/env python3
"""InternTrack -- Phase 2.

Fetch internship postings, filter them, remember what's been seen before, and
print them. No alerts yet; that's Phase 4.

    python main.py                   # matching postings, newest first
    python main.py --new             # only postings never seen in a prior run
    python main.py --all             # every posting, unfiltered
    python main.py --explain         # why postings were rejected
    python main.py --company nvidia  # search within results
"""

from __future__ import annotations

import argparse
import logging
import sys
from collections import Counter

import filters
import sources
import storage
from models import Posting


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
        print(f"  {posting.location_str}  |  posted {posted}  |  {posting.sponsorship or 'n/a'}")
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

    try:
        postings = sources.fetch_all()
    except sources.FetchError as exc:
        # Exiting non-zero matters: in Phase 5 this is what makes GitHub
        # Actions mark the run failed instead of silently passing.
        print(f"\nFETCH FAILED: {exc}", file=sys.stderr)
        return 1

    total = len(postings)
    config = None

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

    if args.new:
        selected = [p for p in selected if p.key in new_keys]

    label = "new" if args.new else "matched"
    print(f"\n{len(selected)} of {total} postings {label}.")
    print_postings(selected, args.limit)

    if args.explain and config is not None:
        print_explanation(postings, config)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
