import { generateSmartUpsell } from '../src/utils/smartUpsellEngine';

export default async function handler(req: any, res: any) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { cartItems, availableInventory } = req.body || {};

        if (!cartItems?.length || !availableInventory?.length) {
            return res.status(200).json({ suggestions: [] });
        }

        // 100% Autopilot Clinical Upsell Engine (0ms, 0 AI cost, 0 rate limits)
        const suggestions = generateSmartUpsell(cartItems, availableInventory);
        return res.status(200).json({ suggestions });

    } catch (error: any) {
        console.error('Upsell API Error:', error);
        return res.status(200).json({ suggestions: [] });
    }
}
