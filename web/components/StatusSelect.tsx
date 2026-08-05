"use client";

import { useRef } from "react";
import { updateStatus } from "@/app/saved/actions";
import { STATUSES, STATUS_LABELS } from "@/lib/savedStatus";

export default function StatusSelect({ id, status }: { id: string; status: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateStatus}>
      <input type="hidden" name="id" value={id} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-full rounded-lg border border-border bg-bg/60 px-2 py-1 text-xs text-text outline-none focus:border-accent-bright"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s} className="bg-bg-raised">
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
