"""Core data model for a job posting.

Everything downstream -- filters, storage, notifications, resume matching --
works with Posting objects rather than raw source dicts. Adding a new source
later means writing one more `from_*` classmethod, not touching anything else.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(frozen=True)
class Posting:
    """A single internship posting, normalized across sources."""

    uid: str  # stable identifier, unique within its source
    source: str  # which fetcher produced this
    company: str
    title: str
    url: str
    locations: tuple[str, ...] = ()
    season: str = ""
    sponsorship: str = ""
    active: bool = True
    date_posted: datetime | None = None
    description: str = ""  # unused in Phase 1; the resume matcher needs it later
    category: str = ""  # only Simplify sets this; every other source leaves it blank
    raw: dict = field(default_factory=dict, repr=False, compare=False)

    @classmethod
    def from_vansh(cls, record: dict) -> "Posting":
        """Build a Posting from a vanshb03/Summer2027-Internships record.

        That repo assigns every listing a UUID, so we inherit a stable key for
        free. Sources without one need a derived key -- hash the company and
        URL, never the whole record, or an edited title looks brand new and
        re-alerts you.
        """
        return cls(
            uid=record["id"],
            source="vanshb03",
            company=(record.get("company_name") or "").strip(),
            title=(record.get("title") or "").strip(),
            url=(record.get("url") or "").strip(),
            locations=tuple(record.get("locations") or []),
            season=(record.get("season") or "").strip(),
            sponsorship=(record.get("sponsorship") or "").strip(),
            active=bool(record.get("active", True)),
            date_posted=epoch_to_dt(record.get("date_posted")),
            raw=record,
        )

    @classmethod
    def from_simplify(cls, record: dict) -> "Posting":
        """Build a Posting from a SimplifyJobs/Summer2027-Internships record.

        Same UUID-per-listing shape as vanshb03, plus a `category` field
        (Software/Hardware/AI-ML-Data/Quant/...) this repo doesn't otherwise
        have. The one real gotcha: this source's `terms` is a *list* of full
        strings like "Summer 2026" -- vanshb03's `season` is a bare word like
        "Summer" with no year, which is the format config.yaml's `seasons`
        filter already expects. Mapping `terms` straight into `season` would
        silently fail every summer-only posting, so `_season_from_terms`
        normalizes it to that same bare-word shape first (joining multiple
        terms with "/", the same convention `location_str` uses below).
        """
        return cls(
            uid=record["id"],
            source="simplify",
            company=(record.get("company_name") or "").strip(),
            title=(record.get("title") or "").strip(),
            url=(record.get("url") or "").strip(),
            locations=tuple(record.get("locations") or []),
            season=_season_from_terms(record.get("terms") or []),
            sponsorship=(record.get("sponsorship") or "").strip(),
            active=bool(record.get("active", True)),
            date_posted=epoch_to_dt(record.get("date_posted")),
            category=(record.get("category") or "").strip(),
            raw=record,
        )

    @classmethod
    def from_greenhouse(cls, record: dict, company: str) -> "Posting":
        """Build a Posting from a Greenhouse job-board API record.

        Greenhouse boards list a company's entire hiring pipeline, not just
        internships, and carry no season field -- callers must filter to
        internship titles themselves (see sources.fetch_greenhouse).
        """
        location = (record.get("location") or {}).get("name", "")
        return cls(
            uid=str(record["id"]),
            source="greenhouse",
            company=company,
            title=(record.get("title") or "").strip(),
            url=(record.get("absolute_url") or "").strip(),
            locations=(location,) if location else (),
            season="",
            sponsorship="",
            active=True,  # the API only lists open postings
            date_posted=iso_to_dt(record.get("first_published")),
            raw=record,
        )

    @classmethod
    def from_lever(cls, record: dict, company: str) -> "Posting":
        """Build a Posting from a Lever postings API record.

        Same caveat as Greenhouse: full job board, no season field.
        """
        categories = record.get("categories") or {}
        locations = tuple(categories.get("allLocations") or [])
        if not locations and categories.get("location"):
            locations = (categories["location"],)
        return cls(
            uid=str(record["id"]),
            source="lever",
            company=company,
            title=(record.get("text") or "").strip(),
            url=(record.get("hostedUrl") or "").strip(),
            locations=locations,
            season="",
            sponsorship="",
            active=True,
            date_posted=epoch_ms_to_dt(record.get("createdAt")),
            raw=record,
        )

    @classmethod
    def from_ashby(cls, record: dict, company: str) -> "Posting":
        """Build a Posting from an Ashby job-board API record.

        Same full-board caveat as Greenhouse/Lever. Ashby is the one source
        of the three that actually reports a real publish time (publishedAt)
        rather than a last-updated time or nothing at all.
        """
        location = record.get("location") or ""
        return cls(
            uid=str(record["id"]),
            source="ashby",
            company=company,
            title=(record.get("title") or "").strip(),
            url=(record.get("jobUrl") or "").strip(),
            locations=(location,) if location else (),
            season="",
            sponsorship="",
            active=bool(record.get("isListed", True)),
            date_posted=iso_to_dt(record.get("publishedAt")),
            raw=record,
        )

    @property
    def key(self) -> str:
        """Globally unique key across all sources. Phase 2 stores this."""
        return f"{self.source}:{self.uid}"

    @property
    def location_str(self) -> str:
        if not self.locations:
            return "-"
        if len(self.locations) <= 2:
            return " / ".join(self.locations)
        return f"{self.locations[0]} +{len(self.locations) - 1} more"

    def __str__(self) -> str:
        return f"{self.company} - {self.title}"


def epoch_to_dt(value) -> datetime | None:
    """Convert a unix timestamp (seconds) to an aware UTC datetime, tolerating junk."""
    if value in (None, "", 0):
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except (ValueError, TypeError, OSError, OverflowError):
        return None


def epoch_ms_to_dt(value) -> datetime | None:
    """Convert a unix timestamp in milliseconds (Lever's format) to UTC."""
    if value in (None, "", 0):
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000, tz=timezone.utc)
    except (ValueError, TypeError, OSError, OverflowError):
        return None


def iso_to_dt(value) -> datetime | None:
    """Convert an ISO-8601 string (Greenhouse's format) to UTC, tolerating junk."""
    if not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except (ValueError, TypeError):
        return None
    return dt.astimezone(timezone.utc) if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


_SEASON_WORD = re.compile(r"\b(Summer|Fall|Winter|Spring)\b", re.IGNORECASE)


def _season_from_terms(terms: list[str]) -> str:
    """Reduce Simplify's ["Summer 2026", "Fall 2026"] to config.yaml's bare-word
    season format ("Summer/Fall"), preserving order, dropping duplicates and
    unparseable terms (e.g. "N/A") entirely rather than raising on them.
    """
    seen: list[str] = []
    for term in terms:
        match = _SEASON_WORD.search(term)
        if not match:
            continue
        word = match.group(1).title()
        if word not in seen:
            seen.append(word)
    return "/".join(seen)
