import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth/auth";
import { isAuthConfigured, supabase } from "../../lib/auth/supabase";
import { body, display } from "../../lib/fonts";
import { ErpDataError, accessOf, type ErpAccess } from "../../lib/pf/foundation";
import { Card, Note } from "./ui";

// Pieces shared by the ERP's data pages: loading, the page frame, form controls.

export type Loaded<T> = { data: T | null; error: ErpDataError | null; loading: boolean; reload: () => Promise<void> };

/** Runs `load` after mount and on reload(). A reply older than the latest request is dropped. */
export function useLoad<T>(load: () => Promise<T>, deps: readonly unknown[] = []): Loaded<T> {
  const [state, setState] = useState<{ data: T | null; error: ErpDataError | null; loading: boolean }>({ data: null, error: null, loading: true });
  const latest = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stable = useCallback(load, deps);

  const reload = useCallback(async () => {
    const request = ++latest.current;
    try {
      const data = await stable();
      if (request === latest.current) setState({ data, error: null, loading: false });
    } catch (e) {
      if (request === latest.current) {
        setState((s) => ({ ...s, error: e instanceof ErpDataError ? e : new ErpDataError(e instanceof Error ? e.message : "Terjadi kesalahan"), loading: false }));
      }
    }
  }, [stable]);

  useEffect(() => {
    void reload();
    return () => {
      latest.current++;
    };
  }, [reload]);

  return { ...state, reload };
}

/** What the signed-in person may do. RLS has the last word; this only decides what is offered. */
export function useErpAccess(): ErpAccess {
  const { user, account } = useAuth();
  const userId = user?.id ?? null;
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!supabase || !userId) return;
    let live = true;
    void supabase
      .from("pf_user_role")
      .select("role")
      .eq("profile_id", userId)
      .then(({ data }) => {
        if (live) setRoles((data ?? []).map((r: { role: string }) => r.role));
      });
    return () => {
      live = false;
    };
  }, [userId]);

  const isAdmin = !!account?.isAdmin;
  return useMemo(() => accessOf(roles, isAdmin), [roles, isAdmin]);
}

export function ErpPage({ eyebrow, title, sub, actions, children }: { eyebrow: string; title: string; sub?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <main className="flex-1 px-4 py-5 sm:px-6 lg:py-6">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium tracking-[0.03em] text-[#14919B]" style={body}>{eyebrow}</p>
            <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.03em] text-[#0F2F36]" style={display}>{title}</h1>
            {sub && <p className="mt-1 max-w-[720px] text-[14px] leading-[1.5] text-[#4F6B73]" style={body}>{sub}</p>}
          </div>
          {actions}
        </div>
        {children}
      </div>
    </main>
  );
}

function NotInstalled() {
  return (
    <Card className="p-5">
      <p className="text-[15px] font-medium text-[#0F2F36]">Tabel ERP belum terpasang</p>
      <p className="mt-1 text-[14px] leading-[1.5] text-[#4F6B73]">
        {isAuthConfigured ? (
          <>Jalankan <code className="rounded bg-[#EEF3F4] px-1">web/supabase/pf-foundation.sql</code> di SQL Editor Supabase, lalu muat ulang halaman ini.</>
        ) : (
          "Supabase belum dikonfigurasi di lingkungan ini, jadi data ERP tidak bisa dibaca."
        )}
      </p>
    </Card>
  );
}

/** Spinner, error or not-installed notice until the data is there, then the children. */
export function DataState<T>({ state, children }: { state: Loaded<T>; children: (data: T) => ReactNode }) {
  if (state.data !== null) {
    return (
      <>
        {state.error && <div className="mb-3"><Note tone="warn">{state.error.message}</Note></div>}
        {children(state.data)}
      </>
    );
  }
  if (state.error?.notInstalled) return <NotInstalled />;
  if (state.error) return <Note tone="warn">{state.error.message}</Note>;
  return (
    <div className="flex items-center gap-2 py-10 text-[14px] text-[#4F6B73]">
      <Loader2 className="h-4 w-4 animate-spin text-[#0B6477]" /> Memuat data...
    </div>
  );
}

/** Runs one write at a time and keeps its error message for the form. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Terjadi kesalahan");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, setError, run };
}

const buttonBase = "inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${buttonBase} bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99] ${props.className ?? ""}`}>{children}</button>;
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${buttonBase} border border-[#DCE7E8] bg-white text-[#0F2F36] hover:border-[#14919B] ${props.className ?? ""}`}>{children}</button>;
}

export const inputClass = "w-full rounded-lg border border-[#DCE7E8] bg-white px-3 py-2 text-[14px] text-[#0F2F36] outline-none focus:border-[#14919B] disabled:bg-[#F3F7F7] disabled:text-[#6B8289]";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-[#36525A]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12.5px] text-[#6B8289]">{hint}</span>}
    </label>
  );
}

export function ReadOnlyNote({ who }: { who: string }) {
  return <Note>Anda bisa melihat data ini. Mengubahnya perlu peran {who}.</Note>;
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));
