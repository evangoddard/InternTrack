"""Fetching postings from upstream sources.

Design rule for this module: failures are loud. A fetch that quietly returns
an empty list is the worst possible outcome -- the run looks successful, no
alerts fire, and you conclude nothing was posted this week. Every failure path
here raises FetchError instead.
"""

from __future__ import annotations

import json
import logging
import re

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


GREENHOUSE_URL = "https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true"
LEVER_URL = "https://api.lever.co/v0/postings/{token}?mode=json"
ASHBY_URL = "https://api.ashbyhq.com/posting-api/job-board/{token}"


_INTERN_WORD = re.compile(r"\bintern(ship)?s?\b|\bco-?op\b", re.IGNORECASE)


def _looks_like_internship(title: str) -> bool:
    """Greenhouse/Lever/Ashby boards list a company's whole hiring pipeline.

    Unlike the aggregator, there's no upstream "internship" flag to rely on,
    so titles that don't even mention internship/co-op are dropped before
    they ever reach config.yaml's keyword filters. Word-boundary matching
    matters here -- a plain substring check on "intern" also matches
    "International", which would let full-time roles straight through.
    """
    return bool(_INTERN_WORD.search(title))


def fetch_greenhouse(token: str, company: str) -> list[Posting]:
    """Fetch a company's public Greenhouse job board, filtered to internships."""
    url = GREENHOUSE_URL.format(token=token)
    log.info("fetching greenhouse board %s (%s)", token, company)

    try:
        response = requests.get(
            url, timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise FetchError(f"could not reach greenhouse board {token}: {exc}") from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise FetchError(f"greenhouse board {token} did not return valid JSON: {exc}") from exc

    jobs = data.get("jobs")
    if jobs is None:
        raise FetchError(f"greenhouse board {token} response missing 'jobs' key")

    postings = [
        Posting.from_greenhouse(job, company)
        for job in jobs
        if _looks_like_internship(job.get("title") or "")
    ]
    log.info("parsed %d internship postings from greenhouse/%s (of %d total)", len(postings), token, len(jobs))
    return postings


def fetch_lever(token: str, company: str) -> list[Posting]:
    """Fetch a company's public Lever job board, filtered to internships."""
    url = LEVER_URL.format(token=token)
    log.info("fetching lever board %s (%s)", token, company)

    try:
        response = requests.get(
            url, timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise FetchError(f"could not reach lever board {token}: {exc}") from exc

    try:
        jobs = response.json()
    except ValueError as exc:
        raise FetchError(f"lever board {token} did not return valid JSON: {exc}") from exc

    if not isinstance(jobs, list):
        raise FetchError(f"lever board {token} returned {type(jobs).__name__}, expected a list")

    postings = [
        Posting.from_lever(job, company)
        for job in jobs
        if _looks_like_internship(job.get("text") or "")
    ]
    log.info("parsed %d internship postings from lever/%s (of %d total)", len(postings), token, len(jobs))
    return postings


def fetch_ashby(token: str, company: str) -> list[Posting]:
    """Fetch a company's public Ashby job board, filtered to internships."""
    url = ASHBY_URL.format(token=token)
    log.info("fetching ashby board %s (%s)", token, company)

    try:
        response = requests.get(
            url, timeout=TIMEOUT_SECONDS, headers={"User-Agent": USER_AGENT}
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise FetchError(f"could not reach ashby board {token}: {exc}") from exc

    try:
        data = response.json()
    except ValueError as exc:
        raise FetchError(f"ashby board {token} did not return valid JSON: {exc}") from exc

    jobs = data.get("jobs")
    if jobs is None:
        raise FetchError(f"ashby board {token} response missing 'jobs' key")

    postings = [
        Posting.from_ashby(job, company)
        for job in jobs
        if _looks_like_internship(job.get("title") or "")
    ]
    log.info("parsed %d internship postings from ashby/%s (of %d total)", len(postings), token, len(jobs))
    return postings


def fetch_all(config: dict | None = None) -> list[Posting]:
    """Fetch from every source enabled in config.yaml's `sources:` section.

    Shape of `config`:
        {"vanshb03": true,
         "greenhouse": [{"token": "robinhood", "company": "Robinhood"}],
         "lever": [{"token": "ro", "company": "Ro"}],
         "ashby": [{"token": "ramp", "company": "Ramp"}]}

    One source (or board) failing does not abort the others, but errors are
    collected and surfaced so the run can still exit non-zero if everything
    failed.
    """
    config = config if config is not None else {"vanshb03": True}
    postings: list[Posting] = []
    errors: list[str] = []

    if config.get("vanshb03"):
        try:
            postings.extend(fetch_vansh())
        except FetchError as exc:
            log.error("source vanshb03 failed: %s", exc)
            errors.append(f"vanshb03: {exc}")

    for board in config.get("greenhouse") or []:
        token = board["token"]
        company = board.get("company") or token.title()
        try:
            postings.extend(fetch_greenhouse(token, company))
        except FetchError as exc:
            log.error("source greenhouse/%s failed: %s", token, exc)
            errors.append(f"greenhouse/{token}: {exc}")

    for board in config.get("lever") or []:
        token = board["token"]
        company = board.get("company") or token.title()
        try:
            postings.extend(fetch_lever(token, company))
        except FetchError as exc:
            log.error("source lever/%s failed: %s", token, exc)
            errors.append(f"lever/{token}: {exc}")

    for board in config.get("ashby") or []:
        token = board["token"]
        company = board.get("company") or token.title()
        try:
            postings.extend(fetch_ashby(token, company))
        except FetchError as exc:
            log.error("source ashby/%s failed: %s", token, exc)
            errors.append(f"ashby/{token}: {exc}")

    if errors and not postings:
        raise FetchError("all sources failed -- " + "; ".join(errors))
    if errors:
        log.warning("%d source(s) failed but others succeeded", len(errors))

    return postings
