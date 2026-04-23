import { useState } from "react";
import { clsx } from "clsx";
import { TipsList } from "./TipsList";
import { PracticePanel } from "./practice/PracticePanel";

type TTab = "tips" | "practice";

export function TipsPanel() {
  const [tab, setTab] = useState<TTab>("tips");

  return (
    <div className="p-0 text-sm">
      <div className="flex border-b border-slate-800">
        {(
          [
            ["tips", "Tips"],
            ["practice", "Practice"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={clsx(
              "flex-1 border-b-2 px-2 py-2 text-xs font-medium transition-colors",
              tab === id
                ? "border-sky-500 text-sky-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="pt-0">
        {tab === "tips" && <TipsList />}
        {tab === "practice" && <PracticePanel />}
      </div>
    </div>
  );
}
