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
import { useTranslation } from "react-i18next";

interface SidebarNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SidebarNav = ({ isOpen, onClose }: SidebarNavProps) => {
  const location = useLocation();
  const { t } = useTranslation();
  const [expandedSections, setExpandedSections] = useState<string[]>(["trading"]);
  const { isFeatureVisible, isComingSoon, getComingSoonMessage } = useFeatureFlags();

  const toggleSection = (section: string) => {
    setExpandedSections((prev) =>
      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
    );
  };

  const menuItems = [
    {
      id: "dashboard",
      title: t("sidebar.section_dashboard"),
      icon: LayoutDashboard,
      items: [
        { id: "account_overview", label: t("sidebar.account_overview"), icon: User, path: "/dashboard" },
        { id: "transaction_history", label: t("sidebar.transaction_history"), icon: FileText, path: "/transactions" },
      ],
    },
    {
      id: "trading",
      title: t("sidebar.section_trading"),
      icon: TrendingUp,
      section: "trading",
      items: [
        { id: "execute_trade", label: t("sidebar.execute_trade"), icon: Zap, hasSubmenu: true },
        { id: "metal_trader", label: t("sidebar.metal_trader"), icon: BarChart3, path: "/metal-trader", indent: true },
        { id: "quick_trade", label: t("sidebar.quick_trade"), icon: Zap, path: "/quick-trade", indent: true },
        { id: "copy_trading", label: t("sidebar.copy_trading"), icon: Users, path: "/copy-trading", indent: true },
        { id: "ai_bot_trading", label: t("sidebar.ai_bot_trading"), icon: Bot, path: "/ai-bot-trading", indent: true },
        { id: "stock_investments", label: t("sidebar.stock_investments"), icon: Building2, path: "/trading", indent: true, featureFlag: "stock_investment" },
        { id: "crypto_trading", label: t("sidebar.crypto_trading"), icon: Bitcoin, path: "/trading", indent: true },
        { id: "swap_coins", label: t("sidebar.swap_coins"), icon: RefreshCw, path: "/swap", featureFlag: "swap_coin" },
        { id: "challenge_account", label: t("sidebar.challenge_account"), icon: Target, path: "/challenge", featureFlag: "challenge_account" },
        { id: "demo_trading", label: t("sidebar.demo_trading"), icon: Gamepad2, path: "/trading/demo", featureFlag: "demo_trading" },
      ],
    },
    {
      id: "markets",
      title: t("sidebar.section_markets"),
      icon: TrendingUp,
      items: [
        { id: "markets_overview", label: t("sidebar.markets_overview"), icon: TrendingUp, path: "/markets" },
      ],
    },
    {
      id: "portfolio",
      title: t("sidebar.section_portfolio"),
      icon: Wallet,
      items: [
        { id: "portfolio_overview", label: t("sidebar.portfolio_overview"), icon: Wallet, path: "/portfolio" },
      ],
    },
    {
      id: "wallet",
      title: t("sidebar.section_wallet"),
      icon: Wallet,
      items: [
        { id: "deposit_funds", label: t("sidebar.deposit_funds"), icon: ArrowDownCircle, path: "/deposit" },
        { id: "send_asset", label: t("sidebar.send_asset"), icon: ArrowRightCircle, path: "/send-asset" },
        { id: "withdraw_funds", label: t("sidebar.withdraw_funds"), icon: ArrowUpCircle, path: "/withdraw" },
      ],
    },
    {
      id: "cards",
      title: t("sidebar.section_cards"),
      icon: CreditCard,
      items: [
        { id: "my_card", label: t("sidebar.my_card"), icon: CreditCard, path: "/my-card" },
        { id: "request_card", label: t("sidebar.request_card"), icon: Package, path: "/request-card" },
      ],
    },
    {
      id: "investment",
      title: t("sidebar.section_investment"),
      icon: Rocket,
      items: [{ id: "upgrade_investment", label: t("sidebar.upgrade_investment"), icon: Rocket, path: "/investment-upgrade" }],
    },
    {
      id: "communication",
      title: t("sidebar.section_communication"),
      icon: MessageSquare,
      items: [{ id: "message_center", label: t("sidebar.message_center"), icon: MessageSquare, path: "/messages" }],
    },
    {
      id: "referrals",
      title: t("sidebar.section_referrals"),
      icon: Gift,
      items: [{ id: "referral_program", label: t("sidebar.referral_program"), icon: Gift, path: "/dashboard/referrals" }],
    },
    {
      id: "settings",
      title: t("sidebar.section_settings"),
      icon: Settings,
      items: [
        { id: "profile", label: t("sidebar.profile"), icon: User, path: "/profile" },
        { id: "account_settings", label: t("sidebar.account_settings"), icon: Settings, path: "/settings" },
        { id: "logout", label: t("sidebar.logout"), icon: LogOut, path: "/logout", action: true },
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
              <h2 className="text-lg font-bold">{t("sidebar.menu")}</h2>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Menu Items */}
            <nav className="p-4 space-y-2">
              {menuItems.map((section, sectionIndex) => (
                <motion.div
                  key={section.id}
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
                                key={item.id}
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
                                    {comingSoon && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-auto"><Clock className="w-3 h-3 mr-0.5" />{t("sidebar.soon")}</Badge>}
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
                          key={item.id}
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
