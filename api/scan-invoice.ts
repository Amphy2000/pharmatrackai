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
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { images, imageUrl } = req.body;
        const imageList = images || (imageUrl ? [imageUrl] : []);

        if (!imageList.length) {
            return res.status(400).json({ error: 'No images provided' });
        }

        // Use environment variable
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY not configured' });
        }

        const systemPrompt = `You are a PHARMACY INVOICE SPECIALIST. Extract every product row from the provided invoice(s).
        Return JSON format: { "items": [{ "productName": string, "quantity": number, "unitPrice": number, "sellingPrice": number|null, "batchNumber": string|null, "expiryDate": string|null }], "invoiceTotal": number|null, "supplierName": string|null }
        Rules:
        1. Extract EVERY row.
        2. Convert dates to YYYY-MM-DD.
        3. Remove currency symbols from prices.
        4. If quantity missing, use 1.`;

        // Format content parts for OpenAI/OpenRouter vision input
        const contentParts: any[] = [];
        contentParts.push({ type: "text", text: systemPrompt });

        imageList.forEach((img: string) => {
            if (img.startsWith('data:')) {
                contentParts.push({
                    type: "image_url",
                    image_url: {
                        url: img
                    }
                });
            } else {
                contentParts.push({
                    type: "text",
                    text: `[Image URL: ${img}]`
                });
            }
        });

        // Use vision-capable free models on OpenRouter
        const models = [
            "google/gemini-2.5-flash:free",
            "openrouter/free"
        ];

        let lastError = "";

        for (const model of models) {
            try {
                console.log(`[Invoice Scanner] Attempting model: ${model}`);
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
                            { role: 'user', content: contentParts }
                        ],
                        temperature: 0.1, // Lower for extraction accuracy
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
                console.warn(`[Invoice Scanner] Model ${model} failed: ${err.message}`);
                lastError = err.message;
            }
        }

        throw new Error(`All vision models failed. Last error: ${lastError}`);

    } catch (error: any) {
        console.error('Scan Invoice API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error' });
    }
}
