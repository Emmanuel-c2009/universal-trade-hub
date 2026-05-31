import { useState, useEffect, useCallback } from "react";
import { QTAsset } from "@/pages/QuickTrade";

// Expanded QT asset list with 150+ assets across all categories
const QT_ASSETS_CONFIG = {
  forex: [
    // Major Pairs
    { id: "eur-usd", symbol: "EUR/USD", name: "Euro / US Dollar", payout: 89 },
    { id: "gbp-usd", symbol: "GBP/USD", name: "British Pound / US Dollar", payout: 87 },
    { id: "usd-jpy", symbol: "USD/JPY", name: "US Dollar / Japanese Yen", payout: 85 },
    { id: "aud-usd", symbol: "AUD/USD", name: "Australian Dollar / US Dollar", payout: 86 },
    { id: "usd-cad", symbol: "USD/CAD", name: "US Dollar / Canadian Dollar", payout: 84 },
    { id: "usd-chf", symbol: "USD/CHF", name: "US Dollar / Swiss Franc", payout: 83 },
    { id: "nzd-usd", symbol: "NZD/USD", name: "New Zealand Dollar / US Dollar", payout: 82 },
    // Minor/Cross Pairs
    { id: "eur-gbp", symbol: "EUR/GBP", name: "Euro / British Pound", payout: 81 },
    { id: "eur-jpy", symbol: "EUR/JPY", name: "Euro / Japanese Yen", payout: 80 },
    { id: "gbp-jpy", symbol: "GBP/JPY", name: "British Pound / Japanese Yen", payout: 82 },
    { id: "aud-jpy", symbol: "AUD/JPY", name: "Australian Dollar / Japanese Yen", payout: 79 },
    { id: "eur-aud", symbol: "EUR/AUD", name: "Euro / Australian Dollar", payout: 78 },
    { id: "gbp-aud", symbol: "GBP/AUD", name: "British Pound / Australian Dollar", payout: 77 },
    { id: "eur-cad", symbol: "EUR/CAD", name: "Euro / Canadian Dollar", payout: 76 },
    { id: "gbp-cad", symbol: "GBP/CAD", name: "British Pound / Canadian Dollar", payout: 75 },
    { id: "aud-cad", symbol: "AUD/CAD", name: "Australian Dollar / Canadian Dollar", payout: 74 },
    { id: "cad-jpy", symbol: "CAD/JPY", name: "Canadian Dollar / Japanese Yen", payout: 73 },
    { id: "chf-jpy", symbol: "CHF/JPY", name: "Swiss Franc / Japanese Yen", payout: 72 },
    { id: "eur-nzd", symbol: "EUR/NZD", name: "Euro / New Zealand Dollar", payout: 71 },
    { id: "gbp-nzd", symbol: "GBP/NZD", name: "British Pound / New Zealand Dollar", payout: 70 },
    { id: "nzd-jpy", symbol: "NZD/JPY", name: "New Zealand Dollar / Japanese Yen", payout: 69 },
    { id: "aud-nzd", symbol: "AUD/NZD", name: "Australian Dollar / New Zealand Dollar", payout: 68 },
    { id: "eur-chf", symbol: "EUR/CHF", name: "Euro / Swiss Franc", payout: 67 },
    { id: "gbp-chf", symbol: "GBP/CHF", name: "British Pound / Swiss Franc", payout: 66 },
    { id: "aud-chf", symbol: "AUD/CHF", name: "Australian Dollar / Swiss Franc", payout: 65 },
    { id: "nzd-chf", symbol: "NZD/CHF", name: "New Zealand Dollar / Swiss Franc", payout: 64 },
    { id: "cad-chf", symbol: "CAD/CHF", name: "Canadian Dollar / Swiss Franc", payout: 63 },
    // Exotic Pairs
    { id: "usd-sgd", symbol: "USD/SGD", name: "US Dollar / Singapore Dollar", payout: 62 },
    { id: "usd-hkd", symbol: "USD/HKD", name: "US Dollar / Hong Kong Dollar", payout: 61 },
    { id: "usd-sek", symbol: "USD/SEK", name: "US Dollar / Swedish Krona", payout: 60 },
    { id: "usd-nok", symbol: "USD/NOK", name: "US Dollar / Norwegian Krone", payout: 59 },
    { id: "usd-dkk", symbol: "USD/DKK", name: "US Dollar / Danish Krone", payout: 58 },
    { id: "usd-pln", symbol: "USD/PLN", name: "US Dollar / Polish Zloty", payout: 57 },
    { id: "usd-mxn", symbol: "USD/MXN", name: "US Dollar / Mexican Peso", payout: 56 },
    { id: "usd-zar", symbol: "USD/ZAR", name: "US Dollar / South African Rand", payout: 55 },
    { id: "usd-try", symbol: "USD/TRY", name: "US Dollar / Turkish Lira", payout: 54 },
    { id: "usd-rub", symbol: "USD/RUB", name: "US Dollar / Russian Ruble", payout: 53 },
    { id: "eur-pln", symbol: "EUR/PLN", name: "Euro / Polish Zloty", payout: 52 },
    { id: "eur-sek", symbol: "EUR/SEK", name: "Euro / Swedish Krona", payout: 51 },
    { id: "eur-nok", symbol: "EUR/NOK", name: "Euro / Norwegian Krone", payout: 50 },
    { id: "eur-try", symbol: "EUR/TRY", name: "Euro / Turkish Lira", payout: 49 },
    { id: "gbp-sgd", symbol: "GBP/SGD", name: "British Pound / Singapore Dollar", payout: 48 },
    { id: "aud-sgd", symbol: "AUD/SGD", name: "Australian Dollar / Singapore Dollar", payout: 47 },
    { id: "sgd-jpy", symbol: "SGD/JPY", name: "Singapore Dollar / Japanese Yen", payout: 46 },
    { id: "nok-sek", symbol: "NOK/SEK", name: "Norwegian Krone / Swedish Krona", payout: 45 },
    { id: "usd-czk", symbol: "USD/CZK", name: "US Dollar / Czech Koruna", payout: 44 },
    { id: "usd-huf", symbol: "USD/HUF", name: "US Dollar / Hungarian Forint", payout: 43 },
    { id: "eur-huf", symbol: "EUR/HUF", name: "Euro / Hungarian Forint", payout: 42 },
    { id: "usd-cnh", symbol: "USD/CNH", name: "US Dollar / Chinese Yuan Offshore", payout: 41 },
  ],
  crypto: [
    // Major Cryptocurrencies
    { id: "bitcoin", symbol: "BTC/USD", name: "Bitcoin", payout: 92 },
    { id: "ethereum", symbol: "ETH/USD", name: "Ethereum", payout: 90 },
    { id: "binancecoin", symbol: "BNB/USD", name: "Binance Coin", payout: 88 },
    { id: "solana", symbol: "SOL/USD", name: "Solana", payout: 91 },
    { id: "ripple", symbol: "XRP/USD", name: "Ripple", payout: 87 },
    { id: "cardano", symbol: "ADA/USD", name: "Cardano", payout: 86 },
    { id: "dogecoin", symbol: "DOGE/USD", name: "Dogecoin", payout: 89 },
    { id: "polkadot", symbol: "DOT/USD", name: "Polkadot", payout: 85 },
    // Altcoins & DeFi
    { id: "chainlink", symbol: "LINK/USD", name: "Chainlink", payout: 84 },
    { id: "uniswap", symbol: "UNI/USD", name: "Uniswap", payout: 83 },
    { id: "matic-network", symbol: "MATIC/USD", name: "Polygon", payout: 82 },
    { id: "avalanche-2", symbol: "AVAX/USD", name: "Avalanche", payout: 81 },
    { id: "cosmos", symbol: "ATOM/USD", name: "Cosmos", payout: 80 },
    { id: "litecoin", symbol: "LTC/USD", name: "Litecoin", payout: 79 },
    { id: "tron", symbol: "TRX/USD", name: "TRON", payout: 78 },
    { id: "stellar", symbol: "XLM/USD", name: "Stellar", payout: 77 },
    { id: "near", symbol: "NEAR/USD", name: "NEAR Protocol", payout: 76 },
    { id: "algorand", symbol: "ALGO/USD", name: "Algorand", payout: 75 },
    { id: "fantom", symbol: "FTM/USD", name: "Fantom", payout: 74 },
    { id: "vechain", symbol: "VET/USD", name: "VeChain", payout: 73 },
    { id: "filecoin", symbol: "FIL/USD", name: "Filecoin", payout: 72 },
    { id: "aave", symbol: "AAVE/USD", name: "Aave", payout: 71 },
    { id: "the-sandbox", symbol: "SAND/USD", name: "The Sandbox", payout: 70 },
    { id: "decentraland", symbol: "MANA/USD", name: "Decentraland", payout: 69 },
    { id: "axie-infinity", symbol: "AXS/USD", name: "Axie Infinity", payout: 68 },
    { id: "internet-computer", symbol: "ICP/USD", name: "Internet Computer", payout: 67 },
    { id: "theta-token", symbol: "THETA/USD", name: "Theta Network", payout: 66 },
    { id: "hedera-hashgraph", symbol: "HBAR/USD", name: "Hedera", payout: 65 },
    { id: "elrond-erd-2", symbol: "EGLD/USD", name: "MultiversX", payout: 64 },
    { id: "eos", symbol: "EOS/USD", name: "EOS", payout: 63 },
    { id: "monero", symbol: "XMR/USD", name: "Monero", payout: 62 },
    { id: "tezos", symbol: "XTZ/USD", name: "Tezos", payout: 61 },
    // Memecoins
    { id: "shiba-inu", symbol: "SHIB/USD", name: "Shiba Inu", payout: 90 },
    { id: "pepe", symbol: "PEPE/USD", name: "Pepe", payout: 89 },
    { id: "floki", symbol: "FLOKI/USD", name: "Floki Inu", payout: 88 },
    { id: "bonk", symbol: "BONK/USD", name: "Bonk", payout: 87 },
    { id: "dogwifhat", symbol: "WIF/USD", name: "dogwifhat", payout: 86 },
    // Additional Popular
    { id: "aptos", symbol: "APT/USD", name: "Aptos", payout: 85 },
    { id: "arbitrum", symbol: "ARB/USD", name: "Arbitrum", payout: 84 },
    { id: "optimism", symbol: "OP/USD", name: "Optimism", payout: 83 },
    { id: "injective-protocol", symbol: "INJ/USD", name: "Injective", payout: 82 },
    { id: "render-token", symbol: "RNDR/USD", name: "Render", payout: 81 },
    { id: "sui", symbol: "SUI/USD", name: "Sui", payout: 80 },
    { id: "sei-network", symbol: "SEI/USD", name: "Sei", payout: 79 },
    { id: "celestia", symbol: "TIA/USD", name: "Celestia", payout: 78 },
    { id: "stacks", symbol: "STX/USD", name: "Stacks", payout: 77 },
    { id: "immutable-x", symbol: "IMX/USD", name: "Immutable", payout: 76 },
    { id: "kaspa", symbol: "KAS/USD", name: "Kaspa", payout: 75 },
    { id: "fetch-ai", symbol: "FET/USD", name: "Fetch.ai", payout: 74 },
  ],
  stocks: [
    // Technology
    { id: "aapl", symbol: "AAPL", name: "Apple Inc.", payout: 81 },
    { id: "msft", symbol: "MSFT", name: "Microsoft Corp.", payout: 79 },
    { id: "googl", symbol: "GOOGL", name: "Alphabet Inc.", payout: 80 },
    { id: "amzn", symbol: "AMZN", name: "Amazon.com Inc.", payout: 78 },
    { id: "tsla", symbol: "TSLA", name: "Tesla Inc.", payout: 82 },
    { id: "meta", symbol: "META", name: "Meta Platforms Inc.", payout: 77 },
    { id: "nvda", symbol: "NVDA", name: "NVIDIA Corp.", payout: 83 },
    { id: "nflx", symbol: "NFLX", name: "Netflix Inc.", payout: 76 },
    { id: "csco", symbol: "CSCO", name: "Cisco Systems Inc.", payout: 75 },
    { id: "intc", symbol: "INTC", name: "Intel Corp.", payout: 74 },
    { id: "amd", symbol: "AMD", name: "Advanced Micro Devices", payout: 82 },
    { id: "coin", symbol: "COIN", name: "Coinbase Global Inc.", payout: 85 },
    { id: "pltr", symbol: "PLTR", name: "Palantir Technologies", payout: 81 },
    // Finance
    { id: "jpm", symbol: "JPM", name: "JPMorgan Chase & Co.", payout: 73 },
    { id: "gs", symbol: "GS", name: "Goldman Sachs", payout: 72 },
    { id: "c", symbol: "C", name: "Citigroup Inc.", payout: 71 },
    { id: "v", symbol: "V", name: "Visa Inc.", payout: 74 },
    { id: "axp", symbol: "AXP", name: "American Express Co.", payout: 70 },
    // Healthcare
    { id: "pfe", symbol: "PFE", name: "Pfizer Inc.", payout: 69 },
    { id: "jnj", symbol: "JNJ", name: "Johnson & Johnson", payout: 68 },
    // Retail & Consumer
    { id: "mcd", symbol: "MCD", name: "McDonald's Corp.", payout: 67 },
    { id: "wmt", symbol: "WMT", name: "Walmart Inc.", payout: 66 },
    { id: "cost", symbol: "COST", name: "Costco Wholesale", payout: 65 },
    { id: "dis", symbol: "DIS", name: "Walt Disney Co.", payout: 70 },
    // Energy
    { id: "xom", symbol: "XOM", name: "ExxonMobil Corp.", payout: 64 },
    { id: "cvx", symbol: "CVX", name: "Chevron Corp.", payout: 63 },
    // Other
    { id: "ba", symbol: "BA", name: "Boeing Company", payout: 71 },
    { id: "fdx", symbol: "FDX", name: "FedEx Corp.", payout: 68 },
    { id: "baba", symbol: "BABA", name: "Alibaba Group", payout: 75 },
    { id: "gme", symbol: "GME", name: "GameStop Corp.", payout: 88 },
    { id: "mara", symbol: "MARA", name: "Marathon Digital Holdings", payout: 86 },
    { id: "vix", symbol: "VIX", name: "VIX Volatility Index", payout: 80 },
  ],
  indices: [
    // US Indices
    { id: "nas100", symbol: "US100", name: "NASDAQ 100", payout: 78 },
    { id: "sp500", symbol: "SP500", name: "S&P 500", payout: 77 },
    { id: "dji30", symbol: "DJI30", name: "Dow Jones 30", payout: 76 },
    { id: "rus2000", symbol: "RUS2000", name: "Russell 2000", payout: 75 },
    // European Indices
    { id: "cac40", symbol: "CAC40", name: "CAC 40 (France)", payout: 74 },
    { id: "dax40", symbol: "D30EUR", name: "DAX 40 (Germany)", payout: 73 },
    { id: "ftse100", symbol: "100GBP", name: "FTSE 100 (UK)", payout: 72 },
    { id: "e50eur", symbol: "E50EUR", name: "Euro Stoxx 50", payout: 71 },
    { id: "e35eur", symbol: "E35EUR", name: "Euro Stoxx 35", payout: 70 },
    { id: "f40eur", symbol: "F40EUR", name: "France 40", payout: 69 },
    { id: "smi20", symbol: "SMI20", name: "SMI 20 (Swiss)", payout: 68 },
    { id: "ibex35", symbol: "IBEX35", name: "IBEX 35 (Spain)", payout: 67 },
    { id: "aex25", symbol: "AEX25", name: "AEX 25 (Netherlands)", payout: 66 },
    // Asian/Other Indices
    { id: "jpn225", symbol: "JPN225", name: "Nikkei 225 (Japan)", payout: 74 },
    { id: "hsi", symbol: "HSI", name: "Hang Seng (Hong Kong)", payout: 73 },
    { id: "aus200", symbol: "AUS200", name: "ASX 200 (Australia)", payout: 72 },
  ],
  commodities: [
    // Precious Metals
    { id: "xauusd", symbol: "XAU/USD", name: "Gold OTC", payout: 88 },
    { id: "xagusd", symbol: "XAG/USD", name: "Silver OTC", payout: 87 },
    { id: "xptusd", symbol: "XPT/USD", name: "Platinum spot OTC", payout: 53 },
    { id: "xpdusd", symbol: "XPD/USD", name: "Palladium spot OTC", payout: 53 },
    // Energy
    { id: "brent", symbol: "XBR/USD", name: "Brent Oil OTC", payout: 85 },
    { id: "wti", symbol: "XTI/USD", name: "WTI Crude Oil OTC", payout: 84 },
    { id: "natgas", symbol: "NATGAS", name: "Natural Gas OTC", payout: 53 },
    // Agriculture
    { id: "wheat", symbol: "WHEAT", name: "Wheat", payout: 60 },
    { id: "corn", symbol: "CORN", name: "Corn", payout: 59 },
    { id: "soybean", symbol: "SOYBEAN", name: "Soybeans", payout: 58 },
    { id: "coffee", symbol: "COFFEE", name: "Coffee", payout: 57 },
    { id: "sugar", symbol: "SUGAR", name: "Sugar", payout: 56 },
    { id: "cotton", symbol: "COTTON", name: "Cotton", payout: 55 },
    { id: "cocoa", symbol: "COCOA", name: "Cocoa", payout: 54 },
  ],
};

// CoinGecko API for crypto prices
const fetchCryptoPrices = async (): Promise<Record<string, { price: number; change: number; changePercent: number }>> => {
  try {
    const ids = QT_ASSETS_CONFIG.crypto.map(c => c.id).join(",");
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    const data = await response.json();
    
    const prices: Record<string, { price: number; change: number; changePercent: number }> = {};
    
    for (const asset of QT_ASSETS_CONFIG.crypto) {
      if (data[asset.id]) {
        const price = data[asset.id].usd;
        const changePercent = data[asset.id].usd_24h_change || 0;
        prices[asset.symbol] = {
          price,
          change: price * (changePercent / 100),
          changePercent
        };
      }
    }
    
    return prices;
  } catch (error) {
    console.error("Error fetching crypto prices:", error);
    return {};
  }
};

// Simulated prices for forex, stocks, indices, commodities
const generateSimulatedPrices = (): Record<string, { price: number; change: number; changePercent: number }> => {
  const basePrices: Record<string, number> = {
    // Forex - Major
    "EUR/USD": 1.0856, "GBP/USD": 1.2678, "USD/JPY": 149.50, "AUD/USD": 0.6542,
    "USD/CAD": 1.3567, "USD/CHF": 0.8765, "NZD/USD": 0.6123,
    // Forex - Minor/Cross
    "EUR/GBP": 0.8567, "EUR/JPY": 162.34, "GBP/JPY": 189.56, "AUD/JPY": 97.82,
    "EUR/AUD": 1.6589, "GBP/AUD": 1.9378, "EUR/CAD": 1.4723, "GBP/CAD": 1.7189,
    "AUD/CAD": 0.8876, "CAD/JPY": 110.23, "CHF/JPY": 170.56, "EUR/NZD": 1.7734,
    "GBP/NZD": 2.0698, "NZD/JPY": 91.56, "AUD/NZD": 1.0689, "EUR/CHF": 0.9523,
    "GBP/CHF": 1.1112, "AUD/CHF": 0.5734, "NZD/CHF": 0.5367, "CAD/CHF": 0.6456,
    // Forex - Exotic
    "USD/SGD": 1.3456, "USD/HKD": 7.8234, "USD/SEK": 10.4567, "USD/NOK": 10.7823,
    "USD/DKK": 6.8923, "USD/PLN": 4.0234, "USD/MXN": 17.1234, "USD/ZAR": 18.7823,
    "USD/TRY": 32.4567, "USD/RUB": 91.2345, "EUR/PLN": 4.3678, "EUR/SEK": 11.3456,
    "EUR/NOK": 11.6987, "EUR/TRY": 35.2134, "GBP/SGD": 1.7056, "AUD/SGD": 0.8812,
    "SGD/JPY": 111.12, "NOK/SEK": 0.9712, "USD/CZK": 23.1234, "USD/HUF": 358.45,
    "EUR/HUF": 389.12, "USD/CNH": 7.2456,
    // Stocks
    "AAPL": 182.34, "MSFT": 378.92, "GOOGL": 141.56, "AMZN": 178.45,
    "TSLA": 238.67, "META": 505.23, "NVDA": 495.67, "NFLX": 478.90,
    "CSCO": 48.67, "INTC": 42.34, "AMD": 156.78, "COIN": 234.56,
    "PLTR": 24.56, "JPM": 198.45, "GS": 412.34, "C": 56.78,
    "V": 278.90, "AXP": 234.56, "PFE": 28.45, "JNJ": 156.78,
    "MCD": 278.90, "WMT": 165.43, "COST": 734.56, "DIS": 112.34,
    "XOM": 112.34, "CVX": 156.78, "BA": 234.56, "FDX": 267.89,
    "BABA": 78.90, "GME": 24.56, "MARA": 18.90, "VIX": 14.56,
    // Indices
    "US100": 17845, "SP500": 5123, "DJI30": 38654, "RUS2000": 2045,
    "CAC40": 7856, "D30EUR": 18234, "100GBP": 7923, "E50EUR": 4567,
    "E35EUR": 4234, "F40EUR": 7789, "SMI20": 11234, "IBEX35": 10456,
    "AEX25": 856.78, "JPN225": 38567, "HSI": 17234, "AUS200": 7845,
    // Commodities
    "XAU/USD": 2345.67, "XAG/USD": 28.56, "XPT/USD": 1023.45, "XPD/USD": 1156.78,
    "XBR/USD": 82.34, "XTI/USD": 78.90, "NATGAS": 2.456,
    "WHEAT": 567.89, "CORN": 456.78, "SOYBEAN": 1234.56,
    "COFFEE": 234.56, "SUGAR": 23.45, "COTTON": 78.90, "COCOA": 8234.56,
  };

  const prices: Record<string, { price: number; change: number; changePercent: number }> = {};
  
  for (const [symbol, basePrice] of Object.entries(basePrices)) {
    const changePercent = (Math.random() - 0.5) * 2;
    const change = basePrice * (changePercent / 100);
    prices[symbol] = {
      price: basePrice + change,
      change,
      changePercent
    };
  }
  
  return prices;
};

export const useQTAssets = () => {
  const [assets, setAssets] = useState<QTAsset[]>([]);
  const [connected, setConnected] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const refreshAssets = useCallback(async () => {
    try {
      const cryptoPrices = await fetchCryptoPrices();
      const otherPrices = generateSimulatedPrices();
      const allPrices = { ...cryptoPrices, ...otherPrices };

      const allAssets: QTAsset[] = [];

      // Add forex assets
      for (const config of QT_ASSETS_CONFIG.forex) {
        const priceData = allPrices[config.symbol] || { price: 1, change: 0, changePercent: 0 };
        allAssets.push({
          id: config.id,
          symbol: config.symbol,
          name: config.name,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          payout: config.payout,
          category: "forex",
          source: "alphavantage",
          isFavorite: favorites.has(config.id)
        });
      }

      // Add crypto assets
      for (const config of QT_ASSETS_CONFIG.crypto) {
        const priceData = allPrices[config.symbol] || { price: 0, change: 0, changePercent: 0 };
        allAssets.push({
          id: config.id,
          symbol: config.symbol,
          name: config.name,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          payout: config.payout,
          category: "crypto",
          source: "coingecko",
          isFavorite: favorites.has(config.id)
        });
      }

      // Add stocks
      for (const config of QT_ASSETS_CONFIG.stocks) {
        const priceData = allPrices[config.symbol] || { price: 100, change: 0, changePercent: 0 };
        allAssets.push({
          id: config.id,
          symbol: config.symbol,
          name: config.name,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          payout: config.payout,
          category: "stocks",
          source: "alphavantage",
          isFavorite: favorites.has(config.id)
        });
      }

      // Add indices
      for (const config of QT_ASSETS_CONFIG.indices) {
        const priceData = allPrices[config.symbol] || { price: 1000, change: 0, changePercent: 0 };
        allAssets.push({
          id: config.id,
          symbol: config.symbol,
          name: config.name,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          payout: config.payout,
          category: "indices",
          source: "alphavantage",
          isFavorite: favorites.has(config.id)
        });
      }

      // Add commodities
      for (const config of QT_ASSETS_CONFIG.commodities) {
        const priceData = allPrices[config.symbol] || { price: 100, change: 0, changePercent: 0 };
        allAssets.push({
          id: config.id,
          symbol: config.symbol,
          name: config.name,
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          payout: config.payout,
          category: "commodities",
          source: "yahoo",
          isFavorite: favorites.has(config.id)
        });
      }

      // Sort by favorites first, then by payout
      allAssets.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return b.payout - a.payout;
      });

      setAssets(allAssets);
      setConnected(true);
    } catch (error) {
      console.error("Error refreshing assets:", error);
      setConnected(false);
    }
  }, [favorites]);

  useEffect(() => {
    refreshAssets();
    const interval = setInterval(refreshAssets, 5000);
    return () => clearInterval(interval);
  }, [refreshAssets]);

  const toggleFavorite = useCallback((assetId: string) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(assetId)) {
        newFavorites.delete(assetId);
      } else {
        newFavorites.add(assetId);
      }
      return newFavorites;
    });
  }, []);

  return { assets, connected, refreshAssets, toggleFavorite };
};
