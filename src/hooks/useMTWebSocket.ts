import { useState, useEffect, useRef, useCallback } from "react";
import { getMTAssets, MTAssetData } from "./useMTAssets";

interface PriceData {
  bid: number;
  ask: number;
  change: number;
}

// Map crypto symbols to Binance format
const symbolToBinance = (symbol: string): string | null => {
  const cryptoMap: Record<string, string> = {
    "BTCUSD": "btcusdt",
    "ETHUSD": "ethusdt",
    "BNBUSD": "bnbusdt",
    "SOLUSD": "solusdt",
    "XRPUSD": "xrpusdt",
    "ADAUSD": "adausdt",
    "DOGEUSD": "dogeusdt",
    "DOTUSD": "dotusdt",
    "MATICUSD": "maticusdt",
    "LINKUSD": "linkusdt",
    "AVAXUSD": "avaxusdt",
    "ATOMUSD": "atomusdt",
    "UNIUSD": "uniusdt",
    "LTCUSD": "ltcusdt",
    "BCHUSD": "bchusdt",
  };
  return cryptoMap[symbol] || null;
};

export const useMTWebSocket = (category: MTAssetData['category']) => {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priceSimulationRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const assets = getMTAssets(category);

  // Simulate price updates for non-crypto assets
  const simulatePrices = useCallback(() => {
    setPrices(prev => {
      const newPrices = { ...prev };
      
      assets.forEach(asset => {
        const basePrice = asset.basePrice;
        const volatility = category === 'forex' ? 0.0001 : 0.001;
        const change = (Math.random() - 0.5) * 2 * volatility * basePrice;
        const currentPrice = prev[asset.symbol]?.bid || basePrice;
        const newPrice = currentPrice + change;
        const spread = category === 'forex' ? basePrice * 0.0001 : basePrice * 0.001;
        
        newPrices[asset.symbol] = {
          bid: newPrice,
          ask: newPrice + spread,
          change: newPrice - basePrice,
        };
      });
      
      return newPrices;
    });
  }, [assets, category]);

  // Connect to Binance WebSocket for crypto
  const connectCryptoWebSocket = useCallback(() => {
    const cryptoSymbols = assets
      .map(a => symbolToBinance(a.symbol))
      .filter((s): s is string => s !== null);

    if (cryptoSymbols.length === 0) {
      setIsConnected(true);
      return;
    }

    const streams = cryptoSymbols.map(s => `${s}@trade`).join("/");
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("MT WebSocket connected");
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
              btcusdt: "BTCUSD",
              ethusdt: "ETHUSD",
              bnbusdt: "BNBUSD",
              solusdt: "SOLUSD",
              xrpusdt: "XRPUSD",
              adausdt: "ADAUSD",
              dogeusdt: "DOGEUSD",
              dotusdt: "DOTUSD",
              maticusdt: "MATICUSD",
              linkusdt: "LINKUSD",
              avaxusdt: "AVAXUSD",
              atomusdt: "ATOMUSD",
              uniusdt: "UNIUSD",
              ltcusdt: "LTCUSD",
              bchusdt: "BCHUSD",
            };

            const ourSymbol = symbolMap[binanceSymbol];
            if (ourSymbol) {
              const asset = assets.find(a => a.symbol === ourSymbol);
              const basePrice = asset?.basePrice || price;
              const spread = price * 0.0005;
              
              setPrices(prev => ({
                ...prev,
                [ourSymbol]: {
                  bid: price,
                  ask: price + spread,
                  change: price - basePrice,
                }
              }));
            }
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      wsRef.current.onerror = () => {
        setIsConnected(false);
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        reconnectTimeoutRef.current = setTimeout(() => {
          connectCryptoWebSocket();
        }, 3000);
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      setIsConnected(false);
    }
  }, [assets]);

  useEffect(() => {
    // Initialize prices
    const initialPrices: Record<string, PriceData> = {};
    assets.forEach(asset => {
      const spread = asset.category === 'forex' ? asset.basePrice * 0.0001 : asset.basePrice * 0.001;
      initialPrices[asset.symbol] = {
        bid: asset.basePrice,
        ask: asset.basePrice + spread,
        change: 0,
      };
    });
    setPrices(initialPrices);

    if (category === 'crypto') {
      connectCryptoWebSocket();
    } else {
      setIsConnected(true);
      // Simulate price updates for non-crypto assets
      priceSimulationRef.current = setInterval(simulatePrices, 1000);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (priceSimulationRef.current) {
        clearInterval(priceSimulationRef.current);
      }
    };
  }, [category, connectCryptoWebSocket, simulatePrices, assets]);

  return { prices, isConnected };
};
