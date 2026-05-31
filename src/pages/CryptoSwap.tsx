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
import { ArrowUpDown, Repeat, CheckCircle, Info } from "lucide-react";
import { toast } from "sonner";
import { useUnifiedBalance } from "@/hooks/useUnifiedBalance";

const CRYPTO_OPTIONS = [
  { value: 'BTC', label: 'Bitcoin', icon: '₿', color: 'text-orange-500' },
  { value: 'ETH', label: 'Ethereum', icon: 'Ξ', color: 'text-purple-500' },
  { value: 'USDT', label: 'Tether', icon: '₮', color: 'text-green-500' },
  { value: 'LTC', label: 'Litecoin', icon: 'Ł', color: 'text-gray-400' },
  { value: 'BNB', label: 'Binance Coin', icon: '◆', color: 'text-yellow-500' },
];

const CryptoSwap = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState(false);
  const [success, setSuccess] = useState(false);

  const [fromCrypto, setFromCrypto] = useState('BTC');
  const [toCrypto, setToCrypto] = useState('ETH');
  const [amount, setAmount] = useState('');

  const { balance, cryptoPrices, swapCrypto, getBalanceByType } = useUnifiedBalance(session?.user?.id);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setSession(session);
      setLoading(false);
    });
  }, [navigate]);

  const fromBalance = getBalanceByType(fromCrypto.toLowerCase());
  const fromPrice = cryptoPrices.find(p => p.symbol === fromCrypto)?.price_eur || 1;
  const toPrice = cryptoPrices.find(p => p.symbol === toCrypto)?.price_eur || 1;
  const exchangeRate = fromPrice / toPrice;
  const feePercent = 0.5;

  const calculateReceived = () => {
    if (!amount || parseFloat(amount) <= 0) return 0;
    const gross = parseFloat(amount) * exchangeRate;
    const fee = gross * (feePercent / 100);
    return gross - fee;
  };

  const handleSwapDirection = () => {
    const temp = fromCrypto;
    setFromCrypto(toCrypto);
    setToCrypto(temp);
    setAmount('');
  };

  const handleSwap = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (parseFloat(amount) > fromBalance) {
      toast.error("Insufficient balance");
      return;
    }

    if (fromCrypto === toCrypto) {
      toast.error("Cannot swap to the same cryptocurrency");
      return;
    }

    setSwapping(true);

    const success = await swapCrypto(
      fromCrypto,
      toCrypto,
      parseFloat(amount),
      exchangeRate,
      feePercent
    );

    setSwapping(false);

    if (success) {
      setSuccess(true);
      toast.success("Swap completed successfully!");
      setTimeout(() => {
        setSuccess(false);
        setAmount('');
      }, 2000);
    } else {
      toast.error("Swap failed. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const fromOption = CRYPTO_OPTIONS.find(c => c.value === fromCrypto);
  const toOption = CRYPTO_OPTIONS.find(c => c.value === toCrypto);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader onMenuClick={() => setSidebarOpen(true)} />
      
      <main className="container mx-auto px-4 pt-24 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Repeat className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Crypto Swap</h1>
            <p className="text-muted-foreground">
              Instantly swap between cryptocurrencies
            </p>
          </div>

          {success ? (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-12"
            >
              <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-500 mb-2">Swap Complete!</h2>
              <p className="text-muted-foreground">Your swap has been processed successfully</p>
            </motion.div>
          ) : (
            <Card className="p-6">
              {/* From Crypto */}
              <div className="mb-4">
                <Label className="text-muted-foreground mb-2 block">You Pay</Label>
                <div className="flex gap-3">
                  <Select value={fromCrypto} onValueChange={setFromCrypto}>
                    <SelectTrigger className="w-[180px] bg-card">
                      <SelectValue>
                        <span className={`flex items-center gap-2 ${fromOption?.color}`}>
                          <span className="text-xl">{fromOption?.icon}</span>
                          {fromOption?.value}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_OPTIONS.filter(c => c.value !== toCrypto).map((crypto) => (
                        <SelectItem key={crypto.value} value={crypto.value}>
                          <span className={`flex items-center gap-2 ${crypto.color}`}>
                            <span className="text-xl">{crypto.icon}</span>
                            {crypto.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1 text-xl h-12"
                  />
                </div>
                <div className="flex justify-between mt-2 text-sm">
                  <span className="text-muted-foreground">
                    Balance: {fromBalance.toFixed(6)} {fromCrypto}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-secondary h-auto p-0"
                    onClick={() => setAmount(fromBalance.toString())}
                  >
                    Use Max
                  </Button>
                </div>
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center my-4">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full w-12 h-12 border-2"
                  onClick={handleSwapDirection}
                >
                  <ArrowUpDown className="w-5 h-5" />
                </Button>
              </div>

              {/* To Crypto */}
              <div className="mb-6">
                <Label className="text-muted-foreground mb-2 block">You Receive</Label>
                <div className="flex gap-3">
                  <Select value={toCrypto} onValueChange={setToCrypto}>
                    <SelectTrigger className="w-[180px] bg-card">
                      <SelectValue>
                        <span className={`flex items-center gap-2 ${toOption?.color}`}>
                          <span className="text-xl">{toOption?.icon}</span>
                          {toOption?.value}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {CRYPTO_OPTIONS.filter(c => c.value !== fromCrypto).map((crypto) => (
                        <SelectItem key={crypto.value} value={crypto.value}>
                          <span className={`flex items-center gap-2 ${crypto.color}`}>
                            <span className="text-xl">{crypto.icon}</span>
                            {crypto.label}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 bg-muted rounded-md px-4 flex items-center text-xl">
                    {calculateReceived().toFixed(6)}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Balance: {getBalanceByType(toCrypto.toLowerCase()).toFixed(6)} {toCrypto}
                </p>
              </div>

              {/* Exchange Info */}
              <div className="mb-6 p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span>1 {fromCrypto} = {exchangeRate.toFixed(6)} {toCrypto}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Fee ({feePercent}%)</span>
                  <span>{amount ? (parseFloat(amount) * exchangeRate * (feePercent / 100)).toFixed(6) : '0.000000'} {toCrypto}</span>
                </div>
                <div className="flex justify-between text-sm font-medium pt-2 border-t border-border">
                  <span>You Get</span>
                  <span className="text-green-500">{calculateReceived().toFixed(6)} {toCrypto}</span>
                </div>
              </div>

              {/* Info Box */}
              <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg flex gap-3">
                <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Swaps are executed instantly at current market rates. No admin approval required. 
                  A small fee of {feePercent}% is applied to all swaps.
                </p>
              </div>

              {/* Swap Button */}
              <Button
                className="w-full h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handleSwap}
                disabled={swapping || !amount || parseFloat(amount) <= 0}
              >
                {swapping ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                    Processing Swap...
                  </div>
                ) : (
                  <>
                    <Repeat className="w-5 h-5 mr-2" />
                    Swap {fromCrypto} for {toCrypto}
                  </>
                )}
              </Button>
            </Card>
          )}

          {/* Recent Swaps Preview */}
          <Card className="mt-6 p-4">
            <h3 className="font-semibold mb-3">Live Exchange Rates</h3>
            <div className="space-y-2">
              {CRYPTO_OPTIONS.slice(0, 4).map((crypto) => {
                const price = cryptoPrices.find(p => p.symbol === crypto.value);
                return (
                  <div key={crypto.value} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xl ${crypto.color}`}>{crypto.icon}</span>
                      <span className="font-medium">{crypto.label}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">€{(price?.price_eur || 0).toLocaleString()}</p>
                      <p className={`text-xs ${(price?.change_24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {(price?.change_24h || 0) >= 0 ? '+' : ''}{(price?.change_24h || 0).toFixed(2)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </main>

      <BottomNav />
    </div>
  );
};

export default CryptoSwap;
