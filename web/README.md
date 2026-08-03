# InternTrack (demo)

A static, no-backend internship job feed. Next.js App Router + TypeScript +
Tailwind CSS, exported to plain HTML/CSS/JS — no accounts, no server, no
database.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build the static site

```bash
npm run build
```

Output goes to `out/` (see `output: "export"` in `next.config.ts`). That
folder can be deployed as-is to Vercel, GitHub Pages, or any static host.

## Files you'll actually want to edit

- **`data.json`** — the only data source. Overwrite this with real scraper
  output (matching the shape in `lib/types.ts`) and rebuild; nothing else
  needs to change.
- **`lib/rankPostings.ts`** — placeholder resume/job matcher. Replace the
  scoring logic with a real matcher; the function signature is the only
  contract the UI depends on.
- **`components/Header.tsx`** — swap the placeholder GitHub/portfolio URLs.
- **`components/Footer.tsx`** — swap the placeholder "built by" name.

Everything else (`components/JobBoard.tsx`, `PostingRow.tsx`, `Hero.tsx`,
`MatchPanel.tsx`, `ThemeToggle.tsx`) is generic UI and shouldn't need
edits when you wire in real data.
