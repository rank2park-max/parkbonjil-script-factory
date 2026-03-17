import { createClient, SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let cachedUrl: string | null = null;
let cachedKey: string | null = null;

function getConfig(): { url: string; key: string } | null {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== "undefined"
      ? localStorage.getItem("script-factory-supabase-url")
      : null);
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== "undefined"
      ? localStorage.getItem("script-factory-supabase-anon-key")
      : null);

  if (!url || !key) return null;
  return { url, key };
}

export function getSupabaseClient(): SupabaseClient | null {
  const config = getConfig();
  if (!config) return null;

  if (!client || cachedUrl !== config.url || cachedKey !== config.key) {
    client = createClient(config.url, config.key, {
      global: {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Accept: "application/json; charset=utf-8",
        },
      },
    });
    cachedUrl = config.url;
    cachedKey = config.key;
  }

  return client;
}

export function isSupabaseConfigured(): boolean {
  return getConfig() !== null;
}

export function resetSupabaseClient(): void {
  client = null;
  cachedUrl = null;
  cachedKey = null;
}

/** 클라이언트: API 호출 시 헤더로 전달할 Supabase 자격증명 (localStorage) */
export function getSupabaseHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const url = localStorage.getItem("script-factory-supabase-url");
  const key = localStorage.getItem("script-factory-supabase-anon-key");
  if (!url || !key) return {};
  return {
    "x-supabase-url": url,
    "x-supabase-anon-key": key,
  };
}
