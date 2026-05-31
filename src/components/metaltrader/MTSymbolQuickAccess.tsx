import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Search, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getMTAssets } from "@/hooks/useMTAssets";
import { MTAsset } from "@/pages/MetalTrader";

interface MTSymbolQuickAccessProps {
  category: MTAsset['category'];
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

const quickAccessSymbols: Record<string, string[]> = {
  metals: ['XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'XAUEUR'],
  forex: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'],
  crypto: ['BTCUSD', 'ETHUSD', 'BNBUSD', 'SOLUSD', 'XRPUSD'],
  stocks: ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'],
  indices: ['US500', 'US100', 'US30', 'GER40', 'UK100'],
  commodities: ['USOIL', 'UKOIL', 'NATGAS', 'WHEAT', 'CORN'],
  etfs: ['SPY', 'QQQ', 'IWM', 'GLD', 'SLV'],
};

export const MTSymbolQuickAccess = ({ 
  category, 
  selectedSymbol, 
  onSymbolSelect 
}: MTSymbolQuickAccessProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const allAssets = useMemo(() => getMTAssets(category), [category]);
  const quickSymbols = quickAccessSymbols[category] || [];
  
  const filteredAssets = useMemo(() => {
    if (!searchQuery) return allAssets.slice(0, 10);
    return allAssets.filter(asset =>
      asset.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      asset.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allAssets, searchQuery]);

  return (
    <div className="flex items-center gap-2 bg-[#2d2e33] border-b border-[#3c3f45] px-4 py-2">
      {/* Quick Access Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 flex-1">
        {quickSymbols.map((symbol) => (
          <button
            key={symbol}
            onClick={() => onSymbolSelect(symbol)}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap",
              selectedSymbol === symbol
                ? "bg-secondary text-secondary-foreground"
                : "bg-[#3c3f45] text-gray-300 hover:bg-[#4a4d54]"
            )}
          >
            {symbol}
          </button>
        ))}
      </div>

      {/* Symbol Search & Dropdown */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symbol..."
            className="h-7 w-40 pl-7 text-xs bg-[#1e1f22] border-[#3c3f45] text-white placeholder:text-gray-500"
          />
        </div>

        <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-[#1e1f22] border border-[#3c3f45] rounded text-xs text-white hover:bg-[#3c3f45]">
              <span>{selectedSymbol || 'Select Symbol'}</span>
              <ChevronDown className="w-3 h-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 bg-[#2d2e33] border-[#3c3f45] max-h-64 overflow-auto">
            {filteredAssets.map((asset) => (
              <DropdownMenuItem
                key={asset.symbol}
                onClick={() => {
                  onSymbolSelect(asset.symbol);
                  setIsDropdownOpen(false);
                  setSearchQuery('');
                }}
                className={cn(
                  "text-xs cursor-pointer",
                  selectedSymbol === asset.symbol ? "bg-secondary/20" : ""
                )}
              >
                <div className="flex justify-between w-full">
                  <span className="font-medium text-white">{asset.symbol}</span>
                  <span className="text-gray-400 text-[10px]">{asset.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
