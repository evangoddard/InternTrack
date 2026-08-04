"use client";

import { useState } from "react";
import { companyLogoUrl } from "@/lib/companyLogo";

// Falls back to a plain initial-letter avatar if the guessed logo URL 404s
// (companyLogoUrl's domain guess is best-effort, not authoritative) or if
// there's no company name to guess from at all.
export default function CompanyLogo({ company }: { company: string }) {
  const [failed, setFailed] = useState(false);
  const src = companyLogoUrl(company);

  if (!src || failed) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-wash text-[0.65rem] font-semibold text-accent-bright">
        {company.trim().charAt(0).toUpperCase() || "?"}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- external, unpredictable domain per company; not worth next/image config
    <img
      src={src}
      alt=""
      width={24}
      height={24}
      className="h-6 w-6 shrink-0 rounded-full bg-white object-contain"
      onError={() => setFailed(true)}
    />
  );
}
