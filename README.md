# InternTrack

Automated internship posting monitor. Polls job boards on a schedule,
deduplicates across sources, remembers what it's seen, and prints what
currently matches your criteria. No notifications -- this is a fetch-and-store
tool, not an alerting one; run it whenever you want to see what's current.

**Status** — fetch, filter, storage/diff, two aggregator sources
(vanshb03, SimplifyJobs) plus three direct ATS adapters (Greenhouse/Lever/
Ashby) with cross-source dedup, and a GitHub Actions cron are all in place.
Sheets sync and resume matching are not built yet.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

No secrets or `.env` file needed -- nothing in this project calls out to a
third-party notification service.

## Usage

```bash
python main.py                    # matching postings, newest first
python main.py --new              # only postings never seen in a prior run
python main.py --all              # every posting, unfiltered
python main.py --explain          # why postings were rejected
python main.py --company nvidia   # search within results
python main.py --category quant   # only Quant, Software, Hardware, etc.
python main.py --limit 100        # show more
```

Filters live in `config.yaml`. Edit and re-run — no code changes needed.

## Viewing current internships after a run

`python main.py` (with no flags) is the normal way to look: it prints every
posting that currently matches `config.yaml`'s filters, newest first,
company/title/location/date/URL. A few variations:

```bash
python main.py --limit 200        # default is 40 -- raise it to see more
python main.py --new              # just what showed up since your last run
python main.py --company meta     # narrow to one company
python main.py --category hardware  # narrow to one category (see below)
python main.py --all --limit 20   # peek at unfiltered results, ignoring config.yaml
```

Every printed posting shows its category on the second line (`Quant`,
`Software`, `Hardware`, `AI/ML/Data`, `Product`, etc.) — only SimplifyJobs
sets this field, so it's blank (`n/a`) for postings from other sources.
`--category` is a one-off substring filter for the current run; the
`category_include` list in `config.yaml` (see below) is the equivalent
*permanent* filter if you want it applied every time without typing the
flag.

The full history also lives in `interntrack.db` (plain SQLite), if you want
to browse or query it directly instead of through `main.py`:

```bash
sqlite3 interntrack.db "SELECT company, title, url FROM postings \
  WHERE active = 1 ORDER BY date_posted DESC LIMIT 20;"
```

or open it with any SQLite GUI (DB Browser for SQLite, TablePlus, etc.) --
the schema is the `postings` table defined in `storage.py`.

## Sources

| Source | Format | Stable ID | Publish timestamp |
|---|---|---|---|
| vanshb03/Summer2027-Internships | JSON | upstream UUID | epoch |
| SimplifyJobs/Summer2027-Internships | JSON | upstream UUID | epoch |
| Greenhouse job boards | JSON | job id | `updated_at` only (not original publish) |
| Lever job boards | JSON | posting id | none |
| Ashby job boards | JSON | job id | `publishedAt` (real) |

Greenhouse/Lever/Ashby each expose a company's *entire* job board, not just
internships, and (except Ashby) don't flag a season — see Design notes.
SimplifyJobs is far larger than vanshb03 (~14.6k rows vs. ~330) but most of
it is already-closed postings from past seasons; `active_only` in
`config.yaml` is what cuts that down to what's actually open.

## Automation

`.github/workflows/scan.yml` runs the scanner every 4 hours (6 times a day)
via GitHub Actions, offset 13 minutes past the hour since exact top-of-hour
schedules queue up under load. Each run:

1. Fetches all configured sources, dedupes, filters.
2. Diffs against `interntrack.db` to find genuinely new postings (this is
   what `--new` uses).
3. Commits the updated `interntrack.db` back to the repo if it changed, so
   the next run (and your laptop, after a `git pull`) share the same history.

Requires the repo's Actions settings set to allow workflows to push
(Settings → Actions → General → Workflow permissions → **Read and write
permissions**) — the default read-only token can't push the commit in step 3.

## Design notes

**Failures are loud.** A fetch returning an empty list is treated as an
error, not as "no jobs today". Silent failure is the one bug that makes a
monitoring tool actively harmful — you stop checking manually because you
trust it's working, and it stopped working a week ago.

**Stable IDs.** Postings are keyed on `source:uid`, never on a hash of the
whole record. If upstream edits a title, a content hash would make the
posting look new again on the next diff.

**Cross-source dedup, not exact matching.** The same job can arrive from
both an aggregator and a company's own board with unrelated IDs, so
duplicates are matched on normalized company + title instead. The direct
board wins ties, since it's fresher and more authoritative than either
aggregator.

**Word-boundary keyword matching.** A plain substring check on "intern"
also matches "International"; on "ai" it also matches "training". Short
keyword fragments need word-boundary matching, not substring matching, or
they silently let the wrong postings through.

**Season filtering is conditional, not required.** Greenhouse/Lever/Ashby
don't report a season at all. Rejecting on a missing field would drop every
posting from those sources, so the season check only applies when a source
actually reports one. Simplify can report *multiple* seasons per posting
(a co-op spanning terms); `models._season_from_terms` normalizes that down
to the same bare-word format the other sources use, and the season filter
matches if *any* of them is one you're watching for.

**First-run baseline, not a flood.** The very first run against a database
that doesn't exist yet would otherwise treat every current posting as "new".
That run seeds history silently instead, so `--new` means something on every
run after the first.

**Config over code.** Filter tuning happens in YAML. `--explain` reports the
rejection reason for every dropped posting so tuning is evidence-based.

## Roadmap

- [x] **Phase 1** — fetch, parse, filter
- [x] **Phase 2** — SQLite store, new-posting diff
- [x] **Phase 3** — Greenhouse + Lever + Ashby adapters, cross-source dedup,
  SimplifyJobs as a second aggregator source
- [x] **Phase 4** — GitHub Actions cron, git-committed persistence
  (an earlier Discord-webhook-alerts version of this phase was built and
  then intentionally removed — this is a fetch-and-store tool, not an
  alerting one)
- [ ] **Phase 5** — Google Sheets sync, application pipeline tracking
- [ ] **Phase 6** — resume matching: skill extraction, semantic similarity,
  ranked recommendations — evaluated against a hand-labeled set and
  benchmarked against the keyword filter baseline
