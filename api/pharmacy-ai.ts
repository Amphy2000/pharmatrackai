import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODELS = [
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free"
];

// Local Clinical Interaction Rules Database - instant 0ms fallback when AI/network is unavailable
const COMMON_DRUG_RULES = [
    {
        keywords: [['amlodipine', 'nifedipine', 'felodipine'], ['paracetamol', 'acetaminophen', 'emzor paracetamol']],
        severity: 'low',
        description: 'Paracetamol may slightly reduce the blood pressure lowering effect of calcium channel blockers like Amlodipine, though this is usually clinically insignificant.',
        recommendation: 'Monitor blood pressure regularly if taking high doses of analgesics.'
    },
    {
        keywords: [['ibuprofen', 'diclofenac', 'naproxen', 'piroxicam', 'felvin'], ['aspirin', 'vasoprin']],
        severity: 'high',
        description: 'Concomitant use of NSAIDs with Aspirin increases the risk of gastrointestinal ulceration and bleeding.',
        recommendation: 'Avoid combining NSAIDs with low-dose Aspirin unless specifically instructed by a physician.'
    },
    {
        keywords: [['escitalopram', 'fluoxetine', 'sertraline'], ['tramadol']],
        severity: 'severe',
        description: 'Combining SSRIs with Tramadol significantly increases the risk of Serotonin Syndrome and seizures.',
        recommendation: 'Avoid co-prescription. Consider an alternative non-serotonergic analgesic.'
    },
    {
        keywords: [['ciprofloxacin', 'levofloxacin', 'ofloxacin'], ['gestid', 'antacid', 'calcium', 'magnesium', 'aluminum', 'ferrous', 'iron']],
        severity: 'moderate',
        description: 'Polyvalent cations in antacids or mineral supplements bind fluoroquinolone antibiotics in the GI tract, reducing absorption.',
        recommendation: 'Administer fluoroquinolone at least 2 hours before or 6 hours after cation-containing products.'
    },
    {
        keywords: [['amoxicillin', 'ampicillin'], ['allopurinol']],
        severity: 'moderate',
        description: 'Increased incidence of skin rash when aminopenicillins are administered with Allopurinol.',
        recommendation: 'Monitor for signs of rash. Discontinue if hypersensitivity occurs.'
    },
    {
        keywords: [['artemether', 'amatem', 'coartem', 'lumefantrine'], ['ketoconazole', 'fluconazole', 'flucosten']],
        severity: 'moderate',
        description: 'Azole antifungals may inhibit CYP3A4 metabolism of Artemether/Lumefantrine, potentially increasing plasma levels.',
        recommendation: 'Consult a healthcare provider to ensure the combination is appropriate.'
    },
    {
        keywords: [['metformin'], ['alcohol']],
        severity: 'high',
        description: 'Alcohol potentiates the effect of metformin on lactate metabolism, increasing the risk of lactic acidosis.',
        recommendation: 'Warn patient against excessive alcohol intake.'
    }
];

function checkLocalInteractions(medications: any[]): any[] {
    if (!Array.isArray(medications) || medications.length < 2) return [];
    const found: any[] = [];
    const matchedKeys = new Set<string>();

    for (const rule of COMMON_DRUG_RULES) {
        const [groupA, groupB] = rule.keywords;
        const matchA = medications.find(m => groupA.some(kw => (m.name || '').toLowerCase().includes(kw)));
        const matchB = medications.find(m => groupB.some(kw => (m.name || '').toLowerCase().includes(kw)));

        if (matchA && matchB && matchA !== matchB) {
            const key = [matchA.name, matchB.name].sort().join('+');
            if (!matchedKeys.has(key)) {
                matchedKeys.add(key);
                found.push({
                    drugs: [matchA.name, matchB.name],
                    severity: rule.severity,
                    description: rule.description,
                    recommendation: rule.recommendation
                });
            }
        }
    }
    return found;
}

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { action, payload, message, messages } = req.body;
        const meds = payload?.medications || [];

        // Check if this is an interaction check
        if (action === 'interaction_check' || action === 'check_drug_interactions') {
            const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
            
            // Try AI first
            if (apiKey) {
                const systemPrompt = `You are a clinical pharmacy AI. You MUST respond with ONLY valid JSON — no markdown, no backticks, no explanation.`;
                const userPrompt = `Check drug interactions for: ${meds.map((m: any) => m.name || m).join(', ')}.
Return this exact JSON structure:
{"interactions":[{"drugs":["Drug A","Drug B"],"severity":"low","description":"Brief clinical explanation","recommendation":"Action to take"}]}
If no interactions, return: {"interactions":[]}`;

                try {
                    const aiResult = await raceModels([{ role: 'user', content: userPrompt }], apiKey, systemPrompt, true);
                    if (aiResult && Array.isArray(aiResult.interactions)) {
                        return res.status(200).json(aiResult);
                    }
                } catch (aiErr) {
                    console.warn("[Pharma AI] AI failed or rate limited, using clinical fallback engine:", aiErr);
                }
            }

            // Always fallback to local clinical interaction engine
            const fallbackInteractions = checkLocalInteractions(meds);
            return res.status(200).json({ interactions: fallbackInteractions });
        }

        if (action === 'inventory_optimize') {
            const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) return res.status(200).json({ suggestions: [] });
            try {
                const result = await raceModels([{ role: 'user', content: `Analyze: ${JSON.stringify(payload)}` }], apiKey, "Respond with JSON: {\"suggestions\":[]}", true);
                return res.status(200).json(result || { suggestions: [] });
            } catch {
                return res.status(200).json({ suggestions: [] });
            }
        }

        if (message || messages) {
            const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) return res.status(200).json({ reply: "AI service is currently offline." });
            const history = (messages || [])
                .filter((m: any) => m.role !== 'system')
                .slice(-10)
                .map((m: any) => ({ role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user', content: m.content || m.parts?.[0]?.text || '' }));
            if (message) history.push({ role: 'user', content: message });
            try {
                const result = await raceModels(history, apiKey, "You are PharmaTrack AI assistant.", false);
                return res.status(200).json(result || { reply: "AI is temporarily busy." });
            } catch {
                return res.status(200).json({ reply: "AI is temporarily busy. Please try again." });
            }
        }

        return res.status(200).json({ interactions: [] });

    } catch (error: any) {
        console.error('Pharma AI Error:', error);
        const fallback = checkLocalInteractions(req.body?.payload?.medications || []);
        return res.status(200).json({ interactions: fallback });
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
        const end = Math.max(cleaned.lastIndexOf('}'), cleaned.lastIndexOf(']'));
        if (end > start) {
            try { return JSON.parse(cleaned.substring(start, end + 1)); } catch { /* continue */ }
        }
    }
    throw new Error(`Cannot parse JSON`);
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
        body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 1024 }),
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

async function raceModels(messages: any[], apiKey: string, system: string, isJson: boolean): Promise<any> {
    const fullMessages = [{ role: "system", content: system }, ...messages];
    const controllers = FREE_MODELS.map(() => new AbortController());

    const attempts = FREE_MODELS.map((model, i) =>
        callModel(model, fullMessages, apiKey, controllers[i].signal)
            .then(text => ({ text, model }))
    );

    try {
        const { text, model } = await Promise.any(attempts.map(p => p.catch(e => Promise.reject(e))));
        controllers.forEach(c => c.abort());
        console.log(`[OpenRouter] Won race: ${model}`);
        if (isJson) return extractJson(text);
        return { reply: text };
    } catch {
        // Fallback to openrouter/free
        const text = await callModel("openrouter/free", fullMessages, apiKey, new AbortController().signal);
        if (isJson) return extractJson(text);
        return { reply: text };
    }
}
