import { supabase } from "@/integrations/supabase/client";

/**
 * Centrally manages AI calls, preferring Vercel Serverless (Free) over Supabase Edge.
 * Optimized for PharmaTrack.
 */
export async function callAI(
    endpoint: 'pharmacy-ai' | 'generate-insights' | 'scan-invoice' | 'smart-upsell',
    payload: any
): Promise<{ data: any; error: any }> {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        // Relaxed Auth: Try to use session, but fallback to anonymous if missing
        const accessToken = session?.access_token || "anonymous_token";

        if (!session) {
            console.warn("[AI Bridge] No active session found. Proceeding with anonymous access.");
        }

        // 1. Try Vercel API first (Free, no credit limit)
        console.log(`[AI Bridge] Attempting Vercel API: /api/${endpoint}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        try {
            const vResponse = await fetch(`/api/${endpoint}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${accessToken}`
                },
                body: JSON.stringify(payload),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            const contentType = vResponse.headers.get("content-type");
            if (vResponse.ok && contentType && contentType.includes("application/json")) {
                const data = await vResponse.json();
                console.log(`[AI Bridge] Success via Vercel: /api/${endpoint}`);
                return { data, error: null };
            } else if (vResponse.ok) {
                console.warn(`[AI Bridge] Vercel returned non-JSON (likely HTML fallback): ${contentType}`);
                // Fall through to Supabase fallback
            } else {
                // Check if 404
                if (vResponse.status === 404) {
                    console.warn(`[AI Bridge] Vercel API /api/${endpoint} not found (404). Falling back...`);
                } else {
                    const errText = await vResponse.text().catch(() => "No error text");
                    console.error(`[AI Bridge] Vercel Error (${vResponse.status}):`, errText);
                }
            }
        } catch (fetchErr) {
            clearTimeout(timeoutId);
            console.warn(`[AI Bridge] Vercel fetch failed (network/timeout):`, fetchErr);
            // Fall through to Supabase fallback
        }



        // 3. Fallback to Supabase Edge Functions (Uses Lovable Credits)
        console.log(`[AI Bridge] Falling back to Supabase Edge: ${endpoint}`);
        const { data, error } = await supabase.functions.invoke(endpoint, {
            body: payload
        });

        return { data, error };

    } catch (err: any) {
        console.error(`[AI Bridge] Global failure:`, err);
        return { data: null, error: err };
    }
}
