// Card filter popover for the board bar. The filter itself lives in the URL;
// this panel only edits it through `onChange`.
import { useRef, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { body, display } from "../../lib/fonts";
import {
  EMPTY_FILTER,
  LABEL_COLORS,
  personName,
  type ActivityFilter,
  type CardFilter,
  type DueFilter,
} from "../../lib/kanban";
import { useBoard } from "./board-context";
import { Avatar, useDismiss } from "./parts";
import { useLang, useT, type Bi } from "../../lib/i18n";

const DUE_OPTIONS: { key: DueFilter; label: Bi }[] = [
  { key: "none", label: { en: "No dates", id: "Tanpa tanggal" } },
  { key: "overdue", label: { en: "Overdue", id: "Terlambat" } },
  { key: "day", label: { en: "Due in the next day", id: "Tenggat dalam sehari" } },
  { key: "week", label: { en: "Due in the next week", id: "Tenggat dalam seminggu" } },
  { key: "month", label: { en: "Due in the next month", id: "Tenggat dalam sebulan" } },
];

const ACTIVITY_OPTIONS: { key: ActivityFilter; label: Bi }[] = [
  { key: "1w", label: { en: "Active in the last week", id: "Aktif dalam seminggu terakhir" } },
  { key: "2w", label: { en: "Active in the last two weeks", id: "Aktif dalam dua minggu terakhir" } },
  { key: "4w", label: { en: "Active in the last four weeks", id: "Aktif dalam empat minggu terakhir" } },
  { key: "stale", label: { en: "No activity in the last four weeks", id: "Tanpa aktivitas dalam empat minggu terakhir" } },
];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function Option({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      onClick={onClick}
      className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left text-sm text-neutral-700 hover:bg-[#F3F7F6]"
    >
      <span
        className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${on ? "border-[#14919B] bg-[#14919B] text-white" : "border-neutral-300 bg-white"}`}
      >
        {on && <Check className="h-3 w-3" />}
      </span>
      {children}
    </button>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="mt-4">
      <legend className="mb-1 px-2 text-xs font-medium text-neutral-500">{title}</legend>
      {children}
    </fieldset>
  );
}

export default function FilterPanel({
  open,
  onClose,
  filter,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  filter: CardFilter;
  onChange: (f: CardFilter) => void;
}) {
  const { data, userId } = useBoard();
  const t = useT();
  const lang = useLang();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, onClose);
  if (!open) return null;
  const set = (patch: Partial<CardFilter>) => onChange({ ...filter, ...patch });

  return (
    <div
      ref={ref}
      role="dialog"
      aria-label={t({ en: "Filter cards", id: "Filter kartu" })}
      className="absolute right-0 top-full z-40 mt-2 max-h-[calc(100dvh-180px)] w-[340px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-2xl border border-[#0B6477]/10 bg-white p-4 text-neutral-800 shadow-2xl"
      style={body}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold tracking-[-0.02em]" style={display}>
          Filter
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t({ en: "Close filter", id: "Tutup filter" })}
          className="grid h-8 w-8 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-900/5"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <label className="mt-3 block px-2 text-xs font-medium text-neutral-500">
        {t({ en: "Keyword", id: "Kata kunci" })}
        <input
          autoFocus
          value={filter.q}
          onChange={(e) => set({ q: e.target.value })}
          placeholder={t({ en: "Search titles, descriptions, labels, members", id: "Cari judul, deskripsi, label, anggota" })}
          className="mt-1.5 h-10 w-full rounded-lg border border-[#0B6477]/15 px-3 text-sm text-neutral-800 outline-none placeholder:text-neutral-400 focus:border-[#14919B] focus:ring-2 focus:ring-[#14919B]/20"
        />
      </label>

      <Group title={t({ en: "Members", id: "Anggota" })}>
        <Option on={filter.members.includes("none")} onClick={() => set({ members: toggle(filter.members, "none") })}>
          {t({ en: "No members", id: "Tanpa anggota" })}
        </Option>
        {userId && (
          <Option on={filter.members.includes("me")} onClick={() => set({ members: toggle(filter.members, "me") })}>
            {t({ en: "Cards assigned to me", id: "Kartu untuk saya" })}
          </Option>
        )}
        {data.people
          .filter((p) => p.user_id !== userId)
          .map((p) => (
            <Option
              key={p.user_id}
              on={filter.members.includes(p.user_id)}
              onClick={() => set({ members: toggle(filter.members, p.user_id) })}
            >
              <Avatar person={p} size={22} />
              <span className="truncate">{personName(p, lang)}</span>
            </Option>
          ))}
      </Group>

      <Group title={t({ en: "Card status", id: "Status kartu" })}>
        <Option on={filter.status === "complete"} onClick={() => set({ status: filter.status === "complete" ? "" : "complete" })}>
          {t({ en: "Marked as complete", id: "Ditandai selesai" })}
        </Option>
        <Option
          on={filter.status === "incomplete"}
          onClick={() => set({ status: filter.status === "incomplete" ? "" : "incomplete" })}
        >
          {t({ en: "Not marked as complete", id: "Belum ditandai selesai" })}
        </Option>
      </Group>

      <Group title={t({ en: "Due date", id: "Tenggat" })}>
        {DUE_OPTIONS.map((o) => (
          <Option key={o.key} on={filter.due.includes(o.key)} onClick={() => set({ due: toggle(filter.due, o.key) })}>
            {t(o.label)}
          </Option>
        ))}
      </Group>

      <Group title={t({ en: "Labels", id: "Label" })}>
        <Option on={filter.labels.includes("none")} onClick={() => set({ labels: toggle(filter.labels, "none") })}>
          {t({ en: "No labels", id: "Tanpa label" })}
        </Option>
        {data.labels.map((l) => {
          const c = LABEL_COLORS[l.color] ?? LABEL_COLORS.slate;
          return (
            <Option key={l.id} on={filter.labels.includes(l.id)} onClick={() => set({ labels: toggle(filter.labels, l.id) })}>
              <span
                className="flex h-7 flex-1 items-center rounded-md px-2.5 text-xs font-medium"
                style={{ background: c.hex, color: c.ink }}
              >
                {l.name || <span className="opacity-80">{lang === "id" ? c.nameId : c.name}</span>}
              </span>
            </Option>
          );
        })}
      </Group>

      <Group title={t({ en: "Activity", id: "Aktivitas" })}>
        {ACTIVITY_OPTIONS.map((o) => (
          <Option key={o.key} on={filter.activity === o.key} onClick={() => set({ activity: filter.activity === o.key ? "" : o.key })}>
            {t(o.label)}
          </Option>
        ))}
      </Group>

      <div className="mt-4 flex items-center gap-2 border-t border-[#0B6477]/8 px-2 pt-4">
        <label className="flex items-center gap-2 text-sm text-neutral-600">
          {t({ en: "Match", id: "Cocokkan" })}
          <select
            value={filter.mode}
            onChange={(e) => set({ mode: e.target.value === "all" ? "all" : "any" })}
            className="h-9 rounded-lg border border-[#0B6477]/15 bg-white px-2 text-sm outline-none focus:border-[#14919B]"
          >
            <option value="any">{t({ en: "Any of the filters", id: "Salah satu filter" })}</option>
            <option value="all">{t({ en: "All of the filters", id: "Semua filter" })}</option>
          </select>
        </label>
        <button
          type="button"
          onClick={() => onChange(EMPTY_FILTER)}
          className="ml-auto h-9 rounded-lg px-3 text-sm text-neutral-600 hover:bg-neutral-900/5"
        >
          {t({ en: "Clear all", id: "Hapus semua" })}
        </button>
      </div>
    </div>
  );
}
