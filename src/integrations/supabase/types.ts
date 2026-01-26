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
      assets: {
        Row: {
          ai_licenses_sold: number | null
          ai_price: number | null
          content: string | null
          created_at: string | null
          description: string | null
          human_licenses_sold: number | null
          human_price: number | null
          id: string
          licensing_enabled: boolean | null
          published_at: string | null
          source_url: string | null
          thumbnail_url: string | null
          title: string
          total_revenue: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          ai_licenses_sold?: number | null
          ai_price?: number | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          human_licenses_sold?: number | null
          human_price?: number | null
          id?: string
          licensing_enabled?: boolean | null
          published_at?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title: string
          total_revenue?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          ai_licenses_sold?: number | null
          ai_price?: number | null
          content?: string | null
          created_at?: string | null
          description?: string | null
          human_licenses_sold?: number | null
          human_price?: number | null
          id?: string
          licensing_enabled?: boolean | null
          published_at?: string | null
          source_url?: string | null
          thumbnail_url?: string | null
          title?: string
          total_revenue?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          created_at: string | null
          display_name: string | null
          id: string
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_name?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      rss_sources: {
        Row: {
          article_count: number | null
          created_at: string | null
          feed_url: string
          id: string
          last_synced_at: string | null
          name: string
          platform: string | null
          sync_status: string | null
          user_id: string
        }
        Insert: {
          article_count?: number | null
          created_at?: string | null
          feed_url: string
          id?: string
          last_synced_at?: string | null
          name: string
          platform?: string | null
          sync_status?: string | null
          user_id: string
        }
        Update: {
          article_count?: number | null
          created_at?: string | null
          feed_url?: string
          id?: string
          last_synced_at?: string | null
          name?: string
          platform?: string | null
          sync_status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          asset_id: string
          buyer_email: string | null
          created_at: string
          id: string
          license_type: string
          publisher_id: string
          status: string
          story_protocol_hash: string | null
        }
        Insert: {
          amount?: number
          asset_id: string
          buyer_email?: string | null
          created_at?: string
          id?: string
          license_type?: string
          publisher_id: string
          status?: string
          story_protocol_hash?: string | null
        }
        Update: {
          amount?: number
          asset_id?: string
          buyer_email?: string | null
          created_at?: string
          id?: string
          license_type?: string
          publisher_id?: string
          status?: string
          story_protocol_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "assets"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist: {
        Row: {
          created_at: string | null
          email: string
          id: string
          role: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          role: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          role?: string
        }
        Relationships: []
      }
      widget_settings: {
        Row: {
          accent_color: string | null
          created_at: string | null
          custom_css: string | null
          embed_key: string | null
          id: string
          show_ai_pricing: boolean | null
          show_human_pricing: boolean | null
          theme: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          embed_key?: string | null
          id?: string
          show_ai_pricing?: boolean | null
          show_human_pricing?: boolean | null
          theme?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string | null
          custom_css?: string | null
          embed_key?: string | null
          id?: string
          show_ai_pricing?: boolean | null
          show_human_pricing?: boolean | null
          theme?: string | null
          updated_at?: string | null
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
