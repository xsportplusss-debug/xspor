import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";

export const Route = createFileRoute("/pazaryerleri/trendyol")({
  head: () => ({
    meta: [
      { title: "Trendyol — Pazaryeri — Fintra" },
      { name: "description", content: "Trendyol sipariş, komisyon ve tahsilat özeti." },
    ],
  }),
  component: () => <MarketplacePage id="trendyol" />,
});
