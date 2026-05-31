import { useState, useEffect } from "react";
import { Outlet, useNavigate, Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users,
  Bot,
  Receipt,
  Settings,
  LayoutDashboard,
  Shield,
  ShieldCheck,
  Menu,
  X,
  LogOut,
  ChevronDown,
  DollarSign,
  Banknote,
  FileText,
  Link as LinkIcon,
  RefreshCw,
  Wallet,
  Coins,
  Copy,
  Flag,
  Megaphone,
  Building2,
  Send,
  Gift, // ✅ ADD THIS for Referrals icon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AdminNotificationBadge } from "@/components/admin/AdminNotificationBadge";
import logo from "@/assets/logo.png";

const adminMenuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/admin",
  },
  {
    title: "User Management",
    icon: Users,
    path: "/admin/users",
  },
  {
    title: "Deposits",
    icon: DollarSign,
    path: "/admin/deposits",
  },
  {
    title: "Withdrawals",
    icon: Banknote,
    path: "/admin/withdrawals",
  },
  {
    title: "Bank Management",
    icon: Building2,
    path: "/admin/banks",
  },
  {
    title: "AI Bots",
    icon: Bot,
    path: "/admin/bots",
  },
  {
    title: "Transactions",
    icon: Receipt,
    path: "/admin/transactions",
  },
  {
    title: "P2P Marketplace",
    icon: RefreshCw,
    path: "/admin/p2p",
  },
  {
    title: "Account Verification",
    icon: ShieldCheck,
    path: "/admin/verification",
  },
  {
    title: "Documents Vault",
    icon: FileText,
    path: "/admin/documents",
  },
  {
    title: "Feature Management",
    icon: Flag,
    path: "/admin/features",
  },
  {
    title: "Blockchain Settings",
    icon: LinkIcon,
    path: "/admin/blockchain",
  },
  {
    title: "Crypto Management",
    icon: Coins,
    path: "/admin/crypto",
  },
  {
    title: "Copy Trading Engine",
    icon: Copy,
    path: "/admin/copy-trading",
  },
  {
    title: "MT5 Configuration",
    icon: Settings,
    path: "/admin/mt5-config",
  },
  {
    title: "Balance Management",
    icon: Wallet,
    path: "/admin/balances",
  },
  {
    title: "Referral System", // ✅ ADD THIS NEW MENU ITEM
    icon: Gift,
    path: "/admin/referrals",
  },
  {
    title: "Announcements",
    icon: Megaphone,
    path: "/admin/announcements",
  },
  {
    title: "Communications",
    icon: Send,
    path: "/admin/communications",
  },
  {
    title: "System Settings",
    icon: Settings,
    path: "/admin/settings",
  },
];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          navigate("/auth");
          return;
        }
        
        setUserEmail(user.email || "");
        
        // Check if user is admin (by email or by role)
        const adminEmail = "universalstocktrade24@gmail.com";
        const isUserAdmin = user.email === adminEmail;
        
        if (!isUserAdmin) {
          toast({
            title: "Access Denied",
            description: "You do not have admin privileges.",
            variant: "destructive",
          });
          navigate("/dashboard");
          return;
        }
        
        setIsAdmin(true);
      } catch (error) {
        console.error("Admin check error:", error);
        navigate("/auth");
      } finally {
        setLoading(false);
      }
    };
    
    checkAdmin();
  }, [navigate, toast]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 80 }}
        className="fixed left-0 top-0 h-full bg-card border-r border-border z-40 hidden md:flex flex-col"
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-center border-b border-border px-4">
          <img src={logo} alt="Logo" className="h-10" />
          {sidebarOpen && (
            <span className="ml-2 font-bold text-foreground">Admin</span>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {adminMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-secondary/20 text-secondary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute -right-3 top-20 bg-card border border-border rounded-full"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${sidebarOpen ? 'rotate-90' : '-rotate-90'}`} />
        </Button>

        {/* User Section */}
        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                <Shield className="w-5 h-5" />
              </AvatarFallback>
            </Avatar>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{userEmail}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            )}
            {sidebarOpen && <AdminNotificationBadge />}
          </div>
          {sidebarOpen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="w-full mt-2 justify-start"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          )}
        </div>
      </motion.aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card border-b border-border z-30 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
          <img src={logo} alt="Logo" className="h-8" />
        </div>
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            <Shield className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <motion.aside
        initial={{ x: -280 }}
        animate={{ x: sidebarOpen ? 0 : -280 }}
        className="md:hidden fixed left-0 top-16 h-[calc(100%-4rem)] w-72 bg-card border-r border-border z-40 overflow-y-auto"
      >
        <nav className="py-4">
          {adminMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-secondary/20 text-secondary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.title}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
            className="w-full justify-start"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`flex-1 min-h-screen pt-16 md:pt-0 transition-all ${sidebarOpen ? 'md:ml-[280px]' : 'md:ml-20'}`}>
        <Outlet />
      </main>
    </div>
  );
};