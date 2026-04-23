import { useEffect, useState } from "react";
import { clsx } from "clsx";
import { BookOpen, AlertCircle, Loader2 } from "lucide-react";
import { loadLessons } from "@/learn/parseLessons";
import type { Lesson } from "@/learn/types";
import { useAppStore } from "@/state/store";
import { LessonView } from "./LessonView";

export function PracticePanel() {
  const [lessons, setLessons] = useState<Lesson[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<string | null>(null);
  const practiceProgress = useAppStore((s) => s.practiceProgress);

  useEffect(() => {
    let c = true;
    setLoading(true);
    void loadLessons()
      .then((r) => {
        if (!c) return;
        if (r.ok) {
          setLessons(r.lessons);
          setErr(null);
          setSel((prev) => {
            if (prev && r.lessons.some((l) => l.id === prev)) return prev;
            return r.lessons[0]?.id ?? null;
          });
        } else setErr(r.error);
        setLoading(false);
      })
      .catch((e) => {
        if (!c) return;
        setErr(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      c = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading lessons…
      </div>
    );
  }

  if (err) {
    return (
      <div className="flex items-start gap-2 p-3 text-sm text-rose-300">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <div>
          <p className="font-medium">Could not load practice curriculum</p>
          <p className="text-xs text-rose-200/80">{err}</p>
        </div>
      </div>
    );
  }

  if (!lessons?.length) {
    return (
      <div className="p-3 text-sm text-slate-500">No lessons defined yet.</div>
    );
  }

  const current = lessons.find((l) => l.id === sel) ?? lessons[0]!;

  return (
    <div className="flex min-h-0 max-h-[calc(100vh-8rem)] flex-col text-sm sm:max-h-[min(100vh,720px)]">
      <p className="shrink-0 border-b border-slate-800 px-2 py-2 text-[11px] text-slate-500">
        Work through skills with your sample schema. Your progress is saved in
        this browser.
      </p>
      <div className="flex min-h-0 flex-1">
        <div className="w-[44%] shrink-0 overflow-y-auto border-r border-slate-800 p-1 sm:w-40">
          {lessons.map((l) => {
            const st = practiceProgress[l.id] ?? {};
            const done = l.steps.filter(
              (s) => st[s.id] === "passed"
            ).length;
            const isSel = l.id === current.id;
            return (
              <button
                key={l.id}
                type="button"
                onClick={() => setSel(l.id)}
                className={clsx(
                  "mb-1 flex w-full items-start gap-1 rounded px-1.5 py-1.5 text-left text-[11px] leading-tight",
                  isSel
                    ? "bg-sky-900/50 text-sky-100"
                    : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                )}
              >
                <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-80" />
                <span>
                  <span className="block text-[10px] font-semibold uppercase text-slate-500">
                    {l.meta.track}
                  </span>
                  <span className="font-medium">{l.title}</span>
                  <span className="mt-0.5 block text-[10px] text-slate-500">
                    {done}/{l.steps.length} done
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto p-2">
          <h3 className="mb-1 text-sm font-semibold text-slate-100">
            {current.title}
          </h3>
          <LessonView lesson={current} />
        </div>
      </div>
    </div>
  );
}
