import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertTriangle, Clock, DollarSign, TrendingUp, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import type { Expert } from "@/pages/CopyTrading";

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  expert: Expert | null;
  userBalance: number;
  onStartSession: (investment: number, duration: number) => void;
}

const DURATION_OPTIONS = [
  { value: 1, label: "1 Hour" },
  { value: 4, label: "4 Hours" },
  { value: 12, label: "12 Hours" },
  { value: 24, label: "24 Hours" },
];

export const SessionModal = ({
  isOpen,
  onClose,
  expert,
  userBalance,
  onStartSession,
}: SessionModalProps) => {
  const [investment, setInvestment] = useState("");
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [riskAccepted, setRiskAccepted] = useState(false);

  if (!expert) return null;

  const minInvestment = Math.max(30, expert.minInvestment);
  const investmentAmount = parseFloat(investment) || 0;
  const isValidInvestment = investmentAmount >= minInvestment && investmentAmount <= userBalance;
  const canStart = isValidInvestment && riskAccepted;

  const handleSubmit = () => {
    if (canStart) {
      onStartSession(investmentAmount, selectedDuration);
      setInvestment("");
      setSelectedDuration(1);
      setRiskAccepted(false);
    }
  };

  const handleClose = () => {
    setInvestment("");
    setSelectedDuration(1);
    setRiskAccepted(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <img
                  src={expert.avatar}
                  alt={expert.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <h2 className="font-bold text-lg">Copy {expert.name}</h2>
                  <p className="text-sm text-muted-foreground">{expert.focus} Expert</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={handleClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Expert Stats Summary */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/30 rounded-xl">
                <div className="text-center">
                  <p className="text-lg font-bold text-emerald-400">{expert.winRate}%</p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-accent">+{expert.monthlyReturn}%</p>
                  <p className="text-xs text-muted-foreground">Monthly</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{expert.followers}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
              </div>

              {/* Investment Amount */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Investment Amount
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    type="number"
                    value={investment}
                    onChange={(e) => setInvestment(e.target.value)}
                    placeholder={`Min €${minInvestment}`}
                    className="pl-10 bg-muted border-border"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-muted-foreground">
                    Min: €{minInvestment}
                  </span>
                  <span className="text-muted-foreground">
                    Balance: €{userBalance.toFixed(2)}
                  </span>
                </div>
                {investmentAmount > userBalance && (
                  <p className="text-sm text-destructive mt-1">
                    Insufficient balance
                  </p>
                )}
              </div>

              {/* Duration Selection */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Session Duration
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {DURATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSelectedDuration(option.value)}
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        selectedDuration === option.value
                          ? "bg-secondary text-secondary-foreground border-secondary"
                          : "bg-muted border-border hover:border-secondary/50"
                      }`}
                    >
                      <Clock className="w-4 h-4 mx-auto mb-1" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Rules Summary */}
              <div className="bg-muted/30 rounded-xl p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-secondary" />
                  Session Rules
                </h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    Your trades will automatically copy {expert.name}'s positions
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    Profits are added to your balance when session ends
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                    You can stop the session at any time
                  </li>
                </ul>
              </div>

              {/* Risk Disclosure */}
              <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-destructive mb-2">
                      Risk Disclosure
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      <strong>REAL MONEY TRADING - NOT A DEMO.</strong> You are risking actual funds. 
                      Complete loss of investment is possible if the first trade loses. 
                      Past simulated performance does not guarantee future results.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={riskAccepted}
                        onCheckedChange={(checked) => setRiskAccepted(checked === true)}
                      />
                      <span className="text-sm">
                        I understand I am risking real money and may lose my entire investment
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-border flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={!canStart}
                onClick={handleSubmit}
              >
                Start Session
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
