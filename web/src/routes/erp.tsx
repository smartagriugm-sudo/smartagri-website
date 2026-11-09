import { Outlet, createFileRoute } from "@tanstack/react-router";
import { ErpStoreProvider } from "../components/erp/ErpContext";
import { A } from "../lib/assets";
import ErpGate from "../components/erp/ErpGate";
import ErpScreens from "../components/erp/ErpScreens";
import ErpShell from "../components/erp/ErpShell";

// ERP layout: the login gate, the frame, the state both facility screens share,
// and the screens themselves, which live here so switching keeps them alive. See
// docs/erp-plant-factory/RENCANA-ERP-PLANT-FACTORY.md.
export const Route = createFileRoute("/erp")({
  component: ErpLayout,
  head: () => ({
    meta: [
      { title: "agrosphere | ERP Plant Factory smartagri" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: A.agrosphereIcon },
    ],
  }),
});

function ErpLayout() {
  return (
    <ErpGate>
      <ErpStoreProvider>
        <ErpShell>
          <ErpScreens />
          <Outlet />
        </ErpShell>
      </ErpStoreProvider>
    </ErpGate>
  );
}
