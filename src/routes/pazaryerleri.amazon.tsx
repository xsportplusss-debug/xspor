import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";

export const Route = createFileRoute("/pazaryerleri/amazon")({
  head: () => ({
    meta: [
      { title: "Amazon — Pazaryeri — Fintra" },
      { name: "description", content: "Amazon sipariş, komisyon ve tahsilat özeti." },
    ],
  }),
  component: () => <MarketplacePage id="amazon" />,
});
