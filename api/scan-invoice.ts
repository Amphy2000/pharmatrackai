const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
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

/**
 * Direct call to Google Gemini 1.5 Flash API (1,500 free requests / day)
 */
async function callGeminiDirect(apiKey: string, imageList: string[], systemPrompt: string): Promise<any> {
    const contents: any[] = [];
    const parts: any[] = [{ text: systemPrompt }];

    for (const img of imageList) {
        if (img.startsWith('data:image/')) {
            const matches = img.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
            if (matches) {
                parts.push({
                    inlineData: {
                        mimeType: matches[1],
                        data: matches[2]
                    }
                });
            }
        }
    }

    contents.push({ parts });

    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            generationConfig: {
                temperature: 0.1,
                responseMimeType: "application/json"
            }
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
    }

    const resData = await response.json();
    const candidateText = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error("Gemini returned empty candidate text");

    return extractJson(candidateText);
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

        const geminiKey = process.env.GEMINI_API_KEY;
        const openrouterKey = process.env.OPENROUTER_API_KEY;

        const systemPrompt = `You are a PHARMACY INVOICE SPECIALIST. Extract product rows from the provided invoice image(s).
Return strictly valid JSON format:
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

        // 1. PRIMARY: Direct Gemini 1.5 Flash (1,500 free calls / day)
        if (geminiKey) {
            try {
                console.log("[Scan Invoice] Attempting Direct Gemini 1.5 Flash...");
                const result = await callGeminiDirect(geminiKey, imageList, systemPrompt);
                if (result && Array.isArray(result.items)) {
                    console.log(`[Scan Invoice] Gemini Flash success: Extracted ${result.items.length} items`);
                    return res.status(200).json(result);
                }
            } catch (geminiErr: any) {
                console.warn("[Scan Invoice] Direct Gemini Flash failed:", geminiErr?.message || geminiErr);
                // Fallback to OpenRouter below
            }
        }

        // 2. SECONDARY: OpenRouter Free Models
        if (openrouterKey || geminiKey) {
            const apiKey = openrouterKey || geminiKey;
            const contentParts: any[] = [{ type: "text", text: systemPrompt }];

            imageList.forEach((img: string) => {
                if (img.startsWith('data:')) {
                    contentParts.push({ type: "image_url", image_url: { url: img } });
                }
            });

            for (const model of VISION_FREE_MODELS) {
                try {
                    console.log(`[Scan Invoice] Attempting OpenRouter model: ${model}...`);
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
        }

        // 3. TERTIARY: Return empty structure so UI opens manual table gracefully
        return res.status(200).json({ items: [], invoiceTotal: null, supplierName: null, note: "Manual entry mode active." });

    } catch (error: any) {
        console.error('Scan Invoice API Error:', error);
        return res.status(200).json({ items: [], invoiceTotal: null, supplierName: null });
    }
}
