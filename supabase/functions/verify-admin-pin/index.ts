import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: Track failed attempts per pharmacy
const failedAttempts = new Map<string, { count: number; lastAttempt: number }>();
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(pharmacyId: string): { allowed: boolean; remainingAttempts: number } {
  const now = Date.now();
  const record = failedAttempts.get(pharmacyId);
  
  if (!record) {
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  // Reset if lockout period has passed
  if (now - record.lastAttempt > LOCKOUT_DURATION_MS) {
    failedAttempts.delete(pharmacyId);
    return { allowed: true, remainingAttempts: MAX_ATTEMPTS };
  }
  
  if (record.count >= MAX_ATTEMPTS) {
    return { allowed: false, remainingAttempts: 0 };
  }
  
  return { allowed: true, remainingAttempts: MAX_ATTEMPTS - record.count };
}

function recordFailedAttempt(pharmacyId: string): void {
  const now = Date.now();
  const record = failedAttempts.get(pharmacyId);
  
  if (!record || now - record.lastAttempt > LOCKOUT_DURATION_MS) {
    failedAttempts.set(pharmacyId, { count: 1, lastAttempt: now });
  } else {
    failedAttempts.set(pharmacyId, { count: record.count + 1, lastAttempt: now });
  }
}

function clearFailedAttempts(pharmacyId: string): void {
  failedAttempts.delete(pharmacyId);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ valid: false, error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user's auth
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { pharmacyId, pin, action } = body;

    if (!pharmacyId) {
      return new Response(
        JSON.stringify({ valid: false, error: "Missing pharmacy ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user belongs to this pharmacy
    const { data: staffRecord, error: staffError } = await supabase
      .from("pharmacy_staff")
      .select("id, role")
      .eq("user_id", user.id)
      .eq("pharmacy_id", pharmacyId)
      .eq("is_active", true)
      .maybeSingle();

    if (staffError || !staffRecord) {
      console.error("User not authorized for this pharmacy:", user.id, pharmacyId);
      return new Response(
        JSON.stringify({ valid: false, error: "Not authorized for this pharmacy" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle PIN setting (only owners/managers can set PIN)
    if (action === "set") {
      if (!["owner", "manager"].includes(staffRecord.role)) {
        return new Response(
          JSON.stringify({ valid: false, error: "Only owners and managers can set admin PIN" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!pin || pin.length < 4 || pin.length > 6 || !/^\d+$/.test(pin)) {
        return new Response(
          JSON.stringify({ valid: false, error: "PIN must be 4-6 digits" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Hash the PIN with bcrypt
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(pin, salt);

      const { error: updateError } = await supabase
        .from("pharmacies")
        .update({ admin_pin_hash: hashedPin })
        .eq("id", pharmacyId);

      if (updateError) {
        console.error("Error setting PIN:", updateError);
        return new Response(
          JSON.stringify({ valid: false, error: "Failed to set PIN" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Log the action
      await supabase.from("audit_logs").insert({
        pharmacy_id: pharmacyId,
        user_id: user.id,
        action: "admin_pin_set",
        entity_type: "pharmacy",
        entity_id: pharmacyId,
        details: { action: "Admin PIN was set/changed" },
      });

      console.log(`Admin PIN set for pharmacy ${pharmacyId} by user ${user.id}`);
      return new Response(
        JSON.stringify({ valid: true, message: "PIN set successfully" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle PIN verification
    if (action === "verify") {
      // Check rate limit
      const rateLimit = checkRateLimit(pharmacyId);
      if (!rateLimit.allowed) {
        console.warn(`Rate limit exceeded for pharmacy ${pharmacyId}`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "Too many failed attempts. Please try again in 15 minutes.",
            remainingAttempts: 0 
          }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!pin) {
        return new Response(
          JSON.stringify({ valid: false, error: "PIN required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get pharmacy's stored PIN hash
      const { data: pharmacy, error: pharmacyError } = await supabase
        .from("pharmacies")
        .select("admin_pin_hash")
        .eq("id", pharmacyId)
        .single();

      if (pharmacyError || !pharmacy) {
        return new Response(
          JSON.stringify({ valid: false, error: "Pharmacy not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // If no PIN is set, allow action (first-time setup scenario)
      if (!pharmacy.admin_pin_hash) {
        console.log(`No admin PIN set for pharmacy ${pharmacyId}, allowing action`);
        return new Response(
          JSON.stringify({ valid: true, noPinSet: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify the PIN with bcrypt
      const isValid = await bcrypt.compare(pin, pharmacy.admin_pin_hash);

      if (isValid) {
        clearFailedAttempts(pharmacyId);
        
        // Log successful verification
        await supabase.from("audit_logs").insert({
          pharmacy_id: pharmacyId,
          user_id: user.id,
          action: "admin_pin_verified",
          entity_type: "pharmacy",
          entity_id: pharmacyId,
          details: { success: true },
        });

        console.log(`Admin PIN verified successfully for pharmacy ${pharmacyId}`);
        return new Response(
          JSON.stringify({ valid: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        recordFailedAttempt(pharmacyId);
        const newRateLimit = checkRateLimit(pharmacyId);

        // Log failed attempt
        await supabase.from("audit_logs").insert({
          pharmacy_id: pharmacyId,
          user_id: user.id,
          action: "admin_pin_failed",
          entity_type: "pharmacy",
          entity_id: pharmacyId,
          details: { 
            success: false, 
            remainingAttempts: newRateLimit.remainingAttempts 
          },
        });

        console.warn(`Invalid admin PIN attempt for pharmacy ${pharmacyId}, remaining attempts: ${newRateLimit.remainingAttempts}`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: "Incorrect PIN",
            remainingAttempts: newRateLimit.remainingAttempts
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ valid: false, error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Verify admin PIN error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ valid: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
