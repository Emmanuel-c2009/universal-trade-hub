// src/components/trading/ConnectionStatus.tsx

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { enhancedPriceService } from '@/services/enhancedPriceService';

interface ConnectionStatusProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export const ConnectionStatus = ({ onConnectionChange }: ConnectionStatusProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    const unsubscribe = enhancedPriceService.subscribeToConnection((connected, attempt) => {
      setIsConnected(connected);
      setReconnectAttempt(attempt);
      setIsReconnecting(attempt > 0 && !connected);
      if (onConnectionChange) {
        onConnectionChange(connected);
      }
    });

    return () => unsubscribe();
  }, [onConnectionChange]);

  const getStatusText = () => {
    if (isConnected) return 'Live';
    if (isReconnecting) return `Reconnecting (${reconnectAttempt}/10)`;
    return 'Polling Mode';
  };

  const getStatusIcon = () => {
    if (isConnected) return <Wifi className="h-3 w-3" />;
    if (isReconnecting) return <Loader2 className="h-3 w-3 animate-spin" />;
    return <WifiOff className="h-3 w-3" />;
  };

  const getStatusVariant = (): "default" | "secondary" | "destructive" | "outline" => {
    if (isConnected) return "default";
    if (isReconnecting) return "outline";
    return "secondary";
  };

  return (
    <Badge variant={getStatusVariant()} className="flex items-center gap-1">
      {getStatusIcon()}
      <span>{getStatusText()}</span>
    </Badge>
  );
};