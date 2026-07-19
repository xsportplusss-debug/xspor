import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";
export const Route = createFileRoute("/pazaryerleri/turkcell-pasaj")({
  head: () => ({ meta: [{ title: "Turkcell Pasaj — Pazaryeri — Fintra" }] }),
  component: () => <MarketplacePage id="turkcell-pasaj" />,
});
