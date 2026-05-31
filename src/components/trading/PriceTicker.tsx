import { CryptoPrice } from '@/services/coinGeckoService';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PriceTickerProps {
  prices: CryptoPrice[];
  loading?: boolean;
}

export const PriceTicker = ({ prices, loading }: PriceTickerProps) => {
  // Show top 5 cryptos by market cap
  const topCryptos = prices.slice(0, 5);

  if (loading || topCryptos.length === 0) {
    return (
      <div className="flex items-center gap-4 overflow-x-auto py-2 animate-pulse">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-8 w-32 bg-muted rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 overflow-x-auto py-2 scrollbar-hide">
      {topCryptos.map((crypto) => (
        <div
          key={crypto.id}
          className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg shrink-0"
        >
          <img
            src={crypto.image}
            alt={crypto.symbol}
            className="w-5 h-5 rounded-full"
          />
          <span className="font-medium text-sm">{crypto.symbol.toUpperCase()}</span>
          <span className="text-sm">
            ${crypto.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
          <span
            className={cn(
              "flex items-center text-xs font-medium",
              crypto.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
            )}
          >
            {crypto.price_change_percentage_24h >= 0 ? (
              <TrendingUp className="w-3 h-3 mr-0.5" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-0.5" />
            )}
            {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
};
