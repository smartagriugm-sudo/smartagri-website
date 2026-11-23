// Supabase calls for the instrument inventory. Every change that touches both
// an instrument and its logbook goes through one RPC in
// supabase/inventory-loans.sql, so the two never drift apart.

import { supabase } from "./auth/supabase";
import type { Instrument, InstrumentStatus, Operator, PaymentStatus, UserType } from "./inventory";
import type { Lang } from "./i18n-core";

function db() {
  if (!supabase) throw new Error("Inventory storage is not configured on this environment.");
  return supabase;
}

// A missing RPC means inventory-loans.sql has not been run yet; say so plainly.
function check({ error }: { error: { message: string; code?: string } | null }) {
  if (!error) return;
  if (error.code === "PGRST202" || /could not find the function/i.test(error.message)) {
    throw new Error("The inventory database is not up to date. Ask a lab admin to run supabase/inventory-loans.sql.");
  }
  throw new Error(error.message);
}

export type LoanRequest = {
  borrower_name: string;
  borrower_org: string;
  borrower_contact: string;
  user_type: UserType;
  operator: Operator;
  technician_name: string;
  purpose: string;
  checkout_at: string; // ISO
  expected_return: string; // ISO
  quantity: number | null;
  condition_out: string;
  notes: string;
};

export async function requestLoan(instrument: string, mode: "book" | "checkout", entry: LoanRequest) {
  const res = await db().rpc("inventory_request", { p_inst: instrument, p_mode: mode, p_entry: entry });
  check(res);
  return res.data as string;
}

export async function startBooking(log: string, condition: string) {
  check(await db().rpc("inventory_start_booking", { p_log: log, p_condition: condition }));
}

export async function returnLoan(
  log: string,
  f: { quantity: number | null; condition: string; notes: string; after: InstrumentStatus; payment: PaymentStatus | null },
) {
  check(
    await db().rpc("inventory_return", {
      p_log: log,
      p_qty: f.quantity,
      p_condition: f.condition,
      p_notes: f.notes,
      p_after: f.after,
      p_payment: f.payment,
    }),
  );
}

export async function cancelBooking(log: string) {
  check(await db().rpc("inventory_cancel", { p_log: log }));
}

export async function setInstrumentStatus(instrument: string, status: InstrumentStatus) {
  check(await db().rpc("inventory_set_status", { p_inst: instrument, p_status: status }));
}

export async function setPayment(log: string, payment: PaymentStatus) {
  check(await db().rpc("inventory_set_payment", { p_log: log, p_payment: payment }));
}

export type InstrumentInput = Pick<
  Instrument,
  | "slug"
  | "code"
  | "name"
  | "brand"
  | "lab"
  | "category"
  | "kind"
  | "unit"
  | "rate_internal_self"
  | "rate_internal_tech"
  | "rate_external"
  | "pic"
  | "notes"
  | "photo"
  | "spec"
  | "terms"
  | "min_quantity"
>;

/** Adds (id null) or edits an instrument; returns its slug. */
export async function saveInstrument(id: string | null, data: InstrumentInput): Promise<string> {
  const res = await db().rpc("inventory_save_instrument", { p_inst: id, p_data: data });
  check(res);
  return res.data as string;
}

const PHOTO_BUCKET = "instrument-photos";

/** WebP no larger than 1200px, like the seeded photos in /brand/uploads/instruments. */
export async function compressPhoto(file: Blob, maxSide = 1200): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("The photo could not be processed."))), "image/webp", 0.85),
  );
}

/** Uploads a photo and returns its public address for `instruments.photo`. */
export async function uploadPhoto(slug: string, file: Blob): Promise<string> {
  const path = `${slug}/${crypto.randomUUID()}.webp`;
  const bucket = db().storage.from(PHOTO_BUCKET);
  const { error } = await bucket.upload(path, file, { contentType: "image/webp", upsert: false });
  if (error) throw new Error(`The photo could not be uploaded: ${error.message}. Has inventory-loans.sql been run?`);
  return bucket.getPublicUrl(path).data.publicUrl;
}

/** Names of active lab members, to suggest in the borrower field. */
export async function labMemberNames(): Promise<string[]> {
  const { data, error } = await db().rpc("lab_directory");
  if (error || !Array.isArray(data)) return [];
  return [
    ...new Set(
      (data as { full_name?: string | null; preferred_name?: string | null }[])
        .map((p) => (p.full_name || p.preferred_name || "").trim())
        .filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

// Indonesian for the messages this file throws itself; anything else (a
// database message) is shown as it came.
const ERRORS_ID: [RegExp, string | ((m: RegExpMatchArray) => string)][] = [
  [/^Inventory storage is not configured on this environment\.$/, "Penyimpanan inventaris belum dikonfigurasi di lingkungan ini."],
  [
    /^The inventory database is not up to date\. Ask a lab admin to run supabase\/inventory-loans\.sql\.$/,
    "Database inventaris belum diperbarui. Minta admin lab menjalankan supabase/inventory-loans.sql.",
  ],
  [/^The photo could not be processed\.$/, "Foto tidak dapat diproses."],
  [
    /^The photo could not be uploaded: (.*)\. Has inventory-loans\.sql been run\?$/,
    (m) => `Foto tidak dapat diunggah: ${m[1]}. Apakah inventory-loans.sql sudah dijalankan?`,
  ],
];

/** An error message from this file in the page language. */
export function inventoryErrorText(message: string, lang: Lang = "en"): string {
  if (lang !== "id") return message;
  for (const [re, out] of ERRORS_ID) {
    const m = message.match(re);
    if (m) return typeof out === "string" ? out : out(m);
  }
  return message;
}
