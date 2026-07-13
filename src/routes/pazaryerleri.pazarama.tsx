import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";

export const Route = createFileRoute("/pazaryerleri/pazarama")({
  head: () => ({
    meta: [
      { title: "Pazarama — Pazaryeri — Fintra" },
      { name: "description", content: "Pazarama sipariş, komisyon ve tahsilat özeti." },
    ],
  }),
  component: () => <MarketplacePage id="pazarama" />,
});
