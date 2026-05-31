// src/pages/Trading.tsx

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useTheme } from "@/contexts/ThemeContext";
import { useMarketSentiment } from "@/hooks/useMarketSentiment";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { tradingService, TradeRecord } from "@/services/tradingService";
import { advancedTradingService, AdvancedTradeOptions, TradeWithHistory } from "@/services/advancedTradingService";
import { enhancedPriceService, EnhancedCryptoPrice } from "@/services/enhancedPriceService";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { LiveChatWidget } from "@/components/LiveChatWidget";
import { TradingViewChart } from "@/components/trading/TradingViewChart";
import { SoundProvider, SoundSettings, useSounds } from "@/components/trading/SoundManager";
import { TrendingCryptos } from "@/components/trading/TrendingCryptos";
import { MarketSentiment } from "@/components/trading/MarketSentiment";
import { ConnectionStatus } from "@/components/trading/ConnectionStatus";
import { TradeTimer } from "@/components/trading/TradeTimer";
import { TradeAnalytics } from "@/components/trading/TradeAnalytics";
import { Skeleton, TradeFormSkeleton, MarketListSkeleton, PositionsSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wifi, WifiOff, ChevronUp, ChevronDown, 
  Activity, History, Volume2, TrendingUp, BarChart3,
  X, Menu, ArrowUpRight, ArrowDownRight,
  RefreshCw, Clock, AlertCircle, Settings2
} from "lucide-react";
import { toast } from "sonner";
import { checkProfitMilestones } from "@/lib/profitMilestones";

// Types
interface Position {
  id: string;
  symbol: string;
  name: string;
  image: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  expiryTime?: string;
  isExpiringSoon?: boolean;
  createdAt: Date;
}

interface Trade {
  id: string;
  symbol: string;
  name: string;
  image: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  status: string;
  notes?: string;
  tags?: string[];
  createdAt: Date;
  closedAt: Date;
}

// Collapsible Account Balance Component
const CollapsibleAccountBalance = ({ 
  balances, 
  onToggle,
  isCollapsed,
  onRefresh,
  isLoading
}: { 
  balances: { total: number; available: number; invested: number; todayPnl: number; unrealizedPnl: number; realizedPnl: number };
  onToggle: () => void;
  isCollapsed: boolean;
  onRefresh?: () => void;
  isLoading?: boolean;
}) => {
  const totalPnl = balances.todayPnl + balances.unrealizedPnl + balances.realizedPnl;

  if (isLoading) {
    return (
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isCollapsed) {
    return (
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3 mb-4 cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="text-xl font-bold">€{balances.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="text-right">
            <p className={`text-sm font-medium ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {totalPnl >= 0 ? '+' : ''}€{Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground">Total P&L</p>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Account Balance</CardTitle>
          <div className="flex gap-1">
            {onRefresh && (
              <Button variant="ghost" size="icon" onClick={onRefresh} className="h-8 w-8">
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onToggle} className="h-8 w-8">
              <ChevronUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 rounded-lg p-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-3xl font-bold">€{balances.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className={`text-right ${totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              <p className="text-sm">Total P&L</p>
              <p className="text-xl font-bold">{totalPnl >= 0 ? '+' : ''}€{Math.abs(totalPnl).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg">
            <span className="text-sm font-medium">💰 Trading Balance</span>
            <span className="font-bold text-lg">€{balances.available.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between text-sm px-2">
            <span className="text-muted-foreground">📊 Invested</span>
            <span className="font-medium">€{balances.invested.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        
        <div className="border-t border-border pt-3">
          <p className="text-sm font-medium mb-2">P&L Breakdown</p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Today's P&L</span>
              <span className={balances.todayPnl >= 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                {balances.todayPnl >= 0 ? '+' : ''}€{balances.todayPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Unrealized P&L</span>
              <span className={balances.unrealizedPnl >= 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                {balances.unrealizedPnl >= 0 ? '+' : ''}€{balances.unrealizedPnl.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Realized P&L</span>
              <span className={balances.realizedPnl >= 0 ? 'text-green-500 font-medium' : 'text-red-500 font-medium'}>
                {balances.realizedPnl >= 0 ? '+' : ''}€{balances.realizedPnl.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Crypto Market List Component
const CryptoMarketList = ({ 
  cryptos, 
  selectedCrypto, 
  onSelectCrypto,
  loading 
}: { 
  cryptos: EnhancedCryptoPrice[]; 
  selectedCrypto: EnhancedCryptoPrice | null; 
  onSelectCrypto: (crypto: EnhancedCryptoPrice) => void;
  loading: boolean;
}) => {
  if (loading) {
    return <MarketListSkeleton />;
  }

  const validCryptos = cryptos.filter(crypto => 
    crypto && crypto.price !== null && crypto.price !== undefined
  );

  if (validCryptos.length === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <p>Loading market data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Crypto Pairs (EUR)</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
          {validCryptos.map((crypto) => {
            const price = crypto.price || 0;
            const change = crypto.change24h || 0;
            
            return (
              <div
                key={crypto.symbol}
                className={`p-3 cursor-pointer transition-colors hover:bg-muted/50 ${
                  selectedCrypto?.symbol === crypto.symbol ? 'bg-primary/10 border-l-4 border-primary' : ''
                }`}
                onClick={() => onSelectCrypto(crypto)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {crypto.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{crypto.symbol}/EUR</p>
                      <p className="text-xs text-muted-foreground">{crypto.symbol}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">€{price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className={`text-xs ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// Trade Form Component with Advanced Options
const TradeFormComponent = ({ 
  selectedCrypto, 
  availableBalance, 
  onTrade,
  onTradeExecuted,
  isLoading
}: { 
  selectedCrypto: EnhancedCryptoPrice | null; 
  availableBalance: number;
  onTrade: (trade: { side: 'buy' | 'sell'; quantity: number; price: number; stopLoss?: number; takeProfit?: number; expiryMinutes?: number }) => Promise<void>;
  onTradeExecuted?: () => void;
  isLoading?: boolean;
}) => {
  const [amount, setAmount] = useState<number>(0);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);
  const [expiryMinutes, setExpiryMinutes] = useState<number>(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (isLoading || !selectedCrypto) {
    return <TradeFormSkeleton />;
  }

  const currentPrice = selectedCrypto.price || 0;
  const totalValue = amount * currentPrice;
  const canTrade = totalValue <= availableBalance && amount > 0;

  const handleSubmit = async () => {
    if (!canTrade) {
      toast.error(`Insufficient balance. Need €${totalValue.toFixed(2)}`);
      return;
    }
    
    if (amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      await onTrade({
        side,
        quantity: amount,
        price: currentPrice,
        stopLoss: stopLoss || undefined,
        takeProfit: takeProfit || undefined,
        expiryMinutes: expiryMinutes || undefined
      });
      
      setAmount(0);
      setStopLoss(0);
      setTakeProfit(0);
      setExpiryMinutes(0);
      setShowAdvanced(false);
      
      if (onTradeExecuted) {
        onTradeExecuted();
      }
      
    } catch (error) {
      console.error('Trade error in form:', error);
      toast.error("Failed to execute trade");
    } finally {
      setIsSubmitting(false);
    }
  };

  const quickAmounts = [0.001, 0.005, 0.01, 0.05, 0.1];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Trade {selectedCrypto.symbol}/EUR</CardTitle>
          <Badge variant={side === 'buy' ? 'default' : 'secondary'} className="capitalize">
            {side} Mode
          </Badge>
        </div>
        <div className="mt-2">
          <p className="text-3xl font-bold">€{currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">Current Price</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            variant={side === 'buy' ? 'default' : 'outline'}
            className={`${side === 'buy' ? 'bg-green-600 hover:bg-green-700' : ''}`}
            onClick={() => setSide('buy')}
          >
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Buy
          </Button>
          <Button
            variant={side === 'sell' ? 'default' : 'outline'}
            className={`${side === 'sell' ? 'bg-red-600 hover:bg-red-700' : ''}`}
            onClick={() => setSide('sell')}
          >
            <ArrowDownRight className="h-4 w-4 mr-1" />
            Sell
          </Button>
        </div>

        <div>
          <label className="text-sm text-muted-foreground mb-1 block">Amount ({selectedCrypto.symbol})</label>
          <input
            type="number"
            value={amount || ''}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full p-2 rounded-lg border border-input bg-background"
            placeholder={`Enter amount in ${selectedCrypto.symbol}`}
            step="0.0001"
          />
          <div className="flex justify-between mt-2">
            <span className="text-xs text-muted-foreground">≈ €{totalValue.toFixed(2)}</span>
            <div className="flex gap-1">
              {quickAmounts.map(qty => (
                <button
                  key={qty}
                  onClick={() => setAmount(qty)}
                  className="text-xs px-2 py-0.5 rounded bg-muted hover:bg-muted/80"
                >
                  {qty}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Stop Loss (€)</label>
            <input
              type="number"
              value={stopLoss || ''}
              onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
              className="w-full p-2 rounded-lg border border-input bg-background"
              placeholder="Optional"
            />
            {stopLoss > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Risk: €{((currentPrice - stopLoss) * amount).toFixed(2)}
              </p>
            )}
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1 block">Take Profit (€)</label>
            <input
              type="number"
              value={takeProfit || ''}
              onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
              className="w-full p-2 rounded-lg border border-input bg-background"
              placeholder="Optional"
            />
            {takeProfit > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Potential: €{((takeProfit - currentPrice) * amount).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          <Settings2 className="h-3 w-3 mr-1" />
          {showAdvanced ? '▼' : '▶'} Advanced Options
        </Button>

        {showAdvanced && (
          <div className="space-y-3 pt-2 border-t border-border">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Auto-Close After
              </label>
              <select
                value={expiryMinutes}
                onChange={(e) => setExpiryMinutes(parseInt(e.target.value))}
                className="w-full p-2 rounded-lg border border-input bg-background text-sm"
              >
                <option value={0}>Never (Manual Close)</option>
                <option value={5}>5 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={60}>1 hour</option>
                <option value={120}>2 hours</option>
                <option value={360}>6 hours</option>
                <option value={720}>12 hours</option>
                <option value={1440}>24 hours</option>
              </select>
            </div>
          </div>
        )}

        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={isSubmitting || amount <= 0 || !canTrade}
          size="lg"
        >
          {isSubmitting ? 'Processing...' : `${side === 'buy' ? 'Buy' : 'Sell'} ${selectedCrypto.symbol}`}
        </Button>

        {!canTrade && amount > 0 && (
          <p className="text-xs text-red-500 text-center">
            Insufficient trading balance. Available: €{availableBalance.toFixed(2)}
          </p>
        )}
      </CardContent>
    </Card>
  );
};

// Active Positions Component with Timer
const ActivePositionsComponent = ({ 
  positions, 
  onClosePosition,
  onExtendTrade,
  onRefresh,
  isLoading
}: { 
  positions: Position[]; 
  onClosePosition: (id: string) => void;
  onExtendTrade?: (id: string, minutes: number) => void;
  onRefresh?: () => void;
  isLoading?: boolean;
}) => {
  const [filter, setFilter] = useState<'all' | 'profitable' | 'losing'>('all');

  if (isLoading) {
    return <PositionsSkeleton />;
  }

  const stats = {
    total: positions.length,
    profitable: positions.filter(p => p.pnl > 0).length,
    losing: positions.filter(p => p.pnl < 0).length,
    totalPnl: positions.reduce((sum, p) => sum + p.pnl, 0)
  };

  const filteredPositions = positions.filter(pos => {
    if (filter === 'profitable') return pos.pnl > 0;
    if (filter === 'losing') return pos.pnl < 0;
    return true;
  });

  return (
    <Card id="active-positions-section">
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <CardTitle>Active Positions ({positions.length})</CardTitle>
          <div className="flex gap-2">
            <div className="flex gap-1">
              <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
              <Button size="sm" variant={filter === 'profitable' ? 'default' : 'outline'} onClick={() => setFilter('profitable')}>Profitable</Button>
              <Button size="sm" variant={filter === 'losing' ? 'default' : 'outline'} onClick={() => setFilter('losing')}>Losing</Button>
            </div>
            {onRefresh && (
              <Button size="sm" variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Positions</p>
            <p className="text-xl font-bold">{stats.total}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Profitable</p>
            <p className="text-xl font-bold text-green-500">{stats.profitable}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Losing</p>
            <p className="text-xl font-bold text-red-500">{stats.losing}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total P&L</p>
            <p className={`text-xl font-bold ${stats.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {stats.totalPnl >= 0 ? '+' : ''}€{stats.totalPnl.toFixed(2)}
            </p>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No active positions</p>
            <p className="text-sm">Start trading to see your positions here</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {filteredPositions.map((pos) => (
              <div key={pos.id} className="p-3 border border-border rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {pos.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold">{pos.symbol}/EUR</p>
                      <p className={`text-xs font-medium ${pos.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {pos.side.toUpperCase()}
                      </p>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => onClosePosition(pos.id)}
                  >
                    Close
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Quantity</p>
                    <p className="font-mono">{pos.quantity.toFixed(6)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Entry</p>
                    <p className="font-mono">€{pos.entryPrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Current</p>
                    <p className="font-mono">€{pos.currentPrice.toFixed(2)}</p>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-border">
                  <span className="text-xs text-muted-foreground">P&L</span>
                  <div className={`font-bold ${pos.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {pos.pnl >= 0 ? '+' : ''}€{pos.pnl.toFixed(2)} 
                    <span className="text-sm ml-1">({pos.pnlPercent.toFixed(2)}%)</span>
                  </div>
                </div>
                
                {pos.expiryTime && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <TradeTimer
                      expiryTime={pos.expiryTime}
                      onExtend={(minutes) => onExtendTrade?.(pos.id, minutes)}
                      isExpiringSoon={pos.isExpiringSoon}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Trade History Component
const TradeHistoryComponent = ({ trades, onRefresh, isLoading }: { trades: Trade[]; onRefresh?: () => void; isLoading?: boolean }) => {
  const [filter, setFilter] = useState<'all' | 'profit' | 'loss'>('all');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  const filteredTrades = trades.filter(t => {
    if (filter === 'profit') return t.pnl > 0;
    if (filter === 'loss') return t.pnl < 0;
    return true;
  });

  const totalProfit = trades.reduce((sum, t) => sum + (t.pnl > 0 ? t.pnl : 0), 0);
  const totalLoss = Math.abs(trades.reduce((sum, t) => sum + (t.pnl < 0 ? t.pnl : 0), 0));

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-4">
          <CardTitle>Trade History ({trades.length})</CardTitle>
          <div className="flex gap-2">
            <div className="flex gap-1">
              <Button size="sm" variant={filter === 'all' ? 'default' : 'outline'} onClick={() => setFilter('all')}>All</Button>
              <Button size="sm" variant={filter === 'profit' ? 'default' : 'outline'} onClick={() => setFilter('profit')}>Profits</Button>
              <Button size="sm" variant={filter === 'loss' ? 'default' : 'outline'} onClick={() => setFilter('loss')}>Losses</Button>
            </div>
            {onRefresh && (
              <Button size="sm" variant="outline" onClick={onRefresh}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-green-500">Total Profit: €{totalProfit.toFixed(2)}</span>
          <span className="text-red-500">Total Loss: €{totalLoss.toFixed(2)}</span>
          <span className="font-medium">Net: €{(totalProfit - totalLoss).toFixed(2)}</span>
        </div>
      </CardHeader>
      <CardContent>
        {trades.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No trade history yet</p>
            <p className="text-sm">Your completed trades will appear here</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTrades.map((trade) => (
              <div key={trade.id} className="p-3 border border-border rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                      {trade.symbol.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{trade.symbol}/EUR</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(trade.closedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className={`font-bold ${trade.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trade.pnl >= 0 ? '+' : ''}€{trade.pnl.toFixed(2)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mt-2">
                  <div><span className="text-muted-foreground">Qty:</span> {trade.quantity.toFixed(6)}</div>
                  <div><span className="text-muted-foreground">Entry:</span> €{trade.entryPrice.toFixed(2)}</div>
                  <div><span className="text-muted-foreground">Exit:</span> €{trade.exitPrice.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Slide-Down Menu Component (Mobile only)
const SlideDownMenu = ({ 
  isOpen, 
  onClose, 
  onSelect,
  activeTab,
  trending,
  sentiment,
  sentimentLoading
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onSelect: (tab: string) => void;
  activeTab: string;
  trending: any[];
  sentiment: any;
  sentimentLoading: boolean;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-50 bg-background/98 backdrop-blur-lg border-b border-border shadow-lg lg:hidden">
      <div className="container mx-auto px-4 py-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4 sticky top-0 bg-background/98 pb-2">
          <h2 className="text-xl font-bold">Menu</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button variant={activeTab === 'positions' ? "default" : "outline"} className="flex flex-col items-center gap-2 py-4 h-auto" onClick={() => { onSelect('positions'); onClose(); }}>
            <Activity className="h-6 w-6" /><span className="text-sm">Active Positions</span>
          </Button>
          <Button variant={activeTab === 'history' ? "default" : "outline"} className="flex flex-col items-center gap-2 py-4 h-auto" onClick={() => { onSelect('history'); onClose(); }}>
            <History className="h-6 w-6" /><span className="text-sm">Trade History</span>
          </Button>
          <Button variant={activeTab === 'sound' ? "default" : "outline"} className="flex flex-col items-center gap-2 py-4 h-auto" onClick={() => { onSelect('sound'); onClose(); }}>
            <Volume2 className="h-6 w-6" /><span className="text-sm">Sound Settings</span>
          </Button>
          <Button variant={activeTab === 'trending' ? "default" : "outline"} className="flex flex-col items-center gap-2 py-4 h-auto" onClick={() => { onSelect('trending'); onClose(); }}>
            <TrendingUp className="h-6 w-6" /><span className="text-sm">Trending</span>
          </Button>
          <Button variant={activeTab === 'sentiment' ? "default" : "outline"} className="flex flex-col items-center gap-2 py-4 h-auto" onClick={() => { onSelect('sentiment'); onClose(); }}>
            <BarChart3 className="h-6 w-6" /><span className="text-sm">Sentiment</span>
          </Button>
          <Button variant={activeTab === 'analytics' ? "default" : "outline"} className="flex flex-col items-center gap-2 py-4 h-auto" onClick={() => { onSelect('analytics'); onClose(); }}>
            <BarChart3 className="h-6 w-6" /><span className="text-sm">Analytics</span>
          </Button>
        </div>

        {(activeTab === 'trending' || activeTab === 'sentiment') && (
          <div className="border-t border-border pt-4 mt-2">
            {activeTab === 'trending' && <TrendingCryptos trending={trending} loading={sentimentLoading} onSelect={() => {}} />}
            {activeTab === 'sentiment' && <MarketSentiment sentiment={sentiment} globalData={null} loading={sentimentLoading} />}
          </div>
        )}
      </div>
    </div>
  );
};

// Main Trading Component
const TradingContent = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [selectedCrypto, setSelectedCrypto] = useState<EnhancedCryptoPrice | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [tradeHistory, setTradeHistory] = useState<Trade[]>([]);
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const [prices, setPrices] = useState<EnhancedCryptoPrice[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('positions');
  const [balanceCollapsed, setBalanceCollapsed] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [chartApi, setChartApi] = useState<any>(null);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  
  const navigate = useNavigate();
  const { theme } = useTheme();
  const { sentiment, trending, globalData, loading: sentimentLoading, refreshSentiment } = useMarketSentiment();
  const { playSound } = useSounds();
  const { balance, loading: balanceLoading, refreshBalance } = useUnifiedBalance(session?.user?.id || null);
  
  const activeTradeLinesRef = useRef<Map<string, any>>(new Map());
  const monitoringInitialized = useRef(false);

  const [accountBalances, setAccountBalances] = useState({
    total: 0,
    available: 0,
    invested: 0,
    todayPnl: 0,
    unrealizedPnl: 0,
    realizedPnl: 0
  });

  // Subscribe to enhanced price service
  useEffect(() => {
    const unsubscribe = enhancedPriceService.subscribeToPrices((newPrices) => {
      setPrices(newPrices);
      setPricesLoading(false);
    });
    
    const connectionUnsubscribe = enhancedPriceService.subscribeToConnection((isLive, attempt) => {
      setConnected(isLive);
      if (!isLive && attempt > 0) {
        toast.warning(`Reconnecting to price feed... (Attempt ${attempt}/10)`, { duration: 3000 });
      } else if (isLive) {
        toast.success("Live price feed connected", { duration: 2000 });
      }
    });
    
    return () => {
      unsubscribe();
      connectionUnsubscribe();
    };
  }, []);

  // Set default selected crypto
  useEffect(() => {
    if (prices.length > 0 && !selectedCrypto) {
      setSelectedCrypto(prices[0]);
    }
  }, [prices, selectedCrypto]);

  // Update positions with real-time prices
  useEffect(() => {
    if (prices.length > 0 && positions.length > 0) {
      setPositions(prev => 
        prev.map(pos => {
          const currentPriceData = prices.find(p => p.symbol.toLowerCase() === pos.symbol.toLowerCase());
          if (!currentPriceData) return pos;
          
          const currentPrice = currentPriceData.price || 0;
          const pnl = pos.side === "buy"
            ? (currentPrice - pos.entryPrice) * pos.quantity
            : (pos.entryPrice - currentPrice) * pos.quantity;
          const pnlPercent = ((currentPrice - pos.entryPrice) / pos.entryPrice) * 100;
          
          return { ...pos, currentPrice, pnl, pnlPercent };
        })
      );
    }
  }, [prices]);

  // Update account balances
  useEffect(() => {
    const totalInvested = positions.reduce((sum, p) => sum + (p.quantity * p.entryPrice), 0);
    const totalUnrealizedPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
    
    setAccountBalances({
      total: (balance?.funding_balance || balance?.trading_balance || 0) + totalInvested,
      available: balance?.trading_balance || 0,
      invested: totalInvested,
      todayPnl: balance?.today_pnl || 0,
      unrealizedPnl: totalUnrealizedPnl,
      realizedPnl: balance?.total_profit || 0
    });
  }, [balance, positions]);

  // Auth & Profile
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/auth");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (!session) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch profile and portfolio
  useEffect(() => {
    if (session?.user?.id) {
      fetchProfile(session.user.id);
      initializePortfolio(session.user.id);
      loadTrades(session.user.id);
      
      enhancedPriceService.setUserId(session.user.id);
    }
    
    return () => {
      enhancedPriceService.setUserId(null);
    };
  }, [session?.user?.id]);

  // Initialize real-time monitoring (ONCE)
  useEffect(() => {
    if (session?.user?.id && !monitoringInitialized.current) {
      monitoringInitialized.current = true;
      
      advancedTradingService.initializeRealtimeMonitoring(
        session.user.id,
        (updatedTrade) => {
          // Only show notification for auto-closed trades
          if (updatedTrade.status === 'closed') {
            toast.info(`${updatedTrade.symbol} has been auto-closed`, { duration: 3000 });
            loadTrades(session.user.id);
          }
        }
      );
    }
    
    return () => {
      if (monitoringInitialized.current) {
        advancedTradingService.stopRealtimeMonitoring();
        monitoringInitialized.current = false;
      }
    };
  }, [session?.user?.id]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  const initializePortfolio = async (userId: string) => {
    const portfolio = await tradingService.getOrCreatePortfolio(userId);
    if (portfolio) setPortfolioId(portfolio.id);
  };

  const loadTrades = useCallback(async (userId: string) => {
    setIsLoadingTrades(true);
    try {
      const [openTrades, closedTrades] = await Promise.all([
        tradingService.getOpenTrades(userId),
        tradingService.getClosedTrades(userId)
      ]);

      setPositions(openTrades.map(convertTradeToPosition));
      setTradeHistory(closedTrades.map(convertTradeToHistory));
      console.log(`Loaded ${openTrades.length} open trades, ${closedTrades.length} closed trades`);
    } catch (error) {
      console.error("Error loading trades:", error);
    } finally {
      setIsLoadingTrades(false);
    }
  }, []);

  const convertTradeToPosition = (trade: TradeRecord): Position => {
    const priceData = prices.find(p => p.symbol.toLowerCase() === trade.symbol.toLowerCase());
    return {
      id: trade.id,
      symbol: trade.symbol,
      name: trade.name,
      image: '',
      side: trade.side as 'buy' | 'sell',
      quantity: trade.quantity,
      entryPrice: trade.entry_price,
      currentPrice: trade.current_price || trade.entry_price,
      pnl: trade.pnl || 0,
      pnlPercent: trade.entry_price > 0 ? (((trade.current_price || trade.entry_price) - trade.entry_price) / trade.entry_price) * 100 : 0,
      stopLoss: trade.stop_loss || undefined,
      takeProfit: trade.take_profit || undefined,
      expiryTime: (trade as any).expiry_time || undefined,
      isExpiringSoon: (trade as any).isExpiringSoon || false,
      createdAt: new Date(trade.created_at || Date.now())
    };
  };

  const convertTradeToHistory = (trade: TradeRecord): Trade => {
    const priceData = prices.find(p => p.symbol.toLowerCase() === trade.symbol.toLowerCase());
    return {
      id: trade.id,
      symbol: trade.symbol,
      name: trade.name,
      image: '',
      side: trade.side as 'buy' | 'sell',
      quantity: trade.quantity,
      entryPrice: trade.entry_price,
      exitPrice: trade.current_price || trade.entry_price,
      pnl: trade.pnl || 0,
      pnlPercent: trade.entry_price > 0 ? (((trade.current_price || trade.entry_price) - trade.entry_price) / trade.entry_price) * 100 : 0,
      status: 'closed',
      createdAt: new Date(trade.created_at || Date.now()),
      closedAt: new Date(trade.closed_at || Date.now())
    };
  };

  const handleChartReady = useCallback((api: any) => {
    setChartApi(api);
    console.log('Chart API ready');
  }, []);

  const handleTrade = useCallback(async (trade: { side: "buy" | "sell"; quantity: number; price: number; stopLoss?: number; takeProfit?: number; expiryMinutes?: number }) => {
    console.log("=== TRADE EXECUTION STARTED ===");
    console.log("Trade details:", trade);
    
    if (!selectedCrypto) {
      console.error("TRADE ERROR: No cryptocurrency selected");
      toast.error("No cryptocurrency selected");
      throw new Error("No cryptocurrency selected");
    }
    
    if (!session?.user?.id) {
      console.error("TRADE ERROR: User not logged in");
      toast.error("You must be logged in to trade");
      throw new Error("User not logged in");
    }

    if (!portfolioId) {
      console.error("TRADE ERROR: No portfolio found");
      toast.error("Trading portfolio not initialized");
      throw new Error("No portfolio found");
    }

    const totalCost = trade.quantity * trade.price;
    console.log(`Total cost: €${totalCost}, Available balance: €${accountBalances.available}`);

    if (totalCost > accountBalances.available) {
      console.error("TRADE ERROR: Insufficient balance");
      toast.error(`Insufficient trading balance. Need €${totalCost.toFixed(2)}`);
      throw new Error("Insufficient balance");
    }

    if (trade.quantity <= 0) {
      console.error("TRADE ERROR: Invalid quantity");
      toast.error("Please enter a valid amount");
      throw new Error("Invalid quantity");
    }

    if (trade.price <= 0) {
      console.error("TRADE ERROR: Invalid price");
      toast.error("Invalid price data");
      throw new Error("Invalid price");
    }

    try {
      console.log("Creating trade with advancedTradingService...");
      
      const newTrade = await advancedTradingService.createAdvancedTrade(
        session.user.id,
        portfolioId,
        selectedCrypto.symbol,
        selectedCrypto.symbol,
        trade.side,
        trade.quantity,
        trade.price,
        {
          expiryMinutes: trade.expiryMinutes || undefined,
          stopLoss: trade.stopLoss,
          takeProfit: trade.takeProfit,
          orderType: 'market',
          notes: `${trade.side} ${selectedCrypto.symbol} at €${trade.price}`
        }
      );

      console.log("Trade creation result:", newTrade);

      if (newTrade && newTrade.id) {
        console.log(`✅ Trade created successfully! ID: ${newTrade.id}`);
        toast.success(`${trade.side === "buy" ? "Buy" : "Sell"} order placed successfully`);
        
        if (trade.expiryMinutes && trade.expiryMinutes > 0) {
          toast.info(`Trade will auto-close in ${trade.expiryMinutes} minutes`, { duration: 4000 });
        }
        
        playSound("tradeOpen");
        
        await Promise.all([
          refreshBalance(),
          loadTrades(session.user.id)
        ]);
        
        setActiveTab('positions');
        
        setTimeout(() => {
          const positionsElement = document.getElementById('active-positions-section');
          if (positionsElement) {
            positionsElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        
        console.log("=== TRADE EXECUTION COMPLETED SUCCESSFULLY ===");
      } else {
        console.error("TRADE ERROR: Trade creation returned null or missing ID");
        toast.error("Failed to place order - trade service returned invalid response");
        throw new Error("Trade creation failed");
      }
    } catch (error) {
      console.error("TRADE EXCEPTION:", error);
      toast.error(`Trade failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      throw error;
    }
  }, [selectedCrypto, session?.user?.id, portfolioId, accountBalances.available, refreshBalance, playSound, loadTrades]);

  const handleClosePosition = useCallback(async (id: string) => {
    const position = positions.find((p) => p.id === id);
    if (!position) return;

    const closedTrade = await tradingService.closeTrade(id, position.currentPrice, position.pnl);
    
    if (closedTrade) {
      if (position.pnl >= 0) {
        playSound("tradeWin");
        toast.success(`Position closed with +€${position.pnl.toFixed(2)} profit`);
      } else {
        playSound("tradeLoss");
        toast.success(`Position closed with -€${Math.abs(position.pnl).toFixed(2)} loss`);
      }
      await refreshBalance();
      await loadTrades(session?.user?.id || '');
      if (position.pnl > 0 && session?.user?.id) {
        await checkProfitMilestones(session.user.id);
      }
    } else {
      toast.error("Failed to close position");
    }
  }, [positions, playSound, refreshBalance, session?.user?.id, loadTrades]);

  const handleExtendTrade = useCallback(async (id: string, minutes: number) => {
    const success = await advancedTradingService.extendTradeExpiry(id, minutes);
    if (success) {
      toast.success(`Trade extended by ${minutes} minutes`);
      await loadTrades(session?.user?.id || '');
    } else {
      toast.error("Failed to extend trade");
    }
  }, [session?.user?.id, loadTrades]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshBalance(), loadTrades(session?.user?.id || ''), refreshSentiment()]);
    setIsRefreshing(false);
    toast.success("Data refreshed");
  };

  const userName = profile?.full_name || session?.user?.email?.split("@")[0] || "Trader";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading trading platform...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader 
        userName={userName} 
        onMenuClick={() => setSidebarOpen(true)} 
        notificationCount={0} 
        messageCount={0} 
        avatarUrl={profile?.avatar_url} 
        verificationStatus={profile?.profile_status} 
        pageTitle="Crypto Trading" 
      />
      <LiveChatWidget />

      <div className="fixed top-20 right-4 z-40 lg:hidden">
        <Button size="sm" variant="outline" className="shadow-lg" onClick={() => setMenuOpen(true)}>
          <Menu className="h-4 w-4 mr-1" /> Menu
        </Button>
      </div>

      <div className="sticky top-16 z-40 bg-background border-b border-border hidden lg:block">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 py-2 overflow-x-auto">
            <Button variant={activeTab === 'positions' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('positions')}>
              <Activity className="h-4 w-4 mr-2" /> Active Positions ({positions.length})
            </Button>
            <Button variant={activeTab === 'history' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('history')}>
              <History className="h-4 w-4 mr-2" /> Trade History ({tradeHistory.length})
            </Button>
            <Button variant={activeTab === 'sound' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('sound')}>
              <Volume2 className="h-4 w-4 mr-2" /> Sound Settings
            </Button>
            <Button variant={activeTab === 'trending' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('trending')}>
              <TrendingUp className="h-4 w-4 mr-2" /> Trending Cryptos
            </Button>
            <Button variant={activeTab === 'sentiment' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('sentiment')}>
              <BarChart3 className="h-4 w-4 mr-2" /> Market Sentiment
            </Button>
            <Button variant={activeTab === 'analytics' ? 'default' : 'ghost'} size="sm" onClick={() => setActiveTab('analytics')}>
              <BarChart3 className="h-4 w-4 mr-2" /> Analytics
            </Button>
          </div>
        </div>
      </div>

      <SlideDownMenu 
        isOpen={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        onSelect={(tab) => setActiveTab(tab)} 
        activeTab={activeTab} 
        trending={trending} 
        sentiment={sentiment} 
        sentimentLoading={sentimentLoading} 
      />

      <main className="container mx-auto px-4 pt-28 max-w-[1600px]">
        <div className="flex items-center justify-between gap-2 mb-4">
          <ConnectionStatus onConnectionChange={setConnected} />
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-3 w-3 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>

        {activeTab === 'trending' && (
          <div className="hidden lg:block mb-4">
            <TrendingCryptos trending={trending} loading={sentimentLoading} onSelect={(symbol) => {
              const crypto = prices.find(p => p.symbol.toUpperCase() === symbol);
              if (crypto) setSelectedCrypto(crypto);
            }} />
          </div>
        )}
        {activeTab === 'sentiment' && (
          <div className="hidden lg:block mb-4">
            <MarketSentiment sentiment={sentiment} globalData={globalData} loading={sentimentLoading} />
          </div>
        )}
        {activeTab === 'analytics' && session?.user?.id && (
          <div className="hidden lg:block mb-4">
            <TradeAnalytics userId={session.user.id} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-2 order-2 lg:order-1 space-y-4">
            <CryptoMarketList 
              cryptos={prices} 
              selectedCrypto={selectedCrypto} 
              onSelectCrypto={setSelectedCrypto} 
              loading={pricesLoading} 
            />
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2">
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <TradingViewChart 
                symbol={selectedCrypto?.symbol || "BTC"} 
                theme={theme}
                onChartReady={handleChartReady}
              />
            </div>
          </div>

          <div className="lg:col-span-3 order-3 space-y-4">
            <CollapsibleAccountBalance 
              balances={accountBalances} 
              isCollapsed={balanceCollapsed} 
              onToggle={() => setBalanceCollapsed(!balanceCollapsed)} 
              onRefresh={handleRefresh}
              isLoading={balanceLoading}
            />
            <TradeFormComponent 
              selectedCrypto={selectedCrypto} 
              availableBalance={accountBalances.available} 
              onTrade={handleTrade} 
              onTradeExecuted={() => setActiveTab('positions')}
              isLoading={pricesLoading}
            />
          </div>
        </div>

        {(activeTab === 'positions' || activeTab === 'history' || activeTab === 'sound' || activeTab === 'analytics') && (
          <div className="mt-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full justify-start overflow-x-auto lg:hidden">
                <TabsTrigger value="positions">Active Positions ({positions.length})</TabsTrigger>
                <TabsTrigger value="history">Trade History ({tradeHistory.length})</TabsTrigger>
                <TabsTrigger value="sound">Sound Settings</TabsTrigger>
                <TabsTrigger value="analytics">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="positions">
                <ActivePositionsComponent 
                  positions={positions} 
                  onClosePosition={handleClosePosition}
                  onExtendTrade={handleExtendTrade}
                  onRefresh={handleRefresh}
                  isLoading={isLoadingTrades}
                />
              </TabsContent>

              <TabsContent value="history">
                <TradeHistoryComponent 
                  trades={tradeHistory} 
                  onRefresh={handleRefresh}
                  isLoading={isLoadingTrades}
                />
              </TabsContent>

              <TabsContent value="sound">
                <Card>
                  <CardHeader>
                    <CardTitle>Sound Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SoundSettings />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics">
                {session?.user?.id && (
                  <TradeAnalytics userId={session.user.id} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default function Trading() {
  return (
    <SoundProvider>
      <TradingContent />
    </SoundProvider>
  );
}