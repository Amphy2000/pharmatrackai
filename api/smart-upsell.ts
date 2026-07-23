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
        body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 512 }),
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
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized', suggestions: [] });

        const { cartItems, availableInventory } = req.body;
        if (!cartItems?.length || !availableInventory?.length) {
            return res.status(200).json({ suggestions: [] });
        }

        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured', suggestions: [] });

        const availableProducts = availableInventory.slice(0, 40).map((p: any) => ({ id: p.id, name: p.name, category: p.category }));

        const systemPrompt = `You are a pharmacy sales assistant. Respond with ONLY valid JSON — no markdown, no explanation.`;
        const userPrompt = `Customer cart: ${JSON.stringify(cartItems.map((c: any) => c.name || c.product_name))}
Available products: ${JSON.stringify(availableProducts)}

Suggest 2-3 complementary products. Return:
{"suggestions":[{"product_id":"id","product_name":"name","reason":"clinical reason","confidence":0.9}]}`;

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
            console.log(`[Smart Upsell] Won with: ${model}`);
            const parsed = extractJson(text);
            return res.status(200).json(parsed);
        } catch { /* fall through */ }

        return res.status(200).json({ suggestions: [] });

    } catch (error: any) {
        console.error('Upsell API Error:', error);
        return res.status(200).json({ error: error.message || 'Server error', suggestions: [] });
    }
}
