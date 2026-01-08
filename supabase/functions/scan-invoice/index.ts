import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    ...(init ?? {}),
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

function normalizePrice(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[₦,N\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// AI scan limits per plan
const LITE_SCAN_LIMIT = 5;

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await req.json();

    // Support both single imageUrl and multiple images array
    const images: string[] = body?.images || (body?.imageUrl ? [body.imageUrl] : []);
    const pharmacyId: string | undefined = body?.pharmacy_id;

    if (!Array.isArray(images) || images.length === 0) {
      return jsonResponse({ error: "At least one image is required" }, { status: 400 });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return jsonResponse({ error: "AI service not configured" }, { status: 500 });
    }

    // Check AI scan limits if pharmacy_id is provided
    if (pharmacyId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      
      if (supabaseUrl && supabaseServiceKey) {
        const supabase = createClient(supabaseUrl, supabaseServiceKey);
        
        // Get pharmacy plan and scan usage
        const { data: pharmacy, error: pharmacyError } = await supabase
          .from("pharmacies")
          .select("subscription_plan, ai_scans_used_this_month, ai_scans_reset_at")
          .eq("id", pharmacyId)
          .single();
        
        if (pharmacyError) {
          console.error("Error fetching pharmacy:", pharmacyError);
        } else if (pharmacy) {
          const plan = pharmacy.subscription_plan;
          const isLitePlan = plan === 'lite' || plan === 'starter';
          
          if (isLitePlan) {
            // Check if we need to reset monthly counter
            const resetAt = pharmacy.ai_scans_reset_at ? new Date(pharmacy.ai_scans_reset_at) : null;
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            
            let scansUsed = pharmacy.ai_scans_used_this_month || 0;
            
            // Reset counter if needed
            if (!resetAt || resetAt < startOfMonth) {
              await supabase
                .from("pharmacies")
                .update({ ai_scans_used_this_month: 0, ai_scans_reset_at: now.toISOString() })
                .eq("id", pharmacyId);
              scansUsed = 0;
            }
            
            // Check if limit exceeded
            if (scansUsed >= LITE_SCAN_LIMIT) {
              console.log(`scan-invoice: Pharmacy ${pharmacyId} has exceeded AI scan limit (${scansUsed}/${LITE_SCAN_LIMIT})`);
              return jsonResponse({
                error: "AI scan limit reached",
                upgrade_required: true,
                scans_used: scansUsed,
                scans_limit: LITE_SCAN_LIMIT,
                message: `You've used all ${LITE_SCAN_LIMIT} free AI scans this month. Upgrade to AI Powerhouse for unlimited scans.`
              }, { status: 402 });
            }
            
            // Increment counter after successful validation
            await supabase
              .from("pharmacies")
              .update({ ai_scans_used_this_month: scansUsed + 1 })
              .eq("id", pharmacyId);
            
            console.log(`scan-invoice: Pharmacy ${pharmacyId} scan count: ${scansUsed + 1}/${LITE_SCAN_LIMIT}`);
          }
        }
      }
    }

    console.log(`scan-invoice: processing ${images.length} image(s)`);

    // Prompt tuned for pharmacy supplier invoices
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
      "quantity": 1,
      "unitPrice": 0,
      "sellingPrice": null,
      "batchNumber": null,
      "expiryDate": null,
      "manufacturingDate": null
    }
  ],
  "invoiceTotal": null,
  "invoiceDate": null,
  "supplierName": null,
  "invoiceNumber": null
}

REMEMBER: Extract EVERY product row. When in doubt, include it. Empty items array is only acceptable if the image has NO products at all.`;

    const messageContent: any[] = [
      {
        type: "text",
        text:
          images.length > 1
            ? `Extract ALL products from these ${images.length} invoice pages. Combine all items into a single list.`
            : "Extract ALL products from this invoice image. Be thorough - scan every row. Do not skip any products.",
      },
    ];

    for (const imageUrl of images) {
      messageContent.push({
        type: "image_url",
        image_url: { url: imageUrl },
      });
    }

    // Hard timeout to avoid hanging / wasting credits on stuck requests
    const controller = new AbortController();
    const timeoutMs = 45_000;
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    let aiResponse: any;
    try {
      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: messageContent },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Lovable AI Gateway error:", response.status, errorText);

        if (response.status === 429) {
          return jsonResponse(
            { error: "Rate limit exceeded. Please try again in a moment.", rateLimited: true },
            { status: 429 }
          );
        }

        if (response.status === 402) {
          return jsonResponse({ error: "AI credits exhausted. Please add funds to continue." }, { status: 402 });
        }

        return jsonResponse({ error: "Failed to process image with AI" }, { status: 500 });
      }

      aiResponse = await response.json();
    } catch (e) {
      if ((e as any)?.name === "AbortError") {
        console.error(`scan-invoice: AI request timed out after ${timeoutMs}ms`);
        return jsonResponse(
          { error: "Invoice scan timed out. Try a clearer photo or fewer pages." },
          { status: 504 }
        );
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    const content = aiResponse?.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let result: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      result = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError, "Content:", content);
      return jsonResponse(
        {
          items: [],
          error: "Could not parse invoice data. Please try with a clearer image or take another photo.",
        },
        { status: 200 }
      );
    }

    const rawItems = Array.isArray(result?.items) ? result.items : [];

    // Post-process + normalize
    const items = rawItems
      .map((item: any) => {
        const productName = String(item?.productName ?? "").trim();
        const quantityRaw = item?.quantity;
        const quantityNum = typeof quantityRaw === "number" ? quantityRaw : Number(quantityRaw);
        const quantity = Number.isFinite(quantityNum) && quantityNum > 0 ? quantityNum : 1;

        return {
          productName,
          quantity,
          unitPrice: normalizePrice(item?.unitPrice),
          sellingPrice: normalizePrice(item?.sellingPrice),
          batchNumber: item?.batchNumber ? String(item.batchNumber) : null,
          expiryDate: item?.expiryDate ? String(item.expiryDate) : null,
          manufacturingDate: item?.manufacturingDate ? String(item.manufacturingDate) : null,
        };
      })
      .filter((i: any) => i.productName && i.productName.length > 0);

    if (items.length === 0) {
      return jsonResponse(
        {
          items: [],
          error: "No products found in this image. Please ensure the invoice shows a product list with names and prices.",
        },
        { status: 200 }
      );
    }

    console.log(`scan-invoice: extracted ${items.length} item(s)`);

    return jsonResponse({
      items,
      invoiceTotal: normalizePrice(result?.invoiceTotal),
      invoiceDate: result?.invoiceDate ?? null,
      supplierName: result?.supplierName ?? null,
      invoiceNumber: result?.invoiceNumber ?? null,
    });
  } catch (error) {
    console.error("Error in scan-invoice function:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to process invoice";
    return jsonResponse({ error: errorMessage }, { status: 500 });
  }
});
