import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { InvoiceListView } from "@/components/invoice-list-view";
import { EdmInvoicePanel } from "@/components/edm-invoice-panel";

export const Route = createFileRoute("/satis-faturalari")({
  head: () => ({
    meta: [
      { title: "Satış Faturaları — Fintra" },
      { name: "description", content: "Satış faturaları — ekle, düzenle, sil, Excel içe aktar." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = useStore((s) => s.salesInvoices);
  return (
    <div className="space-y-6">
    <InvoiceListView
      title="Satış Faturaları"
      partyLabel="Müşteri"
      newPrefix="SF"
      kind="sales"
      list={list}
      add={useStore((s) => s.addSales)}
      bulkAdd={useStore((s) => s.bulkAddSales)}
      update={useStore((s) => s.updateSales)}
      bulkUpdate={useStore((s) => s.bulkUpdateSales)}
      remove={useStore((s) => s.removeSales)}
      bulkRemove={useStore((s) => s.bulkRemoveSales)}
    />
    <EdmInvoicePanel direction="OUT" />
    </div>
  );
}
