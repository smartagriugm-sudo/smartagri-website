// Pure mapping from a Trello board export (Board menu > Print, export, and
// share > Export as JSON) to the rows of web/supabase/kanban.sql. No network:
// scripts/import-trello.mjs does the writing. Field names follow Trello's
// public REST model (board, lists, cards, labels, checklists, actions).

// Trello label colours (incl. _dark/_light variants) -> our LABEL_COLORS keys.
const LABEL_COLOR = {
  green: "green",
  yellow: "amber",
  orange: "orange",
  red: "red",
  purple: "violet",
  blue: "teal",
  sky: "cyan",
  lime: "lime",
  pink: "red",
  black: "slate",
};

export function mapLabelColor(color) {
  if (!color) return "slate";
  return LABEL_COLOR[String(color).replace(/_(dark|light)$/, "")] ?? "slate";
}

// Trello board background colour -> our BOARD_BACKGROUNDS keys.
export function mapBackground(bg) {
  const c = String(bg ?? "");
  if (c === "blue" || c === "sky") return "cyan";
  if (c === "green" || c === "lime") return "mint";
  if (c === "grey" || c === "black") return "slate";
  return "teal";
}

// A Trello id starts with the creation time as 8 hex digits of Unix seconds.
export function trelloIdDate(id) {
  const secs = parseInt(String(id).slice(0, 8), 16);
  return Number.isFinite(secs) && secs > 0 ? new Date(secs * 1000).toISOString() : null;
}

function byTrelloPos(a, b) {
  return (Number(a.pos) || 0) - (Number(b.pos) || 0);
}

// Renumber to 1024, 2048, ... in Trello's order (their positions can be huge).
function positions(rows) {
  return new Map([...rows].sort(byTrelloPos).map((r, i) => [r.id, (i + 1) * 1024]));
}

/**
 * @param {any} json  Parsed Trello export.
 * @param {{ memberMap?: Record<string, string>, newId?: () => string, includeComments?: boolean, includeTrelloFiles?: boolean }} [opts]
 *   memberMap: Trello username or full name -> smartagri account email.
 *   includeTrelloFiles: also keep files uploaded to Trello as links (they only
 *   open for someone logged in to Trello, so they are left out by default).
 *   coversFromApi: image covers will be downloaded through the Trello API, so
 *   they are listed in `covers` instead of being reported as missing.
 *   completeComments: the comment actions were fetched in full through the
 *   API, so the export's 1000-action limit no longer applies.
 */
export function mapTrelloBoard(json, opts = {}) {
  const newId = opts.newId ?? (() => crypto.randomUUID());
  const memberMap = opts.memberMap ?? {};
  const warnings = [];
  if (!json || !Array.isArray(json.lists) || !Array.isArray(json.cards)) {
    throw new Error("This does not look like a Trello board export (no lists or cards).");
  }

  const board = {
    name: String(json.name || "Imported board").slice(0, 200),
    description: String(json.desc || ""),
    background: mapBackground(json.prefs?.background),
  };

  // Labels
  const labelId = new Map();
  const labels = (json.labels ?? []).map((l) => {
    const id = newId();
    labelId.set(l.id, id);
    return { id, name: String(l.name || "").slice(0, 40), color: mapLabelColor(l.color) };
  });

  // Lists
  const listId = new Map();
  const listPos = positions(json.lists);
  const lists = json.lists.map((l) => {
    const id = newId();
    listId.set(l.id, id);
    return {
      id,
      name: String(l.name || "Untitled list").trim() || "Untitled list",
      pos: listPos.get(l.id),
      archived_at: l.closed ? new Date().toISOString() : null,
    };
  });

  // Members: Trello id -> email, through the username or the full name.
  const memberEmail = new Map();
  const unmapped = new Set();
  for (const m of json.members ?? []) {
    const email = memberMap[m.username] ?? memberMap[m.fullName];
    if (email) memberEmail.set(m.id, String(email).trim().toLowerCase());
    else unmapped.add(m.fullName || m.username || m.id);
  }

  // Cards, numbered in Trello's order (idShort) so card numbers stay familiar.
  const cardId = new Map();
  const cardPosByList = new Map();
  for (const [tid] of listId) {
    cardPosByList.set(tid, positions(json.cards.filter((c) => c.idList === tid)));
  }
  const cards = [];
  const cardLabels = [];
  const cardMembers = [];
  let skippedCards = 0;
  // Image covers: the Trello attachment to fetch, per imported card.
  const covers = [];
  for (const c of [...json.cards].sort((a, b) => (a.idShort ?? 0) - (b.idShort ?? 0))) {
    const list = listId.get(c.idList);
    if (!list) {
      skippedCards += 1;
      continue;
    }
    const id = newId();
    cardId.set(c.id, id);
    const coverColor = c.cover?.color ? mapLabelColor(c.cover.color) : null;
    if (c.cover?.idAttachment) {
      const att = (c.attachments ?? []).find((a) => a.id === c.cover.idAttachment);
      if (att?.url) {
        covers.push({
          card_id: id,
          trello_card_id: c.id,
          attachment: {
            id: att.id,
            name: String(att.name || att.fileName || "cover"),
            url: att.url,
            mimeType: att.mimeType || null,
            previews: (att.previews ?? []).map((p) => ({ url: p.url, width: p.width, height: p.height })),
          },
        });
      }
    }
    cards.push({
      id,
      list_id: list,
      title: String(c.name || "Untitled card").trim() || "Untitled card",
      description: String(c.desc || ""),
      pos: cardPosByList.get(c.idList)?.get(c.id) ?? 1024,
      start_at: c.start ?? null,
      due_at: c.due ?? null,
      due_complete: !!c.dueComplete,
      cover_color: coverColor,
      created_at: trelloIdDate(c.id),
      archived_at: c.closed ? (c.dateLastActivity ?? new Date().toISOString()) : null,
    });
    for (const l of c.idLabels ?? []) {
      if (labelId.has(l)) cardLabels.push({ card_id: id, label_id: labelId.get(l) });
    }
    for (const m of c.idMembers ?? []) {
      if (memberEmail.has(m)) cardMembers.push({ card_id: id, email: memberEmail.get(m) });
    }
  }

  // Checklists and items
  const checklists = [];
  const items = [];
  for (const cl of json.checklists ?? []) {
    const card = cardId.get(cl.idCard);
    if (!card) continue;
    const id = newId();
    checklists.push({ id, card_id: card, title: String(cl.name || "Checklist"), pos: Number(cl.pos) || 0 });
    const itemPos = positions(cl.checkItems ?? []);
    for (const it of cl.checkItems ?? []) {
      const text = String(it.name || "").trim();
      if (!text) continue;
      items.push({
        id: newId(),
        checklist_id: id,
        text,
        pos: itemPos.get(it.id),
        done: it.state === "complete",
        due_at: it.due ?? null,
      });
    }
  }
  // Checklist positions per card, renumbered the same way.
  for (const rows of groupBy(checklists, (c) => c.card_id).values()) {
    const pos = positions(rows);
    for (const r of rows) r.pos = pos.get(r.id);
  }

  // Comments (Trello stores them as actions). Posted by the importer with the
  // original author and date kept in the text and in created_at.
  const comments = [];
  if (opts.includeComments !== false) {
    for (const a of json.actions ?? []) {
      if (a.type !== "commentCard") continue;
      const card = cardId.get(a.data?.card?.id);
      const text = String(a.data?.text ?? "").trim();
      if (!card || !text) continue;
      const who = a.memberCreator?.fullName || a.memberCreator?.username || "a Trello member";
      const when = String(a.date ?? "").slice(0, 10);
      comments.push({
        card_id: card,
        body: `_From Trello, by **${who}**${when ? ` on ${when}` : ""}:_\n\n${text}`,
        created_at: a.date ?? null,
      });
    }
    comments.sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  }

  // Attachments: kept as links. Files uploaded to Trello need a Trello login
  // to open, so by default only links to other sites come across.
  const attachments = [];
  let trelloFiles = 0;
  const coverIds = new Set(opts.coversFromApi ? covers.map((c) => c.attachment.id) : []);
  for (const c of json.cards) {
    const card = cardId.get(c.id);
    if (!card) continue;
    for (const at of c.attachments ?? []) {
      if (!at.url || !/^https?:\/\//.test(at.url)) continue;
      if (coverIds.has(at.id)) continue; // comes in as the stored cover image
      if (isTrelloFile(at) && !opts.includeTrelloFiles) {
        trelloFiles += 1;
        continue;
      }
      attachments.push({
        card_id: card,
        name: String(at.name || at.fileName || at.url).slice(0, 200),
        url: at.url,
        mime_type: at.mimeType || null,
        bytes: Number(at.bytes) || null,
        created_at: at.date ?? null,
      });
    }
  }

  if (unmapped.size) {
    warnings.push(
      `${unmapped.size} Trello member(s) not in the member map, so not assigned to cards: ${[...unmapped].join(", ")}`,
    );
  }
  if (skippedCards) warnings.push(`${skippedCards} card(s) skipped because their list was missing.`);
  if (covers.length && !opts.coversFromApi) {
    warnings.push(
      `${covers.length} image cover(s) not imported: set TRELLO_KEY and TRELLO_TOKEN to fetch them, or re-attach the image on the card.`,
    );
  }
  if (trelloFiles) {
    warnings.push(
      `${trelloFiles} file(s) uploaded to Trello left out (they need a Trello login). Use --include-trello-files to keep them as links.`,
    );
  }
  const actionsTotal = (json.actions ?? []).length;
  if (actionsTotal >= 1000 && !opts.completeComments) {
    warnings.push("The export holds 1000 actions, Trello's limit: older comments may be missing.");
  }

  return {
    board,
    labels,
    lists,
    cards,
    cardLabels,
    cardMembers,
    checklists,
    items,
    comments,
    attachments,
    covers: opts.coversFromApi ? covers : [],
    emails: [...new Set(memberEmail.values())],
    warnings,
  };
}

function isTrelloFile(at) {
  if (at.isUpload) return true;
  try {
    return /(^|\.)trello(usercontent)?\.com$/.test(new URL(at.url).hostname);
  } catch {
    return false;
  }
}

function groupBy(rows, key) {
  const m = new Map();
  for (const r of rows) m.set(key(r), [...(m.get(key(r)) ?? []), r]);
  return m;
}
