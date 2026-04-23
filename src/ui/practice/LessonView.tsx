import type { Lesson } from "@/learn/types";
import { useAppStore } from "@/state/store";
import { StepView } from "./StepView";

type Props = { lesson: Lesson };

export function LessonView({ lesson }: Props) {
  const practiceProgress = useAppStore((s) => s.practiceProgress);

  const byLesson = practiceProgress[lesson.id] ?? {};
  const total = lesson.steps.length;
  const passed = lesson.steps.filter(
    (s) => byLesson[s.id] === "passed"
  ).length;
  const pct = total ? Math.round((passed / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <div className="px-1">
        <div className="mb-0.5 flex items-center justify-between text-[11px] text-slate-500">
          <span>Progress</span>
          <span>
            {passed} / {total} steps
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full rounded-full bg-sky-600 transition-[width]"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="space-y-2">
        {lesson.steps.map((s) => (
          <StepView key={s.id} lesson={lesson} step={s} />
        ))}
      </div>
    </div>
  );
}
