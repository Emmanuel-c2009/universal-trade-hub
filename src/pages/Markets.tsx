import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, TrendingUp, TrendingDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { formatEUR, formatNumber, cn } from "@/lib/utils";

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  category: string;
  icon?: string;
}

const CRYPTO_ICONS: Record<string, string> = {
  BTC: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  ETH: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  BNB: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  SOL: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  XRP: "https://assets.coingecko.com/coins/images/44/small/xrp-symbol-white-128.png",
  ADA: "https://assets.coingecko.com/coins/images/975/small/cardano.png",
  DOGE: "https://assets.coingecko.com/coins/images/5/small/dogecoin.png",
  DOT: "https://assets.coingecko.com/coins/images/12171/small/polkadot.png",
  LINK: "https://assets.coingecko.com/coins/images/877/small/chainlink-new-logo.png",
  AVAX: "https://assets.coingecko.com/coins/images/12559/small/Avalanche_Circle_RedWhite_Trans.png",
  LTC: "https://assets.coingecko.com/coins/images/2/small/litecoin.png",
};

// Static assets (forex, stocks, indices, commodities) - will be updated by Twelve Data
const STATIC_ASSETS: MarketAsset[] = [
  { symbol: "EUR/USD", name: "Euro / US Dollar", price: 1.0842, change24h: 0.12, category: "forex" },
  { symbol: "GBP/USD", name: "Pound / US Dollar", price: 1.2715, change24h: -0.08, category: "forex" },
  { symbol: "USD/JPY", name: "Dollar / Yen", price: 149.52, change24h: 0.35, category: "forex" },
  { symbol: "AUD/USD", name: "Aussie / Dollar", price: 0.6534, change24h: -0.22, category: "forex" },
  { symbol: "USD/CAD", name: "Dollar / Loonie", price: 1.3612, change24h: 0.15, category: "forex" },
  { symbol: "AAPL", name: "Apple Inc.", price: 178.52, change24h: 1.23, category: "stocks" },
  { symbol: "MSFT", name: "Microsoft", price: 415.60, change24h: 0.84, category: "stocks" },
  { symbol: "GOOGL", name: "Alphabet", price: 141.80, change24h: -0.42, category: "stocks" },
  { symbol: "AMZN", name: "Amazon", price: 186.40, change24h: 1.56, category: "stocks" },
  { symbol: "TSLA", name: "Tesla", price: 248.90, change24h: -2.31, category: "stocks" },
  { symbol: "NVDA", name: "NVIDIA", price: 875.30, change24h: 3.12, category: "stocks" },
  { symbol: "META", name: "Meta Platforms", price: 505.20, change24h: 0.67, category: "stocks" },
  { symbol: "US100", name: "Nasdaq 100", price: 18245.60, change24h: 0.45, category: "indices" },
  { symbol: "SP500", name: "S&P 500", price: 5234.18, change24h: 0.32, category: "indices" },
  { symbol: "DJI30", name: "Dow Jones 30", price: 39142.50, change24h: -0.15, category: "indices" },
  { symbol: "D30EUR", name: "DAX 30", price: 18384.20, change24h: 0.78, category: "indices" },
  { symbol: "XAU/USD", name: "Gold", price: 2345.80, change24h: 0.92, category: "commodities" },
  { symbol: "XAG/USD", name: "Silver", price: 28.45, change24h: -0.34, category: "commodities" },
  { symbol: "XTI/USD", name: "Crude Oil WTI", price: 78.62, change24h: 1.45, category: "commodities" },
];

export default function Markets() {
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState("Trader");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [cryptoAssets, setCryptoAssets] = useState<MarketAsset[]>([]);
  const [forexAssets, setForexAssets] = useState<MarketAsset[]>(STATIC_ASSETS.filter(a => a.category === 'forex'));
  const [commodityAssets, setCommodityAssets] = useState<MarketAsset[]>(STATIC_ASSETS.filter(a => a.category === 'commodities'));
  const [priceFlash, setPriceFlash] = useState<Record<string, 'up' | 'down' | null>>({});
  const prevPricesRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setSession(session);
      const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", session.user.id).single();
      if (profile?.full_name) setUserName(profile.full_name.split(" ")[0]);
      setLoading(false);
    };
    init();
  }, [navigate]);

  // Fetch crypto prices from CoinGecko
  useEffect(() => {
    const fetchCrypto = async () => {
      try {
        const response = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,solana,ripple,cardano,dogecoin,polkadot,chainlink,avalanche-2,litecoin&vs_currencies=eur&include_24hr_change=true'
        );
        const data = await response.json();

        const symbolMap: Record<string, { name: string; id: string }> = {
          bitcoin: { name: 'Bitcoin', id: 'BTC' },
          ethereum: { name: 'Ethereum', id: 'ETH' },
          binancecoin: { name: 'BNB', id: 'BNB' },
          solana: { name: 'Solana', id: 'SOL' },
          ripple: { name: 'XRP', id: 'XRP' },
          cardano: { name: 'Cardano', id: 'ADA' },
          dogecoin: { name: 'Dogecoin', id: 'DOGE' },
          polkadot: { name: 'Polkadot', id: 'DOT' },
          chainlink: { name: 'Chainlink', id: 'LINK' },
          'avalanche-2': { name: 'Avalanche', id: 'AVAX' },
          litecoin: { name: 'Litecoin', id: 'LTC' },
        };

        const assets: MarketAsset[] = [];
        for (const [geckoId, info] of Object.entries(symbolMap)) {
          if (data[geckoId]) {
            assets.push({
              symbol: info.id,
              name: info.name,
              price: data[geckoId].eur,
              change24h: data[geckoId].eur_24h_change || 0,
              category: 'crypto',
              icon: CRYPTO_ICONS[info.id],
            });
          }
        }
        setCryptoAssets(assets);
      } catch (err) {
        console.error('CoinGecko fetch error:', err);
      }
    };
    fetchCrypto();
    const interval = setInterval(fetchCrypto, 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch forex + commodity prices from Twelve Data edge function
  useEffect(() => {
    const fetchForex = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-forex-prices', {
          body: { symbols: 'EUR/USD,GBP/USD,USD/JPY,AUD/USD,USD/CAD,XAU/USD,XAG/USD' },
        });
        if (!error && data?.prices) {
          const updatedForex: MarketAsset[] = [];
          const updatedCommodity: MarketAsset[] = [];

          for (const [symbol, priceData] of Object.entries(data.prices as Record<string, any>)) {
            const existing = STATIC_ASSETS.find(a => a.symbol === symbol);
            const asset: MarketAsset = {
              symbol,
              name: existing?.name || symbol,
              price: priceData.price,
              change24h: priceData.percent_change || 0,
              category: existing?.category || (symbol.includes('XA') ? 'commodities' : 'forex'),
            };
            if (asset.category === 'commodities') {
              updatedCommodity.push(asset);
            } else {
              updatedForex.push(asset);
            }
          }
          if (updatedForex.length > 0) setForexAssets(updatedForex);
          if (updatedCommodity.length > 0) setCommodityAssets(updatedCommodity);
        }
      } catch (err) {
        console.error('Twelve Data fetch error:', err);
      }
    };
    fetchForex();
    const interval = setInterval(fetchForex, 5000);
    return () => clearInterval(interval);
  }, []);

  const otherAssets = STATIC_ASSETS.filter(a => a.category === 'stocks' || a.category === 'indices');
  const allAssets = useMemo(() => [...cryptoAssets, ...forexAssets, ...commodityAssets, ...otherAssets], [cryptoAssets, forexAssets, commodityAssets]);

  // Price flashing
  useEffect(() => {
    const newFlash: Record<string, 'up' | 'down' | null> = {};
    allAssets.forEach(a => {
      const prev = prevPricesRef.current[a.symbol];
      if (prev !== undefined && prev !== a.price) {
        newFlash[a.symbol] = a.price > prev ? 'up' : 'down';
      }
    });
    if (Object.keys(newFlash).length > 0) {
      setPriceFlash(newFlash);
      setTimeout(() => setPriceFlash({}), 200);
    }
    const p: Record<string, number> = {};
    allAssets.forEach(a => { p[a.symbol] = a.price; });
    prevPricesRef.current = p;
  }, [allAssets]);

  const filtered = useMemo(() => {
    let list = allAssets;
    if (activeTab === "favorites") list = list.filter(a => favorites.includes(a.symbol));
    else if (activeTab !== "all") list = list.filter(a => a.category === activeTab);
    if (search) list = list.filter(a => a.symbol.toLowerCase().includes(search.toLowerCase()) || a.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [allAssets, activeTab, search, favorites]);

  const toggleFavorite = (symbol: string) => {
    setFavorites(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} pageTitle="Markets" />
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <main className="container mx-auto px-4 pt-28 max-w-4xl pb-8">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search assets..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10" />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
          <TabsList className="w-full grid grid-cols-7">
            <TabsTrigger value="favorites" className="text-xs">⭐</TabsTrigger>
            <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
            <TabsTrigger value="crypto" className="text-xs">Crypto</TabsTrigger>
            <TabsTrigger value="forex" className="text-xs">Forex</TabsTrigger>
            <TabsTrigger value="stocks" className="text-xs">Stocks</TabsTrigger>
            <TabsTrigger value="indices" className="text-xs">Indices</TabsTrigger>
            <TabsTrigger value="commodities" className="text-xs">Comm.</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-1">
          <div className="flex items-center justify-between px-4 py-2 text-xs text-muted-foreground font-medium">
            <span className="w-8"></span>
            <span className="flex-1">Name</span>
            <span className="w-28 text-right">Last Price</span>
            <span className="w-20 text-right">24h Change</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No assets found</div>
          ) : (
            filtered.map(asset => {
              const flash = priceFlash[asset.symbol];
              return (
                <Card
                  key={asset.symbol}
                  className={cn(
                    "flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-muted/50 transition-all border-0 shadow-none border-b border-border rounded-none",
                    flash === 'up' && "bg-[#007AFF]/5",
                    flash === 'down' && "bg-[#FF3B30]/5"
                  )}
                  onClick={() => navigate('/quick-trade')}
                >
                  <button
                    onClick={e => { e.stopPropagation(); toggleFavorite(asset.symbol); }}
                    className="w-8"
                  >
                    <Star className={`w-4 h-4 ${favorites.includes(asset.symbol) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                  </button>

                  <div className="flex-1 flex items-center gap-3">
                    {asset.icon ? (
                      <img src={asset.icon} alt={asset.symbol} className="w-6 h-6 rounded-full" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                        {asset.symbol.charAt(0)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-sm">{asset.symbol}</p>
                      <p className="text-xs text-muted-foreground">{asset.name}</p>
                    </div>
                  </div>

                  <div className="w-28 text-right">
                    <span className="font-mono text-sm font-medium">
                      {asset.category === 'crypto' ? formatEUR(asset.price) : asset.category === 'forex' ? `$${asset.price.toFixed(5)}` : `€${formatNumber(asset.price)}`}
                    </span>
                  </div>

                  <div className="w-20 text-right">
                    <span className={`text-sm font-semibold flex items-center justify-end gap-1 ${asset.change24h >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {asset.change24h >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                      {asset.change24h >= 0 ? "+" : ""}{asset.change24h.toFixed(2)}%
                    </span>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
