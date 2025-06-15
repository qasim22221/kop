"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  Target, 
  Crown, 
  TrendingUp, 
  Gift, 
  RefreshCw,
  Wallet,
  CreditCard,
  Activity,
  Calendar,
  Clock,
  Star,
  Award,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Minus,
  Eye,
  EyeOff,
  ChevronRight,
  Timer,
  AlertCircle,
  CheckCircle,
  Loader2,
  Send,
  Download,
  History,
  BarChart3,
  Globe,
  Sparkles,
  X,
  Coins,
  TrendingDown,
  ArrowRight,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

interface DashboardStats {
  totalIncome: number;
  totalWithdrawal: number;
  todayEarnings: number;
  yesterdayEarnings: number;
  totalReferrals: number;
  activeReferrals: number;
  mainWalletBalance: number;
  fundWalletBalance: number;
  currentPool: number;
  poolTimeRemaining: number;
  poolAmount: number;
  poolRequirement: number;
  directReferralIncome: number;
  levelIncome: number;
  poolIncome: number;
  rankSponsorIncome: number;
  globalTurnoverIncome: number;
  teamRewards: number;
  recycleIncome: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  status: string;
  reference?: string;
}

interface ActivationReward {
  isEligible: boolean;
  isOpen: boolean;
  amount: number;
  claimed: boolean;
  type: 'activation' | 'reactivation';
}

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [showBalances, setShowBalances] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [activationReward, setActivationReward] = useState<ActivationReward>({
    isEligible: false,
    isOpen: false,
    amount: 0,
    claimed: false,
    type: 'activation'
  });
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [showRewardAnimation, setShowRewardAnimation] = useState(false);
  
  const { user, profile, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.push('/login');
    } else if (mounted && !authLoading && user && profile) {
      loadDashboardData();
      checkActivationReward();
    }
  }, [user, profile, authLoading, mounted, router]);

  const loadDashboardData = async () => {
    if (!user || !profile) return;

    setIsLoading(true);
    try {
      await Promise.all([
        loadDashboardStats(),
        loadRecentTransactions()
      ]);
    } catch (err: any) {
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboardStats = async () => {
    if (!user || !profile) return;

    try {
      // Get all income data
      const { data: incomeData } = await supabase
        .from('referral_bonuses')
        .select('bonus_type, amount, created_at')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Get pool income
      const { data: poolData } = await supabase
        .from('pool_progress')
        .select('reward_paid, completed_at')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Get withdrawal data
      const { data: withdrawalData } = await supabase
        .from('withdrawals')
        .select('amount')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      // Get P2P sent data
      const { data: p2pSentData } = await supabase
        .from('p2p_transfers')
        .select('amount')
        .eq('sender_id', user.id)
        .eq('status', 'completed');

      // Get activation costs
      const { data: activationData } = await supabase
        .from('fund_wallet_transactions')
        .select('amount')
        .eq('user_id', user.id)
        .eq('transaction_type', 'activation');

      // Get current pool info
      const { data: currentPoolData } = await supabase
        .from('pool_progress')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .single();

      // Calculate totals
      const allIncome = (incomeData || []).reduce((sum, item) => sum + item.amount, 0);
      const poolIncome = (poolData || []).reduce((sum, item) => sum + item.reward_paid, 0);
      const totalIncome = allIncome + poolIncome + (profile.fund_wallet_balance || 0); // Include deposits

      const totalWithdrawal = (withdrawalData || []).reduce((sum, item) => sum + item.amount, 0) +
                             (p2pSentData || []).reduce((sum, item) => sum + item.amount, 0) +
                             Math.abs((activationData || []).reduce((sum, item) => sum + item.amount, 0));

      // Calculate today and yesterday earnings
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const todayEarnings = (incomeData || [])
        .filter(item => new Date(item.created_at) >= today)
        .reduce((sum, item) => sum + item.amount, 0);

      const yesterdayEarnings = (incomeData || [])
        .filter(item => {
          const date = new Date(item.created_at);
          return date >= yesterday && date < today;
        })
        .reduce((sum, item) => sum + item.amount, 0);

      // Calculate income by type
      const incomeByType = (incomeData || []).reduce((acc, item) => {
        acc[item.bonus_type] = (acc[item.bonus_type] || 0) + item.amount;
        return acc;
      }, {} as Record<string, number>);

      // Pool timer calculation
      let poolTimeRemaining = 0;
      if (currentPoolData) {
        const endTime = new Date(currentPoolData.timer_end).getTime();
        const now = Date.now();
        poolTimeRemaining = Math.max(0, endTime - now);
      }

      setDashboardStats({
        totalIncome,
        totalWithdrawal,
        todayEarnings,
        yesterdayEarnings,
        totalReferrals: profile.total_direct_referrals || 0,
        activeReferrals: profile.active_direct_referrals || 0,
        mainWalletBalance: profile.main_wallet_balance || 0,
        fundWalletBalance: profile.fund_wallet_balance || 0,
        currentPool: profile.current_pool || 0,
        poolTimeRemaining,
        poolAmount: currentPoolData?.pool_amount || 0,
        poolRequirement: currentPoolData?.direct_referral_requirement || 0,
        directReferralIncome: incomeByType['direct_referral'] || 0,
        levelIncome: incomeByType['level_income'] || 0,
        poolIncome,
        rankSponsorIncome: incomeByType['rank_sponsor_income'] || 0,
        globalTurnoverIncome: incomeByType['global_turnover_income'] || 0,
        teamRewards: incomeByType['team_rewards'] || 0,
        recycleIncome: incomeByType['recycle_income'] || 0,
      });

    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
    }
  };

  const loadRecentTransactions = async () => {
    if (!user) return;

    try {
      // Get recent transactions from multiple sources
      const [bonuses, poolRewards, deposits, withdrawals, p2pTransfers] = await Promise.all([
        supabase
          .from('referral_bonuses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10),
        
        supabase
          .from('pool_progress')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('fund_wallet_transactions')
          .select('*')
          .eq('user_id', user.id)
          .in('transaction_type', ['deposit', 'activation'])
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase
          .from('withdrawals')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5),
        
        supabase.rpc('get_user_transfer_history', {
          user_id_param: user.id,
          limit_param: 5
        })
      ]);

      const transactions: RecentTransaction[] = [];

      // Add bonuses
      (bonuses.data || []).forEach(bonus => {
        transactions.push({
          id: bonus.id,
          type: bonus.bonus_type,
          amount: bonus.amount,
          description: bonus.description,
          date: bonus.created_at,
          status: 'completed'
        });
      });

      // Add pool rewards
      (poolRewards.data || []).forEach(pool => {
        transactions.push({
          id: pool.id,
          type: 'pool_reward',
          amount: pool.reward_paid,
          description: `Pool ${pool.pool_number} completion reward`,
          date: pool.completed_at,
          status: 'completed'
        });
      });

      // Add deposits and activations
      (deposits.data || []).forEach(deposit => {
        transactions.push({
          id: deposit.id,
          type: deposit.transaction_type,
          amount: Math.abs(deposit.amount),
          description: deposit.description,
          date: deposit.created_at,
          status: 'completed'
        });
      });

      // Add withdrawals
      (withdrawals.data || []).forEach(withdrawal => {
        transactions.push({
          id: withdrawal.id,
          type: 'withdrawal',
          amount: -withdrawal.amount,
          description: `Withdrawal to ${withdrawal.address_label}`,
          date: withdrawal.created_at,
          status: withdrawal.status
        });
      });

      // Add P2P transfers
      (p2pTransfers.data || []).forEach(transfer => {
        transactions.push({
          id: transfer.id,
          type: transfer.is_sender ? 'p2p_send' : 'p2p_receive',
          amount: transfer.is_sender ? -transfer.amount : transfer.net_amount,
          description: transfer.description,
          date: transfer.created_at,
          status: transfer.status
        });
      });

      // Sort by date and take most recent
      transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setRecentTransactions(transactions.slice(0, 15));

    } catch (err: any) {
      console.error('Error loading recent transactions:', err);
    }
  };

  const checkActivationReward = async () => {
    if (!user || !profile) return;

    try {
      // Check if user just activated or reactivated
      const isNewlyActivated = profile.account_status === 'active' && 
                              profile.activation_date && 
                              new Date(profile.activation_date).getTime() > Date.now() - 5 * 60 * 1000; // Within 5 minutes

      // Check if user has claimed activation reward - use maybeSingle() instead of single()
      const { data: rewardClaimed } = await supabase
        .from('referral_bonuses')
        .select('id')
        .eq('user_id', user.id)
        .eq('bonus_type', 'activation_reward')
        .maybeSingle();

      // Check if user has claimed reactivation reward - use maybeSingle() instead of single()
      const { data: reactivationRewardClaimed } = await supabase
        .from('referral_bonuses')
        .select('id')
        .eq('user_id', user.id)
        .eq('bonus_type', 'reactivation_reward')
        .maybeSingle();

      const isFirstActivation = !profile.first_reactivation_claimed;
      const isReactivation = profile.first_reactivation_claimed && profile.cycle_completed_at;

      if (isNewlyActivated) {
        if (isFirstActivation && !rewardClaimed) {
          setActivationReward({
            isEligible: true,
            isOpen: false,
            amount: Math.floor(Math.random() * 3) + 3, // $3-$5
            claimed: false,
            type: 'activation'
          });
        } else if (isReactivation && !reactivationRewardClaimed) {
          setActivationReward({
            isEligible: true,
            isOpen: false,
            amount: Math.floor(Math.random() * 3) + 3, // $3-$5
            claimed: false,
            type: 'reactivation'
          });
        }
      }
    } catch (err: any) {
      console.error('Error checking activation reward:', err);
    }
  };

  const claimActivationReward = async () => {
    if (!user || !activationReward.isEligible || activationReward.claimed) return;

    setIsClaimingReward(true);
    try {
      // Award the activation reward
      const { error } = await supabase
        .from('referral_bonuses')
        .insert({
          user_id: user.id,
          bonus_type: activationReward.type === 'activation' ? 'activation_reward' : 'reactivation_reward',
          amount: activationReward.amount,
          description: `${activationReward.type === 'activation' ? 'Activation' : 'Reactivation'} reward bonus`,
          status: 'completed'
        });

      if (error) {
        throw new Error(error.message);
      }

      // Update main wallet balance
      await supabase
        .from('profiles')
        .update({ 
          main_wallet_balance: (dashboardStats?.mainWalletBalance || 0) + activationReward.amount 
        })
        .eq('id', user.id);

      setShowRewardAnimation(true);
      setActivationReward(prev => ({ ...prev, claimed: true }));
      setSuccess(`🎉 Congratulations! You received $${activationReward.amount} ${activationReward.type} reward!`);

      // Hide reward box after animation
      setTimeout(() => {
        setActivationReward(prev => ({ ...prev, isEligible: false, isOpen: false }));
        setShowRewardAnimation(false);
      }, 3000);

      // Reload dashboard data
      await loadDashboardData();

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsClaimingReward(false);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const days = Math.floor(totalSeconds / (24 * 3600));
    const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'direct_referral':
      case 'activation_bonus':
      case 'reactivation_bonus':
        return Users;
      case 'level_income':
        return BarChart3;
      case 'pool_reward':
        return Target;
      case 'rank_sponsor_income':
        return Crown;
      case 'global_turnover_income':
        return Globe;
      case 'team_rewards':
        return Gift;
      case 'recycle_income':
        return RefreshCw;
      case 'deposit':
        return Download;
      case 'withdrawal':
        return ArrowUpRight;
      case 'p2p_send':
        return Send;
      case 'p2p_receive':
        return ArrowDownRight;
      case 'activation':
        return Zap;
      default:
        return DollarSign;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-600';
    } else {
      return 'text-red-600';
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (!mounted || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-4">Please log in to access your dashboard</p>
          <Button onClick={() => router.push('/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Status Messages */}
      {error && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-700">{error}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="text-red-600 hover:text-red-700 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="max-w-7xl mx-auto">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-2">
            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-green-700">{success}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSuccess('')}
                className="text-green-600 hover:text-green-700 p-0 h-auto mt-1"
              >
                Dismiss
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Activation Reward Box */}
      {activationReward.isEligible && !activationReward.claimed && (
        <div className="fixed top-20 right-4 z-50">
          {!activationReward.isOpen ? (
            <div 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl shadow-2xl cursor-pointer transform hover:scale-105 transition-all duration-300 animate-pulse"
              onClick={() => setActivationReward(prev => ({ ...prev, isOpen: true }))}
            >
              <div className="flex items-center space-x-2">
                <Gift className="w-6 h-6" />
                <span className="font-bold">Reward Available!</span>
              </div>
            </div>
          ) : (
            <div className={`bg-white rounded-xl shadow-2xl border-2 border-yellow-400 p-6 w-80 transform transition-all duration-500 ${
              showRewardAnimation ? 'animate-bounce' : 'animate-in slide-in-from-right'
            }`}>
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  🎉 {activationReward.type === 'activation' ? 'Activation' : 'Reactivation'} Reward!
                </h3>
                <p className="text-gray-600 mb-4">
                  Congratulations! You've earned a special reward.
                </p>
                <div className="text-3xl font-bold text-yellow-600 mb-4">
                  ${activationReward.amount}
                </div>
                <div className="flex space-x-2">
                  <Button
                    onClick={claimActivationReward}
                    disabled={isClaimingReward}
                    className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 text-white"
                  >
                    {isClaimingReward ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Gift className="w-4 h-4 mr-2" />
                    )}
                    Claim Reward
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setActivationReward(prev => ({ ...prev, isOpen: false }))}
                    className="border-gray-300"
                  >
                    Maybe Later
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Income</p>
                  <p className="text-lg font-bold text-green-600">
                    {showBalances ? `$${dashboardStats?.totalIncome.toFixed(2) || '0.00'}` : '••••'}
                  </p>
                </div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Withdrawal</p>
                  <p className="text-lg font-bold text-red-600">
                    {showBalances ? `$${dashboardStats?.totalWithdrawal.toFixed(2) || '0.00'}` : '••••'}
                  </p>
                </div>
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Today Earnings</p>
                  <p className="text-lg font-bold text-blue-600">
                    {showBalances ? `$${dashboardStats?.todayEarnings.toFixed(2) || '0.00'}` : '••••'}
                  </p>
                </div>
                <Calendar className="w-5 h-5 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Yesterday</p>
                  <p className="text-lg font-bold text-purple-600">
                    {showBalances ? `$${dashboardStats?.yesterdayEarnings.toFixed(2) || '0.00'}` : '••••'}
                  </p>
                </div>
                <Clock className="w-5 h-5 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Total Referrals</p>
                  <p className="text-lg font-bold text-orange-600">
                    {dashboardStats?.totalReferrals || 0}
                  </p>
                </div>
                <Users className="w-5 h-5 text-orange-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-blue-100 hover:shadow-lg transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Active Referrals</p>
                  <p className="text-lg font-bold text-teal-600">
                    {dashboardStats?.activeReferrals || 0}
                  </p>
                </div>
                <Activity className="w-5 h-5 text-teal-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Wallet Balances */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card 
            className="bg-gradient-to-br from-green-400 to-emerald-500 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={() => router.push('/transactions')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Main Wallet</h3>
                    <p className="text-white/80 text-sm">Earnings & Withdrawals</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {showBalances ? `$${dashboardStats?.mainWalletBalance.toFixed(2) || '0.00'}` : '••••••'}
              </div>
              <p className="text-white/80 text-sm">Available for withdrawal</p>
            </CardContent>
          </Card>

          <Card 
            className="bg-gradient-to-br from-blue-400 to-cyan-500 text-white border-0 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:scale-105"
            onClick={() => router.push('/deposit')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Fund Wallet</h3>
                    <p className="text-white/80 text-sm">Deposits & Activities</p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-white/80" />
              </div>
              <div className="text-3xl font-bold text-white mb-2">
                {showBalances ? `$${dashboardStats?.fundWalletBalance.toFixed(2) || '0.00'}` : '••••••'}
              </div>
              <p className="text-white/80 text-sm">Available for activities</p>
            </CardContent>
          </Card>
        </div>

        {/* Pool Progress - Mobile Responsive */}
        {profile.account_status === 'active' && dashboardStats?.currentPool > 0 && (
          <Card className="bg-gradient-to-br from-purple-400 to-pink-500 text-white border-0 shadow-xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                <div className="flex items-center space-x-3 mb-4 sm:mb-0">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <Target className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-white">Pool {dashboardStats.currentPool}</h3>
                    <p className="text-white/80 text-sm">Reward: ${dashboardStats.poolAmount}</p>
                  </div>
                </div>
                <Button
                  onClick={() => router.push('/pools')}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30 w-full sm:w-auto"
                >
                  View Details
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white/10 rounded-lg">
                  <div className="text-lg sm:text-xl font-bold text-white">
                    {dashboardStats.poolTimeRemaining > 0 ? formatTime(dashboardStats.poolTimeRemaining) : 'Expired'}
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm">Time Remaining</p>
                </div>
                <div className="text-center p-3 bg-white/10 rounded-lg">
                  <div className="text-lg sm:text-xl font-bold text-white">
                    {dashboardStats.activeReferrals}/{dashboardStats.poolRequirement}
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm">Referrals Required</p>
                </div>
                <div className="text-center p-3 bg-white/10 rounded-lg">
                  <div className="text-lg sm:text-xl font-bold text-white">
                    {dashboardStats.activeReferrals >= dashboardStats.poolRequirement ? '✅' : '⏳'}
                  </div>
                  <p className="text-white/80 text-xs sm:text-sm">Status</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Seven Income Streams */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2 text-blue-600" />
              Seven Income Streams
            </CardTitle>
            <CardDescription>
              Click on any stream to view detailed income history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-emerald-200 hover:border-emerald-300 bg-emerald-50"
                onClick={() => router.push('/income?tab=transactions&filter=direct_referral')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Users className="w-5 h-5 text-emerald-600" />
                    <ArrowRight className="w-4 h-4 text-emerald-500" />
                  </div>
                  <h4 className="font-semibold text-emerald-900 mb-1">Direct Referral</h4>
                  <p className="text-2xl font-bold text-emerald-700">
                    ${showBalances ? dashboardStats?.directReferralIncome.toFixed(2) || '0.00' : '••••'}
                  </p>
                  <p className="text-emerald-600 text-xs">$5 per referral</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-blue-200 hover:border-blue-300 bg-blue-50"
                onClick={() => router.push('/income?tab=transactions&filter=level_income')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <ArrowRight className="w-4 h-4 text-blue-500" />
                  </div>
                  <h4 className="font-semibold text-blue-900 mb-1">Level Income</h4>
                  <p className="text-2xl font-bold text-blue-700">
                    ${showBalances ? dashboardStats?.levelIncome.toFixed(2) || '0.00' : '••••'}
                  </p>
                  <p className="text-blue-600 text-xs">$0.5 per level</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-orange-200 hover:border-orange-300 bg-orange-50"
                onClick={() => router.push('/pools')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="w-5 h-5 text-orange-600" />
                    <ArrowRight className="w-4 h-4 text-orange-500" />
                  </div>
                  <h4 className="font-semibold text-orange-900 mb-1">Pool Income</h4>
                  <p className="text-2xl font-bold text-orange-700">
                    ${showBalances ? dashboardStats?.poolIncome.toFixed(2) || '0.00' : '••••'}
                  </p>
                  <p className="text-orange-600 text-xs">$5-$27 rewards</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-purple-200 hover:border-purple-300 bg-purple-50"
                onClick={() => router.push('/ranks')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Crown className="w-5 h-5 text-purple-600" />
                    <ArrowRight className="w-4 h-4 text-purple-500" />
                  </div>
                  <h4 className="font-semibold text-purple-900 mb-1">Rank Sponsor</h4>
                  <p className="text-2xl font-bold text-purple-700">
                    ${showBalances ? dashboardStats?.rankSponsorIncome.toFixed(2) || '0.00' : '••••'}
                  </p>
                  <p className="text-purple-600 text-xs">$1-$4 bonuses</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-teal-200 hover:border-teal-300 bg-teal-50"
                onClick={() => router.push('/global-turnover')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Globe className="w-5 h-5 text-teal-600" />
                    <ArrowRight className="w-4 h-4 text-teal-500" />
                  </div>
                  <h4 className="font-semibold text-teal-900 mb-1">Global Turnover</h4>
                  <p className="text-2xl font-bold text-teal-700">
                    ${showBalances ? dashboardStats?.globalTurnoverIncome.toFixed(2) || '0.00' : '•••'}
                  </p>
                  <p className="text-teal-600 text-xs">1-2% daily</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-pink-200 hover:border-pink-300 bg-pink-50"
                onClick={() => router.push('/ranks?tab=rewards')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Gift className="w-5 h-5 text-pink-600" />
                    <ArrowRight className="w-4 h-4 text-pink-500" />
                  </div>
                  <h4 className="font-semibold text-pink-900 mb-1">Team Rewards</h4>
                  <p className="text-2xl font-bold text-pink-700">
                    ${showBalances ? dashboardStats?.teamRewards.toFixed(2) || '0.00' : '•••'}
                  </p>
                  <p className="text-pink-600 text-xs">$10-$5,000</p>
                </CardContent>
              </Card>

              <Card 
                className="hover:shadow-lg transition-all duration-300 cursor-pointer border-amber-200 hover:border-amber-300 bg-amber-50"
                onClick={() => router.push('/recycle')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <RefreshCw className="w-5 h-5 text-amber-600" />
                    <ArrowRight className="w-4 h-4 text-amber-500" />
                  </div>
                  <h4 className="font-semibold text-amber-900 mb-1">Recycle Income</h4>
                  <p className="text-2xl font-bold text-amber-700">
                    ${showBalances ? dashboardStats?.recycleIncome.toFixed(2) || '0.00' : '••••'}
                  </p>
                  <p className="text-amber-600 text-xs">$5 first time</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="bg-white/80 backdrop-blur-sm border-blue-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <History className="w-5 h-5 mr-2 text-blue-600" />
                Recent Transactions
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/transactions')}
                className="border-blue-200 hover:bg-blue-50"
              >
                View All
                <ExternalLink className="w-4 h-4 ml-2" />
              </Button>
            </div>
            <CardDescription>
              Complete history of all your transactions and earnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentTransactions.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No transactions yet</h3>
                <p className="text-gray-600">Your transaction history will appear here</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentTransactions.map((transaction) => {
                  const TransactionIcon = getTransactionIcon(transaction.type);
                  const isPositive = transaction.amount > 0;
                  
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          isPositive ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          <TransactionIcon className={`w-5 h-5 ${
                            isPositive ? 'text-green-600' : 'text-red-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 text-sm">
                            {transaction.description}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {new Date(transaction.date).toLocaleDateString()} • {transaction.status}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${getTransactionColor(transaction.type, transaction.amount)}`}>
                          {isPositive ? '+' : ''}${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                        {transaction.reference && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(transaction.reference!)}
                            className="p-0 h-auto text-xs text-gray-500 hover:text-gray-700"
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => router.push('/network')}
            className="h-16 bg-gradient-to-r from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 text-white flex flex-col items-center justify-center space-y-1"
          >
            <Users className="w-5 h-5" />
            <span className="text-sm">My Network</span>
          </Button>

          <Button
            onClick={() => router.push('/deposit')}
            className="h-16 bg-gradient-to-r from-green-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white flex flex-col items-center justify-center space-y-1"
          >
            <Download className="w-5 h-5" />
            <span className="text-sm">Deposit</span>
          </Button>

          <Button
            onClick={() => router.push('/withdrawal')}
            className="h-16 bg-gradient-to-r from-orange-400 to-orange-600 hover:from-orange-500 hover:to-orange-700 text-white flex flex-col items-center justify-center space-y-1"
          >
            <ArrowUpRight className="w-5 h-5" />
            <span className="text-sm">Withdraw</span>
          </Button>

          <Button
            onClick={() => router.push('/p2p-transfer')}
            className="h-16 bg-gradient-to-r from-purple-400 to-purple-600 hover:from-purple-500 hover:to-purple-700 text-white flex flex-col items-center justify-center space-y-1"
          >
            <Send className="w-5 h-5" />
            <span className="text-sm">P2P Transfer</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
