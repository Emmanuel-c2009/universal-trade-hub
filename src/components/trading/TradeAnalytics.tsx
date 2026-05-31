// src/components/trading/TradeAnalytics.tsx

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Clock, BarChart3, AlertTriangle } from 'lucide-react';
import { advancedTradingService } from '@/services/advancedTradingService';

interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  totalProfit: number;
  totalLoss: number;
  winRate: number;
  averageHoldingTime: number;
  bestTrade: number;
  worstTrade: number;
  profitFactor: number;
  sharpeRatio: number;
  maxDrawdown: number;
}

interface TradeAnalyticsProps {
  userId: string;
}

export const TradeAnalytics = ({ userId }: TradeAnalyticsProps) => {
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 'week' | 'month'>('all');

  useEffect(() => {
    loadStats();
  }, [userId, selectedPeriod]);

  const loadStats = async () => {
    setLoading(true);
    const tradeStats = await advancedTradingService.getAdvancedTradeStats(userId);
    setStats(tradeStats);
    setLoading(false);
  };

  if (loading || !stats) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-muted rounded"></div>
              <div className="h-20 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => {
    return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${Math.floor(minutes)}m`;
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Trade Analytics
          </CardTitle>
          <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-6">All Time</TabsTrigger>
              <TabsTrigger value="month" className="text-xs h-6">Month</TabsTrigger>
              <TabsTrigger value="week" className="text-xs h-6">Week</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-green-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-500">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs">Win Rate</span>
            </div>
            <p className="text-xl font-bold">{formatPercent(stats.winRate)}</p>
            <p className="text-xs text-muted-foreground">
              {stats.winningTrades}W / {stats.losingTrades}L
            </p>
          </div>
          
          <div className="bg-blue-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-500">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs">Net Profit</span>
            </div>
            <p className={`text-xl font-bold ${stats.totalProfit - stats.totalLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(stats.totalProfit - stats.totalLoss)}
            </p>
          </div>
          
          <div className="bg-purple-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-500">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Avg Hold Time</span>
            </div>
            <p className="text-xl font-bold">{formatTime(stats.averageHoldingTime)}</p>
          </div>
          
          <div className="bg-orange-500/10 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-500">
              <TrendingDown className="h-4 w-4" />
              <span className="text-xs">Max Drawdown</span>
            </div>
            <p className="text-xl font-bold text-red-500">{formatCurrency(stats.maxDrawdown)}</p>
          </div>
        </div>

        {/* Detailed Stats */}
        <div className="border-t border-border pt-3">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Trades</span>
              <span className="font-medium">{stats.totalTrades}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Profit</span>
              <span className="text-green-500">{formatCurrency(stats.totalProfit)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Loss</span>
              <span className="text-red-500">{formatCurrency(stats.totalLoss)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Best Trade</span>
              <span className="text-green-500">{formatCurrency(stats.bestTrade)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Worst Trade</span>
              <span className="text-red-500">{formatCurrency(stats.worstTrade)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Profit Factor</span>
              <span className="font-medium">{stats.profitFactor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Sharpe Ratio</span>
              <span className={`font-medium ${stats.sharpeRatio >= 1 ? 'text-green-500' : stats.sharpeRatio >= 0.5 ? 'text-yellow-500' : 'text-red-500'}`}>
                {stats.sharpeRatio.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Warning */}
        {stats.maxDrawdown > stats.totalProfit && (
          <div className="bg-red-500/10 rounded-lg p-3 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="text-xs text-red-500">
              <p className="font-medium">Risk Alert</p>
              <p>Your drawdown exceeds total profit. Consider reducing position sizes.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};