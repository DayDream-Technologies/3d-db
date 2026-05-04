import { useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { SchemaScene } from "@/scene/SchemaScene";
import { useAppStore } from "@/state/store";
import { Legend } from "@/ui/Legend";
import { ControlsHint } from "@/ui/ControlsHint";

type Props = {
  screenshotRef: React.MutableRefObject<(() => void) | null>;
  fitViewRef: React.MutableRefObject<(() => void) | null>;
};

export function MainCanvas({ screenshotRef, fitViewRef }: Props) {
  const schema = useAppStore((s) => s.schema);
  const importedSchema = useAppStore((s) => s.importedSchema);
  const proposalSchema = useAppStore((s) => s.proposalSchema);
  const layout = useAppStore((s) => s.layout);
  const selectedTable = useAppStore((s) => s.selectedTable);
  const hoveredKey = useAppStore((s) => s.hoveredKey);
  const queryHighlight = useAppStore((s) => s.queryHighlight);
  const setSelectedTable = useAppStore((s) => s.setSelectedTable);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const setHoveredKey = useAppStore((s) => s.setHoveredKey);
  const resetLayout = useAppStore((s) => s.resetLayout);
  const clearQueryHighlight = useAppStore((s) => s.clearQueryHighlight);
  const showKeys = useAppStore((s) => s.showKeys);
  const toggleShowKeys = useAppStore((s) => s.toggleShowKeys);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.tagName === "INPUT" ||
          t.tagName === "TEXTAREA" ||
          t.isContentEditable)
      ) {
        return;
      }
      if (e.key === "f" || e.key === "F") {
        fitViewRef.current?.();
      } else if (e.key === "r" || e.key === "R") {
        resetLayout();
      } else if (e.key === "k" || e.key === "K") {
        toggleShowKeys();
      } else if (e.key === "Escape") {
        setSelectedTable(null);
        clearQueryHighlight();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    fitViewRef,
    resetLayout,
    setSelectedTable,
    clearQueryHighlight,
    toggleShowKeys,
  ]);

  if (!schema) {
    return (
      <div className="relative flex min-h-0 flex-1 flex-col bg-[#0b0f14]">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-slate-500">
          <p className="max-w-md text-sm">
            Load a sample from the toolbar or paste JSON / SQL in{" "}
            <strong className="text-slate-400">Import</strong>, then click{" "}
            <strong className="text-slate-400">Visualize</strong>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <Canvas
        shadows
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        camera={{ position: [14, 10, 16], fov: 48, near: 0.1, far: 400 }}
        className="h-full w-full min-h-[320px]"
      >
        <SchemaScene
          schema={schema}
          layout={layout}
          selectedTable={selectedTable}
          hoveredKey={hoveredKey}
          queryHighlight={queryHighlight}
          onSelectTable={(name) => {
            setSelectedTable(name);
            setSidebarTab("table");
          }}
          onHoverKey={setHoveredKey}
          screenshotRef={screenshotRef}
          fitViewRef={fitViewRef}
          showKeys={showKeys}
          proposalBaseline={proposalSchema ? importedSchema : null}
        />
      </Canvas>
      <Legend />
      <ControlsHint />
    </div>
  );
}
