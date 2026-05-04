import clsx from "clsx";
import {
  Database,
  Table2,
  Search,
  Lightbulb,
  FileJson,
  Bot,
} from "lucide-react";
import { useAppStore, type SidebarTab } from "@/state/store";
import { ImportPanel } from "./ImportPanel";
import { TablePanel } from "./TablePanel";
import { QueryPanel } from "./QueryPanel";
import { TipsPanel } from "./TipsPanel";
import { ExportPanel } from "./ExportPanel";
import { AgentPanel } from "./AgentPanel";

const tabs: { id: SidebarTab; label: string; icon: typeof Database }[] = [
  { id: "import", label: "Import", icon: Database },
  { id: "table", label: "Table", icon: Table2 },
  { id: "query", label: "Query", icon: Search },
  { id: "tips", label: "Tips", icon: Lightbulb },
  { id: "export", label: "Export", icon: FileJson },
  { id: "agent", label: "Agent", icon: Bot },
];

export function Sidebar() {
  const tab = useAppStore((s) => s.sidebarTab);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);

  return (
    <aside className="flex w-[min(100%,22rem)] shrink-0 flex-col border-l border-slate-700/80 bg-surface-raised">
      <nav className="flex shrink-0 border-b border-slate-700/80">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            title={t.label}
            className={clsx(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium",
              tab === t.id
                ? "bg-sky-900/40 text-sky-200"
                : "text-slate-500 hover:bg-slate-800/80 hover:text-slate-300"
            )}
            onClick={() => setSidebarTab(t.id)}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "import" && <ImportPanel />}
        {tab === "table" && <TablePanel />}
        {tab === "query" && <QueryPanel />}
        {tab === "tips" && <TipsPanel />}
        {tab === "export" && <ExportPanel />}
        {tab === "agent" && <AgentPanel />}
      </div>
    </aside>
  );
}
