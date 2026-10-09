import {
  type LiveCounts,
  CANVAS,
  EXTRACTED,
  FEED,
  GAPS,
  HERO,
  HERO_DETAIL,
  RESUME,
  STAGES,
  STATS,
  TRACKER,
} from "./story";

/**
 * The product itself, in real markup.
 *
 * Nothing in here animates on its own and nothing holds state — it is a static,
 * fixed-size stage set. LandingStory owns every transform. Elements the camera
 * needs to frame carry `data-focus`; elements the timeline needs to drive carry
 * `data-el`; the travelling card's landing spots carry `data-slot`.
 *
 * Laid out at CANVAS.W × CANVAS.H in absolute pixels on purpose: because the
 * internal geometry never depends on the viewport, the camera can measure every
 * focus target exactly once and reuse it for the life of the page.
 */
export default function Workspace({ counts }: { counts: LiveCounts }) {
  return (
    // aria-hidden: this is a decorative illustration of the product, not
    // content. Its panel titles were landing in the document outline as real
    // headings (h1 -> h3 jump) and its <nav>/<footer> tags as real landmarks,
    // and its match scores are illustrative rather than anyone's actual data.
    // Everything it depicts is stated in text by the captions, the "Four
    // steps" section, and the FAQ, so nothing is lost by hiding it.
    <div
      className="lp-canvas"
      data-focus="workspace"
      aria-hidden="true"
      style={{ width: CANVAS.W, height: CANVAS.H }}
    >
      {/* ---- chrome ------------------------------------------------------ */}
      <header className="lp-topbar">
        <div className="lp-brand">
          <span className="lp-brand-mark" aria-hidden />
          <span className="lp-brand-name">InternTrack</span>
        </div>
        <div className="lp-season">{STATS.season}</div>
        <div className="lp-search">Search roles, companies, skills…</div>
        <div className="lp-topbar-right">
          <span className="lp-scanned">
            <i className="lp-dot" aria-hidden /> Scanned {counts.updated}
          </span>
          <span className="lp-avatar" aria-hidden />
        </div>
      </header>

      <div className="lp-body">
        {/* ---- left rail: nav + résumé ----------------------------------- */}
        <aside className="lp-rail" data-el="rail">
          <nav className="lp-nav">
            {[
              ["Feed", true],
              ["Matches", false],
              ["Résumé", false],
              ["Tracker", false],
              ["Saved", false],
            ].map(([label, active]) => (
              <span
                key={label as string}
                className={`lp-nav-item${active ? " is-active" : ""}`}
              >
                {label as string}
              </span>
            ))}
          </nav>

          <section className="lp-resume" data-focus="resume">
            <h3 className="lp-panel-title">Résumé</h3>

            {/* The drop target. The sheet lands inside it in act 1. */}
            <div className="lp-drop" data-el="drop">
              <span className="lp-drop-hint" data-el="dropHint">
                Drop a PDF
              </span>

              <article className="lp-sheet" data-el="sheet">
                <div className="lp-sheet-lines" aria-hidden>
                  {RESUME.lines.map((w, i) => (
                    <span key={i} style={{ width: `${w * 8}%` }} />
                  ))}
                </div>
                {/* Sweeps top to bottom during the scan. */}
                <div className="lp-scanline" data-el="scanline" aria-hidden />
                <footer className="lp-sheet-foot">
                  <span className="lp-sheet-name">{RESUME.file}</span>
                  <span className="lp-sheet-meta">{RESUME.meta}</span>
                </footer>
              </article>
            </div>

            <div className="lp-extracted" data-el="extracted">
              <span className="lp-extracted-label">Detected</span>
              <div className="lp-chips">
                {EXTRACTED.map((s) => (
                  <span className="lp-chip" data-el="chip" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          </section>
        </aside>

        {/* ---- feed ------------------------------------------------------ */}
        <section className="lp-feed" data-focus="feed" data-el="feed">
          <header className="lp-feed-head">
            <div>
              <h2 className="lp-panel-title">Open roles</h2>
              <p className="lp-feed-sub">
                <span data-el="count">0</span> live ·{" "}
                <span data-el="countCos">0</span> companies
              </p>
            </div>
            <div className="lp-feed-filter" data-el="filter">
              <span className="lp-filter-pill is-on" data-el="filterPill">
                Matches only
              </span>
              <span className="lp-filter-pill">Newest</span>
            </div>
          </header>

          <div className="lp-rows-clip">
            <div className="lp-rows" data-el="rows">
              {FEED.map((r, i) => (
                <div
                  className="lp-row"
                  data-el="row"
                  data-keep={r.keep ? "1" : "0"}
                  data-hero={i === 0 ? "1" : undefined}
                  key={r.id}
                >
                  <span className="lp-row-co">{r.company}</span>
                  <span className="lp-row-role">{r.role}</span>
                  <span className="lp-row-loc">{r.loc}</span>
                  <span className="lp-row-score">
                    <span className="lp-score-bar" aria-hidden>
                      <i style={{ width: `${r.match}%` }} />
                    </span>
                    <b>{r.match}</b>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---- detail + gaps --------------------------------------------- */}
        <section className="lp-detailcol" data-focus="detailcol">
          <article className="lp-detail" data-focus="detail" data-el="detail">
            <header className="lp-detail-head">
              <div>
                <span className="lp-detail-co">{HERO.company}</span>
                <h3 className="lp-detail-role">{HERO.role}</h3>
                <p className="lp-detail-meta">
                  {HERO.loc} · {HERO_DETAIL.season} · Posted{" "}
                  {HERO_DETAIL.posted}
                </p>
              </div>
              <div className="lp-detail-score">
                <span className="lp-detail-num" data-el="detailNum">
                  0
                </span>
                <span className="lp-detail-num-label">match</span>
              </div>
            </header>

            <p className="lp-because" data-el="because">
              {HERO_DETAIL.because}
            </p>

            <div className="lp-skillset">
              <span className="lp-skillset-label">On your résumé</span>
              <div className="lp-chips">
                {HERO_DETAIL.have.map((s) => (
                  <span className="lp-chip is-have" data-el="have" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="lp-skillset">
              <span className="lp-skillset-label">Not yet</span>
              <div className="lp-chips">
                {HERO_DETAIL.missing.map((s) => (
                  <span className="lp-chip is-missing" data-el="missing" key={s}>
                    {s}
                  </span>
                ))}
              </div>
            </div>

            <div className="lp-gate" data-el="gate">
              <span className="lp-gate-label">Eligibility</span>
              <span className="lp-gate-text">{HERO_DETAIL.gate}</span>
            </div>

            <footer className="lp-detail-foot">
              <span className="lp-btn is-primary" data-el="saveBtn">
                Save to tracker
              </span>
              <span className="lp-btn">Open posting</span>
            </footer>
          </article>

          <article className="lp-gaps" data-focus="gaps" data-el="gaps">
            <header className="lp-gaps-head">
              <h3 className="lp-panel-title">Gaps across your saved roles</h3>
              <span className="lp-gaps-sub">Not on your résumé</span>
            </header>
            {GAPS.map((g) => (
              <div className="lp-gap" data-el="gap" key={g.name}>
                <span className="lp-gap-name">{g.name}</span>
                <span className="lp-gap-track" aria-hidden>
                  <i data-el="gapFill" style={{ width: `${g.share}%` }} />
                </span>
                <span className="lp-gap-share">{g.share}%</span>
              </div>
            ))}
          </article>
        </section>

        {/* ---- tracker --------------------------------------------------- */}
        <section className="lp-tracker" data-focus="tracker" data-el="tracker">
          <header className="lp-tracker-head">
            <h2 className="lp-panel-title">Application tracker</h2>
            <span className="lp-tracker-sub">
              {TRACKER.length + 1} active · 2 gone quiet
            </span>
          </header>

          <div className="lp-board">
            {STAGES.map((st) => (
              <div className="lp-col" data-el="col" data-stage={st.key} key={st.key}>
                <header className="lp-col-head" data-el="colHead" data-stage={st.key}>
                  <span className="lp-col-label">{st.label}</span>
                  <span className="lp-col-count" data-el="colCount" data-stage={st.key}>
                    {TRACKER.filter((c) => c.stage === st.key).length}
                  </span>
                </header>

                {/* Landing spot for the travelling card. Measured, never seen. */}
                <div className="lp-slot" data-slot={st.key} aria-hidden />

                {TRACKER.filter((c) => c.stage === st.key).map((c) => (
                  <article className="lp-card" key={c.id}>
                    <span className="lp-card-co">{c.company}</span>
                    <span className="lp-card-role">{c.role}</span>
                    <span className="lp-card-note">{c.note}</span>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ---- the travelling card ----------------------------------------
          Lives outside the board so it can fly across columns on transforms
          alone. Positioned absolutely against the canvas; the timeline moves
          it between measured slot centres. */}
      <article className="lp-card lp-travel" data-el="travel">
        <span className="lp-card-co">{HERO.company}</span>
        <span className="lp-card-role">Backend Eng, Payments</span>
        <span className="lp-card-note" data-el="travelNote">
          Just saved
        </span>
      </article>
    </div>
  );
}
