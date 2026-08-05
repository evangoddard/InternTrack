"use client";

import { useState } from "react";

type Tab = "personal" | "all" | "hidden";

export default function HomeTabs({
  allContent,
  personalContent,
  hiddenContent,
  hiddenCount = 0,
}: {
  allContent: React.ReactNode;
  personalContent: React.ReactNode;
  hiddenContent: React.ReactNode;
  hiddenCount?: number;
}) {
  const [tab, setTab] = useState<Tab>("all");

  const tabClass = (t: Tab) =>
    `rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
      tab === t ? "bg-accent-fill text-text" : "text-text-muted hover:text-text"
    }`;

  return (
    <>
      <div className="mx-auto mt-8 flex w-fit gap-1 rounded-full border border-border p-1">
        <button onClick={() => setTab("personal")} className={tabClass("personal")}>
          Personal
        </button>
        <button onClick={() => setTab("all")} className={tabClass("all")}>
          All
        </button>
        <button onClick={() => setTab("hidden")} className={tabClass("hidden")}>
          Hidden{hiddenCount > 0 && ` (${hiddenCount})`}
        </button>
      </div>

      {/* All three stay mounted so switching tabs doesn't reset the All
          tab's search/filter state -- just toggle visibility. */}
      <div className={tab === "all" ? "block" : "hidden"}>{allContent}</div>
      <div className={tab === "personal" ? "block" : "hidden"}>{personalContent}</div>
      <div className={tab === "hidden" ? "block" : "hidden"}>{hiddenContent}</div>
    </>
  );
}
