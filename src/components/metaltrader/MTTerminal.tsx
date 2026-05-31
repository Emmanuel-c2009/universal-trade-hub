import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { MTPosition } from "@/pages/MetalTrader";
import { cn, formatEUR } from "@/lib/utils";
import { X, TrendingUp, TrendingDown } from "lucide-react";

interface MTTerminalProps {
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  positions: MTPosition[];
  onClosePosition: (positionId: string) => void;
}

export const MTTerminal = ({ balance, equity, margin, freeMargin, positions, onClosePosition }: MTTerminalProps) => {
  const [activeTab, setActiveTab] = useState("trade");
  const totalPnL = positions.reduce((sum, pos) => sum + pos.pnl, 0);
  const marginLevel = margin > 0 ? (equity / margin) * 100 : 0;

  return (
    <div className="h-full bg-[#2d2e33] border border-[#3c3f45] rounded flex flex-col">
      {/* Account Summary */}
      <div className="p-2 border-b border-[#3c3f45] space-y-1">
        <div className="grid grid-cols-2 gap-x-4 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">Balance:</span>
            <span className="text-white font-mono">{formatEUR(balance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Equity:</span>
            <span className={cn("font-mono", equity >= balance ? "text-green-500" : "text-red-500")}>{formatEUR(equity)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Margin:</span>
            <span className="text-white font-mono">{formatEUR(margin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Free Margin:</span>
            <span className="text-white font-mono">{formatEUR(freeMargin)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Margin Level:</span>
            <span className={cn("font-mono", marginLevel > 100 ? "text-green-500" : marginLevel > 50 ? "text-yellow-500" : "text-red-500")}>
              {marginLevel > 0 ? `${marginLevel.toFixed(0)}%` : '—'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Floating P/L:</span>
            <span className={cn("font-mono", totalPnL >= 0 ? "text-green-500" : "text-red-500")}>
              {totalPnL >= 0 ? '+' : ''}{formatEUR(totalPnL)}
            </span>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start h-8 bg-[#1e1f22] rounded-none border-b border-[#3c3f45]">
          <TabsTrigger value="trade" className="text-xs h-7">Trade ({positions.length})</TabsTrigger>
          <TabsTrigger value="exposure" className="text-xs h-7">Exposure</TabsTrigger>
        </TabsList>

        <TabsContent value="trade" className="flex-1 overflow-auto m-0 p-0">
          {positions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-xs">No open positions</div>
          ) : (
            <div className="divide-y divide-[#3c3f45]">
              {positions.map((position) => (
                <div key={position.id} className="p-2 hover:bg-[#363739]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {position.type === 'buy' ? <TrendingUp className="w-3 h-3 text-green-500" /> : <TrendingDown className="w-3 h-3 text-red-500" />}
                      <span className="text-xs font-medium text-white">{position.symbol}</span>
                      <span className={cn("text-[10px] px-1 rounded", position.type === 'buy' ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500")}>
                        {position.type.toUpperCase()}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-5 w-5 hover:bg-red-500/20" onClick={() => onClosePosition(position.id)}>
                      <X className="w-3 h-3 text-gray-400 hover:text-red-500" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-gray-500">Volume:</span> <span className="text-white">{position.volume}</span></div>
                    <div><span className="text-gray-500">Open:</span> <span className="text-white font-mono">{position.openPrice.toFixed(2)}</span></div>
                    <div><span className="text-gray-500">P/L:</span> <span className={cn("font-mono", position.pnl >= 0 ? "text-green-500" : "text-red-500")}>{position.pnl >= 0 ? '+' : ''}{formatEUR(position.pnl)}</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="exposure" className="flex-1 m-0 p-2">
          <div className="text-xs text-gray-400">
            {positions.length > 0 ? (
              <div className="space-y-2">
                {Object.entries(
                  positions.reduce((acc, pos) => {
                    if (!acc[pos.symbol]) acc[pos.symbol] = { buy: 0, sell: 0 };
                    acc[pos.symbol][pos.type] += pos.volume;
                    return acc;
                  }, {} as Record<string, { buy: number; sell: number }>)
                ).map(([symbol, exposure]) => (
                  <div key={symbol} className="flex justify-between">
                    <span className="text-white">{symbol}</span>
                    <div className="flex gap-3">
                      {exposure.buy > 0 && <span className="text-green-500">Buy: {exposure.buy}</span>}
                      {exposure.sell > 0 && <span className="text-red-500">Sell: {exposure.sell}</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">No exposure</div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
