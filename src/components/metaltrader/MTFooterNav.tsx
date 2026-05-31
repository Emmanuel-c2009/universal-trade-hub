import { useState } from "react";
import { cn } from "@/lib/utils";
import { BarChart3, LineChart, TrendingUp, History, MessageSquare } from "lucide-react";

export type MTFooterTab = 'quotes' | 'charts' | 'trade' | 'history' | 'messages';

interface MTFooterNavProps {
  activeTab: MTFooterTab;
  onTabChange: (tab: MTFooterTab) => void;
  unreadMessages?: number;
}

export const MTFooterNav = ({ activeTab, onTabChange, unreadMessages = 0 }: MTFooterNavProps) => {
  const tabs = [
    { id: 'quotes' as MTFooterTab, icon: BarChart3, label: 'Quotes' },
    { id: 'charts' as MTFooterTab, icon: LineChart, label: 'Charts' },
    { id: 'trade' as MTFooterTab, icon: TrendingUp, label: 'Trade' },
    { id: 'history' as MTFooterTab, icon: History, label: 'History' },
    { id: 'messages' as MTFooterTab, icon: MessageSquare, label: 'Messages', badge: unreadMessages },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-[#1e1f22] border-t border-gray-200 dark:border-[#3c3f45] z-50 lg:hidden">
      <div className="flex items-center justify-around py-2">
        {tabs.map(({ id, icon: Icon, label, badge }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center gap-1 px-4 py-1 rounded-lg transition-colors relative",
              activeTab === id
                ? "text-secondary"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px]">{label}</span>
            {badge && badge > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full">
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
