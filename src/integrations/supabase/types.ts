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
      coach_feedback: {
        Row: {
          created_at: string
          id: string
          message_id: string
          rating: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message_id: string
          rating: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message_id?: string
          rating?: string
          user_id?: string
        }
        Relationships: []
      }
      coach_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_logs: {
        Row: {
          created_at: string
          date: string
          focus_score: number | null
          id: string
          medication_taken: string | null
          mood_score: number | null
          note: string | null
          sleep_hours: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          focus_score?: number | null
          id?: string
          medication_taken?: string | null
          mood_score?: number | null
          note?: string | null
          sleep_hours?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          focus_score?: number | null
          id?: string
          medication_taken?: string | null
          mood_score?: number | null
          note?: string | null
          sleep_hours?: string | null
          user_id?: string
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          actual_duration: number | null
          created_at: string
          energy_before: string | null
          id: string
          outcome_rating: string | null
          planned_duration: number
          task_name: string | null
          user_id: string
        }
        Insert: {
          actual_duration?: number | null
          created_at?: string
          energy_before?: string | null
          id?: string
          outcome_rating?: string | null
          planned_duration?: number
          task_name?: string | null
          user_id: string
        }
        Update: {
          actual_duration?: number | null
          created_at?: string
          energy_before?: string | null
          id?: string
          outcome_rating?: string | null
          planned_duration?: number
          task_name?: string | null
          user_id?: string
        }
        Relationships: []
      }
      habit_logs: {
        Row: {
          created_at: string
          date: string
          habit_id: string
          id: string
          is_bad_day_mode: boolean
          is_complete: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          habit_id: string
          id?: string
          is_bad_day_mode?: boolean
          is_complete?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          habit_id?: string
          id?: string
          is_bad_day_mode?: boolean
          is_complete?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "habit_logs_habit_id_fkey"
            columns: ["habit_id"]
            isOneToOne: false
            referencedRelation: "habits"
            referencedColumns: ["id"]
          },
        ]
      }
      habits: {
        Row: {
          created_at: string
          duration_mins: number
          id: string
          mvp_fallback: string | null
          name: string
          order_index: number
          routine_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          duration_mins?: number
          id?: string
          mvp_fallback?: string | null
          name: string
          order_index?: number
          routine_name?: string
          user_id: string
        }
        Update: {
          created_at?: string
          duration_mins?: number
          id?: string
          mvp_fallback?: string | null
          name?: string
          order_index?: number
          routine_name?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          display_order: number | null
          ease: string | null
          energy_level: string
          id: string
          is_complete: boolean
          micro_first_step: string | null
          priority: string | null
          quadrant_score: number | null
          tab: string
          time_estimate_mins: number
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          display_order?: number | null
          ease?: string | null
          energy_level?: string
          id?: string
          is_complete?: boolean
          micro_first_step?: string | null
          priority?: string | null
          quadrant_score?: number | null
          tab?: string
          time_estimate_mins?: number
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          display_order?: number | null
          ease?: string | null
          energy_level?: string
          id?: string
          is_complete?: boolean
          micro_first_step?: string | null
          priority?: string | null
          quadrant_score?: number | null
          tab?: string
          time_estimate_mins?: number
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      thought_chapters: {
        Row: {
          chapter_number: number
          created_at: string
          entry_count: number
          generated_at: string
          id: string
          name: string
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chapter_number?: number
          created_at?: string
          entry_count?: number
          generated_at?: string
          id?: string
          name: string
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chapter_number?: number
          created_at?: string
          entry_count?: number
          generated_at?: string
          id?: string
          name?: string
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      thought_entries: {
        Row: {
          breakdown: string[]
          chapter_id: string | null
          created_at: string
          crystallized: string | null
          hidden_question: string | null
          id: string
          is_saved: boolean
          raw_thought: string
          tones: string[]
          updated_at: string
          user_id: string
          word_cloud_data: Json
        }
        Insert: {
          breakdown?: string[]
          chapter_id?: string | null
          created_at?: string
          crystallized?: string | null
          hidden_question?: string | null
          id?: string
          is_saved?: boolean
          raw_thought: string
          tones?: string[]
          updated_at?: string
          user_id: string
          word_cloud_data?: Json
        }
        Update: {
          breakdown?: string[]
          chapter_id?: string | null
          created_at?: string
          crystallized?: string | null
          hidden_question?: string | null
          id?: string
          is_saved?: boolean
          raw_thought?: string
          tones?: string[]
          updated_at?: string
          user_id?: string
          word_cloud_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "thought_entries_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "thought_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profile: {
        Row: {
          adhd_traits: Json
          anchor_time: string | null
          coach_tone: string
          created_at: string
          focus_mode_preference: string
          id: string
          last_active_date: string | null
          name: string | null
          notifications_enabled: boolean
          onboarding_complete: boolean
          streak_count: number
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          adhd_traits?: Json
          anchor_time?: string | null
          coach_tone?: string
          created_at?: string
          focus_mode_preference?: string
          id?: string
          last_active_date?: string | null
          name?: string | null
          notifications_enabled?: boolean
          onboarding_complete?: boolean
          streak_count?: number
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          adhd_traits?: Json
          anchor_time?: string | null
          coach_tone?: string
          created_at?: string
          focus_mode_preference?: string
          id?: string
          last_active_date?: string | null
          name?: string | null
          notifications_enabled?: boolean
          onboarding_complete?: boolean
          streak_count?: number
          timezone?: string | null
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
