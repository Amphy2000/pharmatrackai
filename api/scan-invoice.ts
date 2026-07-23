const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const VISION_FREE_MODELS = [
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-26b-a4b-it:free",
    "openrouter/free"
];

function extractJson(text: string): any {
    if (!text) throw new Error("Empty response");
    let cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
    try { return JSON.parse(cleaned); } catch { /* continue */ }
    const fb = cleaned.indexOf('{');
    const fa = cleaned.indexOf('[');
    const start = fb === -1 ? fa : fa === -1 ? fb : Math.min(fb, fa);
    if (start !== -1) {
        const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (end > start) {
            try { return JSON.parse(cleaned.substring(start, end + 1)); } catch { /* continue */ }
        }
    }
    throw new Error(`Cannot parse JSON`);
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { images, imageUrl } = req.body || {};
        const imageList = images || (imageUrl ? [imageUrl] : []);

        if (!imageList.length) {
            return res.status(200).json({ items: [], invoiceTotal: null, supplierName: null });
        }

        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(200).json({ items: [], invoiceTotal: null, supplierName: null, note: "Manual entry mode active." });
        }

        const systemPrompt = `You are a PHARMACY INVOICE SPECIALIST. Extract product rows from the provided invoice image(s).
Return JSON format: { "items": [{ "productName": string, "quantity": number, "unitPrice": number, "sellingPrice": number|null, "batchNumber": string|null, "expiryDate": string|null }], "invoiceTotal": number|null, "supplierName": string|null }`;

        const contentParts: any[] = [{ type: "text", text: systemPrompt }];

        imageList.forEach((img: string) => {
            if (img.startsWith('data:')) {
                contentParts.push({ type: "image_url", image_url: { url: img } });
            } else {
                contentParts.push({ type: "text", text: `[Image URL: ${img}]` });
            }
        });

        for (const model of VISION_FREE_MODELS) {
            try {
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
                        messages: [{ role: 'user', content: contentParts }],
                        temperature: 0.1,
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    const content = data.choices?.[0]?.message?.content;
                    if (content) {
                        return res.status(200).json(extractJson(content));
                    }
                }
            } catch { /* try next model */ }
        }

        return res.status(200).json({ items: [], invoiceTotal: null, supplierName: null });

    } catch (error: any) {
        console.error('Scan Invoice API Error:', error);
        return res.status(200).json({ items: [], invoiceTotal: null, supplierName: null });
    }
}
