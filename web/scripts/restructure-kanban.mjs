// One-off copy of the imported smartagri board into five purpose-built boards
// (docs/kanban/rekomendasi-workflow.md). The source board is only read, never
// changed. The plan lives in scripts/kanban-restructure-map.mjs.
//
// Run from web/:
//   node scripts/restructure-kanban.mjs --from 5394811a --dry-run
//   node scripts/restructure-kanban.mjs --from 5394811a
// Optional: --trello-export board.json gives each card's real last-activity
// date (the database only knows when a card was created and commented on).
//
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from web/.env and signs in
// with IMPORT_EMAIL / IMPORT_PASSWORD (also for the dry run, to read the board).
// Writes go through the anon key, so RLS applies. The runner owns the new
// boards; the source board's members are added with their roles. Options:
//   --visibility private   keep the new boards private (default team)
//   --keep-partial         on failure keep what was written (default: delete it again)
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { commentHeader, planRestructure } from "./kanban-restructure-map.mjs";
import { pool } from "./trello-api.mjs";
import { trelloIdDate } from "./trello-map.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv(file) {
  const env = {};
  if (!existsSync(file)) return env;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    if (line.trim().startsWith("#")) continue;
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2];
  }
  return env;
}
const fileEnv = loadEnv(join(root, ".env"));
const env = (k) => process.env[k] ?? fileEnv[k];

function parseArgs(argv) {
  const args = { dryRun: false, keepPartial: false, visibility: "team" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--from") args.from = argv[++i];
    else if (a === "--trello-export") args.trelloExport = argv[++i];
    else if (a === "--visibility") args.visibility = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--keep-partial") args.keepPartial = true;
    else throw new Error(`Unknown option ${a}`);
  }
  if (!args.from) throw new Error("Pass the source board with --from <slug> (the part after /kanban/).");
  if (!["private", "team"].includes(args.visibility)) throw new Error("--visibility must be private or team");
  return args;
}

function chunks(rows, size = 200) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

// PostgREST returns at most 1000 rows per request.
async function selectAll(build) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build().range(from, from + 999);
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

// Last activity per card from the Trello export, matched on the creation time
// encoded in the Trello id (the importer stored it as created_at) and title.
function activityFromExport(path, cards) {
  const json = JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
  const byKey = new Map();
  for (const t of json.cards ?? []) {
    if (t.dateLastActivity) byKey.set(`${new Date(trelloIdDate(t.id)).getTime()}|${t.name.trim()}`, t.dateLastActivity);
  }
  const out = new Map();
  for (const c of cards) {
    const hit = byKey.get(`${new Date(c.created_at).getTime()}|${c.title.trim()}`);
    if (hit) out.set(c.id, hit);
  }
  return out;
}

const later = (a, b) => (!a ? b : !b ? a : new Date(a) > new Date(b) ? a : b);

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const url = env("VITE_SUPABASE_URL") || env("SUPABASE_URL");
  const anon = env("VITE_SUPABASE_ANON_KEY") || env("SUPABASE_ANON_KEY");
  const email = env("IMPORT_EMAIL");
  const password = env("IMPORT_PASSWORD");
  if (!url || !anon) throw new Error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in web/.env");
  if (!email || !password) throw new Error("Set IMPORT_EMAIL and IMPORT_PASSWORD (your smartagri account) for this run.");

  const db = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await db.auth.signInWithPassword({ email, password });
  if (authError) throw new Error(`Sign-in failed: ${authError.message}`);
  const me = auth.user.id;
  const created = [];
  const copiedFiles = [];

  try {
    // --- Read the source board -------------------------------------------------
    const { data: source, error: sourceError } = await db.from("kanban_boards").select("*").eq("slug", args.from).maybeSingle();
    if (sourceError) throw new Error(sourceError.message);
    if (!source) throw new Error(`No board /kanban/${args.from} that this account can read.`);
    const s = source.id;
    const read = (table, order = "id") => selectAll(() => db.from(table).select("*").eq("board_id", s).order(order));
    console.log(`Reading "${source.name}"...`);
    const [lists, cards, labels, cardLabels, cardMembers, members, checklists, items, comments, attachments] = await Promise.all([
      read("kanban_lists"),
      read("kanban_cards"),
      read("kanban_labels"),
      read("kanban_card_labels", "card_id"),
      read("kanban_card_members", "card_id"),
      read("kanban_board_members", "user_id"),
      read("kanban_checklists"),
      read("kanban_checklist_items"),
      read("kanban_card_comments"),
      read("kanban_card_attachments"),
    ]);
    const { data: people } = await db.rpc("kanban_board_people", { b: s });
    const nameOf = new Map((people ?? []).map((p) => [p.user_id, p.full_name || p.preferred_name || "a former member"]));

    // --- Plan -------------------------------------------------------------------
    const lastActivity = new Map();
    for (const c of comments) lastActivity.set(c.card_id, later(lastActivity.get(c.card_id), c.created_at));
    for (const a of attachments) lastActivity.set(a.card_id, later(lastActivity.get(a.card_id), a.created_at));
    if (args.trelloExport) {
      const fromExport = activityFromExport(args.trelloExport, cards);
      for (const [id, iso] of fromExport) lastActivity.set(id, later(lastActivity.get(id), iso));
      console.log(`Trello export  last activity matched for ${fromExport.size} of ${cards.length} cards`);
    }
    const plan = planRestructure({ lists, cards, labels, cardLabels }, { now: Date.now(), lastActivity });

    console.log(`Source       ${cards.length} cards, ${comments.length} comments, ${attachments.length} attachments`);
    for (const b of plan.boards) {
      console.log(`  ${b.name.padEnd(26)} ${String(b.open).padStart(4)} open, ${String(b.archived).padStart(4)} archived, ${b.labels.length} labels`);
    }
    console.log(`Newly archived: ${plan.newlyArchived.stale} without activity for a year, ${plan.newlyArchived.archiveList} from the old archive lists`);
    if (plan.droppedLabelUses) console.log(`Label uses dropped (PROJECT and colour-only): ${plan.droppedLabelUses}`);
    for (const u of plan.unmapped) console.log(`Note: list "${u.name}" has no target; its ${u.count} card(s) are not copied.`);
    const foreign = comments.filter((c) => c.author_id !== me).length;
    if (foreign) console.log(`Comments by other people: ${foreign} (posted by you, with the original author in the text)`);
    if (args.dryRun) {
      console.log("\nDry run: nothing was written.");
      return;
    }

    // --- Write ----------------------------------------------------------------------
    console.log("\nCopying...");
    const check = (step, { error }) => {
      if (error) throw new Error(`${step}: ${error.message}`);
    };
    const boardId = new Map();
    const listId = new Map(); // "board/list" -> id
    const labelId = new Map(); // "board/LABEL" -> id
    for (const b of plan.boards) {
      const { data, error } = await db
        .from("kanban_boards")
        .insert({ name: b.name, description: b.description, background: b.background, visibility: args.visibility, created_by: me })
        .select()
        .single();
      if (error) throw new Error(`Board ${b.name}: ${error.message}`);
      created.push(data);
      boardId.set(b.key, data.id);
      check("Starter labels", await db.from("kanban_labels").delete().eq("board_id", data.id));
      const listRows = b.lists.map((name, i) => ({ id: crypto.randomUUID(), board_id: data.id, name, pos: (i + 1) * 1024 }));
      check("Lists", await db.from("kanban_lists").insert(listRows));
      for (const l of listRows) listId.set(`${b.key}/${l.name}`, l.id);
      const labelRows = b.labels.map((l) => ({ id: crypto.randomUUID(), board_id: data.id, name: l.name, color: l.color }));
      check("Labels", await db.from("kanban_labels").insert(labelRows));
      for (const l of labelRows) labelId.set(`${b.key}/${l.name.toUpperCase()}`, l.id);
      const others = members.filter((m) => m.user_id !== me).map((m) => ({ board_id: data.id, user_id: m.user_id, role: m.role }));
      if (others.length) check("Members", await db.from("kanban_board_members").insert(others));
    }

    const srcCard = new Map(cards.map((c) => [c.id, c]));
    const cardMap = new Map(); // source card id -> { id, board }
    const cardRows = plan.cards.map((p) => {
      const c = srcCard.get(p.srcId);
      const id = crypto.randomUUID();
      cardMap.set(p.srcId, { id, board: boardId.get(p.board) });
      return {
        id,
        board_id: boardId.get(p.board),
        list_id: listId.get(`${p.board}/${p.list}`),
        number: 0, // set by trigger
        title: c.title,
        description: c.description,
        pos: p.pos,
        start_at: c.start_at,
        due_at: c.due_at,
        due_complete: c.due_complete,
        cover_color: c.cover_color,
        created_by: me,
        created_at: c.created_at,
        archived_at: p.archivedAt,
      };
    });
    for (const part of chunks(cardRows)) check("Cards", await db.from("kanban_cards").insert(part));
    console.log(`Cards        ${cardRows.length}`);

    const cl = plan.cardLabels.map((r) => ({
      card_id: cardMap.get(r.srcCard).id,
      label_id: labelId.get(`${r.board}/${r.label.toUpperCase()}`),
      board_id: boardId.get(r.board),
    }));
    for (const part of chunks(cl)) check("Card labels", await db.from("kanban_card_labels").insert(part));

    const cm = cardMembers
      .filter((r) => cardMap.has(r.card_id))
      .map((r) => ({ card_id: cardMap.get(r.card_id).id, user_id: r.user_id, board_id: cardMap.get(r.card_id).board }));
    for (const part of chunks(cm)) check("Card members", await db.from("kanban_card_members").insert(part));

    const checklistMap = new Map();
    const checklistRows = checklists
      .filter((r) => cardMap.has(r.card_id))
      .map((r) => {
        const id = crypto.randomUUID();
        checklistMap.set(r.id, { id, board: cardMap.get(r.card_id).board });
        return { id, card_id: cardMap.get(r.card_id).id, board_id: cardMap.get(r.card_id).board, title: r.title, pos: r.pos };
      });
    for (const part of chunks(checklistRows)) check("Checklists", await db.from("kanban_checklists").insert(part));
    const itemRows = items
      .filter((r) => checklistMap.has(r.checklist_id))
      .map((r) => ({
        checklist_id: checklistMap.get(r.checklist_id).id,
        board_id: checklistMap.get(r.checklist_id).board,
        text: r.text,
        pos: r.pos,
        done: r.done,
        due_at: r.due_at,
        assignee_id: r.assignee_id,
      }));
    for (const part of chunks(itemRows)) check("Checklist items", await db.from("kanban_checklist_items").insert(part));
    console.log(`Checklists   ${checklistRows.length} with ${itemRows.length} items`);

    const commentRows = comments
      .filter((r) => cardMap.has(r.card_id))
      .map((r) => ({
        card_id: cardMap.get(r.card_id).id,
        board_id: cardMap.get(r.card_id).board,
        author_id: me,
        body: r.author_id === me ? r.body : commentHeader(nameOf.get(r.author_id) ?? "a former member", r.created_at) + r.body,
        created_at: r.created_at,
      }));
    for (const [i, part] of chunks(commentRows).entries()) {
      check("Comments", await db.from("kanban_card_comments").insert(part));
      process.stdout.write(`\rComments     ${Math.min((i + 1) * 200, commentRows.length)}/${commentRows.length}`);
    }
    process.stdout.write("\n");

    // Attachments: links are copied as rows; stored files are copied inside
    // Storage to the new board's folder, then covers are pointed at the copies.
    const attachmentMap = new Map();
    const stored = [];
    const links = [];
    for (const a of attachments) {
      const target = cardMap.get(a.card_id);
      if (!target) continue;
      const id = crypto.randomUUID();
      attachmentMap.set(a.id, id);
      const row = {
        id,
        card_id: target.id,
        board_id: target.board,
        name: a.name,
        url: a.url,
        mime_type: a.mime_type,
        bytes: a.bytes,
        uploaded_by: me,
        created_at: a.created_at,
      };
      if (a.storage_path) {
        const file = a.storage_path.split("/").pop();
        stored.push({ ...row, storage_path: `${target.board}/${target.id}/${file}`, from: a.storage_path });
      } else links.push({ ...row, storage_path: null });
    }
    for (const part of chunks(links)) check("Links", await db.from("kanban_card_attachments").insert(part));
    let done = 0;
    const failed = [];
    const missing = new Set(); // attachment ids whose file could not be copied
    await pool(stored, 6, async ({ from, ...row }) => {
      try {
        check("Copy file", await db.storage.from("kanban").copy(from, row.storage_path));
        copiedFiles.push(row.storage_path);
        check("File", await db.from("kanban_card_attachments").insert(row));
      } catch (e) {
        missing.add(row.id);
        failed.push(`${row.name}: ${e.message}`);
      }
      done += 1;
      if (done % 20 === 0 || done === stored.length) process.stdout.write(`\rFiles        ${done}/${stored.length}`);
    });
    if (stored.length) process.stdout.write("\n");
    for (const f of failed.slice(0, 10)) console.log(`  skipped ${f}`);

    const covers = cards.filter((c) => c.cover_attachment_id && cardMap.has(c.id) && attachmentMap.has(c.cover_attachment_id) && !missing.has(attachmentMap.get(c.cover_attachment_id)));
    await pool(covers, 6, async (c) => {
      check("Cover", await db.from("kanban_cards").update({ cover_attachment_id: attachmentMap.get(c.cover_attachment_id) }).eq("id", cardMap.get(c.id).id));
    });
    console.log(`Covers       ${covers.length}`);
  } catch (e) {
    if (created.length && !args.keepPartial) {
      for (const b of created) await db.from("kanban_boards").delete().eq("id", b.id);
      for (const part of chunks(copiedFiles, 100)) await db.storage.from("kanban").remove(part);
      console.error(`Stopped: ${e.message}\nThe new boards were deleted again; the source board was not changed.`);
    } else {
      console.error(`Stopped: ${e.message}${created.length ? "\nThe partial boards are kept." : ""}`);
    }
    process.exitCode = 1;
    return;
  } finally {
    // "local" ends only this script's session, not the browser's.
    await db.auth.signOut({ scope: "local" });
  }

  if (created.length) {
    console.log("\nDone:");
    for (const b of created) console.log(`  ${b.name.padEnd(26)} /kanban/${b.slug}`);
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
