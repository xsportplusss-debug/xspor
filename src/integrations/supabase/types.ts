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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      accounting_entries: {
        Row: {
          amount: number
          category: string | null
          created_at: string
          description: string | null
          entry_date: string
          entry_type: string
          id: string
          source: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          entry_date: string
          entry_type: string
          id?: string
          source?: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string
          description?: string | null
          entry_date?: string
          entry_type?: string
          id?: string
          source?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor: string | null
          affected_count: number
          created_at: string
          description: string | null
          entity: string
          entity_id: string | null
          id: string
          meta: Json | null
          user_id: string
        }
        Insert: {
          action: string
          actor?: string | null
          affected_count?: number
          created_at?: string
          description?: string | null
          entity: string
          entity_id?: string | null
          id?: string
          meta?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          actor?: string | null
          affected_count?: number
          created_at?: string
          description?: string | null
          entity?: string
          entity_id?: string | null
          id?: string
          meta?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      bank_accounts: {
        Row: {
          account_name: string | null
          account_no: string | null
          active: boolean
          bank_id: string
          created_at: string
          currency: string
          deleted_at: string | null
          iban: string | null
          id: string
          last_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_no?: string | null
          active?: boolean
          bank_id: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          iban?: string | null
          id?: string
          last_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_no?: string | null
          active?: boolean
          bank_id?: string
          created_at?: string
          currency?: string
          deleted_at?: string | null
          iban?: string | null
          id?: string
          last_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_imports: {
        Row: {
          account_id: string | null
          bank_id: string
          deleted_at: string | null
          file_hash: string | null
          file_name: string
          file_type: string
          id: string
          parser: string | null
          status: string
          tx_count: number
          uploaded_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          bank_id: string
          deleted_at?: string | null
          file_hash?: string | null
          file_name: string
          file_type: string
          id?: string
          parser?: string | null
          status?: string
          tx_count?: number
          uploaded_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          bank_id?: string
          deleted_at?: string | null
          file_hash?: string | null
          file_name?: string
          file_type?: string
          id?: string
          parser?: string | null
          status?: string
          tx_count?: number
          uploaded_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_imports_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          account_id: string | null
          account_name: string
          bank_id: string | null
          bank_name: string
          created_at: string
          deleted_at: string | null
          file_hash: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          imported_by: string | null
          mime_type: string | null
          period_end: string | null
          period_start: string | null
          status: string
          summary: Json | null
          total_credit: number
          total_debit: number
          tx_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string
          bank_id?: string | null
          bank_name?: string
          created_at?: string
          deleted_at?: string | null
          file_hash?: string | null
          file_name: string
          file_path: string
          file_size?: number
          id?: string
          imported_by?: string | null
          mime_type?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          summary?: Json | null
          total_credit?: number
          total_debit?: number
          tx_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_name?: string
          bank_id?: string | null
          bank_name?: string
          created_at?: string
          deleted_at?: string | null
          file_hash?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          imported_by?: string | null
          mime_type?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          summary?: Json | null
          total_credit?: number
          total_debit?: number
          tx_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_transactions: {
        Row: {
          account_id: string | null
          balance: number | null
          bank_id: string
          branch: string | null
          category: string | null
          counterparty: string | null
          counterparty_iban: string | null
          created_at: string
          credit: number
          currency: string | null
          date: string
          debit: number
          dedup_key: string | null
          deleted_at: string | null
          description: string
          direction: string | null
          doc_no: string | null
          file_name: string | null
          id: string
          import_id: string | null
          imported_at: string
          matched_customer_id: string | null
          matched_invoice_id: string | null
          note: string | null
          operation: string | null
          raw: Json | null
          ref_no: string | null
          source: string
          statement_date: string | null
          statement_id: string | null
          tx_time: string | null
          user_description: string | null
          user_id: string
          value_date: string | null
        }
        Insert: {
          account_id?: string | null
          balance?: number | null
          bank_id: string
          branch?: string | null
          category?: string | null
          counterparty?: string | null
          counterparty_iban?: string | null
          created_at?: string
          credit?: number
          currency?: string | null
          date: string
          debit?: number
          dedup_key?: string | null
          deleted_at?: string | null
          description?: string
          direction?: string | null
          doc_no?: string | null
          file_name?: string | null
          id?: string
          import_id?: string | null
          imported_at?: string
          matched_customer_id?: string | null
          matched_invoice_id?: string | null
          note?: string | null
          operation?: string | null
          raw?: Json | null
          ref_no?: string | null
          source?: string
          statement_date?: string | null
          statement_id?: string | null
          tx_time?: string | null
          user_description?: string | null
          user_id: string
          value_date?: string | null
        }
        Update: {
          account_id?: string | null
          balance?: number | null
          bank_id?: string
          branch?: string | null
          category?: string | null
          counterparty?: string | null
          counterparty_iban?: string | null
          created_at?: string
          credit?: number
          currency?: string | null
          date?: string
          debit?: number
          dedup_key?: string | null
          deleted_at?: string | null
          description?: string
          direction?: string | null
          doc_no?: string | null
          file_name?: string | null
          id?: string
          import_id?: string | null
          imported_at?: string
          matched_customer_id?: string | null
          matched_invoice_id?: string | null
          note?: string | null
          operation?: string | null
          raw?: Json | null
          ref_no?: string | null
          source?: string
          statement_date?: string | null
          statement_id?: string | null
          tx_time?: string | null
          user_description?: string | null
          user_id?: string
          value_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_import_id_fkey"
            columns: ["import_id"]
            isOneToOne: false
            referencedRelation: "bank_imports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_transactions_statement_id_fkey"
            columns: ["statement_id"]
            isOneToOne: false
            referencedRelation: "bank_statements"
            referencedColumns: ["id"]
          },
        ]
      }
      banks: {
        Row: {
          account_name: string | null
          account_no: string | null
          active: boolean
          bank_code: string | null
          branch: string | null
          created_at: string
          currency: string
          current_balance: number
          deleted_at: string | null
          description: string | null
          iban: string | null
          id: string
          last_statement_date: string | null
          logo_url: string | null
          name: string
          parser: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_name?: string | null
          account_no?: string | null
          active?: boolean
          bank_code?: string | null
          branch?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          description?: string | null
          iban?: string | null
          id?: string
          last_statement_date?: string | null
          logo_url?: string | null
          name: string
          parser?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_name?: string | null
          account_no?: string | null
          active?: boolean
          bank_code?: string | null
          branch?: string | null
          created_at?: string
          currency?: string
          current_balance?: number
          deleted_at?: string | null
          description?: string | null
          iban?: string | null
          id?: string
          last_statement_date?: string | null
          logo_url?: string | null
          name?: string
          parser?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          balance: number
          created_at: string
          id: string
          name: string
          tax_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          id?: string
          name: string
          tax_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          id?: string
          name?: string
          tax_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          id: string
          invoice_date: string | null
          invoice_no: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_date?: string | null
          invoice_no?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      user_data: {
        Row: {
          company: Json
          data: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: Json
          data?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: Json
          data?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_prefs: {
        Row: {
          prefs: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          prefs?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          prefs?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
