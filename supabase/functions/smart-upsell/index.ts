import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CartItem {
  name: string;
  category: string;
}

interface InventoryItem {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  current_stock: number;
}

interface UpsellSuggestion {
  product_id: string;
  product_name: string;
  reason: string;
  confidence: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { cartItems, availableInventory } = await req.json() as {
      cartItems: CartItem[];
      availableInventory: InventoryItem[];
    };

    if (!cartItems || cartItems.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter inventory to exclude items already in cart and out of stock
    const cartNames = new Set(cartItems.map(item => item.name.toLowerCase()));
    const availableProducts = availableInventory
      .filter(item => !cartNames.has(item.name.toLowerCase()) && item.current_stock > 0)
      .slice(0, 50); // Limit to 50 items to reduce token usage

    if (availableProducts.length === 0) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are a pharmacy sales assistant AI. Your job is to suggest complementary products based on what's in the customer's cart.

IMPORTANT RULES:
1. Only suggest products that are medically or commonly associated with cart items
2. Consider common health patterns (e.g., cold medicine + tissues, antibiotics + probiotics)
3. Suggest 2-3 products maximum
4. Each suggestion must have a clear, brief reason (max 10 words)
5. Confidence score: 0.9+ for obvious pairs, 0.7-0.89 for common associations, below 0.7 for general wellness

COMMON PHARMACY ASSOCIATIONS:
- Antibiotics → Probiotics, Vitamin C
- Pain relievers → Antacids (stomach protection)
- Cold/Flu medicine → Tissues, Lozenges, Vitamin C
- Allergy medicine → Eye drops, Nasal spray
- Diabetes supplies → Wound care products
- Skin conditions → Moisturizers, Sunscreen
- Digestive issues → Probiotics, Fiber supplements
- Hypertension meds → Low-sodium products, supplements
- Baby products → Diapers, wipes, baby vitamins
- Vitamins → Related supplements in same category`;

    const userPrompt = `Customer's cart:
${cartItems.map(item => `- ${item.name} (${item.category})`).join('\n')}

Available products to suggest from:
${availableProducts.map(item => `- ID: ${item.id} | ${item.name} (${item.category})`).join('\n')}

Based on the cart contents, suggest 2-3 complementary products from the available list. Return ONLY products from the available list above.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "suggest_upsells",
              description: "Return complementary product suggestions for the customer's cart",
              parameters: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        product_id: { type: "string", description: "The ID of the suggested product" },
                        product_name: { type: "string", description: "Name of the suggested product" },
                        reason: { type: "string", description: "Brief reason for suggestion (max 10 words)" },
                        confidence: { type: "number", description: "Confidence score between 0 and 1" }
                      },
                      required: ["product_id", "product_name", "reason", "confidence"],
                      additionalProperties: false
                    },
                    maxItems: 3
                  }
                },
                required: ["suggestions"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "suggest_upsells" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded, please try again later.", suggestions: [] }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required", suggestions: [] }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI service error", suggestions: [] }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    
    // Extract tool call result
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "suggest_upsells") {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = JSON.parse(toolCall.function.arguments);
    
    // Validate suggestions against available inventory
    const validSuggestions: UpsellSuggestion[] = (result.suggestions || [])
      .filter((s: UpsellSuggestion) => {
        return availableProducts.some(p => p.id === s.product_id);
      })
      .slice(0, 3);

    return new Response(
      JSON.stringify({ suggestions: validSuggestions }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Smart upsell error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error", suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
