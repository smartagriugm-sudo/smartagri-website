import { Impact } from "smartagri-ui";

// Default headline figures.
export function Default() {
  return <Impact />;
}

// The same band driven by a custom set of figures (the variant axis).
export function CustomFigures() {
  return (
    <Impact
      stats={[
        { value: "5", label: "Provinces with active pilots" },
        { value: "2.4k", label: "Farmers trained on the platform" },
        { value: "17", label: "Crop varieties under study" },
        { value: "9", label: "UAV monitoring platforms" },
      ]}
    />
  );
}
