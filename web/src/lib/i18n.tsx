// Two-language site (English and Bahasa Indonesia). The choice lives in a
// cookie, not localStorage, so the server renders the right language on the
// first paint and the choice carries across smart-agri.id subdomains. A visitor
// without the cookie gets Indonesian when their browser asks for it first.
//
// Copy is written next to the component that shows it, as `{ en, id }` pairs:
//   const t = useT();
//   <h2>{t({ en: "Research", id: "Riset" })}</h2>
// Shared data in src/lib keeps its English shape and adds an Indonesian
// overlay; `localize()` merges the overlay in when the language is `id`.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getCookie, getRequestHeader } from "@tanstack/react-start/server";
import { cookieDomainFor } from "./auth/cookie-storage";

export * from "./i18n-core";
import { LANG_COOKIE, langFromAcceptLanguage, parseLang, type Bi, type Lang } from "./i18n-core";
const MAX_AGE_S = 400 * 24 * 60 * 60;

function readCookie(jar: string, name: string): string | null {
  for (const part of jar.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/** The language for this request (server) or this page (browser). */
export const readLang = createIsomorphicFn()
  .server((): Lang => parseLang(getCookie(LANG_COOKIE)) ?? langFromAcceptLanguage(getRequestHeader("accept-language")))
  .client((): Lang => parseLang(readCookie(document.cookie, LANG_COOKIE)) ?? langFromAcceptLanguage(navigator.languages?.join(",") ?? navigator.language));

function writeLangCookie(lang: Lang) {
  const domain = cookieDomainFor(window.location.hostname);
  const secure = window.location.protocol === "https:";
  document.cookie = `${LANG_COOKIE}=${lang}; Path=/; Max-Age=${MAX_AGE_S}; SameSite=Lax${secure ? "; Secure" : ""}${domain ? `; Domain=${domain}` : ""}`;
}

type LangState = { lang: Lang; setLang: (lang: Lang) => void };
const LangContext = createContext<LangState>({ lang: "en", setLang: () => {} });

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setState] = useState<Lang>(initial);
  const router = useRouter();
  const setLang = useCallback(
    (next: Lang) => {
      writeLangCookie(next);
      setState(next);
      document.documentElement.lang = next;
      // Re-run head() so the tab title and meta follow the new language.
      void router.invalidate();
    },
    [router],
  );
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext).lang;
}

export function useSetLang(): (lang: Lang) => void {
  return useContext(LangContext).setLang;
}

/** `t({ en, id })` returns the copy for the current language. */
export function useT(): <T>(copy: Bi<T>) => T {
  const lang = useLang();
  return useCallback(<T,>(copy: Bi<T>) => copy[lang], [lang]);
}
