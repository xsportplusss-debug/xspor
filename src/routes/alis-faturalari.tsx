import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { InvoiceListView } from "@/components/invoice-list-view";
import { EdmInvoicePanel } from "@/components/edm-invoice-panel";

export const Route = createFileRoute("/alis-faturalari")({
  head: () => ({
    meta: [
      { title: "Alış Faturaları — Fintra" },
      { name: "description", content: "Alış faturaları — ekle, düzenle, sil, Excel içe aktar." },
    ],
  }),
  component: Page,
});

function Page() {
  const list = useStore((s) => s.purchaseInvoices);
  return (
    <div className="space-y-6">
    <InvoiceListView
      title="Alış Faturaları"
      partyLabel="Tedarikçi"
      newPrefix="AF"
      kind="purchase"
      list={list}
      add={useStore((s) => s.addPurchase)}
      bulkAdd={useStore((s) => s.bulkAddPurchase)}
      update={useStore((s) => s.updatePurchase)}
      bulkUpdate={useStore((s) => s.bulkUpdatePurchase)}
      remove={useStore((s) => s.removePurchase)}
      bulkRemove={useStore((s) => s.bulkRemovePurchase)}
    />
    <EdmInvoicePanel direction="IN" />
    </div>
  );
}
