"use client";

import { useEffect, useState } from "react";

// Takes over the feed area while eligibility is being worked out, because
// that first pass reads the requirements text for every posting and can run
// close to a minute on a cold cache. A checkbox that just sits there for 50
// seconds reads as broken -- this says plainly what's happening and keeps a
// visibly moving elapsed counter so it's obviously alive.
export default function EligibilityScanning({
  total,
  onCancel,
}: {
  total: number;
  onCancel: () => void;
}) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      {/* Two counter-rotating arcs -- cheap, no asset, and unmistakably
          "working" rather than "stuck". */}
      <div className="relative h-14 w-14">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-border border-t-accent-bright" />
        <span
          className="absolute inset-2 animate-spin rounded-full border-2 border-transparent border-b-accent/60"
          style={{ animationDirection: "reverse", animationDuration: "1.6s" }}
        />
      </div>

      <h2 className="font-display mt-6 text-xl font-semibold text-text">
        Checking which roles you qualify for
      </h2>

      <p className="mt-2 max-w-md text-sm text-text-muted">
        Reading the stated requirements on all {total} postings and comparing them against
        your résumé.
      </p>

      <p className="mt-4 font-num text-xs tabular-nums text-text-faint">
        {seconds}s elapsed · this can take up to a minute the first time
      </p>

      <p className="mt-1 max-w-sm text-xs text-text-faint">
        Results are saved, so every check after this one is instant.
      </p>

      <button
        type="button"
        onClick={onCancel}
        className="mt-6 text-xs font-semibold text-text-faint transition-colors hover:text-text"
      >
        Cancel
      </button>
    </div>
  );
}
