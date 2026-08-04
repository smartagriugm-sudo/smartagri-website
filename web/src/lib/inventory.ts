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
  pic: string | null;
  notes: string | null;
  created_at: string;
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
  status: "ongoing" | "returned";
  created_by: string | null;
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
  internal_self: "Internal, self-operated",
  internal_tech: "Internal, with technician",
  external: "External",
};

// quantity x unit rate; null when either is missing (e.g. rate "by arrangement").
export function computeCost(
  quantity: number | null | undefined,
  unitRate: number | null | undefined,
): number | null {
  if (quantity == null || unitRate == null) return null;
  return quantity * unitRate;
}

export const LABS = ["Lab EMP", "Lab TLBP"] as const;
