import { Wifi, WifiOff } from "lucide-react";
import { cn, formatEUR } from "@/lib/utils";

interface MTHeaderProps {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  isConnected: boolean;
  selectedCategory: string;
  onCategoryChange: (category: any) => void;
}

const categories = [
  { id: 'metals', label: 'Metals', icon: '🥇' },
  { id: 'forex', label: 'Forex', icon: '💱' },
  { id: 'crypto', label: 'Crypto', icon: '₿' },
  { id: 'stocks', label: 'Stocks', icon: '📈' },
  { id: 'indices', label: 'Indices', icon: '📊' },
  { id: 'commodities', label: 'Commodities', icon: '🛢️' },
  { id: 'etfs', label: 'ETFs', icon: '📦' },
];

export const MTHeader = ({
  balance, equity, margin, freeMargin, isConnected, selectedCategory, onCategoryChange,
}: MTHeaderProps) => {
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;
  const floatingPnl = equity - balance;

  return (
    <div className="bg-white dark:bg-[#2d2e33] border-b border-gray-200 dark:border-[#3c3f45] px-4 py-2">
      {/* Account Info */}
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            {isConnected ? <Wifi className="w-3 h-3 text-green-500" /> : <WifiOff className="w-3 h-3 text-red-500" />}
            <span className={isConnected ? 'text-green-600' : 'text-red-500'}>{isConnected ? 'Connected' : 'Offline'}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3 text-xs flex-wrap">
          <div><span className="text-muted-foreground">Balance:</span> <span className="font-mono font-semibold">{formatEUR(balance)}</span></div>
          <div><span className="text-muted-foreground">Equity:</span> <span className={cn("font-mono font-semibold", equity >= balance ? "text-green-600" : "text-red-500")}>{formatEUR(equity)}</span></div>
          <div><span className="text-muted-foreground">Margin:</span> <span className="font-mono">{formatEUR(margin)}</span></div>
          <div><span className="text-muted-foreground">Free:</span> <span className="font-mono">{formatEUR(freeMargin)}</span></div>
          <div className="hidden sm:block"><span className="text-muted-foreground">Level:</span> <span className={cn("font-mono", marginLevel > 100 ? "text-green-500" : "text-red-500")}>{marginLevel > 0 ? `${marginLevel.toFixed(0)}%` : '—'}</span></div>
          <div className="hidden sm:block"><span className="text-muted-foreground">P/L:</span> <span className={cn("font-mono", floatingPnl >= 0 ? "text-green-500" : "text-red-500")}>{floatingPnl >= 0 ? '+' : ''}{formatEUR(floatingPnl)}</span></div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onCategoryChange(cat.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap",
              selectedCategory === cat.id
                ? "bg-[#007AFF] text-white"
                : "bg-gray-100 dark:bg-[#3c3f45] text-muted-foreground hover:bg-gray-200 dark:hover:bg-[#4a4d54]"
            )}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
