import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Download, Loader2, Users } from "lucide-react";
import { accent, body, display } from "../lib/fonts";
import SiteHeader from "../components/SiteHeader";
import { useAuth } from "../lib/auth/auth";
import {
  fetchGuestbook,
  guestbookEnabled,
  toCsv,
  type GuestbookEntry,
} from "../lib/guestbook";

export const Route = createFileRoute("/guestbook_/admin")({
  component: GuestbookAdminPage,
  head: () => ({
    meta: [
      { title: "Guest book entries | smartagri" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

function GuestbookAdminPage() {
  const { user, loading: authLoading, isConfigured } = useAuth();
  const router = useRouter();

  const blocked = isConfigured && !authLoading && !user;
  useEffect(() => {
    if (blocked) {
      const here = router.state.location.pathname;
      window.location.assign(`/sign-in?redirect=${encodeURIComponent(here)}`);
    }
  }, [blocked, router]);

  if (isConfigured && (authLoading || !user)) {
    return (
      <main>
        <SiteHeader />
        <section className="flex min-h-[calc(100vh-76px)] items-center justify-center bg-[#F3F7F6]">
          <div className="flex flex-col items-center gap-3 text-neutral-500">
            <Loader2 className="h-6 w-6 animate-spin text-[#0B6477]" />
            <p className="text-sm" style={body}>
              {authLoading ? "Checking access..." : "Redirecting to sign in..."}
            </p>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <SiteHeader />
      <AdminContent />
    </main>
  );
}

function AdminContent() {
  const [rows, setRows] = useState<GuestbookEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    if (!guestbookEnabled()) {
      setError("Guest book storage is not configured.");
      setLoading(false);
      return;
    }

    fetchGuestbook()
      .then((data) => {
        if (active) setRows(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function downloadCsv() {
    if (!rows || rows.length === 0) return;
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "smartagri-guestbook.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="bg-[#F3F7F6]">
      <div className="mx-auto max-w-[1100px] px-6 py-14 md:px-10 md:py-20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <a
              href="/exhibition"
              className="mb-3 inline-flex items-center gap-1.5 text-sm text-[#0B6477] hover:text-[#14919B]"
              style={body}
            >
              <ArrowLeft size={15} /> Back to INAGRITECH
            </a>
            <h1
              style={display}
              className="text-[30px] font-semibold tracking-[-0.03em] text-neutral-900 md:text-[38px]"
            >
              Guest book <span style={accent}>entries</span>
            </h1>
            <p className="mt-1.5 text-[15px] text-neutral-500" style={body}>
              Visitors who signed at the INAGRITECH 2026 booth.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadCsv}
            disabled={!rows || rows.length === 0}
            style={body}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-[#0B6477] px-5 text-sm font-medium text-white hover:bg-[#14919B] transition-colors disabled:opacity-50"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>

        {/* Count */}
        <div className="mt-8 inline-flex items-center gap-2.5 rounded-2xl border border-[#0B6477]/12 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(11,100,119,0.04)]">
          <Users size={18} className="text-[#14919B]" />
          <span
            className="text-[28px] font-semibold tabular-nums text-neutral-900"
            style={display}
          >
            {rows ? rows.length.toLocaleString() : "-"}
          </span>
          <span className="text-sm text-neutral-500" style={body}>
            total visitors
          </span>
        </div>

        {/* Body */}
        {loading ? (
          <div className="mt-12 flex items-center justify-center gap-3 text-neutral-500">
            <Loader2 className="h-5 w-5 animate-spin text-[#0B6477]" />
            <span className="text-sm" style={body}>
              Loading entries...
            </span>
          </div>
        ) : error ? (
          <div
            className="mt-10 rounded-2xl border border-amber-300/60 bg-amber-50 px-5 py-4 text-sm text-amber-800"
            style={body}
          >
            Could not load entries: {error}
          </div>
        ) : rows && rows.length > 0 ? (
          <GuestTable rows={rows} />
        ) : (
          <p className="mt-10 text-sm text-neutral-400" style={body}>
            No one has signed the guest book yet.
          </p>
        )}
      </div>
    </section>
  );
}

function GuestTable({ rows }: { rows: GuestbookEntry[] }) {
  const fmt = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      }),
    [],
  );

  return (
    <div className="mt-6 overflow-x-auto rounded-2xl border border-[#0B6477]/12 bg-white shadow-[0_1px_2px_rgba(11,100,119,0.04)]">
      <table className="w-full min-w-[720px] text-left text-sm" style={body}>
        <thead>
          <tr className="border-b border-[#0B6477]/10 text-[12px] uppercase tracking-[0.06em] text-neutral-500">
            <th className="px-4 py-3 font-medium">Time</th>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Institution</th>
            <th className="px-4 py-3 font-medium">Role</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">WhatsApp</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.id}
              className="border-b border-[#0B6477]/6 last:border-0 hover:bg-[#F3F7F6]/60"
            >
              <td className="whitespace-nowrap px-4 py-3 text-neutral-500 tabular-nums">
                {fmt.format(new Date(r.created_at))}
              </td>
              <td className="px-4 py-3 font-medium text-neutral-900">{r.name}</td>
              <td className="px-4 py-3 text-neutral-700">{r.institution || "-"}</td>
              <td className="px-4 py-3 text-neutral-700">{r.role || "-"}</td>
              <td className="px-4 py-3 text-neutral-700">
                {r.email ? (
                  <a
                    href={`mailto:${r.email}`}
                    className="text-[#0B6477] hover:underline"
                  >
                    {r.email}
                  </a>
                ) : (
                  "-"
                )}
              </td>
              <td className="px-4 py-3 text-neutral-700">{r.whatsapp || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
