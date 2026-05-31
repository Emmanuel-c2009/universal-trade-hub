import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useFeatureFlags } from "@/hooks/useFeatureFlags";
import {
  LayoutDashboard,
  User,
  FileText,
  TrendingUp,
  Zap,
  BarChart3,
  Users,
  Bot,
  Building2,
  Bitcoin,
  RefreshCw,
  Target,
  Gamepad2,
  Wallet,
  ArrowDownCircle,
  ArrowRightCircle,
  ArrowUpCircle,
  CreditCard,
  Package,
  Rocket,
  MessageSquare,
  Settings,
  LogOut,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  Gift,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarNav = ({ isOpen, onClose }: SidebarNavProps) => {
  const location = useLocation();
  const [expandedSections, setExpandedSections] = useState<string[]>(["trading"]);
  const { isFeatureVisible, isComingSoon, getComingSoonMessage } = useFeatureFlags();

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const menuItems = [
    {
      title: "Dashboard",
      icon: LayoutDashboard,
      items: [
        { label: "Account Overview", icon: User, path: "/dashboard" },
        { label: "Transaction History", icon: FileText, path: "/transactions" },
      ],
    },
    {
      title: "Trading",
      icon: TrendingUp,
      section: "trading",
      items: [
        { label: "Execute Trade", icon: Zap, hasSubmenu: true },
        { label: "Metal Trader", icon: BarChart3, path: "/metal-trader", indent: true },
        { label: "Quick Trade (QT)", icon: Zap, path: "/quick-trade", indent: true },
        { label: "Copy Trading", icon: Users, path: "/copy-trading", indent: true },
        { label: "AI Bot Trading", icon: Bot, path: "/ai-bot-trading", indent: true },
        { label: "Stock Investments", icon: Building2, path: "/trading", indent: true, featureFlag: "stock_investment" },
        { label: "Cryptocurrency Trading", icon: Bitcoin, path: "/trading", indent: true },
        { label: "Swap Coins", icon: RefreshCw, path: "/swap", featureFlag: "swap_coin" },
        { label: "Challenge Account", icon: Target, path: "/challenge", featureFlag: "challenge_account" },
        { label: "Demo Trading", icon: Gamepad2, path: "/trading/demo", featureFlag: "demo_trading" },
      ],
    },
    {
      title: "Markets",
      icon: TrendingUp,
      items: [
        { label: "Markets Overview", icon: TrendingUp, path: "/markets" },
      ],
    },
    {
      title: "Portfolio",
      icon: Wallet,
      items: [
        { label: "Portfolio Overview", icon: Wallet, path: "/portfolio" },
      ],
    },
    {
      title: "Wallet & Funds",
      icon: Wallet,
      items: [
        { label: "Deposit Funds", icon: ArrowDownCircle, path: "/deposit" },
        { label: "Send Asset", icon: ArrowRightCircle, path: "/send-asset" },
        { label: "Withdraw Funds", icon: ArrowUpCircle, path: "/withdraw" },
      ],
    },
    {
      title: "Cards",
      icon: CreditCard,
      items: [
        { label: "My Card", icon: CreditCard, path: "/my-card" },
        { label: "Request Physical Card", icon: Package, path: "/request-card" },
      ],
    },
    {
      title: "Investment",
      icon: Rocket,
      items: [{ label: "Upgrade Investment", icon: Rocket, path: "/investment-upgrade" }],
    },
    {
      title: "Communication",
      icon: MessageSquare,
      items: [{ label: "Message Center", icon: MessageSquare, path: "/messages" }],
    },
    {
      title: "Referrals",
      icon: Gift,
      items: [{ label: "Referral Program", icon: Gift, path: "/dashboard/referrals" }],
    },
    {
      title: "Settings & Account",
      icon: Settings,
      items: [
        { label: "Profile", icon: User, path: "/profile" },
        { label: "Account Settings", icon: Settings, path: "/settings" },
        { label: "Logout", icon: LogOut, path: "/logout", action: true },
      ],
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />

          {/* Sidebar */}
          <motion.aside
            initial={{ x: -320 }}
            animate={{ x: 0 }}
            exit={{ x: -320 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-background border-r border-border z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-bold">Menu</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Menu Items */}
            <nav className="p-4 space-y-2">
              {menuItems.map((section, sectionIndex) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: sectionIndex * 0.05 }}
                >
                  {section.section ? (
                    <div>
                      <button
                        onClick={() => toggleSection(section.section)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <section.icon className="w-5 h-5 text-secondary" />
                          <span className="font-medium">{section.title}</span>
                        </div>
                        {expandedSections.includes(section.section) ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      <AnimatePresence>
                        {expandedSections.includes(section.section) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            {section.items.filter((item) => {
                              if ((item as any).featureFlag && !isFeatureVisible((item as any).featureFlag)) return false;
                              return true;
                            }).map((item, itemIndex) => {
                              const flagged = (item as any).featureFlag;
                              const comingSoon = flagged && isComingSoon(flagged);
                              return (
                              <motion.div
                                key={item.label}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: itemIndex * 0.03 }}
                              >
                                {item.path ? (
                                  <Link
                                    to={item.path}
                                    onClick={onClose}
                                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                      (item as any).indent ? "pl-12" : "pl-6"
                                    } ${
                                      location.pathname === item.path
                                        ? "bg-secondary/20 text-secondary"
                                        : "hover:bg-muted"
                                    } ${comingSoon ? "opacity-60" : ""}`}
                                  >
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-sm">{item.label}</span>
                                    {comingSoon && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto"><Clock className="w-3 h-3 mr-0.5" />Soon</Badge>}
                                  </Link>
                                ) : (
                                  <div className="flex items-center gap-3 p-3 pl-6 text-muted-foreground">
                                    <item.icon className="w-4 h-4" />
                                    <span className="text-sm">{item.label}</span>
                                  </div>
                                )}
                              </motion.div>
                              );
                            })}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center gap-3 p-3 text-muted-foreground">
                        <section.icon className="w-5 h-5 text-secondary" />
                        <span className="font-medium">{section.title}</span>
                      </div>
                      {section.items.map((item, itemIndex) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: itemIndex * 0.03 }}
                        >
                          <Link
                            to={item.path}
                            onClick={onClose}
                            className={`flex items-center gap-3 p-3 pl-12 rounded-lg transition-colors ${
                              location.pathname === item.path
                                ? "bg-secondary/20 text-secondary"
                                : "hover:bg-muted"
                            }`}
                          >
                            <item.icon className="w-4 h-4" />
                            <span className="text-sm">{item.label}</span>
                          </Link>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};