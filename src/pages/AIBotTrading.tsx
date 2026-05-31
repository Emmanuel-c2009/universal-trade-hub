import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import AIBotLoader from "@/components/aibot/AIBotLoader";
import { AIBotCard } from "@/components/aibot/AIBotCard";
import { ActiveBotTrades } from "@/components/aibot/ActiveBotTrades";
import { AIBotHistory } from "@/components/aibot/AIBotHistory";
import { SubscriptionModal } from "@/components/aibot/SubscriptionModal";
import { ExternalBotForm } from "@/components/aibot/ExternalBotForm";
import { TradeDetailsModal } from "@/components/aibot/TradeDetailsModal";
import { Button } from "@/components/ui/button";
import { Wallet, Bot, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { aiBotService, type AIBot, type AIBotTrade, type UserBalance } from "@/services/aiBotService";
import { toast } from "sonner";

const AIBotTrading = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<UserBalance | null>(null);
  const [bots, setBots] = useState<AIBot[]>([]);
  const [activeTrades, setActiveTrades] = useState<AIBotTrade[]>([]);
  const [tradeHistory, setTradeHistory] = useState<AIBotTrade[]>([]);
  const [selectedBot, setSelectedBot] = useState<AIBot | null>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<AIBotTrade | null>(null);
  const [showTradeDetails, setShowTradeDetails] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);

      // Fetch data
      const [botsData, balance] = await Promise.all([
        aiBotService.getActiveBots(),
        aiBotService.getUserBalance(session.user.id),
      ]);

      setBots(botsData);
      setUserBalance(balance);

      // Fetch trades
      const [active, history] = await Promise.all([
        aiBotService.getActiveTrades(session.user.id),
        aiBotService.getTradeHistory(session.user.id),
      ]);

      setActiveTrades(active);
      setTradeHistory(history);

      setTimeout(() => setIsLoading(false), 3000);
    };

    init();
  }, [navigate]);

  const handleSubscribe = (bot: AIBot) => {
    setSelectedBot(bot);
    setShowSubscriptionModal(true);
  };

  const handleConfirmSubscription = async (allocatedAmount: number) => {
    if (!user || !selectedBot) return;

    // Create subscription and initial trade
    const subscription = await aiBotService.subscribeToBot(
      user.id,
      selectedBot.id,
      allocatedAmount
    );

    if (subscription) {
      // Create initial trade
      const tradingPair = selectedBot.trading_pairs[0] || 'EUR/USD';
      const entryPrice = tradingPair.includes('BTC') ? 42000 : tradingPair.includes('EUR') ? 1.08 : 1950;
      
      const trade = await aiBotService.createTrade(
        user.id,
        subscription.id,
        selectedBot.id,
        tradingPair,
        'buy',
        entryPrice,
        allocatedAmount
      );

      if (trade) {
        setActiveTrades(prev => [{ ...trade, bot: selectedBot }, ...prev]);
        toast.success(`Successfully subscribed to ${selectedBot.name}!`);
      }
    }

    setShowSubscriptionModal(false);
    setSelectedBot(null);
  };

  const handleEndTrade = async (tradeId: string) => {
    const trade = activeTrades.find(t => t.id === tradeId);
    if (!trade) return;

    const exitPrice = trade.entry_price * (1 + (Math.random() * 0.1 - 0.03));
    const profitLoss = (exitPrice - trade.entry_price) * trade.investment_amount / trade.entry_price;
    const profitLossPercent = ((exitPrice - trade.entry_price) / trade.entry_price) * 100;

    const closedTrade = await aiBotService.closeTrade(tradeId, exitPrice, profitLoss, profitLossPercent);
    
    if (closedTrade) {
      setActiveTrades(prev => prev.filter(t => t.id !== tradeId));
      setTradeHistory(prev => [{ ...closedTrade, bot: trade.bot }, ...prev]);
      toast.success(`Trade closed with ${profitLoss >= 0 ? 'profit' : 'loss'} of €${profitLoss.toFixed(2)}`);
    }

    setShowTradeDetails(false);
    setSelectedTrade(null);
  };

  const handleExportCSV = () => {
    const csv = [
      'Date,Bot,Asset,Type,Investment,P&L,Status',
      ...tradeHistory.map(t => 
        `${t.created_at},${t.bot?.name || 'AI Bot'},${t.trading_pair},${t.trade_type},${t.investment_amount},${t.profit_loss},${t.status}`
      )
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-bot-trades.csv';
    a.click();
  };

  if (isLoading) {
    return <AIBotLoader />;
  }

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="container mx-auto px-4 pt-20 pb-24 lg:pb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">AI Bot Trading</h1>
            <p className="text-muted-foreground">Automated trading powered by AI</p>
          </div>

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-xl p-6 mb-8"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-accent" />
                </div>
                <div>
                  <p className="text-muted-foreground text-sm">Litecoin Balance</p>
                  <p className="text-2xl font-bold">{userBalance?.litecoin_balance?.toFixed(4) || '0.0000'} LTC</p>
                </div>
              </div>
              <div className="flex gap-2">
                <div className="text-right mr-4">
                  <p className="text-muted-foreground text-sm">Trading Balance</p>
                  <p className="text-xl font-bold text-secondary">€{userBalance?.trading_balance?.toFixed(2) || '0.00'}</p>
                </div>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90">
                  Top Up Balance
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Active Trades */}
          <div className="mb-8">
            <ActiveBotTrades
              trades={activeTrades}
              onEndTrade={handleEndTrade}
              onViewDetails={(trade) => {
                setSelectedTrade(trade);
                setShowTradeDetails(true);
              }}
            />
          </div>

          {/* AI Bots Grid */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-accent" />
              AI Bot Marketplace
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {bots.map((bot) => (
                <AIBotCard key={bot.id} bot={bot} onSubscribe={() => handleSubscribe(bot)} />
              ))}
            </div>
          </div>

          {/* External Bot & History */}
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-1">
              <ExternalBotForm userId={user?.id || ''} />
            </div>
            <div className="lg:col-span-2">
              <AIBotHistory trades={tradeHistory} onExportCSV={handleExportCSV} />
            </div>
          </div>

          {/* Risk Warning */}
          <motion.div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
              <div>
                <h4 className="font-semibold text-destructive mb-1">Risk Warning</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>REAL MONEY TRADING.</strong> AI bot trading involves significant risk. 
                  Past performance does not guarantee future results.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>

      <BottomNav />

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => { setShowSubscriptionModal(false); setSelectedBot(null); }}
        bot={selectedBot}
        userBalance={userBalance}
        onSubscribe={handleConfirmSubscription}
      />

      <TradeDetailsModal
        isOpen={showTradeDetails}
        onClose={() => { setShowTradeDetails(false); setSelectedTrade(null); }}
        trade={selectedTrade}
        onEndTrade={() => selectedTrade && handleEndTrade(selectedTrade.id)}
      />
    </div>
  );
};

export default AIBotTrading;
