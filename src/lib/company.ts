import { create } from "zustand";
import { persist } from "zustand/middleware";
import logoAsset from "@/assets/xsportplus-logo.png.asset.json";

export type Company = {
  name: string;
  tagline: string;
  owner: string;
  taxOffice: string;
  taxNo: string;
  address: string;
  phone: string;
  email: string;
  web: string;
  kep: string;
  logoUrl: string;
};

const defaults: Company = {
  name: "XSPORTPLUS",
  tagline: "Outdoor & Tactical Kamp Malzemeleri",
  owner: "Bayram Koçer",
  taxOffice: "KÜÇÜKKÖY",
  taxNo: "5730628635",
  address: "",
  phone: "0531 524 02 23",
  email: "info@meydankamp.com",
  web: "xsportplus.com.tr",
  kep: "bayram.kocer@hs01.kep.tr",
  logoUrl: logoAsset.url,
};

export const useCompany = create<Company & { set: (p: Partial<Company>) => void; reset: () => void }>()(
  persist(
    (set) => ({
      ...defaults,
      set: (p) => set((s) => ({ ...s, ...p })),
      reset: () => set(() => ({ ...defaults })),
    }),
    { name: "fintra:company:v2" },
  ),
);

