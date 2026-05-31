import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronUp, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { QTAsset } from "@/pages/QuickTrade";
import { cn } from "@/lib/utils";

interface QTAssetPanelProps {
  assets: QTAsset[];
  selectedAsset: QTAsset | null;
  onSelectAsset: (asset: QTAsset) => void;
  prices: Record<string, number>;
}

const VISIBLE_ASSETS = 5;

const categoryColors: Record<string, string> = {
  forex: "bg-blue-500/20 text-blue-400",
  crypto: "bg-amber-500/20 text-amber-400",
  stocks: "bg-green-500/20 text-green-400",
  indices: "bg-purple-500/20 text-purple-400",
  commodities: "bg-orange-500/20 text-orange-400",
};

const sourceColors: Record<string, string> = {
  coingecko: "bg-emerald-500",
  alphavantage: "bg-blue-500",
  yahoo: "bg-violet-500",
};

export const QTAssetPanel = ({
  assets,
  selectedAsset,
  onSelectAsset,
  prices,
}: QTAssetPanelProps) => {
  const [search, setSearch] = useState("");
  const [startIndex, setStartIndex] = useState(0);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch = 
        asset.symbol.toLowerCase().includes(search.toLowerCase()) ||
        asset.name.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = !activeCategory || asset.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [assets, search, activeCategory]);

  const visibleAssets = filteredAssets.slice(startIndex, startIndex + VISIBLE_ASSETS);

  const canScrollUp = startIndex > 0;
  const canScrollDown = startIndex + VISIBLE_ASSETS < filteredAssets.length;

  const handleScrollUp = () => {
    setStartIndex(prev => Math.max(0, prev - VISIBLE_ASSETS));
  };

  const handleScrollDown = () => {
    setStartIndex(prev => Math.min(filteredAssets.length - VISIBLE_ASSETS, prev + VISIBLE_ASSETS));
  };

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes("/") && !symbol.includes("XAU") && !symbol.includes("XAG") && !symbol.includes("XBR") && !symbol.includes("XTI") && !symbol.includes("XPT") && !symbol.includes("XPD")) {
      return price.toFixed(4);
    }
    if (price > 1000) {
      return price.toLocaleString("en-US", { maximumFractionDigits: 0 });
    }
    if (price < 1) {
      return price.toFixed(6);
    }
    return price.toFixed(2);
  };

  const categories = ["forex", "crypto", "stocks", "indices", "commodities"];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full">
      {/* Search Header */}
      <div className="p-3 border-b border-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search QT Assets..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setStartIndex(0);
            }}
            className="pl-9 bg-background/50"
          />
        </div>
      </div>

      {/* Category Filters */}
      <div className="p-2 border-b border-border flex gap-1 flex-wrap">
        <Button
          variant={activeCategory === null ? "secondary" : "ghost"}
          size="sm"
          className="h-7 text-xs"
          onClick={() => { setActiveCategory(null); setStartIndex(0); }}
        >
          All
        </Button>
        {categories.map(cat => (
          <Button
            key={cat}
            variant={activeCategory === cat ? "secondary" : "ghost"}
            size="sm"
            className="h-7 text-xs capitalize"
            onClick={() => { setActiveCategory(cat); setStartIndex(0); }}
          >
            {cat}
          </Button>
        ))}
      </div>

      {/* Scroll Up Button */}
      <div className="px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8"
          onClick={handleScrollUp}
          disabled={!canScrollUp}
        >
          <ChevronUp className="w-4 h-4" />
        </Button>
      </div>

      {/* Asset List */}
      <div className="px-2 space-y-1 min-h-[280px]">
        <AnimatePresence mode="popLayout">
          {visibleAssets.map((asset, index) => {
            const currentPrice = prices[asset.symbol] || asset.price;
            const isSelected = selectedAsset?.id === asset.id;
            const isPositive = asset.changePercent >= 0;

            return (
              <motion.div
                key={asset.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ delay: index * 0.05 }}
              >
                <button
                  onClick={() => onSelectAsset(asset)}
                  className={cn(
                    "w-full p-3 rounded-lg transition-all text-left",
                    "hover:bg-muted/50",
                    isSelected && "bg-secondary/20 border border-secondary"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", sourceColors[asset.source])} />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">{asset.symbol}</span>
                          <Badge variant="outline" className={cn("text-[10px] px-1 py-0", categoryColors[asset.category])}>
                            {asset.category}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground truncate max-w-[120px] block">{asset.name}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono text-sm font-medium">
                        €{formatPrice(currentPrice, asset.symbol)}
                      </div>
                      <div className={cn(
                        "flex items-center justify-end gap-1 text-xs",
                        isPositive ? "text-green-500" : "text-red-500"
                      )}>
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {isPositive ? "+" : ""}{asset.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Payout</span>
                    <Badge variant="secondary" className="bg-secondary/20 text-secondary text-xs">
                      {asset.payout}%
                    </Badge>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Scroll Down Button */}
      <div className="px-2 py-1">
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-8"
          onClick={handleScrollDown}
          disabled={!canScrollDown}
        >
          <ChevronDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Asset Count */}
      <div className="p-2 border-t border-border text-center">
        <span className="text-xs text-muted-foreground">
          Showing {startIndex + 1}-{Math.min(startIndex + VISIBLE_ASSETS, filteredAssets.length)} of {filteredAssets.length} QT assets
        </span>
      </div>
    </div>
  );
};
