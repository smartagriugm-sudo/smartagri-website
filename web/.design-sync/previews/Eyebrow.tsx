import { Eyebrow } from "smartagri-ui";

// The bare teal label.
export function Default() {
  return <Eyebrow>Field Notes</Eyebrow>;
}

// How it is used in practice: eyebrow above a section heading.
export function AboveHeading() {
  return (
    <div style={{ textAlign: "center" }}>
      <Eyebrow className="mb-3">Our collaboration process</Eyebrow>
      <h2
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 34,
          fontWeight: 600,
          letterSpacing: "-0.03em",
          color: "#171717",
          margin: 0,
        }}
      >
        From first hello to{" "}
        <span style={{ color: "#14919B", fontWeight: 600 }}>field results</span>
      </h2>
    </div>
  );
}
