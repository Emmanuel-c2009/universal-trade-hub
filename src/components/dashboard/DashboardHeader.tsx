import { useState, useEffect } from "react";
import { Menu, Bell, MessageSquare, User as UserIcon, Sun, Moon, LogOut, Shield, Settings, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import logo from "@/assets/logo.png";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/contexts/ThemeContext";
import { useToast } from "@/hooks/use-toast";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { formatDistanceToNow } from "date-fns";

interface DashboardHeaderProps {
  userName?: string;
  onMenuClick: () => void;
  notificationCount?: number;
  messageCount?: number;
  avatarUrl?: string;
  verificationStatus?: string;
  showGreeting?: boolean;
  pageTitle?: string;
}

export const DashboardHeader = ({
  userName = "Trader",
  onMenuClick,
  notificationCount = 0,
  messageCount = 0,
  avatarUrl,
  verificationStatus = "unverified",
  showGreeting = false,
  pageTitle,
}: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  const { isAdmin } = useAdminRole();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    const getEmail = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");
        setUserId(user.id);
      }
    };
    getEmail();
  }, []);

  // Fetch unread message count for tickets
  const fetchUnreadMessageCount = async () => {
    if (!userId) return;
    
    try {
      // Get all tickets for the user
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('id, updated_at, user_last_read_at')
        .eq('user_id', userId)
        .in('status', ['open', 'in_progress']);
      
      if (ticketsError) throw ticketsError;
      
      if (!tickets || tickets.length === 0) {
        setUnreadMessageCount(0);
        return;
      }
      
      let unreadCount = 0;
      
      for (const ticket of tickets) {
        // Get the latest admin reply
        const { data: replies, error: replyError } = await supabase
          .from('ticket_replies')
          .select('created_at')
          .eq('ticket_id', ticket.id)
          .eq('is_admin', true)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (replyError) continue;
        
        if (replies && replies.length > 0) {
          const lastAdminReply = new Date(replies[0].created_at);
          const userLastRead = ticket.user_last_read_at ? new Date(ticket.user_last_read_at) : new Date(ticket.updated_at);
          
          // If admin replied after user last read, it's unread
          if (lastAdminReply > userLastRead) {
            unreadCount++;
          }
        }
      }
      
      setUnreadMessageCount(unreadCount);
    } catch (error) {
      console.error('Error fetching unread messages:', error);
    }
  };

  // Update user_last_read_at when viewing messages page
  const updateUserLastRead = async () => {
    if (!userId) return;
    
    try {
      await supabase
        .from('support_tickets')
        .update({ user_last_read_at: new Date().toISOString() })
        .eq('user_id', userId);
      
      setUnreadMessageCount(0);
    } catch (error) {
      console.error('Error updating last read:', error);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUnreadMessageCount();
      const interval = setInterval(fetchUnreadMessageCount, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const { notifications, unreadCount, markAsRead, markAllRead } = useUserNotifications(userId);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast({ title: "Signed out successfully" });
    navigate("/");
  };

  const handleMessagesClick = () => {
    updateUserLastRead();
    navigate("/messages");
  };

  const getStatusBadge = () => {
    if (verificationStatus === "verified") {
      return (
        <Badge className="bg-emerald-500 text-white flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" /> Verified
        </Badge>
      );
    }
    if (verificationStatus === "pending") {
      return <Badge className="bg-gold text-black">Pending</Badge>;
    }
    return <Badge variant="outline">Not Verified</Badge>;
  };

  const isSuperAdmin = userEmail === "universalstocktrade24@gmail.com";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 bg-background border-b border-border">
      <div className="flex items-center justify-between px-4 h-16">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onMenuClick}>
            <Menu className="w-6 h-6" />
          </Button>
          <img src={logo} alt="Universal Stock Trade" className="h-10 w-auto" />
        </div>

        <div className="flex items-center gap-2">
          {/* Notification Bell with real-time */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-destructive">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-sm">Notifications</h4>
                  {unreadCount > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={markAllRead}>
                      Mark all read
                    </Button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">No notifications</p>
                ) : (
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {notifications.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => {
                          if (!n.is_read) markAsRead(n.id);
                          if (n.link) navigate(n.link);
                        }}
                        className={`p-2 rounded-lg cursor-pointer transition-colors ${
                          n.is_read ? "bg-muted/30" : "bg-muted/70 border-l-2 border-secondary"
                        } hover:bg-muted`}
                      >
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* Message Icon with unread count */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative" 
            onClick={handleMessagesClick}
          >
            <MessageSquare className="w-5 h-5" />
            {unreadMessageCount > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 text-xs bg-[#DA123E]">
                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
              </Badge>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback>
                    <UserIcon className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
                {verificationStatus === "verified" && (
                  <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 rounded-full p-0.5">
                    <ShieldCheck className="w-3 h-3 text-white" />
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <div className="flex items-center justify-between px-2 py-2">
                <div>
                  <span className="text-sm font-medium block">{userName}</span>
                  {isSuperAdmin && (
                    <Badge className="mt-1 bg-gold text-black text-xs">SUPER ADMIN</Badge>
                  )}
                </div>
                {getStatusBadge()}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/profile")}>
                <UserIcon className="mr-2 h-4 w-4" />
                View Profile
              </DropdownMenuItem>
              
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/admin")} className="text-gold">
                  <Settings className="mr-2 h-4 w-4" />
                  ⚙️ Switch to Admin Dashboard
                </DropdownMenuItem>
              )}

              {verificationStatus !== "verified" && (
                <DropdownMenuItem onClick={() => navigate("/verification")}>
                  <Shield className="mr-2 h-4 w-4" />
                  Verify Account
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={toggleTheme}>
                {theme === "light" ? (
                  <><Moon className="mr-2 h-4 w-4" />Dark Mode</>
                ) : (
                  <><Sun className="mr-2 h-4 w-4" />Light Mode</>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {showGreeting ? (
        <div className="px-4 py-4 bg-gradient-to-r from-secondary/10 to-gold/10">
          <h1 className="text-2xl font-bold">
            {getGreeting()}, {userName}
          </h1>
          <p className="text-sm text-muted-foreground">Here's what's happening with your trading today</p>
        </div>
      ) : pageTitle ? (
        <div className="px-4 py-3 border-b border-border">
          <h1 className="text-lg font-bold">{pageTitle}</h1>
        </div>
      ) : null}
    </header>
  );
};