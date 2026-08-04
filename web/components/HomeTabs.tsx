"use client";

import { useState } from "react";

export default function HomeTabs({
  allContent,
  personalContent,
}: {
  allContent: React.ReactNode;
  personalContent: React.ReactNode;
}) {
  const [tab, setTab] = useState<"all" | "personal">("all");

  return (
    <>
      <div className="mx-auto mt-8 flex w-fit gap-1 rounded-full border border-border p-1">
        <button
          onClick={() => setTab("personal")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === "personal" ? "bg-accent-fill text-text" : "text-text-muted hover:text-text"
          }`}
        >
          Personal
        </button>
        <button
          onClick={() => setTab("all")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === "all" ? "bg-accent-fill text-text" : "text-text-muted hover:text-text"
          }`}
        >
          All
        </button>
      </div>

      {/* Both stay mounted so switching tabs doesn't reset the All tab's
          search/filter state -- just toggle visibility. */}
      <div className={tab === "all" ? "block" : "hidden"}>{allContent}</div>
      <div className={tab === "personal" ? "block" : "hidden"}>{personalContent}</div>
    </>
  );
}
