import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
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

    const body = await req.json();
    
    // Support both single imageUrl and multiple images array
    const images: string[] = body.images || (body.imageUrl ? [body.imageUrl] : []);
    
    if (images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${images.length} invoice image(s) for user ${user.id}, pharmacy ${staffRecord.pharmacy_id}`);

    // Enhanced Pharmacy Invoice Specialist prompt (tuned for Item Name / Quantity / Price/Unit screenshots)
    const systemPrompt = `You are a PHARMACY INVOICE SPECIALIST with expert OCR for screenshots of invoice tables.

YOUR MISSION: Extract EVERY SINGLE product row from the invoice table. If a row contains a drug/product name + quantity + a price, capture it.

## TARGET FORMAT (THIS MATTERS):
Many screenshots use these exact headers:
- **Item Name** → productName
- **Quantity** → quantity
- **Price/Unit** → unitPrice (COST PRICE)
- **HSN/SAC** → IGNORE COMPLETELY (do not output)
- **Amount/Total** → optional; if unit price is missing but Amount and Quantity exist, infer unitPrice = Amount / Quantity.

## CRITICAL EXTRACTION RULES:
1. **EXTRACT EVERY ROW**: Walk row-by-row down the table. Do not skip rows because of formatting.
2. **IGNORE NON-ITEM LINES**: Ignore headers, page titles, and summary rows like Subtotal/Tax/Discount/Grand Total.
3. **CURRENCY NORMALIZATION** (VERY IMPORTANT):
   - Ignore the **₦** symbol and any commas.
   - Examples: "₦ 4,800.00" → 4800, "₦4,800" → 4800, "4,800" → 4800.
4. **QUANTITY**: Parse as a number. If unclear/missing but an item exists, use 1.
5. **DO NOT INVENT FIELDS**: Do not output HSN/SAC. Do not add extra keys.

## OUTPUT FORMAT (JSON ONLY — no markdown, no code fences, no commentary):
{
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "unitPrice": number | null,
      "sellingPrice": number | null,
      "batchNumber": string | null,
      "expiryDate": "YYYY-MM-DD" | null,
      "manufacturingDate": "YYYY-MM-DD" | null
    }
  ],
  "invoiceTotal": number | null,
  "invoiceDate": "YYYY-MM-DD" | null,
  "supplierName": "string" | null,
  "invoiceNumber": "string" | null
}

Return an empty items array ONLY if there are truly no line items in the image.`;

    // Build message content with all images
    const messageContent: any[] = [
      {
        type: 'text',
        text: images.length > 1
          ? `Extract ALL line items from these ${images.length} invoice pages and COMBINE into one items list. Use Item Name→productName, Quantity→quantity, Price/Unit→unitPrice. Ignore HSN/SAC completely. Remove ₦ and commas from numbers.`
          : `Extract ALL line items from this invoice image. Use Item Name→productName, Quantity→quantity, Price/Unit→unitPrice. Ignore HSN/SAC completely. Remove ₦ and commas from numbers.`
      }
    ];

    // Add all images
    for (const imageUrl of images) {
      messageContent.push({
        type: 'image_url',
        image_url: {
          url: imageUrl
        }
      });
    }

    // Use gemini-2.5-flash for better accuracy (not lite)
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
          { role: 'user', content: messageContent }
        ]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.', rateLimited: true }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process image with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || '';

    console.log('AI response received, parsing...');

    // Parse JSON from response
    let result;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError, 'Content:', content);
      return new Response(
        JSON.stringify({ 
          items: [], 
          error: 'Could not parse invoice data. Please try with a clearer image.' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Post-process: Validate and clean extracted data
    if (result.items && Array.isArray(result.items)) {
      // Fetch master barcode library for auto-matching
      const { data: barcodeLibrary } = await supabaseAdmin
        .from('master_barcode_library')
        .select('product_name, barcode');
      
      result.items = result.items.map((item: any) => {
        // Validate expiry date format
        if (item.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(item.expiryDate)) {
          const dateStr = String(item.expiryDate);
          const yearMatch = dateStr.match(/20\d{2}/);
          const monthMatch = dateStr.match(/\b(0?[1-9]|1[0-2])\b/);
          if (yearMatch && monthMatch) {
            item.expiryDate = `${yearMatch[0]}-${monthMatch[1].padStart(2, '0')}-01`;
          } else {
            item.expiryDate = null;
          }
        }
        
        // Ensure quantity is a positive number
        if (!item.quantity || item.quantity < 1) {
          item.quantity = 1;
        }

        // Clean up prices - ensure they're numbers
        if (item.unitPrice) {
          item.unitPrice = Number(String(item.unitPrice).replace(/[₦,N\s]/g, '')) || null;
        }
        if (item.sellingPrice) {
          item.sellingPrice = Number(String(item.sellingPrice).replace(/[₦,N\s]/g, '')) || null;
        }

        // Auto-match barcode from master library
        if (!item.barcode && item.productName && barcodeLibrary) {
          const normalizedName = item.productName.toLowerCase().trim();
          const match = barcodeLibrary.find((entry: any) => {
            const entryName = entry.product_name.toLowerCase();
            return entryName === normalizedName || 
                   entryName.includes(normalizedName) || 
                   normalizedName.includes(entryName);
          });
          if (match) {
            item.barcode = match.barcode;
          }
        }
        
        return item;
      });

      // Remove items with empty product names
      result.items = result.items.filter((item: any) => 
        item.productName && item.productName.trim().length > 0
      );
    }

    console.log('Extracted items:', result.items?.length || 0);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in scan-invoice function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to process invoice';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
