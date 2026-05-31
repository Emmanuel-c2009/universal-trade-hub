import { motion } from "framer-motion";
import { Wallet, Gift, Target, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";

interface BalanceCardsProps {
  fundingBalance: number;
  bonusBalance: number;
  challengesBalance: number;
  todayPnl: number;
  todayPnlPercent: number;
}

export const BalanceCards = ({
  fundingBalance,
  bonusBalance,
  challengesBalance,
  todayPnl,
  todayPnlPercent,
}: BalanceCardsProps) => {
  const totalAssets = fundingBalance + bonusBalance + challengesBalance;

  const balances = [
    {
      label: "Funding Balance",
      value: fundingBalance,
      icon: Wallet,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: "Bonus Balance",
      value: bonusBalance,
      icon: Gift,
      color: "text-gold",
      bgColor: "bg-gold/10",
    },
    {
      label: "Challenges Balance",
      value: challengesBalance,
      icon: Target,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Total Assets */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="p-8 bg-gradient-to-br from-secondary/20 to-gold/20 border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg text-muted-foreground">Total Assets</h3>
            <Wallet className="w-6 h-6 text-gold" />
          </div>
          <p className="text-5xl font-bold mb-4">€{totalAssets.toFixed(2)}</p>
          <div className="flex items-center gap-2">
            <TrendingUp
              className={`w-5 h-5 ${todayPnl >= 0 ? "text-green-500" : "text-red-500"}`}
            />
            <span className={`text-lg font-semibold ${todayPnl >= 0 ? "text-green-500" : "text-red-500"}`}>
              {todayPnl >= 0 ? "+" : ""}€{todayPnl.toFixed(2)} ({todayPnl >= 0 ? "+" : ""}
              {todayPnlPercent.toFixed(2)}%)
            </span>
            <span className="text-muted-foreground">Today's P&L</span>
          </div>
        </Card>
      </motion.div>

      {/* Individual Balances */}
      <div className="grid gap-4 md:grid-cols-3">
        {balances.map((balance, index) => (
          <motion.div
            key={balance.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 + 0.2 }}
          >
            <Card className="p-6 bg-card border-border hover:shadow-lg transition-shadow">
              <div className={`w-12 h-12 rounded-xl ${balance.bgColor} flex items-center justify-center mb-4`}>
                <balance.icon className={`w-6 h-6 ${balance.color}`} />
              </div>
              <p className="text-sm text-muted-foreground mb-2">{balance.label}</p>
              <p className="text-2xl font-bold">€{balance.value.toFixed(2)}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
