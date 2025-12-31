// Utility to extract helpful error messages from backend function calls.
// Supabase-js wraps non-2xx responses as FunctionsHttpError with a Response in `context`.

export async function describeFunctionsInvokeError(err: unknown): Promise<string> {
  const anyErr = err as any;
  const base = anyErr?.message ? String(anyErr.message) : 'Request failed';

  const ctx: any = anyErr?.context;
  const status: number | undefined = ctx?.status ?? anyErr?.status;

  let details: string | undefined;
  if (ctx && typeof ctx.clone === 'function') {
    try {
      const cloned = ctx.clone();
      if (typeof cloned.json === 'function') {
        const body = await cloned.json();
        details = body?.error ?? body?.message ?? (typeof body === 'string' ? body : JSON.stringify(body));
      }
    } catch {
      try {
        const cloned = ctx.clone();
        if (typeof cloned.text === 'function') {
          const text = await cloned.text();
          if (text) details = text;
        }
      } catch {
        // ignore
      }
    }
  }

  const parts = [status ? `(${status})` : null, details ? `${base}: ${details}` : base].filter(Boolean);
  return parts.join(' ');
}
