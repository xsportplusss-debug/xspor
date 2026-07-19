import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Invoice, Cari, Product, Bank, BankTx, CashRegister, CashTx, Category, BankImportRecord } from "./mock-data";


const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export type EInvoiceConfig = {
  apiUrl: string;
  username: string;
  password: string;
  companyCode: string;
  token: string;
  provider: string; // GİB veya entegratör adı
};

export type MarketplaceConfig = {
  apiUrl: string;
  apiKey: string;
  apiSecret: string;
  merchantId: string;
  token: string;
  connected: boolean;
  lastSync?: string;
};

export type MarketplaceOrder = {
  id: string;
  marketplace: string; // trendyol, hepsiburada, ...
  orderNo: string;
  date: string;
  customer: string;
  amount: number;   // sipariş tutarı (KDV dahil)
  vat: number;
  shipping: number;
  commission: number;
  net: number;      // net kazanç
  status: "Yeni" | "Hazırlanıyor" | "Kargo" | "Tamamlandı" | "İade";
};

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
  bankImports: BankImportRecord[];
  eInvoiceConfig: EInvoiceConfig | null;
  eInvoiceLastSync: string | null;

  marketplaceConfigs: Record<string, MarketplaceConfig>;
  marketplaceOrders: MarketplaceOrder[];
};


type Actions = {
  // sales
  addSales: (v: Omit<Invoice, "id">) => void;
  bulkAddSales: (v: Omit<Invoice, "id">[]) => void;
  updateSales: (id: string, patch: Partial<Invoice>) => void;
  bulkUpdateSales: (ids: string[], patch: Partial<Invoice>) => void;
  removeSales: (id: string) => void;
  bulkRemoveSales: (ids: string[]) => void;
  // purchase
  addPurchase: (v: Omit<Invoice, "id">) => void;
  bulkAddPurchase: (v: Omit<Invoice, "id">[]) => void;
  updatePurchase: (id: string, patch: Partial<Invoice>) => void;
  bulkUpdatePurchase: (ids: string[], patch: Partial<Invoice>) => void;
  removePurchase: (id: string) => void;
  bulkRemovePurchase: (ids: string[]) => void;
  // cari
  addCari: (v: Omit<Cari, "id">) => void;
  updateCari: (id: string, patch: Partial<Cari>) => void;
  removeCari: (id: string) => void;
  bulkRemoveCari: (ids: string[]) => void;
  // products
  addProduct: (v: Omit<Product, "id">) => void;
  bulkAddProducts: (v: Omit<Product, "id">[]) => void;
  updateProduct: (id: string, patch: Partial<Product>) => void;
  removeProduct: (id: string) => void;
  bulkRemoveProducts: (ids: string[]) => void;
  // categories
  addCategory: (name: string) => void;
  ensureCategory: (name: string) => void;
  updateCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => void;
  bulkRemoveCategories: (ids: string[]) => void;
  // banks
  addBank: (v: Omit<Bank, "id">) => void;
  removeBank: (id: string) => void;
  addBankTx: (v: Omit<BankTx, "id">) => void;
  bulkAddBankTx: (v: Omit<BankTx, "id">[]) => void;
  updateBankTx: (id: string, patch: Partial<BankTx>) => void;
  removeBankTx: (id: string) => void;
  bulkRemoveBankTx: (ids: string[]) => void;
  // cash
  addCash: (v: Omit<CashRegister, "id">) => void;
  removeCash: (id: string) => void;
  addCashTx: (v: Omit<CashTx, "id">) => void;
  updateCashTx: (id: string, patch: Partial<CashTx>) => void;
  removeCashTx: (id: string) => void;
  bulkRemoveCashTx: (ids: string[]) => void;
  // e-invoice
  setEInvoiceConfig: (c: EInvoiceConfig | null) => void;
  setEInvoiceLastSync: (iso: string) => void;
  // marketplace
  setMarketplaceConfig: (id: string, c: MarketplaceConfig) => void;
  removeMarketplaceConfig: (id: string) => void;
  addMarketplaceOrders: (list: Omit<MarketplaceOrder, "id">[]) => number;
  removeMarketplaceOrders: (marketplace: string) => void;
  // banks extra
  updateBank: (id: string, patch: Partial<Bank>) => void;
  addBankImport: (v: Omit<BankImportRecord, "id">) => string;
  removeBankImport: (id: string) => void;
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
  bankImports: [],
  eInvoiceConfig: null,
  eInvoiceLastSync: null,
  marketplaceConfigs: {},
  marketplaceOrders: [],

};


export const useStore = create<State & Actions>()(
  persist(
    (set) => ({
      ...initial,

      addSales: (v) => set((s) => ({ salesInvoices: [{ ...v, id: uid() }, ...s.salesInvoices] })),
      bulkAddSales: (list) => set((s) => ({ salesInvoices: [...list.map((v) => ({ ...v, id: uid() })), ...s.salesInvoices] })),
      updateSales: (id, patch) => set((s) => ({ salesInvoices: s.salesInvoices.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      bulkUpdateSales: (ids, patch) => set((s) => ({ salesInvoices: s.salesInvoices.map((x) => ids.includes(x.id) ? { ...x, ...patch } : x) })),
      removeSales: (id) => set((s) => ({ salesInvoices: s.salesInvoices.filter((x) => x.id !== id) })),
      bulkRemoveSales: (ids) => set((s) => ({ salesInvoices: s.salesInvoices.filter((x) => !ids.includes(x.id)) })),

      addPurchase: (v) => set((s) => ({ purchaseInvoices: [{ ...v, id: uid() }, ...s.purchaseInvoices] })),
      bulkAddPurchase: (list) => set((s) => ({ purchaseInvoices: [...list.map((v) => ({ ...v, id: uid() })), ...s.purchaseInvoices] })),
      updatePurchase: (id, patch) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      bulkUpdatePurchase: (ids, patch) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.map((x) => ids.includes(x.id) ? { ...x, ...patch } : x) })),
      removePurchase: (id) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.filter((x) => x.id !== id) })),
      bulkRemovePurchase: (ids) => set((s) => ({ purchaseInvoices: s.purchaseInvoices.filter((x) => !ids.includes(x.id)) })),

      addCari: (v) => set((s) => ({ cariList: [{ ...v, id: uid() }, ...s.cariList] })),
      updateCari: (id, patch) => set((s) => ({ cariList: s.cariList.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      removeCari: (id) => set((s) => ({ cariList: s.cariList.filter((x) => x.id !== id) })),
      bulkRemoveCari: (ids) => set((s) => ({ cariList: s.cariList.filter((x) => !ids.includes(x.id)) })),

      addProduct: (v) => set((s) => ({ products: [{ ...v, id: uid() }, ...s.products] })),
      bulkAddProducts: (list) => set((s) => {
        const now = s.products;
        const added: Product[] = [];
        for (const p of list) {
          if (p.barcode && now.some((x) => x.barcode === p.barcode)) continue;
          if (p.sku && now.some((x) => x.sku === p.sku)) continue;
          added.push({ ...p, id: uid() });
        }
        return { products: [...added, ...now] };
      }),
      updateProduct: (id, patch) => set((s) => ({ products: s.products.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      removeProduct: (id) => set((s) => ({ products: s.products.filter((x) => x.id !== id) })),
      bulkRemoveProducts: (ids) => set((s) => ({ products: s.products.filter((x) => !ids.includes(x.id)) })),

      addCategory: (name) => set((s) => ({ categories: [...s.categories, { id: uid(), name }] })),
      ensureCategory: (name) => set((s) => (
        s.categories.some((c) => c.name.toLowerCase() === name.toLowerCase())
          ? s
          : { categories: [...s.categories, { id: uid(), name }] }
      )),
      updateCategory: (id, name) => set((s) => ({ categories: s.categories.map((x) => x.id === id ? { ...x, name } : x) })),
      removeCategory: (id) => set((s) => ({ categories: s.categories.filter((x) => x.id !== id) })),
      bulkRemoveCategories: (ids) => set((s) => ({ categories: s.categories.filter((x) => !ids.includes(x.id)) })),

      addBank: (v) => set((s) => ({ banks: [{ ...v, id: uid() }, ...s.banks] })),
      removeBank: (id) => set((s) => ({
        banks: s.banks.filter((x) => x.id !== id),
        bankTx: s.bankTx.filter((x) => x.bankId !== id),
      })),
      addBankTx: (v) => set((s) => ({ bankTx: [{ ...v, id: uid() }, ...s.bankTx] })),
      bulkAddBankTx: (list) => set((s) => ({ bankTx: [...list.map((v) => ({ ...v, id: uid() })), ...s.bankTx] })),
      updateBankTx: (id, patch) => set((s) => ({ bankTx: s.bankTx.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      removeBankTx: (id) => set((s) => ({ bankTx: s.bankTx.filter((x) => x.id !== id) })),
      bulkRemoveBankTx: (ids) => set((s) => ({ bankTx: s.bankTx.filter((x) => !ids.includes(x.id)) })),

      addCash: (v) => set((s) => ({ cashRegisters: [{ ...v, id: uid() }, ...s.cashRegisters] })),
      removeCash: (id) => set((s) => ({
        cashRegisters: s.cashRegisters.filter((x) => x.id !== id),
        cashTx: s.cashTx.filter((x) => x.cashId !== id),
      })),
      addCashTx: (v) => set((s) => ({ cashTx: [{ ...v, id: uid() }, ...s.cashTx] })),
      updateCashTx: (id, patch) => set((s) => ({ cashTx: s.cashTx.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      removeCashTx: (id) => set((s) => ({ cashTx: s.cashTx.filter((x) => x.id !== id) })),
      bulkRemoveCashTx: (ids) => set((s) => ({ cashTx: s.cashTx.filter((x) => !ids.includes(x.id)) })),

      setEInvoiceConfig: (c) => set(() => ({ eInvoiceConfig: c })),
      setEInvoiceLastSync: (iso) => set(() => ({ eInvoiceLastSync: iso })),

      setMarketplaceConfig: (id, c) => set((s) => ({ marketplaceConfigs: { ...s.marketplaceConfigs, [id]: c } })),
      removeMarketplaceConfig: (id) => set((s) => {
        const cfg = { ...s.marketplaceConfigs };
        delete cfg[id];
        return { marketplaceConfigs: cfg };
      }),
      addMarketplaceOrders: (list) => {
        let added = 0;
        set((s) => {
          const existing = new Set(s.marketplaceOrders.map((o) => `${o.marketplace}:${o.orderNo}`));
          const fresh: MarketplaceOrder[] = [];
          for (const o of list) {
            const key = `${o.marketplace}:${o.orderNo}`;
            if (existing.has(key)) continue;
            existing.add(key);
            fresh.push({ ...o, id: uid() });
            added++;
          }
          return { marketplaceOrders: [...fresh, ...s.marketplaceOrders] };
        });
        return added;
      },
      removeMarketplaceOrders: (marketplace) => set((s) => ({
        marketplaceOrders: s.marketplaceOrders.filter((o) => o.marketplace !== marketplace),
      })),

      updateBank: (id, patch) => set((s) => ({ banks: s.banks.map((x) => x.id === id ? { ...x, ...patch } : x) })),
      addBankImport: (v) => {
        const id = uid();
        set((s) => ({ bankImports: [{ ...v, id }, ...s.bankImports] }));
        return id;
      },
      removeBankImport: (id) => set((s) => ({
        bankImports: s.bankImports.filter((x) => x.id !== id),
        bankTx: s.bankTx.filter((t) => t.importId !== id),
      })),


      resetAll: () => set(() => ({ ...initial })),

    }),
    { name: "fintra:v1" },
  ),
);

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
