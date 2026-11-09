import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useAuth } from "../../lib/auth/auth";
import { isAuthConfigured, supabase } from "../../lib/auth/supabase";
import { body, display } from "../../lib/fonts";
import { ErpDataError, accessOf, toErpError, type ErpAccess } from "../../lib/pf/foundation";
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
        setState((s) => ({ ...s, error: toErpError(e), loading: false }));
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
    <main className="flex-1 px-3 py-5 print:p-0 md:px-4 lg:py-6">
      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3 print:hidden">
          <div className="min-w-0">
            <p className="text-[13px] font-medium tracking-[0.03em] text-[#0B6477]" style={body}>{eyebrow}</p>
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
      <p className="text-[15px] font-medium text-[#0F2F36]">ERP tables are not installed yet</p>
      <p className="mt-1 text-[14px] leading-[1.5] text-[#4F6B73]">
        {isAuthConfigured ? (
          <>Run the ERP SQL files from the folder <code className="rounded bg-[#EEF3F4] px-1">web/supabase/</code> in the Supabase SQL Editor (<code className="rounded bg-[#EEF3F4] px-1">pf-foundation.sql</code>, <code className="rounded bg-[#EEF3F4] px-1">pf-batch.sql</code>, <code className="rounded bg-[#EEF3F4] px-1">pf-monitoring.sql</code>, <code className="rounded bg-[#EEF3F4] px-1">pf-sales.sql</code>, <code className="rounded bg-[#EEF3F4] px-1">pf-inventory.sql</code>, <code className="rounded bg-[#EEF3F4] px-1">pf-hr.sql</code>, then <code className="rounded bg-[#EEF3F4] px-1">pf-cost.sql</code>, <code className="rounded bg-[#EEF3F4] px-1">pf-profile-media.sql</code>), then reload this page.</>
        ) : (
          "Supabase is not configured in this environment, so ERP data cannot be read."
        )}
      </p>
    </Card>
  );
}

/** The client retries a failed read for up to about 18 seconds, so a long wait gets a word of its own. */
export const SLOW_TEXT = "Slow connection, still trying…";

export function useSlow(waiting: boolean, afterMs = 6000) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const t = window.setTimeout(() => setSlow(true), afterMs);
    return () => {
      window.clearTimeout(t);
      setSlow(false);
    };
  }, [waiting, afterMs]);
  return slow;
}

/** What failed, inside the block that failed, with the way to try again. */
export function ErrorNote({ message, onRetry }: { message: string; onRetry: () => Promise<unknown> }) {
  const [busy, setBusy] = useState(false);
  const retry = async () => {
    setBusy(true);
    try {
      await onRetry();
    } finally {
      setBusy(false);
    }
  };
  return (
    <div role="alert" className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-lg bg-[#FFF6E5] px-3 py-2 text-[13px] text-[#8A5A07]">
      <span className="min-w-0">{message}</span>
      <button type="button" disabled={busy} onClick={() => void retry()} className="whitespace-nowrap font-medium text-[#0F2F36] underline disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? "Connecting…" : "Try again"}
      </button>
    </div>
  );
}

function LoadingNote() {
  const slow = useSlow(true);
  return (
    <div className="flex items-center gap-2 py-10 text-[14px] text-[#4F6B73]">
      <Loader2 className="h-4 w-4 animate-spin text-[#0B6477]" /> {slow ? SLOW_TEXT : "Loading data…"}
    </div>
  );
}

/** Spinner, error or not-installed notice until the data is there, then the children. */
export function DataState<T>({ state, children }: { state: Loaded<T>; children: (data: T) => ReactNode }) {
  if (state.data !== null) {
    return (
      <>
        {state.error && <div className="mb-3"><ErrorNote message={state.error.message} onRetry={state.reload} /></div>}
        {children(state.data)}
      </>
    );
  }
  if (state.error?.notInstalled) return <NotInstalled />;
  if (state.error) return <ErrorNote message={state.error.message} onRetry={state.reload} />;
  return <LoadingNote />;
}

/** Runs one write at a time and keeps its error message for the form. */
export function useAction() {
  const [busy, setBusy] = useState(false);
  const [error, setErrorState] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const setError = useCallback((message: string | null) => {
    setSaved(false);
    setErrorState(message);
  }, []);
  useEffect(() => {
    if (!saved) return;
    const t = window.setTimeout(() => setSaved(false), 4000);
    return () => window.clearTimeout(t);
  }, [saved]);
  const run = useCallback(async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      setSaved(true);
      return true;
    } catch (e) {
      setError(toErpError(e).message);
      return false;
    } finally {
      setBusy(false);
    }
  }, [setError]);
  return { busy, error, saved, setError, run };
}

/** A form's answer: why it failed, or for a few seconds that it saved. */
export function ActionNote({ action }: { action: { error: string | null; saved: boolean } }) {
  if (action.error) return <Note tone="warn">{action.error}</Note>;
  if (action.saved) return <p role="status" className="text-[13px] font-medium text-[#0E7A5C]">Saved</p>;
  return null;
}

const buttonBase = "inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-[14px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-0";

export function PrimaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${buttonBase} bg-[#45DFB1] text-[#0B2A22] hover:bg-[#80ED99] ${props.className ?? ""}`}>{children}</button>;
}

export function SecondaryButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className={`${buttonBase} border border-[#DCE7E8] bg-white text-[#0F2F36] hover:border-[#14919B] ${props.className ?? ""}`}>{children}</button>;
}

// 16px on a phone: iOS Safari zooms the page into any smaller field.
export const inputClass = "w-full rounded-lg border border-[#C9D8DA] bg-white px-3 py-2 text-[16px] text-[#0F2F36] focus:border-[#0B6477] disabled:bg-[#F3F7F7] disabled:text-[#4F6B73] sm:text-[14px]";

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[13px] font-medium text-[#36525A]">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[12.5px] text-[#4F6B73]">{hint}</span>}
    </label>
  );
}

export function ReadOnlyNote({ who }: { who: string }) {
  return <Note>You can see this data. Changing it needs the role {who}.</Note>;
}

export const formatDateTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(iso));
