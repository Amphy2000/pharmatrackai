import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODELS = [
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free"
];

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action, payload, message, messages } = req.body;

        const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(200).json({ error: 'OPENROUTER_API_KEY not configured in Vercel Environment Variables.', interactions: [] });
        }

        let systemPrompt = "You are PharmaTrack AI, a pharmacy assistant. Always return valid JSON only — no markdown, no explanation, just the raw JSON object.";
        let userPrompt = "";

        if (action === 'interaction_check' || action === 'check_drug_interactions') {
            const meds = (payload?.medications || [])
                .map((m: any) => `${m.name} (${m.category || 'Medication'})`)
                .join(', ');

            systemPrompt = `You are a clinical pharmacy AI. You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation.`;
            userPrompt = `Check drug interactions for: ${meds}.
Return this exact JSON structure:
{"interactions":[{"drugs":["Drug A","Drug B"],"severity":"low","description":"Brief clinical explanation","recommendation":"Action to take"}]}
If no interactions, return: {"interactions":[]}`;

        } else if (action === 'inventory_optimize') {
            systemPrompt = `You are a pharmacy inventory AI. Respond with ONLY valid JSON.`;
            userPrompt = `Analyze this inventory and give optimization suggestions: ${JSON.stringify(payload)}.
Return: {"suggestions":[{"title":"...","description":"...","priority":"high|medium|low"}]}`;

        } else if (message || messages) {
            const history = (messages || [])
                .filter((m: any) => m.role !== 'system')
                .slice(-10)
                .map((m: any) => ({ role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user', content: m.content || m.parts?.[0]?.text || '' }));
            if (message) history.push({ role: 'user', content: message });
            return await raceModels(history, apiKey, "You are PharmaTrack AI, a helpful pharmacy assistant.", res, false);
        } else {
            userPrompt = `Handle request: ${JSON.stringify(payload || req.body)}`;
        }

        const chatMessages = [
            { role: 'user', content: userPrompt }
        ];
        return await raceModels(chatMessages, apiKey, systemPrompt, res, true);

    } catch (error: any) {
        console.error('Pharma AI Error:', error);
        return res.status(200).json({ error: error.message || 'Server error', interactions: [] });
    }
}

function extractJson(text: string): any {
    if (!text) throw new Error("Empty response");

    let cleaned = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();

    try { return JSON.parse(cleaned); } catch { /* continue */ }

    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    const start = firstBrace === -1 ? firstBracket : firstBracket === -1 ? firstBrace : Math.min(firstBrace, firstBracket);

    if (start !== -1) {
        const lastBrace = cleaned.lastIndexOf('}');
        const lastBracket = cleaned.lastIndexOf(']');
        const end = Math.max(lastBrace, lastBracket);
        if (end > start) {
            try { return JSON.parse(cleaned.substring(start, end + 1)); } catch { /* continue */ }
        }
    }
    throw new Error(`Cannot parse JSON from: ${text.substring(0, 200)}`);
}

async function callModel(model: string, messages: any[], apiKey: string, signal: AbortSignal): Promise<string> {
    const response = await fetch(OPENROUTER_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`,
            "HTTP-Referer": "https://pharmatrack.com.ng",
            "X-Title": "PharmaTrack AI"
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: 0.1,
            max_tokens: 1024,
        }),
        signal
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error?.message || `HTTP ${response.status}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty model response");
    return content;
}

async function raceModels(messages: any[], apiKey: string, system: string, res: any, isJson: boolean) {
    const fullMessages = [{ role: "system", content: system }, ...messages];

    const controllers = FREE_MODELS.map(() => new AbortController());

    const attempts = FREE_MODELS.map((model, i) =>
        callModel(model, fullMessages, apiKey, controllers[i].signal)
            .then(text => ({ text, model }))
    );

    try {
        const { text, model } = await Promise.any(attempts.map(p =>
            p.catch(e => Promise.reject(e))
        ));

        controllers.forEach(c => c.abort());
        console.log(`[OpenRouter] Won race with model: ${model}`);

        if (isJson) {
            try {
                const parsed = extractJson(text);
                return res.status(200).json(parsed);
            } catch (parseErr: any) {
                console.warn(`[OpenRouter] JSON parse failed for ${model}: ${parseErr.message}`);
            }
        } else {
            return res.status(200).json({ reply: text });
        }
    } catch {
        console.warn("[OpenRouter] Parallel race failed, attempting fallback to openrouter/free...");
    }

    // Direct fallback attempt
    try {
        const text = await callModel("openrouter/free", fullMessages, apiKey, new AbortController().signal);
        if (isJson) {
            return res.status(200).json(extractJson(text));
        }
        return res.status(200).json({ reply: text });
    } catch (fallbackErr: any) {
        console.error("[OpenRouter] Fallback failed:", fallbackErr.message);
    }

    return res.status(200).json({ interactions: [], error: `AI temporarily busy. Please click again.` });
}
