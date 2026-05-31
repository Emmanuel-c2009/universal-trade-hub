// src/components/trading/TradeTimer.tsx

import { useState, useEffect, useCallback } from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TradeTimerProps {
  expiryTime: string | null;
  onExpire?: () => void;
  onExtend?: (minutes: number) => void;
  isExpiringSoon?: boolean;
}

export const TradeTimer = ({ expiryTime, onExpire, onExtend, isExpiringSoon }: TradeTimerProps) => {
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);
  const [showExtend, setShowExtend] = useState(false);

  const calculateTimeRemaining = useCallback(() => {
    if (!expiryTime) return 0;
    const remaining = new Date(expiryTime).getTime() - Date.now();
    return Math.max(0, remaining);
  }, [expiryTime]);

  const formatTime = (ms: number): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getProgressPercentage = (): number => {
    if (!expiryTime) return 0;
    const total = 30 * 60 * 1000; // Assume 30 minutes default
    const remaining = timeRemaining;
    return Math.max(0, Math.min(100, (remaining / total) * 100));
  };

  const getStatusColor = (): string => {
    if (isExpired) return 'text-red-500';
    if (isExpiringSoon || timeRemaining < 5 * 60 * 1000) return 'text-yellow-500';
    return 'text-green-500';
  };

  useEffect(() => {
    if (!expiryTime) return;

    const updateTimer = () => {
      const remaining = calculateTimeRemaining();
      setTimeRemaining(remaining);
      
      if (remaining <= 0 && !isExpired) {
        setIsExpired(true);
        if (onExpire) onExpire();
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [expiryTime, calculateTimeRemaining, onExpire, isExpired]);

  if (!expiryTime) return null;

  const progress = getProgressPercentage();
  const isWarning = timeRemaining < 5 * 60 * 1000 && timeRemaining > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Clock className={`h-4 w-4 ${getStatusColor()}`} />
          <span className="font-mono font-medium">
            {isExpired ? 'Expired' : formatTime(timeRemaining)}
          </span>
        </div>
        
        {!isExpired && onExtend && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-xs"
            onClick={() => setShowExtend(!showExtend)}
          >
            Extend
          </Button>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-1000 ${
            isWarning ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Extend options */}
      {showExtend && onExtend && !isExpired && (
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onExtend(5)}>
            +5 min
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onExtend(15)}>
            +15 min
          </Button>
          <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => onExtend(30)}>
            +30 min
          </Button>
          <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setShowExtend(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Warning badge */}
      {isWarning && !isExpired && (
        <Badge variant="outline" className="text-yellow-500 border-yellow-500 text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Expiring soon
        </Badge>
      )}
    </div>
  );
};