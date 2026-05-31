import { useState, useEffect, useCallback, useRef } from 'react';
import { CryptoPrice, coinGeckoService } from '@/services/coinGeckoService';

interface BinanceTickerData {
  s: string; // Symbol
  c: string; // Current price
  P: string; // Price change percent
}

const BINANCE_SYMBOLS = [
  'btcusdt', 'ethusdt', 'bnbusdt', 'xrpusdt', 'adausdt', 'solusdt', 
  'dogeusdt', 'dotusdt', 'maticusdt', 'ltcusdt', 'shibusdt', 'trxusdt',
  'avaxusdt', 'linkusdt', 'atomusdt', 'uniusdt', 'etcusdt', 'xlmusdt',
  'bchusdt', 'filausdt', 'aptusdt', 'nearusdt', 'opusdt', 'arbusdt'
];

export const useRealtimePrices = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const priceMapRef = useRef<Map<string, { price: number; change: number }>>(new Map());

  // Fetch initial data from CoinGecko
  const fetchInitialData = useCallback(async () => {
    try {
      const data = await coinGeckoService.getMarketData(50);
      setPrices(data);
      
      // Initialize price map
      data.forEach(coin => {
        priceMapRef.current.set(coin.symbol.toLowerCase(), {
          price: coin.current_price,
          change: coin.price_change_percentage_24h
        });
      });
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch initial prices:', error);
      setLoading(false);
    }
  }, []);

  // Connect to Binance WebSocket
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const streams = BINANCE_SYMBOLS.map(s => `${s}@ticker`).join('/');
    const ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);

    ws.onopen = () => {
      console.log('Binance WebSocket connected');
      setConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.data) {
          const ticker: BinanceTickerData = message.data;
          const symbol = ticker.s.toLowerCase().replace('usdt', '');
          
          priceMapRef.current.set(symbol, {
            price: parseFloat(ticker.c),
            change: parseFloat(ticker.P)
          });

          // Update prices state with new data
          setPrices(prev => prev.map(coin => {
            const priceData = priceMapRef.current.get(coin.symbol.toLowerCase());
            if (priceData) {
              return {
                ...coin,
                current_price: priceData.price,
                price_change_percentage_24h: priceData.change
              };
            }
            return coin;
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setConnected(false);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected, reconnecting...');
      setConnected(false);
      // Reconnect after 3 seconds
      setTimeout(connectWebSocket, 3000);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    fetchInitialData();
    
    // Connect WebSocket after initial data
    const timer = setTimeout(connectWebSocket, 1000);
    
    return () => {
      clearTimeout(timer);
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchInitialData, connectWebSocket]);

  // Fallback polling if WebSocket fails
  useEffect(() => {
    if (!connected) {
      const interval = setInterval(fetchInitialData, 15000);
      return () => clearInterval(interval);
    }
  }, [connected, fetchInitialData]);

  return { prices, loading, connected, refetch: fetchInitialData };
};
