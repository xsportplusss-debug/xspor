import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";

export const Route = createFileRoute("/pazaryerleri/n11")({
  head: () => ({
    meta: [
      { title: "N11 — Pazaryeri — Fintra" },
      { name: "description", content: "N11 sipariş, komisyon ve tahsilat özeti." },
    ],
  }),
  component: () => <MarketplacePage id="n11" />,
});
