import { body } from "../lib/fonts";
import { ACTIVE_PARTNERS } from "../lib/partners";

// Continuous grayscale logo marquee. Sits on a white background; the side
// gradients fade the logos in and out at the edges.
export default function PartnerMarquee() {
  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute left-0 top-0 h-full w-16 bg-gradient-to-r from-white to-transparent z-10" />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 bg-gradient-to-l from-white to-transparent z-10" />
      {/* duplicated list so the marquee loops seamlessly; slow so logos stay readable */}
      <div
        className="flex w-max animate-marquee gap-14 items-center"
        style={{ animationDuration: "120s" }}
      >
        {[...ACTIVE_PARTNERS, ...ACTIVE_PARTNERS].map((partner, i) => (
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
  );
}
