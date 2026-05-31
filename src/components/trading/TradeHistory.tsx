import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { FileText, Tag } from "lucide-react";

export interface Trade {
  id: string;
  symbol: string;
  name: string;
  image: string;
  side: "buy" | "sell";
  quantity: number;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  status: "closed" | "cancelled";
  notes?: string;
  tags?: string[];
  createdAt: Date;
  closedAt: Date;
}

interface TradeHistoryProps {
  trades: Trade[];
  onUpdateTrade: (id: string, updates: { notes?: string; tags?: string[] }) => void;
}

export const TradeHistory = ({ trades, onUpdateTrade }: TradeHistoryProps) => {
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");

  const totalPnl = trades.reduce((sum, trade) => sum + trade.pnl, 0);
  const winningTrades = trades.filter((t) => t.pnl > 0).length;
  const winRate = trades.length > 0 ? (winningTrades / trades.length) * 100 : 0;

  const handleSaveJournal = () => {
    if (selectedTrade) {
      const tags = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
      onUpdateTrade(selectedTrade.id, { notes, tags });
      setSelectedTrade(null);
      setNotes("");
      setTagInput("");
    }
  };

  return (
    <Card className="p-4 bg-card border-border">
      <Tabs defaultValue="history">
        <div className="flex items-center justify-between mb-4">
          <TabsList>
            <TabsTrigger value="history">Trade History</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="history" className="mt-0">
          {trades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No trade history yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Asset</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Entry</TableHead>
                    <TableHead>Exit</TableHead>
                    <TableHead>P&L</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Journal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <img
                            src={trade.image}
                            alt={trade.symbol}
                            className="w-6 h-6 rounded-full"
                          />
                          <span className="font-medium">{trade.symbol.toUpperCase()}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={trade.side === "buy" ? "default" : "destructive"}
                          className={cn(
                            "text-xs",
                            trade.side === "buy" ? "bg-green-500" : "bg-red-500"
                          )}
                        >
                          {trade.side === "buy" ? "Long" : "Short"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        ${trade.entryPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        ${trade.exitPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-medium",
                            trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                          )}
                        >
                          {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                          <span className="text-xs ml-1">
                            ({trade.pnlPercent >= 0 ? "+" : ""}{trade.pnlPercent.toFixed(2)}%)
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(trade.closedAt, "MMM dd, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedTrade(trade);
                                setNotes(trade.notes || "");
                                setTagInput(trade.tags?.join(", ") || "");
                              }}
                            >
                              <FileText className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Trading Journal - {trade.symbol.toUpperCase()}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground">Entry:</span>{" "}
                                  ${trade.entryPrice.toFixed(2)}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Exit:</span>{" "}
                                  ${trade.exitPrice.toFixed(2)}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">P&L:</span>{" "}
                                  <span className={trade.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                                    {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Date:</span>{" "}
                                  {format(trade.closedAt, "MMM dd, yyyy")}
                                </div>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">Notes</label>
                                <Textarea
                                  placeholder="What did you learn from this trade?"
                                  value={notes}
                                  onChange={(e) => setNotes(e.target.value)}
                                  rows={4}
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium flex items-center gap-2">
                                  <Tag className="h-4 w-4" />
                                  Tags (comma separated)
                                </label>
                                <Input
                                  placeholder="breakout, trend, momentum"
                                  value={tagInput}
                                  onChange={(e) => setTagInput(e.target.value)}
                                />
                              </div>

                              <Button onClick={handleSaveJournal} className="w-full">
                                Save Journal Entry
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold">{trades.length}</p>
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className={cn("text-2xl font-bold", totalPnl >= 0 ? "text-green-500" : "text-red-500")}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
              </p>
              <p className="text-sm text-muted-foreground">Total P&L</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-green-500">{winningTrades}</p>
              <p className="text-sm text-muted-foreground">Winning Trades</p>
            </div>
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gold">{winRate.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Win Rate</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
};
