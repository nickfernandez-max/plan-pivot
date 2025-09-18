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
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      products: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          default_product_filter: string | null
          default_team_filter: string | null
          default_timeline_months: number | null
          email: string
          full_name: string | null
          id: string
          preferred_landing_page: string | null
          role: Database["public"]["Enums"]["user_role"]
          team_member_primary_direction: string | null
          team_member_primary_sort: string | null
          team_member_secondary_direction: string | null
          team_member_secondary_sort: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_product_filter?: string | null
          default_team_filter?: string | null
          default_timeline_months?: number | null
          email: string
          full_name?: string | null
          id: string
          preferred_landing_page?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_member_primary_direction?: string | null
          team_member_primary_sort?: string | null
          team_member_secondary_direction?: string | null
          team_member_secondary_sort?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_product_filter?: string | null
          default_team_filter?: string | null
          default_timeline_months?: number | null
          email?: string
          full_name?: string | null
          id?: string
          preferred_landing_page?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          team_member_primary_direction?: string | null
          team_member_primary_sort?: string | null
          team_member_secondary_direction?: string | null
          team_member_secondary_sort?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      project_assignees: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          percent_allocation: number | null
          project_id: string
          start_date: string | null
          team_member_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          percent_allocation?: number | null
          project_id: string
          start_date?: string | null
          team_member_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          percent_allocation?: number | null
          project_id?: string
          start_date?: string | null
          team_member_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assignees_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_assignees_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      project_products: {
        Row: {
          created_at: string
          id: string
          product_id: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          is_rd: boolean
          link: string | null
          name: string
          start_date: string
          status: Database["public"]["Enums"]["project_status"]
          status_visibility: string
          team_id: string
          updated_at: string
          value_score: number
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          is_rd?: boolean
          link?: string | null
          name: string
          start_date: string
          status?: Database["public"]["Enums"]["project_status"]
          status_visibility?: string
          team_id: string
          updated_at?: string
          value_score?: number
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          is_rd?: boolean
          link?: string | null
          name?: string
          start_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          status_visibility?: string
          team_id?: string
          updated_at?: string
          value_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "projects_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          display_name: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_name?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_ideal_sizes: {
        Row: {
          created_at: string
          end_month: string | null
          id: string
          ideal_size: number
          start_month: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_month?: string | null
          id?: string
          ideal_size?: number
          start_month: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_month?: string | null
          id?: string
          ideal_size?: number
          start_month?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          name: string
          position_id: string | null
          role_id: string
          start_date: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position_id?: string | null
          role_id: string
          start_date: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position_id?: string | null
          role_id?: string
          start_date?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships: {
        Row: {
          created_at: string
          end_month: string | null
          id: string
          start_month: string
          team_id: string
          team_member_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_month?: string | null
          id?: string
          start_month: string
          team_id: string
          team_member_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_month?: string | null
          id?: string
          start_month?: string
          team_id?: string
          team_member_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_memberships_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_memberships_team_member_id_fkey"
            columns: ["team_member_id"]
            isOneToOne: false
            referencedRelation: "team_members"
            referencedColumns: ["id"]
          },
        ]
      }
      team_memberships_history: {
        Row: {
          changed_at: string
          end_month: string | null
          id: string
          membership_id: string
          operation: string
          start_month: string | null
          team_id: string
          team_member_id: string
        }
        Insert: {
          changed_at?: string
          end_month?: string | null
          id?: string
          membership_id: string
          operation: string
          start_month?: string | null
          team_id: string
          team_member_id: string
        }
        Update: {
          changed_at?: string
          end_month?: string | null
          id?: string
          membership_id?: string
          operation?: string
          start_month?: string | null
          team_id?: string
          team_member_id?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          archived: boolean
          archived_at: string | null
          color: string | null
          created_at: string
          id: string
          ideal_size: number | null
          name: string
          product_id: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          ideal_size?: number | null
          name: string
          product_id: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          archived_at?: string | null
          color?: string | null
          created_at?: string
          id?: string
          ideal_size?: number | null
          name?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      work_assignments: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          name: string
          percent_allocation: number
          start_date: string
          team_member_id: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          name: string
          percent_allocation?: number
          start_date: string
          team_member_id: string
          type: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          name?: string
          percent_allocation?: number
          start_date?: string
          team_member_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_id?: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
    }
    Enums: {
      project_status:
        | "Logged"
        | "Planned"
        | "In Progress"
        | "Blocked"
        | "On Hold"
        | "Complete"
      user_role: "admin" | "editor" | "viewer"
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
      project_status: [
        "Logged",
        "Planned",
        "In Progress",
        "Blocked",
        "On Hold",
        "Complete",
      ],
      user_role: ["admin", "editor", "viewer"],
    },
  },
} as const
