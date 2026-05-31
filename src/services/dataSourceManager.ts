import { coinGeckoService, CryptoPrice } from './coinGeckoService';

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  volume?: number;
  marketCap?: number;
  source: 'coingecko' | 'alphavantage' | 'yahoo' | 'websocket';
  timestamp: number;
}

export interface MarketSentiment {
  fearGreedIndex: number;
  fearGreedLabel: string;
  timestamp: number;
}

export interface TrendingCoin {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
  price_btc: number;
  market_cap_rank: number;
  score: number;
}

class DataSourceManager {
  private priceCache: Map<string, PriceData> = new Map();
  private cacheExpiry = 5000; // 5 seconds for major coins
  private minorCoinCacheExpiry = 30000; // 30 seconds for minor coins
  private majorCoins = ['btc', 'eth', 'bnb', 'sol', 'xrp', 'ada', 'doge'];

  // Get best available price from multiple sources
  async getPrice(symbol: string): Promise<PriceData | null> {
    const cached = this.priceCache.get(symbol.toLowerCase());
    const expiry = this.majorCoins.includes(symbol.toLowerCase()) 
      ? this.cacheExpiry 
      : this.minorCoinCacheExpiry;

    if (cached && Date.now() - cached.timestamp < expiry) {
      return cached;
    }

    // Try CoinGecko first for crypto
    try {
      const coinId = this.symbolToCoinGeckoId(symbol);
      if (coinId) {
        const data = await coinGeckoService.getPriceById(coinId);
        if (data) {
          const priceData: PriceData = {
            symbol: data.symbol.toUpperCase(),
            price: data.current_price,
            change24h: data.price_change_percentage_24h,
            volume: data.total_volume,
            marketCap: data.market_cap,
            source: 'coingecko',
            timestamp: Date.now()
          };
          this.priceCache.set(symbol.toLowerCase(), priceData);
          return priceData;
        }
      }
    } catch (error) {
      console.error('CoinGecko price fetch failed:', error);
    }

    return null;
  }

  // Get trending cryptocurrencies from CoinGecko
  async getTrendingCoins(): Promise<TrendingCoin[]> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/search/trending');
      if (!response.ok) throw new Error('Failed to fetch trending');
      const data = await response.json();
      return data.coins?.map((item: any) => item.item) || [];
    } catch (error) {
      console.error('Failed to fetch trending coins:', error);
      return [];
    }
  }

  // Get Fear & Greed Index
  async getMarketSentiment(): Promise<MarketSentiment> {
    try {
      const response = await fetch('https://api.alternative.me/fng/');
      if (!response.ok) throw new Error('Failed to fetch sentiment');
      const data = await response.json();
      const fng = data.data?.[0];
      return {
        fearGreedIndex: parseInt(fng?.value || '50'),
        fearGreedLabel: fng?.value_classification || 'Neutral',
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Failed to fetch market sentiment:', error);
      return {
        fearGreedIndex: 50,
        fearGreedLabel: 'Neutral',
        timestamp: Date.now()
      };
    }
  }

  // Get global market data
  async getGlobalMarketData(): Promise<any> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/global');
      if (!response.ok) throw new Error('Failed to fetch global data');
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch global market data:', error);
      return null;
    }
  }

  // Map common symbols to CoinGecko IDs
  private symbolToCoinGeckoId(symbol: string): string | null {
    const mapping: Record<string, string> = {
      'btc': 'bitcoin',
      'eth': 'ethereum',
      'bnb': 'binancecoin',
      'sol': 'solana',
      'xrp': 'ripple',
      'ada': 'cardano',
      'doge': 'dogecoin',
      'dot': 'polkadot',
      'matic': 'matic-network',
      'ltc': 'litecoin',
      'shib': 'shiba-inu',
      'trx': 'tron',
      'avax': 'avalanche-2',
      'link': 'chainlink',
      'atom': 'cosmos',
      'uni': 'uniswap',
      'etc': 'ethereum-classic',
      'xlm': 'stellar',
      'bch': 'bitcoin-cash',
      'fil': 'filecoin',
      'apt': 'aptos',
      'near': 'near',
      'op': 'optimism',
      'arb': 'arbitrum',
      'pepe': 'pepe',
      'floki': 'floki'
    };
    return mapping[symbol.toLowerCase()] || null;
  }

  // Validate price across multiple sources
  validatePrice(prices: PriceData[]): PriceData | null {
    if (prices.length === 0) return null;
    if (prices.length === 1) return prices[0];

    // Calculate average and check for outliers
    const avgPrice = prices.reduce((sum, p) => sum + p.price, 0) / prices.length;
    const tolerance = 0.01; // 1% tolerance

    const validPrices = prices.filter(p => 
      Math.abs(p.price - avgPrice) / avgPrice <= tolerance
    );

    // Return CoinGecko price if valid, otherwise first valid price
    return validPrices.find(p => p.source === 'coingecko') || validPrices[0] || prices[0];
  }

  // Clear cache
  clearCache(): void {
    this.priceCache.clear();
  }
}

export const dataSourceManager = new DataSourceManager();
