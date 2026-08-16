import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type EdmSettingsForm = {
  api_url: string;
  environment: string;
  username: string;
  password?: string | null;
  vkn_tckn?: string | null;
  company_name?: string | null;
  gb_label?: string | null;
  pk_label?: string | null;
  company_code?: string | null;
  token?: string | null;
};

export const getEdmSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { getSettings } = await import("./edm/service.server");
    return getSettings(context.userId);
  });

export const saveEdmSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: EdmSettingsForm) => input)
  .handler(async ({ data, context }) => {
    const { saveSettings } = await import("./edm/service.server");
    return saveSettings(context.userId, data);
  });

export const testEdmConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { testConnection } = await import("./edm/service.server");
    return testConnection(context.userId);
  });

export const syncEdmInvoices = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    direction: "IN" | "OUT";
    startDate?: string;
    endDate?: string;
    sinceLastSync?: boolean;
  }) => input)
  .handler(async ({ data, context }) => {
    const { syncInvoices } = await import("./edm/service.server");
    return syncInvoices(context.userId, data);
  });

export const listEdmInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { direction: "IN" | "OUT" }) => input)
  .handler(async ({ data, context }) => {
    const { listInvoices } = await import("./edm/service.server");
    return listInvoices(context.userId, data.direction);
  });

export const getEdmInvoiceDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    const { invoiceDetail } = await import("./edm/service.server");
    return invoiceDetail(context.userId, data.id);
  });
