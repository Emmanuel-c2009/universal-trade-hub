import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, TrendingUp, TrendingDown, StopCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CopySession } from "@/pages/CopyTrading";

interface ActiveSessionsProps {
  sessions: CopySession[];
  onStopSession: (sessionId: string) => void;
}

export const ActiveSessions = ({ sessions, onStopSession }: ActiveSessionsProps) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [timers, setTimers] = useState<Record<string, string>>({});

  const activeSessions = sessions.filter((s) => s.status === "active");

  useEffect(() => {
    const interval = setInterval(() => {
      const newTimers: Record<string, string> = {};
      activeSessions.forEach((session) => {
        const endTime = new Date(session.startTime.getTime() + session.duration * 60 * 60 * 1000);
        const remaining = endTime.getTime() - Date.now();
        
        if (remaining <= 0) {
          newTimers[session.id] = "Completed";
        } else {
          const hours = Math.floor(remaining / (1000 * 60 * 60));
          const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
          newTimers[session.id] = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
        }
      });
      setTimers(newTimers);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeSessions]);

  if (activeSessions.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-card border border-border rounded-t-xl p-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-semibold">Active Sessions ({activeSessions.length})</h3>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="bg-card border-x border-b border-border rounded-b-xl overflow-hidden">
          {activeSessions.map((session) => (
            <div
              key={session.id}
              className="p-4 border-b border-border last:border-b-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center">
                  {session.currentProfit >= 0 ? (
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-5 h-5 text-red-400" />
                  )}
                </div>
                <div>
                  <h4 className="font-medium">{session.expertName}</h4>
                  <p className="text-sm text-muted-foreground">
                    Investment: €{session.investment.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="font-mono text-sm">
                    {timers[session.id] || "Loading..."}
                  </span>
                </div>

                <div className={`font-bold ${session.currentProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {session.currentProfit >= 0 ? "+" : ""}€{session.currentProfit.toFixed(2)}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  className="border-destructive/50 text-destructive hover:bg-destructive/10"
                  onClick={() => onStopSession(session.id)}
                >
                  <StopCircle className="w-4 h-4 mr-1" />
                  Stop
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
};
