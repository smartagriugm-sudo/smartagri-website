// One-off import of a Trello board export into the Kanban tables
// (web/supabase/kanban.sql). The mapping lives in scripts/trello-map.mjs.
//
// 1. In Trello: Board menu > Print, export, and share > Export as JSON.
// 2. Optional member map (JSON): { "trello-username or Full Name": "email@ugm.ac.id" }.
//    People need a smartagri account; unmapped people are left off cards, and
//    every imported comment names its original author in the text.
// 3. Run from web/:
//      node scripts/import-trello.mjs --file board.json --dry-run
//      IMPORT_EMAIL=you@ugm.ac.id IMPORT_PASSWORD=... node scripts/import-trello.mjs --file board.json --members members.json
//
// Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from web/.env. Writes go
// through the anon key and the importer's own session, so RLS applies (no
// service_role). The importer becomes the board owner. Options:
//   --members <file>   member map, see above
//   --name <text>      board name (default: the Trello board name)
//   --visibility team  make the board readable by every signed-in user (default private)
//   --no-comments      skip comments
//   --include-trello-files  also keep files uploaded to Trello (as links that need a Trello login)
//   --dry-run          map and report, write nothing
//   --keep-partial     on failure keep what was written (default: delete the new board)
//
// With TRELLO_KEY and TRELLO_TOKEN set (read-only token, see docs/kanban/import-trello.md)
// the script also reads the full comment history from the Trello API (the export
// stops at 1000 actions) and copies each image cover into Supabase Storage as WebP.
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { mapTrelloBoard } from "./trello-map.mjs";
import { downloadCover, fetchAllComments, pool, trelloAuth } from "./trello-api.mjs";

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
  const args = { dryRun: false, comments: true, keepPartial: false, trelloFiles: false, visibility: "private" };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--file") args.file = argv[++i];
    else if (a === "--members") args.members = argv[++i];
    else if (a === "--name") args.name = argv[++i];
    else if (a === "--visibility") args.visibility = argv[++i];
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--no-comments") args.comments = false;
    else if (a === "--keep-partial") args.keepPartial = true;
    else if (a === "--include-trello-files") args.trelloFiles = true;
    else throw new Error(`Unknown option ${a}`);
  }
  if (!args.file) throw new Error("Pass the Trello export with --file board.json");
  if (!["private", "team"].includes(args.visibility)) throw new Error("--visibility must be private or team");
  return args;
}

function readJson(path, what) {
  try {
    return JSON.parse(readFileSync(resolve(process.cwd(), path), "utf8"));
  } catch (e) {
    throw new Error(`Could not read ${what} ${path}: ${e.message}`);
  }
}

function chunks(rows, size = 200) {
  const out = [];
  for (let i = 0; i < rows.length; i += size) out.push(rows.slice(i, i + size));
  return out;
}

function report(plan, args) {
  const archivedCards = plan.cards.filter((c) => c.archived_at).length;
  const archivedLists = plan.lists.filter((l) => l.archived_at).length;
  console.log(`Board        ${args.name ?? plan.board.name} (${args.visibility}, background ${plan.board.background})`);
  console.log(`Lists        ${plan.lists.length} (${archivedLists} archived)`);
  console.log(`Cards        ${plan.cards.length} (${archivedCards} archived)`);
  console.log(`Labels       ${plan.labels.length}, on cards ${plan.cardLabels.length}`);
  console.log(`Members      ${plan.emails.length} mapped, card assignments ${plan.cardMembers.length}`);
  console.log(`Checklists   ${plan.checklists.length} with ${plan.items.length} items`);
  console.log(`Comments     ${plan.comments.length}`);
  console.log(`Attachments  ${plan.attachments.length} (as links)`);
  if (plan.covers.length) console.log(`Covers       ${plan.covers.length} image(s) to copy from Trello as WebP`);
  for (const w of plan.warnings) console.log(`Note: ${w}`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const json = readJson(args.file, "Trello export");
  const memberMap = args.members ? readJson(args.members, "member map") : {};

  // Optional Trello API: full comment history now, cover images while importing.
  const trelloKey = env("TRELLO_KEY");
  const trelloToken = env("TRELLO_TOKEN");
  const trello = trelloKey && trelloToken ? trelloAuth(trelloKey, trelloToken) : null;
  // Say up front whether the API is in use (without printing the values).
  console.log(
    trello
      ? "Trello API     on (full comment history, image covers)"
      : `Trello API     off (TRELLO_KEY ${trelloKey ? "set" : "missing"}, TRELLO_TOKEN ${trelloToken ? "set" : "missing"})`,
  );
  if (trello && args.comments) {
    if (!json.id) throw new Error("The export has no board id, so its comments cannot be fetched.");
    const fetched = await fetchAllComments(json.id, trello, (n) => process.stdout.write(`\rReading comments from Trello: ${n}`));
    process.stdout.write("\n");
    const seen = new Set(fetched.map((a) => a.id));
    json.actions = [...(json.actions ?? []).filter((a) => a.type !== "commentCard" || !seen.has(a.id)), ...fetched];
  }

  const plan = mapTrelloBoard(json, {
    memberMap,
    includeComments: args.comments,
    includeTrelloFiles: args.trelloFiles,
    coversFromApi: !!trello,
    completeComments: !!trello && args.comments,
  });
  report(plan, args);
  if (args.dryRun) {
    console.log("\nDry run: nothing was written.");
    return;
  }

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
  const myEmail = String(auth.user.email ?? "").toLowerCase();

  const check = (step, { error }) => {
    if (error) throw new Error(`${step}: ${error.message}`);
  };

  console.log("\nImporting...");
  const { data: board, error: boardError } = await db
    .from("kanban_boards")
    .insert({
      name: args.name ?? plan.board.name,
      description: plan.board.description,
      background: plan.board.background,
      visibility: args.visibility,
      created_by: me,
    })
    .select()
    .single();
  if (boardError) throw new Error(`Board: ${boardError.message}`);
  const b = board.id;

  try {
    // A new board gets six colour-only starter labels; the Trello labels replace them.
    check("Starter labels", await db.from("kanban_labels").delete().eq("board_id", b));
    for (const part of chunks(plan.labels)) {
      check("Labels", await db.from("kanban_labels").insert(part.map((l) => ({ ...l, board_id: b }))));
    }
    for (const part of chunks(plan.lists)) {
      check("Lists", await db.from("kanban_lists").insert(part.map((l) => ({ ...l, board_id: b }))));
    }

    // Members by email (they need an account); the importer is already the owner.
    const uid = new Map([[myEmail, me]]);
    for (const e of plan.emails) {
      if (uid.has(e)) continue;
      const res = await db.rpc("kanban_add_member", { b, member_email: e, member_role: "member" });
      if (res.error) console.log(`Note: could not add ${e} (${res.error.message}).`);
      else uid.set(e, res.data);
    }

    // Cards go in Trello's order so the database hands out numbers in that order.
    // number and board_id are overwritten by triggers; they only fill not-null columns.
    for (const part of chunks(plan.cards)) {
      check("Cards", await db.from("kanban_cards").insert(part.map((c) => ({ ...c, board_id: b, number: 0, created_by: me }))));
    }
    for (const part of chunks(plan.cardLabels)) {
      check("Card labels", await db.from("kanban_card_labels").insert(part.map((r) => ({ ...r, board_id: b }))));
    }
    const assignments = plan.cardMembers
      .filter((r) => uid.has(r.email))
      .map((r) => ({ card_id: r.card_id, user_id: uid.get(r.email), board_id: b }));
    for (const part of chunks(assignments)) {
      check("Card members", await db.from("kanban_card_members").insert(part));
    }
    for (const part of chunks(plan.checklists)) {
      check("Checklists", await db.from("kanban_checklists").insert(part.map((r) => ({ ...r, board_id: b }))));
    }
    for (const part of chunks(plan.items)) {
      check("Checklist items", await db.from("kanban_checklist_items").insert(part.map((r) => ({ ...r, board_id: b }))));
    }
    for (const part of chunks(plan.comments)) {
      check(
        "Comments",
        await db.from("kanban_card_comments").insert(
          part.map((c) => ({ ...c, board_id: b, author_id: me, created_at: c.created_at ?? undefined })),
        ),
      );
    }
    for (const part of chunks(plan.attachments)) {
      check(
        "Attachments",
        await db.from("kanban_card_attachments").insert(
          part.map((a) => ({ ...a, board_id: b, uploaded_by: me, created_at: a.created_at ?? undefined })),
        ),
      );
    }

    // Image covers: download from Trello, shrink to WebP, store, set as cover.
    // A cover that fails is reported and skipped; it does not stop the import.
    let copied = 0;
    const failed = [];
    await pool(plan.covers, 4, async (cv) => {
      try {
        const webp = await downloadCover(cv.attachment, trello);
        const base = cv.attachment.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "_").slice(-60) || "cover";
        const path = `${b}/${cv.card_id}/${crypto.randomUUID()}-${base}.webp`;
        check("Cover upload", await db.storage.from("kanban").upload(path, webp, { contentType: "image/webp" }));
        const { data: att, error } = await db
          .from("kanban_card_attachments")
          .insert({
            card_id: cv.card_id,
            board_id: b,
            name: `${base}.webp`,
            storage_path: path,
            mime_type: "image/webp",
            bytes: webp.length,
            uploaded_by: me,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        check("Cover", await db.from("kanban_cards").update({ cover_attachment_id: att.id }).eq("id", cv.card_id));
        copied += 1;
      } catch (e) {
        failed.push(`${cv.attachment.name}: ${e.message}`);
      }
      const done = copied + failed.length;
      if (done % 10 === 0 || done === plan.covers.length) {
        process.stdout.write(`\rCovers ${done}/${plan.covers.length}`);
      }
    });
    if (plan.covers.length) {
      process.stdout.write("\n");
      console.log(`Covers copied: ${copied}${failed.length ? `, skipped ${failed.length}` : ""}`);
      for (const f of failed.slice(0, 10)) console.log(`  ${f}`);
      if (failed.length > 10) console.log(`  ...and ${failed.length - 10} more`);
    }
  } catch (e) {
    if (args.keepPartial) {
      console.error(`Stopped: ${e.message}\nThe partial board is kept at /kanban/${board.slug}.`);
    } else {
      await db.from("kanban_boards").delete().eq("id", b);
      console.error(`Stopped: ${e.message}\nThe new board was deleted again; nothing else changed.`);
    }
    process.exitCode = 1;
    return;
  } finally {
    // "local" ends only this script's session; the default ("global") would
    // also sign the importer out of every browser.
    await db.auth.signOut({ scope: "local" });
  }

  console.log(`Done. Open /kanban/${board.slug}`);
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
