// Rule-based transaction classifier for Turkish bank statements
export type TxCategory = {
  category: string;
  entryType: "gelir" | "gider" | "tahsilat" | "odeme" | "komisyon" | "vergi" | "diger";
};

const RULES: { pattern: RegExp; category: string; entryType: TxCategory["entryType"] }[] = [
  // Marketplace sales income
  { pattern: /trendyol/i, category: "Satış Geliri - Trendyol", entryType: "gelir" },
  { pattern: /hepsiburada|hb\s*ticaret/i, category: "Satış Geliri - Hepsiburada", entryType: "gelir" },
  { pattern: /amazon/i, category: "Satış Geliri - Amazon", entryType: "gelir" },
  { pattern: /\bn11\b/i, category: "Satış Geliri - N11", entryType: "gelir" },
  { pattern: /pazarama/i, category: "Satış Geliri - Pazarama", entryType: "gelir" },
  { pattern: /çiçeksepeti|ciceksepeti/i, category: "Satış Geliri - ÇiçekSepeti", entryType: "gelir" },
  { pattern: /pttavm|ptt\s*avm/i, category: "Satış Geliri - PttAvm", entryType: "gelir" },
  { pattern: /idefix/i, category: "Satış Geliri - idefix", entryType: "gelir" },
  { pattern: /turkcell\s*pas/i, category: "Satış Geliri - Turkcell Pasaj", entryType: "gelir" },

  // Fees and deductions
  { pattern: /komisyon|komsyn/i, category: "Banka Komisyonu", entryType: "komisyon" },
  { pattern: /\bpos\b|üye ?işyeri|uye ?isyeri/i, category: "POS Kesintisi", entryType: "komisyon" },
  { pattern: /bsmv|kkdf/i, category: "Vergi Kesintisi", entryType: "vergi" },

  // Shipping
  { pattern: /kargo|aras|yurtiçi|yurtici|mng|ptt kargo|ups|dhl/i, category: "Kargo Gideri", entryType: "gider" },

  // Government
  { pattern: /vergi|gib\b|gelir idares/i, category: "Vergi Ödemesi", entryType: "vergi" },
  { pattern: /sgk|sosyal güvenlik|sosyal guvenlik/i, category: "SGK Ödemesi", entryType: "vergi" },

  // Payroll / rent / utilities
  { pattern: /maaş|maas|personel|bordro/i, category: "Personel Gideri", entryType: "gider" },
  { pattern: /kira/i, category: "Kira Gideri", entryType: "gider" },
  { pattern: /elektrik|enerji|enerjisa|cez|bedaş|bedas/i, category: "Elektrik Gideri", entryType: "gider" },
  { pattern: /doğalgaz|dogalgaz|igdaş|igdas/i, category: "Doğalgaz Gideri", entryType: "gider" },
  { pattern: /su fatura|iski|aski|belediye su/i, category: "Su Gideri", entryType: "gider" },
  { pattern: /telefon|turkcell|vodafone|türk telekom|turk telekom/i, category: "Telefon/İnternet", entryType: "gider" },
  { pattern: /internet|superonline|ttnet/i, category: "Telefon/İnternet", entryType: "gider" },

  // Transfers
  { pattern: /havale|eft|fast\b/i, category: "Transfer", entryType: "diger" },
  { pattern: /kredi kart|kk ödeme|kk odeme/i, category: "Kredi Kartı Ödemesi", entryType: "odeme" },
];

export function classify(description: string, amount: number): TxCategory {
  const d = (description || "").trim();
  for (const r of RULES) {
    if (r.pattern.test(d)) {
      // Sales are income only when money comes in
      if (r.entryType === "gelir" && amount < 0) return { category: r.category, entryType: "odeme" };
      return { category: r.category, entryType: r.entryType };
    }
  }
  if (amount > 0) return { category: "Diğer Gelir", entryType: "tahsilat" };
  if (amount < 0) return { category: "Diğer Gider", entryType: "odeme" };
  return { category: "Bilgi", entryType: "diger" };
}
