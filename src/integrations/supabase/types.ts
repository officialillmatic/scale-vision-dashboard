export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
          company_id: string
          cost_usd: number
          disconnection_reason: string | null
          disposition: string | null
          duration_sec: number
          from: string
          from_number: string | null
          id: string
          latency_ms: number | null
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
          user_id: string
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
          company_id: string
          cost_usd?: number
          disconnection_reason?: string | null
          disposition?: string | null
          duration_sec?: number
          from?: string
          from_number?: string | null
          id?: string
          latency_ms?: number | null
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
          user_id: string
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
          company_id?: string
          cost_usd?: number
          disconnection_reason?: string | null
          disposition?: string | null
          duration_sec?: number
          from?: string
          from_number?: string | null
          id?: string
          latency_ms?: number | null
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
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calls_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_calls_agent_id"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
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
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          status?: string | null
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
            foreignKeyName: "retell_calls_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "retell_agents"
            referencedColumns: ["id"]
          },
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
            referencedRelation: "retell_agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agent_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_agent_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
          created_at: string
          email: string
          id: string
          name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          id: string
          name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      users: {
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
      performance_metrics: {
        Row: {
          avg_cost: number | null
          latest_record: string | null
          row_count: number | null
          table_name: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { p_token: string; p_user_id: string }
        Returns: boolean
      }
      can_access_company: {
        Args: { p_company_id: string }
        Returns: boolean
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
        Args: { p_user_id: string }
        Returns: number
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
      is_company_admin: {
        Args: { p_user_id?: string; p_company_id?: string }
        Returns: boolean
      }
      is_company_owner_direct: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      is_super_admin: {
        Args: { check_user_id?: string }
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
      sync_calls: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      update_user_balance: {
        Args: { p_user_id: string; p_company_id: string; p_amount: number }
        Returns: undefined
      }
      user_has_company_access: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      user_is_company_admin: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: boolean
      }
      user_is_company_member: {
        Args: { p_user_id: string; p_company_id: string }
        Returns: boolean
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
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
