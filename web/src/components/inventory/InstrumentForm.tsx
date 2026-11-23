import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ImagePlus, Microscope, Trash2 } from "lucide-react";
import { body } from "../../lib/fonts";
import {
  type Instrument,
  basisNounText,
  billingBasis,
  groupRupiah,
  instrumentSlug,
  minimumQuantity,
  parseRupiah,
} from "../../lib/inventory";
import { compressPhoto, inventoryErrorText, saveInstrument, uploadPhoto } from "../../lib/inventory-data";
import { useLang, useT } from "../../lib/i18n";
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
  const t = useT();
  const lang = useLang();
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

  const codeErr = tried && !d.code.trim().replace(/^WGFS\s*$/i, "") ? t({ en: "Enter the WGFS code, for example WGFS 124.", id: "Isi kode WGFS, misalnya WGFS 124." }) : null;
  const nameErr = tried && !d.name.trim() ? t({ en: "Enter the instrument name.", id: "Isi nama instrumen." }) : null;
  const rateValues = [parseRupiah(d.self), parseRupiah(d.tech), parseRupiah(d.external)];
  const unitErr =
    tried && d.kind === "portable" && rateValues.some((v) => v != null) && !d.unit.trim()
      ? t({ en: "Say what a rate is counted per, for example per hari.", id: "Tulis satuan tarifnya, misalnya per hari." })
      : null;

  const basis = billingBasis(d.unit);
  const minFromField = d.minQty.trim() ? Number(d.minQty.replace(",", ".")) : null;
  const minQty = minFromField ?? minimumQuantity(d.unit);
  const minErr = tried && minFromField != null && (!Number.isFinite(minFromField) || minFromField < 0) ? t({ en: "Enter a positive number.", id: "Isi angka positif." }) : null;
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
      setErr(e2 instanceof Error ? inventoryErrorText(e2.message, lang) : String(e2));
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title={
        instrument
          ? t({ en: `Edit ${instrument.name}`, id: `Ubah ${instrument.name}` })
          : t({ en: "Add an instrument", id: "Tambah instrumen" })
      }
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-8">
        <section aria-label={t({ en: "Identity", id: "Identitas" })} className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t({ en: "WGFS code", id: "Kode WGFS" })}
            required
            error={codeErr}
            hint={t({
              en: "As on the rate card. Codes may repeat (WGFS 91 has two items).",
              id: "Sesuai daftar tarif. Kode boleh berulang (WGFS 91 punya dua item).",
            })}
          >
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
            label={t({ en: "Instrument name", id: "Nama instrumen" })}
            required
            error={
              nameErr ??
              (slugTaken
                ? t({
                    en: "An instrument with this code and name is already listed.",
                    id: "Instrumen dengan kode dan nama ini sudah terdaftar.",
                  })
                : null)
            }
            hint={
              twin
                ? t({
                    en: `Same code and name as an existing entry (${twin.lab ?? "no lab"}).`,
                    id: `Kode dan nama sama dengan entri yang sudah ada (${twin.lab ?? "tanpa lab"}).`,
                  })
                : instrument
                  ? t({ en: `Address stays /inventory/${slug}`, id: `Alamat tetap /inventory/${slug}` })
                  : d.name.trim() && slug
                    ? t({ en: `Address: /inventory/${slug}`, id: `Alamat: /inventory/${slug}` })
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
                placeholder={t({ en: "e.g. Portable Leaf Area Meter", id: "mis. Portable Leaf Area Meter" })}
                aria-invalid={f.invalid}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label={t({ en: "Brand / model", id: "Merek / model" })}>
            {(f) => (
              <input
                id={f.id}
                name="brand"
                value={d.brand}
                onChange={(e) => set("brand")(e.target.value)}
                autoComplete="off"
                placeholder={t({ en: "e.g. LICOR / LI-3000C", id: "mis. LICOR / LI-3000C" })}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field label={t({ en: "Person in charge", id: "Penanggung jawab" })}>
            {(f) => (
              <input
                id={f.id}
                name="pic"
                value={d.pic}
                onChange={(e) => set("pic")(e.target.value)}
                autoComplete="off"
                placeholder={t({ en: "Technician or lab staff", id: "Teknisi atau staf lab" })}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
          <Field
            label={t({ en: "Lab / location", id: "Lab / lokasi" })}
            hint={t({ en: "Pick one already in use, or type a new one.", id: "Pilih yang sudah ada, atau ketik yang baru." })}
          >
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
          <Field label={t({ en: "Category", id: "Kategori" })}>
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
            legend={t({ en: "How it is used", id: "Cara pemakaian" })}
            name="kind"
            value={d.kind}
            onChange={set("kind")}
            full
            options={[
              {
                value: "portable",
                label: t({ en: "Portable", id: "Portabel" }),
                note: t({ en: "Booked, lent or rented out", id: "Dipesan, dipinjamkan, atau disewakan" }),
              },
              {
                value: "installed",
                label: t({ en: "Installed", id: "Terpasang" }),
                note: t({ en: "Stays in place, logged by inspections", id: "Tetap di tempat, dicatat lewat inspeksi" }),
              },
            ]}
          />
          <Field
            label={t({ en: "What it does", id: "Fungsi" })}
            full
            hint={t({
              en: "One sentence, as in the rate letter. Shown under the name.",
              id: "Satu kalimat, seperti di surat tarif. Tampil di bawah nama.",
            })}
          >
            {(f) => (
              <input
                id={f.id}
                name="spec"
                value={d.spec}
                onChange={(e) => set("spec")(e.target.value)}
                autoComplete="off"
                placeholder={t({
                  en: "e.g. Measures leaf area, length and width at 1 mm² area resolution.",
                  id: "mis. Mengukur luas, panjang, dan lebar daun dengan resolusi 1 mm².",
                })}
                aria-describedby={f.describedBy}
                className={inputClass}
                style={body}
              />
            )}
          </Field>
        </section>

        {d.kind === "portable" && (
          <section aria-label={t({ en: "Rates", id: "Tarif" })} className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <Field
                label={t({ en: "Rate counted", id: "Satuan tarif" })}
                error={unitErr}
                hint={
                  d.unit.trim()
                    ? t({
                        en: `Quantity is entered as ${basisNounText(basis, "en")}${minQty ? `, at least ${minQty}` : ""}${
                          basis === "day" || basis === "four_hours" ? ", worked out from the loan dates" : ""
                        }.`,
                        id: `Jumlah diisi dalam ${basisNounText(basis, "id")}${minQty ? `, minimal ${minQty}` : ""}${
                          basis === "day" || basis === "four_hours" ? ", dihitung dari tanggal pinjam" : ""
                        }.`,
                      })
                    : t({
                        en: "Include a minimum in the text when there is one, e.g. per Ha (Min 100 Ha).",
                        id: "Sertakan minimum di teks bila ada, mis. per Ha (Min 100 Ha).",
                      })
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
            <Field
              label={t({ en: "Minimum per request", id: "Minimum per permintaan" })}
              error={minErr}
              hint={t({ en: "Fewer are charged as this many.", id: "Jumlah di bawahnya ditagih sebanyak ini." })}
            >
              {(f) => (
                <input
                  id={f.id}
                  name="min_quantity"
                  inputMode="decimal"
                  autoComplete="off"
                  value={d.minQty}
                  onChange={(e) => set("minQty")(e.target.value)}
                  placeholder={minimumQuantity(d.unit) != null ? String(minimumQuantity(d.unit)) : t({ en: "None", id: "Tidak ada" })}
                  aria-invalid={f.invalid}
                  aria-describedby={f.describedBy}
                  className={`${inputClass} tabular-nums`}
                  style={body}
                />
              )}
            </Field>
            {(
              [
                ["self", t({ en: "Internal (UGM), self-operated", id: "Internal (UGM), dioperasikan sendiri" })],
                ["tech", t({ en: "Internal (UGM), by a technician", id: "Internal (UGM), oleh teknisi" })],
                ["external", t({ en: "External (outside UGM)", id: "Eksternal (luar UGM)" })],
              ] as const
            ).map(([k, label]) => (
              <Field
                key={k}
                label={label}
                hint={t({
                  en: "Rupiah. Leave empty (a dash in the letter) if not offered.",
                  id: "Rupiah. Kosongkan (tanda strip di surat) bila tidak tersedia.",
                })}
              >
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

        <section aria-label={t({ en: "Photo and notes", id: "Foto dan catatan" })} className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
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
              {shownPhoto ? t({ en: "Replace photo", id: "Ganti foto" }) : t({ en: "Add photo", id: "Tambah foto" })}
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
                <Trash2 className="h-3.5 w-3.5" /> {t({ en: "Remove photo", id: "Hapus foto" })}
              </button>
            )}
          </div>
          <Field
            label={t({ en: "Notes", id: "Catatan" })}
            hint={t({
              en: "Accessories, power needs, handling rules, anything a borrower should know.",
              id: "Aksesori, kebutuhan daya, aturan penanganan, apa pun yang perlu diketahui peminjam.",
            })}
          >
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
          label={t({ en: "Terms from the rate letter", id: "Ketentuan dari surat tarif" })}
          hint={
            instrument?.rate_tiers?.length
              ? t({
                  en: "One rule per line. Tiered rates are set in supabase/inventory-wgfs-tariff.sql and are kept when you save.",
                  id: "Satu aturan per baris. Tarif berjenjang diatur di supabase/inventory-wgfs-tariff.sql dan tetap tersimpan saat Anda menyimpan.",
                })
              : t({
                  en: "One rule per line: what counts as one sample, what the rate excludes, licences.",
                  id: "Satu aturan per baris: yang dihitung satu sampel, yang tidak termasuk tarif, lisensi.",
                })
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
          <GhostButton onClick={onClose}>{t({ en: "Cancel", id: "Batal" })}</GhostButton>
          <PrimaryButton busy={saving}>
            {instrument ? t({ en: "Save changes", id: "Simpan perubahan" }) : t({ en: "Add instrument", id: "Tambah instrumen" })}
          </PrimaryButton>
        </div>
      </form>
    </Dialog>
  );
}
