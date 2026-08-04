"""SQLite-backed history of postings, and the new-since-last-run diff.

A posting is "new" if its key (source:uid) has never been stored before.
Everything else -- a title edit, a posting closing -- updates the existing
row in place rather than creating a second one, so upstream edits don't
re-alert you as if they were new postings.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

from models import Posting

SCHEMA = """
CREATE TABLE IF NOT EXISTS postings (
    key TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    uid TEXT NOT NULL,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    locations TEXT NOT NULL,
    season TEXT NOT NULL,
    sponsorship TEXT NOT NULL,
    active INTEGER NOT NULL,
    date_posted TEXT,
    first_seen TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def connect(path: str | Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path)
    conn.execute(SCHEMA)
    conn.commit()
    return conn


def sync(postings: list[Posting], conn: sqlite3.Connection) -> list[Posting]:
    """Upsert every posting and return the ones never seen before.

    Order matches the input list, so callers can rely on it for display.
    """
    new: list[Posting] = []
    for posting in postings:
        row = conn.execute(
            "SELECT 1 FROM postings WHERE key = ?", (posting.key,)
        ).fetchone()
        if row is None:
            new.append(posting)

        conn.execute(
            """
            INSERT INTO postings
                (key, source, uid, company, title, url, locations,
                 season, sponsorship, active, date_posted, last_seen)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT(key) DO UPDATE SET
                company=excluded.company,
                title=excluded.title,
                url=excluded.url,
                locations=excluded.locations,
                season=excluded.season,
                sponsorship=excluded.sponsorship,
                active=excluded.active,
                date_posted=excluded.date_posted,
                last_seen=excluded.last_seen
            """,
            (
                posting.key,
                posting.source,
                posting.uid,
                posting.company,
                posting.title,
                posting.url,
                "|".join(posting.locations),
                posting.season,
                posting.sponsorship,
                int(posting.active),
                posting.date_posted.isoformat() if posting.date_posted else None,
            ),
        )
    conn.commit()
    return new
