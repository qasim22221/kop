import { createClient } from '@supabase/supabase-js';

// Get environment variables with validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set in environment variables');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_ANON_KEY is not set in environment variables');
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

// Validate URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('❌ Invalid NEXT_PUBLIC_SUPABASE_URL format:', supabaseUrl);
  throw new Error('Invalid NEXT_PUBLIC_SUPABASE_URL format');
}

console.log('✅ Supabase client initializing with URL:', supabaseUrl.substring(0, 30) + '...');

// Create Supabase client with additional options for better error handling
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce'
  },
  global: {
    headers: {
      'X-Client-Info': 'referral-app'
    }
  },
  // Add timeout configuration
  db: {
    schema: 'public'
  }
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          email: string;
          referral_code: string;
          referred_by: string | null;
          rank: string;
          fund_wallet_balance: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          email: string;
          referral_code: string;
          referred_by?: string | null;
          rank?: string;
          fund_wallet_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          email?: string;
          referral_code?: string;
          referred_by?: string | null;
          rank?: string;
          fund_wallet_balance?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};