"""Discord webhook alerts for newly discovered postings.

The webhook URL is a secret and never belongs in config.yaml (which is
committed); it's read from the DISCORD_WEBHOOK_URL environment variable
instead, typically set via a local .env file that .gitignore already excludes.
"""

from __future__ import annotations

import logging
import os

import requests

from models import Posting

log = logging.getLogger(__name__)

# Discord rejects a message with more than 10 embeds.
EMBEDS_PER_MESSAGE = 10
TIMEOUT_SECONDS = 10


def webhook_url() -> str | None:
    return os.environ.get("DISCORD_WEBHOOK_URL") or None


def send(postings: list[Posting], url: str) -> bool:
    """POST new postings to a Discord webhook, chunked to Discord's embed cap.

    Best-effort: a Discord outage logs and returns False rather than raising,
    since storage.sync has already committed by the time this runs and a
    failed alert shouldn't be treated the same as a failed fetch. Returns
    whether every chunk was delivered, so callers can report accurately.
    """
    ok = True
    for i in range(0, len(postings), EMBEDS_PER_MESSAGE):
        chunk = postings[i : i + EMBEDS_PER_MESSAGE]
        payload = {"embeds": [_embed(p) for p in chunk]}
        try:
            response = requests.post(url, json=payload, timeout=TIMEOUT_SECONDS)
            response.raise_for_status()
        except requests.RequestException as exc:
            log.error("discord webhook failed: %s", exc)
            ok = False
    return ok


def _embed(posting: Posting) -> dict:
    posted = posting.date_posted.strftime("%Y-%m-%d") if posting.date_posted else "unknown"
    return {
        "title": f"{posting.company} - {posting.title}"[:256],
        "url": posting.url or None,
        "description": f"{posting.location_str}  |  posted {posted}",
    }
