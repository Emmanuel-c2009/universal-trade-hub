export interface CryptoPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  price_change_percentage_24h: number;
  market_cap: number;
  total_volume: number;
}

class CoinGeckoService {
  private baseURL = 'https://api.coingecko.com/api/v3';
  private cache: Map<string, { data: CryptoPrice[]; timestamp: number }> = new Map();
  private cacheExpiry = 30000; // 30 seconds

  async getMarketData(limit = 50): Promise<CryptoPrice[]> {
    const cacheKey = `market_${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }

    try {
      const response = await fetch(
        `${this.baseURL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${limit}&page=1&sparkline=false`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch market data');
      }
      
      const data = await response.json();
      this.cache.set(cacheKey, { data, timestamp: Date.now() });
      return data;
    } catch (error) {
      console.error('CoinGecko API error:', error);
      // Return cached data if available, even if expired
      if (cached) return cached.data;
      return [];
    }
  }

  async getPriceById(coinId: string): Promise<CryptoPrice | null> {
    try {
      const response = await fetch(
        `${this.baseURL}/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false`
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching price:', error);
      return null;
    }
  }
}

export const coinGeckoService = new CoinGeckoService();
