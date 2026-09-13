import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRightLeft, ArrowDownUp, CheckCircle, History, ArrowLeft,
  ChevronLeft, ChevronRight, Wallet, TrendingUp, Gift, Target,
} from "lucide-react";
import { toast } from "sonner";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";
import { formatEUR } from "@/lib/utils";
import { format } from "date-fns";

// ---------- Crypto icon badges (no external icon package needed) ----------
const CRYPTO_COLORS: Record<string, string> = {
  BTC: "#F7931A",
  ETH: "#627EEA",
  USDT: "#26A17B",
  LTC: "#A6A9AA",
  BNB: "#F3BA2F",
};
const CRYPTO_GLYPHS: Record<string, string> = {
  BTC: "₿",
  ETH: "Ξ",
  USDT: "₮",
  LTC: "Ł",
  BNB: "B",
};

function CryptoIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const color = CRYPTO_COLORS[symbol] || "#888";
  const glyph = CRYPTO_GLYPHS[symbol] || symbol[0];
  return (
    <div
      style={{ width: size, height: size, backgroundColor: color }}
      className="rounded-full flex items-center justify-center shrink-0 shadow-sm"
    >
      <span className="text-white font-bold" style={{ fontSize: size * 0.5 }}>{glyph}</span>
    </div>
  );
}

// ---------- Balance type registry ----------
type BalanceTypeInfo =
  | { value: string; label: string; kind: "fiat"; icon: any; color: string }
  | { value: string; label: string; kind: "crypto"; symbol: string };

const BALANCE_TYPES: BalanceTypeInfo[] = [
  { value: "funding", label: "Funding Balance", kind: "fiat", icon: Wallet, color: "#3B82F6" },
  { value: "trading", label: "Trading Balance", kind: "fiat", icon: TrendingUp, color: "#10B981" },
  { value: "bonus", label: "Bonus Balance", kind: "fiat", icon: Gift, color: "#EC4899" },
  { value: "challenges", label: "Challenges Balance", kind: "fiat", icon: Target, color: "#8B5CF6" },
  { value: "btc", label: "Bitcoin", kind: "crypto", symbol: "BTC" },
  { value: "eth", label: "Ethereum", kind: "crypto", symbol: "ETH" },
  { value: "usdt", label: "Tether", kind: "crypto", symbol: "USDT" },
  { value: "ltc", label: "Litecoin", kind: "crypto", symbol: "LTC" },
  { value: "bnb", label: "BNB", kind: "crypto", symbol: "BNB" },
];

const getTypeInfo = (value: string) => BALANCE_TYPES.find((t) => t.value === value)!;

function TypeIcon({ value, size = 28 }: { value: string; size?: number }) {
  const info = getTypeInfo(value);
  if (info.kind === "crypto") return <CryptoIcon symbol={info.symbol} size={size} />;
  const Icon = info.icon;
  return (
    <div
      style={{ width: size, height: size, backgroundColor: `${info.color}22` }}
      className="rounded-full flex items-center justify-center shrink-0"
    >
      <Icon style={{ width: size * 0.55, height: size * 0.55, color: info.color }} />
    </div>
  );
}

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

const HISTORY_PER_PAGE = 5;

const BalanceTransfer = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [success, setSuccess] = useState(false);

  const [activeView, setActiveView] = useState<"transfer" | "history">("transfer");
  const [transferHistory, setTransferHistory] = useState<TransferRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [fromType, setFromType] = useState("funding");
  const [toType, setToType] = useState("trading");
  const [amount, setAmount] = useState("");

  const { balance, totals, cryptoPrices, transferBalance, getBalanceByType } = useUnifiedBalance(session?.user?.id);

  useEffect(() => {
    let didFinish = false;

    const finish = (result: any) => {
      if (didFinish) return;
      didFinish = true;
      const session = result?.data?.session ?? null;
      if (!session) {
        navigate("/auth");
        return;
      }
      setSession(session);
      setLoading(false);
    };

    Promise.race([
      supabase.auth.getSession(),
      new Promise((resolve) =>
        setTimeout(() => resolve({ data: { session: null }, timedOut: true }), 6000)
      ),
    ])
      .then((result: any) => {
        if (result?.timedOut) {
          console.warn("Session check timed out — forcing reload");
          window.location.reload();
          return;
        }
        finish(result);
      })
      .catch((err) => {
        console.error("Session check failed:", err);
        finish({ data: { session: null } });
      });

    return () => {
      didFinish = true;
    };
  }, [navigate]);

  const fetchHistory = async (page: number = 1) => {
    if (!session?.user?.id) return;
    setHistoryLoading(true);

    try {
      const result: any = await Promise.race([
        supabase
          .from("balance_transfers")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false })
          .range((page - 1) * HISTORY_PER_PAGE, page * HISTORY_PER_PAGE - 1),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Request timed out")), 6000)
        ),
      ]);

      const { data, error } = result;
      if (!error && data) {
        setTransferHistory(data);
        setHasMore(data.length === HISTORY_PER_PAGE);
      }
    } catch (err) {
      console.error("Fetch history failed or timed out:", err);
      toast.error("Could not load transfer history. Please try again.");
    } finally {
      setHistoryLoading(false);
    }
  };

  const sourceBalance = getBalanceByType(fromType);
  const cryptoValues = ["btc", "eth", "usdt", "ltc", "bnb"];
  const isCryptoTransfer = cryptoValues.includes(fromType) || cryptoValues.includes(toType);

  const getExchangeRate = () => {
    if (cryptoValues.includes(fromType) && !cryptoValues.includes(toType)) {
      const crypto = fromType.toUpperCase();
      return cryptoPrices.find((p) => p.symbol === crypto)?.price_eur || 1;
    } else if (!cryptoValues.includes(fromType) && cryptoValues.includes(toType)) {
      const crypto = toType.toUpperCase();
      return cryptoPrices.find((p) => p.symbol === crypto)?.price_eur || 1;
    }
    return 1;
  };

  const handleSwap = () => {
    setFromType(toType);
    setToType(fromType);
  };

  const handleTransfer = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Please enter a valid amount"); return; }
    if (parseFloat(amount) > sourceBalance) { toast.error("Insufficient balance"); return; }
    if (fromType === toType) { toast.error("Cannot transfer to the same balance"); return; }

    setTransferring(true);
    const exchangeRate = getExchangeRate();
    const cryptoSymbol = isCryptoTransfer
      ? (cryptoValues.includes(fromType) ? fromType.toUpperCase() : toType.toUpperCase())
      : undefined;

    const result = await transferBalance(fromType, toType, parseFloat(amount), cryptoSymbol, exchangeRate !== 1 ? exchangeRate : undefined);
    setTransferring(false);

    if (result) {
      setSuccess(true);
      toast.success("Transfer completed successfully!");
      setTimeout(() => { setSuccess(false); setAmount(""); }, 2000);
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

  const availableDisplay = cryptoValues.includes(fromType)
    ? `${sourceBalance.toFixed(6)} ${fromType.toUpperCase()}`
    : fromType === "usdt"
    ? `$${sourceBalance.toFixed(2)}`
    : formatEUR(sourceBalance);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />

      <main className="container mx-auto px-4 pt-24 max-w-2xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          {activeView === "history" ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <Button variant="ghost" size="icon" onClick={() => setActiveView("transfer")}>
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-2xl font-bold">Transfer History</h1>
              </div>

              <div className="space-y-2 min-h-[300px]">
                {transferHistory.length === 0 && !historyLoading ? (
                  <div className="text-center py-12 text-muted-foreground">No transfer history yet</div>
                ) : (
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={historyPage}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2"
                    >
                      {transferHistory.map((t) => {
                        const fromInfo = getTypeInfo(t.from_balance_type);
                        const toInfo = getTypeInfo(t.to_balance_type);
                        return (
                          <Card key={t.id} className="p-4">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex items-center -space-x-2 shrink-0">
                                  <TypeIcon value={t.from_balance_type} size={30} />
                                  <TypeIcon value={t.to_balance_type} size={30} />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-sm truncate">
                                    {fromInfo?.label || t.from_balance_type} → {toInfo?.label || t.to_balance_type}
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
                              <div className="text-right shrink-0">
                                <div className="font-mono font-semibold text-sm">{formatEUR(t.amount)}</div>
                                <Badge className="bg-emerald-500/20 text-emerald-500 text-[10px]">
                                  {t.status === "completed" ? "✓ Completed" : t.status}
                                </Badge>
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </motion.div>
                  </AnimatePresence>
                )}

                {(transferHistory.length > 0 || historyPage > 1) && (
                  <div className="flex items-center justify-between pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={historyPage === 1 || historyLoading}
                      onClick={() => { const prev = historyPage - 1; setHistoryPage(prev); fetchHistory(prev); }}
                    >
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">Page {historyPage}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasMore || historyLoading}
                      onClick={() => { const next = historyPage + 1; setHistoryPage(next); fetchHistory(next); }}
                    >
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="mb-8 text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-secondary/30 to-secondary/10 flex items-center justify-center mx-auto mb-4 ring-1 ring-secondary/30">
                  <ArrowRightLeft className="w-8 h-8 text-secondary" />
                </div>
                <h1 className="text-3xl font-bold mb-2">Balance Transfer</h1>
                <p className="text-muted-foreground">Transfer funds between your balances instantly</p>
              </div>

              <div className="flex justify-end mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setActiveView("history"); setHistoryPage(1); fetchHistory(1); }}
                >
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
                <Card className="p-6 border-border/60 shadow-lg">
                  <div className="mb-2">
                    <Label className="text-muted-foreground mb-2 block">From</Label>
                    <Select value={fromType} onValueChange={setFromType}>
                      <SelectTrigger className="bg-card h-14">
                        <SelectValue placeholder="Select source balance">
                          <div className="flex items-center gap-3">
                            <TypeIcon value={fromType} size={26} />
                            <span>{getTypeInfo(fromType)?.label}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {BALANCE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value} textValue={type.label}>
                            <div className="flex items-center gap-3">
                              <TypeIcon value={type.value} size={22} />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">Available: {availableDisplay}</p>
                  </div>

                  <div className="flex justify-center my-2 relative z-10">
                    <button
                      onClick={handleSwap}
                      className="w-11 h-11 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform -my-2 ring-4 ring-background"
                      aria-label="Swap From and To"
                    >
                      <ArrowDownUp className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-6">
                    <Label className="text-muted-foreground mb-2 block">To</Label>
                    <Select value={toType} onValueChange={setToType}>
                      <SelectTrigger className="bg-card h-14">
                        <SelectValue placeholder="Select destination balance">
                          <div className="flex items-center gap-3">
                            <TypeIcon value={toType} size={26} />
                            <span>{getTypeInfo(toType)?.label}</span>
                          </div>
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {BALANCE_TYPES.filter((t) => t.value !== fromType).map((type) => (
                          <SelectItem key={type.value} value={type.value} textValue={type.label}>
                            <div className="flex items-center gap-3">
                              <TypeIcon value={type.value} size={22} />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mb-6">
                    <Label className="text-muted-foreground mb-2 block">Amount</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="text-2xl h-14 pr-20"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        {cryptoValues.includes(fromType) ? fromType.toUpperCase() : fromType === "usdt" ? "USDT" : "EUR"}
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="mt-2 text-secondary" onClick={() => setAmount(sourceBalance.toString())}>
                      Use Max
                    </Button>
                  </div>

                  {isCryptoTransfer && getExchangeRate() !== 1 && (
                    <div className="mb-6 p-4 bg-muted/50 rounded-lg border border-border/50">
                      <p className="text-sm text-muted-foreground">
                        Exchange Rate: 1 {cryptoValues.includes(fromType) ? fromType.toUpperCase() : toType.toUpperCase()} = {formatEUR(getExchangeRate())}
                      </p>
                      {amount && (
                        <p className="text-sm font-medium mt-1">
                          You will receive: ≈ {cryptoValues.includes(toType)
                            ? `${(parseFloat(amount) / getExchangeRate()).toFixed(6)} ${toType.toUpperCase()}`
                            : formatEUR(parseFloat(amount) * getExchangeRate())}
                        </p>
                      )}
                    </div>
                  )}

                  <Button
                    className="w-full h-14 text-lg bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    onClick={handleTransfer}
                    disabled={transferring || !amount || parseFloat(amount) <= 0}
                  >
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
                <Button
                  variant="outline"
                  onClick={() => { setFromType("funding"); setToType("trading"); }}
                  className="h-auto py-4 flex-col gap-1"
                >
                  <div className="flex items-center -space-x-2">
                    <TypeIcon value="funding" size={22} />
                    <TypeIcon value="trading" size={22} />
                  </div>
                  <span className="text-sm text-muted-foreground">Quick Transfer</span>
                  <span className="font-medium">Funding → Trading</span>
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setFromType("trading"); setToType("funding"); }}
                  className="h-auto py-4 flex-col gap-1"
                >
                  <div className="flex items-center -space-x-2">
                    <TypeIcon value="trading" size={22} />
                    <TypeIcon value="funding" size={22} />
                  </div>
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
