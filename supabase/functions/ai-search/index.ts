import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header', searchTerms: '' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token', searchTerms: '' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user belongs to a pharmacy
    const { data: staffRecord } = await supabaseAdmin
      .from('pharmacy_staff')
      .select('pharmacy_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle();

    if (!staffRecord) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: User is not associated with any pharmacy', searchTerms: '' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const query = validateInput(body);
    const searchMetadata = body.searchMetadata !== false; // Default to true
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const today = new Date().toISOString().split('T')[0];

    console.log(`AI search for user ${user.id}, pharmacy ${staffRecord.pharmacy_id}: "${query}"`);

    const systemPrompt = `You are an AI that interprets natural language pharmacy inventory and patient queries and converts them to search terms.

Current date: ${today}

IMPORTANT: This search also looks into metadata fields (custom data like Blood Type, Allergies, Insurance Provider, etc.) so be flexible with terms.

Examples for Inventory:
- "Which drugs expire next month?" → return terms that filter for expiring items
- "Show me low stock items" → return "low stock"
- "Find all tablets" → return "Tablet"
- "What's running out?" → return "low stock"
- "Expired medicines" → return "expired"
- "Antibiotics" → return "Amoxicillin" or similar antibiotic names
- "Pain relievers" → return "Ibuprofen Paracetamol"

Examples for Patients/Customers (including metadata):
- "Find patients with blood type O+" → return "O+" (searches metadata)
- "Customers with diabetes" → return "diabetes" (searches notes and metadata)
- "Who has insurance?" → return "insurance" (searches metadata)
- "Patients allergic to penicillin" → return "penicillin allergy" (searches metadata)

Examples for Doctors (including metadata):
- "Cardiologists" → return "cardiology cardiologist"
- "Doctors from Lagos" → return "Lagos"

Return a JSON object with:
- searchTerms: simple keywords or phrases to filter the tables (standard fields AND metadata)
- interpretation: brief explanation of how you interpreted the query
- searchIn: array of where to search - can include "medications", "customers", "doctors", "metadata"`;

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
          { role: 'user', content: `Convert this pharmacy query to search terms: "${query}"` }
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

    console.log('AI search interpretation complete');

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
