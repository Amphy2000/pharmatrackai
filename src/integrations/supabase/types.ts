export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_predictions: {
        Row: {
          confidence_score: number | null
          generated_at: string
          id: string
          is_actioned: boolean | null
          medication_id: string | null
          pharmacy_id: string
          prediction_data: Json
          prediction_type: string
          valid_until: string | null
        }
        Insert: {
          confidence_score?: number | null
          generated_at?: string
          id?: string
          is_actioned?: boolean | null
          medication_id?: string | null
          pharmacy_id: string
          prediction_data: Json
          prediction_type: string
          valid_until?: string | null
        }
        Update: {
          confidence_score?: number | null
          generated_at?: string
          id?: string
          is_actioned?: boolean | null
          medication_id?: string | null
          pharmacy_id?: string
          prediction_data?: Json
          prediction_type?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_predictions_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_predictions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          id: string
          ip_address: string | null
          pharmacy_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          pharmacy_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip_address?: string | null
          pharmacy_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_inventory: {
        Row: {
          branch_id: string
          created_at: string
          current_stock: number
          id: string
          medication_id: string
          reorder_level: number
          updated_at: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          current_stock?: number
          id?: string
          medication_id: string
          reorder_level?: number
          updated_at?: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          current_stock?: number
          id?: string
          medication_id?: string
          reorder_level?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_main_branch: boolean
          name: string
          pharmacy_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main_branch?: boolean
          name: string
          pharmacy_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_main_branch?: boolean
          name?: string
          pharmacy_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          date_of_birth: string | null
          email: string | null
          full_name: string
          id: string
          loyalty_points: number | null
          metadata: Json | null
          notes: string | null
          pharmacy_id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name: string
          id?: string
          loyalty_points?: number | null
          metadata?: Json | null
          notes?: string | null
          pharmacy_id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          date_of_birth?: string | null
          email?: string | null
          full_name?: string
          id?: string
          loyalty_points?: number | null
          metadata?: Json | null
          notes?: string | null
          pharmacy_id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      doctors: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          full_name: string
          hospital_clinic: string | null
          id: string
          is_active: boolean
          license_number: string | null
          metadata: Json | null
          notes: string | null
          pharmacy_id: string
          phone: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          hospital_clinic?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          metadata?: Json | null
          notes?: string | null
          pharmacy_id: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          hospital_clinic?: string | null
          id?: string
          is_active?: boolean
          license_number?: string | null
          metadata?: Json | null
          notes?: string | null
          pharmacy_id?: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "doctors_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string
          field_name: string
          field_value: string | null
          id: string
          notes: string | null
          pharmacy_id: string
          requested_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type: string
          field_name: string
          field_value?: string | null
          id?: string
          notes?: string | null
          pharmacy_id: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          field_name?: string
          field_value?: string | null
          id?: string
          notes?: string | null
          pharmacy_id?: string
          requested_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_searches: {
        Row: {
          id: string
          location_filter: string | null
          results_count: number | null
          search_query: string
          searched_at: string | null
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          location_filter?: string | null
          results_count?: number | null
          search_query: string
          searched_at?: string | null
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          location_filter?: string | null
          results_count?: number | null
          search_query?: string
          searched_at?: string | null
          viewer_ip?: string | null
        }
        Relationships: []
      }
      marketplace_views: {
        Row: {
          id: string
          medication_id: string | null
          pharmacy_id: string
          search_query: string | null
          viewed_at: string | null
          viewer_ip: string | null
        }
        Insert: {
          id?: string
          medication_id?: string | null
          pharmacy_id: string
          search_query?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
        }
        Update: {
          id?: string
          medication_id?: string | null
          pharmacy_id?: string
          search_query?: string | null
          viewed_at?: string | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_views_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_views_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_views_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      master_barcode_library: {
        Row: {
          barcode: string
          category: string | null
          created_at: string
          id: string
          manufacturer: string | null
          product_name: string
          updated_at: string
        }
        Insert: {
          barcode: string
          category?: string | null
          created_at?: string
          id?: string
          manufacturer?: string | null
          product_name: string
          updated_at?: string
        }
        Update: {
          barcode?: string
          category?: string | null
          created_at?: string
          id?: string
          manufacturer?: string | null
          product_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      medications: {
        Row: {
          active_ingredients: string[] | null
          barcode_id: string | null
          batch_number: string
          category: string
          created_at: string
          current_stock: number
          dispensing_unit: string
          expiry_date: string
          id: string
          is_controlled: boolean
          is_public: boolean | null
          is_shelved: boolean
          last_notified_at: string | null
          location: string | null
          manufacturing_date: string | null
          metadata: Json | null
          min_stock_alert: number | null
          nafdac_reg_number: string | null
          name: string
          pharmacy_id: string | null
          reorder_level: number
          selling_price: number | null
          supplier: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          active_ingredients?: string[] | null
          barcode_id?: string | null
          batch_number: string
          category: string
          created_at?: string
          current_stock?: number
          dispensing_unit?: string
          expiry_date: string
          id?: string
          is_controlled?: boolean
          is_public?: boolean | null
          is_shelved?: boolean
          last_notified_at?: string | null
          location?: string | null
          manufacturing_date?: string | null
          metadata?: Json | null
          min_stock_alert?: number | null
          nafdac_reg_number?: string | null
          name: string
          pharmacy_id?: string | null
          reorder_level?: number
          selling_price?: number | null
          supplier?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          active_ingredients?: string[] | null
          barcode_id?: string | null
          batch_number?: string
          category?: string
          created_at?: string
          current_stock?: number
          dispensing_unit?: string
          expiry_date?: string
          id?: string
          is_controlled?: boolean
          is_public?: boolean | null
          is_shelved?: boolean
          last_notified_at?: string | null
          location?: string | null
          manufacturing_date?: string | null
          metadata?: Json | null
          min_stock_alert?: number | null
          nafdac_reg_number?: string | null
          name?: string
          pharmacy_id?: string | null
          reorder_level?: number
          selling_price?: number | null
          supplier?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          branch_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link: string | null
          message: string
          metadata: Json | null
          pharmacy_id: string
          priority: string
          title: string
          type: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          metadata?: Json | null
          pharmacy_id: string
          priority?: string
          title: string
          type?: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          metadata?: Json | null
          pharmacy_id?: string
          priority?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_transactions: {
        Row: {
          barcode: string
          branch_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          id: string
          items: Json
          notes: string | null
          payment_method: string | null
          pharmacy_id: string
          short_code: string
          status: string
          total_amount: number
        }
        Insert: {
          barcode: string
          branch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items: Json
          notes?: string | null
          payment_method?: string | null
          pharmacy_id: string
          short_code: string
          status?: string
          total_amount: number
        }
        Update: {
          barcode?: string
          branch_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          items?: Json
          notes?: string | null
          payment_method?: string | null
          pharmacy_id?: string
          short_code?: string
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "pending_transactions_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_transactions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacies: {
        Row: {
          active_branches_limit: number
          address: string | null
          admin_pin_hash: string | null
          auto_renew: boolean | null
          branch_fee_per_month: number
          cancellation_reason: string | null
          cancelled_at: string | null
          created_at: string
          default_margin_percent: number | null
          email: string
          enable_logo_on_print: boolean | null
          id: string
          is_gifted: boolean
          license_number: string | null
          logo_url: string | null
          max_users: number
          name: string
          owner_id: string
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          pharmacist_in_charge: string | null
          phone: string | null
          price_lock_enabled: boolean | null
          require_wifi_clockin: boolean | null
          shop_location_qr: string | null
          shop_wifi_name: string | null
          subscription_ends_at: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          termii_sender_id: string | null
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          active_branches_limit?: number
          address?: string | null
          admin_pin_hash?: string | null
          auto_renew?: boolean | null
          branch_fee_per_month?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          default_margin_percent?: number | null
          email: string
          enable_logo_on_print?: boolean | null
          id?: string
          is_gifted?: boolean
          license_number?: string | null
          logo_url?: string | null
          max_users?: number
          name: string
          owner_id: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          pharmacist_in_charge?: string | null
          phone?: string | null
          price_lock_enabled?: boolean | null
          require_wifi_clockin?: boolean | null
          shop_location_qr?: string | null
          shop_wifi_name?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          termii_sender_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          active_branches_limit?: number
          address?: string | null
          admin_pin_hash?: string | null
          auto_renew?: boolean | null
          branch_fee_per_month?: number
          cancellation_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          default_margin_percent?: number | null
          email?: string
          enable_logo_on_print?: boolean | null
          id?: string
          is_gifted?: boolean
          license_number?: string | null
          logo_url?: string | null
          max_users?: number
          name?: string
          owner_id?: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          pharmacist_in_charge?: string | null
          phone?: string | null
          price_lock_enabled?: boolean | null
          require_wifi_clockin?: boolean | null
          shop_location_qr?: string | null
          shop_wifi_name?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          termii_sender_id?: string | null
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_custom_features: {
        Row: {
          config: Json | null
          created_at: string
          description: string | null
          feature_key: string
          feature_name: string
          id: string
          is_enabled: boolean
          pharmacy_id: string
          updated_at: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          description?: string | null
          feature_key: string
          feature_name: string
          id?: string
          is_enabled?: boolean
          pharmacy_id: string
          updated_at?: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          description?: string | null
          feature_key?: string
          feature_name?: string
          id?: string
          is_enabled?: boolean
          pharmacy_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_custom_features_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      pharmacy_staff: {
        Row: {
          branch_id: string | null
          created_at: string
          id: string
          is_active: boolean
          pharmacy_id: string
          role: Database["public"]["Enums"]["pharmacy_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          pharmacy_id: string
          role?: Database["public"]["Enums"]["pharmacy_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          pharmacy_id?: string
          role?: Database["public"]["Enums"]["pharmacy_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pharmacy_staff_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pharmacy_staff_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["platform_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["platform_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prescription_fraud_alerts: {
        Row: {
          alert_type: string
          created_at: string
          customer_id: string | null
          description: string
          details: Json | null
          id: string
          pharmacy_id: string
          prescription_id: string | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          customer_id?: string | null
          description: string
          details?: Json | null
          id?: string
          pharmacy_id: string
          prescription_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          customer_id?: string | null
          description?: string
          details?: Json | null
          id?: string
          pharmacy_id?: string
          prescription_id?: string | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescription_fraud_alerts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_fraud_alerts_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_fraud_alerts_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string
          dosage: string
          duration: string | null
          frequency: string
          id: string
          instructions: string | null
          medication_id: string | null
          medication_name: string
          prescription_id: string
          quantity: number
        }
        Insert: {
          created_at?: string
          dosage: string
          duration?: string | null
          frequency: string
          id?: string
          instructions?: string | null
          medication_id?: string | null
          medication_name: string
          prescription_id: string
          quantity?: number
        }
        Update: {
          created_at?: string
          dosage?: string
          duration?: string | null
          frequency?: string
          id?: string
          instructions?: string | null
          medication_id?: string | null
          medication_name?: string
          prescription_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string
          customer_id: string
          diagnosis: string | null
          expiry_date: string | null
          id: string
          issue_date: string
          last_refill_date: string | null
          max_refills: number | null
          next_refill_reminder: string | null
          notes: string | null
          pharmacy_id: string
          prescriber_name: string | null
          prescriber_phone: string | null
          prescription_number: string
          refill_count: number | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          diagnosis?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          last_refill_date?: string | null
          max_refills?: number | null
          next_refill_reminder?: string | null
          notes?: string | null
          pharmacy_id: string
          prescriber_name?: string | null
          prescriber_phone?: string | null
          prescription_number: string
          refill_count?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          diagnosis?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string
          last_refill_date?: string | null
          max_refills?: number | null
          next_refill_reminder?: string | null
          notes?: string | null
          pharmacy_id?: string
          prescriber_name?: string | null
          prescriber_phone?: string | null
          prescription_number?: string
          refill_count?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reorder_requests: {
        Row: {
          actual_delivery: string | null
          approved_by: string | null
          created_at: string
          expected_delivery: string | null
          id: string
          medication_id: string | null
          notes: string | null
          pharmacy_id: string
          quantity: number
          requested_by: string | null
          status: string
          supplier_id: string
          supplier_product_id: string | null
          total_amount: number
          unit_price: number
          updated_at: string
        }
        Insert: {
          actual_delivery?: string | null
          approved_by?: string | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          medication_id?: string | null
          notes?: string | null
          pharmacy_id: string
          quantity: number
          requested_by?: string | null
          status?: string
          supplier_id: string
          supplier_product_id?: string | null
          total_amount: number
          unit_price: number
          updated_at?: string
        }
        Update: {
          actual_delivery?: string | null
          approved_by?: string | null
          created_at?: string
          expected_delivery?: string | null
          id?: string
          medication_id?: string | null
          notes?: string | null
          pharmacy_id?: string
          quantity?: number
          requested_by?: string | null
          status?: string
          supplier_id?: string
          supplier_product_id?: string | null
          total_amount?: number
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reorder_requests_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_requests_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_requests_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_requests_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reorder_requests_supplier_product_id_fkey"
            columns: ["supplier_product_id"]
            isOneToOne: false
            referencedRelation: "supplier_products"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          id: string
          medication_id: string
          payment_method: string | null
          pharmacy_id: string
          prescription_images: string[] | null
          quantity: number
          receipt_id: string | null
          sale_date: string
          shift_id: string | null
          sold_by: string | null
          sold_by_name: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          medication_id: string
          payment_method?: string | null
          pharmacy_id: string
          prescription_images?: string[] | null
          quantity: number
          receipt_id?: string | null
          sale_date?: string
          shift_id?: string | null
          sold_by?: string | null
          sold_by_name?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          id?: string
          medication_id?: string
          payment_method?: string | null
          pharmacy_id?: string
          prescription_images?: string[] | null
          quantity?: number
          receipt_id?: string | null
          sale_date?: string
          shift_id?: string | null
          sold_by?: string | null
          sold_by_name?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "staff_shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_alerts: {
        Row: {
          alert_type: string
          channel: string
          created_at: string
          id: string
          items_included: Json | null
          message: string
          pharmacy_id: string
          recipient_phone: string
          status: string
          termii_message_id: string | null
        }
        Insert: {
          alert_type: string
          channel: string
          created_at?: string
          id?: string
          items_included?: Json | null
          message: string
          pharmacy_id: string
          recipient_phone: string
          status?: string
          termii_message_id?: string | null
        }
        Update: {
          alert_type?: string
          channel?: string
          created_at?: string
          id?: string
          items_included?: Json | null
          message?: string
          pharmacy_id?: string
          recipient_phone?: string
          status?: string
          termii_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_alerts_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      shelving_history: {
        Row: {
          action: string
          created_at: string
          id: string
          medication_id: string
          performed_by: string | null
          pharmacy_id: string
          reason: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          medication_id: string
          performed_by?: string | null
          pharmacy_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          medication_id?: string
          performed_by?: string | null
          pharmacy_id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shelving_history_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelving_history_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shelving_history_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_permissions: {
        Row: {
          created_at: string
          id: string
          is_granted: boolean
          permission_key: string
          staff_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_granted?: boolean
          permission_key: string
          staff_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_granted?: boolean
          permission_key?: string
          staff_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_permissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          clock_in: string
          clock_in_method: string | null
          clock_in_wifi_name: string | null
          clock_out: string | null
          created_at: string
          id: string
          is_wifi_verified: boolean | null
          notes: string | null
          pharmacy_id: string
          staff_id: string
          total_sales: number | null
          total_transactions: number | null
          updated_at: string
        }
        Insert: {
          clock_in?: string
          clock_in_method?: string | null
          clock_in_wifi_name?: string | null
          clock_out?: string | null
          created_at?: string
          id?: string
          is_wifi_verified?: boolean | null
          notes?: string | null
          pharmacy_id: string
          staff_id: string
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string
        }
        Update: {
          clock_in?: string
          clock_in_method?: string | null
          clock_in_wifi_name?: string | null
          clock_out?: string | null
          created_at?: string
          id?: string
          is_wifi_verified?: boolean | null
          notes?: string | null
          pharmacy_id?: string
          staff_id?: string
          total_sales?: number | null
          total_transactions?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_transfers: {
        Row: {
          approved_by: string | null
          completed_at: string | null
          created_at: string
          from_branch_id: string
          id: string
          medication_id: string
          notes: string | null
          pharmacy_id: string
          quantity: number
          requested_by: string | null
          status: string
          to_branch_id: string
          updated_at: string
        }
        Insert: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          from_branch_id: string
          id?: string
          medication_id: string
          notes?: string | null
          pharmacy_id: string
          quantity: number
          requested_by?: string | null
          status?: string
          to_branch_id: string
          updated_at?: string
        }
        Update: {
          approved_by?: string | null
          completed_at?: string | null
          created_at?: string
          from_branch_id?: string
          id?: string
          medication_id?: string
          notes?: string | null
          pharmacy_id?: string
          quantity?: number
          requested_by?: string | null
          status?: string
          to_branch_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_transfers_from_branch_id_fkey"
            columns: ["from_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_transfers_to_branch_id_fkey"
            columns: ["to_branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          is_gift: boolean
          payment_date: string
          paystack_reference: string | null
          paystack_transaction_id: string | null
          pharmacy_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          is_gift?: boolean
          payment_date?: string
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          pharmacy_id: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          is_gift?: boolean
          payment_date?: string
          paystack_reference?: string | null
          paystack_transaction_id?: string | null
          pharmacy_id?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_payments_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_products: {
        Row: {
          created_at: string
          id: string
          is_available: boolean
          lead_time_days: number | null
          medication_id: string | null
          min_order_quantity: number
          product_name: string
          sku: string | null
          supplier_id: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_available?: boolean
          lead_time_days?: number | null
          medication_id?: string | null
          min_order_quantity?: number
          product_name: string
          sku?: string | null
          supplier_id: string
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_available?: boolean
          lead_time_days?: number | null
          medication_id?: string | null
          min_order_quantity?: number
          product_name?: string
          sku?: string | null
          supplier_id?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_products_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_products_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          pharmacy_id: string
          phone: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          pharmacy_id: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          pharmacy_id?: string
          phone?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
      upsell_analytics: {
        Row: {
          accepted_at: string | null
          branch_id: string | null
          cart_medication_ids: string[]
          confidence_score: number | null
          created_at: string
          id: string
          pharmacy_id: string
          sale_id: string | null
          staff_id: string | null
          suggested_at: string
          suggested_medication_id: string
          suggestion_reason: string | null
          was_accepted: boolean
        }
        Insert: {
          accepted_at?: string | null
          branch_id?: string | null
          cart_medication_ids?: string[]
          confidence_score?: number | null
          created_at?: string
          id?: string
          pharmacy_id: string
          sale_id?: string | null
          staff_id?: string | null
          suggested_at?: string
          suggested_medication_id: string
          suggestion_reason?: string | null
          was_accepted?: boolean
        }
        Update: {
          accepted_at?: string | null
          branch_id?: string | null
          cart_medication_ids?: string[]
          confidence_score?: number | null
          created_at?: string
          id?: string
          pharmacy_id?: string
          sale_id?: string | null
          staff_id?: string | null
          suggested_at?: string
          suggested_medication_id?: string
          suggestion_reason?: string | null
          was_accepted?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "upsell_analytics_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_analytics_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_analytics_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_analytics_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "pharmacy_staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_analytics_suggested_medication_id_fkey"
            columns: ["suggested_medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upsell_analytics_suggested_medication_id_fkey"
            columns: ["suggested_medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_leads: {
        Row: {
          clicked_at: string | null
          id: string
          medication_id: string
          medication_name: string
          pharmacy_id: string
          quantity: number | null
          viewer_ip: string | null
        }
        Insert: {
          clicked_at?: string | null
          id?: string
          medication_id: string
          medication_name: string
          pharmacy_id: string
          quantity?: number | null
          viewer_ip?: string | null
        }
        Update: {
          clicked_at?: string | null
          id?: string
          medication_id?: string
          medication_name?: string
          pharmacy_id?: string
          quantity?: number | null
          viewer_ip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_leads_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_leads_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "public_medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_leads_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_medications: {
        Row: {
          category: string | null
          current_stock: number | null
          dispensing_unit: string | null
          id: string | null
          name: string | null
          pharmacy_address: string | null
          pharmacy_id: string | null
          pharmacy_name: string | null
          pharmacy_phone: string | null
          selling_price: number | null
        }
        Relationships: [
          {
            foreignKeyName: "medications_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      check_and_create_expiry_notifications: { Args: never; Returns: undefined }
      check_and_create_stock_notifications: { Args: never; Returns: undefined }
      check_is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      check_is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      generate_internal_barcode: { Args: never; Returns: string }
      generate_receipt_id: { Args: never; Returns: string }
      get_manager_branch_id: {
        Args: { _pharmacy_id: string; _user_id: string }
        Returns: string
      }
      get_user_pharmacy_id: { Args: { user_uuid: string }; Returns: string }
      get_user_pharmacy_ids: { Args: { _user_id: string }; Returns: string[] }
      has_pharmacy_role: {
        Args: {
          required_role: Database["public"]["Enums"]["pharmacy_role"]
          user_uuid: string
        }
        Returns: boolean
      }
      is_branch_within_limit: {
        Args: { _branch_id: string; _pharmacy_id: string }
        Returns: boolean
      }
      is_manager_for_pharmacy: {
        Args: { _pharmacy_id: string; _user_id: string }
        Returns: boolean
      }
      is_pharmacy_owner: {
        Args: { check_pharmacy_id: string; check_user_id: string }
        Returns: boolean
      }
      is_pharmacy_staff: {
        Args: { check_pharmacy_id: string; check_user_id: string }
        Returns: boolean
      }
      is_platform_admin: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      staff_assigned_to_branch: {
        Args: { _branch_id: string; _user_id: string }
        Returns: boolean
      }
      staff_has_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      user_is_pharmacy_staff: {
        Args: { _pharmacy_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      pharmacy_role: "owner" | "manager" | "staff"
      platform_role: "super_admin" | "support"
      subscription_plan: "starter" | "pro" | "enterprise"
      subscription_status: "active" | "expired" | "cancelled" | "trial"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      pharmacy_role: ["owner", "manager", "staff"],
      platform_role: ["super_admin", "support"],
      subscription_plan: ["starter", "pro", "enterprise"],
      subscription_status: ["active", "expired", "cancelled", "trial"],
    },
  },
} as const
