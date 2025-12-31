import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Expert-level prompts for each action
const PROMPTS = {
  drug_interaction: `Act as a Senior Clinical Pharmacist with 20+ years of experience in drug safety. 
Analyze the following list of medications and provide a comprehensive safety assessment.

For each potential interaction, identify:
1. Severity Level: 'Major', 'Moderate', or 'Minor'
2. The specific biological mechanism of the interaction (e.g., enzyme inhibition, receptor competition)
3. Clinical significance and what symptoms to watch for
4. Clear, non-scary advice for the patient that empowers rather than frightens

IMPORTANT CONSTRAINTS:
- Only report interactions that are well-documented and clinically significant
- Do NOT report minor or theoretical interactions
- If no significant interactions are found, confirm safety clearly

Return a JSON object with this exact structure:
{
  "interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "severity": "major" | "moderate" | "minor",
      "mechanism": "Brief explanation of how these drugs interact",
      "description": "What happens when these are taken together",
      "patient_advice": "Clear, reassuring guidance for the patient"
    }
  ],
  "overall_safety": "safe" | "caution_advised" | "pharmacist_review_required",
  "summary": "One sentence summary for the pharmacist"
}

If no interactions: {"interactions": [], "overall_safety": "safe", "summary": "No significant interactions detected. Safe to proceed."}`,

  smart_upsell: `Act as an experienced Retail Pharmacy Consultant who genuinely cares about patient health outcomes.

Based on the items in the customer's cart, suggest 2-3 'Companion Products' that will genuinely improve their health outcomes. Focus on NON-medication products that complement their purchase.

SMART PAIRING EXAMPLES:
- Antibiotics → Probiotics (to protect gut health during treatment)
- Flu/Cold medications → Vitamin C, Zinc supplements, Digital thermometer
- Pain relievers → Anti-inflammatory gel, Hot/cold compress
- Diabetes medications → Blood glucose monitor, Sugar-free supplements
- Blood pressure meds → Home BP monitor, Low-sodium alternatives
- Allergy medications → Air purifier, Hypoallergenic tissues
- Digestive medications → Fiber supplements, Electrolyte drinks
- Skin medications → Gentle moisturizer, Sunscreen

VOICE GUIDELINES:
- Professional and helpful, never pushy or salesy
- Focus on genuine health benefits, not just revenue
- Keep suggestions practical and affordable

Return a JSON array with this structure:
{
  "suggestions": [
    {
      "product_name": "Product Name",
      "category": "Health category",
      "reasoning": "Why this helps with their current purchase",
      "benefit": "Specific health outcome improvement",
      "priority": "high" | "medium" | "low"
    }
  ],
  "cart_context": "Brief note about what the cart suggests about patient needs"
}`,

  business_insights: `Act as a Senior Pharmacy Business Analyst with expertise in healthcare retail optimization.

Analyze the pharmacy's operational data and provide actionable business intelligence.

For your analysis, identify:

1. FASTEST-MOVING CATEGORIES
   - Which product categories are driving the most revenue
   - Velocity trends (increasing/decreasing demand)

2. MISSED OPPORTUNITIES
   - High-demand items that are low in stock (potential lost sales)
   - Complementary products that should be stocked together
   - Seasonal items that need attention

3. PROFIT OPTIMIZATION
   - Items nearing expiration that need dynamic pricing or promotions
   - Slow-moving inventory that's tying up capital
   - Margin improvement opportunities

4. OPERATIONAL EFFICIENCY
   - Reorder timing recommendations
   - Staff scheduling insights based on peak times
   - Supplier negotiation opportunities

FORMAT YOUR RESPONSE AS:
{
  "insights": [
    {
      "type": "opportunity" | "warning" | "recommendation",
      "priority": "critical" | "high" | "medium" | "low",
      "title": "Short, actionable title",
      "description": "Detailed explanation",
      "impact": "Estimated business impact",
      "action_items": ["Specific step 1", "Specific step 2"]
    }
  ],
  "metrics_summary": {
    "total_inventory_value": number,
    "items_at_risk": number,
    "revenue_opportunity": "estimated additional revenue possible"
  },
  "executive_summary": "2-3 sentence overview for the pharmacy owner"
}`,

  ai_search: `Act as an intelligent pharmacy search assistant. 
Interpret the user's natural language query and extract meaningful search parameters.

CAPABILITIES:
- Understand medication names, even with typos or partial names
- Recognize symptom-based searches ("something for headache")
- Identify category searches ("antibiotics", "vitamins")
- Parse patient-type queries ("children's medicine", "senior vitamins")

Return a JSON object:
{
  "searchTerms": ["list", "of", "extracted", "keywords"],
  "interpretation": "What the user is likely looking for",
  "searchIn": ["medications", "categories", "symptoms"],
  "suggestions": ["alternative search terms if query is ambiguous"]
}`,

  scan_invoice: `Act as an expert pharmacy invoice data extraction system.
Parse the invoice image/text and extract all medication entries with precision.

For each item, extract:
- Product name (full name as written)
- Quantity ordered
- Unit price
- Total price
- Batch number (if visible)
- Expiry date (if visible)
- Supplier name (from header)

Return a JSON object:
{
  "supplier": {
    "name": "Supplier Company Name",
    "invoice_number": "Invoice #",
    "invoice_date": "Date if visible"
  },
  "items": [
    {
      "name": "Medication Name",
      "quantity": number,
      "unit_price": number,
      "total_price": number,
      "batch_number": "if available",
      "expiry_date": "if available"
    }
  ],
  "totals": {
    "subtotal": number,
    "tax": number,
    "grand_total": number
  },
  "confidence": "high" | "medium" | "low",
  "notes": "Any parsing issues or unclear items"
}`
};

// Retry mechanism for handling 429 rate limits
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries = 3,
  initialDelay = 1000
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        if (attempt >= maxRetries) {
          // Make sure the message contains "Rate limit" so our main handler can return HTTP 429.
          throw new Error("Rate limit exceeded");
        }

        const delay = initialDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(
          `Rate limited (429). Attempt ${attempt + 1}/${maxRetries + 1}. Waiting ${delay}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      return response;
    } catch (error) {
      lastError = error as Error;
      console.error(`Fetch attempt ${attempt + 1} failed:`, error);

      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("All retry attempts failed");
}

// Call Gemini API with the appropriate prompt
async function callGeminiAPI(systemPrompt: string, userContent: string): Promise<any> {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: `${systemPrompt}\n\n${userContent}` }]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini API error:", response.status, errorText);
    throw new Error(`AI service error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error("No content in AI response");
  }

  return JSON.parse(content);
}

// Action Handlers
async function handleDrugInteraction(payload: any): Promise<any> {
  const { medications } = payload;
  
  if (!medications || medications.length < 2) {
    return { interactions: [], overall_safety: "safe", summary: "Single medication - no interaction check needed." };
  }

  if (medications.length > 50) {
    throw new Error("Too many medications. Maximum allowed: 50");
  }

  const medicationList = medications.map((m: any) => m.name || m).join(", ");
  const userContent = `Check for drug interactions between these medications: ${medicationList}`;
  
  return await callGeminiAPI(PROMPTS.drug_interaction, userContent);
}

async function handleSmartUpsell(payload: any): Promise<any> {
  const { cartItems, availableInventory } = payload;
  
  if (!cartItems || cartItems.length === 0) {
    return { suggestions: [], cart_context: "Empty cart - no suggestions available." };
  }

  const cartDescription = cartItems.map((item: any) => 
    `${item.name} (${item.category || 'General'})`
  ).join(", ");

  const availableProducts = availableInventory
    ?.filter((item: any) => 
      item.current_stock > 0 && 
      !cartItems.some((cart: any) => cart.id === item.id)
    )
    .slice(0, 50)
    .map((item: any) => `${item.name} (${item.category}, ₦${item.selling_price})`)
    .join(", ");

  const userContent = `
Customer's cart contains: ${cartDescription}

Available products in our inventory that could be suggested:
${availableProducts || 'Use general pharmacy product suggestions'}

Suggest complementary products that would genuinely help this customer.`;

  return await callGeminiAPI(PROMPTS.smart_upsell, userContent);
}

async function handleBusinessInsights(payload: any): Promise<any> {
  const { medications, sales, currency = "NGN" } = payload;
  
  // Calculate key metrics
  const now = new Date();
  const totalValue = medications?.reduce((sum: number, m: any) => 
    sum + (m.current_stock * (m.selling_price || m.unit_price)), 0) || 0;
  
  const expiredCount = medications?.filter((m: any) => 
    new Date(m.expiry_date) < now).length || 0;
  
  const expiringIn30Days = medications?.filter((m: any) => {
    const expiry = new Date(m.expiry_date);
    const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return daysUntil > 0 && daysUntil <= 30;
  }).length || 0;
  
  const lowStock = medications?.filter((m: any) => 
    m.current_stock <= m.reorder_level).length || 0;
  
  const outOfStock = medications?.filter((m: any) => 
    m.current_stock === 0).length || 0;

  const userContent = `
PHARMACY INVENTORY ANALYSIS REQUEST
Currency: ${currency}

CURRENT INVENTORY METRICS:
- Total Inventory Value: ${currency} ${totalValue.toLocaleString()}
- Total Products: ${medications?.length || 0}
- Expired Products: ${expiredCount}
- Expiring in 30 Days: ${expiringIn30Days}
- Low Stock Items: ${lowStock}
- Out of Stock: ${outOfStock}

TOP CATEGORIES BY VALUE:
${getTopCategories(medications)}

RECENT SALES TRENDS:
${getSalesSummary(sales)}

ITEMS NEEDING ATTENTION:
${getAttentionItems(medications)}

Provide actionable insights to maximize profit and reduce waste.`;

  return await callGeminiAPI(PROMPTS.business_insights, userContent);
}

async function handleAISearch(payload: any): Promise<any> {
  const { query } = payload;
  
  if (!query || query.trim().length < 2) {
    return { searchTerms: [], interpretation: "Query too short", searchIn: [] };
  }

  const userContent = `User search query: "${query}"
  
Interpret this pharmacy search query and extract the search parameters.`;

  return await callGeminiAPI(PROMPTS.ai_search, userContent);
}

async function handleScanInvoice(payload: any): Promise<any> {
  // Accept both imageBase64 and imageUrl (they may be the same data-uri)
  const imageData = payload?.imageBase64 || payload?.imageUrl;
  
  if (!imageData) {
    throw new Error("No invoice image provided. Send imageBase64 or imageUrl.");
  }

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  // Extract base64 content (strip data-uri prefix if present)
  const base64Content = imageData.replace(/^data:image\/\w+;base64,/, '');

  // Detect mime type from data-uri or default to jpeg
  let mimeType = "image/jpeg";
  const mimeMatch = imageData.match(/^data:(image\/\w+);base64,/);
  if (mimeMatch) {
    mimeType = mimeMatch[1];
  }

  console.log(`Processing invoice image, mimeType: ${mimeType}, size: ${base64Content.length} chars`);

  // For invoice scanning, we use vision capabilities
  const response = await fetchWithRetry(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [
            { text: PROMPTS.scan_invoice },
            { 
              inlineData: { 
                mimeType, 
                data: base64Content 
              } 
            }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini Vision API error:", response.status, errorText);
    throw new Error(`Invoice scanning failed: ${response.status}`);
  }

  const data = await response.json();
  const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  if (!content) {
    throw new Error("Could not parse invoice");
  }

  const parsed = JSON.parse(content);
  
  // Normalize response shape - ensure items array exists at top level
  if (parsed.result?.items && !parsed.items) {
    parsed.items = parsed.result.items;
  }
  
  console.log(`Extracted ${parsed.items?.length || 0} items from invoice`);
  
  return parsed;
}

// Helper functions for business insights
function getTopCategories(medications: any[]): string {
  if (!medications?.length) return "No data available";
  
  const categoryTotals: Record<string, number> = {};
  medications.forEach(m => {
    const cat = m.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + (m.current_stock * (m.selling_price || m.unit_price));
  });
  
  return Object.entries(categoryTotals)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .map(([cat, val]) => `- ${cat}: ₦${val.toLocaleString()}`)
    .join("\n");
}

function getSalesSummary(sales: any[]): string {
  if (!sales?.length) return "No recent sales data";
  
  const totalRevenue = sales.reduce((sum, s) => sum + (s.total_price || 0), 0);
  const avgTransaction = totalRevenue / sales.length;
  
  return `- Total Transactions: ${sales.length}
- Total Revenue: ₦${totalRevenue.toLocaleString()}
- Average Transaction: ₦${avgTransaction.toFixed(0)}`;
}

function getAttentionItems(medications: any[]): string {
  if (!medications?.length) return "No items";
  
  const now = new Date();
  const attention = medications
    .filter(m => {
      const expiry = new Date(m.expiry_date);
      const daysUntil = (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntil <= 30 || m.current_stock <= m.reorder_level;
    })
    .slice(0, 10)
    .map(m => {
      const expiry = new Date(m.expiry_date);
      const daysUntil = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      const issues = [];
      if (daysUntil <= 0) issues.push("EXPIRED");
      else if (daysUntil <= 30) issues.push(`expires in ${daysUntil} days`);
      if (m.current_stock === 0) issues.push("OUT OF STOCK");
      else if (m.current_stock <= m.reorder_level) issues.push("low stock");
      return `- ${m.name}: ${issues.join(", ")}`;
    });
  
  return attention.join("\n") || "No immediate concerns";
}

// Main request handler
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, payload, pharmacy_id } = await req.json();
    
    console.log(`Processing action: ${action} for pharmacy: ${pharmacy_id}`);

    if (!action) {
      throw new Error("Missing 'action' in request body");
    }

    let result: any;

    switch (action) {
      case 'check_drug_interactions':
      case 'interaction_check':
        result = await handleDrugInteraction(payload);
        break;

      case 'smart_upsell':
      case 'upsell_suggestion':
        result = await handleSmartUpsell(payload);
        break;

      case 'generate_insights':
      case 'business_analysis':
        result = await handleBusinessInsights(payload);
        break;

      case 'ai_search':
        result = await handleAISearch(payload);
        break;

      case 'scan_invoice':
        result = await handleScanInvoice(payload);
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    console.error("pharmacy-ai error:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const status = errorMessage.includes("Rate limit") ? 429 : 500;
    
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        action_failed: true
      }),
      { 
        status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
