"""Fetching postings from upstream sources.

Design rule for this module: failures are loud. A fetch that quietly returns
an empty list is the worst possible outcome -- the run looks successful, no
alerts fire, and you conclude nothing was posted this week. Every failure path
here raises FetchError instead.
"""

from __future__ import annotations

import json
import logging

import requests

from models import Posting

log = logging.getLogger(__name__)

VANSH_URL = (
    "https://raw.githubusercontent.com/vanshb03/Summer2027-Internships"
    "/dev/.github/scripts/listings.json"
)

TIMEOUT_SECONDS = 20
USER_AGENT = "interntrack/0.1 (personal job tracker)"


class FetchError(RuntimeError):
    """Raised when a source cannot be fetched or parsed."""


def fetch_vansh(url: str = VANSH_URL) -> list[Posting]:
    """Fetch and parse the Summer2027-Internships listings file."""
    log.info("fetching %s", url)

    try:
        response = requests.get(
            url, timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise FetchError(f"could not reach {url}: {exc}") from exc

    try:
        records = json.loads(response.text)
    except json.JSONDecodeError as exc:
        raise FetchError(f"{url} did not return valid JSON: {exc}") from exc

    if not isinstance(records, list):
        raise FetchError(f"{url} returned {type(records).__name__}, expected a list")

    if not records:
        raise FetchError(f"{url} returned an empty list -- treating as a failure")

    postings, skipped = [], 0
    for record in records:
        try:
            postings.append(Posting.from_vansh(record))
        except (KeyError, TypeError) as exc:
            skipped += 1
            log.warning("skipping malformed record: %s", exc)

    # A few bad rows is normal. Most of them being bad means the upstream
    # schema changed and the parser needs updating -- worth failing on.
    if skipped > len(records) * 0.2:
        raise FetchError(
            f"{skipped} of {len(records)} records failed to parse -- "
            "the upstream schema has probably changed"
        )

    log.info("parsed %d postings (%d skipped)", len(postings), skipped)
    return postings


# Phase 3 adds fetch_greenhouse() and fetch_lever() here. They return the same
# list[Posting], so nothing downstream changes.
SOURCES = {"vanshb03": fetch_vansh}


def fetch_all(names: list[str] | None = None) -> list[Posting]:
    """Fetch from every configured source.

    One source failing does not abort the others, but errors are collected and
    surfaced so the run can still exit non-zero.
    """
    names = names or list(SOURCES)
    postings: list[Posting] = []
    errors: list[str] = []

    for name in names:
        fetcher = SOURCES.get(name)
        if fetcher is None:
            errors.append(f"unknown source: {name}")
            continue
        try:
            postings.extend(fetcher())
        except FetchError as exc:
            log.error("source %s failed: %s", name, exc)
            errors.append(f"{name}: {exc}")

    if errors and not postings:
        raise FetchError("all sources failed -- " + "; ".join(errors))
    if errors:
        log.warning("%d source(s) failed but others succeeded", len(errors))

    return postings
