import type { Chiplet } from "./story";

/**
 * The small glyphs for the chiplet row. Drawn rather than iconographic: each one
 * is a reduction of the surface it stands for, so the row reads as a map of the
 * product rather than a set of decorations.
 */
export default function ChipletGlyph({ glyph }: { glyph: Chiplet["glyph"] }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 32 32" width="32" height="32" aria-hidden focusable="false">
      {glyph === "feed" && (
        <g {...common}>
          <rect x="5" y="7" width="22" height="4" rx="1.4" />
          <rect x="5" y="14" width="22" height="4" rx="1.4" />
          <rect x="5" y="21" width="22" height="4" rx="1.4" />
        </g>
      )}
      {glyph === "match" && (
        <g {...common}>
          <rect x="5" y="8" width="22" height="3.4" rx="1.7" opacity="0.35" />
          <rect x="5" y="14.3" width="15" height="3.4" rx="1.7" />
          <rect x="5" y="20.6" width="9" height="3.4" rx="1.7" opacity="0.6" />
        </g>
      )}
      {glyph === "resume" && (
        <g {...common}>
          <rect x="8" y="4.5" width="16" height="23" rx="2" />
          <path d="M11.5 11h9M11.5 15h9M11.5 19h6" />
        </g>
      )}
      {glyph === "gaps" && (
        <g {...common}>
          <path d="M5 24V13M12 24V8M19 24v-7M26 24v-4" strokeWidth="2.6" />
        </g>
      )}
      {glyph === "tracker" && (
        <g {...common}>
          <rect x="4" y="7" width="6.5" height="18" rx="1.6" />
          <rect x="12.75" y="7" width="6.5" height="12" rx="1.6" />
          <rect x="21.5" y="7" width="6.5" height="15" rx="1.6" />
        </g>
      )}
      {glyph === "saved" && (
        <g {...common}>
          <path d="M9 5h14a1 1 0 0 1 1 1v20l-8-5.5L8 26V6a1 1 0 0 1 1-1Z" />
        </g>
      )}
    </svg>
  );
}
