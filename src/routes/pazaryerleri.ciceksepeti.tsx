import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";
export const Route = createFileRoute("/pazaryerleri/ciceksepeti")({
  head: () => ({ meta: [{ title: "ÇiçekSepeti — Pazaryeri — Fintra" }] }),
  component: () => <MarketplacePage id="ciceksepeti" />,
});
