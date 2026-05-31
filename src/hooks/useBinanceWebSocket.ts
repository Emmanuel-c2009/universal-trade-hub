import { useState, useEffect, useCallback, useRef } from "react";

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  timestamp: number;
}

type PriceMap = Record<string, PriceData>;

// Map trading pairs to Binance symbols
const tradingPairToBinance: Record<string, string> = {
  'BTC/USD': 'BTCUSDT',
  'BTC/USDT': 'BTCUSDT',
  'ETH/USD': 'ETHUSDT',
  'ETH/USDT': 'ETHUSDT',
  'EUR/USD': 'EURUSDT',
  'GBP/USD': 'GBPUSDT',
  'XAU/USD': 'XAUUSDT',
  'XRP/USD': 'XRPUSDT',
  'XRP/USDT': 'XRPUSDT',
  'SOL/USD': 'SOLUSDT',
  'SOL/USDT': 'SOLUSDT',
  'DOGE/USD': 'DOGEUSDT',
  'DOGE/USDT': 'DOGEUSDT',
  'ADA/USD': 'ADAUSDT',
  'ADA/USDT': 'ADAUSDT',
  'DOT/USD': 'DOTUSDT',
  'DOT/USDT': 'DOTUSDT',
  'LINK/USD': 'LINKUSDT',
  'LINK/USDT': 'LINKUSDT',
  'AVAX/USD': 'AVAXUSDT',
  'AVAX/USDT': 'AVAXUSDT',
};

export const useBinanceWebSocket = (tradingPairs: string[]) => {
  const [prices, setPrices] = useState<PriceMap>({});
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const binanceSymbols = tradingPairs
    .map(pair => tradingPairToBinance[pair])
    .filter(Boolean)
    .map(s => s.toLowerCase());

  const connectWebSocket = useCallback(() => {
    if (binanceSymbols.length === 0) return;

    // Create streams for all symbols
    const streams = binanceSymbols.map(s => `${s}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('Binance WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.data && message.data.s) {
          const ticker = message.data;
          const symbol = ticker.s; // e.g., "BTCUSDT"
          
          // Find the original trading pair
          const originalPair = Object.entries(tradingPairToBinance)
            .find(([, binanceSymbol]) => binanceSymbol === symbol)?.[0];

          if (originalPair) {
            setPrices(prev => ({
              ...prev,
              [originalPair]: {
                symbol: originalPair,
                price: parseFloat(ticker.c),
                change24h: parseFloat(ticker.P),
                timestamp: Date.now(),
              },
            }));
          }
        }
      } catch (error) {
        console.error('Error parsing Binance WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('Binance WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('Binance WebSocket closed');
      setConnected(false);
      
      // Reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 3000);
    };

    return ws;
  }, [binanceSymbols]);

  useEffect(() => {
    if (tradingPairs.length === 0) return;

    const ws = connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [connectWebSocket, tradingPairs]);

  const getPrice = useCallback((tradingPair: string): number | null => {
    return prices[tradingPair]?.price ?? null;
  }, [prices]);

  return { prices, connected, getPrice };
};
