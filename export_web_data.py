#!/usr/bin/env python3
"""Export real, filtered postings into web/data.json.

Runs the same fetch -> dedupe -> filter pipeline as main.py, then writes the
result in the shape web/lib/types.ts expects, so the Next.js demo site shows
your actual current postings instead of its placeholder sample data.

    python export_web_data.py

Note on `deadline`: SimplifyJobs doesn't report an application deadline
anywhere in its data -- only a posting date. This script writes "" for every
posting's deadline rather than inventing one; the site already renders that
as "-" and treats it as "no upcoming deadline," which is the honest behavior
given what the data actually contains.
"""

from __future__ import annotations

import json
import sys
from datetime import date
from pathlib import Path

import yaml

import dedupe
import filters
import sources
from models import Posting, _SEASON_WORD

OUTPUT_PATH = Path(__file__).parent / "web" / "data.json"


def season_display(posting: Posting) -> str:
    """Prefer Simplify's original "Summer 2026"-style terms (richer for
    display) over the bare-word season the filter logic normalizes to.

    Simplify uses the literal string "N/A" as a term placeholder for
    postings with no season data -- that has to be filtered out here the
    same way models._season_from_terms filters it out for the filter logic,
    or it leaks through verbatim as a fake "season" in the UI. Falls back to
    the normalized bare-word season (often "") for anything that doesn't
    carry real terms.
    """
    terms = [t for t in (posting.raw.get("terms") or []) if _SEASON_WORD.search(t)]
    if terms:
        return " / ".join(terms)
    return posting.season


def to_web_posting(posting: Posting) -> dict:
    return {
        "id": posting.key,
        "company": posting.company,
        "title": posting.title,
        "location": posting.location_str,
        "locations": list(posting.locations),
        "url": posting.url,
        "date_posted": posting.date_posted.date().isoformat() if posting.date_posted else "",
        "deadline": "",  # not present in Simplify's data -- see module docstring
        "season": season_display(posting),
        # Both give the résumé matcher real signal beyond a 4-6 word title:
        # category ("Hardware", "AI/ML/Data", ...) and preferred degree level(s).
        "category": posting.category,
        "degrees": list(posting.raw.get("degrees") or []),
    }


def existing_count() -> int:
    """How many postings the current data.json holds, or 0 if there isn't one."""
    try:
        return len(json.loads(OUTPUT_PATH.read_text())["postings"])
    except (OSError, ValueError, KeyError):
        return 0


def main() -> int:
    force = "--force" in sys.argv

    with open("config.yaml") as handle:
        raw_config = yaml.safe_load(handle) or {}
    sources_config = raw_config.get("sources", {})

    try:
        postings = sources.fetch_all(sources_config)
    except sources.FetchError as exc:
        print(f"FETCH FAILED: {exc}", file=sys.stderr)
        return 1

    postings = dedupe.deduplicate(postings)
    config = filters.FilterConfig.load("config.yaml")
    matched = filters.apply(postings, config)

    matched.sort(
        key=lambda p: p.date_posted.timestamp() if p.date_posted else 0,
        reverse=True,
    )

    # Guard against a bad run silently emptying the site. Now that this runs
    # unattended every hour and commits its output, a transient upstream
    # problem (or a config.yaml that didn't get written in CI) would
    # otherwise replace a good feed with an empty one and nobody would
    # notice until the site was blank. Refuse rather than write; --force
    # overrides when a big drop is genuinely expected.
    previous = existing_count()
    if not force and previous >= 20 and len(matched) < previous * 0.5:
        print(
            f"REFUSING TO WRITE: {len(matched)} postings is less than half of the "
            f"{previous} already in {OUTPUT_PATH.name}. Re-run with --force if "
            "this drop is real.",
            file=sys.stderr,
        )
        return 1

    data = {
        "stats": {
            "postings_tracked": len(matched),
            "sources": len({p.source for p in matched}),
            "companies": len({p.company for p in matched}),
            "last_updated": date.today().isoformat(),
        },
        "postings": [to_web_posting(p) for p in matched],
    }

    OUTPUT_PATH.write_text(json.dumps(data, indent=2) + "\n")
    print(f"wrote {len(matched)} postings to {OUTPUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
