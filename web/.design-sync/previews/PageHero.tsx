import { PageHero } from "smartagri-ui";

// Canonical page intro, with an accent word in the title.
export function Research() {
  return (
    <PageHero
      eyebrow="Research"
      title={
        <>
          Data-driven{" "}
          <span style={{ color: "#14919B", fontWeight: 600 }}>agriculture</span>
        </>
      }
      subtitle="From UAV multispectral monitoring to plant-factory environmental control, our work spans the full smart-farming stack."
    />
  );
}

// Plain title, no accent.
export function Publications() {
  return (
    <PageHero
      eyebrow="Publications"
      title="Peer-reviewed research"
      subtitle="Journal articles, conference papers, and technical reports from the Smart Agriculture Research Center."
    />
  );
}
