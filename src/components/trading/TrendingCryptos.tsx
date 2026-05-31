import { TrendingUp, Flame } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { TrendingCoin } from '@/services/dataSourceManager';
import { Skeleton } from '@/components/ui/skeleton';

interface TrendingCryptosProps {
  trending: TrendingCoin[];
  loading: boolean;
  onSelect?: (symbol: string) => void;
}

export const TrendingCryptos = ({ trending, loading, onSelect }: TrendingCryptosProps) => {
  if (loading) {
    return (
      <Card className="p-4 bg-card border-border">
        <div className="flex items-center gap-2 mb-3">
          <Flame className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-sm">Trending Cryptos</span>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
    );
  }

  if (trending.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 bg-card border-border">
      <div className="flex items-center gap-2 mb-3">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="font-semibold text-sm text-foreground">Trending Cryptos</span>
      </div>
      <div className="space-y-2">
        {trending.slice(0, 5).map((coin, index) => (
          <div
            key={coin.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            onClick={() => onSelect?.(coin.symbol.toUpperCase())}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-4">#{index + 1}</span>
              <img 
                src={coin.thumb} 
                alt={coin.name} 
                className="w-6 h-6 rounded-full"
              />
              <div>
                <span className="text-sm font-medium text-foreground">{coin.symbol.toUpperCase()}</span>
                <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">{coin.name}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-green-500" />
              <span className="text-xs text-muted-foreground">#{coin.market_cap_rank || 'N/A'}</span>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
