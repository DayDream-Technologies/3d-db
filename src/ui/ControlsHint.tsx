import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

export function ControlsHint() {
  const [open, setOpen] = useState(false);
  return (
    <div className="pointer-events-auto absolute right-4 top-4 z-10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-full border border-slate-700 bg-slate-900/85 p-1.5 text-slate-300 shadow hover:bg-slate-800"
        title="Controls"
        aria-label="Show controls"
      >
        <HelpCircle className="h-4 w-4" />
      </button>
      {open && (
        <div className="mt-2 w-64 rounded-lg border border-slate-700 bg-slate-900/95 p-3 text-xs text-slate-200 shadow-xl">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-semibold text-slate-100">Controls</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-slate-500 hover:text-slate-300"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <ul className="space-y-1 text-slate-300">
            <li>
              <strong>Left-drag</strong>: rotate
            </li>
            <li>
              <strong>Right-drag</strong> / Shift+drag: pan
            </li>
            <li>
              <strong>Scroll / pinch</strong>: zoom
            </li>
            <li>
              <strong>Click table</strong>: focus + open details
            </li>
            <li>
              <strong>Hover column chip</strong>: trace FK/PK links
            </li>
          </ul>
          <div className="mt-2 border-t border-slate-700 pt-2 text-slate-400">
            Shortcuts:{" "}
            <kbd className="rounded bg-slate-800 px-1">F</kbd> fit ·{" "}
            <kbd className="rounded bg-slate-800 px-1">R</kbd> relayout ·{" "}
            <kbd className="rounded bg-slate-800 px-1">K</kbd> toggle keys ·{" "}
            <kbd className="rounded bg-slate-800 px-1">Esc</kbd> clear selection
          </div>
        </div>
      )}
    </div>
  );
}
