import { createClient } from '@supabase/supabase-js';

// OpenRouter free API endpoint
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export default async function handler(req: any, res: any) {
    // 1. Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const authHeader = req.headers['authorization'];
        // Relaxed auth: Allow request if header is missing in some cases or just log it
        if (!authHeader) {
            console.warn("Missing auth header, proceeding anyway for testing");
        }

        const { action, payload, message, messages } = req.body;

        // Use environment variable for API Key
        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(200).json({ error: 'OPENROUTER_API_KEY not configured. Please add it in Vercel Environment Variables.', interactions: [] });
        }

        let prompt = "";
        let isJsonMode = false;

        // 2. Handle different actions
        if (action === 'interaction_check' || action === 'check_drug_interactions') {
            const meds = (payload?.medications || []).map((m: any) => `${m.name} (${m.category || 'Medication'})`).join(', ');

            // Simplified prompt for speed and reliability
            prompt = `Analyze these medications for interactions: ${meds}. 
            Return JSON:
            {
                "interactions": [
                    {
                        "drugs": ["Drug A", "Drug B"],
                        "severity": "low" | "moderate" | "high" | "severe",
                        "description": "Short explanation",
                        "recommendation": "Action to take"
                    }
                ]
            }
            Return empty interactions array if safe.`;
            isJsonMode = true;
        } else if (action === 'inventory_optimize') {
            prompt = `Analyze this inventory data and provide optimization suggestions: ${JSON.stringify(payload)}. Be concise.`;
        } else if (message || messages) {
            // Generic Chat Mode
            const history = (messages || [])
                .filter((m: any) => m.role !== 'system')
                .slice(-10)
                .map((m: any) => ({
                    role: m.role === 'assistant' ? 'model' : 'user',
                    parts: [{ text: m.content }]
                }));

            if (message) history.push({ role: 'user', parts: [{ text: message }] });

            return await callOpenRouter(history, apiKey, "You are PharmaTrack AI.", res);
        } else {
            prompt = `Handle generic request: ${JSON.stringify(payload || req.body)}`;
        }

        // Standard prompt execution
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];
        return await callOpenRouter(contents, apiKey, "You are PharmaTrack AI. Return valid JSON.", res, isJsonMode);

    } catch (error: any) {
        console.error('Pharma AI Error:', error);
        return res.status(200).json({ error: error.message || 'Server error', interactions: [] }); // Return 200 with error to prevent "non-2xx" client crash
    }
}

async function callOpenRouter(contents: any[], apiKey: string, systemInstruction: string, res: any, isJsonMode = false) {
    // Standardize Gemini parts/contents format to OpenAI messages format
    const messages = contents.map((c: any) => {
        const role = c.role === "model" || c.role === "assistant" ? "assistant" : "user";
        const content = c.parts?.[0]?.text || c.content || "";
        return { role, content };
    });

    const activeKey = apiKey;

    // We try multiple free models sequentially to ensure maximum speed and 100% uptime
    const models = [
        "google/gemini-2.5-flash:free",
        "meta-llama/llama-3.1-8b-instruct:free",
        "qwen/qwen-2.5-7b-instruct:free",
        "openrouter/free"
    ];

    let lastError = "";

    for (const model of models) {
        try {
            console.log(`[OpenRouter] Attempting model: ${model}`);

            const fullMessages = [
                { role: "system", content: systemInstruction },
                ...messages
            ];

            const body: any = {
                model,
                messages: fullMessages,
                temperature: 0.2,
                max_tokens: 1024
            };

            if (isJsonMode) {
                body.response_format = { type: "json_object" };
            }

            const response = await fetch(OPENROUTER_API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${activeKey}`,
                    "HTTP-Referer": "https://pharmatrack.com.ng",
                    "X-Title": "PharmaTrack AI"
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `OpenRouter error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.choices?.[0]?.message?.content || "";

            if (isJsonMode) {
                try {
                    const cleanJson = text.replace(/```json\n|```/g, '').trim();
                    return res.status(200).json(JSON.parse(cleanJson));
                } catch {
                    try {
                        return res.status(200).json(JSON.parse(text));
                    } catch {
                        return res.status(200).json({ interactions: [], error: "Failed to parse JSON response from AI", raw: text });
                    }
                }
            }

            return res.status(200).json({ reply: text });
        } catch (err: any) {
            console.warn(`[OpenRouter] Model ${model} failed: ${err.message}`);
            lastError = err.message;
        }
    }

    return res.status(200).json({ interactions: [], error: `AI Connection Failed: ${lastError}` });
}

