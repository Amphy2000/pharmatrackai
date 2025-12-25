import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.89.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation constants
const MAX_EMAIL_LENGTH = 255;
const MAX_NAME_LENGTH = 255;
const MAX_PHONE_LENGTH = 30;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;
const MAX_PERMISSIONS = 50;
const ALLOWED_ROLES = ['manager', 'staff'] as const;

// Allowed permission keys - must match frontend PERMISSION_KEYS
const ALLOWED_PERMISSIONS = [
  'view_dashboard',
  'access_inventory',
  'access_customers',
  'access_branches',
  'access_suppliers',
  'view_reports',
  'view_analytics',
  'view_all_sales',
  'view_own_sales',
  'view_financial_data',
  'manage_stock_transfers',
];

interface CreateStaffRequest {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: 'manager' | 'staff';
  pharmacyId: string;
  branchId?: string | null;
  permissions: string[];
}

function validateEmail(email: unknown): string {
  if (typeof email !== 'string') {
    throw new Error('email must be a string');
  }
  
  const trimmed = email.trim().toLowerCase();
  
  if (trimmed.length === 0) {
    throw new Error('email cannot be empty');
  }
  
  if (trimmed.length > MAX_EMAIL_LENGTH) {
    throw new Error(`email must be less than ${MAX_EMAIL_LENGTH} characters`);
  }
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new Error('Invalid email format');
  }
  
  return trimmed;
}

function validatePassword(password: unknown): string {
  if (typeof password !== 'string') {
    throw new Error('password must be a string');
  }
  
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error(`password must be less than ${MAX_PASSWORD_LENGTH} characters`);
  }
  
  return password;
}

function validateFullName(name: unknown): string {
  if (typeof name !== 'string') {
    throw new Error('fullName must be a string');
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length === 0) {
    throw new Error('fullName cannot be empty');
  }
  
  if (trimmed.length > MAX_NAME_LENGTH) {
    throw new Error(`fullName must be less than ${MAX_NAME_LENGTH} characters`);
  }
  
  // Remove any potential HTML/script
  return trimmed.replace(/<[^>]*>/g, '').slice(0, MAX_NAME_LENGTH);
}

function validatePhone(phone: unknown): string | undefined {
  if (phone === undefined || phone === null || phone === '') {
    return undefined;
  }
  
  if (typeof phone !== 'string') {
    throw new Error('phone must be a string');
  }
  
  const trimmed = phone.trim();
  
  if (trimmed.length > MAX_PHONE_LENGTH) {
    throw new Error(`phone must be less than ${MAX_PHONE_LENGTH} characters`);
  }
  
  // Basic phone validation: only allow digits, spaces, dashes, plus, parentheses
  const phoneRegex = /^[\d\s\-+()]+$/;
  if (!phoneRegex.test(trimmed)) {
    throw new Error('phone contains invalid characters');
  }
  
  return trimmed;
}

function validateRole(role: unknown): 'manager' | 'staff' {
  if (typeof role !== 'string') {
    throw new Error('role must be a string');
  }
  
  if (!ALLOWED_ROLES.includes(role as typeof ALLOWED_ROLES[number])) {
    throw new Error(`role must be one of: ${ALLOWED_ROLES.join(', ')}`);
  }
  
  return role as 'manager' | 'staff';
}

function validatePharmacyId(id: unknown): string {
  if (typeof id !== 'string') {
    throw new Error('pharmacyId must be a string');
  }
  
  const trimmed = id.trim();
  
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    throw new Error('pharmacyId must be a valid UUID');
  }
  
  return trimmed;
}

function validatePermissions(permissions: unknown): string[] {
  if (!Array.isArray(permissions)) {
    throw new Error('permissions must be an array');
  }
  
  if (permissions.length > MAX_PERMISSIONS) {
    throw new Error(`permissions cannot exceed ${MAX_PERMISSIONS} items`);
  }
  
  const validated: string[] = [];
  
  for (const perm of permissions) {
    if (typeof perm !== 'string') {
      throw new Error('each permission must be a string');
    }
    
    if (!ALLOWED_PERMISSIONS.includes(perm)) {
      throw new Error(`Invalid permission: ${perm}`);
    }
    
    if (!validated.includes(perm)) {
      validated.push(perm);
    }
  }
  
  return validated;
}

function validateBranchId(branchId: unknown): string | null {
  if (branchId === undefined || branchId === null || branchId === '') {
    return null;
  }
  
  if (typeof branchId !== 'string') {
    throw new Error('branchId must be a string');
  }
  
  const trimmed = branchId.trim();
  
  // UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(trimmed)) {
    throw new Error('branchId must be a valid UUID');
  }
  
  return trimmed;
}

function validateInput(body: unknown): CreateStaffRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Request body must be an object');
  }
  
  const data = body as Record<string, unknown>;
  
  return {
    email: validateEmail(data.email),
    password: validatePassword(data.password),
    fullName: validateFullName(data.fullName),
    phone: validatePhone(data.phone),
    role: validateRole(data.role),
    pharmacyId: validatePharmacyId(data.pharmacyId),
    branchId: validateBranchId(data.branchId),
    permissions: validatePermissions(data.permissions ?? []),
  };
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verify the requesting user is authenticated and has permission
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate and parse input
    const body = await req.json();
    const { email, password, fullName, phone, role, pharmacyId, branchId, permissions } = validateInput(body);

    // Verify requesting user is owner of the pharmacy
    const { data: pharmacy, error: pharmacyError } = await supabaseAdmin
      .from('pharmacies')
      .select('owner_id')
      .eq('id', pharmacyId)
      .single();

    if (pharmacyError || !pharmacy) {
      return new Response(
        JSON.stringify({ error: "Pharmacy not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if requesting user is owner or manager
    const { data: staffRecord } = await supabaseAdmin
      .from('pharmacy_staff')
      .select('role')
      .eq('pharmacy_id', pharmacyId)
      .eq('user_id', requestingUser.id)
      .eq('is_active', true)
      .single();

    const isOwner = pharmacy.owner_id === requestingUser.id;
    const isManager = staffRecord?.role === 'manager' || staffRecord?.role === 'owner';

    if (!isOwner && !isManager) {
      return new Response(
        JSON.stringify({ error: "You don't have permission to add staff" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create the user using admin API (doesn't affect current session)
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: "Failed to create user" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create profile
    await supabaseAdmin
      .from('profiles')
      .upsert({
        user_id: authData.user.id,
        full_name: fullName,
        phone: phone || null,
      }, { onConflict: 'user_id' });

    // Add as pharmacy staff with optional branch assignment
    const { data: staffData, error: staffError } = await supabaseAdmin
      .from('pharmacy_staff')
      .insert({
        pharmacy_id: pharmacyId,
        user_id: authData.user.id,
        role: role,
        is_active: true,
        branch_id: branchId, // null means all branches access
      })
      .select()
      .single();

    if (staffError) {
      // Try to clean up the created user
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return new Response(
        JSON.stringify({ error: "Failed to add staff to pharmacy" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add permissions if staff role
    if (role === 'staff' && permissions.length > 0) {
      await supabaseAdmin
        .from('staff_permissions')
        .insert(
          permissions.map(perm => ({
            staff_id: staffData.id,
            permission_key: perm,
            is_granted: true,
          }))
        );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { id: authData.user.id, email: authData.user.email },
        staff: staffData
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in create-staff function:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    const isValidationError = message.includes('must be') || message.includes('cannot') || message.includes('Invalid');
    
    return new Response(
      JSON.stringify({ error: message }),
      { status: isValidationError ? 400 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
