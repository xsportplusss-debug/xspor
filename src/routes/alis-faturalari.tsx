import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { InvoiceListView } from "@/components/invoice-list-view";

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
  const add = useStore((s) => s.addPurchase);
  const bulkAdd = useStore((s) => s.bulkAddPurchase);
  const update = useStore((s) => s.updatePurchase);
  const remove = useStore((s) => s.removePurchase);
  const bulkRemove = useStore((s) => s.bulkRemovePurchase);
  return (
    <InvoiceListView
      title="Alış Faturaları"
      partyLabel="Tedarikçi"
      newPrefix="AF"
      list={list}
      add={add} bulkAdd={bulkAdd} update={update} remove={remove} bulkRemove={bulkRemove}
    />
  );
}
