// Kullanıcı tercihleri — son banka, son filtreler, sıralama; otomatik kaydedilir.
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";

export type AppPrefs = {
  lastBankId?: string;
  lastAccountId?: string;
  filters?: Record<string, unknown>;
  sort?: { key: string; dir: "asc" | "desc" };
  [k: string]: unknown;
};

const LOCAL_KEY = "fintra-prefs";

function readLocal(): AppPrefs {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEY) ?? "{}") as AppPrefs;
  } catch {
    return {};
  }
}

function writeLocal(p: AppPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export async function fetchPrefs(): Promise<AppPrefs> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return readLocal();
  const { data } = await supabase
    .from("user_prefs")
    .select("prefs")
    .eq("user_id", u.user.id)
    .maybeSingle();
  const remote = ((data?.prefs ?? {}) as AppPrefs) || {};
  const merged = { ...readLocal(), ...remote };
  writeLocal(merged);
  return merged;
}

let saveTimer: ReturnType<typeof setTimeout> | undefined;

export async function savePrefs(patch: AppPrefs) {
  const merged = { ...readLocal(), ...patch };
  writeLocal(merged);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase
      .from("user_prefs")
      .upsert({ user_id: u.user.id, prefs: merged as never }, { onConflict: "user_id" });
  }, 400);
}

/** Tercihleri yükler; her değişiklikte otomatik kaydeder. */
export function usePrefs() {
  const [prefs, setPrefs] = useState<AppPrefs>(() => readLocal());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    fetchPrefs()
      .then((p) => alive && setPrefs(p))
      .catch(() => undefined)
      .finally(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  const update = (patch: AppPrefs) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
    void savePrefs(patch);
  };

  return { prefs, ready, update };
}
