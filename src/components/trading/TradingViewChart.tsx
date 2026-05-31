// src/components/trading/TradingViewChart.tsx

import { useEffect, useRef, useState } from "react";

interface TradingViewChartProps {
  symbol: string;
  theme?: "light" | "dark";
  onChartReady?: (api: any) => void;
}

declare global {
  interface Window {
    TradingView: any;
  }
}

export const TradingViewChart = ({ symbol, theme = "dark", onChartReady }: TradingViewChartProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initWidget = () => {
    if (!containerRef.current || widgetRef.current) return;
    
    if (!window.TradingView) {
      setError("TradingView library not loaded");
      setIsLoading(false);
      return;
    }

    try {
      const containerId = `tradingview-${symbol}-${Date.now()}`;
      containerRef.current.id = containerId;
      
      const widgetOptions = {
        container_id: containerId,
        symbol: `BINANCE:${symbol.toUpperCase()}EUR`,
        interval: "1",
        timezone: "Etc/UTC",
        theme: theme,
        style: "1",
        locale: "en",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        allow_symbol_change: true,
        hide_side_toolbar: false,
        autosize: true,
        studies: [],
        overrides: {
          'mainSeriesProperties.candleStyle.wickUpColor': '#22c55e',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.drawWick': true,
          'mainSeriesProperties.candleStyle.borderUpColor': '#22c55e',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
          'mainSeriesProperties.candleStyle.upColor': '#22c55e',
          'mainSeriesProperties.candleStyle.downColor': '#ef4444',
        },
        disabled_features: [
          'use_localstorage_for_settings',
          'header_symbol_search',
          'header_compare',
          'header_undo_redo',
        ],
        enabled_features: [
          'hide_left_toolbar_by_default',
        ],
        loading_screen: { backgroundColor: theme === 'dark' ? '#1a1a2e' : '#ffffff' },
      };

      const widget = new window.TradingView.widget(widgetOptions);
      widgetRef.current = widget;

      // Simple ready detection
      setTimeout(() => {
        setIsLoading(false);
        if (onChartReady) {
          onChartReady({
            drawStrikePriceLine: () => console.log('Strike line feature coming soon'),
            removeStrikePriceLine: () => {},
            removeAllStrikeLines: () => {},
            getChart: () => widget,
          });
        }
      }, 2000);
      
    } catch (err) {
      console.error('Error initializing TradingView widget:', err);
      setError('Failed to load chart');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const scriptId = 'tradingview-script';
    
    const loadScript = () => {
      if (document.getElementById(scriptId)) {
        initWidget();
        return;
      }

      const script = document.createElement('script');
      script.id = scriptId;
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        setTimeout(initWidget, 100);
      };
      script.onerror = () => {
        setError('Failed to load chart library');
        setIsLoading(false);
      };
      document.head.appendChild(script);
    };

    loadScript();

    return () => {
      if (widgetRef.current) {
        try {
          if (widgetRef.current.remove) {
            widgetRef.current.remove();
          }
          widgetRef.current = null;
        } catch (e) {
          console.error('Error removing widget:', e);
        }
      }
    };
  }, [symbol, theme]);

  useEffect(() => {
    if (widgetRef.current && widgetRef.current.setSymbol) {
      widgetRef.current.setSymbol(`BINANCE:${symbol.toUpperCase()}EUR`);
    }
  }, [symbol]);

  return (
    <div className="relative w-full h-[500px] lg:h-[550px] bg-background rounded-lg overflow-hidden">
      {isLoading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading chart...</p>
          <p className="text-xs text-muted-foreground mt-1">Loading {symbol}/EUR data</p>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 z-10">
          <div className="text-red-500 mb-3 text-lg">⚠️</div>
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(true);
              widgetRef.current = null;
              initWidget();
            }}
            className="mt-3 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full" style={{ minHeight: '400px' }} />
    </div>
  );
};