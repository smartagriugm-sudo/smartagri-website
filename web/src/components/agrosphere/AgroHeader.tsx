import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Loader2, LogOut } from "lucide-react";
import { A } from "../../lib/assets";
import { useAuth } from "../../lib/auth/auth";
import { AGROSPHERE_HOME, AGROSPHERE_SIGN_IN } from "../../lib/agrosphere";
import { useT, type Bi } from "../../lib/i18n";
import LanguageMenu from "../LanguageToggle";

// The bar on top of agrosphere's own pages: the mark, and for a lab admin the
// two places they move between (the dashboards and who may open them), then the
// account, the language and sign out.
const LINKS: { to: "/agrosphere" | "/agrosphere/settings/access"; label: Bi }[] = [
  { to: "/agrosphere", label: { en: "Dashboards", id: "Dashboard" } },
  { to: "/agrosphere/settings/access", label: { en: "Access", id: "Akses" } },
];

export default function AgroHeader() {
  const { account, user, signOut } = useAuth();
  const t = useT();
  const pathname = useRouterState({ select: (s) => s.location.pathname.replace(/\/$/, "") });
  const [leaving, setLeaving] = useState(false);
  const name = account?.name || user?.email?.split("@")[0] || "";
  const initial = (name[0] ?? "?").toUpperCase();

  const leave = async () => {
    setLeaving(true);
    await signOut();
    window.location.assign(AGROSPHERE_SIGN_IN);
  };

  return (
    <header className="mx-auto flex w-full max-w-[1200px] items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-4 sm:gap-8">
        <Link to={AGROSPHERE_HOME} aria-label={t({ en: "agrosphere, your dashboards", id: "agrosphere, dashboard Anda" })} className="shrink-0">
          <img src={A.agrosphereLogo} alt="agrosphere" className="h-6 w-auto sm:h-7" />
        </Link>
        {account?.isAdmin && (
          <nav className="flex items-center gap-1" aria-label="agrosphere">
            {LINKS.map((l) => {
              const active = pathname === l.to;
              return (
                <Link
                  key={l.to}
                  to={l.to}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex min-h-[40px] items-center rounded-full px-3 text-[14px] font-medium transition-colors ${
                    active ? "bg-white text-[#0B6477]" : "text-neutral-500 hover:bg-white/70 hover:text-[#0B6477]"
                  }`}
                >
                  {t(l.label)}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
        <LanguageMenu tone="light" align="right" />
        {user && (
          <>
            <Link
              to="/account"
              className="flex min-h-[44px] items-center gap-2 rounded-full py-1 pl-1 pr-1 text-sm font-medium text-neutral-700 transition-colors hover:bg-white sm:pr-3"
            >
              {account?.avatarUrl ? (
                <img src={account.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#08313A] text-[13px] font-medium text-[#45DFB1]">
                  {initial}
                </span>
              )}
              <span className="hidden max-w-[180px] truncate md:inline">{name}</span>
            </Link>
            <button
              type="button"
              onClick={() => void leave()}
              disabled={leaving}
              aria-label={t({ en: "Sign out", id: "Keluar" })}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full px-3 text-sm font-medium text-neutral-600 transition-colors hover:bg-white hover:text-[#0B6477] active:scale-[0.97] disabled:opacity-60"
            >
              {leaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              <span className="hidden md:inline">{t({ en: "Sign out", id: "Keluar" })}</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
