// components/WalletStats.tsx

import {
    Wallet, TrendingUp, ArrowUpRight, ArrowDownRight,
    Banknote, Coins, Sparkles
  } from 'lucide-react';
  
  interface WalletStatsProps {
    stats: {
      totalEarnings?: number;
      totalDeposit?: number;
      totalWithdrawal?: number;
      levelIncome?: number;
      sponsorIncome?: number;
      todayIncome?: number;
      yesterdayIncome?: number;
    };
  }
  
  const WalletStats = ({ stats }: WalletStatsProps) => {
    const cards = [
      { title: "Today's Income", value: stats.todayIncome, icon: <ArrowUpRight />, color: 'from-orange-400 to-orange-600' },
      { title: "Yesterday's Income", value: stats.yesterdayIncome, icon: <ArrowDownRight />, color: 'from-orange-300 to-orange-500' },
      { title: "Total Deposit", value: stats.totalDeposit, icon: <Banknote />, color: 'from-cyan-400 to-cyan-600' },
      { title: "Total Withdrawal", value: stats.totalWithdrawal, icon: <Coins />, color: 'from-cyan-300 to-cyan-500' },
      { title: "Total Income", value: stats.totalEarnings, icon: <TrendingUp />, color: 'from-teal-400 to-teal-600' },
      { title: "Level Income", value: stats.levelIncome, icon: <Sparkles />, color: 'from-indigo-400 to-indigo-600' },
      { title: "Sponsor/Rank Income", value: stats.sponsorIncome, icon: <Wallet />, color: 'from-purple-400 to-purple-600' },
    ];
  
    return (
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 sm:p-4">
        {cards.map((card, idx) => (
          <div
            key={idx}
            className={`rounded-xl shadow-md p-4 text-white bg-gradient-to-r ${card.color} flex items-center justify-between`}
          >
            <div>
              <p className="text-sm font-medium">{card.title}</p>
              <p className="text-xl font-bold">₹{card.value?.toLocaleString() ?? '0'}</p>
            </div>
            <div className="text-3xl opacity-70">{card.icon}</div>
          </div>
        ))}
      </section>
    );
  };
  
  export default WalletStats;
  