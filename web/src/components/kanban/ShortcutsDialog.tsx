// Keyboard shortcut reference, opened with "?" on a board.
import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { body, display } from "../../lib/fonts";
import { useDismiss } from "./parts";
import { useT, type Bi } from "../../lib/i18n";

const GROUPS: { title: Bi; keys: [string[], Bi][] }[] = [
  {
    title: { en: "Board", id: "Board" },
    keys: [
      [["←", "→", "↑", "↓"], { en: "Select a card (also h, l, k, j)", id: "Pilih kartu (juga h, l, k, j)" }],
      [["Enter"], { en: "Open the selected card", id: "Buka kartu terpilih" }],
      [["Space"], {
          en: "Pick up the selected card to move it with the arrows, Space again to drop",
          id: "Angkat kartu terpilih untuk dipindah dengan panah, Space lagi untuk melepas",
        }],
      [[",", "."], { en: "Move the selected card to the list on the left or right", id: "Pindahkan kartu terpilih ke list kiri atau kanan" }],
      [["c"], { en: "Archive the selected or hovered card", id: "Arsipkan kartu terpilih atau yang disorot" }],
      [["f"], { en: "Open the card filter", id: "Buka filter kartu" }],
      [["q"], { en: "Show only cards assigned to me", id: "Tampilkan hanya kartu untuk saya" }],
      [["x"], { en: "Clear all filters", id: "Hapus semua filter" }],
      [["]"], { en: "Open or close the board menu", id: "Buka atau tutup menu board" }],
      [["?"], { en: "Show these shortcuts", id: "Tampilkan pintasan ini" }],
    ],
  },
  {
    title: { en: "Open card", id: "Kartu terbuka" },
    keys: [
      [["←", "→"], { en: "Previous or next card in the same list", id: "Kartu sebelumnya atau berikutnya di list yang sama" }],
      [["t"], { en: "Edit the title", id: "Ubah judul" }],
      [["l"], { en: "Labels", id: "Label" }],
      [["m"], { en: "Members", id: "Anggota" }],
      [["d"], { en: "Dates", id: "Tanggal" }],
      [["-"], { en: "Add a checklist", id: "Tambah checklist" }],
      [["a"], { en: "Attach a file or link", id: "Lampirkan file atau tautan" }],
      [["Space"], { en: "Add or remove yourself", id: "Tambahkan atau keluarkan diri Anda" }],
      [["c"], { en: "Archive the card", id: "Arsipkan kartu" }],
      [["Esc"], { en: "Close the card, a popover or an editor", id: "Tutup kartu, popover, atau editor" }],
      [["Ctrl", "Enter"], { en: "Save a description or comment", id: "Simpan deskripsi atau komentar" }],
    ],
  },
];

function Key({ children }: { children: string }) {
  return (
    <kbd className="inline-grid h-6 min-w-6 place-items-center rounded-md border border-[#0B6477]/15 bg-[#F3F7F6] px-1.5 text-xs font-medium text-neutral-700">
      {children}
    </kbd>
  );
}

export default function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, open, onClose);
  useEffect(() => {
    if (open) ref.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-[#08313A]/55 p-4 sm:py-14">
      <div
        ref={ref}
        role="dialog"
        data-kanban-shortcuts=""
        aria-modal="true"
        aria-label={t({ en: "Keyboard shortcuts", id: "Pintasan keyboard" })}
        tabIndex={-1}
        className="w-full max-w-[640px] rounded-[24px] bg-white p-6 shadow-2xl outline-none sm:p-8"
        style={body}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-[-0.025em] text-neutral-900" style={display}>
            {t({ en: "Keyboard shortcuts", id: "Pintasan keyboard" })}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t({ en: "Close", id: "Tutup" })}
            className="grid h-9 w-9 place-items-center rounded-lg text-neutral-500 hover:bg-neutral-900/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-neutral-500">{t({ en: "Shortcuts are off while you type in a field.", id: "Pintasan nonaktif saat Anda mengetik di kolom." })}</p>
        <div className="mt-6 grid gap-8 sm:grid-cols-2">
          {GROUPS.map((g) => (
            <section key={g.title.en}>
              <h3 className="text-sm font-semibold text-neutral-900" style={display}>
                {t(g.title)}
              </h3>
              <dl className="mt-3 flex flex-col gap-2.5">
                {g.keys.map(([keys, text]) => (
                  <div key={text.en} className="flex items-start gap-3">
                    <dt className="flex w-24 shrink-0 flex-wrap gap-1">
                      {keys.map((k) => (
                        <Key key={k}>{k}</Key>
                      ))}
                    </dt>
                    <dd className="text-sm leading-snug text-neutral-600">{t(text)}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

// True when a key press belongs to a text field rather than a shortcut.
export function isTyping(e: KeyboardEvent): boolean {
  if (e.ctrlKey || e.metaKey || e.altKey) return true;
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

// "?" on any layout: some keyboards report the key, others only Shift + Slash.
export function isHelpKey(e: KeyboardEvent): boolean {
  return e.key === "?" || (e.shiftKey && e.code === "Slash");
}
