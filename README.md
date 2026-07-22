# InternTrack

Automated internship posting monitor. Polls job boards on a schedule,
deduplicates across sources, remembers what it's seen, and alerts on new
listings matching configurable criteria.

**Status: Phase 5** — fetch, filter, storage/diff, three ATS adapters
(Greenhouse/Lever/Ashby) with cross-source dedup, Discord alerts, and a
GitHub Actions cron are all in place. Sheets sync and resume matching are not
built yet.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

Discord alerts need `DISCORD_WEBHOOK_URL` set — put it in a local `.env` file
(gitignored) for manual runs, and in the repo's Actions secrets for the
scheduled workflow.

## Usage

```bash
python main.py                    # matching postings, newest first
python main.py --new              # only postings never seen in a prior run
python main.py --all              # every posting, unfiltered
python main.py --explain          # why postings were rejected
python main.py --company nvidia   # search within results
python main.py --no-notify        # skip Discord even if configured
python main.py --limit 100        # show more
```

Filters live in `config.yaml`. Edit and re-run — no code changes needed.

## Sources

| Source | Format | Stable ID | Publish timestamp |
|---|---|---|---|
| vanshb03/Summer2027-Internships | JSON | upstream UUID | epoch |
| Greenhouse job boards | JSON | job id | `updated_at` only (not original publish) |
| Lever job boards | JSON | posting id | none |
| Ashby job boards | JSON | job id | `publishedAt` (real) |

Greenhouse/Lever/Ashby each expose a company's *entire* job board, not just
internships, and (except Ashby) don't flag a season — see Design notes.

## Automation

`.github/workflows/scan.yml` runs the scanner every 15 minutes via GitHub
Actions (offset from :00/:15/:30/:45, since scheduled runs queue up right at
the top of the quarter-hour under load). Each run:

1. Fetches all configured sources, dedupes, filters.
2. Diffs against `interntrack.db` to find genuinely new postings.
3. Alerts Discord for anything new that also matches your filters.
4. Commits the updated `interntrack.db` back to the repo if it changed, so
   the next run (and your laptop, after a `git pull`) share the same history.

Requires a repo secret named `DISCORD_WEBHOOK_URL`, and the repo's Actions
settings set to allow workflows to push (Settings → Actions → General →
Workflow permissions → **Read and write permissions**) — the default
read-only token can't push the commit in step 4.

## Design notes

**Failures are loud.** A fetch returning an empty list is treated as an
error, not as "no jobs today". Silent failure is the one bug that makes a
monitoring tool actively harmful — you stop checking manually because you
trust the alerts, and the alerts stopped working a week ago.

**Stable IDs.** Postings are keyed on `source:uid`, never on a hash of the
whole record. If upstream edits a title, a content hash would make the
posting look new and re-alert.

**Cross-source dedup, not exact matching.** The same job can arrive from
both the aggregator and a company's own board with unrelated IDs, so
duplicates are matched on normalized company + title instead. The direct
board wins ties, since it's fresher and more authoritative than the
aggregator.

**Word-boundary keyword matching.** A plain substring check on "intern"
also matches "International"; on "ai" it also matches "training". Short
keyword fragments need word-boundary matching, not substring matching, or
they silently let the wrong postings through.

**Season filtering is conditional, not required.** Greenhouse/Lever/Ashby
don't report a season at all. Rejecting on a missing field would drop every
posting from those sources, so the season check only applies when a source
actually reports one.

**First-run baseline, not a notification flood.** The very first run against
a database that doesn't exist yet would otherwise treat every current
posting as "new" and fire dozens of Discord alerts at once. That run seeds
history silently instead.

**Config over code.** Filter tuning happens in YAML. `--explain` reports the
rejection reason for every dropped posting so tuning is evidence-based.

## Roadmap

- [x] **Phase 1** — fetch, parse, filter
- [x] **Phase 2** — SQLite store, new-posting diff
- [x] **Phase 3** — Greenhouse + Lever adapters, cross-source dedup
- [x] **Phase 4** — Discord webhook alerts
- [x] **Phase 5** — GitHub Actions cron, git-committed persistence
- [ ] **Phase 6** — Google Sheets sync, application pipeline tracking
- [ ] **Phase 7** — resume matching: skill extraction, semantic similarity,
  ranked recommendations — evaluated against a hand-labeled set and
  benchmarked against the keyword filter baseline
