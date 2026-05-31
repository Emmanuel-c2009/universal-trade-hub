import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MTAsset } from "@/pages/MetalTrader";
import { cn, formatEUR } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface MTOrderEntryProps {
  asset: MTAsset | null;
  balance: number;
  onPlaceOrder: (order: {
    symbol: string;
    type: 'buy' | 'sell';
    volume: number;
    stopLoss?: number;
    takeProfit?: number;
  }) => void;
}

export const MTOrderEntry = ({ asset, balance, onPlaceOrder }: MTOrderEntryProps) => {
  const [volume, setVolume] = useState(0.01);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");

  const marginRequired = asset ? volume * asset.ask * 0.01 : 0;
  const canTrade = marginRequired <= balance && volume > 0;

  const handleOrder = (type: 'buy' | 'sell') => {
    if (!asset || !canTrade) return;
    onPlaceOrder({
      symbol: asset.symbol, type, volume,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
    });
    setVolume(0.01);
    setStopLoss("");
    setTakeProfit("");
  };

  const adjustVolume = (delta: number) => {
    setVolume(prev => Math.max(0.01, parseFloat((prev + delta).toFixed(2))));
  };

  if (!asset) {
    return (
      <div className="h-full bg-white dark:bg-[#2d2e33] border border-gray-200 dark:border-[#3c3f45] rounded flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <AlertCircle className="w-6 h-6 mx-auto mb-1 opacity-50" />
          <p className="text-xs">Select an asset</p>
        </div>
      </div>
    );
  }

  const dec = asset.category === 'forex' ? 5 : 2;

  // MT5-style pip formatting for buy/sell buttons
  const formatButtonPrice = (price: number, decimals: number) => {
    const str = price.toFixed(decimals);
    if (decimals >= 4) {
      const parts = str.split('.');
      const smallPart = parts[1].slice(0, -2);
      const bigPart = parts[1].slice(-2);
      return (
        <span className="font-mono">
          {parts[0]}.{smallPart}<span className="text-2xl">{bigPart}</span>
        </span>
      );
    }
    return <span className="font-mono text-2xl">{str}</span>;
  };

  return (
    <div className="h-full bg-white dark:bg-[#2d2e33] border border-gray-200 dark:border-[#3c3f45] rounded p-3 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-bold text-sm">{asset.symbol}</span>
          <span className="text-[10px] text-muted-foreground ml-2">Market Execution</span>
        </div>
        <span className="text-[10px] text-muted-foreground">Margin: {formatEUR(marginRequired)}</span>
      </div>

      {/* Volume selector - MT5 style */}
      <div className="flex items-center gap-1 mb-2">
        <Label className="text-[10px] text-muted-foreground mr-1">Vol:</Label>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => adjustVolume(-0.1)}>-0.1</Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => adjustVolume(-0.01)}>-0.01</Button>
        <Input
          type="number" value={volume}
          onChange={(e) => setVolume(parseFloat(e.target.value) || 0.01)}
          step="0.01" min="0.01"
          className="h-7 text-center text-sm font-mono w-20"
        />
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => adjustVolume(0.01)}>+0.01</Button>
        <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => adjustVolume(0.1)}>+0.1</Button>
      </div>

      {/* SL/TP row */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <Label className="text-[10px] text-red-400">Stop Loss</Label>
          <Input
            type="number" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)}
            placeholder="0.00000"
            className="h-7 text-xs font-mono border-red-300 dark:border-red-900 focus:border-red-500"
          />
        </div>
        <div>
          <Label className="text-[10px] text-green-400">Take Profit</Label>
          <Input
            type="number" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)}
            placeholder="0.00000"
            className="h-7 text-xs font-mono border-green-300 dark:border-green-900 focus:border-green-500"
          />
        </div>
      </div>

      {/* Buy/Sell buttons - MT5 style with large prices */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          onClick={() => handleOrder('sell')}
          disabled={!canTrade}
          className="h-16 bg-[#FF3B30] hover:bg-[#FF3B30]/90 text-white flex flex-col items-center justify-center gap-0"
        >
          <span className="text-[10px] font-normal uppercase tracking-wider">Sell by Market</span>
          {formatButtonPrice(asset.bid, dec)}
        </Button>
        <Button
          onClick={() => handleOrder('buy')}
          disabled={!canTrade}
          className="h-16 bg-[#007AFF] hover:bg-[#007AFF]/90 text-white flex flex-col items-center justify-center gap-0"
        >
          <span className="text-[10px] font-normal uppercase tracking-wider">Buy by Market</span>
          {formatButtonPrice(asset.ask, dec)}
        </Button>
      </div>
    </div>
  );
};
