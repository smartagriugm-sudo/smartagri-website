import { accent, body, display } from "../lib/fonts";
import NotesExplorer from "./NotesExplorer";

export default function FieldNotes() {
  return (
    <section id="field-notes" className="bg-[#F3F7F6]">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 py-16 md:py-20">
        <div
          className="text-center text-[13px] font-medium tracking-[0.03em] text-[#14919B] mb-3"
          style={body}
        >
          Field Notes
        </div>
        <h2
          className="text-center text-4xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.1] mb-4 text-neutral-900"
          style={display}
        >
          Fresh <span style={accent}>from the field</span>
        </h2>
        <p
          className="text-center text-base md:text-lg font-normal text-neutral-500 max-w-[560px] mx-auto mb-10"
          style={body}
        >
          News, research updates, practical guides, and stories from the farms
          and labs we work in.
        </p>
        <NotesExplorer limit={6} showViewAll />
      </div>
    </section>
  );
}
