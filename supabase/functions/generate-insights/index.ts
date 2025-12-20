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
}

serve(async (req) => {
  // Handle CORS preflight requests
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

    const systemPrompt = `You are an AI pharmacy inventory analyst. Analyze the medication inventory data and provide exactly 3 actionable insights.

Current date: ${today}

Rules for insights:
1. First insight should be about expired items or items expiring soon (warning type)
2. Second insight should be about low stock items and reorder suggestions (suggestion type)
3. Third insight should be about inventory optimization or trends (info type)

Each insight must be specific, mention actual medication names and numbers.

Return a JSON object with an "insights" array containing exactly 3 objects with these fields:
- id: string (unique identifier)
- type: "warning" | "suggestion" | "info"
- message: string (clear, actionable insight under 50 words)`;

    const userPrompt = `Analyze this pharmacy inventory:

${JSON.stringify(medications.map(m => ({
  name: m.name,
  category: m.category,
  stock: m.current_stock,
  reorderLevel: m.reorder_level,
  expiryDate: m.expiry_date,
  price: m.unit_price
})), null, 2)}

Provide 3 insights in JSON format.`;

    console.log('Calling Lovable AI for insights generation...');

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
