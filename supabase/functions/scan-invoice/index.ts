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

    // Enhanced Pharmacy Invoice Specialist prompt
    const systemPrompt = `You are a PHARMACY INVOICE SPECIALIST with 20 years of experience reading Nigerian supplier invoices, receipts, and delivery notes.

YOUR MISSION: Extract EVERY SINGLE product row from this invoice. Be thorough - missing a product costs the pharmacy money.

## EXTRACTION RULES (CRITICAL):

1. **SCAN EVERY ROW**: Look at each horizontal row in the table. If a row has a drug name + quantity + any price, extract it.

2. **DO NOT SKIP ROWS** because of:
   - Unusual formatting or merged cells
   - Handwritten annotations
   - Poor image quality - make your best guess
   - Unusual product names or abbreviations

3. **COLUMN DETECTION**: Look for these column headers (Nigerian invoices):
   - Product/Item/Description/Drug Name → productName
   - Qty/Quantity/Pcs/Units → quantity  
   - Cost/P.Price/Unit Cost/Rate → unitPrice (what pharmacy PAID)
   - S.Price/Retail/Selling → sellingPrice (what pharmacy SELLS for)
   - BN/Batch/Lot → batchNumber
   - EXP/Expiry/Best Before → expiryDate
   - MFG/Mfg Date → manufacturingDate

4. **PRICE INTERPRETATION**:
   - If only ONE price column exists, treat it as unitPrice (cost price)
   - Nigerian Naira format: ₦1,500.00 or 1500 or N1500
   - Remove commas and currency symbols when extracting

5. **DATE FORMATS** - Convert ALL to YYYY-MM-DD:
   - 05/27 → 2027-05-01 (assume future for expiry)
   - Jan 2027 → 2027-01-01
   - 2027-05-15 → 2027-05-15

6. **QUANTITY DEFAULTS**: If quantity is unclear or missing, use 1

7. **BATCH NUMBERS**: Look for alphanumeric codes like BN2044, LOT-A123, B/N: 45678

## OUTPUT FORMAT (JSON only, no explanation):

{
  "items": [
    {
      "productName": "string - full product name as written",
      "quantity": number,
      "unitPrice": number or null,
      "sellingPrice": number or null,
      "batchNumber": "string or null",
      "expiryDate": "YYYY-MM-DD or null",
      "manufacturingDate": "YYYY-MM-DD or null"
    }
  ],
  "invoiceTotal": number or null,
  "invoiceDate": "YYYY-MM-DD or null",
  "supplierName": "string or null",
  "invoiceNumber": "string or null"
}

REMEMBER: Extract EVERY product row. When in doubt, include it. Empty items array is only acceptable if the image has NO products at all.`;

    // Build message content with all images
    const messageContent: any[] = [
      {
        type: 'text',
        text: images.length > 1 
          ? `Extract ALL products from these ${images.length} invoice pages. Combine all items into a single list. Be thorough - scan every row of every page.`
          : `Extract ALL products from this invoice image. Be thorough - scan every row. Do not skip any products.`
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
