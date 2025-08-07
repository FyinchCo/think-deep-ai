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
      answer_embeddings: {
        Row: {
          answer_id: string
          created_at: string | null
          domain: string
          embedding: string
        }
        Insert: {
          answer_id: string
          created_at?: string | null
          domain?: string
          embedding: string
        }
        Update: {
          answer_id?: string
          created_at?: string | null
          domain?: string
          embedding?: string
        }
        Relationships: [
          {
            foreignKeyName: "answer_embeddings_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: true
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
        ]
      }
      answers: {
        Row: {
          answer_text: string
          comment_added_at: string | null
          generated_at: string
          generator_model: string | null
          generator_prompt_details: Json | null
          id: string
          is_user_guided: boolean
          is_valid: boolean
          judge_feedback: string | null
          judge_model: string | null
          judge_prompt_details: Json | null
          judge_scores: Json | null
          parent_answer_id: string | null
          rabbit_hole_id: string
          retry_count: number
          step_number: number
          user_comment: string | null
        }
        Insert: {
          answer_text: string
          comment_added_at?: string | null
          generated_at?: string
          generator_model?: string | null
          generator_prompt_details?: Json | null
          id?: string
          is_user_guided?: boolean
          is_valid?: boolean
          judge_feedback?: string | null
          judge_model?: string | null
          judge_prompt_details?: Json | null
          judge_scores?: Json | null
          parent_answer_id?: string | null
          rabbit_hole_id: string
          retry_count?: number
          step_number: number
          user_comment?: string | null
        }
        Update: {
          answer_text?: string
          comment_added_at?: string | null
          generated_at?: string
          generator_model?: string | null
          generator_prompt_details?: Json | null
          id?: string
          is_user_guided?: boolean
          is_valid?: boolean
          judge_feedback?: string | null
          judge_model?: string | null
          judge_prompt_details?: Json | null
          judge_scores?: Json | null
          parent_answer_id?: string | null
          rabbit_hole_id?: string
          retry_count?: number
          step_number?: number
          user_comment?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "answers_parent_answer_id_fkey"
            columns: ["parent_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_rabbit_hole_id_fkey"
            columns: ["rabbit_hole_id"]
            isOneToOne: false
            referencedRelation: "rabbit_holes"
            referencedColumns: ["id"]
          },
        ]
      }
      breakthrough_modes: {
        Row: {
          activated_at: string
          created_at: string
          deactivated_at: string | null
          effectiveness_score: number | null
          id: string
          mode_type: string
          parameters: Json
          rabbit_hole_id: string
          trigger_reason: string
          trigger_step: number
        }
        Insert: {
          activated_at?: string
          created_at?: string
          deactivated_at?: string | null
          effectiveness_score?: number | null
          id?: string
          mode_type: string
          parameters?: Json
          rabbit_hole_id: string
          trigger_reason: string
          trigger_step: number
        }
        Update: {
          activated_at?: string
          created_at?: string
          deactivated_at?: string | null
          effectiveness_score?: number | null
          id?: string
          mode_type?: string
          parameters?: Json
          rabbit_hole_id?: string
          trigger_reason?: string
          trigger_step?: number
        }
        Relationships: [
          {
            foreignKeyName: "breakthrough_modes_rabbit_hole_id_fkey"
            columns: ["rabbit_hole_id"]
            isOneToOne: false
            referencedRelation: "rabbit_holes"
            referencedColumns: ["id"]
          },
        ]
      }
      breakthrough_seeds: {
        Row: {
          breakthrough_score: number
          created_at: string
          domain: string
          id: string
          paradigm_shift_indicators: Json
          peak_step: number | null
          question_text: string
          structural_elements: Json
          total_steps: number | null
          updated_at: string
        }
        Insert: {
          breakthrough_score: number
          created_at?: string
          domain: string
          id?: string
          paradigm_shift_indicators?: Json
          peak_step?: number | null
          question_text: string
          structural_elements?: Json
          total_steps?: number | null
          updated_at?: string
        }
        Update: {
          breakthrough_score?: number
          created_at?: string
          domain?: string
          id?: string
          paradigm_shift_indicators?: Json
          peak_step?: number | null
          question_text?: string
          structural_elements?: Json
          total_steps?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          answer_id: string | null
          event_type: string
          id: string
          payload: Json | null
          rabbit_hole_id: string | null
          timestamp: string
        }
        Insert: {
          answer_id?: string | null
          event_type: string
          id?: string
          payload?: Json | null
          rabbit_hole_id?: string | null
          timestamp?: string
        }
        Update: {
          answer_id?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
          rabbit_hole_id?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_rabbit_hole_id_fkey"
            columns: ["rabbit_hole_id"]
            isOneToOne: false
            referencedRelation: "rabbit_holes"
            referencedColumns: ["id"]
          },
        ]
      }
      exploration_rules: {
        Row: {
          created_at: string
          created_at_step: number
          effectiveness_score: number | null
          id: string
          is_active: boolean
          last_modified_step: number | null
          priority: number
          rabbit_hole_id: string
          rule_text: string
          rule_type: string
          scope: string | null
          trigger_condition: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_at_step?: number
          effectiveness_score?: number | null
          id?: string
          is_active?: boolean
          last_modified_step?: number | null
          priority?: number
          rabbit_hole_id: string
          rule_text: string
          rule_type?: string
          scope?: string | null
          trigger_condition?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_at_step?: number
          effectiveness_score?: number | null
          id?: string
          is_active?: boolean
          last_modified_step?: number | null
          priority?: number
          rabbit_hole_id?: string
          rule_text?: string
          rule_type?: string
          scope?: string | null
          trigger_condition?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      paradigm_shifts: {
        Row: {
          answer_id: string
          conceptual_revolution_markers: Json
          detected_at: string
          id: string
          intensity_score: number
          rabbit_hole_id: string
          shift_type: string
          worldview_alteration_potential: number
        }
        Insert: {
          answer_id: string
          conceptual_revolution_markers?: Json
          detected_at?: string
          id?: string
          intensity_score: number
          rabbit_hole_id: string
          shift_type: string
          worldview_alteration_potential: number
        }
        Update: {
          answer_id?: string
          conceptual_revolution_markers?: Json
          detected_at?: string
          id?: string
          intensity_score?: number
          rabbit_hole_id?: string
          shift_type?: string
          worldview_alteration_potential?: number
        }
        Relationships: [
          {
            foreignKeyName: "paradigm_shifts_answer_id_fkey"
            columns: ["answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paradigm_shifts_rabbit_hole_id_fkey"
            columns: ["rabbit_hole_id"]
            isOneToOne: false
            referencedRelation: "rabbit_holes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      question_architecture: {
        Row: {
          analyzed_at: string
          assumption_inversion_score: number
          breakthrough_potential: number
          constraint_paradox_score: number
          id: string
          meta_cognitive_score: number
          question_text: string
          structural_patterns: Json
          temporal_displacement_score: number
        }
        Insert: {
          analyzed_at?: string
          assumption_inversion_score?: number
          breakthrough_potential?: number
          constraint_paradox_score?: number
          id?: string
          meta_cognitive_score?: number
          question_text: string
          structural_patterns?: Json
          temporal_displacement_score?: number
        }
        Update: {
          analyzed_at?: string
          assumption_inversion_score?: number
          breakthrough_potential?: number
          constraint_paradox_score?: number
          id?: string
          meta_cognitive_score?: number
          question_text?: string
          structural_patterns?: Json
          temporal_displacement_score?: number
        }
        Relationships: []
      }
      rabbit_holes: {
        Row: {
          created_at: string
          domain: string
          id: string
          initial_question: string
          last_updated_at: string
          status: string
          total_steps: number
          user_id: string | null
        }
        Insert: {
          created_at?: string
          domain?: string
          id?: string
          initial_question: string
          last_updated_at?: string
          status?: string
          total_steps?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          initial_question?: string
          last_updated_at?: string
          status?: string
          total_steps?: number
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          description: string | null
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analyze_question_architecture: {
        Args: { question_text: string }
        Returns: Json
      }
      binary_quantize: {
        Args: { "": string } | { "": unknown }
        Returns: unknown
      }
      calculate_abstraction_level: {
        Args: { text_content: string }
        Returns: number
      }
      find_similar_answers: {
        Args: {
          query_embedding: string
          similarity_threshold?: number
          match_count?: number
          filter_domain?: string
        }
        Returns: {
          answer_id: string
          similarity_score: number
          answer_text: string
          domain: string
        }[]
      }
      halfvec_avg: {
        Args: { "": number[] }
        Returns: unknown
      }
      halfvec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      halfvec_send: {
        Args: { "": unknown }
        Returns: string
      }
      halfvec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      hnsw_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnsw_sparsevec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      hnswhandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_bit_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflat_halfvec_support: {
        Args: { "": unknown }
        Returns: unknown
      }
      ivfflathandler: {
        Args: { "": unknown }
        Returns: unknown
      }
      l2_norm: {
        Args: { "": unknown } | { "": unknown }
        Returns: number
      }
      l2_normalize: {
        Args: { "": string } | { "": unknown } | { "": unknown }
        Returns: string
      }
      sparsevec_out: {
        Args: { "": unknown }
        Returns: unknown
      }
      sparsevec_send: {
        Args: { "": unknown }
        Returns: string
      }
      sparsevec_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
      }
      vector_avg: {
        Args: { "": number[] }
        Returns: string
      }
      vector_dims: {
        Args: { "": string } | { "": unknown }
        Returns: number
      }
      vector_norm: {
        Args: { "": string }
        Returns: number
      }
      vector_out: {
        Args: { "": string }
        Returns: unknown
      }
      vector_send: {
        Args: { "": string }
        Returns: string
      }
      vector_typmod_in: {
        Args: { "": unknown[] }
        Returns: number
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
