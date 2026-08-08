import { createFileRoute, Link } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace-page";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { getMarketplace } from "@/services/marketplaces";

export const Route = createFileRoute("/pazaryerleri/$id")({
  head: () => ({
    meta: [
      { title: "Pazaryeri Detayı — Fintra" },
      { name: "description", content: "Pazaryeri siparişleri, komisyonları ve ödemeleri." },
    ],
  }),
  component: Page,
});

function Page() {
  const { id } = Route.useParams();
  if (!id || !getMarketplace(id)) {
    return (
      <EmptyState
        icon={Store}
        title="Pazaryeri bulunamadı"
        desc="Geçersiz pazaryeri adresi. Listeye dönüp tekrar deneyin."
        action={<Link to="/pazaryerleri"><Button size="sm" variant="outline">Pazaryerleri</Button></Link>}
      />
    );
  }
  return <MarketplacePage id={id} />;
}
