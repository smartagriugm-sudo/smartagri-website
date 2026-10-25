// Text edits behind the markdown editor's toolbar and keys. Each function takes
// the text and the current selection and returns the new text and selection,
// so the editor stays a plain textarea (markdown is what gets saved).

export type Edit = { text: string; start: number; end: number };

/** Wrap the selection in a marker (bold, italic, code); toggles it off when already wrapped. */
export function wrap(text: string, start: number, end: number, before: string, after = before, placeholder = "text"): Edit {
  const selected = text.slice(start, end);
  if (text.slice(start - before.length, start) === before && text.slice(end, end + after.length) === after) {
    return {
      text: text.slice(0, start - before.length) + selected + text.slice(end + after.length),
      start: start - before.length,
      end: end - before.length,
    };
  }
  const inner = selected || placeholder;
  return {
    text: text.slice(0, start) + before + inner + after + text.slice(end),
    start: start + before.length,
    end: start + before.length + inner.length,
  };
}

function lineBounds(text: string, start: number, end: number): [number, number] {
  const from = text.lastIndexOf("\n", start - 1) + 1;
  const nl = text.indexOf("\n", end > start && text[end - 1] === "\n" ? end - 1 : end);
  return [from, nl === -1 ? text.length : nl];
}

const PREFIX = /^(#{1,6} |> |- \[[ xX]\] |[-*+] |\d+\. )/;

/**
 * Give every selected line a prefix ("- ", "1. ", "> ", "## ", "- [ ] ").
 * Replaces another list or heading prefix; removes it when all lines have it.
 */
export function prefixLines(text: string, start: number, end: number, prefix: string): Edit {
  const [from, to] = lineBounds(text, start, end);
  const lines = text.slice(from, to).split("\n");
  const numbered = prefix === "1. ";
  const has = (l: string) => (numbered ? /^\d+\. /.test(l) : l.startsWith(prefix));
  const off = lines.every((l) => has(l) || !l.trim());
  const next = lines.map((l, i) => {
    const bare = l.replace(PREFIX, "");
    if (off) return bare;
    if (!l.trim() && lines.length > 1) return l;
    return (numbered ? `${i + 1}. ` : prefix) + bare;
  });
  const block = next.join("\n");
  return { text: text.slice(0, from) + block + text.slice(to), start: from, end: from + block.length };
}

/** Insert a block (code fence, table, divider) on its own lines at the caret. */
export function insertBlock(text: string, start: number, end: number, block: string, selectFrom = 0, selectLength = 0): Edit {
  const before = text.slice(0, start);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const after = text.slice(end);
  const tail = after === "" || after.startsWith("\n") ? "" : "\n\n";
  const at = start + lead.length;
  return {
    text: before + lead + block + tail + after,
    start: at + selectFrom,
    end: at + selectFrom + selectLength,
  };
}

/** Markdown link around the selection: [text](url). */
export function link(text: string, start: number, end: number, url = "https://", image = false): Edit {
  const label = text.slice(start, end) || (image ? "image" : "link text");
  const md = `${image ? "!" : ""}[${label}](${url})`;
  const urlAt = start + md.length - url.length - 1;
  return { text: text.slice(0, start) + md + text.slice(end), start: urlAt, end: urlAt + url.length };
}

/**
 * Enter inside a list item continues the list ("- ", "1. ", "- [ ] ", "> ").
 * Enter on an empty item ends the list. Returns null when not in a list.
 */
export function continueList(text: string, caret: number): Edit | null {
  const from = text.lastIndexOf("\n", caret - 1) + 1;
  const line = text.slice(from, caret);
  const m = /^(\s*)(- \[[ xX]\] |[-*+] |(\d+)\. |> )/.exec(line);
  if (!m) return null;
  if (line.trim() === m[2].trim()) {
    // Empty item: remove the marker and stop the list.
    return { text: text.slice(0, from) + text.slice(caret), start: from, end: from };
  }
  let marker = m[2];
  if (m[3]) marker = `${Number(m[3]) + 1}. `;
  else if (/^- \[[xX]\] $/.test(marker)) marker = "- [ ] ";
  const insert = `\n${m[1]}${marker}`;
  const at = caret + insert.length;
  return { text: text.slice(0, caret) + insert + text.slice(caret), start: at, end: at };
}
