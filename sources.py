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

SIMPLIFY_URL = (
    "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships"
    "/dev/.github/scripts/listings.json"
)

TIMEOUT_SECONDS = 20
USER_AGENT = "interntrack/0.1 (personal job tracker)"


class FetchError(RuntimeError):
    """Raised when a source cannot be fetched or parsed."""


def fetch_simplify(url: str = SIMPLIFY_URL) -> list[Posting]:
    """Fetch and parse the SimplifyJobs/Summer2027-Internships listings file.

    ~14.6k records, most of them closed (only active:false postings from
    past seasons that Simplify hasn't pruned yet) -- active_only in
    config.yaml is what cuts that down to the ~1.4k actually open right now.
    The file itself is ~10MB; it's fetched fresh into memory on every run and
    never written to disk, so that size doesn't leak into interntrack.db or
    the Phase 5 GitHub Actions commit -- only the filtered/deduped Postings
    that come out the other end of the pipeline get persisted.
    """
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
            postings.append(Posting.from_simplify(record))
        except (KeyError, TypeError) as exc:
            skipped += 1
            log.warning("skipping malformed record: %s", exc)

    if skipped > len(records) * 0.2:
        raise FetchError(
            f"{skipped} of {len(records)} records failed to parse -- "
            "the upstream schema has probably changed"
        )

    log.info("parsed %d postings (%d skipped)", len(postings), skipped)
    return postings


def fetch_all(config: dict | None = None) -> list[Posting]:
    """Fetch from every source enabled in config.yaml's `sources:` section.

    Shape of `config`: {"simplify": true}

    SimplifyJobs is the only supported source -- everything InternTrack shows
    comes from that one GitHub repo.
    """
    config = config if config is not None else {"simplify": True}
    postings: list[Posting] = []
    errors: list[str] = []

    if config.get("simplify"):
        try:
            postings.extend(fetch_simplify())
        except FetchError as exc:
            log.error("source simplify failed: %s", exc)
            errors.append(f"simplify: {exc}")

    if errors and not postings:
        raise FetchError("all sources failed -- " + "; ".join(errors))
    if errors:
        log.warning("%d source(s) failed but others succeeded", len(errors))

    return postings
