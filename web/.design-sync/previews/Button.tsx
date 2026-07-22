import { Button } from "smartagri-ui";

// A row-flex wrapper lets each button size to its content instead of
// stretching to the full card width.
const row: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
const darkRow: React.CSSProperties = {
  ...row,
  background: "#08313A",
  padding: 28,
  borderRadius: 20,
};

// The mint primary pill — the one main action per view.
export function Primary() {
  return (
    <div style={row}>
      <Button href="#">Contact us</Button>
    </div>
  );
}

// Secondary action on a dark panel (white outline).
export function Outline() {
  return (
    <div style={darkRow}>
      <Button variant="outline" href="#">
        Explore partnerships
      </Button>
    </div>
  );
}

// Secondary action on a light background (teal outline).
export function OutlineDark() {
  return (
    <div style={row}>
      <Button variant="outlineDark" href="#">
        View publications
      </Button>
    </div>
  );
}

// The primary + secondary pair as used at the foot of a section.
export function ActionPair() {
  return (
    <div style={darkRow}>
      <Button href="#">Contact us</Button>
      <Button variant="outline" href="#">
        Explore partnerships
      </Button>
    </div>
  );
}
