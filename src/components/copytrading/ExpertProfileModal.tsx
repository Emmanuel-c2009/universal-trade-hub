import { motion, AnimatePresence } from "framer-motion";
import { X, TrendingUp, Users, Star, Target, Zap, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Expert } from "@/pages/CopyTrading";

interface ExpertProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  expert: Expert | null;
  onCopy: () => void;
}

export const ExpertProfileModal = ({
  isOpen,
  onClose,
  expert,
  onCopy,
}: ExpertProfileModalProps) => {
  if (!expert) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "Low":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "Medium":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "High":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  // Simulated performance data
  const monthlyPerformance = [
    { month: "Jan", profit: 8.2 },
    { month: "Feb", profit: 12.5 },
    { month: "Mar", profit: -3.1 },
    { month: "Apr", profit: 15.8 },
    { month: "May", profit: 9.4 },
    { month: "Jun", profit: 18.2 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative">
              <div className="h-32 bg-gradient-to-r from-primary to-secondary" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 bg-background/50 hover:bg-background/80"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
              <div className="absolute -bottom-12 left-6">
                <div className="relative">
                  <img
                    src={expert.avatar}
                    alt={expert.name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-card"
                  />
                  {expert.isActive && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-card" />
                  )}
                </div>
              </div>
            </div>

            {/* Profile Info */}
            <div className="pt-16 px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-2xl font-bold mb-1">{expert.name}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="bg-secondary/20 text-secondary">
                      {expert.focus}
                    </Badge>
                    <Badge variant="outline" className={getRiskColor(expert.riskLevel)}>
                      {expert.riskLevel} Risk
                    </Badge>
                    <Badge variant="outline" className="bg-muted">
                      {expert.tradingStyle}
                    </Badge>
                  </div>
                </div>
                <Button
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={onCopy}
                >
                  Copy This Trader
                </Button>
              </div>

              <p className="text-muted-foreground mb-6">{expert.description}</p>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <TrendingUp className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                  <p className="text-xl font-bold">{expert.winRate}%</p>
                  <p className="text-xs text-muted-foreground">Win Rate</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <Star className="w-5 h-5 text-accent mx-auto mb-2" />
                  <p className="text-xl font-bold">+{expert.monthlyReturn}%</p>
                  <p className="text-xs text-muted-foreground">Monthly Return</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <Users className="w-5 h-5 text-secondary mx-auto mb-2" />
                  <p className="text-xl font-bold">{expert.followers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Followers</p>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 text-center">
                  <Target className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                  <p className="text-xl font-bold">€{expert.totalProfit.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Profit</p>
                </div>
              </div>

              {/* Monthly Performance */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-secondary" />
                  Monthly Performance
                </h3>
                <div className="flex items-end justify-between h-32 gap-2">
                  {monthlyPerformance.map((month, index) => (
                    <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t transition-all ${
                          month.profit >= 0 ? "bg-emerald-500" : "bg-red-500"
                        }`}
                        style={{
                          height: `${Math.abs(month.profit) * 4}px`,
                          minHeight: "8px",
                        }}
                      />
                      <span className="text-xs text-muted-foreground">{month.month}</span>
                      <span
                        className={`text-xs font-medium ${
                          month.profit >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {month.profit >= 0 ? "+" : ""}{month.profit}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Favorite Assets */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-accent" />
                  Favorite Assets
                </h3>
                <div className="flex flex-wrap gap-2">
                  {expert.favoriteAssets.map((asset) => (
                    <Badge key={asset} variant="outline" className="bg-muted/50">
                      {asset}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Minimum Investment */}
              <div className="bg-muted/30 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Minimum Investment</span>
                  <span className="text-xl font-bold">€{expert.minInvestment}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
