import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CryptoPrice } from "@/services/coinGeckoService";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Clock, TrendingUp, RotateCcw } from "lucide-react";

interface TradeFormProps {
  selectedCrypto: CryptoPrice | null;
  availableBalance: number;
  onTrade: (trade: {
    side: "buy" | "sell";
    quantity: number;
    price: number;
    stopLoss?: number;
    takeProfit?: number;
    duration?: string;
  }) => void;
}

const DURATIONS = [
  { value: "1m", label: "1 min" },
  { value: "5m", label: "5 min" },
  { value: "10m", label: "10 min" },
  { value: "15m", label: "15 min" },
  { value: "30m", label: "30 min" },
  { value: "1h", label: "1 hour" },
  { value: "4h", label: "4 hours" },
  { value: "1d", label: "1 day" },
  { value: "manual", label: "Manual Close" },
];

export const TradeForm = ({ selectedCrypto, availableBalance, onTrade }: TradeFormProps) => {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [slEnabled, setSlEnabled] = useState(false);
  const [tpEnabled, setTpEnabled] = useState(false);
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [percentage, setPercentage] = useState([0]);
  const [duration, setDuration] = useState("manual");

  const currentPrice = selectedCrypto?.current_price || 0;
  const amountValue = parseFloat(amount) || 0;
  const quantity = amountValue / currentPrice;
  const maxAmount = availableBalance;

  const handlePercentageChange = (value: number[]) => {
    setPercentage(value);
    setAmount(((maxAmount * value[0]) / 100).toFixed(2));
  };

  const handleQuickAmount = (pct: number) => {
    setPercentage([pct]);
    setAmount(((maxAmount * pct) / 100).toFixed(2));
  };

  const handleSubmit = () => {
    if (!selectedCrypto) {
      toast.error("Please select a cryptocurrency");
      return;
    }

    if (amountValue <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (amountValue > availableBalance) {
      toast.error("Insufficient balance");
      return;
    }

    onTrade({
      side,
      quantity,
      price: currentPrice,
      stopLoss: slEnabled ? parseFloat(stopLoss) : undefined,
      takeProfit: tpEnabled ? parseFloat(takeProfit) : undefined,
      duration: duration !== "manual" ? duration : undefined
    });

    setAmount("");
    setPercentage([0]);
  };

  return (
    <Card className="p-4 bg-card border-border">
      <Tabs value={side} onValueChange={(v) => setSide(v as "buy" | "sell")}>
        <TabsList className="w-full grid grid-cols-2 mb-4">
          <TabsTrigger
            value="buy"
            className={cn(
              "data-[state=active]:bg-green-500 data-[state=active]:text-white font-semibold"
            )}
          >
            <TrendingUp className="w-4 h-4 mr-1" />
            Buy
          </TabsTrigger>
          <TabsTrigger
            value="sell"
            className={cn(
              "data-[state=active]:bg-red-500 data-[state=active]:text-white font-semibold"
            )}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Sell
          </TabsTrigger>
        </TabsList>

        <TabsContent value={side} className="space-y-4 mt-0">
          {selectedCrypto && (
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <img
                src={selectedCrypto.image}
                alt={selectedCrypto.name}
                className="w-10 h-10 rounded-full"
              />
              <div className="flex-1">
                <p className="font-semibold">{selectedCrypto.symbol.toUpperCase()}/USDT</p>
                <p className="text-sm text-muted-foreground">
                  ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className={cn(
                "text-sm font-medium",
                selectedCrypto.price_change_percentage_24h >= 0 ? "text-green-500" : "text-red-500"
              )}>
                {selectedCrypto.price_change_percentage_24h >= 0 ? "+" : ""}
                {selectedCrypto.price_change_percentage_24h?.toFixed(2)}%
              </div>
            </div>
          )}

          {/* Duration Selection */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Trade Duration
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent>
                {DURATIONS.map((d) => (
                  <SelectItem key={d.value} value={d.value}>
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                const val = parseFloat(e.target.value) || 0;
                setPercentage([(val / maxAmount) * 100]);
              }}
              className="text-lg"
            />
            <p className="text-xs text-muted-foreground">
              ≈ {quantity.toFixed(8)} {selectedCrypto?.symbol.toUpperCase() || ""}
            </p>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {[25, 50, 75, 100].map((pct) => (
              <Button
                key={pct}
                variant="outline"
                size="sm"
                onClick={() => handleQuickAmount(pct)}
                className={cn(
                  "text-xs",
                  percentage[0] === pct && "border-gold bg-gold/10"
                )}
              >
                {pct}%
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <Slider
              value={percentage}
              onValueChange={handlePercentageChange}
              max={100}
              step={1}
              className="w-full"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Switch checked={slEnabled} onCheckedChange={setSlEnabled} />
              <Label className="text-sm">Stop Loss</Label>
            </div>
            {slEnabled && (
              <Input
                type="number"
                placeholder="Price"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="w-28"
              />
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <Switch checked={tpEnabled} onCheckedChange={setTpEnabled} />
              <Label className="text-sm">Take Profit</Label>
            </div>
            {tpEnabled && (
              <Input
                type="number"
                placeholder="Price"
                value={takeProfit}
                onChange={(e) => setTakeProfit(e.target.value)}
                className="w-28"
              />
            )}
          </div>

          <div className="pt-2 space-y-2 border-t border-border">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Available</span>
              <span>${availableBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Est. Fee</span>
              <span>${(amountValue * 0.001).toFixed(2)}</span>
            </div>
            {duration !== "manual" && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="text-primary">{DURATIONS.find(d => d.value === duration)?.label}</span>
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            className={cn(
              "w-full font-semibold",
              side === "buy"
                ? "bg-green-500 hover:bg-green-600"
                : "bg-red-500 hover:bg-red-600"
            )}
            disabled={!selectedCrypto || amountValue <= 0}
          >
            {side === "buy" ? "Buy" : "Sell"} {selectedCrypto?.symbol.toUpperCase() || ""}
          </Button>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
