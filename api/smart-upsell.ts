import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'Unauthorized', suggestions: [] });
        }

        const { cartItems, availableInventory } = req.body;

        if (!cartItems?.length || !availableInventory?.length) {
            return res.status(200).json({ suggestions: [] });
        }

        // Use environment variable
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured', suggestions: [] });
        }

        const availableProducts = availableInventory.slice(0, 50);

        const systemPrompt = `You are a pharmacy sales assistant AI. Based on the customer's cart, suggest 2-3 COMPLEMENTARY products from the available list.
        Return JSON structure: { "suggestions": [{ "product_id": string, "product_name": string, "reason": string, "confidence": number }] }`;

        const userPrompt = `Cart: ${JSON.stringify(cartItems)}\nAvailable: ${JSON.stringify(availableProducts.map((p: any) => ({ id: p.id, name: p.name, category: p.category })))}`;

        // List of models for fast response and fallback
        const models = [
            "google/gemini-2.5-flash:free",
            "meta-llama/llama-3.1-8b-instruct:free",
            "qwen/qwen-2.5-7b-instruct:free",
            "openrouter/free"
        ];

        let lastError = "";

        for (const model of models) {
            try {
                console.log(`[Smart Upsell] Attempting model: ${model}`);
                const response = await fetch(OPENROUTER_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`,
                        'HTTP-Referer': 'https://pharmatrack.com.ng',
                        'X-Title': 'PharmaTrack AI'
                    },
                    body: JSON.stringify({
                        model,
                        messages: [
                            { role: 'system', content: systemPrompt },
                            { role: 'user', content: userPrompt }
                        ],
                        temperature: 0.2,
                        response_format: { type: "json_object" }
                    }),
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || `OpenRouter error: ${response.status}`);
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;

                if (!content) return res.status(200).json({ suggestions: [] });

                const cleanJson = content.replace(/```json\n|```/g, '').trim();
                return res.status(200).json(JSON.parse(cleanJson));
            } catch (err: any) {
                console.warn(`[Smart Upsell] Model ${model} failed: ${err.message}`);
                lastError = err.message;
            }
        }

        throw new Error(`All models failed. Last error: ${lastError}`);

    } catch (error: any) {
        console.error('Upsell API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error', suggestions: [] });
    }
}
