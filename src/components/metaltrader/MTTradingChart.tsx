import { useEffect, useRef, memo } from "react";
import { useTheme } from "@/contexts/ThemeContext";

interface MTTradingChartProps {
  symbol: string;
}

// Map MT symbols to TradingView format
const symbolToTradingView = (symbol: string): string => {
  const symbolMap: Record<string, string> = {
    // Metals
    'XAUUSD': 'OANDA:XAUUSD',
    'XAGUSD': 'OANDA:XAGUSD',
    'XPTUSD': 'OANDA:XPTUSD',
    'XPDUSD': 'OANDA:XPDUSD',
    'XAUEUR': 'OANDA:XAUEUR',
    'XAGEUR': 'OANDA:XAGEUR',
    // Forex
    'EURUSD': 'FX:EURUSD',
    'GBPUSD': 'FX:GBPUSD',
    'USDJPY': 'FX:USDJPY',
    'USDCHF': 'FX:USDCHF',
    'AUDUSD': 'FX:AUDUSD',
    'USDCAD': 'FX:USDCAD',
    'NZDUSD': 'FX:NZDUSD',
    'EURGBP': 'FX:EURGBP',
    'EURJPY': 'FX:EURJPY',
    'GBPJPY': 'FX:GBPJPY',
    // Crypto
    'BTCUSD': 'BINANCE:BTCUSDT',
    'ETHUSD': 'BINANCE:ETHUSDT',
    'BNBUSD': 'BINANCE:BNBUSDT',
    'SOLUSD': 'BINANCE:SOLUSDT',
    'XRPUSD': 'BINANCE:XRPUSDT',
    'ADAUSD': 'BINANCE:ADAUSDT',
    // Stocks
    'AAPL': 'NASDAQ:AAPL',
    'MSFT': 'NASDAQ:MSFT',
    'GOOGL': 'NASDAQ:GOOGL',
    'AMZN': 'NASDAQ:AMZN',
    'TSLA': 'NASDAQ:TSLA',
    'META': 'NASDAQ:META',
    'NVDA': 'NASDAQ:NVDA',
    // Indices
    'US500': 'FOREXCOM:SPXUSD',
    'US100': 'NASDAQ:NDX',
    'US30': 'DJ:DJI',
    'GER40': 'XETR:DAX',
    'UK100': 'SPREADEX:FTSE',
    // Commodities
    'USOIL': 'TVC:USOIL',
    'UKOIL': 'TVC:UKOIL',
    'NATGAS': 'NYMEX:NG1!',
  };
  
  return symbolMap[symbol] || `OANDA:${symbol}`;
};

export const MTTradingChart = memo(({ symbol }: MTTradingChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear previous widget
    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: symbolToTradingView(symbol),
      interval: "15",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      support_host: "https://www.tradingview.com",
      hide_side_toolbar: false,
      withdateranges: true,
      hide_volume: false,
      backgroundColor: "rgba(30, 31, 34, 1)",
      gridColor: "rgba(60, 63, 69, 0.5)",
      studies: ["RSI@tv-basicstudies", "MASimple@tv-basicstudies"],
    });

    containerRef.current.appendChild(script);

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol]);

  return (
    <div className="h-full bg-[#1e1f22] border border-[#3c3f45] rounded overflow-hidden">
      <div
        ref={containerRef}
        className="tradingview-widget-container h-full min-h-[300px]"
      />
    </div>
  );
});

MTTradingChart.displayName = "MTTradingChart";
