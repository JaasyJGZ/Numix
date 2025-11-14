export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      vendors: {
        Row: {
          id: string
          name: string
          email: string
          password: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          email: string
          password: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          email?: string
          password?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      events: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string
          start_time: string
          end_time: string
          active: boolean
          repeat_daily: boolean
          price_per_time?: number
          status: "active" | "closed_awarded" | "closed_not_awarded"
          first_prize?: string
          second_prize?: string
          third_prize?: string
          awarded_at?: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date: string
          start_time: string
          end_time: string
          active?: boolean
          repeat_daily?: boolean
          price_per_time?: number
          status?: "active" | "closed_awarded" | "closed_not_awarded"
          first_prize?: string
          second_prize?: string
          third_prize?: string
          awarded_at?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string
          start_time?: string
          end_time?: string
          active?: boolean
          repeat_daily?: boolean
          price_per_time?: number
          status?: "active" | "closed_awarded" | "closed_not_awarded"
          first_prize?: string
          second_prize?: string
          third_prize?: string
          awarded_at?: string
          created_at?: string
        }
        Relationships: []
      }
      tickets: {
        Row: {
          id: string
          event_id: string
          client_name: string
          amount: number
          numbers?: string
          vendor_email: string
          rows: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          event_id: string
          client_name: string
          amount: number
          numbers?: string
          vendor_email: string
          rows?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          client_name?: string
          amount?: number
          numbers?: string
          vendor_email?: string
          rows?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      },
      number_limits: {
        Row: {
          id: string
          event_id: string
          number_range: string
          max_times: number
          times_sold: number
          created_at: string
        }
        Insert: {
          id?: string
          event_id: string
          number_range: string
          max_times: number
          times_sold?: number
          created_at?: string
        }
        Update: {
          id?: string
          event_id?: string
          number_range?: string
          max_times?: number
          times_sold?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "number_limits_event_id_fkey"
            columns: ["event_id"]
            referencedRelation: "events"
            referencedColumns: ["id"]
          }
        ]
      },
      ticket_rows: {
        Row: {
          id: string
          ticket_id: string
          times: string
          actions: string
          value: number
          created_at: string
        }
        Insert: {
          id?: string
          ticket_id: string
          times: string
          actions: string
          value: number
          created_at?: string
        }
        Update: {
          id?: string
          ticket_id?: string
          times?: string
          actions?: string
          value?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_rows_ticket_id_fkey"
            columns: ["ticket_id"]
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          }
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

