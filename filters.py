"""Config-driven filtering.

Filter rules live in config.yaml, not here, so tuning what you see never means
editing code. Each rule returns a reason string when it rejects a posting,
which is what makes `--explain` possible -- and saves you guessing why a role
you expected never showed up.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

from models import Posting


@dataclass
class FilterConfig:
    seasons: list[str]
    active_only: bool
    title_include: list[str]
    title_exclude: list[str]
    company_always_include: list[str]
    sponsorship_exclude: list[str]
    locations_include: list[str]

    @classmethod
    def load(cls, path: str | Path) -> "FilterConfig":
        with open(path) as handle:
            data = yaml.safe_load(handle) or {}
        filters = data.get("filters", {})
        return cls(
            seasons=lower_all(filters.get("seasons", [])),
            active_only=bool(filters.get("active_only", True)),
            title_include=lower_all(filters.get("title_include", [])),
            title_exclude=lower_all(filters.get("title_exclude", [])),
            company_always_include=lower_all(filters.get("company_always_include", [])),
            sponsorship_exclude=lower_all(filters.get("sponsorship_exclude", [])),
            locations_include=lower_all(filters.get("locations_include", [])),
        )


def rejection_reason(posting: Posting, config: FilterConfig) -> str | None:
    """Return why this posting was filtered out, or None if it passes."""
    company = posting.company.lower()
    title = posting.title.lower()

    # Target companies bypass keyword matching entirely. If NVIDIA posts
    # something with a title neither of us thought to whitelist, you still
    # want to see it.
    is_target = any(name in company for name in config.company_always_include)

    if config.active_only and not posting.active:
        return "posting is closed"

    if config.seasons and posting.season.lower() not in config.seasons:
        return f"season is {posting.season or 'unset'}"

    if any(term in posting.sponsorship.lower() for term in config.sponsorship_exclude):
        return f"sponsorship: {posting.sponsorship}"

    if any(term in title for term in config.title_exclude):
        return "title matched an exclude term"

    if is_target:
        return None

    if config.title_include and not any(term in title for term in config.title_include):
        return "title matched no include term"

    if config.locations_include:
        blob = " ".join(posting.locations).lower()
        if not any(term in blob for term in config.locations_include):
            return f"location: {posting.location_str}"

    return None


def apply(postings: list[Posting], config: FilterConfig) -> list[Posting]:
    return [p for p in postings if rejection_reason(p, config) is None]


def lower_all(values) -> list[str]:
    return [str(v).strip().lower() for v in (values or []) if str(v).strip()]
