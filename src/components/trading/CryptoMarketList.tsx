import { useState } from "react";
import { Search, ChevronUp, ChevronDown, Wifi, WifiOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CryptoPrice } from "@/services/coinGeckoService";
import { cn } from "@/lib/utils";
import { DataSourceBadge } from "./DataSourceBadge";

interface CryptoMarketListProps {
  cryptos: CryptoPrice[];
  selectedCrypto: CryptoPrice | null;
  onSelectCrypto: (crypto: CryptoPrice) => void;
  loading?: boolean;
  connected?: boolean;
}

export const CryptoMarketList = ({
  cryptos,
  selectedCrypto,
  onSelectCrypto,
  loading,
  connected = false
}: CryptoMarketListProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleStart, setVisibleStart] = useState(0);
  const visibleCount = 6;

  const filteredCryptos = cryptos.filter(
    (crypto) =>
      crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const scrollUp = () => {
    setVisibleStart(Math.max(0, visibleStart - 1));
  };

  const scrollDown = () => {
    setVisibleStart(Math.min(filteredCryptos.length - visibleCount, visibleStart + 1));
  };

  const visibleCryptos = filteredCryptos.slice(visibleStart, visibleStart + visibleCount);
  const totalPages = Math.ceil(filteredCryptos.length / visibleCount);
  const currentPage = Math.floor(visibleStart / visibleCount);

  if (loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 h-full">
        <div className="animate-pulse space-y-3">
          <div className="h-10 bg-muted rounded"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4 h-full flex flex-col">
      {/* Connection Status Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Markets</span>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-1 text-green-500">
              <Wifi className="w-3 h-3" />
              <span className="text-[10px]">Live</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-muted-foreground">
              <WifiOff className="w-3 h-3" />
              <span className="text-[10px]">Polling</span>
            </div>
          )}
          <DataSourceBadge source={connected ? 'binance' : 'coingecko'} showLabel />
        </div>
      </div>
      
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search 50+ cryptocurrencies..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setVisibleStart(0);
          }}
          className="pl-10 bg-background"
        />
      </div>

      {/* Scroll indicators */}
      <div className="flex justify-center gap-1 mb-3">
        {[...Array(totalPages)].map((_, i) => (
          <div
            key={i}
            className={cn(
              "w-2 h-2 rounded-full transition-colors",
              i === currentPage ? "bg-gold" : "bg-muted"
            )}
          />
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={scrollUp}
        disabled={visibleStart === 0}
        className="w-full mb-2"
      >
        <ChevronUp className="h-4 w-4" />
      </Button>

      <div className="flex-1 space-y-2">
        {visibleCryptos.map((crypto) => (
          <button
            key={crypto.id}
            onClick={() => onSelectCrypto(crypto)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-lg transition-all",
              "hover:bg-muted/50 border",
              selectedCrypto?.id === crypto.id
                ? "border-gold bg-gold/10"
                : "border-transparent"
            )}
          >
            <img
              src={crypto.image}
              alt={crypto.name}
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 text-left">
              <p className="font-medium text-sm">{crypto.symbol.toUpperCase()}</p>
              <p className="text-xs text-muted-foreground truncate">{crypto.name}</p>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">
                ${crypto.current_price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              </p>
              <p
                className={cn(
                  "text-xs font-medium",
                  crypto.price_change_percentage_24h >= 0
                    ? "text-green-500"
                    : "text-red-500"
                )}
              >
                {crypto.price_change_percentage_24h >= 0 ? "↗" : "↘"}{" "}
                {Math.abs(crypto.price_change_percentage_24h).toFixed(2)}%
              </p>
            </div>
          </button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={scrollDown}
        disabled={visibleStart >= filteredCryptos.length - visibleCount}
        className="w-full mt-2"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>
    </div>
  );
};
