import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ImagePlus, Microscope, Trash2 } from "lucide-react";
import { body } from "../../lib/fonts";
import {
  type Instrument,
  basisNoun,
  billingBasis,
  groupRupiah,
  instrumentSlug,
  minimumQuantity,
  parseRupiah,
} from "../../lib/inventory";
import { compressPhoto, saveInstrument, uploadPhoto } from "../../lib/inventory-data";
import { Choice, Dialog, Field, FormError, GhostButton, PrimaryButton, inputClass } from "./FormParts";

// Add or edit one instrument (lab admins). Lab, category and unit suggest the
// values already in use so the filters on the list stay tidy; rates are typed
// as rupiah with thousands separators; the address name is made from the
// code and name for a new instrument and kept as it is when editing, so old
// links keep working.

type Draft = {
  code: string;
  name: string;
  brand: string;
  lab: string;
  category: string;
  kind: "portable" | "installed";
  unit: string;
  self: string;
  tech: string;
  external: string;
  pic: string;
  notes: string;
  spec: string;
  terms: string;
  minQty: string;
};

function draftOf(i: Instrument | null): Draft {
  return {
    code: i?.code ?? "WGFS ",
    name: i?.name ?? "",
    brand: i?.brand ?? "",
    lab: i?.lab ?? "",
    category: i?.category ?? "",
    kind: i?.kind === "installed" ? "installed" : "portable",
    unit: i?.unit ?? "",
    self: groupRupiah(i?.rate_internal_self),
    tech: groupRupiah(i?.rate_internal_tech),
    external: groupRupiah(i?.rate_external),
    pic: i?.pic ?? "",
    notes: i?.notes ?? "",
    spec: i?.spec ?? "",
    terms: i?.terms ?? "",
    minQty: i?.min_quantity != null ? String(i.min_quantity) : "",
  };
}

const UNIT_SUGGESTIONS = ["per hari", "per 4 jam", "per sampel", "per Ha (Min 100 Ha)"];

export default function InstrumentForm({
  open,
  instrument,
  all,
  onClose,
  onSaved,
}: {
  open: boolean;
  instrument: Instrument | null; // null = new
  all: Instrument[];
  onClose: () => void;
  onSaved: (slug: string) => void;
}) {
  const [d, setD] = useState<Draft>(() => draftOf(instrument));
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setD(draftOf(instrument));
    setPhotoFile(null);
    setRemovePhoto(false);
    setTried(false);
    setErr(null);
  }, [open, instrument]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  const set = <K extends keyof Draft>(k: K) => (v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));

  const options = useMemo(() => {
    const u = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean) as string[])].sort();
    return {
      labs: u(all.map((i) => i.lab)),
      categories: u(all.map((i) => i.category)),
      units: u([...all.map((i) => i.unit), ...UNIT_SUGGESTIONS]),
    };
  }, [all]);

  const slug = instrument?.slug ?? instrumentSlug(d.code, d.name);
  const slugTaken = !instrument && !!slug && all.some((i) => i.slug === slug);
  const twin = all.find(
    (i) =>
      i.id !== instrument?.id &&
      i.code.trim().toLowerCase() === d.code.trim().toLowerCase() &&
      i.name.trim().toLowerCase() === d.name.trim().toLowerCase(),
  );

  const codeErr = tried && !d.code.trim().replace(/^WGFS\s*$/i, "") ? "Enter the WGFS code, for example WGFS 124." : null;
  const nameErr = tried && !d.name.trim() ? "Enter the instrument name." : null;
  const rateValues = [parseRupiah(d.self), parseRupiah(d.tech), parseRupiah(d.external)];
  const unitErr =
    tried && d.kind === "portable" && rateValues.some((v) => v != null) && !d.unit.trim()
      ? "Say what a rate is counted per, for example per hari."
      : null;

  const basis = billingBasis(d.unit);
  const minFromField = d.minQty.trim() ? Number(d.minQty.replace(",", ".")) : null;
  const minQty = minFromField ?? minimumQuantity(d.unit);
  const minErr = tried && minFromField != null && (!Number.isFinite(minFromField) || minFromField < 0) ? "Enter a positive number." : null;
  const currentPhoto = removePhoto ? null : instrument?.photo ?? null;
  const shownPhoto = photoPreview ?? currentPhoto;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setTried(true);
    setErr(null);
    if (!d.code.trim().replace(/^WGFS\s*$/i, "") || !d.name.trim() || slugTaken) return;
    if (d.kind === "portable" && rateValues.some((v) => v != null) && !d.unit.trim()) return;
    if (minFromField != null && (!Number.isFinite(minFromField) || minFromField < 0)) return;
    setSaving(true);
    try {
      let photo = currentPhoto;
      if (photoFile) photo = await uploadPhoto(slug, await compressPhoto(photoFile));
      const portable = d.kind === "portable";
      const saved = await saveInstrument(instrument?.id ?? null, {
        slug,
        code: d.code.trim().replace(/\s+/g, " "),
        name: d.name.trim(),
        brand: d.brand.trim() || null,
        lab: d.lab.trim() || null,
        category: d.category.trim() || null,
        kind: d.kind,
        unit: portable ? d.unit.trim() || null : null,
        rate_internal_self: portable ? rateValues[0] : null,
        rate_internal_tech: portable ? rateValues[1] : null,
        rate_external: portable ? rateValues[2] : null,
        pic: d.pic.trim() || null,
        notes: d.notes.trim() || null,
        photo,
        spec: d.spec.trim() || null,
        terms: d.terms.trim() || null,
        min_quantity: portable ? (minFromField ?? minimumQuantity(d.unit)) : null,
      });
      setSaving(false);
      onSaved(saved);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={instrument ? `Edit ${instrument.name}` : "Add an instrument"}>
      <form onSubmit={submit} noValidate className="flex flex-col gap-8">
        <section aria-label="Identity" className="grid gap-4 sm:grid-cols-2">
          <Field label="WGFS code" required error={codeErr} hint="As on the rate card. Codes may repeat (WGFS 91 has two items).">
            {(f) => (
              <input
                id={f.id}
                name="code"
                value={d.code}
                onChange={(e) => set("code")(e.target.value)}
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field
            label="Instrument name"
            required
            error={nameErr ?? (slugTaken ? "An instrument with this code and name is already listed." : null)}
            hint={
              twin
                ? `Same code and name as an existing entry (${twin.lab ?? "no lab"}).`
                : instrument
                  ? `Address stays /inventory/${slug}`
                  : d.name.trim() && slug
                    ? `Address: /inventory/${slug}`
                    : undefined
            }
          >
            {(f) => (
              <input
                id={f.id}
                name="name"
                value={d.name}
                onChange={(e) => set("name")(e.target.value)}
                required
                autoComplete="off"
                placeholder="e.g. Portable Leaf Area Meter"
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label="Brand / model">
            {(f) => (
              <input
                id={f.id}
                name="brand"
                value={d.brand}
                onChange={(e) => set("brand")(e.target.value)}
                autoComplete="off"
                placeholder="e.g. LICOR / LI-3000C"
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label="Person in charge">
            {(f) => (
              <input
                id={f.id}
                name="pic"
                value={d.pic}
                onChange={(e) => set("pic")(e.target.value)}
                autoComplete="off"
                placeholder="Technician or lab staff"
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label="Lab / location" hint="Pick one already in use, or type a new one.">
            {(f) => (
              <>
                <input
                  id={f.id}
                  name="lab"
                  list="inv-labs"
                  value={d.lab}
                  onChange={(e) => set("lab")(e.target.value)}
                  autoComplete="off"
                  aria-describedby={f.describedBy}
                  className={inputClass}
                  style={body}
                />
                <datalist id="inv-labs">
                  {options.labs.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Field label="Category">
            {(f) => (
              <>
                <input
                  id={f.id}
                  name="category"
                  list="inv-categories"
                  value={d.category}
                  onChange={(e) => set("category")(e.target.value)}
                  autoComplete="off"
                  className={inputClass}
                  style={body}
                />
                <datalist id="inv-categories">
                  {options.categories.map((o) => (
                    <option key={o} value={o} />
                  ))}
                </datalist>
              </>
            )}
          </Field>
          <Choice
            legend="How it is used"
            name="kind"
            value={d.kind}
            onChange={set("kind")}
            full
            options={[
              { value: "portable", label: "Portable", note: "Booked, lent or rented out" },
              { value: "installed", label: "Installed", note: "Stays in place, logged by inspections" },
            ]}
          />
          <Field label="What it does" full hint="One sentence, as in the rate letter. Shown under the name.">
            {(f) => (
              <input
                id={f.id}
                name="spec"
                value={d.spec}
                onChange={(e) => set("spec")(e.target.value)}
                autoComplete="off"
                placeholder="e.g. Measures leaf area, length and width at 1 mm² area resolution."
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
        </section>

        {d.kind === "portable" && (
          <section aria-label="Rates" className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field
                label="Rate counted"
                error={unitErr}
                hint={
                  d.unit.trim()
                    ? `Quantity is entered as ${basisNoun[basis]}${minQty ? `, at least ${minQty}` : ""}${
                        basis === "day" || basis === "four_hours" ? ", worked out from the loan dates" : ""
                      }.`
                    : "Include a minimum in the text when there is one, e.g. per Ha (Min 100 Ha)."
                }
              >
                {(f) => (
                  <>
                    <input
                      id={f.id}
                      name="unit"
                      list="inv-units"
                      value={d.unit}
                      onChange={(e) => set("unit")(e.target.value)}
                      autoComplete="off"
                      aria-invalid={f.invalid}
                      aria-describedby={f.describedBy}
                      className={inputClass}
                      style={body}
                    />
                    <datalist id="inv-units">
                      {options.units.map((o) => (
                        <option key={o} value={o} />
                      ))}
                    </datalist>
                  </>
                )}
              </Field>
            </div>
            <Field label="Minimum per request" error={minErr} hint="Fewer are charged as this many.">
              {(f) => (
                <input
                  id={f.id}
                  name="min_quantity"
                  inputMode="decimal"
                  autoComplete="off"
                  value={d.minQty}
                  onChange={(e) => set("minQty")(e.target.value)}
                  placeholder={minimumQuantity(d.unit) != null ? String(minimumQuantity(d.unit)) : "None"}
                  aria-invalid={f.invalid}
                  aria-describedby={f.describedBy}
                  className={`${inputClass} tabular-nums`}
                  style={body}
                />
              )}
            </Field>
            {(
              [
                ["self", "Internal (UGM), self-operated"],
                ["tech", "Internal (UGM), by a technician"],
                ["external", "External (outside UGM)"],
              ] as const
            ).map(([k, label]) => (
              <Field key={k} label={label} hint="Rupiah. Leave empty (a dash in the letter) if not offered.">
                {(f) => (
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-neutral-400" style={body}>
                      Rp
                    </span>
                    <input
                      id={f.id}
                      name={`rate_${k}`}
                      inputMode="numeric"
                      autoComplete="off"
                      value={d[k]}
                      onChange={(e) => set(k)(groupRupiah(parseRupiah(e.target.value)))}
                      aria-describedby={f.describedBy}
                      className={`${inputClass} pl-10 text-right tabular-nums`}
                      style={body}
                    />
                  </div>
                )}
              </Field>
            ))}
          </section>
        )}

        <section aria-label="Photo and notes" className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
          <div className="flex flex-col gap-2">
            <span className="grid aspect-[4/3] place-items-center overflow-hidden rounded-xl border border-[#0B6477]/10 bg-[#F3F7F6]">
              {shownPhoto ? (
                <img src={shownPhoto} alt="" className="h-full w-full object-contain p-2" />
              ) : (
                <Microscope className="h-7 w-7 text-[#0B6477]/30" />
              )}
            </span>
            <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#0B6477]/20 text-sm font-medium text-[#0B6477] transition-colors hover:bg-[#F3F7F6] has-[:focus-visible]:shadow-[0_0_0_4px_rgba(69,223,177,0.25)]" style={body}>
              <ImagePlus className="h-4 w-4" />
              {shownPhoto ? "Replace photo" : "Add photo"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  setPhotoFile(e.target.files?.[0] ?? null);
                  setRemovePhoto(false);
                }}
              />
            </label>
            {shownPhoto && (
              <button
                type="button"
                onClick={() => {
                  setPhotoFile(null);
                  setRemovePhoto(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 text-xs text-neutral-500 hover:text-[#B42318]"
                style={body}
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove photo
              </button>
            )}
          </div>
          <Field label="Notes" hint="Accessories, power needs, handling rules, anything a borrower should know.">
            {(f) => (
              <textarea
                id={f.id}
                name="notes"
                rows={6}
                value={d.notes}
                onChange={(e) => set("notes")(e.target.value)}
                aria-describedby={f.describedBy}
                className={`${inputClass} h-auto min-h-[140px] py-3 leading-relaxed`}
                style={body}
              />
            )}
          </Field>
        </section>

        <Field
          label="Terms from the rate letter"
          hint={
            instrument?.rate_tiers?.length
              ? "One rule per line. Tiered rates are set in supabase/inventory-wgfs-tariff.sql and are kept when you save."
              : "One rule per line: what counts as one sample, what the rate excludes, licences."
          }
        >
          {(f) => (
            <textarea
              id={f.id}
              name="terms"
              rows={5}
              value={d.terms}
              onChange={(e) => set("terms")(e.target.value)}
              aria-describedby={f.describedBy}
              className={`${inputClass} h-auto min-h-[120px] py-3 leading-relaxed`}
              style={body}
            />
          )}
        </Field>

        <FormError message={err} />
        <div className="flex flex-col-reverse gap-3 border-t border-[#0B6477]/10 pt-6 sm:flex-row sm:justify-end">
          <GhostButton onClick={onClose}>Cancel</GhostButton>
          <PrimaryButton busy={saving}>{instrument ? "Save changes" : "Add instrument"}</PrimaryButton>
        </div>
      </form>
    </Dialog>
  );
}
