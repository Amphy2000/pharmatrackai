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
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { images, imageUrl } = req.body;
        const imageList = images || (imageUrl ? [imageUrl] : []);

        if (!imageList.length) {
            return res.status(400).json({ error: 'No images provided' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'Gemini API Key missing' });
        }

        const parts = imageList.map((img: string) => {
            if (img.startsWith('data:')) {
                const [mimePart, dataPart] = img.split(';base64,');
                const mimeType = mimePart.split(':')[1];
                return { inline_data: { mime_type: mimeType, data: dataPart } };
            }
            return { text: `[Image URL: ${img}]` };
        });

        const systemPrompt = `You are a PHARMACY INVOICE SPECIALIST. Extract every product row from the provided invoice(s).
        Return JSON format: { "items": [{ "productName": string, "quantity": number, "unitPrice": number, "sellingPrice": number|null, "batchNumber": string|null, "expiryDate": string|null }], "invoiceTotal": number|null, "supplierName": string|null }
        Rules:
        1. Extract EVERY row.
        2. Convert dates to YYYY-MM-DD.
        3. Remove currency symbols from prices.
        4. If quantity missing, use 1.`;

        parts.unshift({ text: systemPrompt });

        let attempts = 0;
        const maxAttempts = 3;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ role: 'user', parts }],
                        generationConfig: {
                            responseMimeType: "application/json",
                            temperature: 0.1 // Lower for extraction accuracy
                        }
                    }),
                });

                if (response.status === 429) {
                    const wait = (attempts + 1) * 6000;
                    console.log(`[Invoice Scanner] Rate limited, waiting ${wait}ms...`);
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
                await new Promise(r => setTimeout(r, (attempts) * 2000));
            }
        }

    } catch (error: any) {
        console.error('Scan Invoice API Error:', error);
        return res.status(500).json({ error: error.message || 'Server error' });
    }
}
