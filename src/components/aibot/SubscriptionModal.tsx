import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bot, AlertTriangle, Check, Wallet, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import type { AIBot, UserBalance } from "@/services/aiBotService";

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: AIBot | null;
  userBalance: UserBalance | null;
  onSubscribe: (allocatedAmount: number) => void;
}

export const SubscriptionModal = ({
  isOpen,
  onClose,
  bot,
  userBalance,
  onSubscribe,
}: SubscriptionModalProps) => {
  const [allocatedAmount, setAllocatedAmount] = useState(100);
  const [agreedToRisk, setAgreedToRisk] = useState(false);

  if (!bot) return null;

  const hasEnoughLitecoin = (userBalance?.litecoin_balance || 0) >= bot.monthly_cost;
  const hasEnoughTrading = (userBalance?.trading_balance || 0) >= allocatedAmount;
  const canSubscribe = hasEnoughLitecoin && hasEnoughTrading && agreedToRisk;

  const handleSubscribe = () => {
    if (canSubscribe) {
      onSubscribe(allocatedAmount);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative w-full max-w-lg bg-card border border-border rounded-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 bg-gradient-to-br from-primary to-secondary/30 border-b border-border">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
                  <Bot className="w-8 h-8 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{bot.name}</h2>
                  <p className="text-muted-foreground text-sm">AI Trading Bot Subscription</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Bot Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Monthly Cost</p>
                  <p className="font-bold text-accent">{bot.monthly_cost} LTC</p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Profit Range</p>
                  <p className="font-bold text-secondary">
                    {bot.profit_range_min}% - {bot.profit_range_max}%
                  </p>
                </div>
              </div>

              {/* Balance Check */}
              <div className="space-y-2">
                <div className={`flex items-center gap-2 p-3 rounded-lg ${hasEnoughLitecoin ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                  {hasEnoughLitecoin ? (
                    <Check className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <X className="w-5 h-5 text-destructive" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">Litecoin Balance</p>
                    <p className="text-xs text-muted-foreground">
                      {userBalance?.litecoin_balance || 0} LTC available
                    </p>
                  </div>
                  {!hasEnoughLitecoin && (
                    <Button size="sm" variant="outline">Top Up</Button>
                  )}
                </div>
              </div>

              {/* Allocation Slider */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Trading Allocation</Label>
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      Available: €{userBalance?.trading_balance?.toFixed(2) || '0.00'}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <Slider
                    value={[allocatedAmount]}
                    onValueChange={([value]) => setAllocatedAmount(value)}
                    min={50}
                    max={Math.min(userBalance?.trading_balance || 1000, 10000)}
                    step={50}
                    className="py-4"
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold">€{allocatedAmount}</span>
                    <Input
                      type="number"
                      value={allocatedAmount}
                      onChange={(e) => setAllocatedAmount(Number(e.target.value))}
                      className="w-24"
                      min={50}
                      max={userBalance?.trading_balance || 1000}
                    />
                  </div>
                </div>

                {!hasEnoughTrading && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Insufficient trading balance
                  </p>
                )}
              </div>

              {/* Expected Returns */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  <span className="font-medium">Expected Returns (Monthly)</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Conservative</p>
                    <p className="font-bold text-emerald-500">
                      +€{(allocatedAmount * bot.profit_range_min / 100).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Optimistic</p>
                    <p className="font-bold text-emerald-500">
                      +€{(allocatedAmount * bot.profit_range_max / 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Risk Disclosure */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-destructive">Risk Warning</p>
                    <p className="text-xs text-muted-foreground">
                      Trading involves significant risk. You may lose your entire investment.
                      Past performance does not guarantee future results.
                    </p>
                    <div className="flex items-center gap-2 pt-2">
                      <Checkbox
                        id="risk-agree"
                        checked={agreedToRisk}
                        onCheckedChange={(checked) => setAgreedToRisk(checked as boolean)}
                      />
                      <Label htmlFor="risk-agree" className="text-sm cursor-pointer">
                        I understand and accept the risks
                      </Label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={handleSubscribe}
                  disabled={!canSubscribe}
                  className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  <Bot className="w-4 h-4 mr-2" />
                  Subscribe & Start Trading
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
