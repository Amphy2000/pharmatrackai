import { supabase } from '@/lib/supabase';
import { callAI } from '@/utils/ai-bridge';

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
  `${import.meta.env.VITE_EXTERNAL_SUPABASE_URL}/functions/v1/pharmacy-ai`;

export function isPharmacyAiConfigured() {
  return Boolean(import.meta.env.VITE_PHARMACY_AI_URL || import.meta.env.VITE_EXTERNAL_SUPABASE_URL);
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // Get the current session token
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    console.warn('[pharmacy-ai] No active session. AI calls may fail with 401.');
  }

  return headers;
}

export async function callPharmacyAi<T>(params: {
  action: string;
  payload: unknown;
  pharmacy_id: string | null | undefined;
  signal?: AbortSignal;
}): Promise<T> {
  const { data, error } = await callAI('pharmacy-ai', {
    action: params.action,
    payload: params.payload,
    pharmacy_id: params.pharmacy_id ?? null,
  });

  if (error) {
    const msg = error.message || (typeof error === 'string' ? error : 'Request failed');
    throw new PharmacyAiError(msg, { status: error.status });
  }

  return (data ?? ({} as any)) as T;
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
