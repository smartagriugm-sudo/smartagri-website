import { createFileRoute } from "@tanstack/react-router";
import FieldAdmin from "../components/dashboard/FieldAdmin";
import { useFieldData } from "../components/greenhouse/FieldData";
import { Loading } from "../components/greenhouse/parts";
import { headLang } from "../lib/i18n";

// Lab admins only; the layout shows a notice to anyone else and the RPCs refuse them too.
export const Route = createFileRoute("/indoor-farming_/dashboard/field/manage")({
  component: ManageSites,
  head: ({ matches }) => ({ meta: [{ title: headLang(matches) === "id" ? "Kelola lokasi · Greenhouse | agrosphere" : "Manage sites · Greenhouse | agrosphere" }] }),
});

function ManageSites() {
  const { sites, refresh } = useFieldData();
  if (sites === null) return <Loading />;
  return <FieldAdmin sites={sites} onChanged={refresh} />;
}
