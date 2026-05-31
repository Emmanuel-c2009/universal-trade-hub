import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { WelcomeEmailTrigger } from "@/components/WelcomeEmailTrigger";
import { FloatingChatButton } from "@/components/FloatingChatButton";
import { toast } from "sonner";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Verification from "./pages/Verification";
import Challenge from "./pages/Challenge";
import Trading from "./pages/Trading";
import QuickTrade from "./pages/QuickTrade";
import MetalTrader from "./pages/MetalTrader";
import CopyTrading from "./pages/CopyTrading";
import AIBotTrading from "./pages/AIBotTrading";
import About from "./pages/About";
import Contact from "./pages/Contact";
import NotFound from "./pages/NotFound";
import RequestCard from "./pages/RequestCard";
import MyCard from "./pages/MyCard";
import InvestmentUpgrade from "./pages/InvestmentUpgrade";
import MessageCenter from "./pages/MessageCenter";
import Settings from "./pages/Settings";
import TransactionHistory from "./pages/TransactionHistory";
import DepositFunds from "./pages/DepositFunds";
import DepositHistory from "./pages/DepositHistory";
import SendAsset from "./pages/SendAsset";
import WithdrawFunds from "./pages/WithdrawFunds";
import BlockchainGateway from "./pages/BlockchainGateway";
import WithdrawalHistory from "./pages/WithdrawalHistory";
import BalanceTransfer from "./pages/BalanceTransfer";
import CryptoSwap from "./pages/CryptoSwap";
import Portfolio from "./pages/Portfolio";
import Markets from "./pages/Markets";
import UserMessages from "./pages/UserMessages";
import ReferralDashboard from "./pages/ReferralDashboard";
import Achievements from "./pages/Achievements";

// Admin Routes
import { AdminLayout } from "./pages/admin/AdminLayout";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminBots } from "./pages/admin/AdminBots";
import { AdminTransactions } from "./pages/admin/AdminTransactions";
import { AdminSettings } from "./pages/admin/AdminSettings";
import { AdminDeposits } from "./pages/admin/AdminDeposits";
import { AdminWithdrawals } from "./pages/admin/AdminWithdrawals";
import { AdminP2P } from "./pages/admin/AdminP2P";
import { AdminDocuments } from "./pages/admin/AdminDocuments";
import { AdminBlockchain } from "./pages/admin/AdminBlockchain";
import AdminBalances from "./pages/admin/AdminBalances";
import { AdminCryptoPage } from "./pages/admin/AdminCrypto";
import { AdminCopyTrading } from "./pages/admin/AdminCopyTrading";
import AdminVerification from "./pages/admin/AdminVerification";
import AdminAnnouncements from "./pages/admin/AdminAnnouncements";
import { AdminFeatures } from "./pages/admin/AdminFeatures";
import { AdminMT5Config } from "./pages/admin/AdminMT5Config";
import AdminBanks from "./pages/admin/AdminBanks";
import AdminCommunications from "./pages/admin/AdminCommunications";
import { AdminReferrals } from "./pages/admin/AdminReferrals";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30000,
    },
    mutations: {
      retry: 1,
    },
  },
});

const setupGlobalNotifications = () => {
  if (typeof window !== 'undefined') {
    window.addEventListener('price-service-notification', ((event: CustomEvent) => {
      const { message, type } = event.detail;
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'warning':
          toast.warning(message);
          break;
        default:
          toast.info(message);
      }
    }) as EventListener);
  }
};

const App = () => {
  useEffect(() => {
    if (!document.getElementById('jivo-script')) {
      const script = document.createElement('script');
      script.id = 'jivo-script';
      script.src = '//code.jivosite.com/widget/9QHMIFky9B';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    }

    setupGlobalNotifications();

    const handleOnline = () => {
      toast.success("Connection restored", { duration: 3000 });
    };

    const handleOffline = () => {
      toast.error("Connection lost. Reconnecting...", { duration: 3000 });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            <Sonner 
              position="top-right" 
              richColors 
              closeButton
              duration={4000}
              expand={false}
            />
            <Toaster />
            <WelcomeEmailTrigger />
            <FloatingChatButton />
            <BrowserRouter>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                
                {/* User Dashboard Routes */}
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/challenge" element={<Challenge />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/messages" element={<UserMessages />} />
                <Route path="/dashboard/referrals" element={<ReferralDashboard />} />
                <Route path="/dashboard/achievements" element={<Achievements />} />
                
                {/* Trading Routes */}
                <Route path="/trading" element={<Trading />} />
                <Route path="/quick-trade" element={<QuickTrade />} />
                <Route path="/metal-trader" element={<MetalTrader />} />
                <Route path="/copy-trading" element={<CopyTrading />} />
                <Route path="/ai-bot-trading" element={<AIBotTrading />} />
                <Route path="/markets" element={<Markets />} />
                <Route path="/portfolio" element={<Portfolio />} />
                
                {/* Financial Routes */}
                <Route path="/deposit" element={<DepositFunds />} />
                <Route path="/deposit-history" element={<DepositHistory />} />
                <Route path="/send-asset" element={<SendAsset />} />
                <Route path="/withdraw" element={<WithdrawFunds />} />
                <Route path="/blockchain-gateway" element={<BlockchainGateway />} />
                <Route path="/withdrawal-history" element={<WithdrawalHistory />} />
                <Route path="/transfer" element={<BalanceTransfer />} />
                <Route path="/swap" element={<CryptoSwap />} />
                <Route path="/transactions" element={<TransactionHistory />} />
                <Route path="/message-center" element={<MessageCenter />} />
                
                {/* Card & Investment Routes */}
                <Route path="/request-card" element={<RequestCard />} />
                <Route path="/my-card" element={<MyCard />} />
                <Route path="/investment-upgrade" element={<InvestmentUpgrade />} />
                
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="deposits" element={<AdminDeposits />} />
                  <Route path="withdrawals" element={<AdminWithdrawals />} />
                  <Route path="banks" element={<AdminBanks />} />
                  <Route path="communications" element={<AdminCommunications />} />
                  <Route path="bots" element={<AdminBots />} />
                  <Route path="transactions" element={<AdminTransactions />} />
                  <Route path="p2p" element={<AdminP2P />} />
                  <Route path="documents" element={<AdminDocuments />} />
                  <Route path="blockchain" element={<AdminBlockchain />} />
                  <Route path="crypto" element={<AdminCryptoPage />} />
                  <Route path="copy-trading" element={<AdminCopyTrading />} />
                  <Route path="verification" element={<AdminVerification />} />
                  <Route path="announcements" element={<AdminAnnouncements />} />
                  <Route path="features" element={<AdminFeatures />} />
                  <Route path="mt5-config" element={<AdminMT5Config />} />
                  <Route path="balances" element={<AdminBalances />} />
                  <Route path="referrals" element={<AdminReferrals />} />
                  <Route path="settings" element={<AdminSettings />} />
                </Route>
                
                {/* 404 - Catch all */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;