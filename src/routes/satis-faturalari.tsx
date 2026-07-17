import { createFileRoute } from "@tanstack/react-router";
import { useStore } from "@/lib/store";
import { InvoiceListView } from "@/components/invoice-list-view";

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
  const add = useStore((s) => s.addSales);
  const bulkAdd = useStore((s) => s.bulkAddSales);
  const update = useStore((s) => s.updateSales);
  const remove = useStore((s) => s.removeSales);
  const bulkRemove = useStore((s) => s.bulkRemoveSales);
  return (
    <InvoiceListView
      title="Satış Faturaları"
      partyLabel="Müşteri"
      newPrefix="SF"
      list={list}
      add={add} bulkAdd={bulkAdd} update={update} remove={remove} bulkRemove={bulkRemove}
    />
  );
}
