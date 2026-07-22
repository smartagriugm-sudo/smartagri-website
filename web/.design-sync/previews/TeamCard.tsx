import { TeamCard } from "smartagri-ui";

// Coordinator: gradient + initials fallback (no photo) with the mint badge.
export function Coordinator() {
  return (
    <div style={{ maxWidth: 280 }}>
      <TeamCard
        index={0}
        member={{
          name: "Andri Prima Nugroho",
          role: "Research Group Coordinator · Lecturer",
          coordinator: true,
        }}
      />
    </div>
  );
}

// A regular member card (different fallback gradient via index).
export function Member() {
  return (
    <div style={{ maxWidth: 280 }}>
      <TeamCard
        index={3}
        member={{
          name: "Sri Wahyuni",
          role: "Researcher · Precision Agriculture",
        }}
      />
    </div>
  );
}
