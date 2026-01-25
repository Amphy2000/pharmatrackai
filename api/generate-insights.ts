import { createClient } from '@supabase/supabase-js';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

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
            return res.status(401).json({ error: 'No authorization header', insights: [] });
        }

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL!,
            process.env.VITE_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: authHeader } } }
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return res.status(401).json({ error: 'Unauthorized', insights: [] });
        }

        const { medications, currency = 'NGN', currencySymbol = '₦' } = req.body;

        if (!medications || !Array.isArray(medications)) {
            return res.status(400).json({ error: 'medications must be an array', insights: [] });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key missing', insights: [] });
        }

        const today = new Date().toISOString().split('T')[0];
        const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const totalValue = medications.reduce((sum, m) => sum + (m.current_stock * Number(m.unit_price)), 0);
        const expired = medications.filter(m => m.expiry_date < today);
        const expiringSoon = medications.filter(m => m.expiry_date >= today && m.expiry_date <= thirtyDaysFromNow);
        const lowStock = medications.filter(m => m.current_stock <= m.reorder_level);

        const formatAmount = (amount: number) => `${currencySymbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

        const systemPrompt = `You are an elite AI pharmacy business analyst. Provide exactly 6 high-impact insights in JSON format.
        Use ${currencySymbol} for all amounts. Current date: ${today}.
        
        Analytics:
        - Total inventory: ${formatAmount(totalValue)}
        - Expired: ${expired.length}
        - Expiring Soon: ${expiringSoon.length}
        - Low Stock: ${lowStock.length}
        
        Return JSON with "insights" array containing 6 objects:
        { "insights": [ { "id": "uuid", "type": "warning"|"suggestion"|"info", "message": "...", "action": "...", "impact": "...", "category": "..." } ] }`;

        const inventorySummary = medications.slice(0, 100).map(m => ({
            name: m.name,
            stock: m.current_stock,
            price: m.unit_price,
            expiry: m.expiry_date
        }));

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            role: 'user',
                            parts: [{ text: `${systemPrompt}\n\nInventory Data: ${JSON.stringify(inventorySummary)}` }]
                        }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.5
                        }
                    }),
                });

                if (response.status === 429) {
                    const wait = (attempts + 1) * 5000;
                    console.log(`[Insights] Rate limited, waiting ${wait}ms...`);
                    await new Promise(r => setTimeout(r, wait));
                    attempts++;
                    continue;
                }

                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error?.message || `Gemini error: ${response.status}`);
                }

                const data = await response.json();
                const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!content) throw new Error('Empty response from AI');

                return res.status(200).json(JSON.parse(content));
            } catch (err: any) {
                attempts++;
                if (attempts >= maxAttempts) throw err;
                await new Promise(r => setTimeout(r, 2000));
            }
        }

    } catch (error: any) {
        console.error('Insights API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error', insights: [] });
    }
}
