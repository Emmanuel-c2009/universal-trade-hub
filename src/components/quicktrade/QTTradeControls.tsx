import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Plus, Clock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QTAsset } from "@/pages/QuickTrade";
import { cn, formatEUR } from "@/lib/utils";

interface QTTradeControlsProps {
  asset: QTAsset | null;
  onPlaceTrade: (type: "BUY" | "SELL", amount: number, duration: number) => void;
  tradingBalance?: number;
}

const DURATIONS = [
  { label: "1m", value: 1 },
  { label: "5m", value: 5 },
  { label: "15m", value: 15 },
  { label: "30m", value: 30 },
  { label: "1h", value: 60 },
];

const QUICK_AMOUNTS = [25, 50, 75, 100];

export const QTTradeControls = ({ asset, onPlaceTrade, tradingBalance = 0 }: QTTradeControlsProps) => {
  const [amount, setAmount] = useState(100);
  const [duration, setDuration] = useState(5);

  const handleAmountChange = (value: number) => setAmount(Math.max(1, value));
  const handleQuickAmount = (percent: number) => setAmount(Math.round(tradingBalance * (percent / 100)));
  const potentialPayout = asset ? amount * (asset.payout / 100) : 0;

  return (
    <div className="bg-card p-3 space-y-3">
      {/* Row 1: Amount + Quick percentages */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Wallet className="w-3 h-3" />
          <span className="font-mono font-bold">{formatEUR(tradingBalance)}</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">Amount:</span>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAmountChange(amount - 10)}>
            <Minus className="w-3 h-3" />
          </Button>
          <Input
            type="number"
            value={amount}
            onChange={(e) => handleAmountChange(Number(e.target.value))}
            className="w-20 h-8 text-center font-mono text-sm"
          />
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => handleAmountChange(amount + 10)}>
            <Plus className="w-3 h-3" />
          </Button>
        </div>
        {QUICK_AMOUNTS.map((p) => (
          <Button key={p} variant="outline" size="sm" className="h-7 text-xs px-2 hidden sm:flex" onClick={() => handleQuickAmount(p)}>
            {p}%
          </Button>
        ))}
      </div>

      {/* Row 2: Duration + Payout + Buy/Sell */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <Clock className="w-3 h-3 text-muted-foreground" />
          {DURATIONS.map((d) => (
            <Button
              key={d.value}
              variant={duration === d.value ? "secondary" : "outline"}
              size="sm"
              onClick={() => setDuration(d.value)}
              className={cn("h-7 text-xs px-2", duration === d.value && "bg-secondary text-secondary-foreground")}
            >
              {d.label}
            </Button>
          ))}
        </div>

        <div className="flex-1" />

        {asset && (
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted-foreground">Payout: <span className="font-semibold text-secondary">{asset.payout}%</span></span>
            <span className="text-muted-foreground">Profit: <span className="font-semibold text-green-500">+{formatEUR(potentialPayout)}</span></span>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            className="h-10 px-6 font-bold bg-green-600 hover:bg-green-700 text-white"
            onClick={() => onPlaceTrade("BUY", amount, duration)}
            disabled={!asset || amount > tradingBalance}
          >
            <TrendingUp className="w-4 h-4 mr-1" /> BUY
          </Button>
          <Button
            className="h-10 px-6 font-bold bg-red-600 hover:bg-red-700 text-white"
            onClick={() => onPlaceTrade("SELL", amount, duration)}
            disabled={!asset || amount > tradingBalance}
          >
            <TrendingDown className="w-4 h-4 mr-1" /> SELL
          </Button>
        </div>
      </div>

      {amount > tradingBalance && (
        <p className="text-xs text-destructive text-center">Insufficient balance</p>
      )}
    </div>
  );
};
