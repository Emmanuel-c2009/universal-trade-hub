import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, X, Copy, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface Position {
  id: string;
  symbol: string;
  name: string;
  image: string;
  side: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
  stopLoss?: number;
  takeProfit?: number;
  createdAt: Date;
}

interface ActivePositionsProps {
  positions: Position[];
  onClosePosition: (id: string) => void;
  onDoubleUp?: (position: Position) => void;
  onRollover?: (position: Position) => void;
}

export const ActivePositions = ({ 
  positions, 
  onClosePosition, 
  onDoubleUp,
  onRollover 
}: ActivePositionsProps) => {
  const [sortBy, setSortBy] = useState("pnl");
  const [filter, setFilter] = useState("all");

  const filteredPositions = positions.filter((position) => {
    if (filter === "profitable") return position.pnl > 0;
    if (filter === "losing") return position.pnl < 0;
    return true;
  });

  const sortedPositions = [...filteredPositions].sort((a, b) => {
    if (sortBy === "pnl") return b.pnl - a.pnl;
    if (sortBy === "time") return b.createdAt.getTime() - a.createdAt.getTime();
    if (sortBy === "asset") return a.symbol.localeCompare(b.symbol);
    return 0;
  });

  const calculateSlProgress = (position: Position) => {
    if (!position.stopLoss) return 0;
    const range = Math.abs(position.entryPrice - position.stopLoss);
    const current = Math.abs(position.currentPrice - position.entryPrice);
    return Math.min((current / range) * 100, 100);
  };

  const handleDoubleUp = (position: Position) => {
    if (onDoubleUp) {
      onDoubleUp(position);
    } else {
      toast.info("Double Up: This will open another position of the same size");
    }
  };

  const handleRollover = (position: Position) => {
    if (onRollover) {
      onRollover(position);
    } else {
      toast.info("Rollover: Extends the trade duration");
    }
  };

  // Calculate totals
  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const profitableCount = positions.filter(p => p.pnl > 0).length;
  const losingCount = positions.filter(p => p.pnl < 0).length;

  return (
    <Card className="p-4 bg-card border-border">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-3 bg-muted/30 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">Total Positions</p>
          <p className="text-lg font-semibold">{positions.length}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Profitable</p>
          <p className="text-lg font-semibold text-green-500">{profitableCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Losing</p>
          <p className="text-lg font-semibold text-red-500">{losingCount}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total P&L</p>
          <p className={cn(
            "text-lg font-semibold",
            totalPnl >= 0 ? "text-green-500" : "text-red-500"
          )}>
            {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="text-lg font-semibold">Active Positions ({positions.length})</h3>
        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pnl">Sort by P&L</SelectItem>
              <SelectItem value="time">Sort by Time</SelectItem>
              <SelectItem value="asset">Sort by Asset</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex gap-1">
            {["all", "profitable", "losing"].map((f) => (
              <Button
                key={f}
                variant={filter === f ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(f)}
                className="capitalize"
              >
                {f}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {sortedPositions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <p>No active positions</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Entry</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>P&L</TableHead>
                <TableHead>SL/TP</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPositions.map((position) => {
                const slProgress = calculateSlProgress(position);
                const nearSl = slProgress > 70;

                return (
                  <TableRow
                    key={position.id}
                    className={cn(
                      position.pnl >= 0 ? "bg-green-500/5" : "bg-red-500/5"
                    )}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <img
                          src={position.image}
                          alt={position.symbol}
                          className="w-6 h-6 rounded-full"
                        />
                        <div>
                          <span className="font-medium">{position.symbol.toUpperCase()}</span>
                          <p className="text-xs text-muted-foreground">{position.name}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Badge
                          variant={position.side === "buy" ? "default" : "destructive"}
                          className={cn(
                            "text-xs",
                            position.side === "buy" ? "bg-green-500" : "bg-red-500"
                          )}
                        >
                          {position.side === "buy" ? (
                            <><TrendingUp className="w-3 h-3 mr-1" /> Long</>
                          ) : (
                            <><TrendingDown className="w-3 h-3 mr-1" /> Short</>
                          )}
                        </Badge>
                        <span className="text-sm">{position.quantity.toFixed(6)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      ${position.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span>${position.currentPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span
                          className={cn(
                            "text-xs ml-1",
                            position.pnlPercent >= 0 ? "text-green-500" : "text-red-500"
                          )}
                        >
                          {position.pnlPercent >= 0 ? "↗" : "↘"}
                          {Math.abs(position.pnlPercent).toFixed(2)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "font-medium",
                          position.pnl >= 0 ? "text-green-500" : "text-red-500"
                        )}
                      >
                        {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {position.stopLoss && (
                        <div className="space-y-1">
                          <Progress value={slProgress} className="h-1.5 w-20" />
                          {nearSl && (
                            <div className="flex items-center gap-1 text-amber-500 text-xs">
                              <AlertTriangle className="h-3 w-3" />
                              Near SL
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {/* Double Up Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDoubleUp(position)}
                          className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                          title="Double Up"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        {/* Rollover Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRollover(position)}
                          className="h-7 w-7 text-amber-500 hover:text-amber-600 hover:bg-amber-500/10"
                          title="Rollover"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </Button>
                        {/* Close Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onClosePosition(position.id)}
                          className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          title="Close Position"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Card>
  );
};
