"""Core data model for a job posting.

Everything downstream -- filters, storage, notifications, resume matching --
works with Posting objects rather than raw source dicts. Adding a new source
later means writing one more `from_*` classmethod, not touching anything else.
"""

from __future__ import annotations

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
    """Convert a unix timestamp to an aware UTC datetime, tolerating junk."""
    if value in (None, "", 0):
        return None
    try:
        return datetime.fromtimestamp(int(value), tz=timezone.utc)
    except (ValueError, TypeError, OSError, OverflowError):
        return None
