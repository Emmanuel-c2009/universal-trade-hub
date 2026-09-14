import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Wallet, PieChart, User } from "lucide-react";
import { useTranslation } from "react-i18next";

export const BottomNav = () => {
  const location = useLocation();
  const { t } = useTranslation();

  const navItems = [
    { id: "home", label: t("bottom_nav.home"), icon: Home, path: "/dashboard", color: "text-blue-500" },
    { id: "markets", label: t("bottom_nav.markets"), icon: TrendingUp, path: "/markets", color: "text-green-500" },
    { id: "trading", label: t("bottom_nav.trading"), icon: Wallet, path: "/quick-trade", color: "text-amber-500" },
    { id: "portfolio", label: t("bottom_nav.portfolio"), icon: PieChart, path: "/portfolio", color: "text-purple-500" },
    { id: "profile", label: t("bottom_nav.profile"), icon: User, path: "/profile", color: "text-secondary" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-t border-border lg:hidden">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.id}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 ${
                isActive ? item.color : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <item.icon className={`w-6 h-6 transition-transform ${isActive ? "scale-110" : ""}`} />
              <span className="text-xs font-medium">{item.label}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-gradient-to-r from-secondary to-gold rounded-t-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
