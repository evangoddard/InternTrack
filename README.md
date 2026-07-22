# InternTrack

Automated internship posting monitor. Polls job boards on a schedule,
deduplicates against a local store, and alerts on new listings matching
configurable criteria.

**Status: Phase 1** — fetching and filtering work. Storage, alerts,
scheduling, and resume matching are not built yet.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python main.py
```

## Usage

```bash
python main.py                    # matching postings, newest first
python main.py --all              # every posting, unfiltered
python main.py --explain          # why postings were rejected
python main.py --company nvidia   # search within results
python main.py --limit 100        # show more
```

Filters live in `config.yaml`. Edit and re-run — no code changes needed.

## Sources

| Source | Format | Stable ID |
|---|---|---|
| vanshb03/Summer2027-Internships | JSON | yes (upstream UUID) |
| Greenhouse job boards | JSON | Phase 3 |
| Lever job boards | JSON | Phase 3 |

## Design notes

**Failures are loud.** A fetch returning an empty list is treated as an
error, not as "no jobs today". Silent failure is the one bug that makes a
monitoring tool actively harmful — you stop checking manually because you
trust the alerts, and the alerts stopped working a week ago.

**Stable IDs.** Postings are keyed on `source:uid`, never on a hash of the
whole record. If upstream edits a title, a content hash would make the
posting look new and re-alert.

**Config over code.** Filter tuning happens in YAML. `--explain` reports the
rejection reason for every dropped posting so tuning is evidence-based.

## Roadmap

- [x] **Phase 1** — fetch, parse, filter
- [ ] **Phase 2** — SQLite store, new-posting diff
- [ ] **Phase 3** — Greenhouse + Lever adapters, cross-source dedup
- [ ] **Phase 4** — Discord webhook alerts
- [ ] **Phase 5** — GitHub Actions cron, failure alerting
- [ ] **Phase 6** — Google Sheets sync, application pipeline tracking
- [ ] **Phase 7** — resume matching: skill extraction, semantic similarity,
  ranked recommendations — evaluated against a hand-labeled set and
  benchmarked against the keyword filter baseline
