import { generateBusinessInsights } from '../src/utils/businessInsightsEngine';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { medications, currencySymbol = '₦' } = req.body || {};

        if (!medications || !Array.isArray(medications)) {
            return res.status(200).json({ insights: [] });
        }

        // 100% Autopilot Financial Analytics Engine (0ms, 0 AI cost, 0 rate limits)
        const insights = generateBusinessInsights(medications, currencySymbol);
        return res.status(200).json({ insights });

    } catch (error: any) {
        console.error('Insights API Error:', error);
        return res.status(200).json({ insights: [] });
    }
}
