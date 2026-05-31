import { useEffect, useRef, memo } from "react";
import { QTAsset, QTTrade } from "@/pages/QuickTrade";
import { useTheme } from "@/contexts/ThemeContext";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatEUR } from "@/lib/utils";

interface QTTradingChartProps {
  asset: QTAsset | null;
  activeTrades: QTTrade[];
}

export const QTTradingChart = memo(({ asset, activeTrades }: QTTradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current || !asset) return;

    // Clear previous widget
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    const getTradingViewSymbol = (symbol: string): string => {
      const symbolMap: Record<string, string> = {
        "BTC/USD": "BINANCE:BTCUSDT", "ETH/USD": "BINANCE:ETHUSDT",
        "BNB/USD": "BINANCE:BNBUSDT", "SOL/USD": "BINANCE:SOLUSDT",
        "XRP/USD": "BINANCE:XRPUSDT", "ADA/USD": "BINANCE:ADAUSDT",
        "DOGE/USD": "BINANCE:DOGEUSDT", "DOT/USD": "BINANCE:DOTUSDT",
        "LINK/USD": "BINANCE:LINKUSDT", "UNI/USD": "BINANCE:UNIUSDT",
        "MATIC/USD": "BINANCE:MATICUSDT", "AVAX/USD": "BINANCE:AVAXUSDT",
        "ATOM/USD": "BINANCE:ATOMUSDT", "LTC/USD": "BINANCE:LTCUSDT",
        "SHIB/USD": "BINANCE:SHIBUSDT", "PEPE/USD": "BINANCE:PEPEUSDT",
        "EUR/USD": "FX:EURUSD", "GBP/USD": "FX:GBPUSD",
        "USD/JPY": "FX:USDJPY", "AUD/USD": "FX:AUDUSD",
        "USD/CAD": "FX:USDCAD", "USD/CHF": "FX:USDCHF",
        "NZD/USD": "FX:NZDUSD", "EUR/GBP": "FX:EURGBP",
        "EUR/JPY": "FX:EURJPY", "GBP/JPY": "FX:GBPJPY",
        "AAPL": "NASDAQ:AAPL", "GOOGL": "NASDAQ:GOOGL",
        "MSFT": "NASDAQ:MSFT", "AMZN": "NASDAQ:AMZN",
        "TSLA": "NASDAQ:TSLA", "META": "NASDAQ:META",
        "NVDA": "NASDAQ:NVDA", "NFLX": "NASDAQ:NFLX",
        "US100": "NASDAQ:NDX", "SP500": "SP:SPX",
        "DJI30": "DJ:DJI", "XAU/USD": "TVC:GOLD",
        "XAG/USD": "TVC:SILVER", "XBR/USD": "TVC:UKOIL",
        "XTI/USD": "TVC:USOIL", "NATGAS": "TVC:NATURALGAS",
      };
      return symbolMap[symbol] || `BINANCE:${symbol.replace("/", "")}USDT`;
    };

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: getTradingViewSymbol(asset.symbol),
      interval: "1",
      timezone: "Etc/UTC",
      theme: theme === "dark" ? "dark" : "light",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      hide_legend: false,
      hide_volume: false,
      save_image: true,
      withdateranges: false,
      backgroundColor: theme === "dark" ? "rgba(18, 18, 18, 1)" : "#ffffff",
      gridColor: theme === "dark" ? "rgba(255, 255, 255, 0.06)" : "rgba(46, 46, 46, 0.06)",
    });

    containerRef.current.appendChild(script);
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [asset?.symbol, theme]);

  if (!asset) {
    return (
      <div className="h-full flex items-center justify-center bg-card">
        <div className="text-center text-muted-foreground">
          <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Tap ☰ to select an asset</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full relative">
      {/* Trade Stamps */}
      {activeTrades.length > 0 && (
        <div className="absolute top-2 left-2 z-10 space-y-1">
          {activeTrades.map(trade => (
            <div
              key={trade.id}
              className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                trade.type === "BUY" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
              }`}
            >
              {trade.type === "BUY" ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {trade.type} {formatEUR(trade.amount)}
            </div>
          ))}
        </div>
      )}
      <div
        ref={containerRef}
        className="tradingview-widget-container w-full"
        style={{ height: "500px", minHeight: "500px" }}
      />
    </div>
  );
});

QTTradingChart.displayName = "QTTradingChart";
