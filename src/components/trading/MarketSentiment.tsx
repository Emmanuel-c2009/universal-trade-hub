import { Card } from '@/components/ui/card';
import { MarketSentiment as MarketSentimentType } from '@/services/dataSourceManager';
import { Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface MarketSentimentProps {
  sentiment: MarketSentimentType;
  globalData?: any;
  loading: boolean;
}

export const MarketSentiment = ({ sentiment, globalData, loading }: MarketSentimentProps) => {
  const getSentimentColor = (index: number) => {
    if (index <= 25) return 'text-red-500';
    if (index <= 45) return 'text-orange-500';
    if (index <= 55) return 'text-yellow-500';
    if (index <= 75) return 'text-green-400';
    return 'text-green-500';
  };

  const getSentimentBg = (index: number) => {
    if (index <= 25) return 'bg-red-500/20';
    if (index <= 45) return 'bg-orange-500/20';
    if (index <= 55) return 'bg-yellow-500/20';
    if (index <= 75) return 'bg-green-400/20';
    return 'bg-green-500/20';
  };

  const getSentimentIcon = (index: number) => {
    if (index <= 35) return <TrendingDown className="w-4 h-4" />;
    if (index >= 65) return <TrendingUp className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const formatMarketCap = (value: number) => {
    if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    return `$${(value / 1e6).toFixed(2)}M`;
  };

  if (loading) {
    return (
      <Card className="p-4 bg-card border-border animate-pulse">
        <div className="h-20 bg-muted rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Market Sentiment</span>
      </div>
      
      {/* Fear & Greed Index */}
      <div className={`p-3 rounded-lg ${getSentimentBg(sentiment.fearGreedIndex)} mb-3`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Fear & Greed Index</p>
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getSentimentColor(sentiment.fearGreedIndex)}`}>
                {sentiment.fearGreedIndex}
              </span>
              <span className={`text-sm font-medium ${getSentimentColor(sentiment.fearGreedIndex)}`}>
                {sentiment.fearGreedLabel}
              </span>
            </div>
          </div>
          <div className={getSentimentColor(sentiment.fearGreedIndex)}>
            {getSentimentIcon(sentiment.fearGreedIndex)}
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              sentiment.fearGreedIndex <= 25 ? 'bg-red-500' :
              sentiment.fearGreedIndex <= 45 ? 'bg-orange-500' :
              sentiment.fearGreedIndex <= 55 ? 'bg-yellow-500' :
              sentiment.fearGreedIndex <= 75 ? 'bg-green-400' : 'bg-green-500'
            }`}
            style={{ width: `${sentiment.fearGreedIndex}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
          <span>Extreme Fear</span>
          <span>Extreme Greed</span>
        </div>
      </div>

      {/* Global Market Data */}
      {globalData && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-muted-foreground">Total Market Cap</p>
            <p className="font-semibold text-foreground">
              {formatMarketCap(globalData.total_market_cap?.usd || 0)}
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-muted-foreground">24h Volume</p>
            <p className="font-semibold text-foreground">
              {formatMarketCap(globalData.total_volume?.usd || 0)}
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-muted-foreground">BTC Dominance</p>
            <p className="font-semibold text-foreground">
              {(globalData.market_cap_percentage?.btc || 0).toFixed(1)}%
            </p>
          </div>
          <div className="p-2 bg-muted/50 rounded">
            <p className="text-muted-foreground">Active Cryptos</p>
            <p className="font-semibold text-foreground">
              {globalData.active_cryptocurrencies?.toLocaleString() || 'N/A'}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};
