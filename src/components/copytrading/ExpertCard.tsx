import { motion } from "framer-motion";
import { TrendingUp, Users, Star, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Expert } from "@/pages/CopyTrading";

interface ExpertCardProps {
  expert: Expert;
  onCopy: () => void;
  onViewProfile: () => void;
}

export const ExpertCard = ({ expert, onCopy, onViewProfile }: ExpertCardProps) => {
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

  const getFocusColor = (focus: string) => {
    switch (focus) {
      case "Forex":
        return "bg-blue-500/20 text-blue-400";
      case "Crypto":
        return "bg-purple-500/20 text-purple-400";
      case "Stocks":
        return "bg-green-500/20 text-green-400";
      case "Metals":
        return "bg-yellow-500/20 text-yellow-400";
      case "Indices":
        return "bg-cyan-500/20 text-cyan-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.2 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-secondary/50 transition-colors"
    >
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img
                src={expert.avatar}
                alt={expert.name}
                className="w-12 h-12 rounded-full object-cover"
              />
              {expert.isActive && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-card" />
              )}
            </div>
            <div>
              <h3 className="font-semibold">{expert.name}</h3>
              <div className="flex items-center gap-2">
                <Badge className={getFocusColor(expert.focus)} variant="outline">
                  {expert.focus}
                </Badge>
                <Badge className={getRiskColor(expert.riskLevel)} variant="outline">
                  {expert.riskLevel} Risk
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {expert.description}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-emerald-400 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="font-bold">{expert.winRate}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Win Rate</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-accent mb-1">
            <Star className="w-4 h-4" />
            <span className="font-bold">+{expert.monthlyReturn}%</span>
          </div>
          <p className="text-xs text-muted-foreground">Monthly Return</p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 text-secondary mb-1">
            <Users className="w-4 h-4" />
            <span className="font-bold">{expert.followers.toLocaleString()}</span>
          </div>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="text-center">
          <div className="font-bold text-foreground mb-1">
            €{expert.minInvestment}
          </div>
          <p className="text-xs text-muted-foreground">Min Investment</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 flex gap-2">
        <Button
          variant="outline"
          className="flex-1 border-border hover:bg-muted"
          onClick={onViewProfile}
        >
          View Profile
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
        <Button
          className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90"
          onClick={onCopy}
        >
          Copy Trader
        </Button>
      </div>
    </motion.div>
  );
};
