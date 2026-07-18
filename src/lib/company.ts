import { create } from "zustand";
import { persist } from "zustand/middleware";
import logoAsset from "@/assets/xsportplus-logo.png.asset.json";

export type Company = {
  name: string;
  taxOffice: string;
  taxNo: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  logoUrl: string;
};

const defaults: Company = {
  name: "XSportPlus",
  taxOffice: "",
  taxNo: "",
  address: "",
  phone: "",
  email: "",
  web: "",
  logoUrl: logoAsset.url,
};

export const useCompany = create<Company & { set: (p: Partial<Company>) => void; reset: () => void }>()(
  persist(
    (set) => ({
      ...defaults,
      set: (p) => set((s) => ({ ...s, ...p })),
      reset: () => set(() => ({ ...defaults })),
    }),
    { name: "fintra:company:v1" },
  ),
);
