import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ForexPriceData {
  price: number;
  change: number;
  percent_change: number;
}

export const useForexPrices = (symbols: string[]) => {
  const [prices, setPrices] = useState<Record<string, ForexPriceData>>({});
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPrices = useCallback(async () => {
    if (symbols.length === 0) return;

    try {
      const { data, error } = await supabase.functions.invoke('get-forex-prices', {
        body: { symbols: symbols.join(',') },
      });

      if (error) {
        console.error('Forex price fetch error:', error);
        setIsConnected(false);
        return;
      }

      if (data?.prices) {
        setPrices(data.prices);
        setIsConnected(true);
      }
    } catch (err) {
      console.error('Forex price fetch failed:', err);
      setIsConnected(false);
    }
  }, [symbols.join(',')]);

  useEffect(() => {
    fetchPrices();
    // Poll every 3 seconds (Twelve Data free tier: 8 req/min)
    intervalRef.current = setInterval(fetchPrices, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPrices]);

  return { prices, isConnected, refetch: fetchPrices };
};
