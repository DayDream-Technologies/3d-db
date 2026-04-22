import { ExternalLink, GraduationCap } from "lucide-react";
import { LEARN, type LearnKey } from "@/resources/learnLinks";

type Props = {
  topic: LearnKey;
  /** Override the default label (e.g. "Learn PRIMARY KEY") */
  label?: string;
  /** "inline" = tiny link for in-flow text; "chip" = pill-shaped button */
  variant?: "inline" | "chip";
  className?: string;
};

export function LearnLink({
  topic,
  label,
  variant = "inline",
  className,
}: Props) {
  const entry = LEARN[topic];
  const text = label ?? `Learn ${entry.label}`;
  const title = `${entry.label} — W3Schools`;

  if (variant === "chip") {
    return (
      <a
        href={entry.url}
        target="_blank"
        rel="noreferrer noopener"
        title={title}
        className={
          "inline-flex items-center gap-1 rounded border border-sky-800/50 bg-sky-950/40 px-2 py-0.5 text-[10px] text-sky-200 hover:bg-sky-900/50 " +
          (className ?? "")
        }
      >
        <GraduationCap className="h-3 w-3" />
        {text}
      </a>
    );
  }

  return (
    <a
      href={entry.url}
      target="_blank"
      rel="noreferrer noopener"
      title={title}
      className={
        "inline-flex items-center gap-0.5 text-[11px] text-sky-400 hover:underline " +
        (className ?? "")
      }
    >
      <GraduationCap className="h-3 w-3" />
      {text}
      <ExternalLink className="h-2.5 w-2.5 opacity-70" />
    </a>
  );
}
