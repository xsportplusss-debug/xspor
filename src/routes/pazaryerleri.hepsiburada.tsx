import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";

export const Route = createFileRoute("/pazaryerleri/hepsiburada")({
  head: () => ({
    meta: [
      { title: "Hepsiburada — Pazaryeri — Fintra" },
      { name: "description", content: "Hepsiburada sipariş, komisyon ve tahsilat özeti." },
    ],
  }),
  component: () => <MarketplacePage id="hepsiburada" />,
});
