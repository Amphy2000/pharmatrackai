import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Keyword dictionary for Nigerian supplier invoices
const KEYWORD_DICTIONARY = {
  productName: ['Item', 'Description', 'Drug Name', 'Product', 'SKU Name', 'Name', 'Medicine', 'Drug', 'Medication'],
  purchasePrice: ['P.Price', 'Cost', 'Unit Cost', 'Rate', 'W-Sale', 'Land Cost', 'Cost Price', 'Purchase', 'Buying Price'],
  sellingPrice: ['S.Price', 'Retail', 'MSRP', 'Unit Price', 'Dispense Price', 'Selling', 'Sale Price', 'Price'],
  batchNumber: ['BN', 'B/N', 'Batch', 'Lot', 'Lot No', 'Control No', 'Batch Number', 'Batch No'],
  expiryDate: ['EXP', 'Expiry', 'Best Before', 'Valid To', 'E.Date', 'Exp Date', 'Expiry Date', 'Expires'],
  manufacturingDate: ['MFG', 'Mfg Date', 'Manufacturing', 'Prod Date', 'Production Date', 'Made'],
  quantity: ['Qty', 'In Stock', 'Balance', 'SOH', 'Count', 'Quantity', 'Units', 'Pcs', 'Pieces'],
  nafdacNumber: ['NAFDAC', 'Reg No', 'Registration', 'NAFDAC No', 'Reg Number'],
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

    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate imageUrl is a proper URL
    try {
      new URL(imageUrl);
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid image URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing invoice image for user ${user.id}, pharmacy ${staffRecord.pharmacy_id}`);

    // Build keyword hints for the AI
    const keywordHints = Object.entries(KEYWORD_DICTIONARY)
      .map(([field, keywords]) => `${field}: Look for "${keywords.join('", "')}"`)
      .join('\n');

    const systemPrompt = `You are an expert at extracting product information from pharmaceutical invoices and receipts, especially Nigerian supplier invoices.

KEYWORD DICTIONARY - Look for these terms ANYWHERE on the page:
${keywordHints}

TABLE EXTRACTION RULES:
1. Identify horizontal rows in the invoice - each row is typically one product
2. Look for the "Total Amount" at the bottom to verify prices
3. Look for the "Date" at the top for invoice date reference
4. IGNORE page headers/footers, invoice numbers, company addresses, and terms/conditions - these are NOT products
5. Skip rows that contain only text like "Thank you", "Terms", "Subtotal", "VAT", "Discount", etc.

DATE PATTERN PRIORITIZATION:
- If you see a 4-digit year near a 2-digit month (e.g., 05/2027, 2027-05), prioritize it as Expiry Date for that row
- Common formats: MM/YYYY, YYYY-MM, DD/MM/YYYY, MM-DD-YYYY
- Convert all dates to YYYY-MM-DD format

BATCH NUMBER PATTERNS:
- Alphanumeric strings like "BN2044", "LOT-A123", "B/N: 45678"
- Usually 4-10 characters

For each PRODUCT item found (ignore non-product rows), identify:
- productName: The medication or product name (REQUIRED - must be an actual product, not a header or footer)
- quantity: The quantity purchased (default to 1 if unclear)
- unitPrice: Price per unit/cost price if visible (optional)
- sellingPrice: Retail/selling price if different from unit price (optional)
- batchNumber: Batch/lot number (IMPORTANT - look for BN:, Batch:, Lot:)
- expiryDate: Expiry date in YYYY-MM-DD format (IMPORTANT - look for EXP:, Expiry:)
- manufacturingDate: Manufacturing date in YYYY-MM-DD format if visible (optional)
- nafdacNumber: NAFDAC registration number if visible (optional)

Return ONLY a valid JSON object with this structure:
{
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "unitPrice": number or null,
      "sellingPrice": number or null,
      "batchNumber": "string or null",
      "expiryDate": "YYYY-MM-DD or null",
      "manufacturingDate": "YYYY-MM-DD or null",
      "nafdacNumber": "string or null"
    }
  ],
  "invoiceTotal": number or null,
  "invoiceDate": "YYYY-MM-DD or null",
  "supplierName": "string or null"
}

If you cannot identify any products, return: {"items": [], "error": "Could not extract products from image"}
Do not include any explanation, just the JSON.`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nExtract all medication/product details from this invoice image. Use keyword-based extraction to find batch numbers, expiry dates, and prices. Look for table rows and extract each product. Return only valid JSON.` },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: '' // Will need to fetch image and convert to base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    // For URL-based images, use the fileData approach with Gemini
    const responseWithUrl = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nExtract all medication/product details from this invoice image. Use keyword-based extraction to find batch numbers, expiry dates, and prices. Look for table rows and extract each product. Return only valid JSON.\n\nImage URL: ${imageUrl}` }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!responseWithUrl.ok) {
      const errorText = await responseWithUrl.text();
      console.error('Gemini API error:', responseWithUrl.status, errorText);
      
      if (responseWithUrl.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Failed to process image with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiResponse = await responseWithUrl.json();
    const content = aiResponse.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('AI response received, parsing...');

    // Parse JSON from response
    let result;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
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
          // Try to parse and reformat common date formats
          const dateStr = item.expiryDate;
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

        // Auto-match barcode from master library if not already present
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
