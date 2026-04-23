import { parse as parseYaml } from "yaml";
import type { Lesson, LessonMeta, Step, SqlCheckSpec, SchemaCheckSpec } from "./types";
/** Always available: fetch can return 404 or the SPA index when `base` is relative. */
import lessonsBundled from "./lessons.md?raw";

const LESSONS_PATH = "learn/lessons.md";

/** Map sample file -> schema name in JSON (for "Load sample" / mismatch detection) */
export const SAMPLE_SCHEMA_NAMES: Record<string, string> = {
  "ecommerce.json": "E-commerce (sample)",
  "blog.json": "Blog (sample)",
  "library.json": "Library (sample)",
};

let cache: Lesson[] | null = null;
let cacheErr: string | null = null;

function looksLikeSpaIndexHtml(s: string): boolean {
  const t = s.trimStart().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

function hasLessonSections(s: string): boolean {
  return /^##\s+Lesson:/m.test(s);
}

function tryParseFromString(md: string): Lesson[] {
  if (looksLikeSpaIndexHtml(md) || !hasLessonSections(md)) return [];
  return parseLessonsDocument(md);
}

/**
 * Resolves a same-origin URL for /learn/lessons.md in dev and on GitHub Pages
 * (e.g. base /3d-db/ → /3d-db/learn/lessons.md).
 */
function resolveLessonFetchUrl(): string {
  if (typeof window === "undefined") {
    return `/${LESSONS_PATH}`;
  }
  const b = import.meta.env.BASE_URL || "/";
  const root =
    b === "./" || b === ""
      ? `/${LESSONS_PATH}`
      : `${b.replace(/\/$/, "")}/${LESSONS_PATH}`.replace(/\/+/g, "/");
  return new URL(root, window.location.origin).href;
}

export async function loadLessons(reload = false): Promise<
  | { ok: true; lessons: Lesson[] }
  | { ok: false; error: string }
> {
  if (reload) {
    cache = null;
    cacheErr = null;
  }
  if (!reload && cache && cache.length > 0) {
    if (cacheErr) return { ok: false, error: cacheErr };
    return { ok: true, lessons: cache };
  }

  let fromNetwork: Lesson[] = [];
  if (typeof fetch !== "undefined") {
    const url = resolveLessonFetchUrl();
    try {
      const res = await fetch(url, { cache: "no-cache" });
      if (res.ok) {
        const md = await res.text();
        fromNetwork = tryParseFromString(md);
      }
    } catch {
      /* use bundled */
    }
  }

  if (fromNetwork.length > 0) {
    cache = fromNetwork;
    cacheErr = null;
    return { ok: true, lessons: cache };
  }

  const fromBundle = parseLessonsDocument(lessonsBundled);
  if (fromBundle.length === 0) {
    const msg = "Bundled curriculum (src/learn/lessons.md) produced no lessons.";
    cacheErr = msg;
    return { ok: false, error: msg };
  }
  cache = fromBundle;
  cacheErr = null;
  return { ok: true, lessons: cache };
}

export function parseLessonsDocument(md: string): Lesson[] {
  const lessons: Lesson[] = [];
  const parts = md.split(/^##\s+Lesson:\s*(.+)$/m);
  for (let i = 1; i < parts.length; i += 2) {
    const title = parts[i]!.trim();
    const body = (parts[i + 1] ?? "").trim();
    if (!body) continue;
    const { meta, rest } = parseLessonPreamble(body);
    const steps = parseSteps(meta.id, meta, rest);
    if (steps.length === 0) continue;
    lessons.push({
      id: meta.id,
      title,
      meta,
      steps,
    });
  }
  return lessons;
}

function parseLessonPreamble(body: string): {
  meta: LessonMeta;
  rest: string;
} {
  const lines = body.split("\n");
  const meta: LessonMeta = {
    id: "untitled",
    track: "sql",
    sample: "ecommerce.json",
  };
  let i = 0;
  for (; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (line.startsWith("###")) break;
    const backtick = /^`(.+)`$/.exec(line);
    if (backtick) {
      const parsed = parseMetaLine(backtick[1]!);
      if (parsed.id) meta.id = parsed.id;
      if (parsed.track) meta.track = parsed.track;
      if (parsed.sample) meta.sample = parsed.sample;
    }
  }
  return { meta, rest: lines.slice(i).join("\n") };
}

function parseMetaLine(
  s: string
): Partial<Pick<LessonMeta, "id" | "track" | "sample">> {
  const out: Partial<Pick<LessonMeta, "id" | "track" | "sample">> = {};
  for (const part of s.split(",")) {
    const m = /^\s*([a-zA-Z_]+)\s*:\s*(.+)$/.exec(part.trim());
    if (!m) continue;
    const k = m[1]!.toLowerCase();
    const v = m[2]!.trim();
    if (k === "id") out.id = v;
    if (k === "track" && (v === "sql" || v === "schema")) out.track = v;
    if (k === "sample") out.sample = v;
  }
  return out;
}

function parseSteps(lessonId: string, meta: LessonMeta, body: string): Step[] {
  const checkKind = meta.track;
  const steps: Step[] = [];
  // Must be `mg` in one pattern — `new RegExp(re, "g")` would drop the `m` flag and
  // `^`/`$` would not match per line, so no steps would be found.
  const re = /^###\s*Step\s*(\d+)\s*:\s*(.+)$/gm;
  const matches = [...body.matchAll(re)];
  for (let m = 0; m < matches.length; m++) {
    const match = matches[m]!;
    const num = Number(match[1]!);
    const title = match[2]!.trim();
    const start = (match.index ?? 0) + match[0]!.length;
    const end =
      m + 1 < matches.length
        ? (matches[m + 1]!.index ?? body.length)
        : body.length;
    const text = body.slice(start, end).trim();
    const {
      starter,
      answer,
      answerText,
      checkYaml,
      checkJson,
      promptWithoutFences,
    } = extractFencedBlocks(text);

    let check: SqlCheckSpec | SchemaCheckSpec | null = null;
    const checkRaw = checkYaml?.trim() || checkJson?.trim();
    if (checkRaw) {
      try {
        if (checkYaml) {
          const parsed = parseYaml(checkRaw) as unknown;
          if (parsed && typeof parsed === "object")
            check = parsed as SqlCheckSpec | SchemaCheckSpec;
        } else if (checkJson) {
          check = JSON.parse(checkJson) as SqlCheckSpec | SchemaCheckSpec;
        }
      } catch {
        /* keep null */
      }
    }

    steps.push({
      id: `${lessonId}-step-${num}`,
      number: num,
      title,
      promptMd: promptWithoutFences,
      starterSql: starter,
      answerSql: answer,
      answerText: answerText ?? "",
      check,
      checkKind,
    });
  }
  return steps;
}

const FENCE = /```\s*([a-zA-Z0-9_-]+)(?:\s+([a-zA-Z0-9_-]+))?\r?\n([\s\S]*?)```/g;

function extractFencedBlocks(stepText: string): {
  starter: string;
  answer: string;
  answerText: string;
  checkYaml: string | null;
  checkJson: string | null;
  promptWithoutFences: string;
} {
  let starter = "";
  let answer = "";
  let answerText = "";
  let checkYaml: string | null = null;
  let checkJson: string | null = null;
  const pieces: string[] = [];
  const re = new RegExp(FENCE.source, "g");
  let last = 0;
  for (;;) {
    const m = re.exec(stepText);
    if (!m) {
      pieces.push(stepText.slice(last));
      break;
    }
    pieces.push(stepText.slice(last, m.index));
    last = m.index! + m[0]!.length;
    const lang1 = m[1]!.toLowerCase();
    const lang2 = m[2]?.toLowerCase() ?? "";
    const inner = m[3]!;

    if (lang1 === "sql" && lang2 === "starter") starter = inner.trim();
    else if (lang1 === "sql" && lang2 === "answer") answer = inner.trim();
    else if (lang1 === "sql" && !lang2) answer = inner.trim();
    else if (lang1 === "text" && lang2 === "answer") answerText = inner.trim();
    else if (lang1 === "check" && lang2 === "yaml") checkYaml = inner;
    else if (lang1 === "check" && lang2 === "json") checkJson = inner;
    else
      pieces.push(
        m[0]! // keep unknown or duplicate fences in prompt
      );
  }
  re.lastIndex = 0;
  return {
    starter,
    answer,
    answerText,
    checkYaml,
    checkJson,
    promptWithoutFences: pieces.join("").trim(),
  };
}
