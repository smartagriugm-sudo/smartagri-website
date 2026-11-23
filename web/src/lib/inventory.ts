// Types and pure helpers for the PUAPT (WGFS) instrument inventory + usage
// logbook. Data lives in Supabase (see web/supabase/inventory.sql); the pages
// under /inventory are gated behind sign-in.

export type InstrumentStatus =
  | "available"
  | "in_use"
  | "maintenance"
  | "calibration"
  | "broken";

export type UserType = "internal" | "external";
// booked: reserved for a later slot; ongoing: out now; returned: closed;
// cancelled: a booking that was called off.
export type LogStatus = "booked" | "ongoing" | "returned" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "waived";
export type Operator = "self" | "technician";
export type RateType = "internal_self" | "internal_tech" | "external";

export type Instrument = {
  id: string;
  ord: number | null;
  slug: string;
  code: string;
  name: string;
  brand: string | null;
  lab: string | null;
  category: string | null;
  rate_internal_self: number | null;
  rate_internal_tech: number | null;
  rate_external: number | null;
  unit: string | null;
  status: InstrumentStatus;
  // "portable": booked/checked out; "installed": permanently sited, logged via
  // periodic inspection/maintenance checks instead of borrowing.
  kind: "portable" | "installed" | null;
  pic: string | null;
  notes: string | null;
  photo: string | null;
  created_at: string;
  updated_at?: string | null;
  // From the WGFS 1.2 rate letter (supabase/inventory-wgfs-tariff.sql).
  spec?: string | null; // what the instrument does
  terms?: string | null; // letter notes: what one sample is, exclusions, licences
  min_quantity?: number | null; // minimum billed per request
  rate_tiers?: RateTier[] | null; // cheaper rates from a given unit onward
};

// From unit `from` onward (1-based), this rate replaces the listed one for
// the rate types it names. Used for the F-750 (WGFS 106) sample tiers.
export type RateTier = {
  from: number;
  internal_self?: number | null;
  internal_tech?: number | null;
  external?: number | null;
};

export type UsageLog = {
  id: string;
  created_at: string;
  instrument_id: string;
  borrower_name: string;
  borrower_org: string | null;
  user_type: UserType;
  operator: Operator;
  technician_name: string | null;
  purpose: string | null;
  checkout_at: string;
  expected_return: string | null;
  returned_at: string | null;
  quantity: number | null;
  unit: string | null;
  rate_type: RateType | null;
  unit_rate: number | null;
  cost: number | null;
  condition_out: string | null;
  condition_in: string | null;
  notes: string | null;
  status: LogStatus;
  // "borrow": checkout/return; "check": inspection/maintenance of an installed unit.
  log_type: "borrow" | "check" | null;
  created_by: string | null;
  // Added by supabase/inventory-loans.sql; absent before it runs.
  borrower_contact?: string | null;
  borrower_id?: string | null;
  payment_status?: PaymentStatus | null;
  cancelled_at?: string | null;
};

export const INSTRUMENT_STATUSES: InstrumentStatus[] = [
  "available",
  "in_use",
  "maintenance",
  "calibration",
  "broken",
];

export const statusMeta: Record<
  InstrumentStatus,
  { label: string; chip: string; dot: string }
> = {
  available: {
    label: "Available",
    chip: "bg-[#45DFB1]/20 text-[#0B6477]",
    dot: "bg-[#12B886]",
  },
  in_use: {
    label: "In use",
    chip: "bg-[#14919B]/15 text-[#0B6477]",
    dot: "bg-[#14919B]",
  },
  maintenance: {
    label: "Maintenance",
    chip: "bg-[#F59E0B]/15 text-[#8A5300]",
    dot: "bg-[#F59E0B]",
  },
  calibration: {
    label: "Calibration",
    chip: "bg-[#0AD1C8]/15 text-[#0B6477]",
    dot: "bg-[#0AD1C8]",
  },
  broken: {
    label: "Out of service",
    chip: "bg-[#E5484D]/12 text-[#B42318]",
    dot: "bg-[#E5484D]",
  },
};

// Rupiah, no decimals: 5000 -> "Rp 5.000".
export function formatIDR(value: number | null | undefined): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

// Which rate applies for a given user type + operator, and its value.
export function resolveRate(
  instrument: Instrument,
  userType: UserType,
  operator: Operator,
): { rateType: RateType; unitRate: number | null } {
  if (userType === "external") {
    return { rateType: "external", unitRate: instrument.rate_external };
  }
  if (operator === "technician") {
    return { rateType: "internal_tech", unitRate: instrument.rate_internal_tech };
  }
  return { rateType: "internal_self", unitRate: instrument.rate_internal_self };
}

export const rateTypeLabel: Record<RateType, string> = {
  internal_self: "Internal (UGM), self-operated",
  internal_tech: "Internal (UGM), by a technician",
  external: "External (outside UGM)",
};

// The rate letter these rules follow. Internal rates are for UGM users, split
// by who does the work; external rates are for users from outside UGM.
export const RATE_LETTER = {
  number: "019/WGFS/1.2/SE/XI/2026",
  date: "1 August 2026",
  title: "Tarif Penggunaan Peralatan PUAPT, WGFS 1.2 Precision Agriculture and Smart Farming",
} as const;

export type Charge = {
  /** Total in rupiah; null when the quantity or the rate is missing. */
  cost: number | null;
  /** Quantity charged after the minimum per request. */
  billed: number | null;
  /** True when the minimum raised the quantity. */
  raisedToMinimum: boolean;
  /** One line per tier used, e.g. 20 x 75.000 and 10 x 60.000. */
  lines: { qty: number; rate: number }[];
};

// Charge for one request, as the letter sets it: the quantity is raised to
// the minimum per request, then each tier prices its own range (samples 1–20
// at the listed rate, 21–100 at the next, and so on). Mirrors
// inventory_charge() in supabase/inventory-loans.sql.
export function chargeFor(
  baseRate: number | null | undefined,
  rateType: RateType | null | undefined,
  qty: number | null | undefined,
  minQty?: number | null,
  tiers?: RateTier[] | null,
): Charge {
  if (qty == null || baseRate == null || !Number.isFinite(qty) || qty < 0) {
    return { cost: null, billed: qty ?? null, raisedToMinimum: false, lines: [] };
  }
  const billed = Math.max(qty, minQty ?? 0);
  const steps = [...(tiers ?? [])].filter((t) => t.from > 1).sort((a, b) => a.from - b.from);
  const lines: { qty: number; rate: number }[] = [];
  let rate = baseRate;
  let start = 0; // units already priced
  for (const t of steps) {
    const end = Math.min(billed, t.from - 1);
    if (end > start) lines.push({ qty: end - start, rate });
    start = Math.max(start, end);
    const next = rateType ? t[rateType] : null;
    if (next != null) rate = next;
  }
  if (billed > start) lines.push({ qty: billed - start, rate });
  // Merge neighbours with the same rate (a tier that does not change this rate type).
  const merged = lines.reduce<{ qty: number; rate: number }[]>((acc, l) => {
    const last = acc[acc.length - 1];
    if (last && last.rate === l.rate) last.qty += l.qty;
    else acc.push({ ...l });
    return acc;
  }, []);
  return {
    cost: merged.reduce((sum, l) => sum + l.qty * l.rate, 0),
    billed,
    raisedToMinimum: billed > qty,
    lines: merged,
  };
}

/** Charge for an instrument at one of its rates. */
export function instrumentCharge(instrument: Instrument, rateType: RateType, unitRate: number | null, qty: number | null): Charge {
  const min = instrument.min_quantity ?? minimumQuantity(instrument.unit);
  return chargeFor(unitRate, rateType, qty, min, instrument.rate_tiers);
}

// quantity x unit rate; null when either is missing (e.g. rate "by arrangement").
export function computeCost(
  quantity: number | null | undefined,
  unitRate: number | null | undefined,
): number | null {
  if (quantity == null || unitRate == null) return null;
  return quantity * unitRate;
}

export const LABS = ["Lab EMP", "Lab TLBP"] as const;

/* ---------- loans, bookings and rentals ---------- */

export const logStatusMeta: Record<LogStatus, { label: string; chip: string }> = {
  booked: { label: "Booked", chip: "bg-[#0AD1C8]/15 text-[#0B6477]" },
  ongoing: { label: "Out now", chip: "bg-[#14919B]/15 text-[#0B6477]" },
  returned: { label: "Returned", chip: "bg-[#45DFB1]/20 text-[#0B6477]" },
  cancelled: { label: "Cancelled", chip: "bg-neutral-100 text-neutral-500" },
};

export const paymentMeta: Record<PaymentStatus, { label: string; chip: string }> = {
  unpaid: { label: "Unpaid", chip: "bg-[#F59E0B]/15 text-[#8A5300]" },
  paid: { label: "Paid", chip: "bg-[#45DFB1]/20 text-[#0B6477]" },
  waived: { label: "Waived", chip: "bg-neutral-100 text-neutral-500" },
};

export type OperatorChoice = { operator: Operator; label: string; rateType: RateType; unitRate: number | null };

// The ways this instrument can be used by this kind of user. An instrument
// without a self-operated rate is only lent with a technician, and the other
// way round; with no rate at all both stay open ("by arrangement").
export function operatorChoices(instrument: Instrument, userType: UserType): OperatorChoice[] {
  if (userType === "external") {
    return [{ operator: "self", label: "External rate", rateType: "external", unitRate: instrument.rate_external }];
  }
  const self: OperatorChoice = {
    operator: "self",
    label: "Self-operated",
    rateType: "internal_self",
    unitRate: instrument.rate_internal_self,
  };
  const tech: OperatorChoice = {
    operator: "technician",
    label: "By a technician",
    rateType: "internal_tech",
    unitRate: instrument.rate_internal_tech,
  };
  const priced = [self, tech].filter((c) => c.unitRate != null);
  return priced.length ? priced : [self, tech];
}

// How the rate is counted, read from the unit text of the WGFS rate card
// ("per hari", "per 4 jam", "per sampel", "per Ha (Min 1000 Ha)").
export type Basis = "day" | "four_hours" | "sample" | "hectare" | "other";

export function billingBasis(unit: string | null | undefined): Basis {
  const u = (unit ?? "").toLowerCase();
  if (/\b4\s*jam\b|4\s*hours?/.test(u)) return "four_hours";
  if (/\bhari\b|\bday\b/.test(u)) return "day";
  if (/sampel|sample/.test(u)) return "sample";
  if (/\bha\b|hectare/.test(u)) return "hectare";
  return "other";
}

export const basisNoun: Record<Basis, string> = {
  day: "days",
  four_hours: "4-hour blocks",
  sample: "samples",
  hectare: "hectares",
  other: "units",
};

// "per Ha (Min 1000 Ha)" -> 1000; null when the unit sets no minimum.
export function minimumQuantity(unit: string | null | undefined): number | null {
  const m = (unit ?? "").match(/min(?:imum|\.)?\s*([\d.,]+)/i);
  if (!m) return null;
  const n = Number(m[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

const HOUR = 3_600_000;

// Billing units for a time-based rate between start and end: whole days
// (any part of a day counts as one) or 4-hour blocks. null for rates that are
// counted per sample or per hectare, which the user fills in.
export function suggestQuantity(unit: string | null | undefined, start: Date, end: Date): number | null {
  const ms = end.getTime() - start.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const basis = billingBasis(unit);
  if (basis === "day") return Math.max(1, Math.ceil(ms / (24 * HOUR)));
  if (basis === "four_hours") return Math.max(1, Math.ceil(ms / (4 * HOUR)));
  return null;
}

// Loans and bookings that still hold a slot on the calendar.
export const holdsSlot = (l: UsageLog) =>
  l.log_type !== "check" && (l.status === "booked" || l.status === "ongoing");

// The first booking or loan overlapping [start, end), the same rule the
// database applies in inventory_check_free().
export function findClash(
  logs: UsageLog[],
  start: Date,
  end: Date,
  skipId?: string,
): UsageLog | null {
  const s = start.getTime();
  const e = end.getTime();
  return (
    logs
      .filter((l) => holdsSlot(l) && l.id !== skipId)
      .sort((a, b) => a.checkout_at.localeCompare(b.checkout_at))
      .find((l) => {
        const ls = new Date(l.checkout_at).getTime();
        const le = l.expected_return ? new Date(l.expected_return).getTime() : Infinity;
        return ls < e && le > s;
      }) ?? null
  );
}

// Whole days a loan is past its due date (0 when on time or no due date).
export function overdueDays(log: Pick<UsageLog, "status" | "expected_return">, now: Date): number {
  if (log.status !== "ongoing" || !log.expected_return) return 0;
  const late = now.getTime() - new Date(log.expected_return).getTime();
  return late > 0 ? Math.ceil(late / (24 * HOUR)) : 0;
}

// Address name for a new instrument, in the style of the seeded ones:
// "WGFS 91" + "Trinity Pro Platform" -> "wgfs-91-trinity-pro-platform".
export function instrumentSlug(code: string, name: string): string {
  return `${code} ${name}`
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

// Rupiah typed by hand: "1.500.000", "Rp 75.000", "75000" -> number; "" -> null.
export function parseRupiah(text: string): number | null {
  const digits = text.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

// Rupiah for an input box while typing: 1500000 -> "1.500.000".
export function groupRupiah(value: number | null | undefined): string {
  return value == null ? "" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(value);
}

// Value for <input type="datetime-local"> in the browser's time zone.
export function toLocalInput(date: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}T${p(date.getHours())}:${p(date.getMinutes())}`;
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
