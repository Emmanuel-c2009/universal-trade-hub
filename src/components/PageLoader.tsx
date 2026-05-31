import { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PageLoaderProps {
  loading: boolean;
  timeout?: number;
  onRetry?: () => void;
  children: React.ReactNode;
}

export const PageLoader = ({ loading, timeout = 5000, onRetry, children }: PageLoaderProps) => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading) {
      setTimedOut(false);
      return;
    }
    const timer = setTimeout(() => setTimedOut(true), timeout);
    return () => clearTimeout(timer);
  }, [loading, timeout]);

  const handleRetry = useCallback(() => {
    setTimedOut(false);
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  }, [onRetry]);

  if (!loading) return <>{children}</>;

  if (timedOut) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Loading timed out</h2>
          <p className="text-sm text-muted-foreground">The page took too long to load. Please try again.</p>
          <Button onClick={handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" /> Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-secondary" />
    </div>
  );
};