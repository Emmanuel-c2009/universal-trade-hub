// src/services/eurPriceService.ts

import { supabase } from '@/integrations/supabase/client';

export interface EurCryptoPrice {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price_eur: number;
  market_cap_eur: number;
  market_cap_rank: number;
  total_volume_eur: number;
  price_change_percentage_24h: number;
  last_updated: string;
  sparkline_in_7d?: { price: number[] };
}

type PriceCallback = (prices: EurCryptoPrice[]) => void;

class EurPriceService {
  private ws: WebSocket | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private callbacks: PriceCallback[] = [];
  private currentPrices: EurCryptoPrice[] = [];
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  // 25+ Crypto pairs with EUR
  private defaultCryptos = [
    { symbol: 'BTC', name: 'Bitcoin', id: 'bitcoin', imageId: '1' },
    { symbol: 'ETH', name: 'Ethereum', id: 'ethereum', imageId: '279' },
    { symbol: 'LTC', name: 'Litecoin', id: 'litecoin', imageId: '2' },
    { symbol: 'XRP', name: 'XRP', id: 'ripple', imageId: '44' },
    { symbol: 'BNB', name: 'BNB', id: 'binancecoin', imageId: '825' },
    { symbol: 'SOL', name: 'Solana', id: 'solana', imageId: '4128' },
    { symbol: 'ADA', name: 'Cardano', id: 'cardano', imageId: '121' },
    { symbol: 'DOGE', name: 'Dogecoin', id: 'dogecoin', imageId: '5' },
    { symbol: 'MATIC', name: 'Polygon', id: 'matic-network', imageId: '4713' },
    { symbol: 'DOT', name: 'Polkadot', id: 'polkadot', imageId: '121' },
    { symbol: 'SHIB', name: 'Shiba Inu', id: 'shiba-inu', imageId: '5994' },
    { symbol: 'TRX', name: 'TRON', id: 'tron', imageId: '1958' },
    { symbol: 'AVAX', name: 'Avalanche', id: 'avalanche-2', imageId: '12591' },
    { symbol: 'UNI', name: 'Uniswap', id: 'uniswap', imageId: '12591' },
    { symbol: 'LINK', name: 'Chainlink', id: 'chainlink', imageId: '1975' },
    { symbol: 'ATOM', name: 'Cosmos', id: 'cosmos', imageId: '1481' },
    { symbol: 'ETC', name: 'Ethereum Classic', id: 'ethereum-classic', imageId: '453' },
    { symbol: 'XLM', name: 'Stellar', id: 'stellar', imageId: '294' },
    { symbol: 'BCH', name: 'Bitcoin Cash', id: 'bitcoin-cash', imageId: '353' },
    { symbol: 'FIL', name: 'Filecoin', id: 'filecoin', imageId: '1766' },
    { symbol: 'APT', name: 'Aptos', id: 'aptos', imageId: '127180' },
    { symbol: 'NEAR', name: 'NEAR Protocol', id: 'near', imageId: '7224' },
    { symbol: 'OP', name: 'Optimism', id: 'optimism', imageId: '11840' },
    { symbol: 'ARB', name: 'Arbitrum', id: 'arbitrum', imageId: '11841' },
    { symbol: 'AAVE', name: 'Aave', id: 'aave', imageId: '405' }
  ];

  subscribe(callback: PriceCallback): () => void {
    this.callbacks.push(callback);
    if (this.currentPrices.length > 0) {
      callback(this.currentPrices);
    }
    this.connect();
    
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
      if (this.callbacks.length === 0) {
        this.disconnect();
      }
    };
  }

  private async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.initBinanceWebSocket();
    this.startPolling();
  }

  private initBinanceWebSocket() {
    // All EUR pairs on Binance
    const symbols = this.defaultCryptos.map(c => `${c.symbol.toLowerCase()}eur`);
    const streamNames = symbols.map(s => `${s}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;
    
    try {
      if (this.ws) this.ws.close();
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Binance WebSocket connected for EUR prices');
        this.isConnected = true;
        this.reconnectAttempts = 0;
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.data) {
            const ticker = data.data;
            const symbol = ticker.s.toLowerCase().replace('eur', '').toUpperCase();
            this.updatePriceFromBinance(symbol, ticker);
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('Binance WebSocket error:', error);
        this.isConnected = false;
      };
      
      this.ws.onclose = () => {
        console.log('Binance WebSocket closed');
        this.isConnected = false;
        this.handleReconnect();
      };
    } catch (error) {
      console.error('Failed to init Binance WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => this.initBinanceWebSocket(), 5000 * this.reconnectAttempts);
    }
  }

  private updatePriceFromBinance(symbol: string, ticker: any) {
    const cryptoInfo = this.defaultCryptos.find(c => c.symbol === symbol);
    if (!cryptoInfo) return;

    const price: EurCryptoPrice = {
      id: cryptoInfo.id,
      symbol: symbol,
      name: cryptoInfo.name,
      image: `https://assets.coingecko.com/coins/images/${cryptoInfo.imageId}/small/${symbol.toLowerCase()}.png`,
      current_price_eur: parseFloat(ticker.c),
      market_cap_eur: 0,
      market_cap_rank: 0,
      total_volume_eur: 0,
      price_change_percentage_24h: parseFloat(ticker.P),
      last_updated: new Date().toISOString()
    };
    
    this.updatePrices([price]);
  }

  private startPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    this.pollingInterval = setInterval(async () => {
      await this.fetchPricesFromSupabase();
    }, 30000);
  }

  private async fetchPricesFromSupabase() {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-prices-eur');
      if (data?.prices) {
        this.updatePrices(data.prices);
      } else {
        this.generateMockPrices();
      }
    } catch (error) {
      console.error('Failed to fetch EUR prices:', error);
      this.generateMockPrices();
    }
  }

  private generateMockPrices() {
    const mockPrices: Record<string, number> = {
      BTC: 69579, ETH: 2079, LTC: 84.10, XRP: 1.14, BNB: 580,
      SOL: 98, ADA: 0.45, DOGE: 0.12, MATIC: 0.89, DOT: 7.20,
      SHIB: 0.000023, TRX: 0.12, AVAX: 35, UNI: 7.50, LINK: 15,
      ATOM: 9, ETC: 28, XLM: 0.11, BCH: 350, FIL: 5.50,
      APT: 9, NEAR: 5, OP: 2.50, ARB: 1.20, AAVE: 85
    };

    const mockPricesData: EurCryptoPrice[] = this.defaultCryptos.map((crypto, index) => {
      const basePrice = mockPrices[crypto.symbol] || 100;
      return {
        id: crypto.id,
        symbol: crypto.symbol,
        name: crypto.name,
        image: `https://assets.coingecko.com/coins/images/${crypto.imageId}/small/${crypto.symbol.toLowerCase()}.png`,
        current_price_eur: basePrice,
        market_cap_eur: basePrice * 1000000,
        market_cap_rank: index + 1,
        total_volume_eur: basePrice * 50000,
        price_change_percentage_24h: (Math.random() * 10) - 5,
        last_updated: new Date().toISOString()
      };
    });
    this.updatePrices(mockPricesData);
  }

  private updatePrices(newPrices: EurCryptoPrice[]) {
    const priceMap = new Map(this.currentPrices.map(p => [p.symbol, p]));
    
    for (const price of newPrices) {
      const existing = priceMap.get(price.symbol);
      if (existing) {
        priceMap.set(price.symbol, { ...existing, ...price });
      } else {
        priceMap.set(price.symbol, price);
      }
    }
    
    this.currentPrices = Array.from(priceMap.values());
    this.currentPrices.sort((a, b) => (a.market_cap_rank || 999) - (b.market_cap_rank || 999));
    this.notifyCallbacks();
  }

  private notifyCallbacks() {
    this.callbacks.forEach(callback => callback([...this.currentPrices]));
  }

  private disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  getCurrentPrices(): EurCryptoPrice[] {
    return [...this.currentPrices];
  }

  isLiveConnected(): boolean {
    return this.isConnected;
  }
}

export const eurPriceService = new EurPriceService();