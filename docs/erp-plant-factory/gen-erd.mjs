// Generates the ERP data map page. Usage: node gen-erd.mjs diagram-erp-plant-factory.html [fragment-for-publishing.html]
import { writeFileSync } from "node:fs";

const OUT = process.argv[2];

const C = {
  paper: "#F6F9F9",
  ink: "#0F2F36",
  muted: "#4F6B73",
  rule: "rgba(15,47,54,0.16)",
  tint: "rgba(15,47,54,0.04)",
  accent: "#14919B",
  accentTint: "rgba(20,145,155,0.07)",
  accentHead: "rgba(20,145,155,0.13)",
  link: "#0B6477",
};
const F = "Inter, system-ui, sans-serif";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const tw = (s, px = 10) => Math.ceil(String(s).length * px * 0.58);

const W = 230;
const COL = [40, 340, 640, 940];
const VBW = 1210;

/* ---------------------------------------------------------------- entities */
const hOf = (e) => 44 + e.fields.length * 20 + 8;

function entity(e) {
  const h = hOf(e);
  const focal = e.style === "focal";
  const ref = e.style === "ref";
  const stroke = focal ? C.accent : ref ? C.muted : C.ink;
  const fill = focal ? C.accentTint : ref ? C.tint : "#FFFFFF";
  const head = focal ? C.accentHead : C.tint;
  const dash = ref ? ' stroke-dasharray="4,3"' : "";
  let s = `<g>`;
  s += `<rect x="${e.x}" y="${e.y}" width="${W}" height="${h}" rx="6" fill="${C.paper}"/>`;
  s += `<rect x="${e.x}" y="${e.y}" width="${W}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}" stroke-width="1"${dash}/>`;
  s += `<rect x="${e.x + 0.5}" y="${e.y + 0.5}" width="${W - 1}" height="43" rx="6" fill="${head}"/>`;
  s += `<rect x="${e.x + 0.5}" y="${e.y + 36}" width="${W - 1}" height="8" fill="${head}"/>`;
  s += `<line x1="${e.x}" y1="${e.y + 44}" x2="${e.x + W}" y2="${e.y + 44}" stroke="${focal ? "rgba(20,145,155,0.4)" : C.rule}"/>`;
  s += `<text x="${e.x + 14}" y="${e.y + 17}" fill="${focal ? C.accent : C.muted}" font-size="10" font-weight="500" letter-spacing="0.03em">${esc(e.tag)}</text>`;
  s += `<text x="${e.x + 14}" y="${e.y + 35}" fill="${C.ink}" font-size="14" font-weight="600" letter-spacing="-0.01em">${esc(e.name)}</text>`;
  e.fields.forEach(([name, type], i) => {
    const y = e.y + 44 + 18 + i * 20;
    const key = name.startsWith("#") || name.startsWith("→");
    s += `<text x="${e.x + 14}" y="${y}" fill="${C.ink}" font-size="11" font-weight="${key ? 500 : 400}">${esc(name)}</text>`;
    s += `<text x="${e.x + W - 14}" y="${y}" fill="${C.muted}" font-size="10.5" text-anchor="end">${esc(type)}</text>`;
  });
  return s + `</g>`;
}

/** Point on an entity edge. */
function P(e, side, frac = 0.5) {
  const h = hOf(e);
  if (side === "left") return [e.x, e.y + h * frac];
  if (side === "right") return [e.x + W, e.y + h * frac];
  if (side === "top") return [e.x + W * frac, e.y];
  return [e.x + W * frac, e.y + h];
}

/* ------------------------------------------------------------- connectors */
function roundedPath(pts, r = 8) {
  let d = `M ${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [px, py] = pts[i - 1];
    const [cx, cy] = pts[i];
    const [nx, ny] = pts[i + 1];
    const l1 = Math.hypot(cx - px, cy - py);
    const l2 = Math.hypot(nx - cx, ny - cy);
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = cx - ((cx - px) / l1) * rr;
    const ay = cy - ((cy - py) / l1) * rr;
    const bx = cx + ((nx - cx) / l2) * rr;
    const by = cy + ((ny - cy) / l2) * rr;
    d += ` L ${ax},${ay} Q ${cx},${cy} ${bx},${by}`;
  }
  const last = pts[pts.length - 1];
  return d + ` L ${last[0]},${last[1]}`;
}

function maskText(x, y, text, { anchor = "middle", size = 10, weight = 500, fill = C.muted } = {}) {
  const w = tw(text, size) + 6;
  const rx = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w + 2 : x - 2;
  return (
    `<rect x="${rx}" y="${y - size}" width="${w}" height="${size + 3}" rx="2" fill="${C.paper}"/>` +
    `<text x="${x}" y="${y}" fill="${fill}" font-size="${size}" font-weight="${weight}" text-anchor="${anchor}">${esc(text)}</text>`
  );
}

function card(pA, pB, text) {
  // pA is the endpoint on the entity, pB the next point along the connector.
  if (pA[1] === pB[1]) {
    const dir = Math.sign(pB[0] - pA[0]);
    return maskText(pA[0] + dir * 14, pA[1] - 9, text, { weight: 600, fill: C.ink });
  }
  const dir = Math.sign(pB[1] - pA[1]);
  return maskText(pA[0] + 9, pA[1] + dir * 16 + 4, text, { anchor: "start", weight: 600, fill: C.ink });
}

function rel({ pts, c1, c2, label, dashed, labelPos }) {
  const stroke = dashed ? ' stroke-dasharray="5,4"' : "";
  const line = `<path d="${roundedPath(pts)}" fill="none" stroke="${C.muted}" stroke-width="1"${stroke}/>`;
  let marks = "";
  if (c1) marks += card(pts[0], pts[1], c1);
  if (c2) marks += card(pts[pts.length - 1], pts[pts.length - 2], c2);
  if (label) {
    let best = 0;
    let bi = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const l = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
      if (l > best) { best = l; bi = i; }
    }
    const [a, b] = [pts[bi], pts[bi + 1]];
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    if (a[1] === b[1]) {
      marks += labelPos === "above" ? maskText(mx, a[1] - 9, label) : maskText(mx, a[1] + 18, label);
    } else {
      marks += labelPos === "right"
        ? maskText(a[0] + 10, my + 3, label, { anchor: "start" })
        : maskText(a[0] - 10, my + 3, label, { anchor: "end" });
    }
  }
  return { line, marks };
}

function legend(y, items) {
  let s = `<line x1="40" y1="${y}" x2="${VBW - 40}" y2="${y}" stroke="${C.rule}" stroke-width="0.8"/>`;
  s += `<text x="40" y="${y + 20}" fill="${C.muted}" font-size="10" font-weight="500" letter-spacing="0.03em">Legenda</text>`;
  let x = 40;
  const ly = y + 42;
  for (const it of items) {
    if (it === "focal") {
      s += `<rect x="${x}" y="${ly - 9}" width="16" height="11" rx="2" fill="${C.accentTint}" stroke="${C.accent}"/>`;
      s += `<text x="${x + 22}" y="${ly}" fill="${C.muted}" font-size="10.5">Entitas inti</text>`; x += 112;
    } else if (it === "entity") {
      s += `<rect x="${x}" y="${ly - 9}" width="16" height="11" rx="2" fill="#fff" stroke="${C.ink}"/>`;
      s += `<text x="${x + 22}" y="${ly}" fill="${C.muted}" font-size="10.5">Entitas</text>`; x += 88;
    } else if (it === "ref") {
      s += `<rect x="${x}" y="${ly - 9}" width="16" height="11" rx="2" fill="${C.tint}" stroke="${C.muted}" stroke-dasharray="3,2"/>`;
      s += `<text x="${x + 22}" y="${ly}" fill="${C.muted}" font-size="10.5">Referensi dari domain lain</text>`; x += 184;
    } else if (it === "pk") {
      s += `<text x="${x}" y="${ly}" fill="${C.ink}" font-size="11" font-weight="600">#</text>`;
      s += `<text x="${x + 14}" y="${ly}" fill="${C.muted}" font-size="10.5">Primary key</text>`; x += 98;
    } else if (it === "fk") {
      s += `<text x="${x}" y="${ly}" fill="${C.ink}" font-size="11" font-weight="600">→</text>`;
      s += `<text x="${x + 16}" y="${ly}" fill="${C.muted}" font-size="10.5">Foreign key</text>`; x += 100;
    } else if (it === "card") {
      s += `<text x="${x}" y="${ly}" fill="${C.ink}" font-size="11" font-weight="600">1 · N</text>`;
      s += `<text x="${x + 34}" y="${ly}" fill="${C.muted}" font-size="10.5">Kardinalitas</text>`; x += 116;
    } else if (it === "derived") {
      s += `<line x1="${x}" y1="${ly - 4}" x2="${x + 24}" y2="${ly - 4}" stroke="${C.muted}" stroke-dasharray="5,4"/>`;
      s += `<text x="${x + 30}" y="${ly}" fill="${C.muted}" font-size="10.5">Relasi turunan (lokasi + waktu / agregasi)</text>`; x += 270;
    }
  }
  return s;
}

function svgDoc(slug, title, desc, height, ents, rels, legendItems) {
  const built = rels.map(rel);
  const legendY = height - 64;
  return `<div class="scroll"><svg viewBox="0 0 ${VBW} ${height}" style="min-width:${VBW}px" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="${slug}-title ${slug}-desc" font-family="${F}">
<title id="${slug}-title">${esc(title)}</title>
<desc id="${slug}-desc">${esc(desc)}</desc>
<defs><pattern id="dots-${slug}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="rgba(15,47,54,0.10)"/></pattern></defs>
<rect width="100%" height="100%" fill="${C.paper}"/>
<rect width="100%" height="100%" fill="url(#dots-${slug})" opacity="0.55"/>
${built.map((b) => b.line).join("\n")}
${ents.map(entity).join("\n")}
${built.map((b) => b.marks).join("\n")}
${legend(legendY, legendItems)}
</svg></div>`;
}

const E = (x, y, tag, name, fields, style) => ({ x, y, tag, name, fields, style });
const rowBottom = (...es) => Math.max(...es.map((e) => e.y + hOf(e)));

/* ================================================================ overview */
function overview() {
  const y1 = 60;
  const recipe = E(COL[0], y1, "fondasi", "pf_recipe", [["# id", "uuid"], ["→ crop_id", "uuid"], ["version", "int"], ["status", "enum"]]);
  const batch = E(COL[1], y1, "budidaya · entitas inti", "pf_batch", [["# id", "uuid"], ["code", "text"], ["→ recipe_id", "uuid"], ["→ seed_lot_id", "uuid"], ["sown_at", "date"], ["phase", "enum"]], "focal");
  const harvest = E(COL[2], y1, "budidaya", "pf_harvest_lot", [["# id", "uuid"], ["lot_code", "text"], ["→ batch_id", "uuid"], ["fresh_kg", "numeric"], ["grade", "enum"]]);
  const line = E(COL[3], y1, "penjualan", "pf_so_line", [["# id", "uuid"], ["→ sales_order_id", "uuid"], ["→ harvest_lot_id", "uuid"], ["qty_kg", "numeric"], ["price_per_kg", "numeric"]]);
  const y2 = rowBottom(recipe, batch, harvest, line) + 100;
  const seed = E(COL[0], y2, "inventory", "pf_stock_lot", [["# id", "uuid"], ["→ item_id", "uuid"], ["lot_no", "text"], ["qty_on_hand", "numeric"], ["expiry_date", "date"]]);
  const slot = E(COL[1], y2, "budidaya · riwayat tempat", "pf_batch_slot", [["# id", "uuid"], ["→ batch_id", "uuid"], ["→ location_id", "uuid"], ["placed_at", "timestamptz"], ["removed_at", "timestamptz"]]);
  const loc = E(COL[2], y2, "fondasi", "pf_location", [["# id", "uuid"], ["→ parent_id", "uuid"], ["level", "enum"], ["code", "text"]]);
  const reading = E(COL[3], y2, "monitoring", "pf_sensor_reading", [["→ asset_id", "uuid"], ["→ location_id", "uuid"], ["metric", "text"], ["value", "numeric"], ["ts", "timestamptz"]]);
  const yA = y1 + 74;
  const yB = y2 + 74;
  const bb = batch.y + hOf(batch);
  const rels = [
    { pts: [[COL[0] + W, yA], [COL[1], yA]], c1: "1", c2: "N", label: "dipakai" },
    { pts: [[COL[1] + W, yA], [COL[2], yA]], c1: "1", c2: "N", label: "hasil" },
    { pts: [[COL[2] + W, yA], [COL[3], yA]], c1: "1", c2: "N", label: "dijual" },
    { pts: [P(seed, "top"), [P(seed, "top")[0], y2 - 50], [COL[1] + W * 0.25, y2 - 50], [COL[1] + W * 0.25, bb]], c1: "1", c2: "N", label: "benih" },
    { pts: [[COL[1] + W * 0.7, bb], [COL[1] + W * 0.7, y2]], c1: "1", c2: "N", label: "menempati", labelPos: "right" },
    { pts: [[COL[1] + W, yB], [COL[2], yB]], c1: "N", c2: "1", label: "di tempat" },
    { pts: [[COL[2] + W, yB], [COL[3], yB]], c1: "1", c2: "N", label: "+ waktu", dashed: true },
  ];
  const h = rowBottom(seed, slot, loc, reading) + 40 + 64;
  return svgDoc("pf-overview", "Gambaran besar model data", "Resep dan lot benih masuk ke batch. Batch menempati lokasi dari waktu ke waktu dan menghasilkan lot panen yang dijual. Bacaan sensor terhubung ke batch lewat lokasi dan waktu.", h, [recipe, batch, harvest, line, seed, slot, loc, reading], rels, ["focal", "entity", "pk", "fk", "card", "derived"]);
}

/* =============================================================== fondasi */
function fondasi() {
  const y1 = 60;
  const crop = E(COL[0], y1, "entitas", "pf_crop", [["# id", "uuid"], ["name", "text"], ["variety", "text"], ["cycle_days", "int"], ["germ_rate", "numeric"]]);
  const recipe = E(COL[1], y1, "entitas · berversi", "pf_recipe", [["# id", "uuid"], ["→ crop_id", "uuid"], ["code", "text"], ["version", "int"], ["→ parent_version_id", "uuid"], ["status", "enum"], ["→ created_by", "uuid"]]);
  const phase = E(COL[2], y1, "entitas", "pf_recipe_phase", [["# id", "uuid"], ["→ recipe_id", "uuid"], ["phase", "enum"], ["seq", "int"], ["duration_days", "int"], ["photoperiod_h", "numeric"], ["ppfd_umol", "numeric"]]);
  const profile = E(COL[3], y1, "sudah ada", "profiles", [["# id", "uuid · auth"], ["full_name", "text"], ["status", "enum"], ["is_admin", "bool"], ["→ supervisor_id", "uuid"]]);
  const y2 = rowBottom(crop, recipe, phase, profile) + 80;
  const loc = E(COL[0], y2, "entitas inti · self-reference", "pf_location", [["# id", "uuid"], ["→ parent_id", "uuid"], ["level", "enum"], ["code", "text · unik"], ["name", "text"], ["capacity", "int"], ["slot_status", "enum"], ["attrs", "jsonb"]], "focal");
  const asset = E(COL[1], y2, "entitas", "pf_asset", [["# id", "uuid"], ["→ location_id", "uuid"], ["kind", "enum"], ["model", "text"], ["serial", "text"], ["token_hash", "text"], ["status", "enum"], ["last_seen_at", "timestamptz"]]);
  const cal = E(COL[2], y2, "entitas", "pf_calibration", [["# id", "uuid"], ["→ asset_id", "uuid"], ["metric", "text"], ["calibrated_at", "timestamptz"], ["offset", "numeric"], ["slope", "numeric"], ["next_due", "date"], ["→ by", "uuid"]]);
  const role = E(COL[3], y2, "entitas · hak akses", "pf_user_role", [["# (profile_id, role)", "pk"], ["→ profile_id", "uuid"], ["role", "enum"], ["→ granted_by", "uuid"], ["granted_at", "timestamptz"]]);
  const yA = y1 + 74;
  const yL1 = y2 + 56;
  const yL2 = y2 + 96;
  const yB = y2 + 154;
  const rels = [
    { pts: [[COL[0] + W, yA], [COL[1], yA]], c1: "1", c2: "N", label: "resep" },
    { pts: [[COL[1] + W, yA], [COL[2], yA]], c1: "1", c2: "N", label: "fase" },
    { pts: [P(profile, "bottom"), [COL[3] + W / 2, y2]], c1: "1", c2: "N", label: "peran" },
    { pts: [[COL[0] + W, yL1], [COL[0] + W + 26, yL1], [COL[0] + W + 26, yL2], [COL[0] + W, yL2]], c1: "1", c2: "N", label: "induk", labelPos: "right" },
    { pts: [[COL[0] + W, yB], [COL[1], yB]], c1: "1", c2: "N", label: "memasang" },
    { pts: [[COL[1] + W, yB], [COL[2], yB]], c1: "1", c2: "N", label: "kalibrasi" },
  ];
  const h = rowBottom(loc, asset, cal, role) + 40 + 64;
  return svgDoc("pf-fondasi", "Fondasi", "Hierarki lokasi, tanaman dengan resep berversi, daftar perangkat dengan kalibrasi, dan peran pengguna.", h, [crop, recipe, phase, profile, loc, asset, cal, role], rels, ["focal", "entity", "pk", "fk", "card"]);
}

/* ============================================================== budidaya */
function produksi() {
  const y1 = 60;
  const plan = E(COL[0], y1, "entitas", "pf_production_plan", [["# id", "uuid"], ["→ crop_id", "uuid"], ["week_start", "date"], ["target_kg", "numeric"], ["planned_plants", "int"], ["status", "enum"]]);
  const batch = E(COL[1], y1, "entitas inti", "pf_batch", [["# id", "uuid"], ["code", "text · unik"], ["→ plan_id", "uuid · opsional"], ["→ recipe_id", "uuid · versi"], ["→ seed_lot_id", "uuid"], ["sown_at", "date"], ["plant_count", "int"], ["phase", "enum"], ["status", "enum"]], "focal");
  const harvest = E(COL[2], y1, "entitas", "pf_harvest_lot", [["# id", "uuid"], ["lot_code", "text · unik"], ["→ batch_id", "uuid"], ["harvested_at", "timestamptz"], ["fresh_kg", "numeric"], ["remaining_kg", "numeric"], ["→ grade_id", "uuid"], ["best_before", "date"], ["→ by", "uuid"]]);
  const event = E(COL[3], y1, "entitas", "pf_batch_event", [["# id", "uuid"], ["→ batch_id", "uuid"], ["type", "enum"], ["at", "timestamptz"], ["qty", "int"], ["reason", "text"], ["photo_path", "text"], ["→ by", "uuid"]]);
  const y2 = rowBottom(plan, batch, harvest, event) + 100;
  const recipe = E(COL[0], y2, "referensi · fondasi", "pf_recipe", [["# id", "uuid"], ["version", "int"], ["status", "enum"]], "ref");
  const slot = E(COL[1], y2, "entitas · riwayat tempat", "pf_batch_slot", [["# id", "uuid"], ["→ batch_id", "uuid"], ["→ location_id", "uuid"], ["→ source_slot_id", "uuid · asal"], ["qty", "int"], ["germinated", "int"], ["placed_at", "timestamptz"], ["removed_at", "timestamptz"]]);
  const loc = E(COL[2], y2, "referensi · fondasi", "pf_location", [["# id", "uuid"], ["code", "CH1-S1-P01, R1-T3-G1-H01"], ["level", "enum"]], "ref");
  const task = E(COL[3], y2, "entitas", "pf_task", [["# id", "uuid"], ["→ batch_id", "uuid · opsional"], ["→ location_id", "uuid"], ["→ alarm_id", "uuid · opsional"], ["title", "text"], ["due_at", "timestamptz"], ["→ assignee_id", "uuid"], ["status", "enum"]]);
  const yA = y1 + 74;
  const yB = y2 + 74;
  const bb = batch.y + hOf(batch);
  const rels = [
    { pts: [[COL[0] + W, yA], [COL[1], yA]], c1: "1", c2: "N", label: "rencana" },
    { pts: [[COL[1] + W, yA], [COL[2], yA]], c1: "1", c2: "N", label: "hasil" },
    { pts: [[COL[1] + W * 0.7, y1], [COL[1] + W * 0.7, 30], [COL[3] + W / 2, 30], [COL[3] + W / 2, y1]], c1: "1", c2: "N", label: "riwayat kejadian", labelPos: "above" },
    { pts: [[COL[1] + W / 2, bb], [COL[1] + W / 2, y2]], c1: "1", c2: "N", label: "menempati", labelPos: "right" },
    { pts: [P(recipe, "top"), [COL[0] + W / 2, y2 - 50], [COL[1] + W * 0.25, y2 - 50], [COL[1] + W * 0.25, bb]], c1: "1", c2: "N", label: "dipakai" },
    { pts: [[COL[1] + W, yB], [COL[2], yB]], c1: "N", c2: "1", label: "di tempat" },
    { pts: [[COL[2] + W, yB], [COL[3], yB]], c1: "1", c2: "N", label: "lokasi" },
    { pts: [[COL[3] + W * 0.3, y2], [COL[3] + W * 0.3, y2 - 66], [COL[1] + W * 0.8, y2 - 66], [COL[1] + W * 0.8, bb]], c1: "N", c2: "1", label: "tugas" },
  ];
  const h = rowBottom(recipe, slot, loc, task) + 40 + 64;
  return svgDoc("pf-produksi", "Budidaya", "Batch memakai satu versi resep, menempati nampan lalu lubang dari waktu ke waktu, mencatat kejadian, menghasilkan lot panen, dan memiliki tugas operator.", h, [plan, batch, harvest, event, recipe, slot, loc, task], rels, ["focal", "entity", "ref", "pk", "fk", "card"]);
}

/* ============================================================ monitoring */
function iot() {
  const y1 = 60;
  const loc = E(COL[0], y1, "referensi · fondasi", "pf_location", [["# id", "uuid"], ["code", "text"], ["level", "enum"]], "ref");
  const asset = E(COL[1], y1, "referensi · fondasi", "pf_asset", [["# id", "uuid"], ["→ location_id", "uuid"], ["kind", "enum"], ["token_hash", "text"]], "ref");
  const reading = E(COL[2], y1, "entitas inti · partisi bulanan", "pf_sensor_reading", [["# (asset_id, metric, ts)", "pk"], ["→ asset_id", "uuid"], ["→ location_id", "uuid"], ["metric", "text"], ["value", "numeric"], ["ts", "timestamptz · UTC"], ["quality", "enum"]], "focal");
  const hourly = E(COL[3], y1, "entitas · diisi pg_cron", "pf_reading_hourly", [["→ location_id", "uuid"], ["metric", "text"], ["hour", "timestamptz"], ["avg", "numeric"], ["min", "numeric"], ["max", "numeric"], ["n", "int"]]);
  const y2 = rowBottom(loc, asset, reading, hourly) + 100;
  const target = E(COL[0], y2, "entitas · nilai acuan", "pf_recipe_target", [["# id", "uuid"], ["→ recipe_phase_id", "uuid"], ["metric", "text"], ["low", "numeric"], ["target", "numeric"], ["high", "numeric"]]);
  const log = E(COL[1], y2, "entitas · kesehatan alat", "pf_ingest_log", [["# id", "bigint"], ["→ asset_id", "uuid"], ["received_at", "timestamptz"], ["accepted", "int"], ["rejected", "int"], ["error", "text"]]);
  const rule = E(COL[2], y2, "entitas", "pf_alarm_rule", [["# id", "uuid"], ["→ location_id", "uuid"], ["metric", "text"], ["warn_band", "numrange"], ["crit_band", "numrange"], ["delay_s", "int"], ["active", "bool"]]);
  const alarm = E(COL[3], y2, "entitas", "pf_alarm", [["# id", "uuid"], ["→ rule_id", "uuid"], ["→ asset_id", "uuid"], ["level", "enum"], ["value", "numeric"], ["opened_at", "timestamptz"], ["→ ack_by", "uuid"], ["closed_at", "timestamptz"]]);
  const yA = y1 + 74;
  const yB = y2 + 74;
  const rels = [
    { pts: [[COL[0] + W, yA], [COL[1], yA]], c1: "1", c2: "N", label: "memasang" },
    { pts: [[COL[1] + W, yA], [COL[2], yA]], c1: "1", c2: "N", label: "mengirim" },
    { pts: [[COL[2] + W, yA], [COL[3], yA]], c1: "N", c2: "1", label: "ringkasan", dashed: true },
    { pts: [P(loc, "bottom"), [COL[0] + W / 2, y2]], label: "batch aktif di lokasi", labelPos: "right", dashed: true },
    { pts: [P(asset, "bottom"), [COL[1] + W / 2, y2]], c1: "1", c2: "N", label: "log kiriman", labelPos: "right" },
    { pts: [P(reading, "bottom"), [COL[2] + W / 2, y2]], label: "diperiksa", labelPos: "right", dashed: true },
    { pts: [[COL[2] + W, yB], [COL[3], yB]], c1: "1", c2: "N", label: "memicu" },
  ];
  const h = rowBottom(target, log, rule, alarm) + 40 + 64;
  return svgDoc("pf-iot", "Monitoring", "Perangkat di lokasi mengirim bacaan yang diringkas per jam dan diperiksa aturan alarm. Nilai acuan berasal dari resep batch yang aktif di lokasi itu.", h, [loc, asset, reading, hourly, target, log, rule, alarm], rels, ["focal", "entity", "ref", "pk", "fk", "card", "derived"]);
}

/* ============================================================== penjualan */
function penjualan() {
  const y1 = 60;
  const harvest = E(COL[0], y1, "referensi · budidaya", "pf_harvest_lot", [["# id", "uuid"], ["lot_code", "text"], ["remaining_kg", "numeric"], ["→ grade_id", "uuid"]], "ref");
  const line = E(COL[1], y1, "entitas inti · kunci telusur", "pf_so_line", [["# id", "uuid"], ["→ sales_order_id", "uuid"], ["→ harvest_lot_id", "uuid"], ["qty_kg", "numeric"], ["price_per_kg", "numeric"]], "focal");
  const so = E(COL[2], y1, "entitas", "pf_sales_order", [["# id", "uuid"], ["so_no", "text · unik"], ["→ customer_id", "uuid"], ["status", "enum"], ["ordered_at", "date"]]);
  const partner = E(COL[3], y1, "entitas", "pf_partner", [["# id", "uuid"], ["type", "pelanggan/pemasok"], ["name", "text"], ["contact", "text"], ["address", "text"], ["tax_id", "text · opsional"]]);
  const y2 = rowBottom(harvest, line, so, partner) + 90;
  const batch = E(COL[0], y2, "referensi · budidaya", "pf_batch", [["# id", "uuid"], ["code", "text"], ["→ seed_lot_id", "uuid"]], "ref");
  const del = E(COL[1], y2, "entitas", "pf_delivery", [["# id", "uuid"], ["→ sales_order_id", "uuid"], ["delivered_at", "timestamptz"], ["recipient", "text"], ["proof_path", "text"]]);
  const inv = E(COL[2], y2, "entitas · + pf_invoice_line", "pf_invoice", [["# id", "uuid"], ["invoice_no", "text · unik"], ["→ sales_order_id", "uuid"], ["issued_on", "date"], ["due_on", "date"], ["subtotal_idr", "numeric"], ["→ tax_rate_id", "uuid · opsional"], ["tax_percent", "numeric · salinan"], ["tax_idr", "numeric"], ["total_idr", "numeric"], ["status", "enum"]], "focal");
  const pay = E(COL[3], y2, "entitas", "pf_payment", [["# id", "uuid"], ["→ invoice_id", "uuid"], ["paid_on", "date"], ["amount_idr", "numeric"], ["method", "enum"], ["proof_path", "text"]]);
  const tax = E(COL[3], y2 + hOf(pay) + 24, "entitas", "pf_tax_rate", [["# id", "uuid"], ["name", "text"], ["percent", "numeric"], ["valid_from", "date"]]);
  const y3 = rowBottom(batch, del, inv, tax) + 80;
  const std = E(COL[0], y3, "entitas · standar per tanaman", "pf_grade", [["# id", "uuid"], ["→ crop_id", "uuid"], ["name", "A, B, Afkir"], ["version", "int"], ["rank", "int"]]);
  const crit = E(COL[1], y3, "entitas", "pf_grade_criterion", [["# id", "uuid"], ["→ grade_id", "uuid"], ["parameter", "enum"], ["min_value", "numeric"], ["max_value", "numeric"], ["unit", "text"]]);
  const qc = E(COL[2], y3, "entitas", "pf_qc_inspection", [["# id", "uuid"], ["→ harvest_lot_id", "uuid"], ["at", "timestamptz"], ["sample_size", "int"], ["→ result_grade_id", "uuid"], ["photo_path", "text"], ["→ by", "uuid"]]);
  const meas = E(COL[3], y3, "entitas", "pf_qc_measurement", [["# id", "uuid"], ["→ inspection_id", "uuid"], ["parameter", "enum"], ["sample_no", "int"], ["value", "numeric"]]);
  const yA = y1 + 74;
  const yI = y2 + 74;
  const yQ = y3 + 74;
  const hb = harvest.y + hOf(harvest);
  const rels = [
    { pts: [[COL[0] + W, yA], [COL[1], yA]], c1: "1", c2: "N", label: "dijual" },
    { pts: [[COL[2], yA], [COL[1] + W, yA]], c1: "1", c2: "N", label: "isi" },
    { pts: [[COL[3], yA], [COL[2] + W, yA]], c1: "1", c2: "N", label: "pelanggan" },
    { pts: [P(batch, "top"), [COL[0] + W / 2, hb]], c1: "1", c2: "N", label: "hasil" },
    { pts: [[COL[2] + W * 0.25, so.y + hOf(so)], [COL[2] + W * 0.25, y2 - 40], [COL[1] + W / 2, y2 - 40], [COL[1] + W / 2, y2]], c1: "1", c2: "N", label: "pengiriman", labelPos: "above" },
    { pts: [[COL[2] + W * 0.7, so.y + hOf(so)], [COL[2] + W * 0.7, y2]], c1: "1", c2: "N", label: "tagihan", labelPos: "right" },
    { pts: [[COL[2] + W, yI], [COL[3], yI]], c1: "1", c2: "N", label: "dibayar" },
    { pts: [[COL[3], tax.y + 60], [COL[2] + W, tax.y + 60]], c1: "1", c2: "N", label: "pajak" },
    { pts: [[COL[0] + W, yQ], [COL[1], yQ]], c1: "1", c2: "N", label: "syarat" },
    { pts: [[COL[2], yQ + 40], [COL[1] + W, yQ + 40]], c1: "N", c2: "1", label: "dibandingkan", labelPos: "above", dashed: true },
    { pts: [[COL[2] + W, yQ], [COL[3], yQ]], c1: "1", c2: "N", label: "ukuran" },
  ];
  const h = rowBottom(std, crit, qc, meas) + 40 + 64;
  return svgDoc("pf-penjualan", "Penjualan, grade, dan traceability", "Baris pesanan menunjuk lot panen, lot panen menunjuk batch. Invoice dibuat dari pesanan dengan pajak opsional. Grade lot berasal dari hasil ukur yang dibandingkan dengan standar per tanaman.", h, [harvest, line, so, partner, batch, del, inv, pay, tax, std, crit, qc, meas], rels, ["focal", "entity", "ref", "pk", "fk", "card"]);
}

/* ============================================================== inventory */
function inventori() {
  const y1 = 60;
  const item = E(COL[0], y1, "entitas", "pf_item", [["# id", "uuid"], ["sku", "text · unik"], ["name", "text"], ["category", "enum"], ["unit", "text"], ["reorder_point", "numeric"], ["track_expiry", "bool"]]);
  const lot = E(COL[1], y1, "entitas · keluar yang kedaluwarsa dulu", "pf_stock_lot", [["# id", "uuid"], ["→ item_id", "uuid"], ["lot_no", "text"], ["qty_on_hand", "numeric"], ["expiry_date", "date"], ["received_at", "date"], ["→ location_id", "uuid · gudang"]]);
  const move = E(COL[2], y1, "entitas inti", "pf_stock_move", [["# id", "uuid"], ["→ stock_lot_id", "uuid"], ["type", "masuk/keluar/koreksi"], ["qty", "numeric"], ["→ batch_id", "uuid · opsional"], ["→ po_id", "uuid · opsional"], ["at", "timestamptz"], ["→ by", "uuid"]], "focal");
  const po = E(COL[3], y1, "entitas · + pf_po_line", "pf_purchase_order", [["# id", "uuid"], ["po_no", "text"], ["→ supplier_id", "uuid"], ["status", "enum"], ["ordered_at", "date"], ["total_idr", "numeric"]]);
  const y2 = rowBottom(item, lot, move, po) + 80;
  const loc = E(COL[1], y2, "referensi · fondasi", "pf_location", [["# id", "uuid"], ["code", "text · gudang"], ["level", "enum"]], "ref");
  const batch = E(COL[2], y2, "referensi · budidaya", "pf_batch", [["# id", "uuid"], ["code", "text"], ["→ seed_lot_id", "uuid"]], "ref");
  const partner = E(COL[3], y2, "referensi · penjualan", "pf_partner", [["# id", "uuid"], ["type", "pemasok"], ["name", "text"]], "ref");
  const yA = y1 + 74;
  const rels = [
    { pts: [[COL[0] + W, yA], [COL[1], yA]], c1: "1", c2: "N", label: "lot" },
    { pts: [[COL[1] + W, yA], [COL[2], yA]], c1: "1", c2: "N", label: "mutasi" },
    { pts: [[COL[3], yA], [COL[2] + W, yA]], c1: "1", c2: "N", label: "penerimaan" },
    { pts: [[COL[1] + W / 2, y2], P(lot, "bottom")], c1: "1", c2: "N", label: "tersimpan", labelPos: "right" },
    { pts: [[COL[2] + W / 2, y2], P(move, "bottom")], c1: "1", c2: "N", label: "dipakai", labelPos: "right" },
    { pts: [[COL[3] + W / 2, y2], P(po, "bottom")], c1: "1", c2: "N", label: "pemasok", labelPos: "right" },
  ];
  const h = rowBottom(loc, batch, partner) + 40 + 64;
  return svgDoc("pf-inventori", "Inventory", "Item disimpan per lot dengan tanggal kedaluwarsa. Setiap keluar dan masuk stok tercatat sebagai mutasi yang bisa menunjuk batch atau pesanan pembelian.", h, [item, lot, move, po, loc, batch, partner], rels, ["focal", "entity", "ref", "pk", "fk", "card"]);
}

/* ==================================================================== sdm */
function sdm() {
  const y1 = 90;
  const profile = E(COL[0], y1, "referensi · akun login", "profiles", [["# id", "uuid"], ["full_name", "text"], ["lab_role", "text"], ["→ supervisor_id", "uuid"]], "ref");
  const person = E(COL[1], y1, "entitas inti", "pf_person", [["# id", "uuid"], ["→ profile_id", "uuid · opsional"], ["full_name", "text"], ["person_type", "enum"], ["→ supervisor_id", "uuid"], ["joined_at", "date"], ["left_at", "date"], ["status", "enum"]], "focal");
  const contract = E(COL[2], y1, "entitas · sensitif", "pf_contract", [["# id", "uuid"], ["→ person_id", "uuid"], ["type", "enum"], ["start_date", "date"], ["end_date", "date"], ["position", "text"], ["rate_idr", "numeric"], ["document_path", "text"]]);
  const leave = E(COL[3], y1, "entitas", "pf_leave", [["# id", "uuid"], ["→ person_id", "uuid"], ["type", "izin/sakit/cuti"], ["start_date", "date"], ["end_date", "date"], ["status", "enum"], ["→ approved_by", "uuid"]]);
  const y2 = rowBottom(profile, person, contract, leave) + 100;
  const shift = E(COL[0], y2, "entitas", "pf_shift", [["# id", "uuid"], ["→ person_id", "uuid"], ["date", "date"], ["start_at", "time"], ["end_at", "time"], ["→ location_id", "uuid · lat, lng, radius"]]);
  const att = E(COL[1], y2, "entitas", "pf_attendance", [["# id", "uuid"], ["→ person_id", "uuid"], ["→ shift_id", "uuid · opsional"], ["clock_in", "timestamptz"], ["clock_out", "timestamptz"], ["in_lat, in_lng", "numeric"], ["in_accuracy_m", "numeric"], ["in_photo_path", "text · privat"], ["out_lat, out_lng", "numeric"], ["out_photo_path", "text · privat"], ["within_area", "bool"], ["status", "enum"], ["→ verified_by", "uuid"]]);
  const labor = E(COL[2], y2, "entitas", "pf_labor_log", [["# id", "uuid"], ["→ person_id", "uuid"], ["→ task_id", "uuid"], ["→ batch_id", "uuid"], ["work_date", "date"], ["minutes", "int"]]);
  const batch = E(COL[3], y2, "referensi · budidaya", "pf_batch", [["# id", "uuid"], ["code", "text"], ["status", "enum"]], "ref");
  const yA = y1 + 74;
  const yB = y2 + 74;
  const bb = person.y + hOf(person);
  const rels = [
    { pts: [[COL[0] + W, yA], [COL[1], yA]], c1: "0..1", c2: "1", label: "akun" },
    { pts: [[COL[1] + W, yA], [COL[2], yA]], c1: "1", c2: "N", label: "kontrak" },
    { pts: [[COL[1] + W * 0.7, y1], [COL[1] + W * 0.7, 50], [COL[3] + W / 2, 50], [COL[3] + W / 2, y1]], c1: "1", c2: "N", label: "izin dan cuti", labelPos: "above" },
    { pts: [[COL[1] + W * 0.2, bb], [COL[1] + W * 0.2, y2 - 44], [COL[0] + W / 2, y2 - 44], [COL[0] + W / 2, y2]], c1: "1", c2: "N", label: "jadwal", labelPos: "above" },
    { pts: [[COL[1] + W * 0.5, bb], [COL[1] + W * 0.5, y2]], c1: "1", c2: "N", label: "absensi", labelPos: "right" },
    { pts: [[COL[1] + W * 0.8, bb], [COL[1] + W * 0.8, y2 - 44], [COL[2] + W / 2, y2 - 44], [COL[2] + W / 2, y2]], c1: "1", c2: "N", label: "jam kerja", labelPos: "above" },
    { pts: [[COL[0] + W, yB], [COL[1], yB]], c1: "1", c2: "N", label: "hadir" },
    { pts: [[COL[3], yB], [COL[2] + W, yB]], c1: "1", c2: "N", label: "untuk batch" },
  ];
  const h = rowBottom(shift, att, labor, batch) + 40 + 64;
  return svgDoc("pf-sdm", "SDM", "Setiap orang punya satu catatan, dengan atau tanpa akun login. Dari sana tersambung kontrak, izin, jadwal, absensi, dan jam kerja per batch.", h, [profile, person, contract, leave, shift, att, labor, batch], rels, ["focal", "entity", "ref", "pk", "fk", "card"]);
}

/* ================================================================== biaya */
function bisnis() {
  const y1 = 60;
  const move = E(COL[1], y1, "referensi · inventory", "pf_stock_move", [["# id", "uuid"], ["qty", "numeric"], ["→ batch_id", "uuid"]], "ref");
  const batch = E(COL[2], y1, "referensi · budidaya", "pf_batch", [["# id", "uuid"], ["code", "text"], ["status", "enum"]], "ref");
  const cost = E(COL[3], y1, "entitas inti", "pf_cost_entry", [["# id", "uuid"], ["→ batch_id", "uuid"], ["category", "enum"], ["amount_idr", "numeric"], ["source_type", "text"], ["source_id", "uuid"], ["period", "date"]], "focal");
  const y2 = rowBottom(move, batch, cost) + 80;
  const asset = E(COL[0], y2, "referensi · fondasi", "pf_asset", [["# id", "uuid"], ["kind", "enum"], ["status", "enum"]], "ref");
  const mplan = E(COL[1], y2, "entitas", "pf_maintenance_plan", [["# id", "uuid"], ["→ asset_id", "uuid"], ["interval_days", "int"], ["last_done_at", "timestamptz"], ["next_due", "date"]]);
  const wo = E(COL[2], y2, "entitas", "pf_work_order", [["# id", "uuid"], ["→ asset_id", "uuid"], ["→ plan_id", "uuid · null = korektif"], ["opened_at", "timestamptz"], ["closed_at", "timestamptz"], ["parts_cost_idr", "numeric"], ["→ technician_id", "uuid"]]);
  const labor = E(COL[3], y2, "referensi · sdm", "pf_labor_log", [["# id", "uuid"], ["→ batch_id", "uuid"], ["minutes", "int"]], "ref");
  const yA = y1 + 74;
  const yB = y2 + 74;
  const cb = cost.y + hOf(cost);
  const rels = [
    { pts: [[COL[1] + W, yA], [COL[2], yA]], label: "bahan", dashed: true },
    { pts: [[COL[2] + W, yA], [COL[3], yA]], c1: "1", c2: "N", label: "biaya" },
    { pts: [[COL[0] + W, yB], [COL[1], yB]], c1: "1", c2: "N", label: "jadwal" },
    { pts: [[COL[1] + W, yB], [COL[2], yB]], c1: "1", c2: "N", label: "terbitkan" },
    { pts: [[COL[3] + W * 0.75, y2], [COL[3] + W * 0.75, cb]], label: "tenaga kerja", labelPos: "right", dashed: true },
    { pts: [[COL[2] + W * 0.3, y2], [COL[2] + W * 0.3, y2 - 36], [COL[3] + W * 0.25, y2 - 36], [COL[3] + W * 0.25, cb]], label: "suku cadang", dashed: true },
  ];
  const h = rowBottom(asset, mplan, wo, labor) + 40 + 64;
  return svgDoc("pf-bisnis", "Biaya dan pemeliharaan", "Bahan, tenaga kerja, dan suku cadang menjadi entri biaya yang dialokasikan ke batch. Perangkat punya jadwal perawatan dan catatan perbaikan.", h, [move, batch, cost, asset, mplan, wo, labor], rels, ["focal", "entity", "ref", "pk", "fk", "card", "derived"]);
}

/* ========================================================== plain diagrams */
function node(x, y, w, h, tag, name, sub, kind = "normal") {
  const stroke = kind === "focal" ? C.accent : kind === "ext" ? C.muted : C.ink;
  const fill = kind === "focal" ? C.accentTint : kind === "ext" ? C.tint : "#FFFFFF";
  const dash = kind === "ext" ? ' stroke-dasharray="4,3"' : "";
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${C.paper}"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="${stroke}"${dash}/>` +
    `<text x="${x + 14}" y="${y + 20}" fill="${kind === "focal" ? C.accent : C.muted}" font-size="10" font-weight="500" letter-spacing="0.03em">${esc(tag)}</text>` +
    `<text x="${x + 14}" y="${y + 40}" fill="${C.ink}" font-size="14" font-weight="600" letter-spacing="-0.01em">${esc(name)}</text>` +
    `<text x="${x + 14}" y="${y + 58}" fill="${C.muted}" font-size="10.5">${esc(sub)}</text>`;
}
function arrow(pts, label, { color = C.muted, dashed = false, labelPos } = {}) {
  const r = rel({ pts, label, dashed, labelPos });
  const marker = color === C.accent ? "arr-accent" : color === C.link ? "arr-link" : "arr";
  return {
    line: r.line.replace(`stroke="${C.muted}"`, `stroke="${color}"`).replace("/>", ` marker-end="url(#${marker})"/>`),
    marks: r.marks,
  };
}
const arrowDefs = (id) => `<defs>
<pattern id="dots-${id}" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill="rgba(15,47,54,0.10)"/></pattern>
<marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${C.muted}"/></marker>
<marker id="arr-accent" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${C.accent}"/></marker>
<marker id="arr-link" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="${C.link}"/></marker>
</defs>`;

function moduleMap() {
  const NH = 72;
  const a = [
    arrow([[605, 190], [605, 114]], "ringkasan semua modul", { labelPos: "right" }),
    arrow([[280, 215], [483, 215]], "benih, media, nutrisi", { color: C.accent, labelPos: "above" }),
    arrow([[725, 215], [928, 215]], "lot panen", { color: C.accent, labelPos: "above" }),
    arrow([[300, 416], [380, 416], [380, 248], [483, 248]], "lokasi + waktu", { labelPos: "right" }),
    arrow([[910, 416], [830, 416], [830, 248], [727, 248]], "tugas, jam kerja", { labelPos: "right" }),
    arrow([[605, 262], [605, 378]], "bahan, jam kerja, hasil kg", { labelPos: "right" }),
  ];
  const nodes =
    node(485, 40, 240, NH, "pimpinan dan manajer", "Dashboard", "hanya membaca, tidak menyimpan data") +
    node(485, 190, 240, NH, "pusat data", "Budidaya: batch", "semai, pindah tanam, tumbuh, panen", "focal") +
    node(40, 190, 240, NH, "yang masuk", "Inventory", "benih, media, nutrisi, kemasan") +
    node(930, 190, 240, NH, "yang keluar", "Penjualan", "pelanggan, pesanan, pengiriman") +
    node(60, 380, 240, NH, "kondisi", "Monitoring", "suhu, RH, VPD, CO2, pH, EC, DO") +
    node(485, 380, 240, NH, "hasil hitungan", "Biaya", "biaya per batch dan per kg") +
    node(910, 380, 240, NH, "orang", "SDM", "jadwal, absensi, kontrak, tugas");
  const H = 480;
  return `<div class="scroll"><svg viewBox="0 0 ${VBW} ${H}" style="min-width:${VBW}px" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pf-map-title pf-map-desc" font-family="${F}">
<title id="pf-map-title">Peta modul ERP</title>
<desc id="pf-map-desc">Budidaya berada di tengah. Inventory memasok bahan ke batch, batch menghasilkan lot panen untuk penjualan, monitoring dan SDM terhubung ke batch, biaya dihitung dari batch, dan dashboard membaca ringkasan.</desc>
${arrowDefs("map")}
<rect width="100%" height="100%" fill="${C.paper}"/>
<rect width="100%" height="100%" fill="url(#dots-map)" opacity="0.55"/>
${a.map((x) => x.line).join("\n")}
${nodes}
${a.map((x) => x.marks).join("\n")}
</svg></div>`;
}

function architecture() {
  const NH = 72;
  const zone = (x, y, w, h, label) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="none" stroke="${C.rule}" stroke-dasharray="4,4"/>` +
    `<text x="${x + 14}" y="${y + 22}" fill="${C.muted}" font-size="11" font-weight="500" letter-spacing="0.03em">${esc(label)}</text>`;
  const a = [
    arrow([[284, 124], [854, 124]], "HTTPS + token perangkat", { color: C.accent, labelPos: "above" }),
    arrow([[284, 252], [800, 252], [800, 152], [854, 152]], "HTTPS + token perangkat", { color: C.accent, labelPos: "above" }),
    arrow([[966, 172], [966, 234]], "RPC pf_ingest", { color: C.accent, labelPos: "right" }),
    arrow([[966, 400], [966, 310]], "anon key + RLS", { color: C.link, labelPos: "right" }),
    arrow([[856, 290], [700, 290], [700, 398]], "alarm", { dashed: true, labelPos: "right" }),
  ];
  const nodes =
    node(64, 100, 220, NH, "lapangan", "Sensor mikroklimat", "suhu, RH, VPD, CO2") +
    node(64, 216, 220, NH, "lapangan", "Sensor nutrisi", "pH, EC, DO, suhu larutan") +
    node(856, 100, 220, NH, "server nitro", "/api/pf/ingest", "periksa token dan rentang nilai", "focal") +
    node(856, 236, 220, NH, "supabase", "Postgres + RLS", "tabel pf_*, ringkasan per jam") +
    node(590, 400, 220, NH, "eksternal", "Email peringatan", "WhatsApp dan Telegram nanti", "ext") +
    node(856, 400, 220, NH, "web · ponsel dan laptop", "ERP smartagri", "dashboard, input operator, 3D");
  const H = 500;
  return `<div class="scroll"><svg viewBox="0 0 ${VBW} ${H}" style="min-width:${VBW}px" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="pf-arch-title pf-arch-desc" font-family="${F}">
<title id="pf-arch-title">Jalur data sensor</title>
<desc id="pf-arch-desc">Sensor mikroklimat dan sensor nutrisi mengirim data lewat HTTPS dengan token perangkat ke route server, yang menyimpannya ke Postgres. ERP membaca dari Postgres, dan alarm dikirim lewat email. Tidak ada perintah yang kembali ke alat.</desc>
${arrowDefs("arch")}
<rect width="100%" height="100%" fill="${C.paper}"/>
<rect width="100%" height="100%" fill="url(#dots-arch)" opacity="0.55"/>
${zone(40, 52, 268, 256, "Plant factory dan chamber")}
${zone(832, 52, 268, 276, "Cloud · smart-agri.id")}
${a.map((x) => x.line).join("\n")}
${nodes}
${a.map((x) => x.marks).join("\n")}
</svg></div>`;
}

/* ================================================================ content */
const STORY = [
  ["Benih dibeli", "Staf mencatat benih yang datang, lengkap dengan nomor lot dan tanggal kedaluwarsa.", "Manajer produksi", "pf_stock_lot, pf_stock_move", "Stok benih di Inventory bertambah."],
  ["Batch dibuat", "Manajer menentukan tanaman, resep, dan lot benih. Batch mendapat kode, misalnya B-125.", "Manajer produksi", "pf_batch", "Versi resep terkunci, jadi nilai acuan batch ini tidak berubah kalau resep diedit nanti."],
  ["Disemai di chamber", "Operator memilih nampan di ponsel dan mengisi jumlah benih.", "Operator", "pf_batch_slot, pf_batch_event", "Stok benih berkurang. Nampan tampil terisi di model 3D."],
  ["Germinasi", "Operator mencatat jumlah yang berkecambah. Sensor terus mengirim kondisi.", "Operator, sensor", "pf_batch_event, pf_sensor_reading", "Daya kecambah terhitung. Kondisi yang menyimpang dari acuan memicu alarm."],
  ["Pindah tanam", "Bibit pindah dari nampan ke lubang, seperti alur yang sudah ada di prototipe.", "Operator", "pf_batch_slot, pf_batch_event, pf_stock_move", "Nampan kosong, lubang terisi dan mencatat nampan asalnya. Media tanam berkurang."],
  ["Masa tumbuh", "Operator mengerjakan tugas, mencatat pengamatan dan tanaman yang bermasalah, bisa dengan foto.", "Operator", "pf_task, pf_batch_event, pf_labor_log", "Jam kerja masuk ke batch. Dashboard menampilkan perkiraan panen."],
  ["Panen", "Hasil ditimbang lalu sampelnya diukur: berat, ukuran, warna, tekstur, dan cacat. Sistem membandingkannya dengan standar dan mengusulkan grade. Setiap grade menjadi satu lot panen.", "Operator, QC", "pf_harvest_lot, pf_qc_inspection, pf_qc_measurement", "Lubang kosong dan masuk sanitasi. Lot panen siap dijual."],
  ["Dijual", "Staf membuat pesanan, memilih lot panen yang dikirim, lalu menerbitkan invoice, dengan atau tanpa pajak.", "Staf penjualan", "pf_sales_order, pf_so_line, pf_delivery, pf_invoice, pf_payment", "Sisa kg lot panen berkurang, pesanan tersambung ke batch, dan status bayar terpantau."],
  ["Biaya dihitung", "Sistem mengumpulkan bahan, jam kerja, dan biaya lain, lalu membaginya dengan berat panen.", "Otomatis", "pf_cost_entry", "Biaya per kg batch ini bisa dibandingkan dengan harga jual."],
];

const TRACE = [
  ["Pesanan", "SO-0231, Pelanggan A", "pf_sales_order"],
  ["Lot panen", "H-0412, 12 kg, grade A", "pf_so_line → pf_harvest_lot"],
  ["Batch", "B-121, Kangkung, resep RSP-KAN-01 v1", "pf_harvest_lot → pf_batch"],
  ["Benih", "Lot KG-2610, kedaluwarsa Mei 2027", "pf_batch → pf_stock_lot"],
  ["Tempat", "Nampan CH1-S1-P01, lalu lubang R1-T3-G1-H01", "pf_batch_slot"],
  ["Kondisi", "Suhu, RH, pH, EC selama batch berada di tempat itu", "pf_sensor_reading, lewat lokasi + waktu"],
  ["Orang", "Siapa menyemai, memindahkan, dan memanen", "pf_batch_event, pf_labor_log"],
];

const METRICS = [
  ["Mikroklimat", "Suhu udara", "temp_c", "°C", "Tiap rak dan chamber"],
  ["Mikroklimat", "Kelembapan", "rh_pct", "% RH", "Tiap rak dan chamber"],
  ["Mikroklimat", "VPD", "vpd_kpa", "kPa", "Dihitung dari suhu dan RH bila alat tidak mengirimnya"],
  ["Mikroklimat", "CO2", "co2_ppm", "ppm", "Ruang tumbuh"],
  ["Nutrisi", "pH", "ph", "", "Tandon"],
  ["Nutrisi", "EC", "ec_ms", "mS/cm", "Tandon"],
  ["Nutrisi", "Oksigen terlarut (DO)", "do_mgl", "mg/L", "Tandon"],
  ["Nutrisi", "Suhu larutan", "solution_temp_c", "°C", "Tandon"],
];

const LINKS = [
  ["Operator mencatat semai", "Budidaya", "Stok benih berkurang", "Inventory"],
  ["Operator mencatat pindah tanam", "Budidaya", "Nampan dan lubang berubah warna di model 3D", "Plant factory, Persemaian"],
  ["Sensor mengirim pH di luar rentang", "Monitoring", "Alarm muncul, lalu menjadi tugas untuk operator", "Dashboard, Budidaya, SDM"],
  ["Stok nutrisi di bawah batas", "Inventory", "Peringatan stok, bahan untuk pesanan pembelian", "Dashboard"],
  ["Panen ditimbang", "Budidaya", "Lot panen tersedia untuk dijual", "Penjualan"],
  ["Lot panen dipilih di pesanan", "Penjualan", "Pesanan tersambung ke batch, sisa kg berkurang", "Budidaya, traceability"],
  ["Operator menyelesaikan tugas", "SDM", "Jam kerja masuk ke biaya batch", "Biaya"],
  ["Jadwal dan absensi berbeda", "SDM", "Muncul di daftar yang perlu dicek koordinator", "Dashboard"],
];

const ROLES = [
  ["Pimpinan", "Kepala lab, penanggung jawab", "Lihat semua", "Lihat", "Lihat", "Lihat", "Lihat", "Lihat, termasuk kontrak", "Lihat audit"],
  ["Admin sistem", "Pengelola akun dan teknis", "Lihat semua", "Lihat", "Lihat", "Lihat", "Lihat", "Data dasar, tanpa kontrak", "Kelola"],
  ["Manajer produksi", "Mengatur budidaya harian", "Produksi", "Kelola", "Kelola alarm", "Kelola", "Lihat", "Jadwal tim", "Tidak ada"],
  ["Staf penjualan", "Pesanan dan tagihan", "Penjualan", "Lihat lot panen", "Tidak ada", "Lihat", "Kelola", "Data diri", "Tidak ada"],
  ["Staf SDM", "Data orang, kontrak, absensi", "SDM", "Tidak ada", "Tidak ada", "Tidak ada", "Tidak ada", "Kelola", "Tidak ada"],
  ["Teknisi", "Sensor, kalibrasi, perbaikan", "Perangkat", "Lihat", "Kelola perangkat", "Input suku cadang", "Tidak ada", "Data diri", "Tidak ada"],
  ["Operator", "Pencatatan di fasilitas", "Tugas hari ini", "Input", "Lihat", "Input pemakaian", "Tidak ada", "Data diri, absen", "Tidak ada"],
  ["Peneliti dan mahasiswa", "Memakai data untuk riset", "Produksi", "Lihat", "Lihat", "Tidak ada", "Tidak ada", "Data diri, absen", "Tidak ada"],
];

const GRADE_PARAMS = [
  ["Berat per tanaman", "Timbang sampel", "gram", "Batas grade, batch lain, resep lain"],
  ["Ukuran", "Tinggi dan diameter tajuk", "cm", "Batas grade, batch lain"],
  ["Jumlah daun", "Hitung pada sampel", "helai", "Resep lain"],
  ["Warna", "Bagan warna, atau SPAD kalau tersedia", "skor 1–5 atau nilai SPAD", "Batas grade, foto acuan"],
  ["Tekstur", "Penilaian kerenyahan dan kesegaran daun", "skor 1–5", "Batas grade, foto acuan"],
  ["Cacat", "Tipburn, layu, dan daun rusak pada sampel", "% sampel", "Batas grade"],
];

const STAGES = [
  ["0", "Dasar", ["Commit pekerjaan", "Lepas kontrol alat dari Persemaian", "Pindah alamat ke /erp", "ERD ini disetujui"]],
  ["1", "Fondasi", ["Lokasi, tanaman, resep", "Peran dan audit log", "Kerangka menu dan dashboard awal"]],
  ["2", "Budidaya + sensor", ["Batch dari semai sampai panen", "Standar grade dan QC panen", "Input dari ponsel", "API sensor, grafik, alarm"]],
  ["3", "Penjualan", ["Pelanggan dan pesanan", "Alokasi lot panen, traceability", "Invoice dengan pajak opsional"]],
  ["4", "Inventory", ["Stok per lot", "Pemakaian otomatis per batch", "Pembelian"]],
  ["5", "SDM", ["Data orang dan kontrak", "Jadwal, izin, absensi dengan lokasi dan foto", "Jam kerja per batch"]],
  ["6", "Biaya", ["Biaya per batch dan per kg", "Pemeliharaan perangkat", "Laporan"]],
];

const tr = (cells, cls = "") => `<tr>${cells.map((c, i) => `<td${i === 0 && cls ? ` class="${cls}"` : ""}>${esc(c)}</td>`).join("")}</tr>`;
const code = (s) => s.split(", ").map((x) => `<code>${esc(x)}</code>`).join(" ");

const FONT_LINK = `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">`;
const STYLE = `<style>
:root{--paper:${C.paper};--ink:${C.ink};--muted:${C.muted};--rule:${C.rule};--accent:${C.accent};--link:${C.link};--tint:${C.accentTint};--card:#FFFFFF;color-scheme:light}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;font-family:Inter,system-ui,sans-serif;background:var(--paper);color:var(--ink);line-height:1.55;font-size:16px;padding-block:48px 96px;padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px))}
.frame{max-width:1240px;margin:0 auto}
.narrow{max-width:760px}
.eyebrow{font-size:13px;font-weight:500;letter-spacing:.03em;color:var(--accent);margin:0 0 8px}
h1{font-size:clamp(30px,4vw,46px);font-weight:600;letter-spacing:-.035em;line-height:1.1;margin:0 0 14px;text-wrap:balance}
h1 em{font-style:normal;color:var(--accent)}
.lead{font-size:18px;color:var(--muted);margin:0}
section{margin-top:64px;scroll-margin-top:16px}
h2{font-size:26px;font-weight:600;letter-spacing:-.025em;line-height:1.2;margin:0 0 8px;text-wrap:balance}
h3{font-size:17px;font-weight:600;letter-spacing:-.02em;margin:28px 0 6px}
p{margin:0 0 12px}
.sub{color:var(--muted);max-width:760px;margin-bottom:20px}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.86em;background:rgba(15,47,54,.06);border-radius:4px;padding:1px 5px;white-space:nowrap}
pre{margin:0;overflow-x:auto;background:#08313A;color:#E7F6F4;border-radius:8px;padding:16px;font-size:13px;line-height:1.55;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.scroll{overflow-x:auto;border:1px solid var(--rule);border-radius:8px;background:var(--paper)}
svg{display:block;width:100%}
.toc{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.toc a{font-size:14px;font-weight:500;color:var(--link);text-decoration:none;border:1px solid var(--rule);border-radius:6px;padding:6px 12px;background:var(--card)}
.toc a:hover,.toc a:focus-visible{border-color:var(--accent)}
.key{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-top:8px}
.key>div{min-width:0;border-top:2px solid var(--accent);padding-top:12px}
.key b{display:block;font-weight:600;margin-bottom:2px}
.key p{color:var(--muted);font-size:15px;margin:0}
.table{overflow-x:auto;border:1px solid var(--rule);border-radius:8px;background:var(--card)}
table{border-collapse:collapse;width:100%;font-size:14px}
th{text-align:left;font-weight:500;font-size:13px;color:var(--muted);background:rgba(15,47,54,.04)}
th,td{padding:10px 14px;border-bottom:1px solid var(--rule);vertical-align:top}
tr:last-child td{border-bottom:0}
td:first-child{font-weight:500}
.nowrap td{white-space:nowrap}
.story{list-style:none;margin:0;padding:0;counter-reset:s;display:grid;gap:0}
.story li{counter-increment:s;display:grid;grid-template-columns:44px minmax(0,1fr);gap:0 14px;padding-bottom:22px;position:relative}
.story li::before{content:counter(s);width:32px;height:32px;border-radius:50%;background:var(--accent);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:600;grid-row:1 / span 4}
.story li:not(:last-child)::after{content:"";position:absolute;left:15px;top:32px;bottom:0;width:2px;background:rgba(20,145,155,.3)}
.story h3{margin:4px 0 2px}
.story p{margin:0 0 6px;color:var(--ink)}
.story .eff{color:var(--muted);font-size:14.5px}
.story .tbl{font-size:13px;color:var(--muted);display:flex;flex-wrap:wrap;gap:4px 6px;align-items:baseline}
.trace{display:grid;gap:8px;margin:0;padding:0;list-style:none}
.trace li{display:grid;grid-template-columns:96px minmax(0,1fr) auto;gap:4px 14px;align-items:baseline;background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:10px 14px}
.trace b{font-weight:600;color:var(--accent);font-size:14px}
.trace small{color:var(--muted);font-size:12.5px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.levels{display:grid;gap:8px;margin-bottom:20px}
.levels div{display:grid;grid-template-columns:150px minmax(0,1fr);gap:4px 14px;padding:10px 14px;background:var(--card);border:1px solid var(--rule);border-radius:8px}
.levels b{font-weight:600}
.legend-card{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
.legend-card div{background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:12px 14px;min-width:0}
.legend-card b{display:block;font-weight:600;margin-bottom:2px}
.legend-card span{color:var(--muted);font-size:14.5px}
.mod{margin-top:40px}
.mod p{max-width:760px}
.note{font-size:14.5px;color:var(--muted);max-width:760px;margin-top:14px}
.stages{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(170px,1fr);gap:10px;overflow-x:auto;padding-bottom:4px}
.stage{background:var(--card);border:1px solid var(--rule);border-radius:8px;padding:14px}
.stage.now{border-color:var(--accent);background:var(--tint)}
.stage p{font-size:13px;font-weight:500;letter-spacing:.03em;color:var(--accent);margin:0}
.stage h3{margin:2px 0 8px;font-size:16px}
.stage ul{list-style:none;margin:0;padding:0;font-size:13.5px}
.stage li{padding:5px 0;border-top:1px solid var(--rule)}
.ask{margin:0;padding-left:20px;max-width:760px}
.ask li{margin-bottom:8px}
@media (max-width:640px){.trace li{grid-template-columns:minmax(0,1fr)}.levels div{grid-template-columns:minmax(0,1fr)}code{white-space:normal}}
.minor{font-size:16px;font-weight:500;letter-spacing:-.02em;margin:26px 0 6px}.plain{margin:8px 0 0;padding-left:20px;font-size:14.5px;line-height:1.6}.plain li{margin:4px 0}
</style>`;

const BODY = `<div class="frame">
<p class="eyebrow">smartagri · ERP SARC UGM</p>
<h1>Peta data <em>ERP</em> smartagri</h1>
<p class="lead narrow">Penjelasan cara semua modul saling terhubung, dengan bahasa sehari-hari dulu, lalu ERD lengkapnya.</p>
<nav class="toc" aria-label="Isi halaman"><a href="#inti">Inti</a><a href="#baca">Cara membaca ERD</a><a href="#peta">Peta modul</a><a href="#cerita">Perjalanan satu batch</a><a href="#telusur">Traceability</a><a href="#sensor">Data sensor</a><a href="#hubungan">Saling memengaruhi</a><a href="#peran">Peran</a><a href="#erd">ERD lengkap</a><a href="#urutan">Urutan kerja</a><a href="#tanya">Perlu dikonfirmasi</a></nav>

<section id="inti"><h2>Tiga hal yang perlu diingat</h2>
<p class="sub">Kalau hanya sempat membaca satu bagian, baca ini. Hampir semua garis di ERD berasal dari tiga gagasan ini.</p>
<div class="key">
<div><b>Batch adalah pusatnya</b><p>Batch adalah satu kelompok tanaman yang disemai bersama. Bahan, tempat, pekerjaan, panen, dan penjualan semuanya menunjuk ke batch.</p></div>
<div><b>Lokasi + waktu menyambungkan sensor</b><p>Sensor tidak tahu batch apa yang sedang tumbuh. Sistem mencari batch yang berada di lokasi itu pada waktu itu.</p></div>
<div><b>Lot menjaga jejak</b><p>Benih punya nomor lot, panen punya nomor lot. Dua nomor ini membuat produk bisa ditelusuri dari pelanggan sampai ke benihnya.</p></div>
</div></section>

<section id="baca"><h2>Cara membaca ERD</h2>
<p class="sub">ERD hanyalah gambar buku-buku catatan dan cara mereka saling merujuk.</p>
<div class="legend-card">
<div><b>Kotak = satu buku catatan</b><span>Disebut tabel. <code>pf_batch</code> adalah buku catatan semua batch.</span></div>
<div><b>Baris = kolom yang diisi</b><span>Seperti kolom di formulir: kode, tanggal semai, dan seterusnya.</span></div>
<div><b># = nomor unik</b><span>Seperti NIK. Setiap catatan punya satu, dan tidak ada yang sama.</span></div>
<div><b>→ = menunjuk catatan lain</b><span><code>→ batch_id</code> di lot panen artinya: panen ini berasal dari batch yang itu.</span></div>
<div><b>1 dan N = satu lawan banyak</b><span>Satu batch (1) bisa punya banyak lot panen (N). Satu lot panen hanya berasal dari satu batch.</span></div>
<div><b>Garis putus-putus = hubungan hitungan</b><span>Tidak ada kolom yang menunjuk langsung. Hubungannya dicari lewat lokasi dan waktu, atau hasil ringkasan.</span></div>
</div></section>

<section id="peta"><h2>Peta modul</h2>
<p class="sub">Versi paling sederhana, sebelum masuk ke tabel. Panah hijau toska adalah jalur utama barang: bahan masuk, menjadi tanaman, lalu dijual.</p>
${moduleMap()}
</section>

<section id="cerita"><h2>Perjalanan satu batch</h2>
<p class="sub">Inilah cara termudah memahami ERD: ikuti satu kelompok tanaman dari awal sampai terjual. Setiap langkah menunjukkan siapa yang mencatat, di tabel mana, dan apa yang ikut berubah.</p>
<ol class="story narrow">
${STORY.map(([t, what, who, tables, eff]) => `<li><h3>${esc(t)}</h3><p>${esc(what)}</p><p class="eff">Ikut berubah: ${esc(eff)}</p><div class="tbl"><span>${esc(who)} ·</span> ${code(tables)}</div></li>`).join("\n")}
</ol>
</section>

<section id="telusur"><h2>Traceability: menelusuri dari pelanggan ke benih</h2>
<p class="sub">Misalkan pelanggan melaporkan masalah pada kangkung yang diterimanya. Dengan nomor pesanan saja, sistem bisa berjalan mundur seperti ini. Kode di bawah hanya contoh.</p>
<ol class="trace narrow">
${TRACE.map(([a, b, c]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span><small>${esc(c)}</small></li>`).join("\n")}
</ol>
<p class="note">Bisa juga berjalan maju. Kalau satu lot benih bermasalah, sistem langsung tahu batch, lot panen, dan pelanggan mana saja yang terkena.</p>
<p class="note">Syaratnya satu aturan sederhana: setiap baris pesanan wajib memilih lot panen, dan satu batch hanya memakai satu lot benih. Kalau benihnya campur, buat dua batch.</p>
</section>

<section id="sensor"><h2>Data sensor masuk ke ERP</h2>
<p class="sub">Alurnya satu arah, dari alat ke ERP. Sesuai status saat ini, ERP hanya memantau dan tidak mengirim perintah apa pun ke alat.</p>
${architecture()}
<h3>Yang dipantau</h3>
<div class="table"><table><thead><tr><th>Kelompok</th><th>Ukuran</th><th>Nama di sistem</th><th>Satuan</th><th>Usulan letak</th></tr></thead><tbody>
${METRICS.map((m) => tr(m)).join("\n")}
</tbody></table></div>
<h3>Bentuk kiriman yang diusulkan</h3>
<p class="narrow">Setiap alat punya token sendiri, jadi alat yang hilang bisa dicabut tanpa mengganggu yang lain. Kiriman yang sama boleh terulang tanpa membuat data ganda, jadi alat aman mengirim ulang setelah internet putus.</p>
<pre>POST https://smart-agri.id/api/pf/ingest
Authorization: Bearer &lt;token alat&gt;

{
  "readings": [
    { "metric": "ph",     "value": 5.92, "ts": "2026-11-04T07:30:00Z" },
    { "metric": "ec_ms",  "value": 1.62, "ts": "2026-11-04T07:30:00Z" },
    { "metric": "do_mgl", "value": 7.40, "ts": "2026-11-04T07:30:00Z" }
  ]
}</pre>
<h3>Bagaimana sistem tahu nilainya menyimpang</h3>
<p class="narrow">Resep menyimpan rentang acuan per fase, misalnya pH 5,8 sampai 6,2 saat vegetatif. Saat bacaan masuk, sistem melihat batch apa yang ada di lokasi itu, mengambil acuan dari fase resepnya, lalu membandingkan. Kalau menyimpang cukup lama, alarm muncul di dashboard dan email terkirim. Tindak lanjutnya dikerjakan orang, lalu dicatat sebagai tugas.</p>
</section>

<section id="hubungan"><h2>Modul saling memengaruhi</h2>
<p class="sub">Inilah arti "terintegrasi": satu catatan cukup diisi sekali, dan modul lain ikut berubah.</p>
<div class="table"><table><thead><tr><th>Saat terjadi</th><th>Dicatat di</th><th>Maka otomatis</th><th>Terlihat di</th></tr></thead><tbody>
${LINKS.map((m) => tr(m)).join("\n")}
</tbody></table></div>
</section>

<section id="peran"><h2>Hierarki dan hak akses</h2>
<p class="sub">Ada dua hal yang sengaja dipisah. Atasan langsung menjawab "siapa melapor ke siapa". Peran menjawab "boleh membuka dan mengubah apa". Satu orang boleh memegang beberapa peran, yang wajar untuk tim lab yang kecil.</p>
<div class="levels">
<div><b>1 · Pimpinan</b><span>Melihat semuanya dan menyetujui hal penting. Admin sistem ada di tingkat yang sama, tetapi hanya mengurus akun dan tidak melihat kontrak.</span></div>
<div><b>2 · Koordinator</b><span>Manajer produksi, Staf penjualan, dan Staf SDM. Masing-masing mengelola modulnya.</span></div>
<div><b>3 · Pelaksana</b><span>Teknisi dan Operator, di bawah Manajer produksi. Mengisi data dari ponsel atau laptop.</span></div>
<div><b>4 · Pengamat</b><span>Peneliti dan mahasiswa, melapor ke pembimbingnya. Melihat data budidaya dan sensor untuk riset.</span></div>
</div>
<div class="table"><table><thead><tr><th>Peran</th><th>Tugas</th><th>Dashboard</th><th>Budidaya</th><th>Monitoring</th><th>Inventory</th><th>Penjualan</th><th>SDM</th><th>Pengaturan</th></tr></thead><tbody>
${ROLES.map((m) => tr(m)).join("\n")}
</tbody></table></div>
<p class="note"><b>Kelola</b> berarti membuat, mengubah, dan menyetujui. <b>Input</b> berarti menambah catatan dan memperbaiki catatan sendiri. <b>Lihat</b> berarti hanya membaca. Alumni dan mitra tidak mendapat akses ERP kecuali diberi peran.</p>
<p class="note">Catatan produksi dan penjualan tidak dihapus, melainkan dikoreksi dengan catatan baru, dan semua perubahan masuk audit log. Aturan ini ditegakkan di database, bukan hanya dengan menyembunyikan tombol.</p>
</section>

<section id="erd"><h2>ERD lengkap per modul</h2>
<p class="sub">Sekarang gambarnya seharusnya lebih mudah dibaca. Kotak bergaris putus-putus adalah tabel dari modul lain, yang digambar lagi hanya untuk menunjukkan sambungannya.</p>

<div class="mod" id="overview"><h3>Gambaran besar</h3>
<p>Delapan tabel tulang punggung. Baris atas adalah jalan batch sampai terjual. Baris bawah menjelaskan benih yang dipakai dan tempat batch berada.</p>
${overview()}</div>

<div class="mod" id="fondasi"><h3>Fondasi</h3>
<p>Data yang jarang berubah dan dipakai semua modul. <code>pf_location</code> memuat seluruh tempat dalam satu pohon: site, ruang, lalu rak, tingkat, talang, lubang, atau chamber, rak chamber, posisi nampan. Resep tidak pernah ditimpa: perubahan membuat versi baru.</p>
${fondasi()}
<p class="note">Tidak digambar: <code>pf_audit_log</code>, yang mencatat siapa mengubah apa, kapan, dari nilai apa ke nilai apa. Tabel ini terisi otomatis dari tabel penting.</p></div>

<div class="mod" id="produksi"><h3>Budidaya</h3>
<p><code>pf_batch_slot</code> adalah buku tamu tempat: batch masuk kapan, keluar kapan. Pindah tanam cukup menutup baris nampan dan membuka baris lubang, dengan <code>source_slot_id</code> menunjuk nampan asalnya. <code>pf_batch_event</code> adalah buku harian batch.</p>
${produksi()}</div>

<div class="mod" id="iot"><h3>Monitoring</h3>
<p>Bacaan mentah disimpan per bulan dan diringkas per jam, supaya grafik tetap cepat. <code>pf_ingest_log</code> menunjukkan alat mana yang berhenti mengirim. Tabel setpoint dan log perintah alat dihapus dari rancangan lama, karena ERP hanya memantau.</p>
${iot()}</div>

<div class="mod" id="penjualan"><h3>Penjualan dan traceability</h3>
<p><code>pf_so_line</code> adalah kunci telusur: isi pesanan selalu menunjuk lot panen tertentu. <code>pf_partner</code> dipakai untuk pelanggan dan pemasok.</p>
${penjualan()}
<h3 class="minor">Invoice dan pajak</h3>
<p>Invoice dibuat dari pesanan, bernomor urut unik, dan bisa diunduh sebagai PDF. Pajak bersifat opsional per invoice. Tarifnya dipilih dari <code>pf_tax_rate</code> dan disalin ke invoice, sehingga invoice lama tidak berubah kalau tarif berganti. <code>pf_payment</code> mencatat pembayaran, termasuk cicilan. Invoice yang sudah terbit tidak diedit, melainkan dibatalkan dan diganti. Versi ini menghitung pajak di invoice, tetapi belum menerbitkan faktur pajak resmi lewat sistem DJP.</p>
<h3 class="minor">Standar grade panen</h3>
<p>Usulan awal: tiga grade per tanaman, yaitu A, B, dan Afkir. Standar disimpan sebagai data berversi, sehingga mudah diubah tanpa mengubah aplikasi. Sistem mengusulkan grade dari kriteria terlemah, dan petugas QC yang memastikan. Karena hasil ukurnya tersimpan, batch dan resep bisa dibandingkan, misalnya berat rata-rata dua resep berbeda.</p>
<div class="table"><table><thead><tr><th>Parameter</th><th>Cara ukur</th><th>Satuan</th><th>Dibandingkan dengan</th></tr></thead><tbody>
${GRADE_PARAMS.map((m) => tr(m)).join("\n")}
</tbody></table></div>
<p class="note">Agar gambar tetap terbaca, dua sambungan tidak digambar: <code>pf_qc_inspection</code> dan <code>pf_harvest_lot</code> sama-sama menunjuk <code>pf_grade</code>, dan <code>pf_qc_inspection</code> menunjuk <code>pf_harvest_lot</code> yang diperiksa.</p>
<p class="note">Batas angka tiap grade sengaja belum ditetapkan, karena berbeda per tanaman dan perlu diambil dari data panen tim. Sampai ada datanya, batas diisi oleh Manajer produksi, dan hasil ukur tetap tersimpan untuk menentukan batas itu.</p></div>

<div class="mod" id="inventori"><h3>Inventory</h3>
<p>Stok tidak diubah langsung. Setiap perubahan adalah satu baris mutasi, sehingga selisih stok selalu bisa dilacak. Ini terpisah dari <code>/inventory</code> yang sudah ada, yang mengurus peminjaman instrumen lab.</p>
${inventori()}</div>

<div class="mod" id="sdm"><h3>SDM</h3>
<p><code>pf_person</code> memuat semua orang: karyawan, peneliti, mahasiswa, magang, dan pekerja harian. Tidak semua orang punya akun login, jadi tabel ini terpisah dari <code>profiles</code>. <code>pf_contract</code> sensitif dan hanya terbuka untuk Staf SDM dan Pimpinan. Penggajian di luar lingkup versi ini.</p>
${sdm()}
<h3 class="minor">Absensi dengan lokasi dan foto</h3>
<p>Saat absen masuk dan pulang, ponsel mengambil lokasi dan foto langsung dari kamera. Lokasi dibandingkan dengan titik dan radius lokasi kerja, lalu hasilnya disimpan di <code>within_area</code>. Absen di luar area tetap tersimpan, tetapi ditandai untuk diperiksa koordinator, supaya tugas lapangan tidak tertolak.</p>
<ul class="plain">
<li><b>Akses:</b> foto ada di bucket Storage privat. Hanya orang yang bersangkutan, Staf SDM, dan Pimpinan yang bisa membukanya.</li>
<li><b>Hanya saat absen:</b> lokasi tidak dilacak terus-menerus.</li>
<li><b>Persetujuan:</b> pengguna diberi tahu dan menyetujui saat pertama kali absen. Lokasi dan foto adalah data pribadi, jadi perlu mengikuti UU PDP.</li>
<li><b>Masa simpan:</b> usulan awal, foto dihapus otomatis setelah 90 hari, sedangkan catatan absensinya tetap ada.</li>
<li><b>Batasnya:</b> lokasi ponsel bisa dipalsukan, dan foto tidak membuktikan identitas secara otomatis. Verifikasi koordinator tetap diperlukan.</li>
</ul></div>

<div class="mod" id="bisnis"><h3>Biaya dan pemeliharaan</h3>
<p>Dibangun paling akhir, karena hanya menghitung dari data modul lain. Biaya per kg sama dengan total biaya batch dibagi berat panen layak jual.</p>
${bisnis()}</div>
</section>

<section id="urutan"><h2>Urutan kerja yang diperbarui</h2>
<p class="sub">Penjualan dimajukan sebelum Inventory, karena hasil panen harus segera tercatat. Agar jejak benih tidak terputus, pencatatan lot benih ikut dibangun sejak tahap Budidaya. Dashboard bertambah kartu setiap modul selesai.</p>
<div class="stages">
${STAGES.map(([n, t, items], i) => `<article class="stage${i === 0 ? " now" : ""}"><p>Tahap ${n}</p><h3>${esc(t)}</h3><ul>${items.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></article>`).join("\n")}
</div>
</section>

<section id="tanya"><h2>Keputusan terbaru</h2>
<p class="sub">Lima pertanyaan sebelumnya sudah terjawab, dan hasilnya sudah masuk ke ERD di atas.</p>
<ol class="ask">
<li><b>Sensor dan chamber:</b> sensor mikroklimat juga dipasang di dalam chamber, jadi chamber dan plant factory memakai jalur data yang sama.</li>
<li><b>Interval dan kemampuan alat:</b> dibahas bersama pengembangan firmware. API menerima waktu bacaan dari alat dan mengabaikan kiriman ganda, sehingga interval berapa pun dan kirim ulang tetap aman.</li>
<li><b>Grade panen:</b> A, B, dan Afkir, dengan ukuran berat, dimensi, warna, tekstur, dan cacat yang dibandingkan dengan standar per tanaman. Batas angkanya menunggu data panen.</li>
<li><b>Tagihan:</b> invoice dengan pajak opsional dan pencatatan pembayaran.</li>
<li><b>Absensi:</b> lokasi dan foto dari ponsel.</li>
</ol>
</section>
</div>`;

const PAGE_TITLE = "Peta Data ERP smartagri";
writeFileSync(OUT, `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${PAGE_TITLE}</title>
${FONT_LINK}
${STYLE}
</head>
<body>
${BODY}
</body>
</html>`);
if (process.argv[3]) {
  writeFileSync(process.argv[3], `<title>${PAGE_TITLE}</title>
<meta name="claude:viewport-fit-sides" content="cover">
${FONT_LINK}
${STYLE}
${BODY}`);
}
console.log("ok", BODY.length);
