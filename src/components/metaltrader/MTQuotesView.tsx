import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Star, TrendingUp, TrendingDown, LineChart, ArrowUpDown } from "lucide-react";
import { getMTAssets } from "@/hooks/useMTAssets";
import { MTAsset } from "@/pages/MetalTrader";

interface MTQuotesViewProps {
  category: MTAsset['category'];
  prices: Record<string, { bid: number; ask: number; change: number }>;
  onSelectSymbol: (symbol: string) => void;
  onOpenChart: (symbol: string) => void;
  onQuickTrade: (symbol: string, type: 'buy' | 'sell') => void;
}

type SortField = 'symbol' | 'bid' | 'ask' | 'change';
type SortDirection = 'asc' | 'desc';

export const MTQuotesView = ({
  category,
  prices,
  onSelectSymbol,
  onOpenChart,
  onQuickTrade,
}: MTQuotesViewProps) => {
  const [favorites, setFavorites] = useState<string[]>(['XAUUSD', 'XAGUSD', 'EURUSD']);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const assets = useMemo(() => getMTAssets(category), [category]);

  const getAssetWithPrice = (asset: any) => {
    const priceData = prices[asset.symbol];
    return {
      ...asset,
      bid: priceData?.bid || asset.basePrice * 0.9999,
      ask: priceData?.ask || asset.basePrice * 1.0001,
      high: (priceData?.bid || asset.basePrice) * 1.005,
      low: (priceData?.bid || asset.basePrice) * 0.995,
      change: priceData?.change || 0,
      changePercent: priceData ? ((priceData.change / priceData.bid) * 100) : 0,
    };
  };

  const sortedAssets = useMemo(() => {
    let filtered = assets.map(getAssetWithPrice);
    
    if (showFavoritesOnly) {
      filtered = filtered.filter(a => favorites.includes(a.symbol));
    }
    
    return filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'symbol':
          comparison = a.symbol.localeCompare(b.symbol);
          break;
        case 'bid':
          comparison = a.bid - b.bid;
          break;
        case 'ask':
          comparison = a.ask - b.ask;
          break;
        case 'change':
          comparison = a.changePercent - b.changePercent;
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [assets, prices, showFavoritesOnly, favorites, sortField, sortDirection]);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev =>
      prev.includes(symbol)
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="h-full bg-[#2d2e33] border border-[#3c3f45] rounded flex flex-col">
      {/* Toolbar */}
      <div className="p-2 border-b border-[#3c3f45] flex items-center gap-2">
        <Button
          variant={showFavoritesOnly ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Star className={cn("w-3 h-3 mr-1", showFavoritesOnly && "fill-current")} />
          Favorites
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={() => setShowFavoritesOnly(false)}
        >
          Show All
        </Button>
        <span className="text-[10px] text-gray-500 ml-auto">
          {sortedAssets.length} symbols
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-[#1e1f22] sticky top-0">
            <tr className="text-gray-400">
              <th className="p-2 text-left w-8"></th>
              <th 
                className="p-2 text-left cursor-pointer hover:text-white"
                onClick={() => handleSort('symbol')}
              >
                <span className="flex items-center gap-1">
                  Symbol
                  {sortField === 'symbol' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <th 
                className="p-2 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('bid')}
              >
                <span className="flex items-center justify-end gap-1">
                  Bid
                  {sortField === 'bid' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <th 
                className="p-2 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('ask')}
              >
                <span className="flex items-center justify-end gap-1">
                  Ask
                  {sortField === 'ask' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <th className="p-2 text-right">High</th>
              <th className="p-2 text-right">Low</th>
              <th 
                className="p-2 text-right cursor-pointer hover:text-white"
                onClick={() => handleSort('change')}
              >
                <span className="flex items-center justify-end gap-1">
                  Change %
                  {sortField === 'change' && <ArrowUpDown className="w-3 h-3" />}
                </span>
              </th>
              <th className="p-2 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#3c3f45]">
            {sortedAssets.map((asset) => {
              const isPositive = asset.changePercent >= 0;
              const isFavorite = favorites.includes(asset.symbol);
              
              return (
                <tr
                  key={asset.symbol}
                  onClick={() => onSelectSymbol(asset.symbol)}
                  className="hover:bg-[#363739] cursor-pointer"
                >
                  <td className="p-2">
                    <button onClick={(e) => toggleFavorite(asset.symbol, e)}>
                      <Star className={cn(
                        "w-3 h-3",
                        isFavorite ? "fill-yellow-500 text-yellow-500" : "text-gray-600"
                      )} />
                    </button>
                  </td>
                  <td className="p-2">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-white">{asset.symbol}</span>
                      {isPositive ? (
                        <TrendingUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <TrendingDown className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className={cn(
                    "p-2 text-right font-mono",
                    isPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {asset.bid.toFixed(asset.decimals || 2)}
                  </td>
                  <td className={cn(
                    "p-2 text-right font-mono",
                    isPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {asset.ask.toFixed(asset.decimals || 2)}
                  </td>
                  <td className="p-2 text-right font-mono text-white">
                    {asset.high.toFixed(asset.decimals || 2)}
                  </td>
                  <td className="p-2 text-right font-mono text-white">
                    {asset.low.toFixed(asset.decimals || 2)}
                  </td>
                  <td className={cn(
                    "p-2 text-right font-mono",
                    isPositive ? "text-green-500" : "text-red-500"
                  )}>
                    {isPositive ? '+' : ''}{asset.changePercent.toFixed(2)}%
                  </td>
                  <td className="p-2">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenChart(asset.symbol);
                        }}
                      >
                        <LineChart className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-green-500 hover:bg-green-500/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickTrade(asset.symbol, 'buy');
                        }}
                      >
                        Buy
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] text-red-500 hover:bg-red-500/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickTrade(asset.symbol, 'sell');
                        }}
                      >
                        Sell
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
