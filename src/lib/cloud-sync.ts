import { supabase } from "@/integrations/supabase/client";
import { useStore } from "./store";
import { useCompany } from "./company";

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let currentUserId: string | null = null;
let hydrated = false;
let saving = false;

const DATA_KEYS = [
  "salesInvoices",
  "purchaseInvoices",
  "cariList",
  "products",
  "categories",
  "banks",
  "bankTx",
  "cashRegisters",
  "cashTx",
] as const;

function snapshotData() {
  const s = useStore.getState() as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of DATA_KEYS) out[k] = s[k];
  return out;
}

function snapshotCompany() {
  const { set: _s, reset: _r, ...rest } = useCompany.getState();
  return rest;
}

function isEmpty(data: Record<string, unknown>) {
  return DATA_KEYS.every((k) => {
    const v = data[k] as unknown[] | undefined;
    return !v || v.length === 0;
  });
}

async function push() {
  if (!currentUserId || !hydrated || saving) return;
  saving = true;
  try {
    const payload = {
      user_id: currentUserId,
      data: snapshotData() as never,
      company: snapshotCompany() as never,
      updated_at: new Date().toISOString(),
    };
    await supabase.from("user_data").upsert(payload, { onConflict: "user_id" });
  } catch (e) {
    console.error("cloud sync push failed", e);
  } finally {
    saving = false;
  }
}

function schedulePush() {
  if (!hydrated) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(push, 800);
}

export async function loadFromCloud(userId: string) {
  currentUserId = userId;
  hydrated = false;
  const { data, error } = await supabase
    .from("user_data")
    .select("data, company")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("cloud load failed", error);
  }

  const cloudData = (data?.data as Record<string, unknown> | null) ?? null;
  const cloudCompany = (data?.company as Record<string, unknown> | null) ?? null;

  if (cloudData && !isEmpty(cloudData)) {
    useStore.setState(cloudData as never);
  } else {
    // First login: keep whatever is in local store (localStorage cache) and push it up.
    const local = snapshotData();
    if (!isEmpty(local)) {
      await supabase.from("user_data").upsert(
        {
          user_id: userId,
          data: local as never,
          company: snapshotCompany() as never,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    }
  }

  if (cloudCompany && Object.keys(cloudCompany).length > 0) {
    useCompany.setState(cloudCompany as never);
  }

  hydrated = true;
}

export function initAutoSync() {
  useStore.subscribe(schedulePush);
  useCompany.subscribe(schedulePush);
}

export function stopSync() {
  hydrated = false;
  currentUserId = null;
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
}
