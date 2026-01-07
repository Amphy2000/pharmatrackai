// Runtime external-backend config loader.
// We avoid relying only on Vite build-time env because published builds can lag.

export type ExternalBackendConfig = {
  url: string;
  publishableKey: string;
};

const LS_KEY = "pharmatrack_external_backend_config_v1";

type ExternalBackendConfigResponse = {
  ok: boolean;
  url?: string;
  publishableKey?: string;
  message?: string;
};

function safeTrim(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export function readExternalBackendConfig(): ExternalBackendConfig | null {
  // 1) Prefer build-time env (dev/local builds)
  const url = safeTrim(import.meta.env.VITE_EXTERNAL_SUPABASE_URL);
  const key = safeTrim(import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY);
  if (url && key) return { url, publishableKey: key };

  // 2) Fallback to cached runtime config (published builds)
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ExternalBackendConfig>;
    if (typeof parsed.url === "string" && typeof parsed.publishableKey === "string") {
      const cachedUrl = parsed.url.trim();
      const cachedKey = parsed.publishableKey.trim();
      if (cachedUrl && cachedKey) return { url: cachedUrl, publishableKey: cachedKey };
    }
  } catch {
    // ignore
  }

  return null;
}

export async function fetchExternalBackendConfig(): Promise<ExternalBackendConfig | null> {
  // Uses Lovable Cloud backend function as the source of truth.
  const backendUrl = safeTrim(import.meta.env.VITE_SUPABASE_URL);
  const anonKey = safeTrim(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
  if (!backendUrl || !anonKey) return null;

  try {
    const res = await fetch(`${backendUrl}/functions/v1/external-backend-config`, {
      method: "GET",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      cache: "no-store",
    });

    if (!res.ok) return null;

    const data = (await res.json()) as ExternalBackendConfigResponse;
    if (!data?.ok || !data.url || !data.publishableKey) return null;

    const cfg: ExternalBackendConfig = {
      url: data.url.trim(),
      publishableKey: data.publishableKey.trim(),
    };

    if (!cfg.url || !cfg.publishableKey) return null;

    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, JSON.stringify(cfg));
    }

    return cfg;
  } catch {
    return null;
  }
}

export function clearExternalBackendConfigCache() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}
