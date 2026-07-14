import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Store } from "lucide-react";
import { marketplaces } from "@/lib/mock-data";

export function MarketplacePage({ id }: { id: string }) {
  const m = marketplaces.find((x) => x.id === id);
  const name = m?.name ?? id.charAt(0).toUpperCase() + id.slice(1);

  return (
    <div className="space-y-6">
      <PageHeader
        title={name}
        subtitle="Pazaryeri entegrasyonu — bağlantı sonrası siparişler burada listelenir."
      />
      <EmptyState
        icon={Store}
        title={`${name} entegrasyonu yok`}
        desc="Pazaryeri hesabınızı bağladığınızda sipariş, komisyon ve kargo bilgileri burada görünecek."
      />
    </div>
  );
}
