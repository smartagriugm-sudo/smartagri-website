import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { A } from "../lib/assets";
import { accent, body, display } from "../lib/fonts";
import {
  GUEST_ROLES,
  guestbookEnabled,
  submitGuestbook,
  type GuestbookInput,
} from "../lib/guestbook";

export const Route = createFileRoute("/guestbook")({
  component: GuestbookPage,
  head: () => ({
    meta: [
      { title: "Guest book | smartagri" },
      {
        name: "description",
        content:
          "Sign the smartagri guest book at INAGRITECH 2026. Leave your details and we will keep in touch.",
      },
    ],
  }),
});

const EMPTY: GuestbookInput = {
  name: "",
  institution: "",
  role: "",
  email: "",
  whatsapp: "",
};

const inputClass =
  "w-full rounded-xl border border-[#0B6477]/20 bg-white px-4 py-3 text-base text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/25 transition-colors";
const labelClass = "text-sm font-medium text-neutral-700";

function GuestbookPage() {
  const [form, setForm] = useState<GuestbookInput>(EMPTY);
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  const configured = guestbookEnabled();

  // Kiosk mode: after a successful sign, reset for the next visitor.
  useEffect(() => {
    if (status !== "done") return;
    const t = setTimeout(() => {
      setForm(EMPTY);
      setStatus("idle");
    }, 6000);
    return () => clearTimeout(t);
  }, [status]);

  const set = (key: keyof GuestbookInput) => (v: string) =>
    setForm((f) => ({ ...f, [key]: v }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "saving") return;
    setError(null);

    if (!form.name.trim()) {
      setError("Please enter your name.");
      return;
    }

    setStatus("saving");
    const res = await submitGuestbook(form);
    if (res.ok) {
      setStatus("done");
    } else {
      setError(res.error);
      setStatus("idle");
    }
  }

  return (
    <main
      className="relative min-h-dvh w-full overflow-hidden"
      style={{
        backgroundColor: "#0B4A52",
        backgroundImage:
          "radial-gradient(120% 90% at 85% 0%, #80ED99 0%, #45DFB1 16%, #0AD1C8 36%, #14919B 56%, #0B6477 74%, #08313A 100%)",
      }}
    >
      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[560px] flex-col px-6 pb-10 pt-12 sm:pt-16">
        <a
          href="/exhibition"
          className="mb-6 inline-flex items-center gap-1.5 self-start text-sm text-white/70 hover:text-white transition-colors"
          style={body}
        >
          <ArrowLeft size={15} /> Back to INAGRITECH
        </a>

        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)]">
            <img src={A.iconColor} alt="smartagri" className="h-[64%] w-[64%] object-contain" />
          </div>
          <span
            style={display}
            className="text-[19px] font-semibold tracking-[-0.02em] text-white"
          >
            smartagri
          </span>
        </div>

        <h1
          style={display}
          className="mt-6 text-[30px] font-semibold leading-[1.1] tracking-[-0.03em] text-white sm:text-[34px]"
        >
          Sign our <span style={{ ...accent, color: "#80ED99" }}>guest book</span>
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-white/75" style={body}>
          Thanks for visiting smartagri at INAGRITECH 2026. Leave your details and
          we will keep in touch.
        </p>

        <div className="mt-7 rounded-3xl bg-white p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.5)] sm:p-7">
          {status === "done" ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-4 py-8 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#45DFB1]">
                <Check className="h-7 w-7 text-[#0B2A22]" />
              </div>
              <div>
                <div
                  className="text-xl font-semibold text-neutral-900"
                  style={display}
                >
                  Thank you!
                </div>
                <p className="mt-1 text-sm text-neutral-500" style={body}>
                  Your visit has been recorded. Resetting for the next guest...
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm(EMPTY);
                  setStatus("idle");
                }}
                style={body}
                className="mt-1 h-11 rounded-2xl bg-[#0B6477] px-6 text-sm font-medium text-white hover:bg-[#14919B] transition-colors"
              >
                Sign another
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className={labelClass} style={body} htmlFor="gb-name">
                  Name <span className="text-[#14919B]">*</span>
                </label>
                <input
                  id="gb-name"
                  className={inputClass}
                  style={body}
                  value={form.name}
                  onChange={(e) => set("name")(e.target.value)}
                  placeholder="Your full name"
                  autoComplete="name"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass} style={body} htmlFor="gb-inst">
                  Institution / Company
                </label>
                <input
                  id="gb-inst"
                  className={inputClass}
                  style={body}
                  value={form.institution}
                  onChange={(e) => set("institution")(e.target.value)}
                  placeholder="University, company, or organization"
                  autoComplete="organization"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass} style={body} htmlFor="gb-role">
                  Role
                </label>
                <select
                  id="gb-role"
                  className={inputClass}
                  style={body}
                  value={form.role}
                  onChange={(e) => set("role")(e.target.value)}
                >
                  <option value="">Select one</option>
                  {GUEST_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass} style={body} htmlFor="gb-email">
                    Email
                  </label>
                  <input
                    id="gb-email"
                    type="email"
                    className={inputClass}
                    style={body}
                    value={form.email}
                    onChange={(e) => set("email")(e.target.value)}
                    placeholder="you@email.com"
                    autoComplete="email"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass} style={body} htmlFor="gb-wa">
                    WhatsApp
                  </label>
                  <input
                    id="gb-wa"
                    type="tel"
                    className={inputClass}
                    style={body}
                    value={form.whatsapp}
                    onChange={(e) => set("whatsapp")(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    autoComplete="tel"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600" style={body}>
                  {error}
                </p>
              )}
              {!configured && (
                <p className="text-sm text-amber-600" style={body}>
                  Guest book storage is not configured yet.
                </p>
              )}

              <button
                type="submit"
                disabled={status === "saving" || !configured}
                style={body}
                className="mt-1 flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#45DFB1] text-base font-medium text-[#0B2A22] hover:bg-[#80ED99] transition-colors disabled:opacity-60"
              >
                {status === "saving" ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Sign the guest book"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
