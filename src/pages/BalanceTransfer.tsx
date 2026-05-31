import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ArrowRightLeft, ArrowRight, CheckCircle, History, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { formatEUR } from "@/lib/utils";
import { format } from "date-fns";

const BALANCE_TYPES = [
  { value: 'funding', label: 'Funding Balance', icon: '💰' },
  { value: 'trading', label: 'Trading Balance', icon: '📊' },
  { value: 'bonus', label: 'Bonus Balance', icon: '🎁' },
  { value: 'challenges', label: 'Challenges Balance', icon: '🎯' },
  { value: 'btc', label: 'BTC Wallet', icon: '₿' },
  { value: 'eth', label: 'ETH Wallet', icon: 'Ξ' },
  { value: 'usdt', label: 'USDT Wallet', icon: '💵' },
  { value: 'ltc', label: 'LTC Wallet', icon: 'Ł' },
  { value: 'bnb', label: 'BNB Wallet', icon: '🔶' },
];

interface TransferRecord {
  id: string;
  from_balance_type: string;
  to_balance_type: string;
  amount: number;
  crypto_amount: number | null;
  crypto_symbol: string | null;
  exchange_rate: number | null;
  status: string;
  created_at: string;
}

const BalanceTransfer = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [success, setSuccess] = useState(false);
  // Issue 8: Add history view
  const [activeView, setActiveView] = useState<'transfer' | 'history'>('transfer');
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [fromType, setFromType] = useState('funding');
  const [toType, setToType] = useState('trading');
  const [amount, setAmount] = useState('');

  const { balance, totals, cryptoPrices, transferBalance, getBalanceByType } = useUnifiedBalance(session?.user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setSession(session);
      setLoading(false);
    });
  }, [navigate]);

  const fetchHistory = async (page: number = 1) => {
    if (!session?.user?.id) return;
    setHistoryLoading(true);
    const perPage = 15;
    const { data, error } = await supabase
      .from('balance_transfers')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .range((page - 1) * perPage, page * perPage - 1);

    if (!error && data) {
      if (page === 1) setTransferHistory(data);
      else setTransferHistory(prev => [...prev, ...data]);
      setHasMore(data.length === perPage);
    }
    setHistoryLoading(false);
  };

  const sourceBalance = getBalanceByType(fromType);
  const isCryptoTransfer = ['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(fromType) || 
                           ['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(toType);
  
  const getExchangeRate = () => {
    if (['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(fromType) && !['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(toType)) {
      const crypto = fromType.toUpperCase();
      return cryptoPrices.find(p => p.symbol === crypto)?.price_eur || 1;
    } else if (!['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(fromType) && ['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(toType)) {
      const crypto = toType.toUpperCase();
      return cryptoPrices.find(p => p.symbol === crypto)?.price_eur || 1;
    }
    return 1;
  };

  const handleTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Please enter a valid amount"); return; }
    if (parseFloat(amount) > sourceBalance) { toast.error("Insufficient balance"); return; }
    if (fromType === toType) { toast.error("Cannot transfer to the same balance"); return; }

    setTransferring(true);
    const exchangeRate = getExchangeRate();
    const cryptoSymbol = isCryptoTransfer ? (
      ['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(fromType) ? fromType.toUpperCase() : toType.toUpperCase()
    ) : undefined;

    const result = await transferBalance(fromType, toType, parseFloat(amount), cryptoSymbol, exchangeRate !== 1 ? exchangeRate : undefined);
    setTransferring(false);

    if (result) {
      setSuccess(true);
      toast.success("Transfer completed successfully!");
      setTimeout(() => { setSuccess(false); setAmount(''); }, 2000);
    } else {
      toast.error("Transfer failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="container mx-auto px-4 pt-24 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {activeView === 'history' ? (
            /* Issue 8: Transfer History View */
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setActiveView('transfer')}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">Transfer History</h1>
              </div>

              <div className="space-y-2">
                {transferHistory.length === 0 && !historyLoading ? (
                  <div className="text-center py-12 text-muted-foreground">No transfer history yet</div>
                ) : (
                  transferHistory.map(t => {
                    const fromLabel = BALANCE_TYPES.find(b => b.value === t.from_balance_type);
                    const toLabel = BALANCE_TYPES.find(b => b.value === t.to_balance_type);
                    return (
                      <Card key={t.id} className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center">
                              <ArrowRightLeft className="w-5 h-5 text-secondary" />
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                {fromLabel?.icon} {fromLabel?.label || t.from_balance_type} → {toLabel?.icon} {toLabel?.label || t.to_balance_type}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {format(new Date(t.created_at), "MMM d, yyyy HH:mm")}
                              </div>
                              {t.crypto_amount && t.crypto_symbol && (
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {parseFloat(String(t.crypto_amount)).toFixed(6)} {t.crypto_symbol}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-semibold text-sm">{formatEUR(t.amount)}</div>
                            <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">
                              {t.status === 'completed' ? '✓ Completed' : t.status}
                            </Badge>
                          </div>
                        </div>
                      </Card>
                    );
                  })
                )}
                {hasMore && transferHistory.length > 0 && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { const next = historyPage + 1; setHistoryPage(next); fetchHistory(next); }}
                    disabled={historyLoading}
                  >
                    {historyLoading ? 'Loading...' : 'Load More'}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-4">
                  <ArrowRightLeft className="w-8 h-8 text-secondary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Balance Transfer</h1>
                <p className="text-muted-foreground">Transfer funds between your balances instantly</p>
              </div>

              {/* History Button */}
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={() => { setActiveView('history'); setHistoryPage(1); fetchHistory(1); }}>
                  <History className="w-4 h-4 mr-2" />
                  Transfer History
                </Button>
              </div>

              {success ? (
                <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12">
                  <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
                  <h2 className="text-2xl font-bold text-green-500 mb-2">Transfer Complete!</h2>
                  <p className="text-muted-foreground">Your funds have been transferred successfully</p>
                </motion.div>
              ) : (
                <Card className="p-6">
                  <div className="mb-6">
                    <Label className="text-muted-foreground mb-2 block">From</Label>
                    <Select value={fromType} onValueChange={setFromType}>
                      <SelectTrigger className="bg-card"><SelectValue placeholder="Select source balance" /></SelectTrigger>
                      <SelectContent>
                        {BALANCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.icon} {type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Available: {['btc', 'eth', 'ltc', 'bnb'].includes(fromType) 
                        ? `${sourceBalance.toFixed(6)} ${fromType.toUpperCase()}`
                        : fromType === 'usdt' ? `$${sourceBalance.toFixed(2)}` : formatEUR(sourceBalance)}
                    </p>
                  </div>

                  <div className="flex justify-center my-4">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <ArrowRight className="w-5 h-5 text-muted-foreground rotate-90" />
                    </div>
                  </div>

                  <div className="mb-6">
                    <Label className="text-muted-foreground mb-2 block">To</Label>
                    <Select value={toType} onValueChange={setToType}>
                      <SelectTrigger className="bg-card"><SelectValue placeholder="Select destination balance" /></SelectTrigger>
                      <SelectContent>
                        {BALANCE_TYPES.filter(t => t.value !== fromType).map((type) => (
                          <SelectItem key={type.value} value={type.value}>{type.icon} {type.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mb-6">
                    <Label className="text-muted-foreground mb-2 block">Amount</Label>
                    <div className="relative">
                      <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} className="text-2xl h-14 pr-20" />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        {['btc', 'eth', 'ltc', 'bnb'].includes(fromType) ? fromType.toUpperCase() : fromType === 'usdt' ? 'USDT' : 'EUR'}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 text-secondary" onClick={() => setAmount(sourceBalance.toString())}>
                      Use Max
                    </Button>
                  </div>

                  {isCryptoTransfer && getExchangeRate() !== 1 && (
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Exchange Rate: 1 {['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(fromType) ? fromType.toUpperCase() : toType.toUpperCase()} = {formatEUR(getExchangeRate())}
                      </p>
                      {amount && (
                        <p className="text-sm font-medium mt-1">
                          You will receive: ≈ {['btc', 'eth', 'usdt', 'ltc', 'bnb'].includes(toType) 
                            ? `${(parseFloat(amount) / getExchangeRate()).toFixed(6)} ${toType.toUpperCase()}`
                            : formatEUR(parseFloat(amount) * getExchangeRate())}
                        </p>
                      )}
                    </div>
                  )}

                  <Button className="w-full h-14 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90" onClick={handleTransfer} disabled={transferring || !amount || parseFloat(amount) <= 0}>
                    {transferring ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
                        Processing...
                      </div>
                    ) : (
                      <><ArrowRightLeft className="w-5 h-5 mr-2" /> Transfer Funds</>
                    )}
                  </Button>
                </Card>
              )}

              <div className="mt-6 grid grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => { setFromType('funding'); setToType('trading'); }} className="h-auto py-4 flex-col">
                  <span className="text-sm text-muted-foreground">Quick Transfer</span>
                  <span className="font-medium">Funding → Trading</span>
                </Button>
                <Button variant="outline" onClick={() => { setFromType('trading'); setToType('funding'); }} className="h-auto py-4 flex-col">
                  <span className="text-sm text-muted-foreground">Quick Transfer</span>
                  <span className="font-medium">Trading → Funding</span>
                </Button>
              </div>
            </>
          )}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
};

export default BalanceTransfer;
