-- =====================================================
-- COMPLETE SUPABASE SCHEMA MIGRATION
-- From Lovable Cloud to Self-Hosted Supabase
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- STEP 2: CREATE ENUMS
-- =====================================================
CREATE TYPE public.pharmacy_role AS ENUM ('owner', 'manager', 'staff');
CREATE TYPE public.platform_role AS ENUM ('super_admin', 'admin', 'support');
CREATE TYPE public.subscription_plan AS ENUM ('starter', 'growth', 'enterprise');
CREATE TYPE public.subscription_status AS ENUM ('trial', 'active', 'expired', 'cancelled');

-- =====================================================
-- STEP 3: CREATE SEQUENCES
-- =====================================================
CREATE SEQUENCE IF NOT EXISTS internal_barcode_seq START 1;

-- =====================================================
-- STEP 4: CREATE TABLES
-- =====================================================

-- Profiles table
CREATE TABLE public.profiles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    full_name text,
    avatar_url text,
    phone text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Platform admins table
CREATE TABLE public.platform_admins (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL UNIQUE,
    role platform_role NOT NULL DEFAULT 'super_admin',
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pharmacies table
CREATE TABLE public.pharmacies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    owner_id uuid NOT NULL,
    logo_url text,
    license_number text,
    pharmacist_in_charge text,
    subscription_plan subscription_plan NOT NULL DEFAULT 'starter',
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    subscription_ends_at timestamp with time zone,
    trial_ends_at timestamp with time zone DEFAULT (now() + interval '7 days'),
    paystack_subscription_code text,
    paystack_customer_code text,
    max_users integer NOT NULL DEFAULT 1,
    active_branches_limit integer NOT NULL DEFAULT 1,
    branch_fee_per_month numeric NOT NULL DEFAULT 15000,
    default_margin_percent numeric DEFAULT 20,
    price_lock_enabled boolean DEFAULT false,
    enable_logo_on_print boolean DEFAULT true,
    require_wifi_clockin boolean DEFAULT false,
    shop_wifi_name text,
    shop_location_qr text,
    admin_pin_hash text,
    alert_channel text DEFAULT 'sms',
    alert_recipient_phone text,
    termii_sender_id text,
    marketplace_contact_phone text,
    marketplace_lat numeric,
    marketplace_lon numeric,
    marketplace_city text,
    marketplace_zone text,
    hide_marketplace_prices boolean DEFAULT false,
    partner_source text,
    auto_renew boolean DEFAULT true,
    is_gifted boolean NOT NULL DEFAULT false,
    cancelled_at timestamp with time zone,
    cancellation_reason text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Branches table
CREATE TABLE public.branches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    is_main_branch boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pharmacy staff table
CREATE TABLE public.pharmacy_staff (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    user_id uuid NOT NULL,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    role pharmacy_role NOT NULL DEFAULT 'staff',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(pharmacy_id, user_id)
);

-- Staff permissions table
CREATE TABLE public.staff_permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES public.pharmacy_staff(id) ON DELETE CASCADE,
    permission_key text NOT NULL,
    is_granted boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(staff_id, permission_key)
);

-- Medications table
CREATE TABLE public.medications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    name text NOT NULL,
    category text NOT NULL,
    batch_number text NOT NULL,
    current_stock integer NOT NULL DEFAULT 0,
    reorder_level integer NOT NULL DEFAULT 10,
    min_stock_alert integer DEFAULT 10,
    expiry_date date NOT NULL,
    manufacturing_date date,
    unit_price numeric NOT NULL,
    selling_price numeric,
    barcode_id text,
    nafdac_reg_number text,
    supplier text,
    location text,
    dispensing_unit text NOT NULL DEFAULT 'unit',
    active_ingredients text[],
    is_shelved boolean NOT NULL DEFAULT true,
    is_controlled boolean NOT NULL DEFAULT false,
    is_public boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    featured_until timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb,
    last_notified_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Branch inventory table
CREATE TABLE public.branch_inventory (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id uuid NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    current_stock integer NOT NULL DEFAULT 0,
    reorder_level integer NOT NULL DEFAULT 10,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(branch_id, medication_id)
);

-- Stock transfers table
CREATE TABLE public.stock_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    from_branch_id uuid NOT NULL REFERENCES public.branches(id),
    to_branch_id uuid NOT NULL REFERENCES public.branches(id),
    medication_id uuid NOT NULL REFERENCES public.medications(id),
    quantity integer NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    notes text,
    requested_by uuid,
    approved_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text,
    email text,
    date_of_birth date,
    address text,
    notes text,
    loyalty_points integer DEFAULT 0,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Doctors table
CREATE TABLE public.doctors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    full_name text NOT NULL,
    phone text,
    email text,
    hospital_clinic text,
    specialty text,
    license_number text,
    address text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Prescriptions table
CREATE TABLE public.prescriptions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    prescription_number text NOT NULL,
    prescriber_name text,
    prescriber_phone text,
    diagnosis text,
    notes text,
    issue_date date NOT NULL DEFAULT CURRENT_DATE,
    expiry_date date,
    status text NOT NULL DEFAULT 'active',
    refill_count integer DEFAULT 0,
    max_refills integer DEFAULT 0,
    last_refill_date timestamp with time zone,
    next_refill_reminder date,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Prescription items table
CREATE TABLE public.prescription_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
    medication_name text NOT NULL,
    dosage text NOT NULL,
    frequency text NOT NULL,
    duration text,
    quantity integer NOT NULL DEFAULT 1,
    instructions text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Prescription fraud alerts table
CREATE TABLE public.prescription_fraud_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    prescription_id uuid REFERENCES public.prescriptions(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    alert_type text NOT NULL,
    severity text NOT NULL DEFAULT 'medium',
    description text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    status text NOT NULL DEFAULT 'pending',
    review_notes text,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Suppliers table
CREATE TABLE public.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    website text,
    payment_terms text,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Supplier products table
CREATE TABLE public.supplier_products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
    medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
    product_name text NOT NULL,
    sku text,
    unit_price numeric NOT NULL,
    min_order_quantity integer NOT NULL DEFAULT 1,
    lead_time_days integer,
    is_available boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Reorder requests table
CREATE TABLE public.reorder_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    supplier_id uuid NOT NULL REFERENCES public.suppliers(id),
    medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
    supplier_product_id uuid REFERENCES public.supplier_products(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    total_amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    requested_by uuid,
    approved_by uuid,
    notes text,
    expected_delivery date,
    actual_delivery date,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Shifts table
CREATE TABLE public.shifts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    user_id uuid NOT NULL,
    clock_in timestamp with time zone NOT NULL DEFAULT now(),
    clock_out timestamp with time zone,
    clock_in_method text DEFAULT 'manual',
    clock_out_method text,
    clock_in_location jsonb,
    clock_out_location jsonb,
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sales table
CREATE TABLE public.sales (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    medication_id uuid NOT NULL REFERENCES public.medications(id),
    customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
    shift_id uuid REFERENCES public.shifts(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    total_price numeric NOT NULL,
    customer_name text,
    sold_by uuid,
    sold_by_name text,
    receipt_id text,
    payment_method text,
    prescription_images text[],
    sale_date timestamp with time zone NOT NULL DEFAULT now(),
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pending transactions table
CREATE TABLE public.pending_transactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    barcode text NOT NULL,
    short_code text NOT NULL,
    items jsonb NOT NULL,
    total_amount numeric NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    payment_method text,
    notes text,
    created_by uuid,
    completed_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Notifications table
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    branch_id uuid REFERENCES public.branches(id) ON DELETE SET NULL,
    title text NOT NULL,
    message text NOT NULL,
    type text NOT NULL DEFAULT 'info',
    priority text NOT NULL DEFAULT 'medium',
    entity_type text,
    entity_id uuid,
    link text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_read boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Sent alerts table
CREATE TABLE public.sent_alerts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    alert_type text NOT NULL,
    channel text NOT NULL,
    recipient_phone text NOT NULL,
    message text NOT NULL,
    status text NOT NULL DEFAULT 'sent',
    termii_message_id text,
    items_included jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Audit logs table
CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE SET NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Shelving history table
CREATE TABLE public.shelving_history (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    medication_id uuid NOT NULL REFERENCES public.medications(id) ON DELETE CASCADE,
    action text NOT NULL,
    reason text,
    performed_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- AI predictions table
CREATE TABLE public.ai_predictions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
    prediction_type text NOT NULL,
    prediction_data jsonb NOT NULL,
    confidence_score numeric,
    valid_until timestamp with time zone,
    is_actioned boolean DEFAULT false,
    generated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Feature requests table
CREATE TABLE public.feature_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    entity_type text NOT NULL,
    entity_id uuid,
    field_name text NOT NULL,
    field_value text,
    notes text,
    status text NOT NULL DEFAULT 'pending',
    requested_by uuid,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Pharmacy custom features table
CREATE TABLE public.pharmacy_custom_features (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    feature_key text NOT NULL,
    feature_name text NOT NULL,
    description text,
    config jsonb DEFAULT '{}'::jsonb,
    is_enabled boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    UNIQUE(pharmacy_id, feature_key)
);

-- Master barcode library table
CREATE TABLE public.master_barcode_library (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    barcode text NOT NULL UNIQUE,
    product_name text NOT NULL,
    category text,
    manufacturer text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Marketplace views table
CREATE TABLE public.marketplace_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_id uuid NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
    visit_type text DEFAULT 'search',
    search_query text,
    viewer_ip text,
    viewed_at timestamp with time zone DEFAULT now()
);

-- Marketplace searches table
CREATE TABLE public.marketplace_searches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    search_query text NOT NULL,
    location_filter text,
    results_count integer DEFAULT 0,
    viewer_ip text,
    searched_at timestamp with time zone DEFAULT now()
);

-- Referral partners table
CREATE TABLE public.referral_partners (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_name text NOT NULL,
    partner_code text NOT NULL UNIQUE,
    partner_type text NOT NULL,
    organization_name text,
    contact_email text,
    contact_phone text,
    commission_type text NOT NULL,
    commission_value numeric NOT NULL DEFAULT 0,
    total_referrals integer NOT NULL DEFAULT 0,
    successful_signups integer NOT NULL DEFAULT 0,
    total_commission_earned numeric NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Referral signups table
CREATE TABLE public.referral_signups (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid REFERENCES public.referral_partners(id) ON DELETE SET NULL,
    partner_code text NOT NULL,
    pharmacy_id uuid REFERENCES public.pharmacies(id) ON DELETE SET NULL,
    status text NOT NULL DEFAULT 'pending',
    signup_date timestamp with time zone NOT NULL DEFAULT now(),
    commission_amount numeric,
    commission_paid boolean NOT NULL DEFAULT false,
    paid_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- STEP 5: CREATE INDEXES
-- =====================================================
CREATE INDEX idx_medications_pharmacy ON public.medications(pharmacy_id);
CREATE INDEX idx_medications_name_trgm ON public.medications USING gin(name gin_trgm_ops);
CREATE INDEX idx_medications_category ON public.medications(category);
CREATE INDEX idx_medications_expiry ON public.medications(expiry_date);
CREATE INDEX idx_medications_public ON public.medications(is_public) WHERE is_public = true;
CREATE INDEX idx_medications_featured ON public.medications(is_featured) WHERE is_featured = true;

CREATE INDEX idx_sales_pharmacy ON public.sales(pharmacy_id);
CREATE INDEX idx_sales_date ON public.sales(sale_date);
CREATE INDEX idx_sales_medication ON public.sales(medication_id);

CREATE INDEX idx_customers_pharmacy ON public.customers(pharmacy_id);
CREATE INDEX idx_customers_name ON public.customers(full_name);

CREATE INDEX idx_pharmacy_staff_user ON public.pharmacy_staff(user_id);
CREATE INDEX idx_pharmacy_staff_pharmacy ON public.pharmacy_staff(pharmacy_id);

CREATE INDEX idx_notifications_pharmacy ON public.notifications(pharmacy_id);
CREATE INDEX idx_notifications_unread ON public.notifications(pharmacy_id) WHERE is_read = false;

CREATE INDEX idx_master_barcode ON public.master_barcode_library(barcode);
CREATE INDEX idx_master_barcode_name_trgm ON public.master_barcode_library USING gin(product_name gin_trgm_ops);

-- =====================================================
-- STEP 6: CREATE SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Check if user is platform admin
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

-- Check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Alias functions for RLS policies
CREATE OR REPLACE FUNCTION public.check_is_platform_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.check_is_super_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Get user's pharmacy IDs
CREATE OR REPLACE FUNCTION public.get_user_pharmacy_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = _user_id
  AND is_active = true
$$;

-- Get single pharmacy ID for user
CREATE OR REPLACE FUNCTION public.get_user_pharmacy_id(user_uuid uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT pharmacy_id FROM public.pharmacy_staff 
  WHERE user_id = user_uuid AND is_active = true
  LIMIT 1
$$;

-- Check if user is pharmacy staff
CREATE OR REPLACE FUNCTION public.is_pharmacy_staff(check_user_id uuid, check_pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = check_user_id
    AND pharmacy_id = check_pharmacy_id
    AND is_active = true
  )
$$;

CREATE OR REPLACE FUNCTION public.user_is_pharmacy_staff(_user_id uuid, _pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND pharmacy_id = _pharmacy_id
    AND is_active = true
  )
$$;

-- Check if user is pharmacy owner
CREATE OR REPLACE FUNCTION public.is_pharmacy_owner(check_user_id uuid, check_pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacies
    WHERE id = check_pharmacy_id
    AND owner_id = check_user_id
  )
$$;

-- Check if user has pharmacy role
CREATE OR REPLACE FUNCTION public.has_pharmacy_role(user_uuid uuid, required_role pharmacy_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = user_uuid 
    AND is_active = true
    AND (role = required_role OR role = 'owner')
  )
$$;

-- Check if user is manager for pharmacy
CREATE OR REPLACE FUNCTION public.is_manager_for_pharmacy(_user_id uuid, _pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND pharmacy_id = _pharmacy_id
    AND is_active = true
    AND role = 'manager'
  )
$$;

-- Get manager's branch ID
CREATE OR REPLACE FUNCTION public.get_manager_branch_id(_user_id uuid, _pharmacy_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.pharmacy_staff
  WHERE user_id = _user_id
  AND pharmacy_id = _pharmacy_id
  AND is_active = true
  AND role = 'manager'
  LIMIT 1
$$;

-- Check if staff is assigned to branch
CREATE OR REPLACE FUNCTION public.staff_assigned_to_branch(_user_id uuid, _branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND is_active = true
    AND (
      branch_id IS NULL
      OR branch_id = _branch_id
      OR role IN ('owner', 'manager')
    )
  )
$$;

-- Check staff permission
CREATE OR REPLACE FUNCTION public.staff_has_permission(_user_id uuid, _permission_key text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND is_active = true
    AND role IN ('owner', 'manager')
  )
  OR
  EXISTS (
    SELECT 1 
    FROM public.staff_permissions sp
    JOIN public.pharmacy_staff ps ON ps.id = sp.staff_id
    WHERE ps.user_id = _user_id
    AND ps.is_active = true
    AND sp.permission_key = _permission_key
    AND sp.is_granted = true
  )
$$;

-- Check if branch is within limit
CREATE OR REPLACE FUNCTION public.is_branch_within_limit(_branch_id uuid, _pharmacy_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    SELECT COUNT(*)::integer 
    FROM public.branches 
    WHERE pharmacy_id = _pharmacy_id 
    AND is_active = true 
    AND created_at <= (
      SELECT created_at FROM public.branches WHERE id = _branch_id
    )
  ) <= (
    SELECT active_branches_limit 
    FROM public.pharmacies 
    WHERE id = _pharmacy_id
  )
$$;

-- Generate receipt ID
CREATE OR REPLACE FUNCTION public.generate_receipt_id()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := 'PH-';
  i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

-- Generate internal barcode
CREATE OR REPLACE FUNCTION public.generate_internal_barcode()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN '#' || LPAD(nextval('internal_barcode_seq')::TEXT, 4, '0');
END;
$$;

-- Search drug database
CREATE OR REPLACE FUNCTION public.search_drug_database(search_term text)
RETURNS TABLE(id uuid, product_name text, category text, manufacturer text, similarity_score real)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.product_name,
    m.category,
    m.manufacturer,
    similarity(m.product_name, search_term) as similarity_score
  FROM public.master_barcode_library m
  WHERE 
    m.product_name ILIKE '%' || search_term || '%'
    OR similarity(m.product_name, search_term) > 0.2
  ORDER BY 
    CASE WHEN m.product_name ILIKE '%' || search_term || '%' THEN 0 ELSE 1 END,
    similarity(m.product_name, search_term) DESC
  LIMIT 20;
$$;

-- Get public medications
CREATE OR REPLACE FUNCTION public.get_public_medications(search_term text DEFAULT NULL, location_filter text DEFAULT NULL)
RETURNS TABLE(
  id uuid, 
  name text, 
  category text, 
  current_stock integer, 
  selling_price numeric, 
  dispensing_unit text, 
  pharmacy_id uuid, 
  pharmacy_name text, 
  pharmacy_phone text, 
  pharmacy_address text, 
  is_featured boolean, 
  marketplace_contact_phone text, 
  hide_marketplace_prices boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    CASE WHEN p.hide_marketplace_prices = true THEN NULL ELSE m.selling_price END as selling_price,
    m.dispensing_unit,
    m.pharmacy_id,
    p.name as pharmacy_name,
    COALESCE(p.marketplace_contact_phone, p.phone) as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured,
    p.marketplace_contact_phone,
    COALESCE(p.hide_marketplace_prices, false) as hide_marketplace_prices
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_public = true 
    AND m.current_stock > 0 
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (
      search_term IS NULL 
      OR m.name ILIKE '%' || search_term || '%' 
      OR m.category ILIKE '%' || search_term || '%'
      OR similarity(m.name, search_term) > 0.3
    )
    AND (location_filter IS NULL OR p.address ILIKE '%' || location_filter || '%')
  ORDER BY 
    CASE WHEN m.name ILIKE '%' || COALESCE(search_term, '') || '%' THEN 0 ELSE 1 END,
    m.is_featured DESC,
    similarity(m.name, COALESCE(search_term, '')) DESC,
    m.name;
$$;

-- Get featured medications
CREATE OR REPLACE FUNCTION public.get_featured_medications()
RETURNS TABLE(
  id uuid, 
  name text, 
  category text, 
  current_stock integer, 
  selling_price numeric, 
  dispensing_unit text, 
  pharmacy_id uuid, 
  pharmacy_name text, 
  pharmacy_phone text, 
  pharmacy_address text, 
  is_featured boolean, 
  featured_until timestamp with time zone, 
  marketplace_contact_phone text, 
  hide_marketplace_prices boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    CASE WHEN p.hide_marketplace_prices = true THEN NULL ELSE m.selling_price END as selling_price,
    m.dispensing_unit,
    m.pharmacy_id,
    p.name as pharmacy_name,
    COALESCE(p.marketplace_contact_phone, p.phone) as pharmacy_phone,
    p.address as pharmacy_address,
    m.is_featured,
    m.featured_until,
    p.marketplace_contact_phone,
    COALESCE(p.hide_marketplace_prices, false) as hide_marketplace_prices
  FROM public.medications m
  JOIN public.pharmacies p ON p.id = m.pharmacy_id
  WHERE m.is_featured = true 
    AND m.is_public = true 
    AND m.current_stock > 0 
    AND m.is_shelved = true
    AND p.subscription_status IN ('active', 'trial')
    AND (m.featured_until IS NULL OR m.featured_until > now())
  ORDER BY m.featured_until DESC NULLS LAST, m.name;
$$;

-- Expire featured items
CREATE OR REPLACE FUNCTION public.expire_featured_items()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.medications
  SET is_featured = false
  WHERE is_featured = true 
    AND featured_until IS NOT NULL 
    AND featured_until < NOW();
END;
$$;

-- Check and create expiry notifications
CREATE OR REPLACE FUNCTION public.check_and_create_expiry_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    med RECORD;
    days_until_expiry INTEGER;
    priority_level TEXT;
    existing_notif UUID;
BEGIN
    FOR med IN 
        SELECT m.*, p.name as pharmacy_name
        FROM medications m
        JOIN pharmacies p ON p.id = m.pharmacy_id
        WHERE m.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND m.current_stock > 0
        AND m.is_shelved = true
        AND (m.last_notified_at IS NULL OR m.last_notified_at < NOW() - INTERVAL '7 days')
    LOOP
        days_until_expiry := med.expiry_date - CURRENT_DATE;
        
        IF days_until_expiry <= 0 THEN
            priority_level := 'critical';
        ELSIF days_until_expiry <= 7 THEN
            priority_level := 'high';
        ELSIF days_until_expiry <= 14 THEN
            priority_level := 'medium';
        ELSE
            priority_level := 'low';
        END IF;
        
        SELECT id INTO existing_notif
        FROM notifications
        WHERE pharmacy_id = med.pharmacy_id
        AND entity_type = 'medication'
        AND entity_id = med.id
        AND is_read = false
        AND created_at > NOW() - INTERVAL '24 hours';
        
        IF existing_notif IS NULL THEN
            INSERT INTO notifications (
                pharmacy_id, title, message, type, priority, entity_type, entity_id, link, metadata
            ) VALUES (
                med.pharmacy_id,
                CASE 
                    WHEN days_until_expiry <= 0 THEN med.name || ' has EXPIRED!'
                    ELSE med.name || ' expiring in ' || days_until_expiry || ' days'
                END,
                'Stock value at risk: ₦' || ROUND(med.current_stock * COALESCE(med.selling_price, med.unit_price))::TEXT,
                CASE WHEN days_until_expiry <= 0 THEN 'danger' ELSE 'warning' END,
                priority_level,
                'medication',
                med.id,
                '/inventory',
                jsonb_build_object(
                    'days_left', days_until_expiry,
                    'stock', med.current_stock,
                    'value', med.current_stock * COALESCE(med.selling_price, med.unit_price)
                )
            );
            
            UPDATE medications SET last_notified_at = NOW() WHERE id = med.id;
        END IF;
    END LOOP;
END;
$$;

-- Check and create stock notifications
CREATE OR REPLACE FUNCTION public.check_and_create_stock_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    med RECORD;
    priority_level TEXT;
    existing_notif UUID;
BEGIN
    FOR med IN 
        SELECT m.*, p.name as pharmacy_name
        FROM medications m
        JOIN pharmacies p ON p.id = m.pharmacy_id
        WHERE m.current_stock <= m.reorder_level
        AND m.is_shelved = true
        AND (m.last_notified_at IS NULL OR m.last_notified_at < NOW() - INTERVAL '7 days')
    LOOP
        IF med.current_stock = 0 THEN
            priority_level := 'critical';
        ELSIF med.current_stock <= 5 THEN
            priority_level := 'high';
        ELSE
            priority_level := 'medium';
        END IF;
        
        SELECT id INTO existing_notif
        FROM notifications
        WHERE pharmacy_id = med.pharmacy_id
        AND entity_type = 'medication'
        AND entity_id = med.id
        AND is_read = false
        AND created_at > NOW() - INTERVAL '24 hours';
        
        IF existing_notif IS NULL THEN
            INSERT INTO notifications (
                pharmacy_id, title, message, type, priority, entity_type, entity_id, link, metadata
            ) VALUES (
                med.pharmacy_id,
                CASE 
                    WHEN med.current_stock = 0 THEN med.name || ' is OUT OF STOCK!'
                    ELSE med.name || ' is running low'
                END,
                'Current stock: ' || med.current_stock || ' units. Reorder level: ' || med.reorder_level,
                CASE WHEN med.current_stock = 0 THEN 'danger' ELSE 'warning' END,
                priority_level,
                'medication',
                med.id,
                '/suppliers',
                jsonb_build_object(
                    'current_stock', med.current_stock,
                    'reorder_level', med.reorder_level,
                    'suggested_reorder', med.reorder_level * 3
                )
            );
            
            UPDATE medications SET last_notified_at = NOW() WHERE id = med.id;
        END IF;
    END LOOP;
END;
$$;

-- Handle new user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Update updated_at column trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- STEP 7: CREATE TRIGGERS
-- =====================================================

-- Create trigger for new users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at triggers for all relevant tables
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacies_updated_at
  BEFORE UPDATE ON public.pharmacies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branches_updated_at
  BEFORE UPDATE ON public.branches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_staff_updated_at
  BEFORE UPDATE ON public.pharmacy_staff
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medications_updated_at
  BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_branch_inventory_updated_at
  BEFORE UPDATE ON public.branch_inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doctors_updated_at
  BEFORE UPDATE ON public.doctors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescriptions_updated_at
  BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_supplier_products_updated_at
  BEFORE UPDATE ON public.supplier_products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reorder_requests_updated_at
  BEFORE UPDATE ON public.reorder_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shifts_updated_at
  BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_stock_transfers_updated_at
  BEFORE UPDATE ON public.stock_transfers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feature_requests_updated_at
  BEFORE UPDATE ON public.feature_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pharmacy_custom_features_updated_at
  BEFORE UPDATE ON public.pharmacy_custom_features
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referral_partners_updated_at
  BEFORE UPDATE ON public.referral_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_master_barcode_library_updated_at
  BEFORE UPDATE ON public.master_barcode_library
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_prescription_fraud_alerts_updated_at
  BEFORE UPDATE ON public.prescription_fraud_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- STEP 8: ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_fraud_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reorder_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shelving_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_custom_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_barcode_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketplace_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 9: CREATE RLS POLICIES
-- =====================================================

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Pharmacy staff can view colleague profiles" ON public.profiles FOR SELECT 
  USING (user_id IN (SELECT ps.user_id FROM pharmacy_staff ps WHERE ps.pharmacy_id IN (SELECT pharmacy_staff.pharmacy_id FROM pharmacy_staff WHERE pharmacy_staff.user_id = auth.uid() AND pharmacy_staff.is_active = true)));
CREATE POLICY "Platform admins can view all profiles" ON public.profiles FOR SELECT USING (is_platform_admin(auth.uid()));

-- Platform admins policies
CREATE POLICY "Super admins can view all admins" ON public.platform_admins FOR SELECT USING (check_is_platform_admin(auth.uid()));
CREATE POLICY "Super admins can manage admins" ON public.platform_admins FOR ALL USING (check_is_super_admin(auth.uid())) WITH CHECK (check_is_super_admin(auth.uid()));

-- Pharmacies policies
CREATE POLICY "pharmacy_insert_policy" ON public.pharmacies FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "pharmacy_owner_select_policy" ON public.pharmacies FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "pharmacy_owner_update_policy" ON public.pharmacies FOR UPDATE USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "pharmacy_staff_select_policy" ON public.pharmacies FOR SELECT USING (id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Platform admins can view all pharmacies" ON public.pharmacies FOR SELECT USING (is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can update all pharmacies" ON public.pharmacies FOR UPDATE USING (is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can delete pharmacies" ON public.pharmacies FOR DELETE USING (is_platform_admin(auth.uid()));

-- Branches policies
CREATE POLICY "Staff can view pharmacy branches" ON public.branches FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can insert branches" ON public.branches FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can update branches" ON public.branches FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete branches" ON public.branches FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Pharmacy staff policies
CREATE POLICY "Users can view own staff record" ON public.pharmacy_staff FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can insert own staff record" ON public.pharmacy_staff FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners can manage pharmacy staff" ON public.pharmacy_staff FOR ALL USING (is_pharmacy_owner(auth.uid(), pharmacy_id)) WITH CHECK (is_pharmacy_owner(auth.uid(), pharmacy_id));
CREATE POLICY "Managers can view branch staff" ON public.pharmacy_staff FOR SELECT USING (is_manager_for_pharmacy(auth.uid(), pharmacy_id) AND (branch_id = get_manager_branch_id(auth.uid(), pharmacy_id) OR user_id = auth.uid()));
CREATE POLICY "Managers can update branch staff" ON public.pharmacy_staff FOR UPDATE USING (role = 'staff' AND is_manager_for_pharmacy(auth.uid(), pharmacy_id) AND branch_id = get_manager_branch_id(auth.uid(), pharmacy_id)) WITH CHECK (role = 'staff' AND is_manager_for_pharmacy(auth.uid(), pharmacy_id) AND branch_id = get_manager_branch_id(auth.uid(), pharmacy_id));

-- Staff permissions policies
CREATE POLICY "Staff can view own permissions" ON public.staff_permissions FOR SELECT USING (staff_id IN (SELECT id FROM pharmacy_staff WHERE user_id = auth.uid()));
CREATE POLICY "Owners can manage staff permissions" ON public.staff_permissions FOR ALL USING (staff_id IN (SELECT id FROM pharmacy_staff ps WHERE is_pharmacy_owner(auth.uid(), ps.pharmacy_id)));

-- Medications policies
CREATE POLICY "Staff can view pharmacy medications" ON public.medications FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert pharmacy medications" ON public.medications FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update pharmacy medications" ON public.medications FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can delete pharmacy medications" ON public.medications FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Branch inventory policies
CREATE POLICY "Staff can view branch inventory" ON public.branch_inventory FOR SELECT USING (branch_id IN (SELECT id FROM branches WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))));
CREATE POLICY "Staff can insert branch inventory" ON public.branch_inventory FOR INSERT WITH CHECK (branch_id IN (SELECT id FROM branches WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))));
CREATE POLICY "Staff can update branch inventory" ON public.branch_inventory FOR UPDATE USING (branch_id IN (SELECT id FROM branches WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))));

-- Stock transfers policies
CREATE POLICY "Staff can view pharmacy transfers" ON public.stock_transfers FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert pharmacy transfers" ON public.stock_transfers FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can update pharmacy transfers" ON public.stock_transfers FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Customers policies
CREATE POLICY "Staff can view pharmacy customers" ON public.customers FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert pharmacy customers" ON public.customers FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update pharmacy customers" ON public.customers FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can delete pharmacy customers" ON public.customers FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Doctors policies
CREATE POLICY "Staff can view pharmacy doctors" ON public.doctors FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert pharmacy doctors" ON public.doctors FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update pharmacy doctors" ON public.doctors FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can delete pharmacy doctors" ON public.doctors FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Prescriptions policies
CREATE POLICY "Staff can view pharmacy prescriptions" ON public.prescriptions FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert pharmacy prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update pharmacy prescriptions" ON public.prescriptions FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can delete pharmacy prescriptions" ON public.prescriptions FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Prescription items policies
CREATE POLICY "Staff can view prescription items" ON public.prescription_items FOR SELECT USING (prescription_id IN (SELECT id FROM prescriptions WHERE pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)));
CREATE POLICY "Staff can insert prescription items" ON public.prescription_items FOR INSERT WITH CHECK (prescription_id IN (SELECT id FROM prescriptions WHERE pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)));
CREATE POLICY "Staff can update prescription items" ON public.prescription_items FOR UPDATE USING (prescription_id IN (SELECT id FROM prescriptions WHERE pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true)));
CREATE POLICY "Managers can delete prescription items" ON public.prescription_items FOR DELETE USING (prescription_id IN (SELECT id FROM prescriptions WHERE pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager'))));

-- Prescription fraud alerts policies
CREATE POLICY "Staff can view pharmacy fraud alerts" ON public.prescription_fraud_alerts FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert fraud alerts" ON public.prescription_fraud_alerts FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can update fraud alerts" ON public.prescription_fraud_alerts FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));
CREATE POLICY "Managers can delete fraud alerts" ON public.prescription_fraud_alerts FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Suppliers policies
CREATE POLICY "Staff can view pharmacy suppliers" ON public.suppliers FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert pharmacy suppliers" ON public.suppliers FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update pharmacy suppliers" ON public.suppliers FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can delete pharmacy suppliers" ON public.suppliers FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Supplier products policies
CREATE POLICY "Staff can view supplier products" ON public.supplier_products FOR SELECT USING (supplier_id IN (SELECT id FROM suppliers WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))));
CREATE POLICY "Staff can insert supplier products" ON public.supplier_products FOR INSERT WITH CHECK (supplier_id IN (SELECT id FROM suppliers WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))));
CREATE POLICY "Staff can update supplier products" ON public.supplier_products FOR UPDATE USING (supplier_id IN (SELECT id FROM suppliers WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid()))));
CREATE POLICY "Managers can delete supplier products" ON public.supplier_products FOR DELETE USING (supplier_id IN (SELECT id FROM suppliers WHERE pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager')));

-- Reorder requests policies
CREATE POLICY "Staff can view pharmacy reorders" ON public.reorder_requests FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can create reorders" ON public.reorder_requests FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update reorders" ON public.reorder_requests FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Managers can delete reorders" ON public.reorder_requests FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND has_pharmacy_role(auth.uid(), 'manager'));

-- Shifts policies
CREATE POLICY "Staff can view pharmacy shifts" ON public.shifts FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert own shifts" ON public.shifts FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND user_id = auth.uid());
CREATE POLICY "Staff can update own shifts" ON public.shifts FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())) AND user_id = auth.uid());

-- Sales policies
CREATE POLICY "Staff can view pharmacy sales" ON public.sales FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can create sales" ON public.sales FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Pending transactions policies
CREATE POLICY "Staff can view pharmacy pending transactions" ON public.pending_transactions FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can create pending transactions" ON public.pending_transactions FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update pending transactions" ON public.pending_transactions FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Notifications policies
CREATE POLICY "Staff can view pharmacy notifications" ON public.notifications FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can insert notifications" ON public.notifications FOR INSERT WITH CHECK (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can update notifications" ON public.notifications FOR UPDATE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Staff can delete notifications" ON public.notifications FOR DELETE USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Sent alerts policies
CREATE POLICY "Staff can view pharmacy sent alerts" ON public.sent_alerts FOR SELECT USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "System can insert sent alerts" ON public.sent_alerts FOR INSERT WITH CHECK (true);

-- Audit logs policies
CREATE POLICY "Only managers can view audit logs" ON public.audit_logs FOR SELECT USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true AND role IN ('owner', 'manager')));
CREATE POLICY "Audit logs cannot be updated" ON public.audit_logs FOR UPDATE USING (false);
CREATE POLICY "Audit logs cannot be deleted" ON public.audit_logs FOR DELETE USING (false);

-- Shelving history policies
CREATE POLICY "Staff can view pharmacy shelving history" ON public.shelving_history FOR SELECT USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Staff can insert shelving history" ON public.shelving_history FOR INSERT WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));

-- AI predictions policies
CREATE POLICY "Staff can view pharmacy predictions" ON public.ai_predictions FOR SELECT USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Staff can update predictions" ON public.ai_predictions FOR UPDATE USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "System can insert predictions" ON public.ai_predictions FOR INSERT WITH CHECK (true);

-- Feature requests policies
CREATE POLICY "Staff can view pharmacy feature requests" ON public.feature_requests FOR SELECT USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Staff can create feature requests" ON public.feature_requests FOR INSERT WITH CHECK (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Platform admins can view all feature requests" ON public.feature_requests FOR SELECT USING (is_platform_admin(auth.uid()));
CREATE POLICY "Platform admins can update feature requests" ON public.feature_requests FOR UPDATE USING (is_platform_admin(auth.uid()));

-- Pharmacy custom features policies
CREATE POLICY "Staff can view pharmacy custom features" ON public.pharmacy_custom_features FOR SELECT USING (pharmacy_id IN (SELECT pharmacy_id FROM pharmacy_staff WHERE user_id = auth.uid() AND is_active = true));
CREATE POLICY "Platform admins can manage all custom features" ON public.pharmacy_custom_features FOR ALL USING (is_platform_admin(auth.uid()));

-- Master barcode library policies
CREATE POLICY "Anyone can view master barcode library" ON public.master_barcode_library FOR SELECT USING (true);
CREATE POLICY "Platform admins can manage master barcode library" ON public.master_barcode_library FOR ALL USING (is_platform_admin(auth.uid()));

-- Marketplace views policies
CREATE POLICY "Anyone can insert marketplace views" ON public.marketplace_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Owners can view their pharmacy views" ON public.marketplace_views FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));

-- Marketplace searches policies
CREATE POLICY "Anyone can insert marketplace searches" ON public.marketplace_searches FOR INSERT WITH CHECK (true);
CREATE POLICY "Platform admins can view all searches" ON public.marketplace_searches FOR SELECT USING (check_is_platform_admin(auth.uid()));

-- Referral partners policies
CREATE POLICY "Anyone can view active partners" ON public.referral_partners FOR SELECT USING (is_active = true);
CREATE POLICY "Platform admins can manage referral partners" ON public.referral_partners FOR ALL USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

-- Referral signups policies
CREATE POLICY "Pharmacy owners can view own signup" ON public.referral_signups FOR SELECT USING (pharmacy_id IN (SELECT get_user_pharmacy_ids(auth.uid())));
CREATE POLICY "Platform admins can manage referral signups" ON public.referral_signups FOR ALL USING (is_platform_admin(auth.uid())) WITH CHECK (is_platform_admin(auth.uid()));

-- =====================================================
-- STEP 10: CREATE STORAGE BUCKETS
-- =====================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('pharmacy-logos', 'pharmacy-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('prescriptions', 'prescriptions', false);

-- Storage policies for pharmacy-logos
CREATE POLICY "Anyone can view pharmacy logos" ON storage.objects FOR SELECT USING (bucket_id = 'pharmacy-logos');
CREATE POLICY "Authenticated users can upload pharmacy logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'pharmacy-logos' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update their pharmacy logos" ON storage.objects FOR UPDATE USING (bucket_id = 'pharmacy-logos' AND auth.role() = 'authenticated');

-- Storage policies for prescriptions
CREATE POLICY "Staff can view prescription images" ON storage.objects FOR SELECT USING (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');
CREATE POLICY "Staff can upload prescription images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'prescriptions' AND auth.role() = 'authenticated');

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
