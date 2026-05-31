// Metal Trader Assets Database
export interface MTAssetData {
  symbol: string;
  name: string;
  category: 'metals' | 'forex' | 'crypto' | 'stocks' | 'indices' | 'commodities' | 'etfs';
  basePrice: number;
  decimals: number;
  pipMultiplier?: number;
}

const metalAssets: MTAssetData[] = [
  { symbol: 'XAUUSD', name: 'Gold vs US Dollar', category: 'metals', basePrice: 2650.00, decimals: 2 },
  { symbol: 'XAGUSD', name: 'Silver vs US Dollar', category: 'metals', basePrice: 31.50, decimals: 3 },
  { symbol: 'XPTUSD', name: 'Platinum vs US Dollar', category: 'metals', basePrice: 985.00, decimals: 2 },
  { symbol: 'XPDUSD', name: 'Palladium vs US Dollar', category: 'metals', basePrice: 1050.00, decimals: 2 },
  { symbol: 'XAUEUR', name: 'Gold vs Euro', category: 'metals', basePrice: 2420.00, decimals: 2 },
  { symbol: 'XAGEUR', name: 'Silver vs Euro', category: 'metals', basePrice: 28.80, decimals: 3 },
  { symbol: 'XAUGBP', name: 'Gold vs British Pound', category: 'metals', basePrice: 2080.00, decimals: 2 },
  { symbol: 'XAUCHF', name: 'Gold vs Swiss Franc', category: 'metals', basePrice: 2350.00, decimals: 2 },
];

const forexAssets: MTAssetData[] = [
  // Major Pairs
  { symbol: 'EURUSD', name: 'Euro vs US Dollar', category: 'forex', basePrice: 1.08560, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'GBPUSD', name: 'British Pound vs US Dollar', category: 'forex', basePrice: 1.26780, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'USDJPY', name: 'US Dollar vs Japanese Yen', category: 'forex', basePrice: 157.850, decimals: 3, pipMultiplier: 100 },
  { symbol: 'USDCHF', name: 'US Dollar vs Swiss Franc', category: 'forex', basePrice: 0.88920, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'AUDUSD', name: 'Australian Dollar vs US Dollar', category: 'forex', basePrice: 0.62340, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'USDCAD', name: 'US Dollar vs Canadian Dollar', category: 'forex', basePrice: 1.43850, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar vs US Dollar', category: 'forex', basePrice: 0.56120, decimals: 5, pipMultiplier: 10000 },
  // Minor Pairs
  { symbol: 'EURGBP', name: 'Euro vs British Pound', category: 'forex', basePrice: 0.85620, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'EURJPY', name: 'Euro vs Japanese Yen', category: 'forex', basePrice: 171.350, decimals: 3, pipMultiplier: 100 },
  { symbol: 'GBPJPY', name: 'British Pound vs Japanese Yen', category: 'forex', basePrice: 200.120, decimals: 3, pipMultiplier: 100 },
  { symbol: 'AUDJPY', name: 'Australian Dollar vs Japanese Yen', category: 'forex', basePrice: 98.450, decimals: 3, pipMultiplier: 100 },
  { symbol: 'EURAUD', name: 'Euro vs Australian Dollar', category: 'forex', basePrice: 1.74250, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'EURCHF', name: 'Euro vs Swiss Franc', category: 'forex', basePrice: 0.96520, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'GBPCHF', name: 'British Pound vs Swiss Franc', category: 'forex', basePrice: 1.12780, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'CADJPY', name: 'Canadian Dollar vs Japanese Yen', category: 'forex', basePrice: 109.750, decimals: 3, pipMultiplier: 100 },
  { symbol: 'CHFJPY', name: 'Swiss Franc vs Japanese Yen', category: 'forex', basePrice: 177.520, decimals: 3, pipMultiplier: 100 },
  { symbol: 'AUDCAD', name: 'Australian Dollar vs Canadian Dollar', category: 'forex', basePrice: 0.89650, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'AUDCHF', name: 'Australian Dollar vs Swiss Franc', category: 'forex', basePrice: 0.55420, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'AUDNZD', name: 'Australian Dollar vs New Zealand Dollar', category: 'forex', basePrice: 1.11050, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'CADCHF', name: 'Canadian Dollar vs Swiss Franc', category: 'forex', basePrice: 0.61820, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'EURCAD', name: 'Euro vs Canadian Dollar', category: 'forex', basePrice: 1.56120, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'EURNZD', name: 'Euro vs New Zealand Dollar', category: 'forex', basePrice: 1.93450, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'GBPAUD', name: 'British Pound vs Australian Dollar', category: 'forex', basePrice: 2.03450, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'GBPCAD', name: 'British Pound vs Canadian Dollar', category: 'forex', basePrice: 1.82340, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'GBPNZD', name: 'British Pound vs New Zealand Dollar', category: 'forex', basePrice: 2.25890, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'NZDCAD', name: 'New Zealand Dollar vs Canadian Dollar', category: 'forex', basePrice: 0.80720, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'NZDCHF', name: 'New Zealand Dollar vs Swiss Franc', category: 'forex', basePrice: 0.49920, decimals: 5, pipMultiplier: 10000 },
  { symbol: 'NZDJPY', name: 'New Zealand Dollar vs Japanese Yen', category: 'forex', basePrice: 88.650, decimals: 3, pipMultiplier: 100 },
];

const cryptoAssets: MTAssetData[] = [
  { symbol: 'BTCUSD', name: 'Bitcoin vs US Dollar', category: 'crypto', basePrice: 102500.00, decimals: 2 },
  { symbol: 'ETHUSD', name: 'Ethereum vs US Dollar', category: 'crypto', basePrice: 3850.00, decimals: 2 },
  { symbol: 'BNBUSD', name: 'Binance Coin vs US Dollar', category: 'crypto', basePrice: 715.00, decimals: 2 },
  { symbol: 'SOLUSD', name: 'Solana vs US Dollar', category: 'crypto', basePrice: 225.00, decimals: 2 },
  { symbol: 'XRPUSD', name: 'Ripple vs US Dollar', category: 'crypto', basePrice: 2.35, decimals: 4 },
  { symbol: 'ADAUSD', name: 'Cardano vs US Dollar', category: 'crypto', basePrice: 1.10, decimals: 4 },
  { symbol: 'DOGEUSD', name: 'Dogecoin vs US Dollar', category: 'crypto', basePrice: 0.42, decimals: 5 },
  { symbol: 'DOTUSD', name: 'Polkadot vs US Dollar', category: 'crypto', basePrice: 9.50, decimals: 3 },
  { symbol: 'MATICUSD', name: 'Polygon vs US Dollar', category: 'crypto', basePrice: 0.62, decimals: 4 },
  { symbol: 'LINKUSD', name: 'Chainlink vs US Dollar', category: 'crypto', basePrice: 28.50, decimals: 3 },
  { symbol: 'AVAXUSD', name: 'Avalanche vs US Dollar', category: 'crypto', basePrice: 52.00, decimals: 2 },
  { symbol: 'ATOMUSD', name: 'Cosmos vs US Dollar', category: 'crypto', basePrice: 11.20, decimals: 3 },
  { symbol: 'UNIUSD', name: 'Uniswap vs US Dollar', category: 'crypto', basePrice: 17.80, decimals: 3 },
  { symbol: 'LTCUSD', name: 'Litecoin vs US Dollar', category: 'crypto', basePrice: 125.00, decimals: 2 },
  { symbol: 'BCHUSD', name: 'Bitcoin Cash vs US Dollar', category: 'crypto', basePrice: 510.00, decimals: 2 },
];

const stockAssets: MTAssetData[] = [
  { symbol: 'AAPL', name: 'Apple Inc', category: 'stocks', basePrice: 248.00, decimals: 2 },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'stocks', basePrice: 445.00, decimals: 2 },
  { symbol: 'GOOGL', name: 'Alphabet Inc', category: 'stocks', basePrice: 195.00, decimals: 2 },
  { symbol: 'AMZN', name: 'Amazon.com Inc', category: 'stocks', basePrice: 230.00, decimals: 2 },
  { symbol: 'TSLA', name: 'Tesla Inc', category: 'stocks', basePrice: 425.00, decimals: 2 },
  { symbol: 'META', name: 'Meta Platforms Inc', category: 'stocks', basePrice: 615.00, decimals: 2 },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', category: 'stocks', basePrice: 142.00, decimals: 2 },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co', category: 'stocks', basePrice: 250.00, decimals: 2 },
  { symbol: 'V', name: 'Visa Inc', category: 'stocks', basePrice: 318.00, decimals: 2 },
  { symbol: 'JNJ', name: 'Johnson & Johnson', category: 'stocks', basePrice: 148.00, decimals: 2 },
  { symbol: 'WMT', name: 'Walmart Inc', category: 'stocks', basePrice: 95.00, decimals: 2 },
  { symbol: 'PG', name: 'Procter & Gamble', category: 'stocks', basePrice: 172.00, decimals: 2 },
  { symbol: 'XOM', name: 'Exxon Mobil Corporation', category: 'stocks', basePrice: 108.00, decimals: 2 },
  { symbol: 'DIS', name: 'Walt Disney Company', category: 'stocks', basePrice: 115.00, decimals: 2 },
  { symbol: 'NFLX', name: 'Netflix Inc', category: 'stocks', basePrice: 920.00, decimals: 2 },
  { symbol: 'BA', name: 'Boeing Company', category: 'stocks', basePrice: 175.00, decimals: 2 },
  { symbol: 'INTC', name: 'Intel Corporation', category: 'stocks', basePrice: 20.50, decimals: 2 },
  { symbol: 'CSCO', name: 'Cisco Systems Inc', category: 'stocks', basePrice: 59.00, decimals: 2 },
  { symbol: 'PFE', name: 'Pfizer Inc', category: 'stocks', basePrice: 26.00, decimals: 2 },
  { symbol: 'COIN', name: 'Coinbase Global Inc', category: 'stocks', basePrice: 340.00, decimals: 2 },
  { symbol: 'GME', name: 'GameStop Corp', category: 'stocks', basePrice: 32.00, decimals: 2 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', category: 'stocks', basePrice: 125.00, decimals: 2 },
  { symbol: 'PLTR', name: 'Palantir Technologies', category: 'stocks', basePrice: 80.00, decimals: 2 },
  { symbol: 'MARA', name: 'Marathon Digital Holdings', category: 'stocks', basePrice: 28.00, decimals: 2 },
  { symbol: 'AXP', name: 'American Express', category: 'stocks', basePrice: 300.00, decimals: 2 },
  { symbol: 'C', name: 'Citigroup Inc', category: 'stocks', basePrice: 70.00, decimals: 2 },
  { symbol: 'GS', name: 'Goldman Sachs', category: 'stocks', basePrice: 605.00, decimals: 2 },
  { symbol: 'MCD', name: "McDonald's Corporation", category: 'stocks', basePrice: 292.00, decimals: 2 },
  { symbol: 'COST', name: 'Costco Wholesale', category: 'stocks', basePrice: 985.00, decimals: 2 },
  { symbol: 'CVX', name: 'Chevron Corporation', category: 'stocks', basePrice: 145.00, decimals: 2 },
];

const indicesAssets: MTAssetData[] = [
  { symbol: 'US500', name: 'S&P 500 Index', category: 'indices', basePrice: 6090.00, decimals: 2 },
  { symbol: 'US100', name: 'NASDAQ 100 Index', category: 'indices', basePrice: 21850.00, decimals: 2 },
  { symbol: 'US30', name: 'Dow Jones Industrial', category: 'indices', basePrice: 44650.00, decimals: 2 },
  { symbol: 'GER40', name: 'DAX 40 Index', category: 'indices', basePrice: 20350.00, decimals: 2 },
  { symbol: 'UK100', name: 'FTSE 100 Index', category: 'indices', basePrice: 8320.00, decimals: 2 },
  { symbol: 'FRA40', name: 'CAC 40 Index', category: 'indices', basePrice: 7450.00, decimals: 2 },
  { symbol: 'JPN225', name: 'Nikkei 225 Index', category: 'indices', basePrice: 39500.00, decimals: 2 },
  { symbol: 'AUS200', name: 'ASX 200 Index', category: 'indices', basePrice: 8450.00, decimals: 2 },
  { symbol: 'HK50', name: 'Hang Seng Index', category: 'indices', basePrice: 20100.00, decimals: 2 },
  { symbol: 'EU50', name: 'Euro Stoxx 50', category: 'indices', basePrice: 4950.00, decimals: 2 },
  { symbol: 'SPA35', name: 'IBEX 35 Index', category: 'indices', basePrice: 11850.00, decimals: 2 },
  { symbol: 'SUI20', name: 'SMI 20 Index', category: 'indices', basePrice: 11750.00, decimals: 2 },
  { symbol: 'NED25', name: 'AEX 25 Index', category: 'indices', basePrice: 895.00, decimals: 2 },
  { symbol: 'RUS2000', name: 'Russell 2000', category: 'indices', basePrice: 2410.00, decimals: 2 },
  { symbol: 'VIX', name: 'Volatility Index', category: 'indices', basePrice: 14.50, decimals: 2 },
];

const commoditiesAssets: MTAssetData[] = [
  { symbol: 'USOIL', name: 'WTI Crude Oil', category: 'commodities', basePrice: 68.50, decimals: 2 },
  { symbol: 'UKOIL', name: 'Brent Crude Oil', category: 'commodities', basePrice: 72.80, decimals: 2 },
  { symbol: 'NATGAS', name: 'Natural Gas', category: 'commodities', basePrice: 3.25, decimals: 3 },
  { symbol: 'WHEAT', name: 'Wheat Futures', category: 'commodities', basePrice: 545.00, decimals: 2 },
  { symbol: 'CORN', name: 'Corn Futures', category: 'commodities', basePrice: 440.00, decimals: 2 },
  { symbol: 'SOYBEAN', name: 'Soybean Futures', category: 'commodities', basePrice: 985.00, decimals: 2 },
  { symbol: 'COFFEE', name: 'Coffee Futures', category: 'commodities', basePrice: 325.00, decimals: 2 },
  { symbol: 'SUGAR', name: 'Sugar Futures', category: 'commodities', basePrice: 20.50, decimals: 2 },
  { symbol: 'COPPER', name: 'Copper Futures', category: 'commodities', basePrice: 4.15, decimals: 3 },
  { symbol: 'COTTON', name: 'Cotton Futures', category: 'commodities', basePrice: 72.50, decimals: 2 },
];

const etfAssets: MTAssetData[] = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', category: 'etfs', basePrice: 605.00, decimals: 2 },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust', category: 'etfs', basePrice: 525.00, decimals: 2 },
  { symbol: 'IWM', name: 'iShares Russell 2000', category: 'etfs', basePrice: 240.00, decimals: 2 },
  { symbol: 'EEM', name: 'iShares MSCI Emerging', category: 'etfs', basePrice: 44.50, decimals: 2 },
  { symbol: 'GLD', name: 'SPDR Gold Shares', category: 'etfs', basePrice: 245.00, decimals: 2 },
  { symbol: 'SLV', name: 'iShares Silver Trust', category: 'etfs', basePrice: 29.00, decimals: 2 },
  { symbol: 'USO', name: 'United States Oil Fund', category: 'etfs', basePrice: 75.00, decimals: 2 },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury', category: 'etfs', basePrice: 88.50, decimals: 2 },
  { symbol: 'XLF', name: 'Financial Select Sector', category: 'etfs', basePrice: 48.00, decimals: 2 },
  { symbol: 'XLE', name: 'Energy Select Sector', category: 'etfs', basePrice: 92.00, decimals: 2 },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', category: 'etfs', basePrice: 58.00, decimals: 2 },
  { symbol: 'VXX', name: 'iPath Series B S&P 500 VIX', category: 'etfs', basePrice: 42.00, decimals: 2 },
];

export const getMTAssets = (category: MTAssetData['category']): MTAssetData[] => {
  switch (category) {
    case 'metals': return metalAssets;
    case 'forex': return forexAssets;
    case 'crypto': return cryptoAssets;
    case 'stocks': return stockAssets;
    case 'indices': return indicesAssets;
    case 'commodities': return commoditiesAssets;
    case 'etfs': return etfAssets;
    default: return metalAssets;
  }
};

export const getAllMTAssets = (): MTAssetData[] => [
  ...metalAssets,
  ...forexAssets,
  ...cryptoAssets,
  ...stockAssets,
  ...indicesAssets,
  ...commoditiesAssets,
  ...etfAssets,
];
