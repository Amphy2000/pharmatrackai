import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Medication {
  id: string;
  name: string;
  category: string;
  batch_number: string;
  current_stock: number;
  reorder_level: number;
  expiry_date: string;
  unit_price: number;
  selling_price?: number;
  is_shelved?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { medications } = await req.json() as { medications: Medication[] };
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const today = new Date().toISOString().split('T')[0];
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Calculate analytics for enhanced insights
    const totalInventoryValue = medications.reduce((sum, m) => sum + (m.current_stock * Number(m.unit_price)), 0);
    const expired = medications.filter(m => m.expiry_date < today);
    const expiringSoon = medications.filter(m => m.expiry_date >= today && m.expiry_date <= thirtyDaysFromNow);
    const lowStock = medications.filter(m => m.current_stock <= m.reorder_level);
    const outOfStock = medications.filter(m => m.current_stock === 0);
    
    // Calculate potential profit margins
    const withMargins = medications.filter(m => m.selling_price && m.selling_price > Number(m.unit_price));
    const avgMargin = withMargins.length > 0 
      ? withMargins.reduce((sum, m) => sum + ((Number(m.selling_price) - Number(m.unit_price)) / Number(m.unit_price) * 100), 0) / withMargins.length
      : 0;

    // Calculate at-risk value (expired + expiring soon)
    const atRiskValue = [...expired, ...expiringSoon].reduce((sum, m) => sum + (m.current_stock * Number(m.unit_price)), 0);
    
    // Potential lost sales from stockouts
    const potentialLostSales = lowStock.reduce((sum, m) => sum + ((m.reorder_level - m.current_stock) * Number(m.selling_price || m.unit_price)), 0);

    const systemPrompt = `You are an elite AI pharmacy business analyst. Your insights directly save pharmacies thousands of dollars. Analyze inventory data and provide 6 HIGHLY ACTIONABLE insights.

Current date: ${today}
30 days from now: ${thirtyDaysFromNow}

ANALYTICS SUMMARY:
- Total inventory value: $${totalInventoryValue.toFixed(2)}
- At-risk value (expired/expiring): $${atRiskValue.toFixed(2)}
- Expired items: ${expired.length}
- Expiring within 30 days: ${expiringSoon.length}
- Low stock items: ${lowStock.length}
- Out of stock: ${outOfStock.length}
- Average profit margin: ${avgMargin.toFixed(1)}%
- Potential lost sales from stockouts: $${potentialLostSales.toFixed(2)}

INSIGHT CATEGORIES (provide one of each):
1. **URGENT_ACTION** (type: "warning"): Immediate action needed - expired drugs, critical stockouts
2. **EXPIRY_DISCOUNT** (type: "suggestion"): Specific discount recommendations for expiring items to recover value before they expire
3. **REORDER_PRIORITY** (type: "suggestion"): Which items to reorder first based on demand patterns and stock levels
4. **PROFIT_OPTIMIZATION** (type: "info"): Margin analysis, pricing recommendations
5. **DEMAND_FORECAST** (type: "info"): Predict which categories/items need attention based on stock velocity
6. **COST_SAVINGS** (type: "info"): Specific dollar amounts that can be saved/recovered with recommended actions

RULES:
- Include SPECIFIC medication names and dollar amounts
- Every insight must have a CLEAR ACTION the pharmacist can take TODAY
- Quantify the impact (e.g., "Save $450 by...", "Recover 60% of $200 by...")
- For expiring items, suggest specific discount percentages
- Be direct and business-focused

Return JSON with "insights" array containing exactly 6 objects:
- id: unique string
- type: "warning" | "suggestion" | "info"
- message: actionable insight under 60 words with specific amounts
- action: one-line action the user should take (e.g., "Apply 30% discount to Amoxicillin now")
- impact: estimated dollar impact or percentage (e.g., "$450" or "15%")
- category: "urgent" | "expiry" | "reorder" | "profit" | "demand" | "savings"`;

    const userPrompt = `Analyze this pharmacy inventory and provide 6 actionable insights:

${JSON.stringify(medications.map(m => ({
  name: m.name,
  category: m.category,
  stock: m.current_stock,
  reorderLevel: m.reorder_level,
  expiryDate: m.expiry_date,
  costPrice: m.unit_price,
  sellingPrice: m.selling_price || m.unit_price,
  isShelved: m.is_shelved
})), null, 2)}

Provide 6 actionable insights in JSON format with specific dollar amounts and actions.`;

    console.log('Calling Lovable AI for enhanced insights generation...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later.", insights: [] }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content in AI response');
    }

    console.log('AI response received:', content);
    const parsedContent = JSON.parse(content);

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        insights: [] 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});