import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Invoice, Cari, Product, Bank, BankTx, CashRegister, CashTx, Category } from "./mock-data";

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

type State = {
  salesInvoices: Invoice[];
  purchaseInvoices: Invoice[];
  cariList: Cari[];
  products: Product[];
  categories: Category[];
  banks: Bank[];
  bankTx: BankTx[];
  cashRegisters: CashRegister[];
  cashTx: CashTx[];
};

type Actions = {
  // sales
  addSales: (v: Omit<Invoice, "id">) => void;
  bulkAddSales: (v: Omit<Invoice, "id">[]) => void;
  removeSales: (id: string) => void;
  // purchase
  addPurchase: (v: Omit<Invoice, "id">) => void;
  bulkAddPurchase: (v: Omit<Invoice, "id">[]) => void;
  removePurchase: (id: string) => void;
  // cari
  addCari: (v: Omit<Cari, "id">) => void;
  removeCari: (id: string) => void;
  // products
  addProduct: (v: Omit<Product, "id">) => void;
  bulkAddProducts: (v: Omit<Product, "id">[]) => void;
  removeProduct: (id: string) => void;
  // categories
  addCategory: (name: string) => void;
  ensureCategory: (name: string) => void;
  removeCategory: (id: string) => void;
  // banks
  addBank: (v: Omit<Bank, "id">) => void;
  removeBank: (id: string) => void;
  addBankTx: (v: Omit<BankTx, "id">) => void;
  bulkAddBankTx: (v: Omit<BankTx, "id">[]) => void;
  updateBankTx: (id: string, patch: Partial<BankTx>) => void;
  removeBankTx: (id: string) => void;
  // cash
  addCash: (v: Omit<CashRegister, "id">) => void;
  removeCash: (id: string) => void;
  addCashTx: (v: Omit<CashTx, "id">) => void;
  updateCashTx: (id: string, patch: Partial<CashTx>) => void;
  removeCashTx: (id: string) => void;
  // meta
  resetAll: () => void;
};

const initial: State = {
  salesInvoices: [],
  purchaseInvoices: [],
  cariList: [],
  products: [],
  categories: [],
  banks: [],
  bankTx: [],
  cashRegisters: [],
  cashTx: [],
};

export const useStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initial,

      addSales: (v) => set((s) => ({ salesInvoices: [{ ...v, id: uid() }, ...s.salesInvoices] })),
      bulkAddSales: (list) => set((s) => ({ salesInvoices: [...list.map((v) => ({ ...v, id: uid() })), ...s.salesInvoices] })),
      removeSales: (id) => set((s) => ({ salesInvoices: s.salesInvoices.filter((x) => x.id !== id) })),

      addPurchase: (v) => set((s) => ({ purchaseInvoices: [{ ...v, id: uid() }, ...s.purchaseInvoices] })),
      bulkAddPurchase: (list) => set((s) => ({ purchaseInvoices: [...list.map((v) => ({ ...v, id: uid() })), ...s.purchaseInvoices] })),
      removePurchase: (id) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.filter((x) => x.id !== id) })),

      addCari: (v) => set((s) => ({ cariList: [{ ...v, id: uid() }, ...s.cariList] })),
      removeCari: (id) => set((s) => ({ cariList: s.cariList.filter((x) => x.id !== id) })),

      addProduct: (v) => set((s) => ({ products: [{ ...v, id: uid() }, ...s.products] })),
      bulkAddProducts: (list) => set((s) => {
        const now = s.products;
        const added: Product[] = [];
        for (const p of list) {
          // barkod veya sku aynıysa atla
          if (p.barcode && now.some((x) => x.barcode === p.barcode)) continue;
          if (p.sku && now.some((x) => x.sku === p.sku)) continue;
          added.push({ ...p, id: uid() });
        }
        return { products: [...added, ...now] };
      }),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),

      addCategory: (name) => set((s) => ({ categories: [...s.categories, { id: uid(), name }] })),
      ensureCategory: (name) => set((s) => (
        s.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())
          ? s
          : { categories: [...s.categories, { id: uid(), name }] }
      )),
      removeCategory: (id) => set((s) => ({ categories: s.categories.filter((x) => x.id !== id) })),

      addBank: (v) => set((s) => ({ banks: [{ ...v, id: uid() }, ...s.banks] })),
      removeBank: (id) => set((s) => ({
        banks: s.banks.filter((x) => x.id !== id),
        bankTx: s.bankTx.filter((x) => x.bankId !== id),
      })),
      addBankTx: (v) => set((s) => ({ bankTx: [{ ...v, id: uid() }, ...s.bankTx] })),
      bulkAddBankTx: (list) => set((s) => ({ bankTx: [...list.map((v) => ({ ...v, id: uid() })), ...s.bankTx] })),
      updateBankTx: (id, patch) => set((s) => ({ bankTx: s.bankTx.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      removeBankTx: (id) => set((s) => ({ bankTx: s.bankTx.filter((x) => x.id !== id) })),

      addCash: (v) => set((s) => ({ cashRegisters: [{ ...v, id: uid() }, ...s.cashRegisters] })),
      removeCash: (id) => set((s) => ({
        cashRegisters: s.cashRegisters.filter((x) => x.id !== id),
        cashTx: s.cashTx.filter((x) => x.cashId !== id),
      })),
      addCashTx: (v) => set((s) => ({ cashTx: [{ ...v, id: uid() }, ...s.cashTx] })),
      updateCashTx: (id, patch) => set((s) => ({ cashTx: s.cashTx.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      removeCashTx: (id) => set((s) => ({ cashTx: s.cashTx.filter((x) => x.id !== id) })),

      resetAll: () => set(() => ({ ...initial })),
    }),
    { name: "fintra:v1" },
  ),
);

// Türev seçiciler
export function bankBalance(bankId: string) {
  const s = useStore.getState();
  const b = s.banks.find((x) => x.id === bankId);
  if (!b) return 0;
  return b.balance + s.bankTx.filter((t) => t.bankId === bankId).reduce((a, x) => a + x.amount, 0);
}

export function cashBalance(cashId: string) {
  const s = useStore.getState();
  const c = s.cashRegisters.find((x) => x.id === cashId);
  if (!c) return 0;
  return c.balance + s.cashTx.filter((t) => t.cashId === cashId).reduce((a, x) => a + x.amount, 0);
}
