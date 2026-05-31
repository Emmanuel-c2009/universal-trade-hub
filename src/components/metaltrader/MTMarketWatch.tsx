import { useState, useMemo, useEffect, useRef } from "react";
import { Search, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MTAsset } from "@/pages/MetalTrader";
import { getMTAssets } from "@/hooks/useMTAssets";

interface MTMarketWatchProps {
  category: MTAsset['category'];
  prices: Record<string, { bid: number; ask: number; change: number }>;
  selectedAsset: MTAsset | null;
  onSelectAsset: (asset: MTAsset) => void;
}

export const MTMarketWatch = ({ category, prices, selectedAsset, onSelectAsset }: MTMarketWatchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>(['XAUUSD', 'XAGUSD']);
  const prevPricesRef = useRef<Record<string, number>>({});
  const [flashMap, setFlashMap] = useState<Record<string, 'up' | 'down' | null>>({});

  const assets = useMemo(() => getMTAssets(category), [category]);
  const filteredAssets = useMemo(() => {
    return assets.filter(asset =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  // Price flash effect
  useEffect(() => {
    const newFlashes: Record<string, 'up' | 'down' | null> = {};
    Object.entries(prices).forEach(([symbol, data]) => {
      const prev = prevPricesRef.current[symbol];
      if (prev !== undefined && prev !== data.bid) {
        newFlashes[symbol] = data.bid > prev ? 'up' : 'down';
      }
    });
    if (Object.keys(newFlashes).length > 0) {
      setFlashMap(newFlashes);
      setTimeout(() => setFlashMap({}), 200);
    }
    const newPrev: Record<string, number> = {};
    Object.entries(prices).forEach(([s, d]) => { newPrev[s] = d.bid; });
    prevPricesRef.current = newPrev;
  }, [prices]);

  const toggleFavorite = (symbol: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  const getAssetWithPrice = (asset: any): MTAsset => {
    const priceData = prices[asset.symbol];
    return {
      ...asset,
      bid: priceData?.bid || asset.basePrice * 0.9999,
      ask: priceData?.ask || asset.basePrice * 1.0001,
      spread: priceData ? (priceData.ask - priceData.bid) : asset.basePrice * 0.0002,
      change: priceData?.change || 0,
      changePercent: priceData ? ((priceData.change / priceData.bid) * 100) : 0,
    };
  };

  // MT5-style pip formatting: last 2 decimals are 2x larger
  const formatPipPrice = (price: number, decimals: number = 2) => {
    const str = price.toFixed(decimals);
    if (decimals >= 4) {
      const parts = str.split('.');
      const intPart = parts[0];
      const decPart = parts[1];
      const smallPart = decPart.slice(0, -2);
      const bigPart = decPart.slice(-2);
      return (
        <span className="font-mono">
          {intPart}.{smallPart}<span className="text-lg font-bold">{bigPart}</span>
        </span>
      );
    }
    return <span className="font-mono">{str}</span>;
  };

  return (
    <div className="h-full bg-white dark:bg-[#2d2e33] border border-gray-200 dark:border-[#3c3f45] rounded flex flex-col">
      <div className="p-2 border-b border-gray-200 dark:border-[#3c3f45]">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Market Watch</h3>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="h-7 pl-7 text-xs" />
        </div>
      </div>

      <div className="grid grid-cols-[20px_1fr_70px_70px] gap-1 px-2 py-1 text-[10px] text-muted-foreground border-b border-gray-100 dark:border-[#3c3f45]">
        <div></div><div>Symbol</div><div className="text-right">Bid</div><div className="text-right">Ask</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredAssets.map((asset) => {
          const assetWithPrice = getAssetWithPrice(asset);
          const isFavorite = favorites.includes(asset.symbol);
          const isSelected = selectedAsset?.symbol === asset.symbol;
          const isPositive = assetWithPrice.change >= 0;
          const dec = asset.decimals || 2;
          const flash = flashMap[asset.symbol];

          return (
            <div
              key={asset.symbol}
              onClick={() => onSelectAsset(assetWithPrice)}
              className={cn(
                "grid grid-cols-[20px_1fr_70px_70px] gap-1 px-2 py-1.5 cursor-pointer transition-all text-xs",
                isSelected ? "bg-blue-50 dark:bg-[#3c3f45]" : "hover:bg-gray-50 dark:hover:bg-[#363739]",
                flash === 'up' && "bg-[#007AFF]/10",
                flash === 'down' && "bg-[#FF3B30]/10"
              )}
            >
              <button onClick={(e) => toggleFavorite(asset.symbol, e)} className="flex items-center">
                <Star className={cn("w-3 h-3", isFavorite ? "fill-yellow-500 text-yellow-500" : "text-gray-300")} />
              </button>
              <div className="flex items-center gap-1">
                <span className="font-medium">{asset.symbol}</span>
              </div>
              <div className={cn("text-right transition-colors", flash === 'up' ? "text-[#007AFF]" : flash === 'down' ? "text-[#FF3B30]" : isPositive ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                {formatPipPrice(assetWithPrice.bid, dec)}
              </div>
              <div className={cn("text-right transition-colors", flash === 'up' ? "text-[#007AFF]" : flash === 'down' ? "text-[#FF3B30]" : isPositive ? "text-[#007AFF]" : "text-[#FF3B30]")}>
                {formatPipPrice(assetWithPrice.ask, dec)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-gray-100 dark:border-[#3c3f45] text-[10px] text-muted-foreground">
        {filteredAssets.length} symbols
      </div>
    </div>
  );
};
