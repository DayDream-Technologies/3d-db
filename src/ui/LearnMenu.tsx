import { useEffect, useRef, useState } from "react";
import { ChevronDown, ExternalLink, GraduationCap } from "lucide-react";
import { LEARN, LEARN_MENU } from "@/resources/learnLinks";

/**
 * Dropdown that links out to curated W3Schools SQL tutorial pages.
 * Mounted in the toolbar so users can look up any concept at any time.
 */
export function LearnMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex items-center gap-1 rounded border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 hover:bg-slate-700"
        onClick={() => setOpen((v) => !v)}
        title="Open SQL tutorials on W3Schools"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        Learn SQL
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-30 mt-1 w-64 rounded border border-slate-700 bg-surface-raised p-1 shadow-lg"
        >
          <div className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-wide text-slate-500">
            W3Schools SQL Tutorial
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {LEARN_MENU.map((key) => {
              const entry = LEARN[key];
              return (
                <li key={key}>
                  <a
                    href={entry.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-center justify-between rounded px-2 py-1 text-xs text-slate-200 hover:bg-slate-800"
                    onClick={() => setOpen(false)}
                  >
                    <span>{entry.label}</span>
                    <ExternalLink className="h-3 w-3 text-slate-500" />
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
