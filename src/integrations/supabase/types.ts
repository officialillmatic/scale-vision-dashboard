export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      agents: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          rate_per_minute: number | null
          retell_agent_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rate_per_minute?: number | null
          retell_agent_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rate_per_minute?: number | null
          retell_agent_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      calls: {
        Row: {
          agent_id: string | null
          audio_url: string | null
          billable_rate_per_minute: number | null
          billing_duration_sec: number | null
          call_id: string
          call_status: string
          call_summary: string | null
          call_type: string
          company_id: string | null
          cost_usd: number
          disconnection_reason: string | null
          disposition: string | null
          duration_sec: number
          from: string
          from_number: string | null
          id: string
          latency_ms: number | null
          processed_for_cost: boolean | null
          recording_url: string | null
          result_sentiment: Json | null
          revenue_amount: number | null
          sentiment: string | null
          sentiment_score: number | null
          start_time: string | null
          timestamp: string
          to: string
          to_number: string | null
          transcript: string | null
          transcript_url: string | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          audio_url?: string | null
          billable_rate_per_minute?: number | null
          billing_duration_sec?: number | null
          call_id: string
          call_status?: string
          call_summary?: string | null
          call_type?: string
          company_id?: string | null
          cost_usd?: number
          disconnection_reason?: string | null
          disposition?: string | null
          duration_sec?: number
          from?: string
          from_number?: string | null
          id?: string
          latency_ms?: number | null
          processed_for_cost?: boolean | null
          recording_url?: string | null
          result_sentiment?: Json | null
          revenue_amount?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          start_time?: string | null
          timestamp?: string
          to?: string
          to_number?: string | null
          transcript?: string | null
          transcript_url?: string | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          audio_url?: string | null
          billable_rate_per_minute?: number | null
          billing_duration_sec?: number | null
          call_id?: string
          call_status?: string
          call_summary?: string | null
          call_type?: string
          company_id?: string | null
          cost_usd?: number
          disconnection_reason?: string | null
          disposition?: string | null
          duration_sec?: number
          from?: string
          from_number?: string | null
          id?: string
          latency_ms?: number | null
          processed_for_cost?: boolean | null
          recording_url?: string | null
          result_sentiment?: Json | null
          revenue_amount?: number | null
          sentiment?: string | null
          sentiment_score?: number | null
          start_time?: string | null
          timestamp?: string
          to?: string
          to_number?: string | null
          transcript?: string | null
          transcript_url?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      company: {
        Row: {
          created_at: string
          description: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          size: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          size?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_invitations_raw: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string | null
          id: string
          invited_by: string | null
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role: string
          status?: string
          token: string
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          invited_by?: string | null
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          joined_at: string | null
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          joined_at?: string | null
          role: string
          status: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          joined_at?: string | null
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_pricing: {
        Row: {
          base_rate_per_minute: number
          company_id: string
          created_at: string
          custom_rate_per_minute: number | null
          id: string
          pricing_type: string
          updated_at: string
          volume_discount_rate: number | null
          volume_discount_threshold: number | null
        }
        Insert: {
          base_rate_per_minute?: number
          company_id: string
          created_at?: string
          custom_rate_per_minute?: number | null
          id?: string
          pricing_type?: string
          updated_at?: string
          volume_discount_rate?: number | null
          volume_discount_threshold?: number | null
        }
        Update: {
          base_rate_per_minute?: number
          company_id?: string
          created_at?: string
          custom_rate_per_minute?: number | null
          id?: string
          pricing_type?: string
          updated_at?: string
          volume_discount_rate?: number | null
          volume_discount_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_pricing_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          call_id: string | null
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          call_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          call_id?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["id"]
          },
        ]
      }
      drscale_user_backup: {
        Row: {
          created_at: string | null
          email: string | null
          id: string | null
          is_super_admin: boolean | null
          raw_app_meta_data: Json | null
          raw_user_meta_data: Json | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_super_admin?: boolean | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string | null
          is_super_admin?: boolean | null
          raw_app_meta_data?: Json | null
          raw_user_meta_data?: Json | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          billing_period_end: string
          billing_period_start: string
          company_id: string
          created_at: string
          generated_at: string | null
          id: string
          invoice_number: string
          paid_at: string | null
          sent_at: string | null
          status: string
          total_calls: number
          total_duration_minutes: number
          total_revenue: number
          updated_at: string
        }
        Insert: {
          billing_period_end: string
          billing_period_start: string
          company_id: string
          created_at?: string
          generated_at?: string | null
          id?: string
          invoice_number: string
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          total_calls?: number
          total_duration_minutes?: number
          total_revenue?: number
          updated_at?: string
        }
        Update: {
          billing_period_end?: string
          billing_period_start?: string
          company_id?: string
          created_at?: string
          generated_at?: string | null
          id?: string
          invoice_number?: string
          paid_at?: string | null
          sent_at?: string | null
          status?: string
          total_calls?: number
          total_duration_minutes?: number
          total_revenue?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          bucket: string
          count: number | null
          identifier: string
          reset_at: string | null
        }
        Insert: {
          bucket: string
          count?: number | null
          identifier: string
          reset_at?: string | null
        }
        Update: {
          bucket?: string
          count?: number | null
          identifier?: string
          reset_at?: string | null
        }
        Relationships: []
      }
      request_log: {
        Row: {
          created_at: string
          id: number
          uid: string
        }
        Insert: {
          created_at?: string
          id?: number
          uid: string
        }
        Update: {
          created_at?: string
          id?: number
          uid?: string
        }
        Relationships: []
      }
      retell_agents: {
        Row: {
          agent_id: string
          avatar_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          language: string | null
          last_synced: string | null
          name: string
          rate_per_minute: number | null
          retell_agent_id: string | null
          status: string | null
          updated_at: string | null
          voice_model: string | null
        }
        Insert: {
          agent_id: string
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_synced?: string | null
          name: string
          rate_per_minute?: number | null
          retell_agent_id?: string | null
          status?: string | null
          updated_at?: string | null
          voice_model?: string | null
        }
        Update: {
          agent_id?: string
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          language?: string | null
          last_synced?: string | null
          name?: string
          rate_per_minute?: number | null
          retell_agent_id?: string | null
          status?: string | null
          updated_at?: string | null
          voice_model?: string | null
        }
        Relationships: []
      }
      retell_calls: {
        Row: {
          agent_id: string | null
          billing_duration_sec: number
          call_id: string
          call_status: string
          call_summary: string | null
          company_id: string | null
          contact_id: string | null
          cost_usd: number
          created_at: string
          disconnection_reason: string | null
          disposition: string | null
          duration: number | null
          duration_sec: number
          end_timestamp: string | null
          from_number: string | null
          id: string
          latency_ms: number | null
          notes: string | null
          outcome: string | null
          phone_number: string | null
          rate_per_minute: number
          recording_url: string | null
          result_sentiment: Json | null
          retell_agent_id: string | null
          revenue: number | null
          revenue_amount: number
          sentiment: string | null
          sentiment_score: number | null
          start_timestamp: string
          status: string | null
          to_number: string | null
          transcript: string | null
          transcript_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          billing_duration_sec?: number
          call_id: string
          call_status?: string
          call_summary?: string | null
          company_id?: string | null
          contact_id?: string | null
          cost_usd?: number
          created_at?: string
          disconnection_reason?: string | null
          disposition?: string | null
          duration?: number | null
          duration_sec?: number
          end_timestamp?: string | null
          from_number?: string | null
          id?: string
          latency_ms?: number | null
          notes?: string | null
          outcome?: string | null
          phone_number?: string | null
          rate_per_minute?: number
          recording_url?: string | null
          result_sentiment?: Json | null
          retell_agent_id?: string | null
          revenue?: number | null
          revenue_amount?: number
          sentiment?: string | null
          sentiment_score?: number | null
          start_timestamp: string
          status?: string | null
          to_number?: string | null
          transcript?: string | null
          transcript_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          billing_duration_sec?: number
          call_id?: string
          call_status?: string
          call_summary?: string | null
          company_id?: string | null
          contact_id?: string | null
          cost_usd?: number
          created_at?: string
          disconnection_reason?: string | null
          disposition?: string | null
          duration?: number | null
          duration_sec?: number
          end_timestamp?: string | null
          from_number?: string | null
          id?: string
          latency_ms?: number | null
          notes?: string | null
          outcome?: string | null
          phone_number?: string | null
          rate_per_minute?: number
          recording_url?: string | null
          result_sentiment?: Json | null
          retell_agent_id?: string | null
          revenue?: number | null
          revenue_amount?: number
          sentiment?: string | null
          sentiment_score?: number | null
          start_timestamp?: string
          status?: string | null
          to_number?: string | null
          transcript?: string | null
          transcript_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "retell_calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      retell_sync_stats: {
        Row: {
          agents_created: number
          agents_deactivated: number
          agents_updated: number
          created_at: string
          error_message: string | null
          id: string
          sync_completed_at: string | null
          sync_started_at: string
          sync_status: string
          total_agents_fetched: number
        }
        Insert: {
          agents_created?: number
          agents_deactivated?: number
          agents_updated?: number
          created_at?: string
          error_message?: string | null
          id?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          total_agents_fetched?: number
        }
        Update: {
          agents_created?: number
          agents_deactivated?: number
          agents_updated?: number
          created_at?: string
          error_message?: string | null
          id?: string
          sync_completed_at?: string | null
          sync_started_at?: string
          sync_status?: string
          total_agents_fetched?: number
        }
        Relationships: []
      }
      revenue_transactions: {
        Row: {
          agent_id: string | null
          billing_duration_sec: number
          call_id: string | null
          company_id: string
          created_at: string
          id: string
          invoice_id: string | null
          rate_per_minute: number
          revenue_amount: number
          status: string
          transaction_date: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id?: string | null
          billing_duration_sec?: number
          call_id?: string | null
          company_id: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          rate_per_minute?: number
          revenue_amount?: number
          status?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string | null
          billing_duration_sec?: number
          call_id?: string | null
          company_id?: string
          created_at?: string
          id?: string
          invoice_id?: string | null
          rate_per_minute?: number
          revenue_amount?: number
          status?: string
          transaction_date?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "revenue_transactions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["call_id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string | null
          role: string
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invitation_token: string
          invited_by?: string | null
          role?: string
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          role?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          call_id: string | null
          company_id: string
          created_at: string
          description: string | null
          id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          call_id?: string | null
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          call_id?: string | null
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_call_id_fkey"
            columns: ["call_id"]
            isOneToOne: false
            referencedRelation: "calls"
            referencedColumns: ["call_id"]
          },
          {
            foreignKeyName: "transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agent_assignments: {
        Row: {
          agent_id: string | null
          assigned_at: string | null
          assigned_by: string | null
          id: string
          is_primary: boolean | null
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          is_primary?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_agent_assignments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      user_agents: {
        Row: {
          agent_id: string
          company_id: string
          created_at: string
          id: string
          is_primary: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_id: string
          company_id: string
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_id?: string
          company_id?: string
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_agents_agent_id"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_user_agents_company_id"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_balances: {
        Row: {
          balance: number
          company_id: string
          created_at: string
          id: string
          last_updated: string
          user_id: string
          warning_threshold: number | null
        }
        Insert: {
          balance?: number
          company_id: string
          created_at?: string
          id?: string
          last_updated?: string
          user_id: string
          warning_threshold?: number | null
        }
        Update: {
          balance?: number
          company_id?: string
          created_at?: string
          id?: string
          last_updated?: string
          user_id?: string
          warning_threshold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_balances_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_credits: {
        Row: {
          created_at: string | null
          critical_threshold: number | null
          current_balance: number | null
          id: string
          is_blocked: boolean | null
          updated_at: string | null
          user_id: string
          warning_threshold: number | null
        }
        Insert: {
          created_at?: string | null
          critical_threshold?: number | null
          current_balance?: number | null
          id?: string
          is_blocked?: boolean | null
          updated_at?: string | null
          user_id: string
          warning_threshold?: number | null
        }
        Update: {
          created_at?: string | null
          critical_threshold?: number | null
          current_balance?: number | null
          id?: string
          is_blocked?: boolean | null
          updated_at?: string | null
          user_id?: string
          warning_threshold?: number | null
        }
        Relationships: []
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string | null
          created_at: string | null
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          name: string
          role: string
          status: string
          token: string
          user_id: string | null
        }
        Insert: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          invited_by?: string | null
          name: string
          role?: string
          status?: string
          token: string
          user_id?: string | null
        }
        Update: {
          accepted_at?: string | null
          company_id?: string | null
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          name?: string
          role?: string
          status?: string
          token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          created_at: string | null
          dashboard_layout: string | null
          display_units_currency: string | null
          display_units_time: string | null
          email_notifications_agents: boolean | null
          email_notifications_calls: boolean | null
          id: string
          preferred_graph_type: string | null
          theme: string | null
          updated_at: string | null
          user_id: string
          visible_dashboard_cards: Json | null
        }
        Insert: {
          created_at?: string | null
          dashboard_layout?: string | null
          display_units_currency?: string | null
          display_units_time?: string | null
          email_notifications_agents?: boolean | null
          email_notifications_calls?: boolean | null
          id?: string
          preferred_graph_type?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
          visible_dashboard_cards?: Json | null
        }
        Update: {
          created_at?: string | null
          dashboard_layout?: string | null
          display_units_currency?: string | null
          display_units_time?: string | null
          email_notifications_agents?: boolean | null
          email_notifications_calls?: boolean | null
          id?: string
          preferred_graph_type?: string | null
          theme?: string | null
          updated_at?: string | null
          user_id?: string
          visible_dashboard_cards?: Json | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          company_id: string | null
          created_at: string
          email: string
          id: string
          name: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company_id?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          name?: string | null
          role?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      webhook_errors: {
        Row: {
          agent_id: string | null
          call_data: Json | null
          call_id: string | null
          created_at: string | null
          error_details: string | null
          error_type: string
          event_type: string | null
          id: string
          retell_agent_id: string | null
          stack_trace: string | null
        }
        Insert: {
          agent_id?: string | null
          call_data?: Json | null
          call_id?: string | null
          created_at?: string | null
          error_details?: string | null
          error_type: string
          event_type?: string | null
          id?: string
          retell_agent_id?: string | null
          stack_trace?: string | null
        }
        Update: {
          agent_id?: string | null
          call_data?: Json | null
          call_id?: string | null
          created_at?: string | null
          error_details?: string | null
          error_type?: string
          event_type?: string | null
          id?: string
          retell_agent_id?: string | null
          stack_trace?: string | null
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          agent_id: string | null
          call_id: string | null
          company_id: string | null
          cost_usd: number | null
          created_at: string | null
          duration_sec: number | null
          error_message: string | null
          event_type: string
          id: string
          processing_time_ms: number | null
          status: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          call_id?: string | null
          company_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          duration_sec?: number | null
          error_message?: string | null
          event_type: string
          id?: string
          processing_time_ms?: number | null
          status: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          call_id?: string | null
          company_id?: string | null
          cost_usd?: number | null
          created_at?: string | null
          duration_sec?: number | null
          error_message?: string | null
          event_type?: string
          id?: string
          processing_time_ms?: number | null
          status?: string
          user_id?: string | null
        }
        Relationships: []
      }
      white_label_configs: {
        Row: {
          company_id: string
          company_name: string
          created_at: string
          custom_domain: string | null
          email_from_address: string | null
          email_from_name: string | null
          enabled: boolean
          id: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          support_email: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          company_name: string
          created_at?: string
          custom_domain?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          enabled?: boolean
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          created_at?: string
          custom_domain?: string | null
          email_from_address?: string | null
          email_from_name?: string | null
          enabled?: boolean
          id?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          support_email?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "white_label_configs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      admin_user_credits_view: {
        Row: {
          balance_status: string | null
          balance_updated_at: string | null
          critical_threshold: number | null
          current_balance: number | null
          email: string | null
          is_blocked: boolean | null
          name: string | null
          recent_transactions_count: number | null
          user_created_at: string | null
          user_id: string | null
          warning_threshold: number | null
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          company_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string | null
          id: string | null
          invited_by: string | null
          invited_by_avatar: string | null
          invited_by_name: string | null
          role: string | null
          status: string | null
          token: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_stats: {
        Row: {
          created_at: string | null
          critical_threshold: number | null
          current_balance: number | null
          is_blocked: boolean | null
          status: string | null
          total_recharged: number | null
          total_spent: number | null
          total_transactions: number | null
          updated_at: string | null
          user_id: string | null
          warning_threshold: number | null
        }
        Insert: {
          created_at?: string | null
          critical_threshold?: number | null
          current_balance?: number | null
          is_blocked?: boolean | null
          status?: never
          total_recharged?: never
          total_spent?: never
          total_transactions?: never
          updated_at?: string | null
          user_id?: string | null
          warning_threshold?: number | null
        }
        Update: {
          created_at?: string | null
          critical_threshold?: number | null
          current_balance?: number | null
          is_blocked?: boolean | null
          status?: never
          total_recharged?: never
          total_spent?: never
          total_transactions?: never
          updated_at?: string | null
          user_id?: string | null
          warning_threshold?: number | null
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          avg_cost: number | null
          latest_record: string | null
          row_count: number | null
          table_name: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          id: string | null
          name: string | null
          role: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: boolean
      }
      admin_adjust_user_credits: {
        Args: {
          p_user_id: string
          p_amount: number
          p_description: string
          p_admin_id: string
        }
        Returns: Json
      }
      admin_bulk_adjust_credits: {
        Args: {
          p_user_ids: string[]
          p_amount: number
          p_description: string
          p_admin_id: string
        }
        Returns: Json
      }
      admin_change_user_password: {
        Args: {
          target_user_id: string
          new_password: string
          admin_user_id: string
        }
        Returns: Json
      }
      admin_change_user_password_bypass: {
        Args: {
          target_user_id: string
          new_password: string
          admin_user_id: string
        }
        Returns: Json
      }
      admin_service_role_password_change: {
        Args: {
          target_user_email: string
          new_password: string
          admin_user_id: string
        }
        Returns: Json
      }
      admin_superuser_password_change: {
        Args: {
          target_user_id: string
          new_password: string
          admin_user_id: string
        }
        Returns: Json
      }
      admin_update_user_credits: {
        Args: {
          target_user_id: string
          amount_change: number
          description_text?: string
        }
        Returns: {
          success: boolean
          new_balance: number
          message: string
        }[]
      }
      bytea_to_text: {
        Args: { data: string }
        Returns: string
      }
      can_access_company: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      check_auth_users_schema: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      check_rate_limit: {
        Args:
          | Record<PropertyKey, never>
          | { _uid: string; _limit?: number; _window?: unknown }
          | { p_identifier: string; p_action: string; p_limit_per_hour: number }
          | { p_user_id?: string; p_action?: string; p_limit_per_hour?: number }
        Returns: {
          remaining: number
        }[]
      }
      check_storage_buckets: {
        Args: Record<PropertyKey, never>
        Returns: {
          bucket_name: string
          bucket_exists: boolean
        }[]
      }
      check_user_balance_for_call: {
        Args: { p_user_id: string; p_estimated_cost?: number }
        Returns: Json
      }
      check_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      cleanup_user_completely: {
        Args: { email_to_clean: string }
        Returns: Json
      }
      cleanup_user_for_reinvite: {
        Args: { user_id_to_clean: string }
        Returns: Json
      }
      create_profile_for_new_user_simulation: {
        Args: { user_data: Record<string, unknown> }
        Returns: undefined
      }
      debug_user_info: {
        Args: { user_id_param: string }
        Returns: Json
      }
      debug_user_lookup: {
        Args: { lookup_user_id: string }
        Returns: Json
      }
      deduct_call_credits: {
        Args: { call_cost: number; call_id_ref: string }
        Returns: boolean
      }
      delete_registered_user: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      delete_team_member: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      delete_user_completely: {
        Args: { user_id_to_delete: string }
        Returns: Json
      }
      diagnose_user_issue: {
        Args: { user_identifier: string }
        Returns: Json
      }
      emergency_password_change_by_email: {
        Args: {
          target_email: string
          new_password: string
          admin_email: string
        }
        Returns: Json
      }
      force_password_update: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_call_metrics_for_period: {
        Args: {
          company_id_param: string
          start_date_param: string
          end_date_param: string
        }
        Returns: {
          total_calls: number
          total_duration_min: number
          avg_duration_sec: number
          total_cost: number
        }[]
      }
      get_call_outcomes: {
        Args: { company_id_param: string }
        Returns: {
          status_type: string
          count: number
        }[]
      }
      get_call_transactions: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          transaction_id: string
          amount: number
          description: string
          call_id_ref: string
          created_at: string
          transaction_type: string
          balance_after: number
        }[]
      }
      get_company_user_agents: {
        Args: { p_company_id: string }
        Returns: {
          id: string
          user_id: string
          agent_id: string
          company_id: string
          is_primary: boolean
          created_at: string
          updated_at: string
          agent: Json
          user_details: Json
        }[]
      }
      get_cors_headers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_current_user_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_daily_call_distribution: {
        Args: {
          company_id_param: string
          start_date_param: string
          end_date_param: string
        }
        Returns: {
          date: string
          call_count: number
          total_duration_min: number
        }[]
      }
      get_recent_call_transactions: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          transaction_id: string
          amount: number
          description: string
          call_id_ref: string
          created_at: string
          transaction_type: string
          balance_after: number
        }[]
      }
      get_retell_call_metrics: {
        Args: {
          p_company_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          total_calls: number
          total_duration_min: number
          avg_duration_sec: number
          total_cost: number
          total_revenue: number
          success_rate: number
        }[]
      }
      get_retell_call_outcomes: {
        Args: {
          p_company_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          status_type: string
          count: number
        }[]
      }
      get_retell_daily_calls: {
        Args: {
          p_company_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          date: string
          call_count: number
          total_duration_min: number
          total_revenue: number
        }[]
      }
      get_revenue_metrics: {
        Args: {
          p_company_id: string
          p_start_date?: string
          p_end_date?: string
        }
        Returns: {
          total_revenue: number
          total_calls: number
          avg_revenue_per_call: number
          top_performing_agent: string
          revenue_by_day: Json
        }[]
      }
      get_super_admin_call_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          total_calls: number
          total_duration_min: number
          total_cost: number
          total_companies: number
          total_users: number
        }[]
      }
      get_super_admin_companies: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_super_admin_company_metrics: {
        Args: Record<PropertyKey, never>
        Returns: {
          company_id: string
          company_name: string
          total_calls: number
          total_cost: number
          total_users: number
        }[]
      }
      get_user_accessible_agents: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: {
          id: string
          name: string
          description: string
          rate_per_minute: number
          retell_agent_id: string
          avatar_url: string
          status: string
          created_at: string
          updated_at: string
          company_id: string
        }[]
      }
      get_user_balance: {
        Args: { user_id_param?: string }
        Returns: Json
      }
      get_user_balance_detailed: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: {
          balance: number
          warning_threshold: number
          recent_transactions: Json
          remaining_minutes: number
        }[]
      }
      get_user_balance_stats: {
        Args: { p_user_id: string }
        Returns: Json
      }
      get_user_companies: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_company_access: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_user_company_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_company_id_simple: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_company_role: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: string
      }
      get_user_company_simple: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_credit_transactions: {
        Args: { p_user_id: string; p_limit?: number }
        Returns: {
          id: string
          amount: number
          transaction_type: string
          description: string
          balance_after: number
          created_at: string
          created_by_email: string
        }[]
      }
      get_user_credits: {
        Args: { target_user_id?: string }
        Returns: Json
      }
      get_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_primary_agent: {
        Args: { user_email: string }
        Returns: {
          retell_agent_id: string
          agent_name: string
          agent_description: string
        }[]
      }
      get_webhook_health: {
        Args: Record<PropertyKey, never>
        Returns: {
          status: string
          last_hour_calls: number
          recent_calls: number
          health_score: string
          agents_active: number
          last_webhook_time: string
          check_timestamp: string
        }[]
      }
      has_sufficient_balance: {
        Args: { p_user_id: string; p_amount: number }
        Returns: boolean
      }
      http: {
        Args: { request: Database["public"]["CompositeTypes"]["http_request"] }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_delete: {
        Args:
          | { uri: string }
          | { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_get: {
        Args: { uri: string } | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_head: {
        Args: { uri: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_header: {
        Args: { field: string; value: string }
        Returns: Database["public"]["CompositeTypes"]["http_header"]
      }
      http_list_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: {
          curlopt: string
          value: string
        }[]
      }
      http_patch: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_post: {
        Args:
          | { uri: string; content: string; content_type: string }
          | { uri: string; data: Json }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_put: {
        Args: { uri: string; content: string; content_type: string }
        Returns: Database["public"]["CompositeTypes"]["http_response"]
      }
      http_reset_curlopt: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      http_set_curlopt: {
        Args: { curlopt: string; value: string }
        Returns: boolean
      }
      is_company_admin: {
        Args: { p_user_id?: string; p_company_id?: string }
        Returns: boolean
      }
      is_company_owner_direct: {
        Args: { target_company_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: Record<PropertyKey, never> | { user_uuid: string }
        Returns: boolean
      }
      is_super_admin_safe: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      is_user_company_owner_simple: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: boolean
      }
      mark_expired_invitations: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      refund_call_cost: {
        Args: { p_call_uuid: string; p_reason?: string }
        Returns: Json
      }
      simple_password_change: {
        Args: { user_email: string; new_pass: string }
        Returns: string
      }
      simulate_call_for_testing: {
        Args: { p_agent_id: string; p_cost?: number; p_call_id_custom?: string }
        Returns: Json
      }
      simulate_new_user_registration: {
        Args: { user_email: string }
        Returns: Json
      }
      sync_calls: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      test_all_password_methods: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_password_function: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_password_function_v2: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_password_system: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_password_system_v3: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      test_superadmin_password_system: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      text_to_bytea: {
        Args: { data: string }
        Returns: string
      }
      universal_balance_deduction: {
        Args: {
          p_user_id: string
          p_amount: number
          p_call_id?: string
          p_description?: string
        }
        Returns: Json
      }
      update_user_balance: {
        Args: { p_user_id: string; p_company_id: string; p_amount: number }
        Returns: undefined
      }
      update_user_credits: {
        Args: {
          target_user_id: string
          amount_change: number
          description_text?: string
        }
        Returns: {
          success: boolean
          new_balance: number
          message: string
        }[]
      }
      urlencode: {
        Args: { data: Json } | { string: string } | { string: string }
        Returns: string
      }
      user_has_company_access: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      user_is_company_admin: {
        Args: { user_uuid: string; target_company_id: string }
        Returns: boolean
      }
      user_is_company_member: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: boolean
      }
      verify_password: {
        Args: { user_email: string; test_password: string }
        Returns: Json
      }
      webhook_monitor: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      http_header: {
        field: string | null
        value: string | null
      }
      http_request: {
        method: unknown | null
        uri: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content_type: string | null
        content: string | null
      }
      http_response: {
        status: number | null
        content_type: string | null
        headers: Database["public"]["CompositeTypes"]["http_header"][] | null
        content: string | null
      }
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
