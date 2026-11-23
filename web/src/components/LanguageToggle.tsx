import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { body } from "../lib/fonts";
import { LANGS, useLang, useSetLang, type Lang } from "../lib/i18n";

const NAMES: Record<Lang, string> = { en: "English", id: "Bahasa Indonesia" };

type Tone = "dark" | "light";

// Header control: a compact globe button showing the current language that
// opens a small menu, styled like the header's Media dropdown.
export default function LanguageMenu({
  tone = "light",
  align = "right",
}: {
  tone?: Tone;
  /** Which edge of the button the menu lines up with. */
  align?: "left" | "right";
}) {
  const lang = useLang();
  const setLang = useSetLang();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const dark = tone === "dark";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={lang === "id" ? "Pilih bahasa" : "Choose language"}
        className={`h-10 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium uppercase tracking-[0.08em] transition-colors ${
          dark ? "text-white/75 hover:text-white hover:bg-white/10" : "text-[#0B2A22]/65 hover:text-[#0B2A22] hover:bg-[#0B6477]/8"
        }`}
        style={body}
      >
        <Globe aria-hidden="true" className="h-4 w-4" />
        {lang}
        <ChevronDown
          aria-hidden="true"
          className={`hidden h-3.5 w-3.5 transition-transform xl:block ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute top-full z-50 pt-3 ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div
            className={`min-w-[200px] rounded-xl border p-2 shadow-xl flex flex-col ${
              dark ? "bg-[#08313A] border-white/10" : "bg-white border-[#0B6477]/12"
            }`}
          >
            {LANGS.map((code) => {
              const active = code === lang;
              return (
                <button
                  key={code}
                  type="button"
                  role="menuitemradio"
                  aria-checked={active}
                  lang={code}
                  onClick={() => {
                    setOpen(false);
                    if (!active) setLang(code);
                  }}
                  className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-[15px] transition-colors ${
                    dark
                      ? "text-white/80 hover:text-white hover:bg-white/10"
                      : "text-[#0B2A22]/75 hover:text-[#0B2A22] hover:bg-[#0B6477]/8"
                  }`}
                  style={body}
                >
                  {NAMES[code]}
                  {active && (
                    <Check
                      aria-hidden="true"
                      className={`h-4 w-4 ${dark ? "text-[#45DFB1]" : "text-[#14919B]"}`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Footer control: both languages spelled out, the active one highlighted.
export function LanguageSwitch({ className = "" }: { className?: string }) {
  const lang = useLang();
  const setLang = useSetLang();
  return (
    <div
      role="group"
      aria-label={lang === "id" ? "Pilih bahasa" : "Choose language"}
      className={`inline-flex items-center gap-1 rounded-lg border border-white/12 bg-white/5 p-1 ${className}`}
      style={body}
    >
      <Globe aria-hidden="true" className="mx-1.5 h-3.5 w-3.5 text-white/45" />
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            lang={code}
            aria-pressed={active}
            onClick={() => !active && setLang(code)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              active
                ? "bg-[#45DFB1] text-[#0B2A22] font-medium"
                : "text-white/60 hover:text-white"
            }`}
          >
            {NAMES[code]}
          </button>
        );
      })}
    </div>
  );
}
