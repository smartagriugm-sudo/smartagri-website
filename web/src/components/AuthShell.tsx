import type { InputHTMLAttributes, ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChevronLeft, type LucideIcon } from "lucide-react";
import { A } from "../lib/assets";
import GrowthPrism from "./GrowthPrism";
import AgrosphereMark from "./AgrosphereMark";
import { accent, body, display } from "../lib/fonts";
import { useT } from "../lib/i18n";

// Split layout for sign in and sign up: a calm brand panel on the left, the form
// on the right. Below lg the brand panel is hidden and the logo sits above the
// form. Two brands share it: smartagri (a stem turning into circuits through the
// smartagri mark) and agrosphere (the agrosphere mark locking together, with
// rounded frames rippling out), see docs/agrosphere/RENCANA-AGROSPHERE.md.

export type AuthBrand = "smartagri" | "agrosphere";

const BRANDS = {
  smartagri: {
    logo: A.logoColor,
    name: "smartagri",
    home: { label: { en: "Home", id: "Beranda" } },
    eyebrow: { en: "Smart Agriculture Research Center UGM", id: "Smart Agriculture Research Center UGM" },
    // Brand taglines stay in English in both languages.
    tagline: ["Sense.", "Analyze.", "Grow."],
    statement: {
      en: "We sense the field with IoT and imaging, analyze it with AI and data, and turn readings into decisions for healthier, more sustainable harvests.",
      id: "Kami memantau lahan dengan IoT dan pencitraan, menganalisisnya dengan AI dan data, lalu mengubah hasil pengukuran menjadi keputusan untuk panen yang lebih sehat dan berkelanjutan.",
    },
  },
  agrosphere: {
    logo: A.agrosphereLogo,
    name: "agrosphere",
    home: { label: { en: "smartagri", id: "smartagri" } },
    eyebrow: { en: "by smartagri", id: "oleh smartagri" },
    tagline: ["Monitor.", "Manage.", "Grow."],
    statement: {
      en: "One place for the plant factory and the greenhouse sites: live readings, daily operations and the people who run them, each opened to the accounts given access.",
      id: "Satu tempat untuk plant factory dan lokasi greenhouse: pembacaan langsung, operasional harian, dan orang-orang yang menjalankannya, masing-masing terbuka bagi akun yang diberi akses.",
    },
  },
} as const;

const EASE = [0.22, 1, 0.36, 1] as const;

export default function AuthShell({
  title,
  accentWord,
  subtitle,
  children,
  footer,
  brand = "smartagri",
}: {
  brand?: AuthBrand;
  title: string;
  accentWord?: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  return (
    <main className="min-h-[100dvh] bg-[#E9F0EE] lg:p-3" style={body}>
      <div className="grid min-h-[100dvh] bg-white lg:min-h-[calc(100dvh-1.5rem)] lg:grid-cols-2 lg:overflow-hidden lg:rounded-[28px] lg:shadow-[0_1px_2px_rgba(8,49,58,0.06),0_24px_60px_-30px_rgba(8,49,58,0.25)]">
        <BrandPanel brand={brand} />
        <section className="relative flex flex-col px-5 pb-10 pt-5 sm:px-10 lg:px-14 lg:pt-10">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_80%_10%,rgba(69,223,177,0.10),transparent_70%),radial-gradient(50%_40%_at_10%_100%,rgba(10,209,200,0.07),transparent_70%)]"
          />
          <div className="relative flex items-center justify-between">
            <Link
              to="/"
              className="inline-flex items-center gap-1 rounded-lg py-1.5 pr-2 text-sm font-medium text-neutral-800 transition-colors hover:text-[#0B6477]"
            >
              <ChevronLeft className="h-4 w-4" />
              {t(BRANDS[brand].home.label)}
            </Link>
            <img src={BRANDS[brand].logo} alt={BRANDS[brand].name} className="h-6 w-auto lg:hidden" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: EASE, delay: 0.1 }}
            className="relative mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12"
          >
            <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.03em] text-neutral-900 sm:text-[32px]" style={display}>
              {title} {accentWord && <span style={accent}>{accentWord}</span>}
            </h1>
            <p className="mt-2 text-[15px] leading-relaxed text-neutral-500">{subtitle}</p>
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-8 text-sm text-neutral-500">{footer}</div>}
          </motion.div>
        </section>
      </div>
    </main>
  );
}

function BrandPanel({ brand }: { brand: AuthBrand }) {
  const t = useT();
  const b = BRANDS[brand];
  return (
    <aside className="relative hidden overflow-hidden border-r border-[#0B6477]/8 bg-[#F7FAF9] lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* The brand's illustration, faded towards the text so the logo and
          statement stay quiet. */}
      {brand === "agrosphere" ? <AgrosphereMark /> : <GrowthPrism />}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#F7FAF9_0%,rgba(247,250,249,0)_14%,rgba(247,250,249,0)_62%,#F7FAF9_90%)]"
      />
      <Link to="/" aria-label={t({ en: `${b.name} home`, id: `Beranda ${b.name}` })} className="relative z-10 w-fit">
        <img src={b.logo} alt={b.name} className="h-7 w-auto" />
      </Link>
      <div className="relative z-10 max-w-[480px]">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-[13px] font-medium tracking-[0.03em] text-[#14919B]"
        >
          {t(b.eyebrow)}
        </motion.p>
        <h2 className="mt-3 text-[44px] font-semibold leading-[1.02] tracking-[-0.04em] text-neutral-900" style={display}>
          {b.tagline.map((w, i) => (
            <motion.span
              key={w}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.15, duration: 0.6 }}
              className="mr-[0.25em] inline-block"
              style={i === 2 ? accent : undefined}
            >
              {w}
            </motion.span>
          ))}
        </h2>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.55, ease: EASE }}
          className="mt-4 text-[17px] leading-relaxed text-neutral-600"
        >
          {t(b.statement)}
        </motion.p>
      </div>
    </aside>
  );
}

// Input with a leading icon, shared by the auth forms.
export function AuthInput({ icon: Icon, label, ...rest }: { icon: LucideIcon; label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-medium text-neutral-600">{label}</span>
      <span className="relative block">
        <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden="true" />
        <input
          {...rest}
          className="w-full rounded-xl border border-[#0B6477]/15 bg-white py-3 pl-10 pr-3.5 text-[15px] text-neutral-800 outline-none transition-[border-color,box-shadow] placeholder:text-neutral-400 focus:border-[#14919B] focus:shadow-[0_0_0_4px_rgba(69,223,177,0.18)]"
        />
      </span>
    </label>
  );
}

export const AUTH_BUTTON =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#45DFB1] px-5 py-3 text-[15px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99] disabled:cursor-not-allowed disabled:opacity-60";
