// Pure planning step for scripts/restructure-kanban.mjs: decides which new
// board, list and labels every card of the imported smartagri board goes to,
// following docs/kanban/rekomendasi-workflow.md. No I/O here, so it is tested
// on its own (kanban-restructure-map.test.mjs).

const DAY = 86400000;
export const STALE_DAYS = 365;

// The five boards, in the order they are created. `lists` run left to right;
// `labels` are added on top of STANDARD_LABELS.
export const TARGET_BOARDS = [
  {
    key: "publikasi",
    name: "Publikasi",
    background: "deep",
    description: "Satu card per naskah, dari ide sampai terbit.",
    lists: ["Ide", "Draft", "Review internal", "Submitted dan review", "Revisi reviewer", "Accepted", "Published"],
  },
  {
    key: "hibah",
    name: "Hibah, Proyek, dan Lomba",
    background: "cyan",
    description: "Satu card per hibah, kerja sama, proyek industri, atau lomba.",
    lists: ["Perlu disortir", "Peluang", "Persiapan proposal", "Diajukan", "Berjalan", "Laporan", "Selesai"],
  },
  {
    key: "library",
    name: "SmartAgri Library",
    background: "slate",
    description: "Rujukan yang jarang berubah: referensi, template, materi belajar, kode, dan konferensi.",
    lists: ["Referensi", "Template dokumen", "Learning", "Code library", "Konferensi"],
  },
  {
    key: "riset",
    name: "Riset Mahasiswa",
    background: "teal",
    description: "Satu card per mahasiswa S1, S2, dan S3: logbook mingguan dan tahapan riset sampai lulus. Tandai jenjang dengan label S1, S2, atau S3.",
    lists: ["Mahasiswa", "Proposal", "Eksperimen", "Analisis dan penulisan", "Sidang", "Revisi", "Lulus"],
    labels: [
      { name: "S1", color: "lime" },
      { name: "S2", color: "cyan" },
      { name: "S3", color: "violet" },
    ],
  },
  {
    key: "assistant",
    name: "SmartAgri Assistant",
    background: "mint",
    description: "Papan kerja harian asisten riset.",
    lists: ["To do", "Dikerjakan", "Review", "Selesai"],
  },
];

// Source list (name, case-insensitive) to board and list. archive:
//   "stale"  archive cards without activity for STALE_DAYS
//   "all"    archive every card (the old archive lists)
//   "never"  keep every card open (library content)
export const LIST_MAP = {
  "RESEARCH PROPOSAL": { board: "riset", list: "Proposal", archive: "stale" },
  EXPERIMENT: { board: "riset", list: "Eksperimen", archive: "stale" },
  "FINAL DEFENSE": { board: "riset", list: "Sidang", archive: "stale" },
  "THESIS REVISION": { board: "riset", list: "Revisi", archive: "stale" },
  "GRADUATE STUDENTS": { board: "riset", list: "Mahasiswa", archive: "stale" },
  "DRAFT PUBLICATION": { board: "publikasi", list: "Draft", archive: "stale" },
  "ON PROGRESS PUBLICATION": { board: "publikasi", list: "Submitted dan review", archive: "stale" },
  PUBLISHED: { board: "publikasi", list: "Published", archive: "never" },
  PROJECT: { board: "hibah", list: "Perlu disortir", archive: "stale" },
  "ARSIP LOMBA/PROJECT": { board: "hibah", list: "Selesai", archive: "all" },
  REFERENCES: { board: "library", list: "Referensi", archive: "never" },
  LEARNING: { board: "library", list: "Learning", archive: "never" },
  "CODE LIBRARY": { board: "library", list: "Code library", archive: "never" },
  CONFERENCES: { board: "library", list: "Konferensi", archive: "never" },
  "ARSIP CONFERENCE": { board: "library", list: "Konferensi", archive: "all" },
};

// Label taxonomy: program, output type, status flags. Every board gets these.
export const STANDARD_LABELS = [
  { name: "RTA Plant Factory", color: "teal" },
  { name: "RTA Plant Motion", color: "green" },
  { name: "RTA KM Presisi", color: "cyan" },
  { name: "FMS", color: "violet" },
  { name: "PIAT", color: "lime" },
  { name: "PKM", color: "orange" },
  { name: "Publikasi", color: "mint" },
  { name: "Butuh review", color: "amber" },
  { name: "Terhambat", color: "red" },
];

// Old label name (case-insensitive) to its new name, or null to drop it.
// Labels not listed keep their name and colour (technical topics such as
// Micro or YOLO), and are added only to the boards whose cards use them.
export const LABEL_RENAME = {
  "RTA - PLANT FACTORY": "RTA Plant Factory",
  "RTA - PLANT MOTION": "RTA Plant Motion",
  "RTA - KM PRESISI": "RTA KM Presisi",
  "FMS PROJECT": "FMS",
  "PIAT PROJECT": "PIAT",
  PKM: "PKM",
  PUBLIKASI: "Publikasi",
  "PUBLICATION PAPER": "Publikasi",
  PROJECT: null, // same as the old list name
  "": null, // colour-only label
};

const norm = (s) => String(s ?? "").trim().toUpperCase();

function time(iso) {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? t : 0;
}

/**
 * @param src   { lists, cards, labels, cardLabels } rows of the source board
 * @param opts  { now: ms, lastActivity: Map<cardId, iso> }
 */
export function planRestructure(src, { now, lastActivity = new Map() }) {
  const listById = new Map(src.lists.map((l) => [l.id, l]));
  const labelById = new Map(src.labels.map((l) => [l.id, l]));
  const unmapped = new Map();
  const stamp = new Date(now).toISOString();

  // Source cards in board order: list position, then card position.
  const ordered = [...src.cards].sort((a, b) => {
    const la = listById.get(a.list_id)?.pos ?? 0;
    const lb = listById.get(b.list_id)?.pos ?? 0;
    return la - lb || a.pos - b.pos;
  });

  const cards = [];
  const perList = new Map();
  for (const c of ordered) {
    const srcList = listById.get(c.list_id);
    const rule = LIST_MAP[norm(srcList?.name)];
    if (!rule) {
      const name = srcList?.name ?? "(missing list)";
      unmapped.set(name, (unmapped.get(name) ?? 0) + 1);
      continue;
    }
    const last = Math.max(time(lastActivity.get(c.id)), time(c.created_at));
    const stale = now - last > STALE_DAYS * DAY;
    let archivedAt = c.archived_at ?? null;
    let reason = archivedAt ? "already" : null;
    if (!archivedAt && (rule.archive === "all" || (rule.archive === "stale" && stale))) {
      archivedAt = stamp;
      reason = rule.archive === "all" ? "archive-list" : "stale";
    }
    const list = rule.list;
    const key = `${rule.board}/${list}`;
    const n = (perList.get(key) ?? 0) + 1;
    perList.set(key, n);
    cards.push({ srcId: c.id, board: rule.board, list, pos: n * 1024, archivedAt, reason });
  }

  // Labels: the standard set, plus kept topic labels where they are used.
  const boardOf = new Map(cards.map((c) => [c.srcId, c.board]));
  const labels = new Map(
    TARGET_BOARDS.map((b) => [b.key, new Map([...STANDARD_LABELS, ...(b.labels ?? [])].map((l) => [norm(l.name), { ...l }]))]),
  );
  const cardLabels = [];
  let dropped = 0;
  for (const cl of src.cardLabels) {
    const board = boardOf.get(cl.card_id);
    const label = labelById.get(cl.label_id);
    if (!board || !label) continue;
    const key = norm(label.name);
    const name = key in LABEL_RENAME ? LABEL_RENAME[key] : label.name.trim();
    if (name === null) {
      dropped += 1;
      continue;
    }
    const set = labels.get(board);
    if (!set.has(norm(name))) set.set(norm(name), { name, color: label.color });
    const pair = `${cl.card_id}|${norm(name)}`;
    if (!cardLabels.some((x) => x.pair === pair)) cardLabels.push({ pair, srcCard: cl.card_id, board, label: set.get(norm(name)).name });
  }

  const boards = TARGET_BOARDS.map((b) => ({
    ...b,
    labels: [...labels.get(b.key).values()],
    open: cards.filter((c) => c.board === b.key && !c.archivedAt).length,
    archived: cards.filter((c) => c.board === b.key && c.archivedAt).length,
  }));

  return {
    boards,
    cards,
    cardLabels: cardLabels.map(({ pair: _pair, ...rest }) => rest),
    droppedLabelUses: dropped,
    unmapped: [...unmapped.entries()].map(([name, count]) => ({ name, count })),
    newlyArchived: {
      stale: cards.filter((c) => c.reason === "stale").length,
      archiveList: cards.filter((c) => c.reason === "archive-list").length,
    },
  };
}

// Header for a comment whose author is not the person running the copy (the
// database only lets you post as yourself). lib/kanban.ts parses it back.
export function commentHeader(author, iso) {
  const date = iso ? new Date(iso).toISOString().slice(0, 10) : null;
  return `_From the original board, by **${author}**${date ? ` on ${date}` : ""}:_\n\n`;
}
