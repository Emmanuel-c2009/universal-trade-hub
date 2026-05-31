import { useState } from "react";
import { cn } from "@/lib/utils";
import { User, Activity, Bot, FileCode, ChevronDown, ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface MTNavigatorProps {
  balance: number;
  equity: number;
  accountNumber?: string;
}

const indicators = [
  { name: 'Moving Average', category: 'Trend' },
  { name: 'Exponential MA', category: 'Trend' },
  { name: 'Bollinger Bands', category: 'Trend' },
  { name: 'RSI', category: 'Oscillator' },
  { name: 'MACD', category: 'Oscillator' },
  { name: 'Stochastic', category: 'Oscillator' },
  { name: 'ATR', category: 'Volatility' },
  { name: 'Parabolic SAR', category: 'Trend' },
  { name: 'Ichimoku', category: 'Trend' },
  { name: 'ADX', category: 'Trend' },
];

const expertAdvisors = [
  { name: 'Grid Trading EA', status: 'active' },
  { name: 'Trend Follower', status: 'inactive' },
  { name: 'Scalper Pro', status: 'inactive' },
];

const scripts = [
  { name: 'Close All Positions' },
  { name: 'Close All Profits' },
  { name: 'Close All Losses' },
  { name: 'Delete Pending Orders' },
];

export const MTNavigator = ({ balance, equity, accountNumber = 'MT-12345' }: MTNavigatorProps) => {
  const [activeSection, setActiveSection] = useState<'accounts' | 'indicators' | 'experts' | 'scripts'>('accounts');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['Trend', 'Oscillator']);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const filteredIndicators = indicators.filter(ind =>
    ind.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedIndicators = filteredIndicators.reduce((acc, ind) => {
    if (!acc[ind.category]) acc[ind.category] = [];
    acc[ind.category].push(ind);
    return acc;
  }, {} as Record<string, typeof indicators>);

  return (
    <div className="h-full bg-[#2d2e33] border border-[#3c3f45] rounded flex flex-col">
      {/* Section Tabs */}
      <div className="flex border-b border-[#3c3f45] overflow-x-auto">
        {[
          { id: 'accounts', icon: User, label: 'Accounts' },
          { id: 'indicators', icon: Activity, label: 'Indicators' },
          { id: 'experts', icon: Bot, label: 'EAs' },
          { id: 'scripts', icon: FileCode, label: 'Scripts' },
        ].map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id as typeof activeSection)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[10px] transition-colors whitespace-nowrap",
              activeSection === id
                ? "bg-[#3c3f45] text-white border-b-2 border-secondary"
                : "text-gray-400 hover:text-white hover:bg-[#363739]"
            )}
          >
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {/* Accounts Section */}
        {activeSection === 'accounts' && (
          <div className="space-y-2">
            <div className="p-2 bg-[#1e1f22] rounded border border-secondary/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-white">{accountNumber}</span>
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-gray-400">Balance:</span>
                  <span className="text-white font-mono">€{balance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Equity:</span>
                  <span className={cn(
                    "font-mono",
                    equity >= balance ? "text-green-500" : "text-red-500"
                  )}>
                    €{equity.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Server:</span>
                  <span className="text-white">MetaTrader-Live</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Indicators Section */}
        {activeSection === 'indicators' && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search indicator..."
                className="h-7 pl-7 text-[10px] bg-[#1e1f22] border-[#3c3f45] text-white"
              />
            </div>
            
            {Object.entries(groupedIndicators).map(([category, inds]) => (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-1 w-full text-left text-[10px] text-gray-400 hover:text-white py-1"
                >
                  {expandedCategories.includes(category) ? (
                    <ChevronDown className="w-3 h-3" />
                  ) : (
                    <ChevronRight className="w-3 h-3" />
                  )}
                  {category}
                </button>
                {expandedCategories.includes(category) && (
                  <div className="ml-4 space-y-0.5">
                    {inds.map(ind => (
                      <div
                        key={ind.name}
                        className="text-[10px] text-white py-1 px-2 hover:bg-[#3c3f45] rounded cursor-move"
                        draggable
                      >
                        {ind.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Expert Advisors Section */}
        {activeSection === 'experts' && (
          <div className="space-y-1">
            {expertAdvisors.map(ea => (
              <div
                key={ea.name}
                className="flex items-center justify-between p-2 bg-[#1e1f22] rounded hover:bg-[#363739]"
              >
                <div className="flex items-center gap-2">
                  <Bot className="w-3 h-3 text-gray-400" />
                  <span className="text-[10px] text-white">{ea.name}</span>
                </div>
                <span className={cn(
                  "text-[9px] px-1.5 py-0.5 rounded",
                  ea.status === 'active' ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-400"
                )}>
                  {ea.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Scripts Section */}
        {activeSection === 'scripts' && (
          <div className="space-y-1">
            {scripts.map(script => (
              <div
                key={script.name}
                className="flex items-center gap-2 p-2 bg-[#1e1f22] rounded hover:bg-[#363739] cursor-pointer"
              >
                <FileCode className="w-3 h-3 text-gray-400" />
                <span className="text-[10px] text-white">{script.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
