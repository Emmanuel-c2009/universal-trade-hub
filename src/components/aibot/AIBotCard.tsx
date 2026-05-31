import { motion } from "framer-motion";
import { Bot, Star, TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { AIBot } from "@/services/aiBotService";

interface AIBotCardProps {
  bot: AIBot;
  onSubscribe: () => void;
  isSubscribed?: boolean;
}

const botAvatars: Record<string, string> = {
  'Mia': 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop',
  'Quantum Scalar': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=150&h=150&fit=crop',
  'Sentinel Forex': 'https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=150&h=150&fit=crop',
  'Crypto Nexus': 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=150&h=150&fit=crop',
};

export const AIBotCard = ({ bot, onSubscribe, isSubscribed }: AIBotCardProps) => {
  const avatarUrl = bot.avatar_url || botAvatars[bot.name] || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop';

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      className="bg-card border border-border rounded-xl overflow-hidden hover:border-accent/50 transition-all duration-300"
    >
      {/* Header with gradient */}
      <div className="relative h-24 bg-gradient-to-br from-primary to-secondary/50 p-4">
        <div className="absolute -bottom-8 left-4">
          <div className="w-16 h-16 rounded-full border-4 border-card overflow-hidden bg-card">
            <img
              src={avatarUrl}
              alt={bot.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Badge variant="secondary" className="bg-accent/20 text-accent border-0">
            <Star className="w-3 h-3 mr-1 fill-accent" />
            {bot.star_rating}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 pt-10">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg">{bot.name}</h3>
            <p className="text-muted-foreground text-sm line-clamp-2">{bot.description}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="w-3 h-3" />
              <span>Profit Range</span>
            </div>
            <p className="font-semibold text-secondary">
              {bot.profit_range_min}% - {bot.profit_range_max}%
            </p>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Zap className="w-3 h-3" />
              <span>Monthly Cost</span>
            </div>
            <p className="font-semibold text-accent">
              {bot.monthly_cost} LTC
            </p>
          </div>
        </div>

        {/* Trading Pairs */}
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Trading Pairs:</p>
          <div className="flex flex-wrap gap-1">
            {bot.trading_pairs.slice(0, 4).map((pair) => (
              <Badge key={pair} variant="outline" className="text-xs">
                {pair}
              </Badge>
            ))}
            {bot.trading_pairs.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{bot.trading_pairs.length - 4}
              </Badge>
            )}
          </div>
        </div>

        {/* Subscribe Button */}
        <Button
          onClick={onSubscribe}
          className={`w-full ${isSubscribed ? 'bg-secondary' : 'bg-accent text-accent-foreground hover:bg-accent/90'}`}
          disabled={isSubscribed}
        >
          <Bot className="w-4 h-4 mr-2" />
          {isSubscribed ? 'Subscribed' : 'Subscribe'}
        </Button>
      </div>
    </motion.div>
  );
};
