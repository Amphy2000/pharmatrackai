import { PharmacyAiError } from '@/lib/pharmacyAiClient';

function looksLikeQuotaIssue(text: string) {
  const t = text.toLowerCase();
  return (
    t.includes('resource_exhausted') ||
    t.includes('quota') ||
    t.includes('insufficient') ||
    t.includes('billing') ||
    t.includes('rate limit')
  );
}

function looksLikeInvalidKey(text: string) {
  const t = text.toLowerCase();
  return t.includes('api key') && (t.includes('invalid') || t.includes('not valid') || t.includes('unauthorized'));
}

export function getPharmacyAiUiError(err: unknown): {
  message: string;
  debug?: string;
  status?: number;
} {
  if (err instanceof PharmacyAiError) {
    const status = err.status;
    const debug = err.bodyText;

    if (status === 429) {
      // Gemini typically returns 429 when rate-limited or quota is exhausted.
      const quotaHint = debug && looksLikeQuotaIssue(debug);
      return {
        status,
        debug,
        message: quotaHint
          ? 'AI is rate-limited (Gemini quota reached). Please wait a bit or top up/raise your Gemini quota, then retry.'
          : 'AI is busy (rate limited). Please wait ~30 seconds and retry.',
      };
    }

    if (status === 401) {
      return {
        status,
        debug,
        message:
          'AI authentication failed (401). Check your external backend publishable key is set in your hosting environment and matches your external project.',
      };
    }

    if (status === 403) {
      const keyHint = debug && looksLikeInvalidKey(debug);
      const quotaHint = debug && looksLikeQuotaIssue(debug);
      return {
        status,
        debug,
        message: quotaHint
          ? 'AI access denied due to quota/billing on Gemini (403). Please check your Gemini billing/quota and retry.'
          : keyHint
            ? 'AI access denied (403). Your Gemini API key may be invalid/restricted. Please verify the key and its restrictions.'
            : 'AI access denied (403). Ensure your external backend endpoint allows unauthenticated calls (JWT verification off) and keys are correct.',
      };
    }

    const fallbackMsg = err.message || (status ? `Status ${status}` : 'Unknown AI error');
    return {
      status,
      debug,
      message: `AI error: ${fallbackMsg}`,
    };
  }

  if (err instanceof Error) return { message: err.message };
  return { message: 'AI request failed. Please try again.' };
}
