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
      budget_transactions: {
        Row: {
          amount: number
          budget_id: string
          description: string | null
          food_analysis_id: string | null
          id: string
          transaction_date: string | null
        }
        Insert: {
          amount: number
          budget_id: string
          description?: string | null
          food_analysis_id?: string | null
          id?: string
          transaction_date?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string
          description?: string | null
          food_analysis_id?: string | null
          id?: string
          transaction_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "budget_transactions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "user_budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budget_transactions_food_analysis_id_fkey"
            columns: ["food_analysis_id"]
            isOneToOne: false
            referencedRelation: "food_analysis_history"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          id: string
          user_id: string
          contact_user_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          contact_user_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          contact_user_id?: string
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_contact_user_id_fkey"
            columns: ["contact_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_users: {
        Row: {
          country_code: string
          created_at: string | null
          id: string
          is_verified: boolean | null
          phone_number: string
          user_id: string
          verification_code: string | null
          verification_expires_at: string | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          phone_number: string
          user_id: string
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          id?: string
          is_verified?: boolean | null
          phone_number?: string
          user_id?: string
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_users_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          avatar_url: string | null
          conversation_type: string
          created_at: string | null
          created_by: string | null
          id: string
          name: string | null
          last_message_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          conversation_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          last_message_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          conversation_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          name?: string | null
          last_message_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_progress: {
        Row: {
          budget_spent: number | null
          calories_consumed: number | null
          calories_goal: number | null
          created_at: string | null
          id: string
          meals_logged: number | null
          progress_date: string
          recipes_cooked: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          budget_spent?: number | null
          calories_consumed?: number | null
          calories_goal?: number | null
          created_at?: string | null
          id?: string
          meals_logged?: number | null
          progress_date: string
          recipes_cooked?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          budget_spent?: number | null
          calories_consumed?: number | null
          calories_goal?: number | null
          created_at?: string | null
          id?: string
          meals_logged?: number | null
          progress_date?: string
          recipes_cooked?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_analysis_history: {
        Row: {
          analysis_type: string | null
          analyzed_at: string | null
          calories_consumed: number | null
          food_item_id: string | null
          id: string
          image_url: string | null
          meal_type: string | null
          notes: string | null
          price_paid: number | null
          user_id: string
        }
        Insert: {
          analysis_type?: string | null
          analyzed_at?: string | null
          calories_consumed?: number | null
          food_item_id?: string | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          notes?: string | null
          price_paid?: number | null
          user_id: string
        }
        Update: {
          analysis_type?: string | null
          analyzed_at?: string | null
          calories_consumed?: number | null
          food_item_id?: string | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          notes?: string | null
          price_paid?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "food_analysis_history_food_item_id_fkey"
            columns: ["food_item_id"]
            isOneToOne: false
            referencedRelation: "food_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "food_analysis_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      food_items: {
        Row: {
          barcode: string | null
          calories: number | null
          carbs: number | null
          category: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          fat: number | null
          fiber: number | null
          health_rating: number | null
          id: string
          image_url: string | null
          name: string
          price: number | null
          protein: number | null
          serving_size: string | null
          sugar: number | null
        }
        Insert: {
          barcode?: string | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fat?: number | null
          fiber?: number | null
          health_rating?: number | null
          id?: string
          image_url?: string | null
          name: string
          price?: number | null
          protein?: number | null
          serving_size?: string | null
          sugar?: number | null
        }
        Update: {
          barcode?: string | null
          calories?: number | null
          carbs?: number | null
          category?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          fat?: number | null
          fiber?: number | null
          health_rating?: number | null
          id?: string
          image_url?: string | null
          name?: string
          price?: number | null
          protein?: number | null
          serving_size?: string | null
          sugar?: number | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string | null
          conversation_id: string
          created_at: string | null
          id: string
          read_at: string | null
          delivered_at: string | null
          message_type: string
          metadata: Json | null
          sender_id: string
          is_read: boolean
        }
        Insert: {
          content?: string | null
          conversation_id: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          delivered_at?: string | null
          message_type: string
          metadata?: Json | null
          sender_id: string
          is_read?: boolean
        }
        Update: {
          content?: string | null
          conversation_id?: string
          created_at?: string | null
          id?: string
          read_at?: string | null
          delivered_at?: string | null
          message_type?: string
          metadata?: Json | null
          sender_id?: string
          is_read?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      meals: {
        Row: {
          calories: number | null
          carbs: number | null
          created_at: string | null
          cuisine_type: string | null
          description: string | null
          fat: number | null
          id: string
          image_url: string | null
          meal_type: string | null
          name: string
          protein: number | null
        }
        Insert: {
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          name: string
          protein?: number | null
        }
        Update: {
          calories?: number | null
          carbs?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          fat?: number | null
          id?: string
          image_url?: string | null
          meal_type?: string | null
          name?: string
          protein?: number | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          notification_type: string
          title: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type: string
          title?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          notification_type?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_responses: {
        Row: {
          age: number | null
          budget: number | null
          calorie_flexibility: string | null
          cooking_skill: string | null
          created_at: string | null
          daily_meal_frequency: string | null
          daily_calorie_goal: number | null
          dietary_lifestyle: string[] | null
          full_name: string | null
          gender: string | null
          goal: string | null
          weight_kg: number | null
          height_cm: number | null
        }
        Insert: {
          age?: number | null
          budget?: number | null
          calorie_flexibility?: string | null
          cooking_skill?: string | null
          created_at?: string | null
          daily_meal_frequency?: string | null
          daily_calorie_goal?: number | null
          dietary_lifestyle?: string[] | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          liked_foods?: string[] | null
          meal_prep_time?: string | null
          preferences?: string[] | null
          preferred_cuisines?: string[] | null
          restrictions?: string[] | null
          target?: number | null
          updated_at?: string | null
          user_id: string
          weight?: number | null
        }
        Update: {
          age?: number | null
          budget?: number | null
          calorie_flexibility?: string | null
          cooking_skill?: string | null
          created_at?: string | null
          daily_meal_frequency?: string | null
          daily_calorie_goal?: number | null
          dietary_lifestyle?: string[] | null
          full_name?: string | null
          gender?: string | null
          goal?: string | null
          height?: number | null
          id?: string
          liked_foods?: string[] | null
          meal_prep_time?: string | null
          preferences?: string[] | null
          preferred_cuisines?: string[] | null
          restrictions?: string[] | null
          target?: number | null
          updated_at?: string | null
          user_id?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      progress_measurements: {
        Row: {
          created_at: string | null
          height: number | null
          id: string
          measurement_date: string
          notes: string | null
          user_id: string
          weight: number
        }
        Insert: {
          created_at?: string | null
          height?: number | null
          id?: string
          measurement_date: string
          notes?: string | null
          user_id: string
          weight: number
        }
        Update: {
          created_at?: string | null
          height?: number | null
          id?: string
          measurement_date?: string
          notes?: string | null
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "progress_measurements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          carbs: number | null
          cook_time: number | null
          created_at: string | null
          cuisine_type: string | null
          description: string | null
          difficulty: string | null
          fat: number | null
          id: string
          image_url: string
          ingredients: Json | null
          instructions: string[] | null
          name: string
          prep_time: number | null
          protein: number | null
          servings: number | null
          tags: string[] | null
          total_calories: number | null
        }
        Insert: {
          carbs?: number | null
          cook_time?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          difficulty?: string | null
          fat?: number | null
          id?: string
          image_url: string
          ingredients?: Json | null
          instructions?: string[] | null
          name: string
          prep_time?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          total_calories?: number | null
        }
        Update: {
          carbs?: number | null
          cook_time?: number | null
          created_at?: string | null
          cuisine_type?: string | null
          description?: string | null
          difficulty?: string | null
          fat?: number | null
          id?: string
          image_url?: string
          ingredients?: Json | null
          instructions?: string[] | null
          name?: string
          prep_time?: number | null
          protein?: number | null
          servings?: number | null
          tags?: string[] | null
          total_calories?: number | null
        }
        Relationships: []
      }
      user_budgets: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          period_end: string
          period_start: string
          remaining_budget: number
          total_budget: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          period_end: string
          period_start: string
          remaining_budget: number
          total_budget: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          period_end?: string
          period_start?: string
          remaining_budget?: number
          total_budget?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_budgets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          goal_calories: number | null
          id: string
          onboarding_completed: boolean | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          goal_calories?: number | null
          id: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          goal_calories?: number | null
          id?: string
          onboarding_completed?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_recipe_interactions: {
        Row: {
          id: string
          interacted_at: string | null
          interaction_type: string
          notes: string | null
          rating: number | null
          recipe_id: string
          user_id: string
        }
        Insert: {
          id?: string
          interacted_at?: string | null
          interaction_type: string
          notes?: string | null
          rating?: number | null
          recipe_id: string
          user_id: string
        }
        Update: {
          id?: string
          interacted_at?: string | null
          interaction_type?: string
          notes?: string | null
          rating?: number | null
          recipe_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_recipe_interactions_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recipe_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          currency: string | null
          id: string
          language: string | null
          push_notifications_enabled: boolean | null
          subscription_expires_at: string | null
          subscription_status: string | null
          theme: string | null
          timezone: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          push_notifications_enabled?: boolean | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          currency?: string | null
          id?: string
          language?: string | null
          push_notifications_enabled?: boolean | null
          subscription_expires_at?: string | null
          subscription_status?: string | null
          theme?: string | null
          timezone?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
