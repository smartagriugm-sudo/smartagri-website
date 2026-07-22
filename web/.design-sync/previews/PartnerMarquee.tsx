import { PartnerMarquee } from "smartagri-ui";

// A slice of the real partner roster. Logos are omitted here (they load from
// the host app at runtime); the names carry the marquee on their own.
const partners = [
  { name: "Wageningen University & Research" },
  { name: "Kyushu University" },
  { name: "BRIN" },
  { name: "NVIDIA" },
  { name: "Kementerian Pertanian" },
  { name: "BMKG" },
  { name: "Kasetsart University" },
  { name: "Universiti Putra Malaysia" },
];

export function Names() {
  return (
    <div style={{ background: "#fff", paddingTop: 24, paddingBottom: 24 }}>
      <PartnerMarquee partners={partners} />
    </div>
  );
}
