export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      accounts: {
        Row: {
          balance: number
          code: Database["public"]["Enums"]["account_type"]
          id: string
          name_ar: string
        }
        Insert: {
          balance?: number
          code: Database["public"]["Enums"]["account_type"]
          id?: string
          name_ar: string
        }
        Update: {
          balance?: number
          code?: Database["public"]["Enums"]["account_type"]
          id?: string
          name_ar?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string | null
          entity: string | null
          entity_id: string | null
          id: number
          payload: Json | null
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          payload?: Json | null
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string | null
          entity?: string | null
          entity_id?: string | null
          id?: never
          payload?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_actor_fkey"
            columns: ["actor"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      capabilities: {
        Row: {
          code: string
          description_ar: string | null
          name_ar: string
          sort_order: number
        }
        Insert: {
          code: string
          description_ar?: string | null
          name_ar: string
          sort_order?: number
        }
        Update: {
          code?: string
          description_ar?: string | null
          name_ar?: string
          sort_order?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      check_images: {
        Row: {
          check_id: string
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
        }
        Insert: {
          check_id: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
        }
        Update: {
          check_id?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "check_images_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "check_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      checks: {
        Row: {
          amount: number
          created_at: string | null
          customer_ref: string | null
          drawer_name: string | null
          due_date: string | null
          endorsed_to: string | null
          id: string
          image_url: string | null
          purpose: string
          status: Database["public"]["Enums"]["check_status"]
        }
        Insert: {
          amount: number
          created_at?: string | null
          customer_ref?: string | null
          drawer_name?: string | null
          due_date?: string | null
          endorsed_to?: string | null
          id?: string
          image_url?: string | null
          purpose?: string
          status?: Database["public"]["Enums"]["check_status"]
        }
        Update: {
          amount?: number
          created_at?: string | null
          customer_ref?: string | null
          drawer_name?: string | null
          due_date?: string | null
          endorsed_to?: string | null
          id?: string
          image_url?: string | null
          purpose?: string
          status?: Database["public"]["Enums"]["check_status"]
        }
        Relationships: [
          {
            foreignKeyName: "checks_endorsed_to_fkey"
            columns: ["endorsed_to"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_closes: {
        Row: {
          cash_revenue: number | null
          close_date: string
          closed_by: string | null
          counted_drawer: number
          created_at: string | null
          expected_drawer: number
          id: string
          new_float: number | null
          recv_cash_applied: number | null
          report_cash_ref: number | null
          second_drawer: number | null
          stardust_awarded: number
          transaction_id: string | null
          variance: number | null
        }
        Insert: {
          cash_revenue?: number | null
          close_date: string
          closed_by?: string | null
          counted_drawer: number
          created_at?: string | null
          expected_drawer: number
          id?: string
          new_float?: number | null
          recv_cash_applied?: number | null
          report_cash_ref?: number | null
          second_drawer?: number | null
          stardust_awarded?: number
          transaction_id?: string | null
          variance?: number | null
        }
        Update: {
          cash_revenue?: number | null
          close_date?: string
          closed_by?: string | null
          counted_drawer?: number
          created_at?: string | null
          expected_drawer?: number
          id?: string
          new_float?: number | null
          recv_cash_applied?: number | null
          report_cash_ref?: number | null
          second_drawer?: number | null
          stardust_awarded?: number
          transaction_id?: string | null
          variance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_closes_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_closes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_sales_reports: {
        Row: {
          card_sales: number
          cash_sales: number
          check_sales: number
          created_at: string | null
          created_by: string | null
          credit_delivery: number
          credit_invoice: number
          id: string
          recv_card: number
          recv_cash: number
          recv_check: number
          transaction_id: string | null
          work_date: string
        }
        Insert: {
          card_sales?: number
          cash_sales?: number
          check_sales?: number
          created_at?: string | null
          created_by?: string | null
          credit_delivery?: number
          credit_invoice?: number
          id?: string
          recv_card?: number
          recv_cash?: number
          recv_check?: number
          transaction_id?: string | null
          work_date: string
        }
        Update: {
          card_sales?: number
          cash_sales?: number
          check_sales?: number
          created_at?: string | null
          created_by?: string | null
          credit_delivery?: number
          credit_invoice?: number
          id?: string
          recv_card?: number
          recv_cash?: number
          recv_check?: number
          transaction_id?: string | null
          work_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_sales_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_sales_reports_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      expected_obligations: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          expected_date: string
          id: string
          is_settled: boolean
          note: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_date: string
          id?: string
          is_settled?: boolean
          note?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_date?: string
          id?: string
          is_settled?: boolean
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expected_obligations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_images: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          image_url: string
          invoice_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url: string
          invoice_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          image_url?: string
          invoice_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_images_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_images_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          due_date: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          paid: number
          paper_no: string
          remaining: number | null
          supplier_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          paid?: number
          paper_no?: string
          remaining?: number | null
          supplier_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          due_date?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          paid?: number
          paper_no?: string
          remaining?: number | null
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      ledger_entries: {
        Row: {
          account_id: string
          credit: number
          debit: number
          id: string
          transaction_id: string
        }
        Insert: {
          account_id: string
          credit?: number
          debit?: number
          id?: string
          transaction_id: string
        }
        Update: {
          account_id?: string
          credit?: number
          debit?: number
          id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ledger_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ledger_entries_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_allocations: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_allocations_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_allocations_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          role_id: string
          stardust: number
          unlocked_planets: string[] | null
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          role_id: string
          stardust?: number
          unlocked_planets?: string[] | null
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          role_id?: string
          stardust?: number
          unlocked_planets?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_capabilities: {
        Row: {
          capability_code: string
          role_id: string
        }
        Insert: {
          capability_code: string
          role_id: string
        }
        Update: {
          capability_code?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_capabilities_capability_code_fkey"
            columns: ["capability_code"]
            isOneToOne: false
            referencedRelation: "capabilities"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "role_capabilities_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string | null
          created_at: string | null
          id: string
          is_system: boolean
          name_ar: string
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean
          name_ar: string
        }
        Update: {
          code?: string | null
          created_at?: string | null
          id?: string
          is_system?: boolean
          name_ar?: string
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          balance: number
          created_at: string | null
          id: string
          name: string
          orders_blocked: boolean
          phone: string | null
          red_flag: boolean
          red_flag_note: string | null
          risk_score: number
          supplier_no: number
          visit_day_of_month: number | null
          visit_days: number[] | null
          visit_pattern: Database["public"]["Enums"]["visit_pattern_type"]
        }
        Insert: {
          balance?: number
          created_at?: string | null
          id?: string
          name: string
          orders_blocked?: boolean
          phone?: string | null
          red_flag?: boolean
          red_flag_note?: string | null
          risk_score?: number
          supplier_no?: number
          visit_day_of_month?: number | null
          visit_days?: number[] | null
          visit_pattern?: Database["public"]["Enums"]["visit_pattern_type"]
        }
        Update: {
          balance?: number
          created_at?: string | null
          id?: string
          name?: string
          orders_blocked?: boolean
          phone?: string | null
          red_flag?: boolean
          red_flag_note?: string | null
          risk_score?: number
          supplier_no?: number
          visit_day_of_month?: number | null
          visit_days?: number[] | null
          visit_pattern?: Database["public"]["Enums"]["visit_pattern_type"]
        }
        Relationships: []
      }
      transaction_checks: {
        Row: {
          check_id: string
          created_at: string | null
          id: string
          prev_endorsed_to: string | null
          prev_status: Database["public"]["Enums"]["check_status"]
          transaction_id: string
        }
        Insert: {
          check_id: string
          created_at?: string | null
          id?: string
          prev_endorsed_to?: string | null
          prev_status: Database["public"]["Enums"]["check_status"]
          transaction_id: string
        }
        Update: {
          check_id?: string
          created_at?: string | null
          id?: string
          prev_endorsed_to?: string | null
          prev_status?: Database["public"]["Enums"]["check_status"]
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_checks_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_checks_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          created_at: string | null
          id: string
          note: string | null
          reversed_by: string | null
          supplier_id: string | null
          total: number
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note?: string | null
          reversed_by?: string | null
          supplier_id?: string | null
          total: number
          type: Database["public"]["Enums"]["txn_type"]
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note?: string | null
          reversed_by?: string | null
          supplier_id?: string | null
          total?: number
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_reversed_by_fkey"
            columns: ["reversed_by"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_user_role: {
        Args: { p_role_id: string; p_user: string }
        Returns: undefined
      }
      award_stardust: {
        Args: { p_amount: number; p_profile_id: string }
        Returns: undefined
      }
      bounce_check: {
        Args: { p_actor: string; p_check_id: string }
        Returns: string
      }
      bounce_check_impl: {
        Args: { p_actor: string; p_check_id: string }
        Returns: string
      }
      clear_check: {
        Args: { p_actor: string; p_check_id: string }
        Returns: string
      }
      clear_check_impl: {
        Args: { p_actor: string; p_check_id: string }
        Returns: string
      }
      close_capabilities: { Args: { p_caps: string[] }; Returns: string[] }
      close_daily_orbit: {
        Args: {
          p_actor: string
          p_counted: number
          p_new_float?: number
          p_work_date?: string
        }
        Returns: string
      }
      close_daily_orbit_impl: {
        Args: {
          p_actor: string
          p_counted: number
          p_new_float?: number
          p_work_date?: string
        }
        Returns: string
      }
      collect_card_clearing: {
        Args: { p_actor: string; p_amount: number }
        Returns: string
      }
      collect_card_clearing_impl: {
        Args: { p_actor: string; p_amount: number }
        Returns: string
      }
      create_check: {
        Args: {
          p_actor: string
          p_amount: number
          p_customer_ref?: string
          p_drawer_name?: string
          p_due_date?: string
          p_purpose: string
        }
        Returns: string
      }
      create_check_impl: {
        Args: {
          p_actor: string
          p_amount: number
          p_customer_ref?: string
          p_drawer_name?: string
          p_due_date?: string
          p_purpose: string
        }
        Returns: string
      }
      delete_role: { Args: { p_role_id: string }; Returns: undefined }
      deposit_check: {
        Args: { p_actor: string; p_check_id: string }
        Returns: string
      }
      deposit_check_impl: {
        Args: { p_actor: string; p_check_id: string }
        Returns: string
      }
      has_capability:
        | { Args: { p_code: string }; Returns: boolean }
        | { Args: { p_code: string; p_user: string }; Returns: boolean }
      is_admin: { Args: never; Returns: boolean }
      pay_supplier: {
        Args: {
          p_actor: string
          p_cash: number
          p_check_ids: string[]
          p_drawer: number
          p_supplier: string
        }
        Returns: string
      }
      pay_supplier_impl: {
        Args: {
          p_actor: string
          p_cash: number
          p_check_ids: string[]
          p_drawer: number
          p_supplier: string
        }
        Returns: string
      }
      project_cash_flow: {
        Args: { p_horizon_days?: number }
        Returns: {
          day: string
          is_black_hole: boolean
          other_obligation: number
          projected_liquidity: number
          supplier_obligation: number
        }[]
      }
      record_daily_sales: {
        Args: {
          p_actor: string
          p_card_sales: number
          p_cash_sales: number
          p_check_sales: number
          p_credit_delivery: number
          p_credit_invoice: number
          p_recv_card: number
          p_recv_cash: number
          p_recv_check: number
          p_work_date: string
        }
        Returns: string
      }
      record_daily_sales_impl: {
        Args: {
          p_actor: string
          p_card_sales: number
          p_cash_sales: number
          p_check_sales: number
          p_credit_delivery: number
          p_credit_invoice: number
          p_recv_card: number
          p_recv_cash: number
          p_recv_check: number
          p_work_date: string
        }
        Returns: string
      }
      record_expense: {
        Args: {
          p_actor: string
          p_amount: number
          p_note?: string
          p_source: string
        }
        Returns: string
      }
      record_expense_impl: {
        Args: {
          p_actor: string
          p_amount: number
          p_note?: string
          p_source: string
        }
        Returns: string
      }
      reverse_transaction: {
        Args: { p_actor: string; p_transaction_id: string }
        Returns: string
      }
      reverse_transaction_impl: {
        Args: { p_actor: string; p_transaction_id: string }
        Returns: string
      }
      role_to_enum: {
        Args: { p_role_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      save_role: {
        Args: { p_capabilities: string[]; p_name: string; p_role_id?: string }
        Returns: string
      }
      set_opening_balance: {
        Args: { p_amount: number; p_code: string }
        Returns: string
      }
      settle_receivable_transfer: {
        Args: { p_actor: string; p_amount: number }
        Returns: string
      }
      settle_receivable_transfer_impl: {
        Args: { p_actor: string; p_amount: number }
        Returns: string
      }
      skim_drawer: {
        Args: { p_actor: string; p_amount: number }
        Returns: string
      }
      skim_drawer_impl: {
        Args: { p_actor: string; p_amount: number }
        Returns: string
      }
    }
    Enums: {
      account_type:
        | "cash_drawer"
        | "accumulated_cash"
        | "bank"
        | "checks_on_hand"
        | "suppliers_payable"
        | "customer_receivable"
        | "card_clearing"
        | "sales_revenue"
        | "operating_expense"
        | "opening_equity"
        | "purchases"
      check_status:
        | "available"
        | "endorsed"
        | "cashed"
        | "bounced"
        | "deposited"
      txn_type:
        | "payment"
        | "expense"
        | "sales_skim"
        | "liquidity_transfer"
        | "reversal"
        | "sale"
        | "receivable_settlement"
        | "opening_balance"
        | "purchase"
      user_role: "super_admin" | "admin" | "monitor" | "cashier"
      visit_pattern_type: "weekly" | "monthly" | "unspecified"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      account_type: [
        "cash_drawer",
        "accumulated_cash",
        "bank",
        "checks_on_hand",
        "suppliers_payable",
        "customer_receivable",
        "card_clearing",
        "sales_revenue",
        "operating_expense",
        "opening_equity",
        "purchases",
      ],
      check_status: ["available", "endorsed", "cashed", "bounced", "deposited"],
      txn_type: [
        "payment",
        "expense",
        "sales_skim",
        "liquidity_transfer",
        "reversal",
        "sale",
        "receivable_settlement",
        "opening_balance",
        "purchase",
      ],
      user_role: ["super_admin", "admin", "monitor", "cashier"],
      visit_pattern_type: ["weekly", "monthly", "unspecified"],
    },
  },
} as const

