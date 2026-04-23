import { useEffect, useId, useRef, useState } from "react";
import { X, ExternalLink } from "lucide-react";
import { marked } from "marked";

const cache = new Map<string, string>();

type Props = {
  open: boolean;
  title: string;
  /** Fetched with fetch(); use path under public/ e.g. `docs/FOO.md` with BASE_URL */
  docPath: string;
  onClose: () => void;
  /** e.g. link to GitHub `docs/FOO.md` in repo */
  repoFileUrl?: string;
};

/**
 * Fetches rendered Markdown and shows in a modal (Esc / overlay / close).
 */
export function DocModal({ open, title, docPath, onClose, repoFileUrl }: Props) {
  const [html, setHtml] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const id = useId();
  const titleId = `docmod-${id}`;

  const resolved = docPath.startsWith("http")
    ? docPath
    : `${import.meta.env.BASE_URL.replace(/\/$/, "")}/${docPath.replace(/^\//, "")}`;

  useEffect(() => {
    if (!open) {
      setHtml(null);
      setErr(null);
      return;
    }
    const c = cache.get(resolved);
    if (c) {
      setHtml(c);
      setErr(null);
      return;
    }
    setLoading(true);
    setErr(null);
    void fetch(resolved)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
        return r.text();
      })
      .then((md) => {
        return Promise.resolve(marked.parse(md)).then((h) => String(h));
      })
      .then((h) => {
        cache.set(resolved, h);
        setHtml(h);
      })
      .catch((e) => {
        setErr(e instanceof Error ? e.message : String(e));
        setHtml(null);
      })
      .finally(() => setLoading(false));
  }, [open, resolved]);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>("button, a, [tabindex]")?.focus();
    });
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        className="flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-600 bg-slate-900 shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900/95 px-3 py-2">
          <h2 id={titleId} className="pr-2 text-sm font-semibold text-slate-100">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {repoFileUrl && (
              <a
                href={repoFileUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-0.5 text-[11px] text-sky-400 hover:underline"
              >
                View on GitHub
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <button
              type="button"
              className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm text-slate-200">
          {loading && <p className="text-slate-500">Loading…</p>}
          {err && <p className="text-red-300">{err}</p>}
          {html && !loading && (
            <div
              className="max-w-none space-y-2 text-slate-200 [&_a]:text-sky-400 [&_a]:hover:underline [&_code]:rounded [&_code]:bg-slate-800 [&_code]:px-1 [&_h1]:mb-2 [&_h1]:text-base [&_h2]:mt-3 [&_h2]:text-sm [&_li]:my-0.5 [&_p]:mb-2 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:bg-slate-950 [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
