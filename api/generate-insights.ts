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

        // Use environment variable
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured', insights: [] });
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

        const models = [
            "google/gemini-2.5-flash:free",
            "meta-llama/llama-3.1-8b-instruct:free",
            "qwen/qwen-2.5-7b-instruct:free",
            "openrouter/free"
        ];

        let lastError = "";

        for (const model of models) {
            try {
                console.log(`[Insights] Attempting model: ${model}`);
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
                            { role: 'user', content: `Inventory Data: ${JSON.stringify(inventorySummary)}` }
                        ],
                        temperature: 0.5,
                        response_format: { type: "json_object" }
                    }),
                });

                if (!response.ok) {
                    const err = await response.json().catch(() => ({}));
                    throw new Error(err.error?.message || `OpenRouter error: ${response.status}`);
                }

                const data = await response.json();
                const content = data.choices?.[0]?.message?.content;
                if (!content) throw new Error('Empty response from AI');

                const cleanJson = content.replace(/```json\n|```/g, '').trim();
                return res.status(200).json(JSON.parse(cleanJson));
            } catch (err: any) {
                console.warn(`[Insights] Model ${model} failed: ${err.message}`);
                lastError = err.message;
            }
        }

        throw new Error(`All models failed. Last error: ${lastError}`);

    } catch (error: any) {
        console.error('Insights API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error', insights: [] });
    }
}
