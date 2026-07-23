import { createClient } from '@supabase/supabase-js';

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

const FREE_MODELS = [
    "google/gemma-4-26b-a4b-it:free",
    "nvidia/nemotron-nano-12b-v2-vl:free",
    "google/gemma-4-31b-it:free",
    "openrouter/free"
];

const CLINICAL_RULES = [
  { groupA: ['ibuprofen', 'diclofenac', 'naproxen', 'piroxicam', 'felvin', 'ketoprofen', 'indomethacin', 'meloxicam'], groupB: ['aspirin', 'vasoprin', 'clopidogrel', 'plavix', 'warfarin', 'rivaroxaban'], severity: 'high', description: 'Combining NSAIDs with Aspirin or anticoagulants significantly increases gastrointestinal bleeding risk.', recommendation: 'Avoid combination unless co-prescribed with PPI protection.' },
  { groupA: ['ciprofloxacin', 'ciprotab', 'levofloxacin', 'ofloxacin'], groupB: ['gestid', 'antacid', 'magnesium', 'aluminum', 'calcium', 'ferrous', 'iron', 'zinc', 'milk'], severity: 'moderate', description: 'Polyvalent cations in antacids or iron supplements chelate fluoroquinolone antibiotics, severely impairing absorption.', recommendation: 'Administer antibiotic 2 hours before or 6 hours after cation products.' },
  { groupA: ['escitalopram', 'fluoxetine', 'sertraline', 'citalopram'], groupB: ['tramadol', 'tramal'], severity: 'severe', description: 'Combining SSRI antidepressants with Tramadol significantly increases Serotonin Syndrome and seizure risk.', recommendation: 'Avoid co-prescription.' },
  { groupA: ['ketoconazole', 'fluconazole', 'flucosten', 'itraconazole'], groupB: ['artemether', 'lumefantrine', 'amatem', 'coartem', 'lonart', 'artesunate'], severity: 'moderate', description: 'Azole antifungals inhibit CYP3A4 metabolism of Artemether/Lumefantrine, elevating antimalarial exposure and QT interval risk.', recommendation: 'Consult physician before co-administration.' },
  { groupA: ['lisinopril', 'enalapril', 'ramipril', 'losartan', 'valsartan'], groupB: ['spironolactone', 'eplerenone', 'potassium'], severity: 'high', description: 'ACE inhibitors/ARBs with potassium-sparing diuretics can lead to severe hyperkalemia.', recommendation: 'Monitor serum potassium levels.' },
  { groupA: ['simvastatin', 'atorvastatin'], groupB: ['erythromycin', 'clarithromycin', 'ketoconazole'], severity: 'high', description: 'Strong CYP3A4 inhibitors increase statin levels, elevating myopathy and rhabdomyolysis risk.', recommendation: 'Temporarily suspend statin during macrolide treatment.' },
  { groupA: ['metronidazole', 'flagyl'], groupB: ['alcohol', 'ethanol'], severity: 'high', description: 'Causes severe disulfiram-like reaction (flushing, headache, tachycardia, vomiting).', recommendation: 'Strictly avoid alcohol during and 48 hours after treatment.' },
  { groupA: ['doxycycline', 'tetracycline'], groupB: ['gestid', 'antacid', 'calcium', 'ferrous', 'iron', 'milk'], severity: 'moderate', description: 'Cations form insoluble complexes with tetracyclines, reducing absorption.', recommendation: 'Separate dosing by 2-3 hours.' },
  { groupA: ['warfarin'], groupB: ['amoxicillin', 'augmentin', 'ciprofloxacin', 'metronidazole', 'septrin'], severity: 'high', description: 'Eradication of gut flora reduces Vitamin K synthesis, raising INR and bleeding risk.', recommendation: 'Monitor INR closely.' },
  { groupA: ['atenolol', 'propranolol', 'bisoprolol'], groupB: ['verapamil', 'diltiazem'], severity: 'severe', description: 'Additive negative inotropic/chronotropic effects leading to severe bradycardia or heart block.', recommendation: 'Avoid combination.' },
  { groupA: ['sildenafil', 'viagra', 'tadalafil'], groupB: ['nitroglycerin', 'isosorbide'], severity: 'severe', description: 'Potentiates nitrate hypotensive effects leading to life-threatening hypotension.', recommendation: 'Absolute contraindication.' },
  { groupA: ['allopurinol'], groupB: ['amoxicillin', 'amoxil', 'ampicillin', 'augmentin'], severity: 'moderate', description: 'Significantly increases incidence of skin rash.', recommendation: 'Monitor for skin rash.' },
  { groupA: ['glibenclamide', 'glimepiride'], groupB: ['ibuprofen', 'diclofenac', 'septrin', 'co-trimoxazole'], severity: 'high', description: 'Displaces sulfonylureas from plasma proteins, predisposing to severe hypoglycemia.', recommendation: 'Monitor blood glucose closely.' },
  { groupA: ['methotrexate'], groupB: ['ibuprofen', 'diclofenac', 'piroxicam', 'aspirin'], severity: 'high', description: 'Reduces renal clearance of methotrexate leading to bone marrow toxicity.', recommendation: 'Avoid high-dose NSAIDs.' },
  { groupA: ['digoxin'], groupB: ['furosemide', 'lasix', 'hydrochlorothiazide'], severity: 'high', description: 'Diuretic-induced hypokalemia increases Digoxin toxicity risk.', recommendation: 'Monitor serum potassium levels.' },
  { groupA: ['levothyroxine'], groupB: ['calcium', 'ferrous', 'iron', 'gestid'], severity: 'moderate', description: 'Binds Levothyroxine in GI tract, reducing absorption.', recommendation: 'Separate by at least 4 hours.' },
  { groupA: ['diazepam', 'valium', 'alprazolam'], groupB: ['tramadol', 'codeine', 'morphine', 'alcohol'], severity: 'severe', description: 'Profound CNS & respiratory depression risk.', recommendation: 'Avoid co-prescribing.' },
  { groupA: ['amlodipine', 'nifedipine'], groupB: ['paracetamol', 'acetaminophen', 'emzor paracetamol'], severity: 'low', description: 'High dose paracetamol may slightly diminish BP lowering effect.', recommendation: 'Monitor blood pressure.' }
];

function checkLocalInteractions(medications: any[]): any[] {
  if (!Array.isArray(medications) || medications.length < 2) return [];
  const found: any[] = [];
  const matchedKeys = new Set<string>();

  for (const rule of CLINICAL_RULES) {
    const matchA = medications.find(m => rule.groupA.some(kw => (m.name || '').toLowerCase().includes(kw)));
    const matchB = medications.find(m => rule.groupB.some(kw => (m.name || '').toLowerCase().includes(kw)));

    if (matchA && matchB && matchA.name !== matchB.name) {
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

        if (action === 'interaction_check' || action === 'check_drug_interactions') {
            // Run instant clinical rule engine
            const clinicalResults = checkLocalInteractions(meds);

            const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
            if (apiKey) {
                const systemPrompt = `You are a clinical pharmacy AI. Respond with ONLY valid JSON: {"interactions":[{"drugs":["A","B"],"severity":"low|moderate|high|severe","description":"...","recommendation":"..."}]}`;
                const userPrompt = `Check drug interactions for: ${meds.map((m: any) => m.name || m).join(', ')}.`;

                try {
                    const aiResult = await raceModels([{ role: 'user', content: userPrompt }], apiKey, systemPrompt, true);
                    if (aiResult && Array.isArray(aiResult.interactions) && aiResult.interactions.length > 0) {
                        const merged = [...clinicalResults];
                        const existing = new Set(clinicalResults.map(i => i.drugs.sort().join('+')));
                        for (const i of aiResult.interactions) {
                            const k = (i.drugs || []).sort().join('+');
                            if (k && !existing.has(k)) {
                                merged.push(i);
                                existing.add(k);
                            }
                        }
                        return res.status(200).json({ interactions: merged });
                    }
                } catch (aiErr) {
                    console.warn("[Pharma AI] AI call failed, using clinical fallback engine.");
                }
            }

            return res.status(200).json({ interactions: clinicalResults });
        }

        if (action === 'inventory_optimize') {
            return res.status(200).json({ suggestions: [] });
        }

        if (message || messages) {
            const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) return res.status(200).json({ reply: "AI service offline." });
            const history = (messages || []).filter((m: any) => m.role !== 'system').slice(-10)
                .map((m: any) => ({ role: m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user', content: m.content || m.parts?.[0]?.text || '' }));
            if (message) history.push({ role: 'user', content: message });
            try {
                const result = await raceModels(history, apiKey, "You are PharmaTrack AI assistant.", false);
                return res.status(200).json(result || { reply: "AI temporarily busy." });
            } catch {
                return res.status(200).json({ reply: "AI temporarily busy." });
            }
        }

        return res.status(200).json({ interactions: [] });

    } catch (error: any) {
        console.error('Pharma AI Error:', error);
        return res.status(200).json({ interactions: checkLocalInteractions(req.body?.payload?.medications || []) });
    }
}

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
        if (isJson) return extractJson(text);
        return { reply: text };
    } catch {
        const text = await callModel("openrouter/free", fullMessages, apiKey, new AbortController().signal);
        if (isJson) return extractJson(text);
        return { reply: text };
    }
}
