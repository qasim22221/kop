import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  referral_code: string;
  referred_by: string | null;
  rank: string;
  transaction_pin?: string;
  account_status: 'active' | 'inactive' | 'passive';
  fund_wallet_balance: number;
  main_wallet_balance: number;
  current_pool: number;
  total_direct_referrals?: number;
  active_direct_referrals?: number;
  activation_date?: string;
  activation_reward_claimed?: boolean;
  first_reactivation_claimed?: boolean;
  cycle_completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      console.log('📡 Fetching profile for user:', userId);
      setError(null);
      
      // Check if supabase is available
      if (!supabase) {
        console.error('❌ Supabase client not available for profile fetch');
        setProfile(null);
        setLoading(false);
        setError('Supabase client not available');
        return;
      }
      
      // Test database connectivity with AbortController for timeout
      const connectionController = new AbortController();
      const connectionTimeoutId = setTimeout(() => connectionController.abort(), 12000);

      try {
        const { error: connectionError } = await supabase
          .from('profiles')
          .select('count', { count: 'exact', head: true })
          .limit(1)
          .abortSignal(connectionController.signal);

        clearTimeout(connectionTimeoutId);

        if (connectionError) {
          console.error('❌ Database connection error:', connectionError);
          setProfile(null);
          setLoading(false);
          
          let errorMessage = `Database connection failed: ${connectionError.message}`;
          if (connectionError.message.includes('timeout') || connectionError.message.includes('abort')) {
            errorMessage += ' - Database may be slow or unreachable.';
          }
          setError(errorMessage);
          return;
        }
      } catch (abortError) {
        clearTimeout(connectionTimeoutId);
        if (abortError instanceof Error && abortError.name === 'AbortError') {
          console.error('❌ Database connection timeout');
          setProfile(null);
          setLoading(false);
          setError('Database connection timeout - Database may be slow or unreachable.');
          return;
        }
        throw abortError;
      }

      // Fetch the actual profile with timeout
      const queryController = new AbortController();
      const queryTimeoutId = setTimeout(() => queryController.abort(), 12000);

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        clearTimeout(queryTimeoutId);

        if (error) {
          console.error('❌ Error fetching profile:', error);
          setProfile(null);
          setLoading(false);
          setError(`Profile fetch error: ${error.message}`);
          return;
        }

        if (!data) {
          console.warn('⚠️ No profile found for user:', userId);
          setProfile(null);
          setError('No profile found - you may need to complete registration');
        } else {
          console.log('✅ Profile fetched successfully:', data.username);
          
          // Sanitize the profile data to ensure all required fields have proper values
          const sanitizedProfile: UserProfile = {
            id: data.id || userId,
            username: data.username || '',
            email: data.email || '',
            referral_code: data.referral_code || '',
            referred_by: data.referred_by || null,
            rank: data.rank || 'Bronze',
            transaction_pin: data.transaction_pin || undefined,
            account_status: data.account_status || 'inactive',
            fund_wallet_balance: Number(data.fund_wallet_balance) || 0,
            main_wallet_balance: Number(data.main_wallet_balance) || 0,
            current_pool: Number(data.current_pool) || 1,
            total_direct_referrals: Number(data.total_direct_referrals) || 0,
            active_direct_referrals: Number(data.active_direct_referrals) || 0,
            activation_date: data.activation_date || undefined,
            activation_reward_claimed: Boolean(data.activation_reward_claimed) || false,
            first_reactivation_claimed: Boolean(data.first_reactivation_claimed) || false,
            cycle_completed_at: data.cycle_completed_at || null,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          };
          
          setProfile(sanitizedProfile);
          setError(null);
        }
      } catch (abortError) {
        clearTimeout(queryTimeoutId);
        if (abortError instanceof Error && abortError.name === 'AbortError') {
          console.error('❌ Profile fetch timeout');
          setProfile(null);
          setLoading(false);
          setError('Profile fetch timeout - Database query timed out.');
          return;
        }
        throw abortError;
      }
    } catch (error: any) {
      console.error('❌ Profile fetch error:', error);
      setProfile(null);
      
      let errorMessage = `Profile fetch failed: ${error.message}`;
      if (error.message.includes('timeout') || error.message.includes('abort')) {
        errorMessage += ' - Database query timed out.';
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let initializationTimeout: NodeJS.Timeout | null = null;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const initializeAuth = async () => {
      try {
        console.log('🔄 Initializing auth...');
        setError(null);
        
        // Check if supabase client exists
        if (!supabase) {
          console.error('❌ Supabase client not initialized');
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            setInitialized(true);
            setError('Supabase client not initialized - check environment variables');
          }
          return;
        }

        // Check environment variables more thoroughly
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
          console.error('❌ Missing Supabase environment variables');
          console.error('URL exists:', !!supabaseUrl);
          console.error('Key exists:', !!supabaseKey);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            setInitialized(true);
            setError('Missing Supabase environment variables - check .env.local file');
          }
          return;
        }

        // Validate URL format
        try {
          new URL(supabaseUrl);
        } catch (urlError) {
          console.error('❌ Invalid Supabase URL format:', supabaseUrl);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            setInitialized(true);
            setError('Invalid Supabase URL format - check NEXT_PUBLIC_SUPABASE_URL');
          }
          return;
        }
        
        // Set initialization timeout
        initializationTimeout = setTimeout(() => {
          if (mounted && !initialized) {
            console.log('⏰ Auth initialization timeout, setting as initialized');
            setLoading(false);
            setInitialized(true);
            setError('Authentication initialization timeout - check your Supabase connection. Visit /test-connection for detailed diagnostics.');
          }
        }, 12000);
        
        // Test basic connectivity with AbortController
        console.log('🔍 Testing basic Supabase connectivity...');
        const connectivityController = new AbortController();
        const connectivityTimeoutId = setTimeout(() => connectivityController.abort(), 12000);

        let session;
        let sessionError;

        try {
          const result = await supabase.auth.getSession();
          session = result.data.session;
          sessionError = result.error;
          clearTimeout(connectivityTimeoutId);
        } catch (abortError) {
          clearTimeout(connectivityTimeoutId);
          if (abortError instanceof Error && abortError.name === 'AbortError') {
            console.error('❌ Connectivity test timeout');
            if (mounted) {
              setUser(null);
              setProfile(null);
              setLoading(false);
              setInitialized(true);
              setError('Connectivity test timeout - Your Supabase instance may be unreachable. Visit /test-connection for diagnostics.');
              if (initializationTimeout) clearTimeout(initializationTimeout);
            }
            return;
          }
          throw abortError;
        }
        
        if (sessionError) {
          console.error('❌ Error getting session:', sessionError);
          if (mounted) {
            setUser(null);
            setProfile(null);
            setLoading(false);
            setInitialized(true);
            setError(`Session error: ${sessionError.message}. Check your Supabase configuration.`);
            if (initializationTimeout) clearTimeout(initializationTimeout);
          }
          return;
        }

        console.log('📋 Initial session retrieved successfully:', session?.user?.id || 'No user');

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (!mounted) return;

          console.log('🔄 Auth state changed:', event, session?.user?.id || 'No user');
          
          // Check if the user's email is verified
          if (session?.user && !session.user.email_confirmed_at) {
            console.log('❌ User email not verified, not setting user state');
            setUser(null);
            setProfile(null);
            setError(null);
            setLoading(false);
            return;
          }
          
          setUser(session?.user ?? null);
          setError(null);
          
          if (session?.user) {
            console.log('👤 User authenticated, fetching profile...');
            await fetchProfile(session.user.id);
          } else {
            console.log('🚫 User signed out');
            setProfile(null);
            setLoading(false);
          }
        });

        authSubscription = subscription;

        if (mounted) {
          // Only set the user if their email is verified
          if (session?.user && session.user.email_confirmed_at) {
            setUser(session.user);
            
            if (session.user) {
              console.log('👤 User found, fetching profile...');
              await fetchProfile(session.user.id);
            } else {
              console.log('🚫 No user, setting loading to false');
              setProfile(null);
              setLoading(false);
            }
          } else if (session?.user) {
            console.log('❌ User email not verified, not setting user state');
            setUser(null);
            setProfile(null);
            setLoading(false);
          } else {
            console.log('🚫 No user, setting loading to false');
            setUser(null);
            setProfile(null);
            setLoading(false);
          }
          
          setInitialized(true);
          if (initializationTimeout) clearTimeout(initializationTimeout);
        }
      } catch (error: any) {
        console.error('❌ Auth initialization error:', error);
        if (mounted) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          setInitialized(true);
          
          // Provide more specific error messages
          let errorMessage = `Initialization error: ${error.message}`;
          if (error.message.includes('timeout') || error.message.includes('abort')) {
            errorMessage += ' - Your Supabase instance may be unreachable. Visit /test-connection for diagnostics.';
          } else if (error.message.includes('fetch')) {
            errorMessage += ' - Network connectivity issue. Check your internet connection and Supabase URL.';
          }
          
          setError(errorMessage);
          if (initializationTimeout) {
            clearTimeout(initializationTimeout);
          }
        }
      }
    };

    // Initialize auth
    initializeAuth();

    return () => {
      mounted = false;
      if (initializationTimeout) {
        clearTimeout(initializationTimeout);
      }
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, [fetchProfile]);

  const signOut = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔄 Signing out...');
      
      if (!supabase) {
        console.error('❌ Supabase client not available for sign out');
        setError('Supabase client not available');
        return;
      }
      
      // Add timeout to sign out with AbortController
      const signOutController = new AbortController();
      const signOutTimeoutId = setTimeout(() => signOutController.abort(), 12000);

      try {
        const { error } = await supabase.auth.signOut();
        clearTimeout(signOutTimeoutId);
        
        if (error) {
          console.error('❌ Error signing out:', error);
          setError(`Sign out error: ${error.message}`);
          throw error;
        }
        console.log('✅ Signed out successfully');
        
        // Clear state immediately
        setUser(null);
        setProfile(null);
        setError(null);
      } catch (abortError) {
        clearTimeout(signOutTimeoutId);
        if (abortError instanceof Error && abortError.name === 'AbortError') {
          console.error('❌ Sign out timeout');
          setError('Sign out timeout - Please try again.');
          throw new Error('Sign out timeout');
        }
        throw abortError;
      }
    } catch (error: any) {
      console.error('❌ Sign out error:', error);
      setError(`Sign out failed: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const refetchProfile = useCallback(() => {
    return user ? fetchProfile(user.id) : Promise.resolve();
  }, [user, fetchProfile]);

  // Don't return loading state until auth is initialized
  const isLoading = !initialized || loading;

  return {
    user,
    profile,
    loading: isLoading,
    error,
    signOut,
    refetchProfile,
  };
}