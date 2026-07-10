import { Fragment } from "react";

/** Formateo liviano: **negrita**, *itálica*, `código`, links y @menciones. */
export function formatText(text: string, names: string[] = []): React.ReactNode {
  const mentionRe = names.length
    ? new RegExp(`@(${names.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "g")
    : null;

  // tokenizamos por markdown inline y links
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|https?:\/\/[^\s]+)/g);
  return parts.map((part, i) => {
    if (/^\*\*[^*]+\*\*$/.test(part))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (/^\*[^*]+\*$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>;
    if (/^`[^`]+`$/.test(part))
      return (
        <code key={i} className="rounded bg-surface px-1 py-0.5 font-mono text-[0.85em] text-ink">
          {part.slice(1, -1)}
        </code>
      );
    if (/^https?:\/\//.test(part))
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
          {part}
        </a>
      );
    if (mentionRe) {
      const sub = part.split(mentionRe);
      return (
        <Fragment key={i}>
          {sub.map((s, j) =>
            names.includes(s) ? (
              <span key={j} className="rounded bg-accent-soft px-1 font-medium text-accent">
                @{s}
              </span>
            ) : (
              <Fragment key={j}>{s}</Fragment>
            )
          )}
        </Fragment>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
