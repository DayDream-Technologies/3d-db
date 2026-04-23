import { useMemo, useState } from "react";
import { marked } from "marked";
import { CheckCircle2, XCircle, ChevronDown, ChevronRight } from "lucide-react";
import { useAppStore } from "@/state/store";
import { SAMPLE_SCHEMA_NAMES } from "@/learn/parseLessons";
import type { Lesson, Step } from "@/learn/types";
import { asSchemaCheck, asSqlCheck } from "@/learn/types";
import { validateSqlLesson } from "@/learn/validators/sql";
import { validateSchemaLesson } from "@/learn/validators/schema";
import { LearnLink } from "../LearnLink";

type Props = {
  lesson: Lesson;
  step: Step;
};

export function StepView({ lesson, step }: Props) {
  const rawSchema = useAppStore((s) => s.rawSchema);
  const schema = useAppStore((s) => s.schema);
  const loadSample = useAppStore((s) => s.loadSample);
  const setSidebarTab = useAppStore((s) => s.setSidebarTab);
  const practiceProgress = useAppStore((s) => s.practiceProgress);
  const practiceAnswers = useAppStore((s) => s.practiceAnswers);
  const setPracticeStep = useAppStore((s) => s.setPracticeStep);
  const setPracticeAnswer = useAppStore((s) => s.setPracticeAnswer);

  const [open, setOpen] = useState(true);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastResult, setLastResult] = useState<{
    pass: boolean;
    items: { label: string; ok: boolean; detail: string }[];
  } | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const sqlText = practiceAnswers[lesson.id]?.[step.id] ?? step.starterSql;

  const status = practiceProgress[lesson.id]?.[step.id];
  const promptHtml = useMemo(() => {
    if (!step.promptMd.trim()) return "";
    return String(marked.parse(step.promptMd));
  }, [step.promptMd]);

  const expectedName = SAMPLE_SCHEMA_NAMES[lesson.meta.sample] ?? "";
  const needsSample =
    !schema || (expectedName && schema.name !== expectedName);

  const onCheck = () => {
    setLoadErr(null);
    if (step.checkKind === "sql") {
      if (!rawSchema) {
        setLastResult({
          pass: false,
          items: [
            {
              label: "Schema",
              ok: false,
              detail: "Load a sample or import a schema first.",
            },
          ],
        });
        return;
      }
      const sqlCheck = asSqlCheck(step.check);
      const r = validateSqlLesson(
        sqlText,
        step.answerSql,
        sqlCheck
      );
      setLastResult(r);
      setPracticeStep(lesson.id, step.id, r.pass ? "passed" : "attempted");
    } else {
      if (!rawSchema) {
        setLastResult({
          pass: false,
          items: [
            {
              label: "Schema",
              ok: false,
              detail: "No schema in memory. Load the sample or build in the Table tab.",
            },
          ],
        });
        return;
      }
      const sc = asSchemaCheck(step.check) ?? {};
      const r = validateSchemaLesson(rawSchema, sc);
      setLastResult(r);
      setPracticeStep(lesson.id, step.id, r.pass ? "passed" : "attempted");
    }
  };

  const statusLabel =
    status === "passed"
      ? "Passed"
      : status === "attempted"
        ? "Attempted"
        : "Not checked";

  const samplePath = `/samples/${lesson.meta.sample}`;

  return (
    <div className="rounded border border-slate-800 bg-slate-950/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2 py-2 text-left"
      >
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-slate-500" />
        )}
        <span className="text-xs font-semibold text-slate-200">
          Step {step.number}: {step.title}
        </span>
        <span
          className={
            "ml-auto rounded px-1.5 py-0.5 text-[10px] " +
            (status === "passed"
              ? "bg-emerald-900/50 text-emerald-200"
              : status === "attempted"
                ? "bg-amber-900/40 text-amber-200"
                : "bg-slate-800 text-slate-500")
          }
        >
          {statusLabel}
        </span>
      </button>
      {open && (
        <div className="space-y-2 border-t border-slate-800 px-2 pb-3 pt-1">
          {needsSample && (
            <div className="rounded border border-sky-800/50 bg-sky-950/30 p-2 text-[11px] text-sky-200">
              <p className="mb-1">
                This lesson uses the <strong>{expectedName}</strong> sample
                schema.
              </p>
              <button
                type="button"
                className="rounded bg-sky-800/50 px-2 py-1 text-xs text-sky-100 hover:bg-sky-800/80"
                onClick={() => {
                  setLoadErr(null);
                  void loadSample(samplePath).catch((e) => {
                    setLoadErr(
                      e instanceof Error ? e.message : "Failed to load sample"
                    );
                  });
                }}
              >
                Load sample: {lesson.meta.sample}
              </button>
              {loadErr && (
                <p className="mt-1 text-rose-400">{loadErr}</p>
              )}
            </div>
          )}

          {promptHtml && (
            <div
              className="max-w-none text-xs text-slate-300 [&_a]:text-sky-400 [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_p]:mb-1 [&_ul]:list-disc [&_ul]:pl-4"
              dangerouslySetInnerHTML={{ __html: promptHtml }}
            />
          )}

          {step.checkKind === "sql" && (
            <div>
              <label className="mb-1 block text-[11px] text-slate-500">
                Your SQL
              </label>
              <textarea
                className="min-h-[120px] w-full rounded border border-slate-700 bg-slate-950 p-2 font-mono text-[11px] text-slate-200"
                value={sqlText}
                onChange={(e) =>
                  setPracticeAnswer(lesson.id, step.id, e.target.value)
                }
                spellCheck={false}
              />
            </div>
          )}

          {step.checkKind === "schema" && (
            <div className="space-y-1 text-[11px] text-slate-400">
              <p>
                Use the <strong>Table</strong> tab to create or edit tables
                and columns, then return here to validate.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800"
                  onClick={() => setSidebarTab("table")}
                >
                  Open Table tab
                </button>
                <button
                  type="button"
                  className="rounded border border-slate-600 px-2 py-1 text-slate-200 hover:bg-slate-800"
                  onClick={() => {
                    setLoadErr(null);
                    void loadSample(samplePath).catch((e) => {
                      setLoadErr(
                        e instanceof Error ? e.message : "Failed to load sample"
                      );
                    });
                  }}
                >
                  Reload sample (reset schema)
                </button>
              </div>
            </div>
          )}

          {step.checkKind === "sql" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded bg-emerald-800/50 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-800/70"
                onClick={onCheck}
              >
                Check
              </button>
              <button
                type="button"
                className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                onClick={() => setShowAnswer((s) => !s)}
              >
                {showAnswer ? "Hide answer" : "Show answer"}
              </button>
            </div>
          )}
          {step.checkKind === "schema" && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded bg-emerald-800/50 px-3 py-1 text-xs text-emerald-100 hover:bg-emerald-800/70"
                onClick={onCheck}
              >
                Check
              </button>
              {!!step.answerText && (
                <button
                  type="button"
                  className="rounded border border-slate-600 px-3 py-1 text-xs text-slate-300 hover:bg-slate-800"
                  onClick={() => setShowAnswer((s) => !s)}
                >
                  {showAnswer ? "Hide answer key" : "Show answer key"}
                </button>
              )}
            </div>
          )}

          {showAnswer && step.checkKind === "sql" && step.answerSql && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                Answer key
              </p>
              <pre className="max-h-48 overflow-auto rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[10px] text-slate-400">
                {step.answerSql}
              </pre>
            </div>
          )}

          {showAnswer && step.checkKind === "schema" && step.answerText && (
            <div>
              <p className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
                Answer key
              </p>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-slate-800 bg-slate-950 p-2 font-mono text-[10px] text-slate-400">
                {step.answerText}
              </pre>
            </div>
          )}

          {lastResult && (
            <div className="space-y-1 rounded border border-slate-800 p-2">
              <p
                className={
                  "text-xs font-medium " +
                  (lastResult.pass ? "text-emerald-300" : "text-amber-200")
                }
              >
                {lastResult.pass ? "All checks passed." : "Not quite — see below."}
              </p>
              <ul className="space-y-0.5 text-[11px]">
                {lastResult.items.map((it) => (
                  <li
                    key={it.label + it.detail}
                    className="flex gap-1.5 text-slate-400"
                  >
                    {it.ok ? (
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                    ) : (
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />
                    )}
                    <span>
                      <span className="text-slate-200">{it.label}:</span>{" "}
                      {it.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {step.checkKind === "sql" && (
            <p className="text-[10px] text-slate-600">
              <LearnLink topic="select" label="SELECT" /> — structural checks
              only; results are not executed against real rows.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
