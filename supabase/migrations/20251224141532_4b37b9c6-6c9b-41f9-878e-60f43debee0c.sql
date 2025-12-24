-- Create notifications table for bell icon and in-app alerts
CREATE TABLE public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('warning', 'info', 'success', 'danger')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    is_read BOOLEAN NOT NULL DEFAULT false,
    link TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    entity_type TEXT, -- 'medication', 'invoice_scan', 'shift', etc.
    entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sent_alerts table for logging automated Termii messages
CREATE TABLE public.sent_alerts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    pharmacy_id UUID NOT NULL REFERENCES public.pharmacies(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL, -- 'expiry', 'low_stock', 'daily_digest'
    channel TEXT NOT NULL CHECK (channel IN ('sms', 'whatsapp')),
    recipient_phone TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('pending', 'sent', 'delivered', 'failed')),
    termii_message_id TEXT,
    items_included JSONB DEFAULT '[]'::jsonb, -- Array of medication IDs included
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add last_notified_at to medications for frequency capping
ALTER TABLE public.medications 
ADD COLUMN IF NOT EXISTS last_notified_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS on both tables
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sent_alerts ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Staff can view pharmacy notifications" 
ON public.notifications 
FOR SELECT 
USING (pharmacy_id IN (
    SELECT pharmacy_id FROM pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (pharmacy_id IN (
    SELECT pharmacy_id FROM pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can update notifications" 
ON public.notifications 
FOR UPDATE 
USING (pharmacy_id IN (
    SELECT pharmacy_id FROM pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "Staff can delete notifications" 
ON public.notifications 
FOR DELETE 
USING (pharmacy_id IN (
    SELECT pharmacy_id FROM pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
));

-- RLS policies for sent_alerts
CREATE POLICY "Staff can view pharmacy sent alerts" 
ON public.sent_alerts 
FOR SELECT 
USING (pharmacy_id IN (
    SELECT pharmacy_id FROM pharmacy_staff 
    WHERE user_id = auth.uid() AND is_active = true
));

CREATE POLICY "System can insert sent alerts" 
ON public.sent_alerts 
FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_notifications_pharmacy_unread ON public.notifications(pharmacy_id, is_read) WHERE is_read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX idx_sent_alerts_pharmacy ON public.sent_alerts(pharmacy_id, created_at DESC);
CREATE INDEX idx_medications_last_notified ON public.medications(last_notified_at);

-- Function to auto-generate expiry notifications
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

-- Function to auto-generate low stock notifications
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