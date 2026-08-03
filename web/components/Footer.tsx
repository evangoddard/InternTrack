const TECH_STACK = ["Next.js", "TypeScript", "Tailwind CSS", "Static export"];

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-6 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
        {/* Placeholder — swap in your own name/link. */}
        <span>Built by Your Name</span>

        <div className="flex flex-wrap items-center gap-y-1">
          {TECH_STACK.map((tag, i) => (
            <span key={tag} className="flex items-center">
              {i > 0 && <span className="mx-2 text-text-faint">·</span>}
              {tag}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
