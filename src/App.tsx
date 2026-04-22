import { useEffect, useRef } from "react";
import { MainCanvas } from "./MainCanvas";
import { Toolbar } from "./ui/Toolbar";
import { Sidebar } from "./ui/Sidebar";
import { useAppStore } from "./state/store";

export default function App() {
  const screenshotRef = useRef<(() => void) | null>(null);
  const fitViewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    void useAppStore
      .getState()
      .loadSample("/samples/ecommerce.json")
      .catch(console.error);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface">
      <Toolbar
        onScreenshot={() => screenshotRef.current?.()}
        onFitView={() => fitViewRef.current?.()}
      />
      <div className="flex min-h-0 flex-1">
        <MainCanvas screenshotRef={screenshotRef} fitViewRef={fitViewRef} />
        <Sidebar />
      </div>
    </div>
  );
}
