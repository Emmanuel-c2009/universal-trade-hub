import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Bell, TrendingUp, AlertCircle, Newspaper, CheckCheck, Trash2 } from "lucide-react";

export interface MTMessage {
  id: string;
  type: 'trade' | 'order' | 'system' | 'news' | 'alert';
  content: string;
  timestamp: Date;
  unread: boolean;
  important?: boolean;
  action?: {
    type: 'trade' | 'order';
    id: string;
  };
}

interface MTMessagesProps {
  messages: MTMessage[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onMessageClick: (message: MTMessage) => void;
}

export const MTMessages = ({ messages, onMarkAllRead, onClearAll, onMessageClick }: MTMessagesProps) => {
  const [filter, setFilter] = useState<'all' | 'trade' | 'order' | 'system' | 'news'>('all');

  const filteredMessages = messages.filter(msg => 
    filter === 'all' || msg.type === filter
  );

  const unreadCount = messages.filter(m => m.unread).length;

  const getMessageIcon = (type: MTMessage['type']) => {
    switch (type) {
      case 'trade': return TrendingUp;
      case 'order': return Bell;
      case 'news': return Newspaper;
      case 'alert': return AlertCircle;
      default: return Bell;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="h-full bg-[#2d2e33] border border-[#3c3f45] rounded flex flex-col">
      {/* Header */}
      <div className="p-2 border-b border-[#3c3f45] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-white">System Messages</h3>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-gray-400 hover:text-white"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="w-3 h-3 mr-1" />
            Mark Read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] text-gray-400 hover:text-red-400"
            onClick={onClearAll}
          >
            <Trash2 className="w-3 h-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 p-2 border-b border-[#3c3f45] overflow-x-auto">
        {['all', 'trade', 'order', 'system', 'news'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f as typeof filter)}
            className={cn(
              "px-2 py-1 text-[10px] rounded transition-colors whitespace-nowrap",
              filter === f
                ? "bg-secondary text-secondary-foreground"
                : "text-gray-400 hover:text-white hover:bg-[#3c3f45]"
            )}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-auto">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 text-xs">
            <Bell className="w-8 h-8 mb-2 opacity-50" />
            <p>No messages</p>
          </div>
        ) : (
          <div className="divide-y divide-[#3c3f45]">
            {filteredMessages.map((msg) => {
              const Icon = getMessageIcon(msg.type);
              return (
                <div
                  key={msg.id}
                  onClick={() => onMessageClick(msg)}
                  className={cn(
                    "p-2 cursor-pointer transition-colors",
                    msg.unread ? "bg-[#363739]" : "hover:bg-[#363739]"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className={cn(
                      "p-1 rounded",
                      msg.type === 'trade' ? "bg-green-500/20" :
                      msg.type === 'order' ? "bg-blue-500/20" :
                      msg.type === 'alert' ? "bg-red-500/20" :
                      msg.type === 'news' ? "bg-purple-500/20" :
                      "bg-gray-500/20"
                    )}>
                      <Icon className={cn(
                        "w-3 h-3",
                        msg.type === 'trade' ? "text-green-500" :
                        msg.type === 'order' ? "text-blue-500" :
                        msg.type === 'alert' ? "text-red-500" :
                        msg.type === 'news' ? "text-purple-500" :
                        "text-gray-500"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <span className={cn(
                          "text-[10px] uppercase",
                          msg.type === 'trade' ? "text-green-500" :
                          msg.type === 'order' ? "text-blue-500" :
                          msg.type === 'alert' ? "text-red-500" :
                          msg.type === 'news' ? "text-purple-500" :
                          "text-gray-500"
                        )}>
                          {msg.type}
                        </span>
                        <span className="text-[9px] text-gray-500">{formatTime(msg.timestamp)}</span>
                      </div>
                      <p className="text-[11px] text-white leading-tight">{msg.content}</p>
                      {msg.important && (
                        <span className="inline-block mt-1 text-[9px] text-red-400">⚠️ Important</span>
                      )}
                    </div>
                    {msg.unread && (
                      <div className="w-2 h-2 rounded-full bg-secondary flex-shrink-0" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
