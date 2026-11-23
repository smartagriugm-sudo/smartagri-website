import { FileText } from "lucide-react";
import { body } from "../../lib/fonts";
import { partnerLogo, rateLetterPdf } from "../../lib/assets";
import { RATE_LETTER } from "../../lib/inventory";
import { META } from "../NoteParts";
import { useLang, useT } from "../../lib/i18n";

// The instruments are funded and run under PUAPT UGM and its Working Group
// Food Security 1.2 (Precision Agriculture and Smart Farming). Their logos sit
// side by side on the inventory pages, with the rate letter the rates come
// from, which users can open as a PDF.
export default function Supporters({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const lang = useLang();
  return (
    <div
      className={`flex flex-col gap-5 rounded-[20px] border border-[#0B6477]/12 bg-white/90 ${
        compact ? "p-5" : "p-5 md:flex-row md:items-center md:justify-between md:gap-10 md:px-7"
      }`}
    >
      <div className={`flex min-w-0 flex-col gap-3 ${compact ? "" : "md:w-[min(560px,55%)]"}`}>
        <span className={`text-neutral-500 ${META}`} style={body}>
          {t({ en: "Instruments supported by", id: "Instrumen didukung oleh" })}
        </span>
        {/* One line at every width: the two logos share the row in proportion
            to their shapes (PUAPT 422×69, WGFS 406×35 shown a little shorter),
            so they shrink together instead of wrapping. */}
        <div className="flex items-center gap-4 sm:gap-5">
          <img
            src={partnerLogo("puapt-ugm.png")}
            alt="PUAPT UGM, Pusat Unggulan Antar Perguruan Tinggi"
            className="h-auto min-w-0 max-w-[190px] flex-[61_1_0%]"
            loading="lazy"
          />
          <span className="h-7 w-px shrink-0 bg-[#0B6477]/20" aria-hidden="true" />
          <img
            src={partnerLogo("wgfs.svg")}
            alt="WGFS 1.2 Precision Agriculture and Smart Farming"
            className="h-auto min-w-0 max-w-[260px] flex-[84_1_0%]"
            loading="lazy"
          />
        </div>
      </div>
      <div className={`flex flex-col gap-3 ${compact ? "" : "md:max-w-[340px] md:items-end md:text-right"}`}>
        <p className="text-[13px] leading-snug text-neutral-500" style={body}>
          {t({
            en: `Rates follow letter No. ${RATE_LETTER.number}, ${RATE_LETTER.date}. Internal rates are for UGM users; external rates are for users outside UGM.`,
            id: `Tarif mengikuti surat No. ${RATE_LETTER.number}, ${lang === "id" ? RATE_LETTER.dateId : RATE_LETTER.date}. Tarif internal untuk pengguna UGM; tarif eksternal untuk pengguna dari luar UGM.`,
          })}
        </p>
        <a
          href={rateLetterPdf}
          target="_blank"
          rel="noopener"
          className={`group inline-flex items-center gap-2 self-start rounded-lg border border-[#0B6477]/20 px-3.5 py-2 text-sm font-medium text-[#0B6477] transition-colors hover:border-[#0B6477]/45 hover:bg-[#F3F7F6] ${
            compact ? "" : "md:self-end"
          }`}
          style={body}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {t({ en: "Read the rate letter", id: "Baca surat tarif" })}
          <span className="font-normal text-neutral-500">PDF</span>
        </a>
      </div>
    </div>
  );
}
