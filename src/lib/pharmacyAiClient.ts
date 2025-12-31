export class PharmacyAiError extends Error {
  status?: number;
  bodyText?: string;

  constructor(message: string, opts?: { status?: number; bodyText?: string }) {
    super(message);
    this.name = 'PharmacyAiError';
    this.status = opts?.status;
    this.bodyText = opts?.bodyText;
  }
}

export const PHARMACY_AI_URL =
  import.meta.env.VITE_PHARMACY_AI_URL ??
  'https://sdejkpweecasdzsixxbd.supabase.co/functions/v1/pharmacy-ai';

const EXTERNAL_PUBLISHABLE_KEY =
  import.meta.env.VITE_EXTERNAL_SUPABASE_PUBLISHABLE_KEY ??
  import.meta.env.VITE_EXTERNAL_SUPABASE_ANON_KEY ??
  '';

export function isPharmacyAiConfigured() {
  return Boolean(EXTERNAL_PUBLISHABLE_KEY);
}

function buildHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // For a public Edge Function (verify_jwt=false), Supabase still expects an API key
  // (anon/publishable key) via `apikey` and `Authorization`.
  if (EXTERNAL_PUBLISHABLE_KEY) {
    headers['apikey'] = EXTERNAL_PUBLISHABLE_KEY;
    headers['Authorization'] = `Bearer ${EXTERNAL_PUBLISHABLE_KEY}`;
  }

  return headers;
}

export async function callPharmacyAi<T>(params: {
  action: string;
  payload: unknown;
  pharmacy_id: string | null | undefined;
  signal?: AbortSignal;
}): Promise<T> {
  const res = await fetch(PHARMACY_AI_URL, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({
      action: params.action,
      payload: params.payload,
      pharmacy_id: params.pharmacy_id ?? null,
    }),
    signal: params.signal,
  });

  const bodyText = await res.text();
  let json: any = null;
  try {
    json = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    json = null;
  }

  if (!res.ok) {
    const msg =
      json?.error ||
      json?.message ||
      (typeof json === 'string' ? json : null) ||
      bodyText ||
      `Request failed (${res.status})`;

    throw new PharmacyAiError(msg, { status: res.status, bodyText });
  }

  return (json ?? ({} as any)) as T;
}

export async function callPharmacyAiWithFallback<T>(params: {
  actions: string[];
  payload: unknown;
  pharmacy_id: string | null | undefined;
  signal?: AbortSignal;
}): Promise<T> {
  let lastError: unknown;

  for (const action of params.actions) {
    try {
      return await callPharmacyAi<T>({
        action,
        payload: params.payload,
        pharmacy_id: params.pharmacy_id,
        signal: params.signal,
      });
    } catch (err) {
      lastError = err;

      if (err instanceof PharmacyAiError) {
        // Auth/rate-limit/server: aliases won't help.
        if (err.status === 401 || err.status === 403 || err.status === 429) throw err;
        if (err.status && err.status >= 500) throw err;
        // 4xx (e.g. unknown action): try the next alias
        continue;
      }

      // Network/CORS errors: aliases won't help.
      throw err;
    }
  }

  throw lastError;
}
