// Pure language helpers, free of React and server imports (tested in i18n.test.ts).
export type Lang = "en" | "id";
export const LANGS: readonly Lang[] = ["en", "id"];
export const LANG_COOKIE = "smartagri_lang";

/** A piece of copy in both languages. */
export type Bi<T = string> = { en: T; id: T };

export function parseLang(value: string | null | undefined): Lang | null {
  return value === "en" || value === "id" ? value : null;
}

/** Indonesian when the browser ranks `id` (or the legacy `in`) above English. */
export function langFromAcceptLanguage(header: string | null | undefined): Lang {
  if (!header) return "en";
  const ranked = header
    .split(",")
    .map((part) => {
      const [tag, ...params] = part.trim().toLowerCase().split(";");
      const q = params.find((p) => p.trim().startsWith("q="));
      return { tag: tag.trim(), q: q ? Number(q.trim().slice(2)) || 0 : 1 };
    })
    .filter((x) => x.tag)
    .sort((a, b) => b.q - a.q);
  for (const { tag } of ranked) {
    const base = tag.split("-")[0];
    if (base === "id" || base === "in") return "id";
    if (base === "en") return "en";
  }
  return "en";
}

export function pick<T>(copy: Bi<T>, lang: Lang): T {
  return copy[lang];
}

/** Merge an Indonesian overlay over English data when the language is `id`. */
export function localize<T extends object>(base: T, overlay: Partial<T> | undefined, lang: Lang): T {
  return lang === "id" && overlay ? { ...base, ...overlay } : base;
}

/** `localize` over a list, with overlays keyed by `key(item)`. */
export function localizeAll<T extends object>(
  list: readonly T[],
  overlays: Record<string, Partial<T>>,
  key: (item: T) => string,
  lang: Lang,
): T[] {
  return lang === "id" ? list.map((item) => localize(item, overlays[key(item)], lang)) : [...list];
}

/** BCP 47 locale for Intl date and number formatting. */
export function localeOf(lang: Lang): string {
  return lang === "id" ? "id-ID" : "en-US";
}

/**
 * The language inside a route's `head()`, read from the root loader:
 *   head: ({ matches }) => { const l = headLang(matches); ... }
 */
export function headLang(matches: ReadonlyArray<{ routeId?: string; loaderData?: unknown }>): Lang {
  const root = matches.find((m) => m.routeId === "__root__");
  return parseLang((root?.loaderData as { lang?: string } | undefined)?.lang) ?? "en";
}
