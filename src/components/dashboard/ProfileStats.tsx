import { motion } from "framer-motion";
import { Wallet, TrendingUp, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ProfileStatsProps {
  totalProfit: number;
  winRate: number;
  totalTrades: number;
}

export const ProfileStats = ({ totalProfit, winRate, totalTrades }: ProfileStatsProps) => {
  const stats = [
    {
      label: "Total Profit",
      value: `€${totalProfit.toFixed(2)}`,
      icon: Wallet,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      label: "Win Rate",
      value: `${winRate.toFixed(1)}%`,
      icon: TrendingUp,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: "Total Trades",
      value: totalTrades.toString(),
      icon: Activity,
      color: "text-gold",
      bgColor: "bg-gold/10",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <Card className="p-6 bg-card border-border">
            <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </Card>
        </motion.div>
      ))}
    </div>
  );
};
