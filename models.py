"""Core data model for a job posting.

Everything downstream -- filters, storage, resume matching -- works with
Posting objects rather than raw source dicts. SimplifyJobs is the only
source; the shape stays generic in case that ever changes.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime, timezone


@dataclass(frozen=True)
class Posting:
    """A single internship posting, normalized across sources."""

    uid: str  # stable identifier, from Simplify's own UUID
    source: str  # always "simplify" -- kept for the key property below
    company: str
    title: str
    url: str
    locations: tuple[str, ...] = ()
    season: str = ""
    sponsorship: str = ""
    active: bool = True
    date_posted: datetime | None = None
    description: str = ""  # unused in Phase 1; the resume matcher needs it later
    category: str = ""  # e.g. "Software", "Hardware", "AI/ML/Data"
    raw: dict = field(default_factory=dict, repr=False, compare=False)

    @classmethod
    def from_simplify(cls, record: dict) -> "Posting":
        """Build a Posting from a SimplifyJobs/Summer2027-Internships record.

        Every listing gets a stable UUID, plus a `category` field
        (Software/Hardware/AI-ML-Data/Quant/...). The one real gotcha: this
        source's `terms` is a *list* of full strings like "Summer 2026", but
        config.yaml's `seasons` filter expects a bare word like "Summer" with
        no year. Mapping `terms` straight into `season` would silently fail
        every summer-only posting, so `_season_from_terms` normalizes it to
        that bare-word shape first (joining multiple terms with "/", the
        same convention `location_str` uses below).
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
