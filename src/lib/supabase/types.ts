export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type SubscriptionStatus = "active" | "canceled" | "past_due" | "inactive";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          stripe_customer_id: string | null;
          getlate_profile_id: string | null;
          accessible_profile_ids: string[] | null;
          subscription_status: SubscriptionStatus;
          subscription_id: string | null;
          price_id: string | null;
          current_period_end: string | null;
          is_admin: boolean;
          api_key_hash: string | null;
          api_key_created_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          stripe_customer_id?: string | null;
          getlate_profile_id?: string | null;
          accessible_profile_ids?: string[] | null;
          subscription_status?: SubscriptionStatus;
          subscription_id?: string | null;
          price_id?: string | null;
          current_period_end?: string | null;
          is_admin?: boolean;
          api_key_hash?: string | null;
          api_key_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          stripe_customer_id?: string | null;
          getlate_profile_id?: string | null;
          accessible_profile_ids?: string[] | null;
          subscription_status?: SubscriptionStatus;
          subscription_id?: string | null;
          price_id?: string | null;
          current_period_end?: string | null;
          is_admin?: boolean;
          api_key_hash?: string | null;
          api_key_created_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      subscription_status: SubscriptionStatus;
    };
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];
