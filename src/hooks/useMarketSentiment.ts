// src/hooks/useMarketSentiment.ts

import { useState, useEffect, useCallback } from 'react';
import { dataSourceManager, MarketSentiment, TrendingCoin } from '@/services/dataSourceManager';

export const useMarketSentiment = () => {
  const [sentiment, setSentiment] = useState<MarketSentiment>({
    fearGreedIndex: 50,
    fearGreedLabel: 'Neutral',
    timestamp: Date.now()
  });
  const [trending, setTrending] = useState<TrendingCoin[]>([]);
  const [globalData, setGlobalData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchSentiment = useCallback(async () => {
    try {
      const data = await dataSourceManager.getMarketSentiment();
      setSentiment(data);
    } catch (error) {
      console.error('Failed to fetch sentiment:', error);
    }
  }, []);

  const fetchTrending = useCallback(async () => {
    try {
      const data = await dataSourceManager.getTrendingCoins();
      setTrending(data.slice(0, 7));
    } catch (error) {
      console.error('Failed to fetch trending:', error);
    }
  }, []);

  const fetchGlobalData = useCallback(async () => {
    try {
      const data = await dataSourceManager.getGlobalMarketData();
      setGlobalData(data?.data);
    } catch (error) {
      console.error('Failed to fetch global data:', error);
    }
  }, []);

  const refreshSentiment = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchSentiment(), fetchTrending(), fetchGlobalData()]);
    setLoading(false);
  }, [fetchSentiment, fetchTrending, fetchGlobalData]);

  useEffect(() => {
    refreshSentiment();
    const interval = setInterval(refreshSentiment, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshSentiment]);

  return { sentiment, trending, globalData, loading, refreshSentiment, refetch: refreshSentiment };
};