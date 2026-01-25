import { createClient } from '@supabase/supabase-js';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key missing', suggestions: [] });
        }

        const availableProducts = availableInventory.slice(0, 50);

        const systemPrompt = `You are a pharmacy sales assistant AI. Based on the customer's cart, suggest 2-3 COMPLEMENTARY products from the available list.
        Return JSON structure: { "suggestions": [{ "product_id": string, "product_name": string, "reason": string, "confidence": number }] }`;

        const userPrompt = `Cart: ${JSON.stringify(cartItems)}\nAvailable: ${JSON.stringify(availableProducts.map((p: any) => ({ id: p.id, name: p.name, category: p.category })))}`;

        const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
                generationConfig: { responseMimeType: "application/json" }
            }),
        });

        if (!response.ok) throw new Error(`Gemini error: ${response.status}`);

        const data = await response.json();
        const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!content) return res.status(200).json({ suggestions: [] });

        return res.status(200).json(JSON.parse(content));

    } catch (error: any) {
        console.error('Upsell API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error', suggestions: [] });
    }
}
