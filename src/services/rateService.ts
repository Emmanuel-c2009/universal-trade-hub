// src/services/rateService.ts
// Uses CoinGecko API + ExchangeRate API - Free, no API key required

export interface ExchangeRate {
  currency: string;
  rate: number;
  timestamp: number;
}

// Map crypto types to CoinGecko IDs
const cryptoToCoinGeckoId: Record<string, string> = {
  'BTC': 'bitcoin',
  'ETH': 'ethereum',
  'BNB': 'binancecoin',
  'SOL': 'solana',
  'XRP': 'ripple',
  'DOGE': 'dogecoin',
  'TRX': 'tron',
  'LTC': 'litecoin',
  'USDT': 'tether',
  'USDC': 'usd-coin',
  'ADA': 'cardano',
  'DOT': 'polkadot',
  'MATIC': 'polygon',
  'AVAX': 'avalanche-2',
  'LINK': 'chainlink',
  'UNI': 'uniswap',
  'ATOM': 'cosmos',
  'NEAR': 'near',
  'ALGO': 'algorand',
  'VET': 'vechain',
  'ICP': 'internet-computer',
  'FTM': 'fantom',
  'EGLD': 'elrond',
  'THETA': 'theta',
  'SAND': 'the-sandbox',
  'MANA': 'decentraland',
  'AXS': 'axie-infinity',
  'GALA': 'gala',
  'ENJ': 'enjincoin',
  'CHZ': 'chiliz',
};

// Cache rates to avoid too many API calls
let cachedRates: Record<string, { rate: number; timestamp: number }> = {};
const CACHE_DURATION = 60000; // 1 minute

// ============================================
// CRYPTO TO EUR CONVERSION
// ============================================

// Get EUR rate for a single cryptocurrency
export const getCryptoToEUR = async (cryptoType: string): Promise<number> => {
  const coinId = cryptoToCoinGeckoId[cryptoType.toUpperCase()];
  if (!coinId) {
    console.warn(`No CoinGecko ID for ${cryptoType}, using BTC rate as fallback`);
    return getCryptoToEUR('BTC');
  }

  // Check cache first
  const now = Date.now();
  const cached = cachedRates[cryptoType];
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=eur`
    );
    const data = await response.json();
    const rate = data[coinId]?.eur;
    
    if (rate && typeof rate === 'number') {
      cachedRates[cryptoType] = { rate, timestamp: now };
      return rate;
    }
    
    throw new Error(`No rate returned for ${cryptoType}`);
  } catch (error) {
    console.error(`Failed to fetch ${cryptoType}/EUR rate:`, error);
    // Return fallback rates
    const fallbackRates: Record<string, number> = {
      'BTC': 68000,
      'ETH': 3200,
      'BNB': 580,
      'SOL': 145,
      'USDT': 0.92,
      'USDC': 0.92,
      'XRP': 0.5,
      'DOGE': 0.08,
      'LTC': 80,
      'TRX': 0.12,
      'ADA': 0.35,
      'DOT': 7.5,
      'MATIC': 0.6,
      'AVAX': 35,
      'LINK': 15,
      'UNI': 6.5,
    };
    return fallbackRates[cryptoType] || 68000;
  }
};

// Get multiple crypto rates at once
export const getMultipleCryptoRates = async (cryptoTypes: string[]): Promise<Record<string, number>> => {
  const uniqueTypes = [...new Set(cryptoTypes)];
  const coinIds = uniqueTypes
    .map(t => cryptoToCoinGeckoId[t.toUpperCase()])
    .filter(Boolean);
  
  if (coinIds.length === 0) {
    return {};
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds.join(',')}&vs_currencies=eur`
    );
    const data = await response.json();
    
    const rates: Record<string, number> = {};
    for (const cryptoType of uniqueTypes) {
      const coinId = cryptoToCoinGeckoId[cryptoType.toUpperCase()];
      if (coinId && data[coinId]?.eur) {
        rates[cryptoType] = data[coinId].eur;
        cachedRates[cryptoType] = { rate: data[coinId].eur, timestamp: Date.now() };
      }
    }
    return rates;
  } catch (error) {
    console.error('Failed to fetch multiple rates:', error);
    return {};
  }
};

// ============================================
// EUR TO USD CONVERSION (for Cash Mail)
// ============================================

// Get EUR to USD exchange rate
export const getEURToUSD = async (): Promise<number> => {
  const now = Date.now();
  const cacheKey = 'EUR_USD';
  const cached = cachedRates[cacheKey];
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    // First try CoinGecko
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=eur'
    );
    const data = await response.json();
    const usdToEur = data['usd-coin']?.eur;
    if (usdToEur && typeof usdToEur === 'number') {
      const eurToUsd = 1 / usdToEur;
      cachedRates[cacheKey] = { rate: eurToUsd, timestamp: now };
      return eurToUsd;
    }
    
    // Fallback to ExchangeRate API
    const fallbackResponse = await fetch('https://api.exchangerate-api.com/v4/latest/EUR');
    const fallbackData = await fallbackResponse.json();
    const rate = fallbackData.rates.USD;
    if (rate && typeof rate === 'number') {
      cachedRates[cacheKey] = { rate, timestamp: now };
      return rate;
    }
    
    throw new Error('No rate returned');
  } catch (error) {
    console.error('Failed to fetch EUR/USD rate:', error);
    // Return fallback rate (1 EUR = 1.09 USD)
    return 1.09;
  }
};

// ============================================
// FIAT CURRENCY CONVERSIONS (Supports ANY currency)
// ============================================

// Get EUR to ANY target currency exchange rate
// Supports: NGN, USD, GBP, CAD, AUD, JPY, CNY, INR, and 160+ other currencies
export const getEURToTargetCurrency = async (targetCurrency: string): Promise<number> => {
  const currencyCode = targetCurrency.toUpperCase();
  
  // If target is EUR, return 1
  if (currencyCode === 'EUR') {
    return 1;
  }
  
  // If target is USD, use the getEURToUSD function
  if (currencyCode === 'USD') {
    return getEURToUSD();
  }
  
  const now = Date.now();
  const cacheKey = `EUR_${currencyCode}`;
  const cached = cachedRates[cacheKey];
  if (cached && (now - cached.timestamp) < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    // First try to get from CoinGecko (for crypto or stablecoins)
    const cryptoId = cryptoToCoinGeckoId[currencyCode];
    if (cryptoId) {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=eur`
      );
      const data = await response.json();
      const rate = data[cryptoId]?.eur;
      if (rate && typeof rate === 'number') {
        // This gives us how many EUR per crypto, we want how many crypto per EUR
        const eurToTarget = 1 / rate;
        cachedRates[cacheKey] = { rate: eurToTarget, timestamp: now };
        return eurToTarget;
      }
    }
    
    // For fiat currencies, use ExchangeRate API (free, no API key)
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/EUR`
    );
    const data = await response.json();
    const rate = data.rates[currencyCode];
    
    if (rate && typeof rate === 'number') {
      cachedRates[cacheKey] = { rate, timestamp: now };
      return rate;
    }
    
    throw new Error(`No rate for ${targetCurrency}`);
  } catch (error) {
    console.error(`Failed to fetch EUR/${targetCurrency} rate:`, error);
    
    // Return fallback rates for common currencies
    const fallbackRates: Record<string, number> = {
      'NGN': 1650,      // Nigerian Naira
      'USD': 1.09,      // US Dollar
      'GBP': 0.85,      // British Pound
      'CAD': 1.48,      // Canadian Dollar
      'AUD': 1.63,      // Australian Dollar
      'JPY': 169,       // Japanese Yen
      'CNY': 7.85,      // Chinese Yuan
      'INR': 90.5,      // Indian Rupee
      'CHF': 0.98,      // Swiss Franc
      'ZAR': 20.5,      // South African Rand
      'BRL': 5.6,       // Brazilian Real
      'MXN': 18.2,      // Mexican Peso
      'SGD': 1.47,      // Singapore Dollar
      'HKD': 8.5,       // Hong Kong Dollar
      'NZD': 1.78,      // New Zealand Dollar
      'KRW': 1480,      // South Korean Won
      'TRY': 35.2,      // Turkish Lira
      'RUB': 98.5,      // Russian Ruble
      'PLN': 4.35,      // Polish Zloty
      'SEK': 11.8,      // Swedish Krona
      'NOK': 11.9,      // Norwegian Krone
      'DKK': 7.45,      // Danish Krone
      'ILS': 4.05,      // Israeli Shekel
      'AED': 4.0,       // UAE Dirham
      'SAR': 4.09,      // Saudi Riyal
      'THB': 40.2,      // Thai Baht
      'MYR': 5.15,      // Malaysian Ringgit
      'IDR': 17500,     // Indonesian Rupiah
      'PHP': 62.5,      // Philippine Peso
      'VND': 27500,     // Vietnamese Dong
      'PKR': 305,       // Pakistani Rupee
      'BDT': 128,       // Bangladeshi Taka
      'GHS': 15.2,      // Ghanaian Cedi
      'KES': 145,       // Kenyan Shilling
      'EGP': 52.5,      // Egyptian Pound
      'MAD': 11.2,      // Moroccan Dirham
    };
    
    return fallbackRates[currencyCode] || 1;
  }
};

// Get ANY currency to EUR (reverse conversion)
export const getTargetCurrencyToEUR = async (targetCurrency: string): Promise<number> => {
  const rate = await getEURToTargetCurrency(targetCurrency);
  return 1 / rate;
};

// Convert an amount from EUR to target currency
export const convertEURToTarget = async (
  amountEUR: number, 
  targetCurrency: string
): Promise<number> => {
  const rate = await getEURToTargetCurrency(targetCurrency);
  return amountEUR * rate;
};

// Convert an amount from target currency to EUR
export const convertTargetToEUR = async (
  amountTarget: number, 
  targetCurrency: string
): Promise<number> => {
  const rate = await getEURToTargetCurrency(targetCurrency);
  return amountTarget / rate;
};

// ============================================
// BULK CONVERSIONS
// ============================================

// Get rates for multiple currencies at once
export const getMultipleCurrencyRates = async (currencies: string[]): Promise<Record<string, number>> => {
  const uniqueCurrencies = [...new Set(currencies)];
  const rates: Record<string, number> = {};
  
  for (const currency of uniqueCurrencies) {
    rates[currency] = await getEURToTargetCurrency(currency);
  }
  
  return rates;
};

// ============================================
// CACHE MANAGEMENT
// ============================================

// Clear all cached rates
export const clearRateCache = () => {
  cachedRates = {};
};

// Get cache stats (for debugging)
export const getCacheStats = () => {
  const now = Date.now();
  const validCacheCount = Object.values(cachedRates).filter(
    c => (now - c.timestamp) < CACHE_DURATION
  ).length;
  return {
    total: Object.keys(cachedRates).length,
    valid: validCacheCount,
    expired: Object.keys(cachedRates).length - validCacheCount,
  };
};