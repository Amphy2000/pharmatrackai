import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: max 50 medications per request
const MAX_MEDICATIONS = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header' }),
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
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
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
        JSON.stringify({ error: 'Unauthorized: User is not associated with any pharmacy' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { medications } = await req.json();
    
    if (!medications || medications.length < 2) {
      return new Response(
        JSON.stringify({ interactions: [], hasWarnings: false }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate input size to prevent abuse
    if (medications.length > MAX_MEDICATIONS) {
      return new Response(
        JSON.stringify({ error: `Too many medications. Maximum allowed: ${MAX_MEDICATIONS}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const medicationNames = medications.map((m: { name: string }) => m.name).join(", ");

    console.log(`Checking drug interactions for user ${user.id}, pharmacy ${staffRecord.pharmacy_id}`);

    const systemPrompt = `You are a pharmaceutical drug interaction checker. Given a list of medications, identify any potentially dangerous drug interactions. Be concise but clear about the risks. Focus only on clinically significant interactions.

IMPORTANT: Only report interactions that are well-documented and clinically significant. Do not report minor or theoretical interactions.

Return a JSON object with this exact structure:
{
  "interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "low" | "moderate" | "high" | "severe",
      "description": "Brief description of the interaction and its effects",
      "recommendation": "What the pharmacist should do or advise"
    }
  ]
}

If there are no significant interactions, return: {"interactions": []}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${systemPrompt}\n\nCheck for drug interactions between these medications: ${medicationNames}` }]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    let interactions: any[] = [];
    
    if (content) {
      try {
        const parsed = JSON.parse(content);
        interactions = parsed.interactions || [];
      } catch (e) {
        console.error("Failed to parse AI response:", e);
      }
    }

    const hasWarnings = interactions.some(
      (i: any) => i.severity === "high" || i.severity === "severe"
    );

    return new Response(
      JSON.stringify({ interactions, hasWarnings }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error checking drug interactions:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
