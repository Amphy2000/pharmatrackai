import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation constants
const MAX_QUERY_LENGTH = 500;
const MIN_QUERY_LENGTH = 1;

function validateInput(body: unknown): string {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }
  
  const data = body as Record<string, unknown>;
  
  if (typeof data.query !== 'string') {
    throw new Error('query must be a string');
  }
  
  const query = data.query.trim();
  
  if (query.length < MIN_QUERY_LENGTH) {
    throw new Error('query cannot be empty');
  }
  
  if (query.length > MAX_QUERY_LENGTH) {
    throw new Error(`query must be less than ${MAX_QUERY_LENGTH} characters`);
  }
  
  // Sanitize: remove potential script injections and control characters
  const sanitized = query
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .slice(0, MAX_QUERY_LENGTH);
  
  return sanitized;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const query = validateInput(body);
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are an AI that interprets natural language pharmacy inventory queries and converts them to simple search terms.

Current date: ${today}

Examples:
- "Which drugs expire next month?" → return terms that filter for expiring items
- "Show me low stock items" → return "low stock"
- "Find all tablets" → return "Tablet"
- "What's running out?" → return "low stock"
- "Expired medicines" → return "expired"
- "Antibiotics" → return "Amoxicillin" or similar antibiotic names
- "Pain relievers" → return "Ibuprofen Paracetamol"

Return a JSON object with:
- searchTerms: simple keywords or phrases to filter the inventory table
- interpretation: brief explanation of how you interpreted the query`;

    console.log('Processing AI search query:', query);

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
          { role: 'user', content: `Convert this pharmacy inventory query to search terms: "${query}"` }
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later.", searchTerms: '' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required. Please add credits to continue.", searchTerms: '' }), {
          status: 402,
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

    console.log('AI search interpretation:', content);

    const parsedContent = JSON.parse(content);

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing AI search:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        searchTerms: '' 
      }),
      {
        status: error instanceof Error && error.message.includes('must be') ? 400 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
