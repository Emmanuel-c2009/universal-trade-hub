import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Calendar, Newspaper, History } from "lucide-react";

interface MTTradeHistoryProps {
  history: any[];
}

export const MTTradeHistory = ({ history }: MTTradeHistoryProps) => {
  const [activeTab, setActiveTab] = useState("history");

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="h-full bg-[#2d2e33] flex flex-col">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start h-8 bg-[#1e1f22] rounded-none border-b border-[#3c3f45]">
          <TabsTrigger value="history" className="text-xs h-7 gap-1">
            <History className="w-3 h-3" />
            Trade History
          </TabsTrigger>
          <TabsTrigger value="calendar" className="text-xs h-7 gap-1">
            <Calendar className="w-3 h-3" />
            Economic Calendar
          </TabsTrigger>
          <TabsTrigger value="news" className="text-xs h-7 gap-1">
            <Newspaper className="w-3 h-3" />
            News
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="flex-1 overflow-auto m-0 p-0">
          {history.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500 text-xs">
              No trade history yet
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-[#1e1f22] sticky top-0">
                <tr className="text-gray-400 text-left">
                  <th className="p-2">Time</th>
                  <th className="p-2">Symbol</th>
                  <th className="p-2">Type</th>
                  <th className="p-2">Volume</th>
                  <th className="p-2">Open Price</th>
                  <th className="p-2">Close Price</th>
                  <th className="p-2">P/L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#3c3f45]">
                {history.map((trade, idx) => (
                  <tr key={idx} className="hover:bg-[#363739]">
                    <td className="p-2 text-gray-400">{formatTime(trade.closeTime)}</td>
                    <td className="p-2 text-white font-medium">{trade.symbol}</td>
                    <td className="p-2">
                      <span className={cn(
                        "flex items-center gap-1",
                        trade.type === 'buy' ? "text-green-500" : "text-red-500"
                      )}>
                        {trade.type === 'buy' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {trade.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-2 text-white">{trade.volume}</td>
                    <td className="p-2 text-white font-mono">{trade.openPrice.toFixed(2)}</td>
                    <td className="p-2 text-white font-mono">{trade.closePrice.toFixed(2)}</td>
                    <td className={cn(
                      "p-2 font-mono",
                      trade.pnl >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {trade.pnl >= 0 ? '+' : ''}€{trade.pnl.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="flex-1 m-0 p-4">
          <div className="space-y-3">
            <div className="text-xs text-gray-400 mb-2">Today's Economic Events</div>
            {[
              { time: '08:30', event: 'US Non-Farm Payrolls', impact: 'high', actual: '256K', forecast: '160K' },
              { time: '10:00', event: 'US ISM Manufacturing PMI', impact: 'medium', actual: '-', forecast: '48.4' },
              { time: '14:00', event: 'Fed Chair Powell Speaks', impact: 'high', actual: '-', forecast: '-' },
              { time: '15:30', event: 'Crude Oil Inventories', impact: 'medium', actual: '-', forecast: '-1.2M' },
            ].map((event, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 bg-[#1e1f22] rounded text-xs">
                <span className="text-gray-400 w-12">{event.time}</span>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  event.impact === 'high' ? "bg-red-500" : "bg-yellow-500"
                )} />
                <span className="flex-1 text-white">{event.event}</span>
                <span className="text-gray-400">Forecast: {event.forecast}</span>
                {event.actual !== '-' && (
                  <span className="text-green-500">Actual: {event.actual}</span>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="news" className="flex-1 m-0 p-4 overflow-auto">
          <div className="space-y-3">
            {[
              { time: '5 min ago', title: 'Gold prices surge as Fed signals potential rate cuts', source: 'Reuters' },
              { time: '15 min ago', title: 'US Dollar weakens against major currencies after jobs data', source: 'Bloomberg' },
              { time: '32 min ago', title: 'Silver follows gold higher, breaks key resistance level', source: 'MarketWatch' },
              { time: '1 hour ago', title: 'Oil prices stabilize amid Middle East tensions', source: 'CNBC' },
              { time: '2 hours ago', title: 'Euro gains as ECB maintains hawkish stance', source: 'Financial Times' },
            ].map((news, idx) => (
              <div key={idx} className="p-2 bg-[#1e1f22] rounded hover:bg-[#363739] cursor-pointer">
                <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                  <span>{news.source}</span>
                  <span>{news.time}</span>
                </div>
                <p className="text-xs text-white">{news.title}</p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
