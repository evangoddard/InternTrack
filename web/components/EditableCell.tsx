"use client";

import { useState, useTransition } from "react";
import { updateTrackerField } from "@/app/saved/actions";

// One editable spreadsheet cell -- click in, type, saves on blur or Enter.
// Local state updates immediately (feels instant); the server write happens
// in the background via useTransition so a slow network doesn't block typing.
export default function EditableCell({
  id,
  field,
  value: initialValue,
  placeholder,
}: {
  id: string;
  field: string;
  value: string;
  placeholder?: string;
}) {
  const [value, setValue] = useState(initialValue);
  const [, startTransition] = useTransition();

  const save = () => {
    if (value === initialValue) return;
    startTransition(() => {
      updateTrackerField(id, field, value);
    });
  };

  return (
    <input
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
      placeholder={placeholder}
      className="w-full bg-transparent px-2 py-1.5 text-xs text-text outline-none placeholder:text-text-faint focus:bg-accent-wash"
    />
  );
}
