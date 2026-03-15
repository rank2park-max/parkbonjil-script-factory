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
    client = createClient(config.url, config.key);
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
