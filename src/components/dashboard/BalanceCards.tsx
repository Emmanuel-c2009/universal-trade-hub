import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

interface BalanceCardsProps {
  fundingBalance: number;
  bonusBalance: number;
  challengesBalance: number;
  todayPnl: number;
  todayPnlPercent: number;
}

const CoinsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <ellipse cx="12" cy="7" rx="7" ry="3" stroke="currentColor" strokeWidth="1.5" />
    <path
      d="M5 7v4c0 1.66 3.13 3 7 3s7-1.34 7-3V7"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
    <path
      d="M5 11v4c0 1.66 3.13 3 7 3s7-1.34 7-3v-4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />
  </svg>
);

const TokenIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 2.5l8.5 6.2-3.25 10.3h-10.5L3.5 8.7 12 2.5z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
    <path d="M12 2.5v16.5M3.5 8.7h17M8 19l4-16.5 4 16.5" stroke="currentColor" strokeWidth="1" strokeOpacity="0.5" />
  </svg>
);

const ProgressBarsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect x="4" y="14" width="3.5" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="10.25" y="9" width="3.5" height="11" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
    <rect x="16.5" y="4" width="3.5" height="16" rx="0.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

export const BalanceCards = ({
  fundingBalance,
  bonusBalance,
  challengesBalance,
  todayPnl,
  todayPnlPercent,
}: BalanceCardsProps) => {
  const { t } = useTranslation();
  const totalAssets = fundingBalance + bonusBalance + challengesBalance;
  const isPositive = todayPnl >= 0;

  const balances = [
    {
      label: t("balance_card.funding_balance"),
      value: fundingBalance,
      icon: CoinsIcon,
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      label: t("balance_card.bonus_balance"),
      value: bonusBalance,
      icon: TokenIcon,
      color: "text-gold",
      bgColor: "bg-gold/10",
    },
    {
      label: t("balance_card.challenges_balance"),
      value: challengesBalance,
      icon: ProgressBarsIcon,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
  ];

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {/* Total Assets */}
      <Card className="p-8 bg-gradient-to-br from-secondary/15 to-gold/15 border-border">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm text-muted-foreground">{t("balance_card.total_assets")}</h3>
          <CoinsIcon className="w-5 h-5 text-gold" />
        </div>
        <p className="text-5xl font-bold mb-4 tabular-nums tracking-tight">
          €{totalAssets.toFixed(2)}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold tabular-nums ${
              isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
            }`}
          >
            <TrendingUp className={`w-3.5 h-3.5 ${isPositive ? "" : "rotate-180"}`} />
            {isPositive ? "+" : ""}€{todayPnl.toFixed(2)} ({isPositive ? "+" : ""}
            {todayPnlPercent.toFixed(2)}%)
          </span>
          <span className="text-sm text-muted-foreground">{t("balance_card.today_pnl")}</span>
        </div>
      </Card>

      {/* Balance breakdown list */}
      <Card className="bg-card border-border overflow-hidden">
        {balances.map((balance, index) => {
          const share = totalAssets > 0 ? (balance.value / totalAssets) * 100 : 0;
          return (
            <div
              key={balance.label}
              className={`flex items-center gap-4 px-5 py-4 hover:bg-muted/40 transition-colors ${
                index !== balances.length - 1 ? "border-b border-border" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-full ${balance.bgColor} flex items-center justify-center shrink-0`}>
                <balance.icon className={`w-5 h-5 ${balance.color}`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground">{balance.label}</p>
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${balance.color.replace("text-", "bg-")}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </div>
              <p className="text-lg font-bold tabular-nums shrink-0">€{balance.value.toFixed(2)}</p>
            </div>
          );
        })}
      </Card>
    </motion.div>
  );
};
