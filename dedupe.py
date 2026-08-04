"""Deduplication.

SimplifyJobs occasionally lists the same job twice under different IDs (e.g.
a re-post). Neither copy shares an ID with the other, so there's no exact key
to match on -- instead we normalize company and title and match on that pair.
"""

from __future__ import annotations

import re

from models import Posting

_COMPANY_SUFFIXES = {"inc", "llc", "corp", "corporation", "ltd", "co", "company", "group"}

_SOURCE_PRIORITY = ("simplify",)


def normalize_company(name: str) -> str:
    words = re.sub(r"[^a-z0-9 ]", " ", name.lower()).split()
    return " ".join(w for w in words if w not in _COMPANY_SUFFIXES)


def normalize_title(title: str) -> str:
    return " ".join(re.sub(r"[^a-z0-9 ]", " ", title.lower()).split())


def dedup_key(posting: Posting) -> str:
    return f"{normalize_company(posting.company)}::{normalize_title(posting.title)}"


def _source_rank(posting: Posting) -> int:
    try:
        return _SOURCE_PRIORITY.index(posting.source)
    except ValueError:
        return len(_SOURCE_PRIORITY)


def deduplicate(postings: list[Posting]) -> list[Posting]:
    """Collapse postings that represent the same job across sources."""
    best: dict[str, Posting] = {}
    for posting in postings:
        key = dedup_key(posting)
        current = best.get(key)
        if current is None or _source_rank(posting) < _source_rank(current):
            best[key] = posting
    return list(best.values())
