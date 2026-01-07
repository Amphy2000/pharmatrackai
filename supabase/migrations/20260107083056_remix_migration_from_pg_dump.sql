CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_graphql";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA "public";
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "plpgsql";
CREATE EXTENSION IF NOT EXISTS "supabase_vault";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
BEGIN;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--



--
-- Name: pharmacy_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.pharmacy_role AS ENUM (
    'owner',
    'manager',
    'staff'
);


--
-- Name: platform_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.platform_role AS ENUM (
    'super_admin',
    'support'
);


--
-- Name: subscription_plan; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_plan AS ENUM (
    'starter',
    'pro',
    'enterprise'
);


--
-- Name: subscription_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.subscription_status AS ENUM (
    'active',
    'expired',
    'cancelled',
    'trial'
);


--
-- Name: check_and_create_expiry_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_create_expiry_notifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    med RECORD;
    days_until_expiry INTEGER;
    priority_level TEXT;
    existing_notif UUID;
BEGIN
    -- Find medications expiring within 30 days that haven't been notified in 7 days
    FOR med IN 
        SELECT m.*, p.name as pharmacy_name
        FROM medications m
        JOIN pharmacies p ON p.id = m.pharmacy_id
        WHERE m.expiry_date <= CURRENT_DATE + INTERVAL '30 days'
        AND m.current_stock > 0
        AND m.is_shelved = true
        AND (m.last_notified_at IS NULL OR m.last_notified_at < NOW() - INTERVAL '7 days')
    LOOP
        days_until_expiry := m.expiry_date - CURRENT_DATE;
        
        -- Determine priority based on days left
        IF days_until_expiry <= 0 THEN
            priority_level := 'critical';
        ELSIF days_until_expiry <= 7 THEN
            priority_level := 'high';
        ELSIF days_until_expiry <= 14 THEN
            priority_level := 'medium';
        ELSE
            priority_level := 'low';
        END IF;
        
        -- Check if similar notification already exists and is unread
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
            
            -- Update last_notified_at
            UPDATE medications SET last_notified_at = NOW() WHERE id = med.id;
        END IF;
    END LOOP;
END;
$$;


--
-- Name: check_and_create_stock_notifications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_and_create_stock_notifications() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    med RECORD;
    priority_level TEXT;
    existing_notif UUID;
BEGIN
    -- Find medications with low stock that haven't been notified in 7 days
    FOR med IN 
        SELECT m.*, p.name as pharmacy_name
        FROM medications m
        JOIN pharmacies p ON p.id = m.pharmacy_id
        WHERE m.current_stock <= m.reorder_level
        AND m.is_shelved = true
        AND (m.last_notified_at IS NULL OR m.last_notified_at < NOW() - INTERVAL '7 days')
    LOOP
        -- Determine priority
        IF med.current_stock = 0 THEN
            priority_level := 'critical';
        ELSIF med.current_stock <= 5 THEN
            priority_level := 'high';
        ELSE
            priority_level := 'medium';
        END IF;
        
        -- Check if similar notification already exists
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
            
            -- Update last_notified_at
            UPDATE medications SET last_notified_at = NOW() WHERE id = med.id;
        END IF;
    END LOOP;
END;
$$;


--
-- Name: check_is_platform_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_is_platform_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;


--
-- Name: check_is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;


--
-- Name: expire_featured_items(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.expire_featured_items() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  UPDATE public.medications
  SET is_featured = false
  WHERE is_featured = true 
    AND featured_until IS NOT NULL 
    AND featured_until < NOW();
END;
$$;


--
-- Name: generate_internal_barcode(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_internal_barcode() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  RETURN '#' || LPAD(nextval('internal_barcode_seq')::TEXT, 4, '0');
END;
$$;


--
-- Name: generate_receipt_id(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_receipt_id() RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_featured_medications(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_featured_medications() RETURNS TABLE(id uuid, name text, category text, current_stock integer, selling_price numeric, dispensing_unit text, pharmacy_id uuid, pharmacy_name text, pharmacy_phone text, pharmacy_address text, is_featured boolean, featured_until timestamp with time zone, marketplace_contact_phone text, hide_marketplace_prices boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: get_manager_branch_id(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_manager_branch_id(_user_id uuid, _pharmacy_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT branch_id FROM public.pharmacy_staff
  WHERE user_id = _user_id
  AND pharmacy_id = _pharmacy_id
  AND is_active = true
  AND role = 'manager'
  LIMIT 1
$$;


--
-- Name: get_public_medications(text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_public_medications(search_term text DEFAULT NULL::text, location_filter text DEFAULT NULL::text) RETURNS TABLE(id uuid, name text, category text, current_stock integer, selling_price numeric, dispensing_unit text, pharmacy_id uuid, pharmacy_name text, pharmacy_phone text, pharmacy_address text, is_featured boolean, marketplace_contact_phone text, hide_marketplace_prices boolean)
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT 
    m.id,
    m.name,
    m.category,
    m.current_stock,
    -- If pharmacy has hide_marketplace_prices enabled, return NULL for price
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


--
-- Name: get_user_pharmacy_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_pharmacy_id(user_uuid uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT pharmacy_id FROM public.pharmacy_staff 
  WHERE user_id = user_uuid AND is_active = true
  LIMIT 1
$$;


--
-- Name: get_user_pharmacy_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_user_pharmacy_ids(_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT DISTINCT pharmacy_id FROM public.pharmacy_staff
  WHERE user_id = _user_id
  AND is_active = true
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;


--
-- Name: has_pharmacy_role(uuid, public.pharmacy_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_pharmacy_role(user_uuid uuid, required_role public.pharmacy_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = user_uuid 
    AND is_active = true
    AND (role = required_role OR role = 'owner')
  )
$$;


--
-- Name: is_branch_within_limit(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_branch_within_limit(_branch_id uuid, _pharmacy_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: is_manager_for_pharmacy(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_manager_for_pharmacy(_user_id uuid, _pharmacy_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND pharmacy_id = _pharmacy_id
    AND is_active = true
    AND role = 'manager'
  )
$$;


--
-- Name: is_pharmacy_owner(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_pharmacy_owner(check_user_id uuid, check_pharmacy_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacies
    WHERE id = check_pharmacy_id
    AND owner_id = check_user_id
  )
$$;


--
-- Name: is_pharmacy_staff(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_pharmacy_staff(check_user_id uuid, check_pharmacy_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = check_user_id
    AND pharmacy_id = check_pharmacy_id
    AND is_active = true
  )
$$;


--
-- Name: is_platform_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_platform_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id
  )
$$;


--
-- Name: is_super_admin(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_super_admin(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_admins
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;


--
-- Name: search_drug_database(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.search_drug_database(search_term text) RETURNS TABLE(id uuid, product_name text, category text, manufacturer text, similarity_score real)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: staff_assigned_to_branch(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_assigned_to_branch(_user_id uuid, _branch_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND is_active = true
    AND (
      branch_id IS NULL  -- Owners/managers with no branch restriction
      OR branch_id = _branch_id  -- Staff assigned to specific branch
      OR role IN ('owner', 'manager')  -- Owners/managers always have access
    )
  )
$$;


--
-- Name: staff_has_permission(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.staff_has_permission(_user_id uuid, _permission_key text) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  -- Owner and manager always have all permissions
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND is_active = true
    AND role IN ('owner', 'manager')
  )
  OR
  -- Check explicit permission grant for staff
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


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_is_pharmacy_staff(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_is_pharmacy_staff(_user_id uuid, _pharmacy_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.pharmacy_staff
    WHERE user_id = _user_id
    AND pharmacy_id = _pharmacy_id
    AND is_active = true
  )
$$;


SET default_table_access_method = heap;

--
-- Name: ai_predictions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_predictions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    medication_id uuid,
    prediction_type text NOT NULL,
    prediction_data jsonb NOT NULL,
    confidence_score numeric,
    generated_at timestamp with time zone DEFAULT now() NOT NULL,
    valid_until timestamp with time zone,
    is_actioned boolean DEFAULT false
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid,
    user_id uuid,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    details jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: branch_inventory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_inventory (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    medication_id uuid NOT NULL,
    current_stock integer DEFAULT 0 NOT NULL,
    reorder_level integer DEFAULT 10 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    name text NOT NULL,
    address text,
    phone text,
    email text,
    is_main_branch boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    email text,
    date_of_birth date,
    address text,
    notes text,
    loyalty_points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb
);


--
-- Name: doctors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.doctors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    full_name text NOT NULL,
    phone text,
    email text,
    hospital_clinic text,
    specialty text,
    license_number text,
    address text,
    notes text,
    metadata jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: feature_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feature_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    requested_by uuid,
    field_name text NOT NULL,
    field_value text,
    entity_type text NOT NULL,
    entity_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: internal_barcode_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.internal_barcode_seq
    START WITH 1000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internal_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    branch_id uuid,
    medication_id uuid NOT NULL,
    transfer_type text NOT NULL,
    quantity integer NOT NULL,
    performed_by uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT internal_transfers_transfer_type_check CHECK ((transfer_type = ANY (ARRAY['store_to_shelf'::text, 'shelf_to_store'::text])))
);


--
-- Name: marketplace_searches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_searches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    search_query text NOT NULL,
    results_count integer DEFAULT 0,
    location_filter text,
    searched_at timestamp with time zone DEFAULT now(),
    viewer_ip text
);


--
-- Name: marketplace_views; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_views (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    medication_id uuid,
    viewer_ip text,
    viewed_at timestamp with time zone DEFAULT now(),
    search_query text,
    visit_type text DEFAULT 'search'::text
);


--
-- Name: master_barcode_library; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.master_barcode_library (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_name text NOT NULL,
    barcode text NOT NULL,
    category text,
    manufacturer text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    category text NOT NULL,
    batch_number text NOT NULL,
    current_stock integer DEFAULT 0 NOT NULL,
    reorder_level integer DEFAULT 10 NOT NULL,
    expiry_date date NOT NULL,
    unit_price numeric(10,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    pharmacy_id uuid,
    supplier text,
    min_stock_alert integer DEFAULT 10,
    selling_price numeric,
    location text,
    barcode_id text,
    is_shelved boolean DEFAULT true NOT NULL,
    dispensing_unit text DEFAULT 'unit'::text NOT NULL,
    manufacturing_date date,
    is_controlled boolean DEFAULT false NOT NULL,
    nafdac_reg_number text,
    active_ingredients text[],
    metadata jsonb DEFAULT '{}'::jsonb,
    last_notified_at timestamp with time zone,
    is_public boolean DEFAULT false,
    is_featured boolean DEFAULT false,
    featured_until timestamp with time zone,
    shelf_quantity integer DEFAULT 0 NOT NULL,
    store_quantity integer DEFAULT 0 NOT NULL,
    wholesale_price numeric,
    CONSTRAINT medications_category_check CHECK ((category = ANY (ARRAY['Tablet'::text, 'Syrup'::text, 'Capsule'::text, 'Injection'::text, 'Cream'::text, 'Drops'::text, 'Inhaler'::text, 'Powder'::text, 'Other'::text]))),
    CONSTRAINT medications_current_stock_check CHECK ((current_stock >= 0)),
    CONSTRAINT medications_dispensing_unit_check CHECK ((dispensing_unit = ANY (ARRAY['unit'::text, 'pack'::text, 'tab'::text, 'bottle'::text]))),
    CONSTRAINT medications_reorder_level_check CHECK ((reorder_level >= 0)),
    CONSTRAINT medications_unit_price_check CHECK ((unit_price >= (0)::numeric))
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    message text NOT NULL,
    title text NOT NULL,
    type text DEFAULT 'info'::text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    link text,
    metadata jsonb DEFAULT '{}'::jsonb,
    entity_type text,
    entity_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid,
    CONSTRAINT notifications_priority_check CHECK ((priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'critical'::text]))),
    CONSTRAINT notifications_type_check CHECK ((type = ANY (ARRAY['warning'::text, 'info'::text, 'success'::text, 'danger'::text])))
);


--
-- Name: pending_quick_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_quick_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    branch_id uuid,
    name text NOT NULL,
    selling_price numeric NOT NULL,
    quantity_sold integer DEFAULT 1 NOT NULL,
    sold_by uuid,
    sold_by_name text,
    sale_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    linked_medication_id uuid,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pending_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pending_transactions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    short_code text NOT NULL,
    barcode text NOT NULL,
    items jsonb NOT NULL,
    total_amount numeric NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    completed_by uuid,
    completed_at timestamp with time zone,
    payment_method text,
    notes text,
    branch_id uuid,
    CONSTRAINT pending_transactions_payment_method_check CHECK ((payment_method = ANY (ARRAY['cash'::text, 'transfer'::text, 'pos'::text]))),
    CONSTRAINT pending_transactions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: pharmacies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacies (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text,
    address text,
    license_number text,
    owner_id uuid NOT NULL,
    subscription_plan public.subscription_plan DEFAULT 'starter'::public.subscription_plan NOT NULL,
    subscription_status public.subscription_status DEFAULT 'trial'::public.subscription_status NOT NULL,
    subscription_ends_at timestamp with time zone,
    trial_ends_at timestamp with time zone DEFAULT (now() + '7 days'::interval),
    paystack_customer_code text,
    paystack_subscription_code text,
    max_users integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    enable_logo_on_print boolean DEFAULT true,
    pharmacist_in_charge text,
    default_margin_percent numeric DEFAULT 20,
    price_lock_enabled boolean DEFAULT false,
    admin_pin_hash text,
    shop_wifi_name text,
    shop_location_qr text,
    require_wifi_clockin boolean DEFAULT false,
    termii_sender_id text,
    is_gifted boolean DEFAULT false NOT NULL,
    auto_renew boolean DEFAULT true,
    cancellation_reason text,
    cancelled_at timestamp with time zone,
    active_branches_limit integer DEFAULT 1 NOT NULL,
    branch_fee_per_month numeric DEFAULT 15000 NOT NULL,
    alert_recipient_phone text,
    alert_channel text DEFAULT 'sms'::text,
    partner_source text,
    marketplace_contact_phone text,
    marketplace_zone text,
    marketplace_city text,
    marketplace_lat numeric,
    marketplace_lon numeric,
    hide_marketplace_prices boolean DEFAULT false
);


--
-- Name: pharmacy_custom_features; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacy_custom_features (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    feature_key text NOT NULL,
    feature_name text NOT NULL,
    description text,
    is_enabled boolean DEFAULT true NOT NULL,
    config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pharmacy_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pharmacy_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.pharmacy_role DEFAULT 'staff'::public.pharmacy_role NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid
);


--
-- Name: platform_admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.platform_admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.platform_role DEFAULT 'super_admin'::public.platform_role NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescription_fraud_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_fraud_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    prescription_id uuid,
    customer_id uuid,
    alert_type text NOT NULL,
    severity text DEFAULT 'medium'::text NOT NULL,
    description text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    review_notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescription_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescription_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    prescription_id uuid NOT NULL,
    medication_id uuid,
    medication_name text NOT NULL,
    dosage text NOT NULL,
    frequency text NOT NULL,
    duration text,
    quantity integer DEFAULT 1 NOT NULL,
    instructions text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: prescriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prescriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    customer_id uuid NOT NULL,
    prescription_number text NOT NULL,
    prescriber_name text,
    prescriber_phone text,
    diagnosis text,
    notes text,
    issue_date date DEFAULT CURRENT_DATE NOT NULL,
    expiry_date date,
    status text DEFAULT 'active'::text NOT NULL,
    refill_count integer DEFAULT 0,
    max_refills integer DEFAULT 0,
    last_refill_date timestamp with time zone,
    next_refill_reminder date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT prescriptions_status_check CHECK ((status = ANY (ARRAY['active'::text, 'completed'::text, 'expired'::text, 'cancelled'::text])))
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    full_name text,
    avatar_url text,
    phone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: referral_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_partners (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_code text NOT NULL,
    partner_name text NOT NULL,
    partner_type text NOT NULL,
    commission_type text NOT NULL,
    commission_value numeric DEFAULT 0 NOT NULL,
    organization_name text,
    contact_email text,
    contact_phone text,
    total_referrals integer DEFAULT 0 NOT NULL,
    successful_signups integer DEFAULT 0 NOT NULL,
    total_commission_earned numeric DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referral_partners_commission_type_check CHECK ((commission_type = ANY (ARRAY['recurring_percentage'::text, 'one_time_bounty'::text, 'subscription_credit'::text]))),
    CONSTRAINT referral_partners_partner_type_check CHECK ((partner_type = ANY (ARRAY['professional'::text, 'ambassador'::text, 'pharmacy'::text])))
);


--
-- Name: referral_signups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.referral_signups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    partner_id uuid,
    pharmacy_id uuid,
    partner_code text NOT NULL,
    signup_date timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    commission_paid boolean DEFAULT false NOT NULL,
    commission_amount numeric,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT referral_signups_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'verified'::text, 'converted'::text, 'cancelled'::text])))
);


--
-- Name: reorder_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reorder_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    medication_id uuid,
    supplier_product_id uuid,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    total_amount numeric NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_by uuid,
    approved_by uuid,
    notes text,
    expected_delivery date,
    actual_delivery date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sales; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    medication_id uuid NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric NOT NULL,
    total_price numeric NOT NULL,
    sold_by uuid,
    customer_name text,
    sale_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    shift_id uuid,
    receipt_id text,
    sold_by_name text,
    payment_method text,
    prescription_images text[],
    customer_id uuid,
    branch_id uuid,
    sale_type text DEFAULT 'retail'::text,
    CONSTRAINT sales_sale_type_check CHECK ((sale_type = ANY (ARRAY['retail'::text, 'wholesale'::text])))
);


--
-- Name: sent_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sent_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    alert_type text NOT NULL,
    channel text NOT NULL,
    recipient_phone text NOT NULL,
    message text NOT NULL,
    status text DEFAULT 'sent'::text NOT NULL,
    termii_message_id text,
    items_included jsonb DEFAULT '[]'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sent_alerts_channel_check CHECK ((channel = ANY (ARRAY['sms'::text, 'whatsapp'::text]))),
    CONSTRAINT sent_alerts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'sent'::text, 'delivered'::text, 'failed'::text])))
);


--
-- Name: shelving_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shelving_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    medication_id uuid NOT NULL,
    pharmacy_id uuid NOT NULL,
    action text NOT NULL,
    reason text,
    performed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shelving_history_action_check CHECK ((action = ANY (ARRAY['shelved'::text, 'unshelved'::text])))
);


--
-- Name: staff_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    staff_id uuid NOT NULL,
    permission_key text NOT NULL,
    is_granted boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: staff_shifts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.staff_shifts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    clock_in timestamp with time zone DEFAULT now() NOT NULL,
    clock_out timestamp with time zone,
    total_sales numeric DEFAULT 0,
    total_transactions integer DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    clock_in_wifi_name text,
    clock_in_method text DEFAULT 'standard'::text,
    is_wifi_verified boolean DEFAULT false
);


--
-- Name: stock_transfers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_transfers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    from_branch_id uuid NOT NULL,
    to_branch_id uuid NOT NULL,
    medication_id uuid NOT NULL,
    quantity integer NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    requested_by uuid,
    approved_by uuid,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT stock_transfers_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_transit'::text, 'completed'::text, 'cancelled'::text])))
);


--
-- Name: subscription_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.subscription_payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    amount numeric NOT NULL,
    currency text DEFAULT 'NGN'::text NOT NULL,
    paystack_reference text,
    paystack_transaction_id text,
    plan public.subscription_plan NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    payment_date timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    is_gift boolean DEFAULT false NOT NULL
);


--
-- Name: supplier_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supplier_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    supplier_id uuid NOT NULL,
    medication_id uuid,
    product_name text NOT NULL,
    sku text,
    unit_price numeric NOT NULL,
    min_order_quantity integer DEFAULT 1 NOT NULL,
    lead_time_days integer DEFAULT 3,
    is_available boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.suppliers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    name text NOT NULL,
    contact_person text,
    email text,
    phone text,
    address text,
    website text,
    payment_terms text,
    notes text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: symptom_drug_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.symptom_drug_mapping (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    symptom_keywords text[] NOT NULL,
    drug_categories text[] NOT NULL,
    drug_names text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: upsell_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.upsell_analytics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    branch_id uuid,
    staff_id uuid,
    suggested_medication_id uuid NOT NULL,
    cart_medication_ids uuid[] DEFAULT '{}'::uuid[] NOT NULL,
    suggestion_reason text,
    confidence_score numeric,
    was_accepted boolean DEFAULT false NOT NULL,
    sale_id uuid,
    suggested_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: whatsapp_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.whatsapp_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pharmacy_id uuid NOT NULL,
    medication_id uuid NOT NULL,
    medication_name text NOT NULL,
    quantity integer DEFAULT 1,
    clicked_at timestamp with time zone DEFAULT now(),
    viewer_ip text
);


--
-- Name: ai_predictions ai_predictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_predictions
    ADD CONSTRAINT ai_predictions_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: branch_inventory branch_inventory_branch_id_medication_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_inventory
    ADD CONSTRAINT branch_inventory_branch_id_medication_id_key UNIQUE (branch_id, medication_id);


--
-- Name: branch_inventory branch_inventory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_inventory
    ADD CONSTRAINT branch_inventory_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: doctors doctors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pkey PRIMARY KEY (id);


--
-- Name: feature_requests feature_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_pkey PRIMARY KEY (id);


--
-- Name: internal_transfers internal_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_transfers
    ADD CONSTRAINT internal_transfers_pkey PRIMARY KEY (id);


--
-- Name: marketplace_searches marketplace_searches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_searches
    ADD CONSTRAINT marketplace_searches_pkey PRIMARY KEY (id);


--
-- Name: marketplace_views marketplace_views_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_views
    ADD CONSTRAINT marketplace_views_pkey PRIMARY KEY (id);


--
-- Name: master_barcode_library master_barcode_library_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_barcode_library
    ADD CONSTRAINT master_barcode_library_pkey PRIMARY KEY (id);


--
-- Name: medications medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: pending_quick_items pending_quick_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_quick_items
    ADD CONSTRAINT pending_quick_items_pkey PRIMARY KEY (id);


--
-- Name: pending_transactions pending_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transactions
    ADD CONSTRAINT pending_transactions_pkey PRIMARY KEY (id);


--
-- Name: pharmacies pharmacies_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_email_key UNIQUE (email);


--
-- Name: pharmacies pharmacies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_pkey PRIMARY KEY (id);


--
-- Name: pharmacy_custom_features pharmacy_custom_features_pharmacy_id_feature_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_custom_features
    ADD CONSTRAINT pharmacy_custom_features_pharmacy_id_feature_key_key UNIQUE (pharmacy_id, feature_key);


--
-- Name: pharmacy_custom_features pharmacy_custom_features_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_custom_features
    ADD CONSTRAINT pharmacy_custom_features_pkey PRIMARY KEY (id);


--
-- Name: pharmacy_staff pharmacy_staff_pharmacy_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_staff
    ADD CONSTRAINT pharmacy_staff_pharmacy_id_user_id_key UNIQUE (pharmacy_id, user_id);


--
-- Name: pharmacy_staff pharmacy_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_staff
    ADD CONSTRAINT pharmacy_staff_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_pkey PRIMARY KEY (id);


--
-- Name: platform_admins platform_admins_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.platform_admins
    ADD CONSTRAINT platform_admins_user_id_key UNIQUE (user_id);


--
-- Name: prescription_fraud_alerts prescription_fraud_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fraud_alerts
    ADD CONSTRAINT prescription_fraud_alerts_pkey PRIMARY KEY (id);


--
-- Name: prescription_items prescription_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_pkey PRIMARY KEY (id);


--
-- Name: prescriptions prescriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_key UNIQUE (user_id);


--
-- Name: referral_partners referral_partners_partner_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_partner_code_key UNIQUE (partner_code);


--
-- Name: referral_partners referral_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_partners
    ADD CONSTRAINT referral_partners_pkey PRIMARY KEY (id);


--
-- Name: referral_signups referral_signups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_signups
    ADD CONSTRAINT referral_signups_pkey PRIMARY KEY (id);


--
-- Name: reorder_requests reorder_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_requests
    ADD CONSTRAINT reorder_requests_pkey PRIMARY KEY (id);


--
-- Name: sales sales_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pkey PRIMARY KEY (id);


--
-- Name: sales sales_receipt_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_receipt_id_key UNIQUE (receipt_id);


--
-- Name: sent_alerts sent_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_alerts
    ADD CONSTRAINT sent_alerts_pkey PRIMARY KEY (id);


--
-- Name: shelving_history shelving_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelving_history
    ADD CONSTRAINT shelving_history_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_pkey PRIMARY KEY (id);


--
-- Name: staff_permissions staff_permissions_staff_id_permission_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_staff_id_permission_key_key UNIQUE (staff_id, permission_key);


--
-- Name: staff_shifts staff_shifts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_pkey PRIMARY KEY (id);


--
-- Name: stock_transfers stock_transfers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pkey PRIMARY KEY (id);


--
-- Name: subscription_payments subscription_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_pkey PRIMARY KEY (id);


--
-- Name: supplier_products supplier_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT supplier_products_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: symptom_drug_mapping symptom_drug_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.symptom_drug_mapping
    ADD CONSTRAINT symptom_drug_mapping_pkey PRIMARY KEY (id);


--
-- Name: master_barcode_library unique_barcode; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.master_barcode_library
    ADD CONSTRAINT unique_barcode UNIQUE (barcode);


--
-- Name: upsell_analytics upsell_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_analytics
    ADD CONSTRAINT upsell_analytics_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_leads whatsapp_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_leads
    ADD CONSTRAINT whatsapp_leads_pkey PRIMARY KEY (id);


--
-- Name: idx_branch_inventory_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_inventory_branch_id ON public.branch_inventory USING btree (branch_id);


--
-- Name: idx_branch_inventory_medication_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_inventory_medication_id ON public.branch_inventory USING btree (medication_id);


--
-- Name: idx_branches_pharmacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_pharmacy_id ON public.branches USING btree (pharmacy_id);


--
-- Name: idx_customers_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_metadata ON public.customers USING gin (metadata);


--
-- Name: idx_customers_pharmacy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_pharmacy ON public.customers USING btree (pharmacy_id);


--
-- Name: idx_customers_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);


--
-- Name: idx_doctors_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doctors_metadata ON public.doctors USING gin (metadata);


--
-- Name: idx_master_barcode_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_barcode_barcode ON public.master_barcode_library USING btree (barcode);


--
-- Name: idx_master_barcode_product_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_barcode_product_name ON public.master_barcode_library USING gin (to_tsvector('english'::regconfig, product_name));


--
-- Name: idx_master_barcode_product_name_trgm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_master_barcode_product_name_trgm ON public.master_barcode_library USING gin (product_name public.gin_trgm_ops);


--
-- Name: idx_medications_active_ingredients; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_active_ingredients ON public.medications USING gin (active_ingredients);


--
-- Name: idx_medications_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_barcode ON public.medications USING btree (barcode_id);


--
-- Name: idx_medications_featured; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_featured ON public.medications USING btree (is_featured) WHERE (is_featured = true);


--
-- Name: idx_medications_is_controlled; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_is_controlled ON public.medications USING btree (is_controlled) WHERE (is_controlled = true);


--
-- Name: idx_medications_last_notified; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_last_notified ON public.medications USING btree (last_notified_at);


--
-- Name: idx_medications_metadata; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_metadata ON public.medications USING gin (metadata);


--
-- Name: idx_medications_public_stock; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_medications_public_stock ON public.medications USING btree (is_public, current_stock) WHERE ((is_public = true) AND (current_stock > 0));


--
-- Name: idx_notifications_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_branch_id ON public.notifications USING btree (branch_id);


--
-- Name: idx_notifications_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_created_at ON public.notifications USING btree (created_at DESC);


--
-- Name: idx_notifications_pharmacy_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_notifications_pharmacy_unread ON public.notifications USING btree (pharmacy_id, is_read) WHERE (is_read = false);


--
-- Name: idx_pending_transactions_barcode; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_transactions_barcode ON public.pending_transactions USING btree (barcode);


--
-- Name: idx_pending_transactions_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pending_transactions_branch_id ON public.pending_transactions USING btree (branch_id);


--
-- Name: idx_pending_transactions_short_code; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_pending_transactions_short_code ON public.pending_transactions USING btree (pharmacy_id, short_code);


--
-- Name: idx_pharmacy_custom_features_pharmacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pharmacy_custom_features_pharmacy_id ON public.pharmacy_custom_features USING btree (pharmacy_id);


--
-- Name: idx_pharmacy_staff_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pharmacy_staff_branch_id ON public.pharmacy_staff USING btree (branch_id);


--
-- Name: idx_prescription_items_prescription; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescription_items_prescription ON public.prescription_items USING btree (prescription_id);


--
-- Name: idx_prescriptions_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_customer ON public.prescriptions USING btree (customer_id);


--
-- Name: idx_prescriptions_pharmacy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_pharmacy ON public.prescriptions USING btree (pharmacy_id);


--
-- Name: idx_prescriptions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prescriptions_status ON public.prescriptions USING btree (status);


--
-- Name: idx_reorder_requests_pharmacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reorder_requests_pharmacy_id ON public.reorder_requests USING btree (pharmacy_id);


--
-- Name: idx_reorder_requests_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reorder_requests_status ON public.reorder_requests USING btree (status);


--
-- Name: idx_reorder_requests_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reorder_requests_supplier_id ON public.reorder_requests USING btree (supplier_id);


--
-- Name: idx_sales_branch_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_branch_id ON public.sales USING btree (branch_id);


--
-- Name: idx_sales_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_customer_id ON public.sales USING btree (customer_id);


--
-- Name: idx_sales_receipt_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_receipt_id ON public.sales USING btree (receipt_id);


--
-- Name: idx_sales_shift_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_shift_id ON public.sales USING btree (shift_id);


--
-- Name: idx_sent_alerts_pharmacy; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sent_alerts_pharmacy ON public.sent_alerts USING btree (pharmacy_id, created_at DESC);


--
-- Name: idx_staff_shifts_clock_in; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_shifts_clock_in ON public.staff_shifts USING btree (clock_in);


--
-- Name: idx_staff_shifts_pharmacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_shifts_pharmacy_id ON public.staff_shifts USING btree (pharmacy_id);


--
-- Name: idx_staff_shifts_staff_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_staff_shifts_staff_id ON public.staff_shifts USING btree (staff_id);


--
-- Name: idx_stock_transfers_pharmacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_transfers_pharmacy_id ON public.stock_transfers USING btree (pharmacy_id);


--
-- Name: idx_stock_transfers_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stock_transfers_status ON public.stock_transfers USING btree (status);


--
-- Name: idx_supplier_products_medication_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_products_medication_id ON public.supplier_products USING btree (medication_id);


--
-- Name: idx_supplier_products_supplier_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_supplier_products_supplier_id ON public.supplier_products USING btree (supplier_id);


--
-- Name: idx_suppliers_pharmacy_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_suppliers_pharmacy_id ON public.suppliers USING btree (pharmacy_id);


--
-- Name: idx_upsell_analytics_medication; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upsell_analytics_medication ON public.upsell_analytics USING btree (suggested_medication_id);


--
-- Name: idx_upsell_analytics_pharmacy_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_upsell_analytics_pharmacy_date ON public.upsell_analytics USING btree (pharmacy_id, suggested_at DESC);


--
-- Name: branch_inventory update_branch_inventory_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_branch_inventory_updated_at BEFORE UPDATE ON public.branch_inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: branches update_branches_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_branches_updated_at BEFORE UPDATE ON public.branches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: doctors update_doctors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON public.doctors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: feature_requests update_feature_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_feature_requests_updated_at BEFORE UPDATE ON public.feature_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: master_barcode_library update_master_barcode_library_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_master_barcode_library_updated_at BEFORE UPDATE ON public.master_barcode_library FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: medications update_medications_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON public.medications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pending_quick_items update_pending_quick_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pending_quick_items_updated_at BEFORE UPDATE ON public.pending_quick_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pharmacies update_pharmacies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pharmacies_updated_at BEFORE UPDATE ON public.pharmacies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pharmacy_custom_features update_pharmacy_custom_features_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pharmacy_custom_features_updated_at BEFORE UPDATE ON public.pharmacy_custom_features FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pharmacy_staff update_pharmacy_staff_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_pharmacy_staff_updated_at BEFORE UPDATE ON public.pharmacy_staff FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: platform_admins update_platform_admins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_platform_admins_updated_at BEFORE UPDATE ON public.platform_admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prescription_fraud_alerts update_prescription_fraud_alerts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prescription_fraud_alerts_updated_at BEFORE UPDATE ON public.prescription_fraud_alerts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: prescriptions update_prescriptions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: referral_partners update_referral_partners_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_referral_partners_updated_at BEFORE UPDATE ON public.referral_partners FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reorder_requests update_reorder_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reorder_requests_updated_at BEFORE UPDATE ON public.reorder_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_permissions update_staff_permissions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_permissions_updated_at BEFORE UPDATE ON public.staff_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: staff_shifts update_staff_shifts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_staff_shifts_updated_at BEFORE UPDATE ON public.staff_shifts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: stock_transfers update_stock_transfers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_stock_transfers_updated_at BEFORE UPDATE ON public.stock_transfers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: supplier_products update_supplier_products_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_supplier_products_updated_at BEFORE UPDATE ON public.supplier_products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: suppliers update_suppliers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_predictions ai_predictions_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_predictions
    ADD CONSTRAINT ai_predictions_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: ai_predictions ai_predictions_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_predictions
    ADD CONSTRAINT ai_predictions_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: branch_inventory branch_inventory_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_inventory
    ADD CONSTRAINT branch_inventory_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: branch_inventory branch_inventory_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_inventory
    ADD CONSTRAINT branch_inventory_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: branches branches_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: customers customers_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: doctors doctors_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.doctors
    ADD CONSTRAINT doctors_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: feature_requests feature_requests_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: feature_requests feature_requests_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feature_requests
    ADD CONSTRAINT feature_requests_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: internal_transfers internal_transfers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_transfers
    ADD CONSTRAINT internal_transfers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: internal_transfers internal_transfers_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_transfers
    ADD CONSTRAINT internal_transfers_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id);


--
-- Name: internal_transfers internal_transfers_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_transfers
    ADD CONSTRAINT internal_transfers_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id);


--
-- Name: marketplace_views marketplace_views_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_views
    ADD CONSTRAINT marketplace_views_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL;


--
-- Name: marketplace_views marketplace_views_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_views
    ADD CONSTRAINT marketplace_views_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: medications medications_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medications
    ADD CONSTRAINT medications_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: notifications notifications_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: pending_quick_items pending_quick_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_quick_items
    ADD CONSTRAINT pending_quick_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: pending_quick_items pending_quick_items_linked_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_quick_items
    ADD CONSTRAINT pending_quick_items_linked_medication_id_fkey FOREIGN KEY (linked_medication_id) REFERENCES public.medications(id);


--
-- Name: pending_quick_items pending_quick_items_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_quick_items
    ADD CONSTRAINT pending_quick_items_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id);


--
-- Name: pending_transactions pending_transactions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transactions
    ADD CONSTRAINT pending_transactions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: pending_transactions pending_transactions_completed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transactions
    ADD CONSTRAINT pending_transactions_completed_by_fkey FOREIGN KEY (completed_by) REFERENCES auth.users(id);


--
-- Name: pending_transactions pending_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transactions
    ADD CONSTRAINT pending_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: pending_transactions pending_transactions_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pending_transactions
    ADD CONSTRAINT pending_transactions_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: pharmacies pharmacies_owner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacies
    ADD CONSTRAINT pharmacies_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: pharmacy_custom_features pharmacy_custom_features_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_custom_features
    ADD CONSTRAINT pharmacy_custom_features_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: pharmacy_staff pharmacy_staff_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_staff
    ADD CONSTRAINT pharmacy_staff_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: pharmacy_staff pharmacy_staff_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_staff
    ADD CONSTRAINT pharmacy_staff_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: pharmacy_staff pharmacy_staff_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pharmacy_staff
    ADD CONSTRAINT pharmacy_staff_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: prescription_fraud_alerts prescription_fraud_alerts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fraud_alerts
    ADD CONSTRAINT prescription_fraud_alerts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE SET NULL;


--
-- Name: prescription_fraud_alerts prescription_fraud_alerts_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fraud_alerts
    ADD CONSTRAINT prescription_fraud_alerts_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: prescription_fraud_alerts prescription_fraud_alerts_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_fraud_alerts
    ADD CONSTRAINT prescription_fraud_alerts_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE SET NULL;


--
-- Name: prescription_items prescription_items_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL;


--
-- Name: prescription_items prescription_items_prescription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescription_items
    ADD CONSTRAINT prescription_items_prescription_id_fkey FOREIGN KEY (prescription_id) REFERENCES public.prescriptions(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: prescriptions prescriptions_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prescriptions
    ADD CONSTRAINT prescriptions_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: referral_signups referral_signups_partner_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_signups
    ADD CONSTRAINT referral_signups_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.referral_partners(id) ON DELETE SET NULL;


--
-- Name: referral_signups referral_signups_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.referral_signups
    ADD CONSTRAINT referral_signups_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: reorder_requests reorder_requests_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_requests
    ADD CONSTRAINT reorder_requests_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL;


--
-- Name: reorder_requests reorder_requests_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_requests
    ADD CONSTRAINT reorder_requests_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: reorder_requests reorder_requests_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_requests
    ADD CONSTRAINT reorder_requests_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: reorder_requests reorder_requests_supplier_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reorder_requests
    ADD CONSTRAINT reorder_requests_supplier_product_id_fkey FOREIGN KEY (supplier_product_id) REFERENCES public.supplier_products(id) ON DELETE SET NULL;


--
-- Name: sales sales_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id);


--
-- Name: sales sales_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: sales sales_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: sales sales_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: sales sales_shift_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_shift_id_fkey FOREIGN KEY (shift_id) REFERENCES public.staff_shifts(id);


--
-- Name: sales sales_sold_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales
    ADD CONSTRAINT sales_sold_by_fkey FOREIGN KEY (sold_by) REFERENCES auth.users(id);


--
-- Name: sent_alerts sent_alerts_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sent_alerts
    ADD CONSTRAINT sent_alerts_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: shelving_history shelving_history_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelving_history
    ADD CONSTRAINT shelving_history_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: shelving_history shelving_history_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shelving_history
    ADD CONSTRAINT shelving_history_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: staff_permissions staff_permissions_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_permissions
    ADD CONSTRAINT staff_permissions_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.pharmacy_staff(id) ON DELETE CASCADE;


--
-- Name: staff_shifts staff_shifts_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: staff_shifts staff_shifts_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.staff_shifts
    ADD CONSTRAINT staff_shifts_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.pharmacy_staff(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: stock_transfers stock_transfers_from_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_from_branch_id_fkey FOREIGN KEY (from_branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: stock_transfers stock_transfers_requested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES auth.users(id);


--
-- Name: stock_transfers stock_transfers_to_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_transfers
    ADD CONSTRAINT stock_transfers_to_branch_id_fkey FOREIGN KEY (to_branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: subscription_payments subscription_payments_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.subscription_payments
    ADD CONSTRAINT subscription_payments_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: supplier_products supplier_products_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT supplier_products_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE SET NULL;


--
-- Name: supplier_products supplier_products_supplier_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supplier_products
    ADD CONSTRAINT supplier_products_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE CASCADE;


--
-- Name: suppliers suppliers_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: upsell_analytics upsell_analytics_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_analytics
    ADD CONSTRAINT upsell_analytics_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: upsell_analytics upsell_analytics_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_analytics
    ADD CONSTRAINT upsell_analytics_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: upsell_analytics upsell_analytics_sale_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_analytics
    ADD CONSTRAINT upsell_analytics_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES public.sales(id) ON DELETE SET NULL;


--
-- Name: upsell_analytics upsell_analytics_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_analytics
    ADD CONSTRAINT upsell_analytics_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES public.pharmacy_staff(id) ON DELETE SET NULL;


--
-- Name: upsell_analytics upsell_analytics_suggested_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.upsell_analytics
    ADD CONSTRAINT upsell_analytics_suggested_medication_id_fkey FOREIGN KEY (suggested_medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: whatsapp_leads whatsapp_leads_medication_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_leads
    ADD CONSTRAINT whatsapp_leads_medication_id_fkey FOREIGN KEY (medication_id) REFERENCES public.medications(id) ON DELETE CASCADE;


--
-- Name: whatsapp_leads whatsapp_leads_pharmacy_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.whatsapp_leads
    ADD CONSTRAINT whatsapp_leads_pharmacy_id_fkey FOREIGN KEY (pharmacy_id) REFERENCES public.pharmacies(id) ON DELETE CASCADE;


--
-- Name: marketplace_searches Anyone can insert marketplace searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert marketplace searches" ON public.marketplace_searches FOR INSERT WITH CHECK (true);


--
-- Name: marketplace_views Anyone can insert marketplace views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert marketplace views" ON public.marketplace_views FOR INSERT WITH CHECK (true);


--
-- Name: whatsapp_leads Anyone can insert whatsapp leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can insert whatsapp leads" ON public.whatsapp_leads FOR INSERT WITH CHECK (true);


--
-- Name: referral_partners Anyone can view active partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view active partners" ON public.referral_partners FOR SELECT USING ((is_active = true));


--
-- Name: master_barcode_library Anyone can view master barcode library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view master barcode library" ON public.master_barcode_library FOR SELECT USING (true);


--
-- Name: symptom_drug_mapping Anyone can view symptom mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can view symptom mappings" ON public.symptom_drug_mapping FOR SELECT USING (true);


--
-- Name: audit_logs Audit logs cannot be deleted; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Audit logs cannot be deleted" ON public.audit_logs FOR DELETE USING (false);


--
-- Name: audit_logs Audit logs cannot be updated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Audit logs cannot be updated" ON public.audit_logs FOR UPDATE USING (false);


--
-- Name: branches Managers can delete branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete branches" ON public.branches FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: prescription_fraud_alerts Managers can delete fraud alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete fraud alerts" ON public.prescription_fraud_alerts FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: customers Managers can delete pharmacy customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete pharmacy customers" ON public.customers FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: doctors Managers can delete pharmacy doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete pharmacy doctors" ON public.doctors FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: medications Managers can delete pharmacy medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete pharmacy medications" ON public.medications FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: prescriptions Managers can delete pharmacy prescriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete pharmacy prescriptions" ON public.prescriptions FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: suppliers Managers can delete pharmacy suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete pharmacy suppliers" ON public.suppliers FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: prescription_items Managers can delete prescription items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete prescription items" ON public.prescription_items FOR DELETE USING ((prescription_id IN ( SELECT prescriptions.id
   FROM public.prescriptions
  WHERE (prescriptions.pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
           FROM public.pharmacy_staff
          WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true) AND (pharmacy_staff.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))))));


--
-- Name: pending_quick_items Managers can delete quick items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete quick items" ON public.pending_quick_items FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: reorder_requests Managers can delete reorders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete reorders" ON public.reorder_requests FOR DELETE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: supplier_products Managers can delete supplier products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete supplier products" ON public.supplier_products FOR DELETE USING ((supplier_id IN ( SELECT s.id
   FROM (public.suppliers s
     JOIN public.pharmacy_staff ps ON ((ps.pharmacy_id = s.pharmacy_id)))
  WHERE ((ps.user_id = auth.uid()) AND (ps.is_active = true) AND (ps.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))));


--
-- Name: suppliers Managers can delete suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can delete suppliers" ON public.suppliers FOR DELETE USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true) AND (pharmacy_staff.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))));


--
-- Name: branches Managers can insert branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can insert branches" ON public.branches FOR INSERT WITH CHECK (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: supplier_products Managers can insert supplier products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can insert supplier products" ON public.supplier_products FOR INSERT WITH CHECK ((supplier_id IN ( SELECT s.id
   FROM (public.suppliers s
     JOIN public.pharmacy_staff ps ON ((ps.pharmacy_id = s.pharmacy_id)))
  WHERE ((ps.user_id = auth.uid()) AND (ps.is_active = true) AND (ps.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))));


--
-- Name: suppliers Managers can insert suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can insert suppliers" ON public.suppliers FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true) AND (pharmacy_staff.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))));


--
-- Name: pharmacy_staff Managers can update branch staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update branch staff" ON public.pharmacy_staff FOR UPDATE USING (((role = 'staff'::public.pharmacy_role) AND public.is_manager_for_pharmacy(auth.uid(), pharmacy_id) AND (branch_id = public.get_manager_branch_id(auth.uid(), pharmacy_id)))) WITH CHECK (((role = 'staff'::public.pharmacy_role) AND public.is_manager_for_pharmacy(auth.uid(), pharmacy_id) AND (branch_id = public.get_manager_branch_id(auth.uid(), pharmacy_id))));


--
-- Name: branches Managers can update branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update branches" ON public.branches FOR UPDATE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: prescription_fraud_alerts Managers can update fraud alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update fraud alerts" ON public.prescription_fraud_alerts FOR UPDATE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: pending_quick_items Managers can update quick items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update quick items" ON public.pending_quick_items FOR UPDATE USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: supplier_products Managers can update supplier products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update supplier products" ON public.supplier_products FOR UPDATE USING ((supplier_id IN ( SELECT s.id
   FROM (public.suppliers s
     JOIN public.pharmacy_staff ps ON ((ps.pharmacy_id = s.pharmacy_id)))
  WHERE ((ps.user_id = auth.uid()) AND (ps.is_active = true) AND (ps.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))));


--
-- Name: suppliers Managers can update suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can update suppliers" ON public.suppliers FOR UPDATE USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true) AND (pharmacy_staff.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))));


--
-- Name: staff_shifts Managers can view all shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view all shifts" ON public.staff_shifts FOR SELECT USING (((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)) AND public.has_pharmacy_role(auth.uid(), 'manager'::public.pharmacy_role)));


--
-- Name: pharmacy_staff Managers can view branch staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can view branch staff" ON public.pharmacy_staff FOR SELECT USING ((public.is_manager_for_pharmacy(auth.uid(), pharmacy_id) AND ((branch_id = public.get_manager_branch_id(auth.uid(), pharmacy_id)) OR (user_id = auth.uid()))));


--
-- Name: audit_logs Only managers can view audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Only managers can view audit logs" ON public.audit_logs FOR SELECT USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true) AND (pharmacy_staff.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))));


--
-- Name: staff_permissions Owners and managers can manage permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners and managers can manage permissions" ON public.staff_permissions USING ((staff_id IN ( SELECT ps.id
   FROM public.pharmacy_staff ps
  WHERE (ps.pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
           FROM public.pharmacy_staff
          WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true) AND (pharmacy_staff.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role])))))))) WITH CHECK ((staff_id IN ( SELECT ps.id
   FROM public.pharmacy_staff ps
  WHERE (ps.pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
           FROM public.pharmacy_staff
          WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true) AND (pharmacy_staff.role = ANY (ARRAY['owner'::public.pharmacy_role, 'manager'::public.pharmacy_role]))))))));


--
-- Name: pharmacy_staff Owners can manage pharmacy staff; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can manage pharmacy staff" ON public.pharmacy_staff USING (public.is_pharmacy_owner(auth.uid(), pharmacy_id)) WITH CHECK (public.is_pharmacy_owner(auth.uid(), pharmacy_id));


--
-- Name: subscription_payments Owners can view payments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view payments" ON public.subscription_payments FOR SELECT USING ((pharmacy_id IN ( SELECT pharmacies.id
   FROM public.pharmacies
  WHERE (pharmacies.owner_id = auth.uid()))));


--
-- Name: whatsapp_leads Owners can view their pharmacy leads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view their pharmacy leads" ON public.whatsapp_leads FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: marketplace_views Owners can view their pharmacy views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can view their pharmacy views" ON public.marketplace_views FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: referral_signups Pharmacy owners can view own signup; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Pharmacy owners can view own signup" ON public.referral_signups FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: profiles Pharmacy staff can view colleague profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Pharmacy staff can view colleague profiles" ON public.profiles FOR SELECT USING ((user_id IN ( SELECT ps.user_id
   FROM public.pharmacy_staff ps
  WHERE (ps.pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
           FROM public.pharmacy_staff
          WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))))));


--
-- Name: pharmacies Platform admins can delete pharmacies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can delete pharmacies" ON public.pharmacies FOR DELETE USING (public.is_platform_admin(auth.uid()));


--
-- Name: pharmacy_custom_features Platform admins can manage all custom features; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage all custom features" ON public.pharmacy_custom_features USING (public.is_platform_admin(auth.uid()));


--
-- Name: master_barcode_library Platform admins can manage master barcode library; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage master barcode library" ON public.master_barcode_library USING (public.is_platform_admin(auth.uid()));


--
-- Name: referral_partners Platform admins can manage referral partners; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage referral partners" ON public.referral_partners USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));


--
-- Name: referral_signups Platform admins can manage referral signups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage referral signups" ON public.referral_signups USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));


--
-- Name: symptom_drug_mapping Platform admins can manage symptom mappings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can manage symptom mappings" ON public.symptom_drug_mapping USING (public.is_platform_admin(auth.uid()));


--
-- Name: pharmacies Platform admins can update all pharmacies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can update all pharmacies" ON public.pharmacies FOR UPDATE USING (public.is_platform_admin(auth.uid()));


--
-- Name: feature_requests Platform admins can update feature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can update feature requests" ON public.feature_requests FOR UPDATE USING (public.is_platform_admin(auth.uid()));


--
-- Name: feature_requests Platform admins can view all feature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view all feature requests" ON public.feature_requests FOR SELECT USING (public.is_platform_admin(auth.uid()));


--
-- Name: pharmacies Platform admins can view all pharmacies; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view all pharmacies" ON public.pharmacies FOR SELECT USING (public.is_platform_admin(auth.uid()));


--
-- Name: profiles Platform admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_platform_admin(auth.uid()));


--
-- Name: marketplace_searches Platform admins can view all searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Platform admins can view all searches" ON public.marketplace_searches FOR SELECT USING (public.check_is_platform_admin(auth.uid()));


--
-- Name: staff_shifts Staff can clock in; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can clock in" ON public.staff_shifts FOR INSERT WITH CHECK ((staff_id IN ( SELECT pharmacy_staff.id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: feature_requests Staff can create feature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create feature requests" ON public.feature_requests FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: internal_transfers Staff can create internal transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create internal transfers" ON public.internal_transfers FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: pending_transactions Staff can create pending transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create pending transactions" ON public.pending_transactions FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: reorder_requests Staff can create reorders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create reorders" ON public.reorder_requests FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: sales Staff can create sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create sales" ON public.sales FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: stock_transfers Staff can create transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can create transfers" ON public.stock_transfers FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: notifications Staff can delete notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can delete notifications" ON public.notifications FOR DELETE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: branch_inventory Staff can insert branch inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert branch inventory" ON public.branch_inventory FOR INSERT WITH CHECK ((branch_id IN ( SELECT branches.id
   FROM public.branches
  WHERE (branches.pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)))));


--
-- Name: prescription_fraud_alerts Staff can insert fraud alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert fraud alerts" ON public.prescription_fraud_alerts FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: notifications Staff can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert notifications" ON public.notifications FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: customers Staff can insert pharmacy customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert pharmacy customers" ON public.customers FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: doctors Staff can insert pharmacy doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert pharmacy doctors" ON public.doctors FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: medications Staff can insert pharmacy medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert pharmacy medications" ON public.medications FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: prescriptions Staff can insert pharmacy prescriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert pharmacy prescriptions" ON public.prescriptions FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: suppliers Staff can insert pharmacy suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert pharmacy suppliers" ON public.suppliers FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: prescription_items Staff can insert prescription items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert prescription items" ON public.prescription_items FOR INSERT WITH CHECK ((prescription_id IN ( SELECT prescriptions.id
   FROM public.prescriptions
  WHERE (prescriptions.pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
           FROM public.pharmacy_staff
          WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))))));


--
-- Name: pending_quick_items Staff can insert quick items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert quick items" ON public.pending_quick_items FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: shelving_history Staff can insert shelving history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert shelving history" ON public.shelving_history FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: upsell_analytics Staff can insert upsell analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert upsell analytics" ON public.upsell_analytics FOR INSERT WITH CHECK ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: branch_inventory Staff can update branch inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update branch inventory" ON public.branch_inventory FOR UPDATE USING ((branch_id IN ( SELECT branches.id
   FROM public.branches
  WHERE (branches.pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)))));


--
-- Name: notifications Staff can update notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update notifications" ON public.notifications FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: staff_shifts Staff can update own shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update own shifts" ON public.staff_shifts FOR UPDATE USING ((staff_id IN ( SELECT pharmacy_staff.id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: pending_transactions Staff can update pending transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update pending transactions" ON public.pending_transactions FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: customers Staff can update pharmacy customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update pharmacy customers" ON public.customers FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: doctors Staff can update pharmacy doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update pharmacy doctors" ON public.doctors FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: medications Staff can update pharmacy medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update pharmacy medications" ON public.medications FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: prescriptions Staff can update pharmacy prescriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update pharmacy prescriptions" ON public.prescriptions FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: suppliers Staff can update pharmacy suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update pharmacy suppliers" ON public.suppliers FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: ai_predictions Staff can update predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update predictions" ON public.ai_predictions FOR UPDATE USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: prescription_items Staff can update prescription items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update prescription items" ON public.prescription_items FOR UPDATE USING ((prescription_id IN ( SELECT prescriptions.id
   FROM public.prescriptions
  WHERE (prescriptions.pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
           FROM public.pharmacy_staff
          WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))))));


--
-- Name: reorder_requests Staff can update reorders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update reorders" ON public.reorder_requests FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: stock_transfers Staff can update transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update transfers" ON public.stock_transfers FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: upsell_analytics Staff can update upsell analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can update upsell analytics" ON public.upsell_analytics FOR UPDATE USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: branch_inventory Staff can view branch inventory; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view branch inventory" ON public.branch_inventory FOR SELECT USING ((branch_id IN ( SELECT branches.id
   FROM public.branches
  WHERE (branches.pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)))));


--
-- Name: staff_permissions Staff can view own permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own permissions" ON public.staff_permissions FOR SELECT USING ((staff_id IN ( SELECT pharmacy_staff.id
   FROM public.pharmacy_staff
  WHERE (pharmacy_staff.user_id = auth.uid()))));


--
-- Name: staff_shifts Staff can view own shifts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view own shifts" ON public.staff_shifts FOR SELECT USING ((staff_id IN ( SELECT pharmacy_staff.id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: branches Staff can view pharmacy branches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy branches" ON public.branches FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: pharmacy_custom_features Staff can view pharmacy custom features; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy custom features" ON public.pharmacy_custom_features FOR SELECT USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: customers Staff can view pharmacy customers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy customers" ON public.customers FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: doctors Staff can view pharmacy doctors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy doctors" ON public.doctors FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: feature_requests Staff can view pharmacy feature requests; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy feature requests" ON public.feature_requests FOR SELECT USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: prescription_fraud_alerts Staff can view pharmacy fraud alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy fraud alerts" ON public.prescription_fraud_alerts FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: internal_transfers Staff can view pharmacy internal transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy internal transfers" ON public.internal_transfers FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: medications Staff can view pharmacy medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy medications" ON public.medications FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: notifications Staff can view pharmacy notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy notifications" ON public.notifications FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: pending_transactions Staff can view pharmacy pending transactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy pending transactions" ON public.pending_transactions FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: ai_predictions Staff can view pharmacy predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy predictions" ON public.ai_predictions FOR SELECT USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: prescriptions Staff can view pharmacy prescriptions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy prescriptions" ON public.prescriptions FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: pending_quick_items Staff can view pharmacy quick items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy quick items" ON public.pending_quick_items FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: reorder_requests Staff can view pharmacy reorders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy reorders" ON public.reorder_requests FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: sales Staff can view pharmacy sales; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy sales" ON public.sales FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: sent_alerts Staff can view pharmacy sent alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy sent alerts" ON public.sent_alerts FOR SELECT USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: shelving_history Staff can view pharmacy shelving history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy shelving history" ON public.shelving_history FOR SELECT USING ((pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
   FROM public.pharmacy_staff
  WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))));


--
-- Name: suppliers Staff can view pharmacy suppliers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy suppliers" ON public.suppliers FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: stock_transfers Staff can view pharmacy transfers; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy transfers" ON public.stock_transfers FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: upsell_analytics Staff can view pharmacy upsell analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view pharmacy upsell analytics" ON public.upsell_analytics FOR SELECT USING ((pharmacy_id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: prescription_items Staff can view prescription items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view prescription items" ON public.prescription_items FOR SELECT USING ((prescription_id IN ( SELECT prescriptions.id
   FROM public.prescriptions
  WHERE (prescriptions.pharmacy_id IN ( SELECT pharmacy_staff.pharmacy_id
           FROM public.pharmacy_staff
          WHERE ((pharmacy_staff.user_id = auth.uid()) AND (pharmacy_staff.is_active = true)))))));


--
-- Name: supplier_products Staff can view supplier products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can view supplier products" ON public.supplier_products FOR SELECT USING ((supplier_id IN ( SELECT s.id
   FROM (public.suppliers s
     JOIN public.pharmacy_staff ps ON ((ps.pharmacy_id = s.pharmacy_id)))
  WHERE ((ps.user_id = auth.uid()) AND (ps.is_active = true)))));


--
-- Name: platform_admins Super admins can manage admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can manage admins" ON public.platform_admins USING (public.check_is_super_admin(auth.uid())) WITH CHECK (public.check_is_super_admin(auth.uid()));


--
-- Name: platform_admins Super admins can view all admins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins can view all admins" ON public.platform_admins FOR SELECT USING (public.check_is_platform_admin(auth.uid()));


--
-- Name: ai_predictions System can insert predictions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert predictions" ON public.ai_predictions FOR INSERT WITH CHECK (true);


--
-- Name: sent_alerts System can insert sent alerts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert sent alerts" ON public.sent_alerts FOR INSERT WITH CHECK (true);


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: pharmacy_staff Users can insert own staff record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own staff record" ON public.pharmacy_staff FOR INSERT WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: pharmacy_staff Users can view own staff record; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own staff record" ON public.pharmacy_staff FOR SELECT USING ((user_id = auth.uid()));


--
-- Name: ai_predictions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_predictions ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: branch_inventory; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branch_inventory ENABLE ROW LEVEL SECURITY;

--
-- Name: branches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;

--
-- Name: customers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

--
-- Name: doctors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;

--
-- Name: feature_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feature_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: internal_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.internal_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_searches; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_searches ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_views; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_views ENABLE ROW LEVEL SECURITY;

--
-- Name: master_barcode_library; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.master_barcode_library ENABLE ROW LEVEL SECURITY;

--
-- Name: medications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

--
-- Name: notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_quick_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_quick_items ENABLE ROW LEVEL SECURITY;

--
-- Name: pending_transactions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pending_transactions ENABLE ROW LEVEL SECURITY;

--
-- Name: pharmacies; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pharmacies ENABLE ROW LEVEL SECURITY;

--
-- Name: pharmacy_custom_features; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pharmacy_custom_features ENABLE ROW LEVEL SECURITY;

--
-- Name: pharmacies pharmacy_insert_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pharmacy_insert_policy ON public.pharmacies FOR INSERT TO authenticated WITH CHECK ((owner_id = auth.uid()));


--
-- Name: pharmacies pharmacy_owner_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pharmacy_owner_select_policy ON public.pharmacies FOR SELECT TO authenticated USING ((owner_id = auth.uid()));


--
-- Name: pharmacies pharmacy_owner_update_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pharmacy_owner_update_policy ON public.pharmacies FOR UPDATE TO authenticated USING ((owner_id = auth.uid())) WITH CHECK ((owner_id = auth.uid()));


--
-- Name: pharmacy_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pharmacy_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: pharmacies pharmacy_staff_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pharmacy_staff_select_policy ON public.pharmacies FOR SELECT USING ((id IN ( SELECT public.get_user_pharmacy_ids(auth.uid()) AS get_user_pharmacy_ids)));


--
-- Name: platform_admins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_fraud_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_fraud_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: prescription_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;

--
-- Name: prescriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_partners; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_partners ENABLE ROW LEVEL SECURITY;

--
-- Name: referral_signups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

--
-- Name: reorder_requests; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reorder_requests ENABLE ROW LEVEL SECURITY;

--
-- Name: sales; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

--
-- Name: sent_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sent_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: shelving_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shelving_history ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: staff_shifts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

--
-- Name: stock_transfers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stock_transfers ENABLE ROW LEVEL SECURITY;

--
-- Name: subscription_payments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

--
-- Name: supplier_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.supplier_products ENABLE ROW LEVEL SECURITY;

--
-- Name: suppliers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

--
-- Name: symptom_drug_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.symptom_drug_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: upsell_analytics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.upsell_analytics ENABLE ROW LEVEL SECURITY;

--
-- Name: whatsapp_leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.whatsapp_leads ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--




COMMIT;