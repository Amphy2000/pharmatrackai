import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODELS = [
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free"
];

function extractJson(text: string): any {
    if (!text) throw new Error("Empty response");
    let cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    try { return JSON.parse(cleaned); } catch { /* continue */ }
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);
    if (start !== -1) {
        const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (end > start) {
            try { return JSON.parse(cleaned.substring(start, end + 1)); } catch { /* continue */ }
        }
    }
    throw new Error(`Cannot parse JSON from response`);
}

async function callModel(model: string, messages: any[], apiKey: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://pharmatrack.com.ng",
            "X-Title": "PharmaTrack AI"
        },
        body: JSON.stringify({ model, messages, temperature: 0.3, max_tokens: 1500 }),
        signal
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty model response");
    return content;
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') return res.status(200).end();

    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized', insights: [] });

        const supabase = createClient(
            process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL!,
            process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) return res.status(401).json({ error: 'Unauthorized', insights: [] });

        const { medications, currency = 'NGN', currencySymbol = '₦' } = req.body;
        if (!medications || !Array.isArray(medications)) {
            return res.status(400).json({ error: 'medications must be an array', insights: [] });
        }

        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured', insights: [] });

        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const totalValue = medications.reduce((sum: number, m: any) => sum + (m.current_stock * Number(m.unit_price)), 0);
        const expired = medications.filter((m: any) => m.expiry_date < today);
        const expiringSoon = medications.filter((m: any) => m.expiry_date >= today && m.expiry_date <= thirtyDaysFromNow);
        const lowStock = medications.filter((m: any) => m.current_stock <= m.reorder_level);
        const formatAmount = (amount: number) => `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        const inventorySummary = medications.slice(0, 80).map((m: any) => ({
            name: m.name, stock: m.current_stock, price: m.unit_price, expiry: m.expiry_date
        }));

        const systemPrompt = `You are an elite pharmacy business analyst AI. Respond with ONLY valid JSON — no markdown, no backticks.
Analytics summary: Total value: ${formatAmount(totalValue)}, Expired: ${expired.length}, Expiring soon (30d): ${expiringSoon.length}, Low stock: ${lowStock.length}. Today: ${today}. Currency: ${currencySymbol}.`;

        const userPrompt = `Inventory data: ${JSON.stringify(inventorySummary)}

Return exactly this JSON structure with 6 actionable insights:
{"insights":[{"id":"1","type":"warning","message":"specific insight here","action":"specific action","impact":"business impact","category":"category name"}]}
Types: "warning" (urgent), "suggestion" (improvement), "info" (observation).`;

        const fullMessages = [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
        ];

        const controllers = FREE_MODELS.map(() => new AbortController());
        const attempts = FREE_MODELS.map((model, i) =>
            callModel(model, fullMessages, apiKey, controllers[i].signal)
                .then(text => ({ text, model }))
        );

        try {
            const { text, model } = await Promise.any(attempts);
            controllers.forEach(c => c.abort());
            console.log(`[Insights] Won with: ${model}`);
            const parsed = extractJson(text);
            return res.status(200).json(parsed);
        } catch {
            for (const model of FREE_MODELS) {
                try {
                    const text = await callModel(model, fullMessages, apiKey, new AbortController().signal);
                    return res.status(200).json(extractJson(text));
                } catch { /* try next */ }
            }
        }

        return res.status(200).json({ insights: [], error: 'All AI models temporarily unavailable. Please retry.' });

    } catch (error: any) {
        console.error('Insights API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error', insights: [] });
    }
}
