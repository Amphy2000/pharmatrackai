import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: 'Image URL is required' }),
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

    console.log('Processing invoice image with enhanced AI scanner...');

    // Build keyword hints for the AI
    const keywordHints = Object.entries(KEYWORD_DICTIONARY)
      .map(([field, keywords]) => `${field}: Look for "${keywords.join('", "')}"`)
      .join('\n');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an expert at extracting product information from pharmaceutical invoices and receipts, especially Nigerian supplier invoices.

KEYWORD DICTIONARY - Look for these terms ANYWHERE on the page:
${keywordHints}

TABLE EXTRACTION RULES:
1. Identify horizontal rows in the invoice - each row is typically one product
2. Look for the "Total Amount" at the bottom to verify prices
3. Look for the "Date" at the top for invoice date reference

DATE PATTERN PRIORITIZATION:
- If you see a 4-digit year near a 2-digit month (e.g., 05/2027, 2027-05), prioritize it as Expiry Date for that row
- Common formats: MM/YYYY, YYYY-MM, DD/MM/YYYY, MM-DD-YYYY
- Convert all dates to YYYY-MM-DD format

BATCH NUMBER PATTERNS:
- Alphanumeric strings like "BN2044", "LOT-A123", "B/N: 45678"
- Usually 4-10 characters

For each item found, identify:
- productName: The medication or product name (REQUIRED)
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
Do not include any explanation, just the JSON.`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Extract all medication/product details from this invoice image. Use keyword-based extraction to find batch numbers, expiry dates, and prices. Look for table rows and extract each product. Return only valid JSON.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add more credits.' }),
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

    console.log('AI response content:', content);

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
