import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";
export const Route = createFileRoute("/pazaryerleri/idefix")({
  head: () => ({ meta: [{ title: "idefix — Pazaryeri — Fintra" }] }),
  component: () => <MarketplacePage id="idefix" />,
});
