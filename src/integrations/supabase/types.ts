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
      medications: {
        Row: {
          barcode_id: string | null
          batch_number: string
          category: string
          created_at: string
          current_stock: number
          expiry_date: string
          id: string
          location: string | null
          min_stock_alert: number | null
          name: string
          pharmacy_id: string | null
          reorder_level: number
          selling_price: number | null
          supplier: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          barcode_id?: string | null
          batch_number: string
          category: string
          created_at?: string
          current_stock?: number
          expiry_date: string
          id?: string
          location?: string | null
          min_stock_alert?: number | null
          name: string
          pharmacy_id?: string | null
          reorder_level?: number
          selling_price?: number | null
          supplier?: string | null
          unit_price: number
          updated_at?: string
        }
        Update: {
          barcode_id?: string | null
          batch_number?: string
          category?: string
          created_at?: string
          current_stock?: number
          expiry_date?: string
          id?: string
          location?: string | null
          min_stock_alert?: number | null
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
      pharmacies: {
        Row: {
          address: string | null
          created_at: string
          email: string
          id: string
          license_number: string | null
          max_users: number
          name: string
          owner_id: string
          paystack_customer_code: string | null
          paystack_subscription_code: string | null
          phone: string | null
          subscription_ends_at: string | null
          subscription_plan: Database["public"]["Enums"]["subscription_plan"]
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email: string
          id?: string
          license_number?: string | null
          max_users?: number
          name: string
          owner_id: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          phone?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string
          id?: string
          license_number?: string | null
          max_users?: number
          name?: string
          owner_id?: string
          paystack_customer_code?: string | null
          paystack_subscription_code?: string | null
          phone?: string | null
          subscription_ends_at?: string | null
          subscription_plan?: Database["public"]["Enums"]["subscription_plan"]
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pharmacy_staff: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          pharmacy_id: string
          role: Database["public"]["Enums"]["pharmacy_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pharmacy_id: string
          role?: Database["public"]["Enums"]["pharmacy_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
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
            foreignKeyName: "pharmacy_staff_pharmacy_id_fkey"
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
      sales: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          medication_id: string
          pharmacy_id: string
          quantity: number
          sale_date: string
          sold_by: string | null
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          medication_id: string
          pharmacy_id: string
          quantity: number
          sale_date?: string
          sold_by?: string | null
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          medication_id?: string
          pharmacy_id?: string
          quantity?: number
          sale_date?: string
          sold_by?: string | null
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_medication_id_fkey"
            columns: ["medication_id"]
            isOneToOne: false
            referencedRelation: "medications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_pharmacy_id_fkey"
            columns: ["pharmacy_id"]
            isOneToOne: false
            referencedRelation: "pharmacies"
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_pharmacy_id: { Args: { user_uuid: string }; Returns: string }
      has_pharmacy_role: {
        Args: {
          required_role: Database["public"]["Enums"]["pharmacy_role"]
          user_uuid: string
        }
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
    }
    Enums: {
      pharmacy_role: "owner" | "manager" | "staff"
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
      subscription_plan: ["starter", "pro", "enterprise"],
      subscription_status: ["active", "expired", "cancelled", "trial"],
    },
  },
} as const
