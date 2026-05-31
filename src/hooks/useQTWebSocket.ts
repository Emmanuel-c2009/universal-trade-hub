import { useState, useEffect, useRef, useCallback } from "react";

// Map symbols to Binance WebSocket format
const symbolToBinance = (symbol: string): string | null => {
  const cryptoMap: Record<string, string> = {
    "BTC/USD": "btcusdt",
    "ETH/USD": "ethusdt",
    "BNB/USD": "bnbusdt",
    "SOL/USD": "solusdt",
    "XRP/USD": "xrpusdt",
    "ADA/USD": "adausdt",
    "DOGE/USD": "dogeusdt",
    "DOT/USD": "dotusdt",
  };
  return cryptoMap[symbol] || null;
};

export const useQTWebSocket = (symbols: string[]) => {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    // Get crypto symbols that can use Binance WebSocket
    const cryptoSymbols = symbols
      .map(s => symbolToBinance(s))
      .filter((s): s is string => s !== null);

    if (cryptoSymbols.length === 0) {
      setIsConnected(true); // Consider connected if no crypto symbols
      return;
    }

    // Create streams for all crypto symbols
    const streams = cryptoSymbols.map(s => `${s}@trade`).join("/");
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("QT WebSocket connected");
        setIsConnected(true);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.data?.s && message.data?.p) {
            const binanceSymbol = message.data.s.toLowerCase();
            const price = parseFloat(message.data.p);

            // Convert back to our symbol format
            const symbolMap: Record<string, string> = {
              btcusdt: "BTC/USD",
              ethusdt: "ETH/USD",
              bnbusdt: "BNB/USD",
              solusdt: "SOL/USD",
              xrpusdt: "XRP/USD",
              adausdt: "ADA/USD",
              dogeusdt: "DOGE/USD",
              dotusdt: "DOT/USD",
            };

            const ourSymbol = symbolMap[binanceSymbol];
            if (ourSymbol) {
              setPrices(prev => ({
                ...prev,
                [ourSymbol]: price
              }));
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("QT WebSocket error:", error);
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        console.log("QT WebSocket disconnected");
        setIsConnected(false);
        
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setIsConnected(false);
    }
  }, [symbols]);

  useEffect(() => {
    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect]);

  return { prices, isConnected };
};
