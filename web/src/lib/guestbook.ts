import { supabase } from "./auth/supabase";

// Exhibition guest book. Entries are written by anonymous booth visitors on
// /guestbook (RLS allows anon INSERT) and read back only by signed-in team
// members on /guestbook/admin (RLS restricts SELECT to authenticated). See
// supabase/guestbook.sql for the table and policies.

export type GuestRole =
  | "Student"
  | "Lecturer / Researcher"
  | "Farmer / Practitioner"
  | "Industry / Private"
  | "Government"
  | "Other";

export const GUEST_ROLES: GuestRole[] = [
  "Student",
  "Lecturer / Researcher",
  "Farmer / Practitioner",
  "Industry / Private",
  "Government",
  "Other",
];

export interface GuestbookInput {
  name: string;
  institution?: string;
  role?: string;
  email?: string;
  whatsapp?: string;
}

export interface GuestbookEntry extends GuestbookInput {
  id: string;
  created_at: string;
}

/** Whether the guest book can store entries (Supabase configured). */
export const guestbookEnabled = () => supabase !== null;

/** Insert one signed entry. Trims values and drops empties to null. */
export async function submitGuestbook(
  input: GuestbookInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Guest book storage is not configured." };

  const clean = (v?: string) => {
    const t = (v ?? "").trim();
    return t.length > 0 ? t : null;
  };

  const name = clean(input.name);
  if (!name) return { ok: false, error: "Name is required." };

  const { error } = await supabase.from("guestbook_entries").insert({
    name,
    institution: clean(input.institution),
    role: clean(input.role),
    email: clean(input.email),
    whatsapp: clean(input.whatsapp),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Read all entries, newest first (admin side; requires an authenticated session). */
export async function fetchGuestbook(): Promise<GuestbookEntry[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("guestbook_entries")
    .select("id, created_at, name, institution, role, email, whatsapp")
    .order("created_at", { ascending: false })
    .limit(50000);
  if (error) throw new Error(error.message);
  return (data ?? []) as GuestbookEntry[];
}

/** Build a CSV string from entries for download. */
export function toCsv(rows: GuestbookEntry[]): string {
  const headers = [
    "Time",
    "Name",
    "Institution",
    "Role",
    "Email",
    "WhatsApp",
  ];
  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(",")];
  for (const r of rows) {
    lines.push(
      [
        new Date(r.created_at).toISOString(),
        r.name ?? "",
        r.institution ?? "",
        r.role ?? "",
        r.email ?? "",
        r.whatsapp ?? "",
      ]
        .map((v) => escape(String(v)))
        .join(","),
    );
  }
  return lines.join("\n");
}
