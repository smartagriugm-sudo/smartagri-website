import { accent, body, display } from "../lib/fonts";
import { PARTNERS } from "../lib/partners";

export default function Partners() {
  return (
    <section className="bg-white pt-16 pb-14 px-[40px]">
      <h2
        className="text-center text-2xl md:text-3xl font-medium text-neutral-900 mb-12"
        style={display}
      >
        In collaboration with <span style={accent}>leading partners</span>
      </h2>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-white to-transparent z-10" />
        <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white to-transparent z-10" />
        {/* 29 partners — slow the marquee down so logos stay readable */}
        <div
          className="flex w-max animate-marquee gap-14 items-center"
          style={{ animationDuration: "120s" }}
        >
          {[...PARTNERS, ...PARTNERS].map((partner, i) => (
            <div
              key={i}
              className="flex items-center gap-3 shrink-0 grayscale opacity-60"
            >
              {partner.logo && (
                <img
                  src={partner.logo}
                  alt={partner.name}
                  className="h-9 w-auto max-w-[120px] object-contain"
                />
              )}
              <span
                className="text-lg font-semibold text-black whitespace-nowrap"
                style={body}
              >
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
