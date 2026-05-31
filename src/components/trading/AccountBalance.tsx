import { useState } from "react";
import { Eye, EyeOff, TrendingUp, TrendingDown, Wallet, PiggyBank, LineChart } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AccountBalanceProps {
  totalBalance: number;
  availableBalance: number;
  investedBalance: number;
  todayPnl: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export const AccountBalance = ({
  totalBalance,
  availableBalance,
  investedBalance,
  todayPnl,
  unrealizedPnl,
  realizedPnl
}: AccountBalanceProps) => {
  const [isVisible, setIsVisible] = useState(true);

  const formatCurrency = (value: number) => {
    return isVisible ? `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "••••••";
  };

  const totalPnl = todayPnl + unrealizedPnl + realizedPnl;

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Account Balance</h3>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsVisible(!isVisible)}
          className="h-8 w-8"
        >
          {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-br from-gold/20 to-gold/5 rounded-lg p-3 border border-gold/20">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="h-4 w-4 text-gold" />
            <span className="text-xs text-muted-foreground">Total</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(totalBalance)}</p>
          <span className={cn(
            "text-xs font-medium",
            totalPnl >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)} {totalPnl >= 0 ? "↗" : "↘"}
          </span>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <PiggyBank className="h-4 w-4 text-blue-500" />
            <span className="text-xs text-muted-foreground">Available</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(availableBalance)}</p>
        </div>

        <div className="bg-muted/50 rounded-lg p-3 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <LineChart className="h-4 w-4 text-purple-500" />
            <span className="text-xs text-muted-foreground">Invested</span>
          </div>
          <p className="text-lg font-bold">{formatCurrency(investedBalance)}</p>
        </div>
      </div>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">P&L Breakdown</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Today's P&L</span>
            <span className={cn(
              "text-sm font-medium",
              todayPnl >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {todayPnl >= 0 ? "+" : ""}{formatCurrency(todayPnl)}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Unrealized</span>
            <span className={cn(
              "text-sm font-medium",
              unrealizedPnl >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {unrealizedPnl >= 0 ? "+" : ""}{formatCurrency(unrealizedPnl)}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
            <span className="text-xs text-muted-foreground">Realized</span>
            <span className={cn(
              "text-sm font-medium",
              realizedPnl >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {realizedPnl >= 0 ? "+" : ""}{formatCurrency(realizedPnl)}
            </span>
          </div>
          <div className="flex items-center justify-between p-2 bg-gold/10 rounded-lg border border-gold/20">
            <span className="text-xs font-medium">Total P&L</span>
            <span className={cn(
              "text-sm font-bold",
              totalPnl >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {totalPnl >= 0 ? "+" : ""}{formatCurrency(totalPnl)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
