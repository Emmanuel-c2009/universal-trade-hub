import { cn } from '@/lib/utils';

interface DataSourceBadgeProps {
  source: 'coingecko' | 'alphavantage' | 'yahoo' | 'websocket' | 'binance';
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

export const DataSourceBadge = ({ source, size = 'sm', showLabel = false }: DataSourceBadgeProps) => {
  const config = {
    coingecko: {
      color: 'bg-green-500',
      label: 'CoinGecko',
      shortLabel: 'CG'
    },
    alphavantage: {
      color: 'bg-blue-500',
      label: 'Alpha Vantage',
      shortLabel: 'AV'
    },
    yahoo: {
      color: 'bg-purple-500',
      label: 'Yahoo Finance',
      shortLabel: 'YF'
    },
    websocket: {
      color: 'bg-emerald-500',
      label: 'Live',
      shortLabel: 'WS'
    },
    binance: {
      color: 'bg-yellow-500',
      label: 'Binance',
      shortLabel: 'BN'
    }
  };

  const { color, label, shortLabel } = config[source];

  return (
    <div className="flex items-center gap-1">
      <div 
        className={cn(
          'rounded-full',
          color,
          size === 'sm' ? 'w-2 h-2' : 'w-3 h-3'
        )}
        title={label}
      />
      {showLabel && (
        <span className={cn(
          'text-muted-foreground',
          size === 'sm' ? 'text-[10px]' : 'text-xs'
        )}>
          {shortLabel}
        </span>
      )}
    </div>
  );
};
