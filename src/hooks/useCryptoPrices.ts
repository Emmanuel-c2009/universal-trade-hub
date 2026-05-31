import { useState, useEffect, useCallback } from 'react';
import { coinGeckoService, CryptoPrice } from '@/services/coinGeckoService';

export const useCryptoPrices = (refreshInterval = 10000) => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = useCallback(async () => {
    try {
      const data = await coinGeckoService.getMarketData(50);
      setPrices(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch prices');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(interval);
  }, [fetchPrices, refreshInterval]);

  return { prices, loading, error, refetch: fetchPrices };
};
