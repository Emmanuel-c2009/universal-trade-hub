// src/services/enhancedPriceService.ts

import { supabase } from '@/integrations/supabase/client';

export interface EnhancedCryptoPrice {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
  isLive: boolean;
}

type PriceCallback = (prices: EnhancedCryptoPrice[]) => void;
type ConnectionCallback = (isConnected: boolean, reconnectAttempt: number) => void;

class EnhancedPriceService {
  private ws: WebSocket | null = null;
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private priceCallbacks: PriceCallback[] = [];
  private connectionCallbacks: ConnectionCallback[] = [];
  private currentPrices: Map<string, EnhancedCryptoPrice> = new Map();
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private userId: string | null = null;

  // All supported crypto symbols (25+)
  private symbols = [
    'BTC', 'ETH', 'LTC', 'XRP', 'BNB', 'SOL', 'ADA', 'DOGE', 'MATIC', 'DOT',
    'SHIB', 'TRX', 'AVAX', 'UNI', 'LINK', 'ATOM', 'ETC', 'XLM', 'BCH', 'FIL',
    'APT', 'NEAR', 'OP', 'ARB', 'AAVE'
  ];

  constructor() {
    this.initializeMockData();
    this.setupNotificationListener();
  }

  private setupNotificationListener() {
    if (typeof window !== 'undefined') {
      // Listen for custom events to show toasts
      window.addEventListener('price-service-notification', ((event: CustomEvent) => {
        const { message, type } = event.detail;
        // This will be handled by the UI
        console.log(`[${type.toUpperCase()}] ${message}`);
      }) as EventListener);
    }
  }

  private initializeMockData() {
    this.symbols.forEach(symbol => {
      this.currentPrices.set(symbol, {
        symbol,
        price: this.getMockPrice(symbol),
        change24h: (Math.random() * 10) - 5,
        volume24h: Math.random() * 1000000,
        high24h: this.getMockPrice(symbol) * 1.02,
        low24h: this.getMockPrice(symbol) * 0.98,
        timestamp: Date.now(),
        isLive: false
      });
    });
  }

  private getMockPrice(symbol: string): number {
    const prices: Record<string, number> = {
      BTC: 69579, ETH: 2079, LTC: 84.10, XRP: 1.14, BNB: 580,
      SOL: 98, ADA: 0.45, DOGE: 0.12, MATIC: 0.89, DOT: 7.20,
      SHIB: 0.000023, TRX: 0.12, AVAX: 35, UNI: 7.50, LINK: 15,
      ATOM: 9, ETC: 28, XLM: 0.11, BCH: 350, FIL: 5.50,
      APT: 9, NEAR: 5, OP: 2.50, ARB: 1.20, AAVE: 85
    };
    return prices[symbol] || 100;
  }

  subscribeToPrices(callback: PriceCallback): () => void {
    this.priceCallbacks.push(callback);
    callback(Array.from(this.currentPrices.values()));
    this.connect();
    return () => {
      this.priceCallbacks = this.priceCallbacks.filter(cb => cb !== callback);
      if (this.priceCallbacks.length === 0 && this.connectionCallbacks.length === 0) {
        this.disconnect();
      }
    };
  }

  subscribeToConnection(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.push(callback);
    callback(this.isConnected, this.reconnectAttempts);
    return () => {
      this.connectionCallbacks = this.connectionCallbacks.filter(cb => cb !== callback);
    };
  }

  setUserId(userId: string | null) {
    this.userId = userId;
  }

  private async connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.connectWebSocket();
    this.startPolling();
  }

  private connectWebSocket() {
    const symbols = this.symbols.map(s => `${s.toLowerCase()}eur`);
    const streamNames = symbols.map(s => `${s}@ticker`).join('/');
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames}`;
    
    try {
      if (this.ws) {
        this.ws.close();
      }
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('Enhanced WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.notifyConnectionStatus();
        this.showNotification('Live price feed connected', 'success');
      };
      
      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.data) {
            const ticker = data.data;
            const symbol = ticker.s.toLowerCase().replace('eur', '').toUpperCase();
            this.updatePriceFromWebSocket(symbol, ticker);
          }
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };
      
      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.isConnected = false;
        this.notifyConnectionStatus();
        this.showNotification('Price feed connection lost', 'error');
      };
      
      this.ws.onclose = () => {
        console.log('WebSocket closed');
        this.isConnected = false;
        this.notifyConnectionStatus();
        this.handleReconnect();
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      this.handleReconnect();
    }
  }

  private handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      this.notifyConnectionStatus();
      
      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      console.log('Max reconnection attempts reached. Switching to polling mode.');
      this.showNotification('Using fallback price feed (polling mode)', 'warning');
    }
  }

  private updatePriceFromWebSocket(symbol: string, ticker: any) {
    const price: EnhancedCryptoPrice = {
      symbol,
      price: parseFloat(ticker.c),
      change24h: parseFloat(ticker.P),
      volume24h: parseFloat(ticker.q) || 0,
      high24h: parseFloat(ticker.h) || this.getMockPrice(symbol) * 1.02,
      low24h: parseFloat(ticker.l) || this.getMockPrice(symbol) * 0.98,
      timestamp: Date.now(),
      isLive: true
    };
    
    this.currentPrices.set(symbol, price);
    this.notifyPriceCallbacks();
  }

  private startPolling() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    
    this.pollingInterval = setInterval(async () => {
      await this.fetchPricesFromAPI();
    }, 10000);
  }

  private async fetchPricesFromAPI() {
    try {
      const { data, error } = await supabase.functions.invoke('crypto-prices-eur');
      if (data?.prices && !error) {
        for (const price of data.prices) {
          const enhancedPrice: EnhancedCryptoPrice = {
            symbol: price.symbol,
            price: price.current_price_eur,
            change24h: price.price_change_percentage_24h || 0,
            volume24h: price.total_volume_eur || 0,
            high24h: price.high_24h || price.current_price_eur * 1.02,
            low24h: price.low_24h || price.current_price_eur * 0.98,
            timestamp: Date.now(),
            isLive: false
          };
          this.currentPrices.set(price.symbol, enhancedPrice);
        }
        this.notifyPriceCallbacks();
      }
    } catch (error) {
      console.error('Failed to fetch prices from API:', error);
      this.generateRandomPriceMovement();
    }
  }

  private generateRandomPriceMovement() {
    this.currentPrices.forEach((price, symbol) => {
      const variation = (Math.random() - 0.5) * 0.002;
      const newPrice = price.price * (1 + variation);
      this.currentPrices.set(symbol, {
        ...price,
        price: newPrice,
        timestamp: Date.now(),
        isLive: false
      });
    });
    this.notifyPriceCallbacks();
  }

  private notifyPriceCallbacks() {
    const prices = Array.from(this.currentPrices.values());
    this.priceCallbacks.forEach(callback => callback(prices));
  }

  private notifyConnectionStatus() {
    this.connectionCallbacks.forEach(callback => 
      callback(this.isConnected, this.reconnectAttempts)
    );
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning') {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('price-service-notification', { detail: { message, type } });
      window.dispatchEvent(event);
    }
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

  getPrice(symbol: string): EnhancedCryptoPrice | undefined {
    return this.currentPrices.get(symbol);
  }

  getAllPrices(): EnhancedCryptoPrice[] {
    return Array.from(this.currentPrices.values());
  }

  isLive(): boolean {
    return this.isConnected;
  }
}

export const enhancedPriceService = new EnhancedPriceService();