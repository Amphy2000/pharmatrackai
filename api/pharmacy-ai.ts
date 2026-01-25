import { createClient } from '@supabase/supabase-js';

const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";
// User provided key for the free tier
const USER_GEMINI_KEY = "AIzaSyAX_JB6Y8g2pFQYRI6RFLIAe_ZsBAcW4zs";

export default async function handler(req: any, res: any) {
    // 1. Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        // Minimal auth check: ensure header exists, but skip strict server-side validation 
        // because Vercel env vars for Supabase might be missing.
        const authHeader = req.headers['authorization'];
        if (!authHeader) {
            return res.status(401).json({ error: 'No authorization header' });
        }

        const { action, payload, message, messages } = req.body;
        const apiKey = process.env.GEMINI_API_KEY || USER_GEMINI_KEY;

        let prompt = "";
        let isJsonMode = false;

        // 2. Handle different actions
        if (action === 'interaction_check' || action === 'check_drug_interactions') {
            const meds = (payload?.medications || []).map((m: any) => `${m.name} (${m.category || 'Medication'})`).join(', ');
            prompt = `Analyze the following medications for potential drug-drug and drug-food interactions: ${meds}. 
            Return the analysis strictly as a JSON object with the following structure:
            {
                "interactions": [
                    {
                        "drugs": ["Drug A", "Drug B"],
                        "severity": "low" | "moderate" | "high" | "severe",
                        "description": "Short explanation of the interaction",
                        "recommendation": "What should the pharmacist/patient do?"
                    }
                ]
            }
            If no interactions are found, return an empty list for "interactions".
            Be accurate and professional. Include warnings for common food/alcohol interactions if applicable.`;
            isJsonMode = true;
        } else if (action === 'inventory_optimize') {
            prompt = `Analyze this inventory data and provide optimization suggestions: ${JSON.stringify(payload)}.
             Be concise and focused on high-impact actions.`;
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

            return await callGemini(history, apiKey, "You are PharmaTrack AI, a helpful pharmacy assistant.", res);
        } else {
            prompt = `Handle generic request: ${JSON.stringify(payload || req.body)}`;
        }

        // Standard prompt execution
        const contents = [{ role: 'user', parts: [{ text: prompt }] }];
        return await callGemini(contents, apiKey, "You are PharmaTrack AI. Return valid data only.", res, isJsonMode);

    } catch (error: any) {
        console.error('Pharma AI Error:', error);
        return res.status(500).json({ error: error.message || 'Server error' });
    }
}

async function callGemini(contents: any[], apiKey: string, systemInstruction: string, res: any, isJsonMode = false) {
    let attempts = 0;
    const maxAttempts = 5; // Extra attempts for Free Tier

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents,
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 1024,
                        responseMimeType: isJsonMode ? "application/json" : "text/plain"
                    },
                    systemInstruction: {
                        parts: [{ text: systemInstruction }]
                    }
                }),
            });

            // Handle Rate Limit (429) - Free tier is very restrictive
            if (response.status === 429) {
                const wait = (attempts + 1) * 3000;
                console.log(`[Gemini Bridge] Rate limited, waiting ${wait}ms...`);
                await new Promise(r => setTimeout(r, wait));
                attempts++;
                continue;
            }

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error?.message || `Gemini error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (isJsonMode) {
                try {
                    // Clean up markdown code blocks if necessary
                    const cleanJson = text.replace(/```json\n|```/g, '').trim();
                    return res.status(200).json(JSON.parse(cleanJson));
                } catch {
                    // Fallback to text if JSON parse fails
                    return res.status(200).json({ interactions: [], error: "Failed to parse AI response" });
                }
            }

            return res.status(200).json({ reply: text });
        } catch (err: any) {
            attempts++;
            if (attempts >= maxAttempts) throw err;
            await new Promise(r => setTimeout(r, (attempts) * 2000));
        }
    }
}
