const GEMINI_MODELS = [
    "gemini-1.5-flash",
    "gemini-2.5-flash",
    "gemini-2.0-flash-exp"
];
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
    throw new Error(`Cannot parse JSON from model output: ${text.substring(0, 100)}...`);
}

/**
 * Direct call to Google Gemini API (1,500 free requests / day)
 */
async function callGeminiDirect(apiKey: string, imageList: string[], systemPrompt: string): Promise<any> {
    const parts: any[] = [{ text: systemPrompt }];

    for (const img of imageList) {
        if (img.startsWith('data:')) {
            const commaIndex = img.indexOf(',');
            if (commaIndex !== -1) {
                const header = img.substring(0, commaIndex);
                const base64Data = img.substring(commaIndex + 1).replace(/[\r\n]/g, '');
                const mimeMatch = header.match(/data:(image\/[a-zA-Z0-9.+_-]+)/);
                const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
                parts.push({
                    inlineData: {
                        mimeType,
                        data: base64Data
                    }
                });
            }
        }
    }

    let lastError: Error | null = null;

    for (const modelName of GEMINI_MODELS) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: "application/json"
                    }
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Gemini (${modelName}) HTTP ${response.status}: ${errText}`);
            }

            const resData = await response.json();
            const candidateText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!candidateText) throw new Error(`Gemini (${modelName}) returned empty text`);

            return extractJson(candidateText);
        } catch (err: any) {
            console.warn(`[Scan Invoice] ${modelName} failed:`, err.message);
            lastError = err;
        }
    }

    throw lastError || new Error("All Gemini models failed");
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
            return res.status(200).json({ error: "No image received. Please take or upload a photo of the invoice." });
        }

        const geminiKey = process.env.GEMINI_API_KEY;
        const openrouterKey = process.env.OPENROUTER_API_KEY;

        if (!geminiKey && !openrouterKey) {
            return res.status(200).json({
                error: "GEMINI_API_KEY is not configured on Vercel yet. Please add GEMINI_API_KEY in Vercel Environment Variables and redeploy."
            });
        }

        const systemPrompt = `You are a PHARMACY INVOICE SPECIALIST. Extract product rows from the provided invoice image(s).
Return strictly valid JSON format matching:
{
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "unitPrice": number,
      "sellingPrice": number|null,
      "batchNumber": "string|null",
      "expiryDate": "YYYY-MM-DD|null"
    }
  ],
  "invoiceTotal": number|null,
  "supplierName": "string|null"
}`;

        // 1. PRIMARY: Direct Gemini API (1,500 free calls / day)
        if (geminiKey) {
            try {
                const result = await callGeminiDirect(geminiKey, imageList, systemPrompt);
                if (result && Array.isArray(result.items)) {
                    return res.status(200).json(result);
                }
            } catch (geminiErr: any) {
                console.warn("[Scan Invoice] Direct Gemini failed:", geminiErr?.message || geminiErr);
                if (!openrouterKey) {
                    return res.status(200).json({ error: `Gemini extraction failed: ${geminiErr?.message || 'Check API key or image'}` });
                }
            }
        }

        // 2. SECONDARY: OpenRouter Free Models
        if (openrouterKey) {
            const contentParts: any[] = [{ type: "text", text: systemPrompt }];

            imageList.forEach((img: string) => {
                if (img.startsWith('data:')) {
                    contentParts.push({ type: "image_url", image_url: { url: img } });
                }
            });

            for (const model of VISION_FREE_MODELS) {
                try {
                    const response = await fetch(OPENROUTER_API_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${openrouterKey}`,
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
        }

        return res.status(200).json({ error: "Failed to extract items from invoice. Please ensure image is clear and try again." });

    } catch (error: any) {
        console.error('Scan Invoice API Error:', error);
        return res.status(200).json({ error: error?.message || 'Failed to process invoice' });
    }
}
