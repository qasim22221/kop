"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Users, 
  DollarSign, 
  Target, 
  Crown, 
  TrendingUp, 
  Gift, 
  RefreshCw,
  Wallet,
  Shield,
  Clock,
  Star,
  CheckCircle,
  Zap,
  Award,
  BarChart3,
  Activity,
  Sparkles,
  ChevronRight,
  Play,
  Globe,
  Layers,
  Coins,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Eye,
  EyeOff,
  Loader2,
  AlertTriangle,
  Calendar,
  Timer,
  Copy,
  Moon,
  Sun,
  History
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { AnnouncementBanner } from '@/components/AnnouncementBanner';

interface DashboardStats {
  totalEarnings: number;
  directReferrals: number;
  activeReferrals: number;
  currentPool: number;
  poolTimeRemaining: string;
  nextPoolReward: number;
  teamSize: number;
  rank: string;
  accountStatus: string;
  poolStatus: string;
  todayIncome: number;
  yesterdayIncome: number;
  totalWithdrawals: number;
  totalDeposits: number;
  monthlyIncome: number;
  weeklyIncome: number;
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showBalances, setShowBalances] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [poolProgress, setPoolProgress] = useState<number>(0);
  const [darkMode, setDarkMode] = useState(false);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    // Check for dark mode preference
    const isDarkMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Update time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', String(newMode));
    
    if (newMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadDashboardStats();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadDashboardStats = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get yesterday's date range
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // Get this week's date range
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      // Get this month's date range
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Calculate total earnings from referral bonuses
      const { data: bonuses } = await supabase
        .from('referral_bonuses')
        .select('amount, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const totalEarnings = bonuses?.reduce((sum, bonus) => sum + bonus.amount, 0) || 0;

      // Calculate today's income
      const todayIncome = bonuses?.filter(bonus => {
        const bonusDate = new Date(bonus.created_at);
        return bonusDate >= today && bonusDate < tomorrow;
      }).reduce((sum, bonus) => sum + bonus.amount, 0) || 0;

      // Calculate yesterday's income
      const yesterdayIncome = bonuses?.filter(bonus => {
        const bonusDate = new Date(bonus.created_at);
        return bonusDate >= yesterday && bonusDate < today;
      }).reduce((sum, bonus) => sum + bonus.amount, 0) || 0;

      // Calculate weekly income
      const weeklyIncome = bonuses?.filter(bonus => {
        const bonusDate = new Date(bonus.created_at);
        return bonusDate >= startOfWeek && bonusDate < tomorrow;
      }).reduce((sum, bonus) => sum + bonus.amount, 0) || 0;

      // Calculate monthly income
      const monthlyIncome = bonuses?.filter(bonus => {
        const bonusDate = new Date(bonus.created_at);
        return bonusDate >= startOfMonth && bonusDate < tomorrow;
      }).reduce((sum, bonus) => sum + bonus.amount, 0) || 0;

      // Get total withdrawals
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      const totalWithdrawals = withdrawals?.reduce((sum, withdrawal) => sum + withdrawal.amount, 0) || 0;

      // Get total deposits
      const { data: deposits } = await supabase
        .from('deposits')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'confirmed');

      const totalDeposits = deposits?.reduce((sum, deposit) => sum + deposit.amount, 0) || 0;

      // Get team size (direct referrals only)
      const { data: team } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile.referral_code);

      const teamSize = team?.length || 0;

      // Get active direct referrals
      const { data: activeReferrals } = await supabase
        .from('profiles')
        .select('id')
        .eq('referred_by', profile.referral_code)
        .eq('account_status', 'active');

      const activeReferralsCount = activeReferrals?.length || 0;

      // Calculate rank based on active direct referrals
      let rank = 'Starter';
      if (activeReferralsCount >= 10 && teamSize >= 50) {
        rank = 'Ambassador';
      } else if (activeReferralsCount >= 4) {
        rank = 'Diamond';
      } else if (activeReferralsCount >= 2) {
        rank = 'Platinum';
      } else if (activeReferralsCount >= 1) {
        rank = 'Gold';
      }

      // Update profile rank if it has changed
      if (rank !== profile.rank) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ rank })
          .eq('id', profile.id);

        if (updateError) {
          console.error('Error updating rank:', updateError);
        }
      }

      // Get current pool info
      const { data: currentPoolData } = await supabase
        .from('pool_progress')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'expired_needs_referrals'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let poolTimeRemaining = 'No active pool';
      let nextPoolReward = 0;
      let poolSpecificActiveReferrals = 0;
      let poolStatus = 'inactive';

      if (currentPoolData) {
        poolStatus = currentPoolData.status;
        const endTime = new Date(currentPoolData.timer_end);
        const now = new Date();
        const timeDiff = endTime.getTime() - now.getTime();
        
        if (timeDiff > 0) {
          const totalSeconds = Math.floor(timeDiff / 1000);
          const hours = Math.floor(totalSeconds / 3600);
          const minutes = Math.floor((totalSeconds % 3600) / 60);
          const seconds = totalSeconds % 60;
          poolTimeRemaining = `${hours}h ${minutes}m ${seconds}s`;
          
          // Calculate progress percentage (time elapsed)
          const totalTime = currentPoolData.time_limit_minutes * 60 * 1000;
          const timeElapsed = totalTime - timeDiff;
          const progressPercentage = (timeElapsed / totalTime) * 100;
          setPoolProgress(100 - progressPercentage); // Invert to show time remaining
        } else {
          poolTimeRemaining = 'Expired';
          setPoolProgress(0);
        }
        
        nextPoolReward = currentPoolData.pool_amount;
        
        const { data: poolReferrals } = await supabase
          .from('profiles')
          .select('id')
          .eq('referred_by', profile.referral_code)
          .eq('account_status', 'active')
          .eq('assigned_pool_id', currentPoolData.pool_number);

        poolSpecificActiveReferrals = poolReferrals?.length || 0;
      }

      setStats({
        totalEarnings,
        directReferrals: teamSize,
        activeReferrals: poolSpecificActiveReferrals,
        currentPool: profile.current_pool || 0,
        poolTimeRemaining,
        nextPoolReward,
        teamSize,
        rank, // Use the calculated rank
        accountStatus: profile.account_status,
        poolStatus,
        todayIncome,
        yesterdayIncome,
        totalWithdrawals,
        totalDeposits,
        monthlyIncome,
        weeklyIncome
      });

    } catch (err: any) {
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateAccount = () => {
    router.push('/activate');
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour12: true,
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRankIcon = (rank: string) => {
    switch (rank) {
      case 'Starter': return Users;
      case 'Gold': return Star;
      case 'Platinum': return Award;
      case 'Diamond': return Sparkles;
      case 'Ambassador': return Crown;
      default: return Users;
    }
  };

  const getRankColor = (rank: string) => {
    switch (rank) {
      case 'Starter': return 'from-gray-400 to-gray-600';
      case 'Gold': return 'from-yellow-400 to-yellow-600';
      case 'Platinum': return 'from-gray-300 to-gray-500';
      case 'Diamond': return 'from-blue-400 to-blue-600';
      case 'Ambassador': return 'from-purple-400 to-purple-600';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  if (!mounted || authLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <Loader2 className="w-8 h-8 text-blue-400 dark:text-blue-500 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-400 dark:text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Please log in to access the dashboard</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-0 space-y-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Dark Mode Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleDarkMode}
          className="rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-yellow-500" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </Button>
      </div>

      {/* Announcement Banner */}
      <AnnouncementBanner />
      
      <div className="p-4 sm:p-6">
        {/* Status Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start space-x-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700 dark:text-red-400">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start space-x-2 mb-6">
            <CheckCircle className="w-5 h-5 text-green-500 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700 dark:text-green-400">{success}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess('')}
                className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

        {/* Welcome Section with Time */}
        <Card className="bg-gradient-to-r from-slate-50 to-gray-50 dark:from-gray-800 dark:to-gray-900 border-slate-200 dark:border-gray-700 shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div className="mb-4 sm:mb-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Welcome back, {profile.username}! 👋
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                  Ready to grow your network and earn rewards today?
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {formatTime(currentTime)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {formatDate(currentTime)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Activation Alert */}
        {profile.account_status === 'inactive' && (
          <Card className="bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 shadow-xl mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">Activate Your Account</h3>
                    <p className="text-white/90">
                      Activate your account for $21 to start earning and access all features
                    </p>
                  </div>
                </div>
                <Button
                  onClick={handleActivateAccount}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Activate Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Earnings</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    {showBalances ? `$${stats?.totalEarnings?.toFixed(2) || '0.00'}` : '••••'}
                  </p>
                </div>
                <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Direct Referrals</p>
                  <div className="flex items-center">
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400 mr-2">
                      {stats?.directReferrals || 0}
                    </p>
                    <Badge className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs">
                      {stats?.activeReferrals || 0} active
                    </Badge>
                  </div>
                </div>
                <Users className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Pool</p>
                  <div className="flex items-center">
                    <p className="text-lg font-bold text-purple-600 dark:text-purple-400 mr-2">
                      {stats?.currentPool ? `Pool ${stats.currentPool}` : 'None'}
                    </p>
                    {stats?.poolTimeRemaining !== 'No active pool' && stats?.poolTimeRemaining !== 'Expired' && (
                      <Badge className="bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-xs animate-pulse">
                        <Clock className="w-3 h-3 mr-1" />
                        {stats?.poolTimeRemaining}
                      </Badge>
                    )}
                  </div>
                </div>
                <Target className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Rank</p>
                  <div className="flex items-center space-x-1">
                    {(() => {
                      const RankIcon = getRankIcon(stats?.rank || 'Starter');
                      return <RankIcon className="w-4 h-4 text-orange-500 dark:text-orange-400" />;
                    })()}
                    <p className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      {stats?.rank || 'Starter'}
                    </p>
                  </div>
                </div>
                <Crown className="w-5 h-5 text-orange-500 dark:text-orange-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Overview Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Today's Income</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    ${stats?.todayIncome?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <DollarSign className="w-5 h-5 text-green-500 dark:text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Yesterday's Income</p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${stats?.yesterdayIncome?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <History className="w-5 h-5 text-blue-500 dark:text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Withdrawals</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    ${stats?.totalWithdrawals?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <ArrowUpRight className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Deposits</p>
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    ${stats?.totalDeposits?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <ArrowDownRight className="w-5 h-5 text-purple-500 dark:text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Income Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                Weekly Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                ${stats?.weeklyIncome?.toFixed(2) || '0.00'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Income for the current week
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <BarChart3 className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Monthly Income
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                ${stats?.monthlyIncome?.toFixed(2) || '0.00'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Income for the current month
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Wallet Balances */}
          <Card className="bg-gradient-to-br from-orange-50 to-teal-50 dark:from-orange-900/20 dark:to-teal-900/20 backdrop-blur-sm border-orange-100 dark:border-orange-800/50 shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b border-orange-100 dark:border-orange-800/50">
              <CardTitle className="text-lg font-semibold text-orange-900 dark:text-orange-100 flex items-center">
                <Wallet className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                Wallet Balances
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowBalances(!showBalances)}
                className="hover:bg-orange-100 dark:hover:bg-orange-800/50"
              >
                {showBalances ? (
                  <EyeOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                ) : (
                  <Eye className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                )}
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {/* Main Wallet */}
              <div className="bg-gradient-to-r from-orange-100 to-orange-50 dark:from-orange-900/30 dark:to-orange-800/20 rounded-xl p-5 border border-orange-200 dark:border-orange-800/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-orange-200 dark:bg-orange-800/50 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-900 dark:text-orange-100">Main Wallet</h3>
                      <p className="text-sm text-orange-600 dark:text-orange-400">Earnings & Withdrawals</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                      {showBalances ? `$${profile.main_wallet_balance?.toFixed(2) || '0.00'}` : '••••'}
                    </div>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Available Balance</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => router.push('/withdrawal')}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Withdraw
                  </Button>
                  <Button
                    onClick={() => router.push('/transactions')}
                    variant="outline"
                    className="flex-1 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </div>
              </div>

              {/* Fund Wallet */}
              <div className="bg-gradient-to-r from-teal-100 to-teal-50 dark:from-teal-900/30 dark:to-teal-800/20 rounded-xl p-5 border border-teal-200 dark:border-teal-800/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-teal-200 dark:bg-teal-800/50 flex items-center justify-center">
                      <Coins className="w-5 h-5 text-teal-600 dark:text-teal-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-teal-900 dark:text-teal-100">Fund Wallet</h3>
                      <p className="text-sm text-teal-600 dark:text-teal-400">Deposits & Activities</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-teal-900 dark:text-teal-100">
                      {showBalances ? `$${profile.fund_wallet_balance?.toFixed(2) || '0.00'}` : '••••'}
                    </div>
                    <p className="text-sm text-teal-600 dark:text-teal-400">Available Balance</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={() => router.push('/deposit')}
                    className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    <ArrowDownRight className="w-4 h-4 mr-2" />
                    Deposit
                  </Button>
                  <Button
                    onClick={() => router.push('/transactions')}
                    variant="outline"
                    className="flex-1 border-teal-200 dark:border-teal-800 hover:bg-teal-50 dark:hover:bg-teal-900/50 text-teal-700 dark:text-teal-300"
                  >
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-orange-100 dark:border-orange-800/50">
                  <p className="text-xs text-orange-600 dark:text-orange-400 mb-1">Total Deposits</p>
                  <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                    ${stats?.totalDeposits?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-teal-100 dark:border-teal-800/50">
                  <p className="text-xs text-teal-600 dark:text-teal-400 mb-1">Total Withdrawals</p>
                  <p className="text-lg font-bold text-teal-900 dark:text-teal-100">
                    ${stats?.totalWithdrawals?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Pool Status */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Target className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                Pool Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.account_status === 'active' && stats?.currentPool ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">Pool {stats.currentPool}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Reward: ${stats.nextPoolReward}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400 animate-pulse">
                        {stats.poolTimeRemaining}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Direct Referrals</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {stats.activeReferrals + stats.directReferrals} / {stats.currentPool}
                      </span>
                    </div>
                    <Progress 
                      value={(stats.activeReferrals + stats.directReferrals / stats.currentPool) * 100} 
                      className="h-2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Time Remaining</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {stats.poolTimeRemaining} 
                      </span>
                    </div>
                    <Progress 
                      value={poolProgress} 
                      className="h-2 bg-orange-100"
                    />
                  </div>
                  {/* {stats.poolTimeRemaining === 'Expired' && stats.activeReferrals < stats.currentPool && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
                    <p className="text-red-700 text-sm">
                      Pool expired! Add {stats.currentPool} active referral to complete this pool and move to the next.
                    </p>
                  </div>
                )} */}
      
                {stats.poolStatus === 'active' && stats.poolTimeRemaining === 'Expired' && (
          <div className="space-y-3">
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
              <p className="text-red-700 text-sm">
                Pool expired! {stats.activeReferrals < 1 
                  ? 'Add 1 active referral to complete this pool and move to the next.' 
                  : 'Resolve the expired pool to move to the next.'}
              </p>
            </div>
            <Button
              onClick={async () => {
                if (!user || !user.id) {
                  setError('User session not found. Please log in again.');
                  router.push('/login');
                  return;
                }
                console.log('Resolve Expired Pool button clicked', { userId: user.id, currentTime: new Date().toISOString() });
                setIsLoading(true);
                try {
                  const { data, error } = await supabase.rpc('handle_expired_pool', { user_id_param: user.id });
                  console.log('Supabase RPC response:', { data, error });
                  if (error) {
                    console.error('RPC error:', error);
                    throw new Error(error.message || 'Failed to call handle_expired_pool');
                  }
                  if (data.success) {
                    setSuccess(data.message);
                    await loadDashboardStats();
                  } else {
                    setError(data.message);
                  }
                } catch (err: any) {
                  console.error('Error resolving expired pool:', err);
                  setError(`Failed to resolve expired pool: ${err.message || 'Unknown error'}`);
                } finally {
                  setIsLoading(false);
                }
              }}
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-orange-400 to-red-500 hover:from-orange-500 hover:to-red-600 text-white"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Resolve Expired Pool
            </Button>
          </div>
        )}

                  <Button
                    onClick={() => router.push('/pools')}
                    variant="outline"
                    className="w-full border-purple-200 hover:bg-purple-50 text-purple-700"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    View Pool Details
                  </Button>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Pool</h3>
                  <p className="text-gray-600 mb-4">
                    {profile.account_status === 'active' 
                      ? 'You need to complete your current cycle'
                      : 'Activate your account to start earning pool rewards'}
                  </p>
                  {profile.account_status !== 'active' && (
                    <Button
                      onClick={handleActivateAccount}
                      className="bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Activate Account
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Referral Stats */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
                Referral Network
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                      {stats?.directReferrals || 0}
                      
                    </div>
                    <p className="text-sm text-blue-600 dark:text-blue-300">Direct Referrals</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                      {stats?.activeReferrals || 0}
                    </div>
                    <p className="text-sm text-green-600 dark:text-green-300">Active Referrals</p>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900/20 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                    {stats?.teamSize || 0}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Team Size</p>
                </div>

                <div className="flex space-x-2">
                  <Button
                    onClick={() => router.push('/network')}
                    variant="outline"
                    className="flex-1 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    View Network
                  </Button>
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/register?ref=${profile.referral_code}`);
                      setSuccess('Referral link copied to clipboard!');
                    }}
                    className="flex-1 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Link
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Current Rank */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Crown className="w-5 h-5 mr-2 text-orange-600 dark:text-orange-400" />
                Current Rank
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className={`w-16 h-16 rounded-xl flex items-center justify-center bg-gradient-to-r ${getRankColor(stats?.rank || 'Starter')} shadow-lg`}>
                  {(() => {
                    const RankIcon = getRankIcon(stats?.rank || 'Starter');
                    return <RankIcon className="w-8 h-8 text-white" />;
                  })()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{stats?.rank || 'Starter'}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stats?.rank === 'Starter' && 'Just getting started'}
                    {stats?.rank === 'Gold' && '1 direct referral'}
                    {stats?.rank === 'Platinum' && '2 direct referrals'}
                    {stats?.rank === 'Diamond' && '4 direct referrals'}
                    {stats?.rank === 'Ambassador' && '10 direct referrals & 50 team size'}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => router.push('/ranks')}
                variant="outline"
                className="w-full border-orange-200 hover:bg-orange-50 text-orange-700"
              >
                <Crown className="w-4 h-4 mr-2" />
                View Rank Benefits
              </Button>
            </CardContent>
          </Card>

          {/* Income Streams */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" />
                Income Streams
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">Direct Referral</span>
                  </div>
                  <span className="text-sm font-semibold text-green-700 dark:text-green-300">$5</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Level Income</span>
                  </div>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">$0.5</span>
                </div>
                
                <div className="flex items-center justify-between p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                      <Target className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Pool Income</span>
                  </div>
                  <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">$5-$27</span>
                </div>

                <Button
                  onClick={() => router.push('/income')}
                  variant="outline"
                  className="w-full border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  View All Income Streams
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-blue-100 dark:border-blue-900">
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center">
                <Zap className="w-5 h-5 mr-2 text-amber-600 dark:text-amber-400" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => router.push('/deposit')}
                  variant="outline"
                  className="h-auto py-3 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Deposit</div>
                    <div className="text-xs">Add funds</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => router.push('/withdrawal')}
                  variant="outline"
                  className="h-auto py-3 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                >
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Withdraw</div>
                    <div className="text-xs">Get earnings</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => router.push('/network')}
                  variant="outline"
                  className="h-auto py-3 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300"
                >
                  <Users className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Network</div>
                    <div className="text-xs">View team</div>
                  </div>
                </Button>
                
                <Button
                  onClick={() => router.push('/transactions')}
                  variant="outline"
                  className="h-auto py-3 border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300"
                >
                  <Activity className="w-4 h-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">History</div>
                    <div className="text-xs">Transactions</div>
                  </div>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Activation CTA (if inactive) */}
        {profile.account_status === 'inactive' && (
          <Card className="bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 shadow-xl mt-6">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div className="mb-4 md:mb-0">
                  <h3 className="text-xl font-bold text-white mb-2">Your Account is Inactive</h3>
                  <p className="text-white/90 mb-2">
                    Activate your account for $21 to start earning through all 7 income streams
                  </p>
                  <ul className="text-sm text-white/80 space-y-1">
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                      Access to all income streams
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                      Start earning from referrals
                    </li>
                    <li className="flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-white/90" />
                      Enter the pool system
                    </li>
                  </ul>
                </div>
                <div className="flex-shrink-0">
                  <Button
                    onClick={handleActivateAccount}
                    size="lg"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 shadow-lg"
                  >
                    <Zap className="w-5 h-5 mr-2" />
                    Activate for $21
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
