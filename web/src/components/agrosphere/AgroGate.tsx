import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { A } from "../../lib/assets";
import { accent, body, display } from "../../lib/fonts";
import {
  AGROSPHERE_HOME,
  AGROSPHERE_SIGN_IN,
  accessErrorText,
  agroAppsFor,
  canOpen,
  useAgroAccess,
  type AgroApp,
} from "../../lib/agrosphere";
import { useLang, useT } from "../../lib/i18n";
import AuthGate from "../AuthGate";

// The door of every agrosphere page: signed in (on agrosphere's own sign-in page),
// onboarded and approved (AuthGate), and, when `app` is given, given that dashboard
// (agro_my_apps). Without `app` it only checks the account, which is what the
// launcher needs. Turning away here is a courtesy: Row Level Security still guards
// the data behind every dashboard.
export default function AgroGate({ app, children }: { app?: AgroApp; children: ReactNode }) {
  const t = useT();
  return (
    <AuthGate
      signInPath={AGROSPHERE_SIGN_IN}
      frame={(c) => <AgroFrame>{c}</AgroFrame>}
      checkingText={t({ en: "Checking access...", id: "Memeriksa akses..." })}
      slowText={t({ en: "Slow connection, still trying...", id: "Koneksi lambat, masih mencoba..." })}
    >
      {app ? <AppCheck app={app}>{children}</AppCheck> : children}
    </AuthGate>
  );
}

function AppCheck({ app, children }: { app: AgroApp; children: ReactNode }) {
  const access = useAgroAccess();
  const lang = useLang();
  const t = useT();
  const name = agroAppsFor(lang).find((a) => a.app === app)?.name ?? t({ en: "This dashboard", id: "Dashboard ini" });

  if (access.state === "loading") {
    return (
      <AgroFrame>
        <div className="flex flex-col items-center gap-3 text-neutral-500">
          <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
          <p className="text-sm" style={body}>
            {t({ en: "Checking access...", id: "Memeriksa akses..." })}
          </p>
        </div>
      </AgroFrame>
    );
  }
  if (access.state === "error") {
    return (
      <AgroFrame>
        <Notice
          title={t({ en: "Access could not be", id: "Akses tidak dapat" })}
          accentWord={t({ en: "checked", id: "diperiksa" })}
          text={accessErrorText(access, lang)}
        />
      </AgroFrame>
    );
  }
  if (!canOpen(access, app)) {
    return (
      <AgroFrame>
        <Notice
          title={name}
          accentWord={t({ en: "is not shared", id: "tidak dibagikan" })}
          text={t({
            en: `This account cannot open ${name}. Ask a smartagri lab admin if you need it.`,
            id: `Akun ini tidak dapat membuka ${name}. Minta ke admin lab smartagri jika Anda membutuhkannya.`,
          })}
        />
      </AgroFrame>
    );
  }
  return <>{children}</>;
}

function Notice({ title, accentWord, text }: { title: string; accentWord: string; text: string }) {
  const t = useT();
  return (
    <div className="w-full max-w-[440px] text-center">
      <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#08313A]">
        <Lock className="h-5 w-5 text-[#45DFB1]" />
      </span>
      <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.025em] text-neutral-900" style={display}>
        {title} <span style={accent}>{accentWord}</span>
      </h1>
      <p className="mt-2 text-[15px] leading-[1.5] text-neutral-500" style={body}>
        {text}
      </p>
      <Link
        to={AGROSPHERE_HOME}
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#45DFB1] px-5 py-3 text-[15px] font-medium text-[#0B2A22] transition-colors hover:bg-[#80ED99]"
        style={body}
      >
        <ArrowLeft className="h-4 w-4" />
        {t({ en: "Back to agrosphere", id: "Kembali ke agrosphere" })}
      </Link>
    </div>
  );
}

/** A quiet agrosphere page for waiting and refusals: logo on top, content centred. */
export function AgroFrame({ children }: { children: ReactNode }) {
  const t = useT();
  return (
    <main className="flex min-h-[100dvh] flex-col bg-[#F3F7F6]" style={body}>
      <header className="px-5 py-5 sm:px-8">
        <Link to={AGROSPHERE_HOME} aria-label={t({ en: "agrosphere home", id: "Beranda agrosphere" })} className="inline-block">
          <img src={A.agrosphereLogo} alt="agrosphere" className="h-6 w-auto" />
        </Link>
      </header>
      <section className="flex flex-1 items-center justify-center px-5 pb-16">{children}</section>
    </main>
  );
}
