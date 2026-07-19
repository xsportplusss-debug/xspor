import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";
export const Route = createFileRoute("/pazaryerleri/pttavm")({
  head: () => ({ meta: [{ title: "PTTAVM — Pazaryeri — Fintra" }] }),
  component: () => <MarketplacePage id="pttavm" />,
});
