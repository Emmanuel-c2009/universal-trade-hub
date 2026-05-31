import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { markAdminNotificationRead } from "@/services/adminService";
import { useNavigate } from "react-router-dom";

interface AdminNotification {
  id: string;
  notification_type: string;
  reference_id: string | null;
  reference_table: string | null;
  user_id: string | null;
  message: string | null;
  is_read: boolean;
  created_at: string;
}

export const AdminNotificationBadge = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    const { data, error } = await (supabase as any)
      .from("admin_notifications")
      .select("*")
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .limit(20);

    if (!error && data) {
      setNotifications(data as AdminNotification[]);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Subscribe to new notifications
    const channel = supabase
      .channel("admin_notifications_realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "admin_notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleNotificationClick = async (notification: AdminNotification) => {
    await markAdminNotificationRead(notification.id);
    
    if (notification.reference_table === "deposits") {
      navigate("/admin/deposits");
    } else if (notification.reference_table === "withdrawals") {
      navigate("/admin/withdrawals");
    }
    
    setOpen(false);
    fetchNotifications();
  };

  const unreadCount = notifications.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Notifications</h4>
          {notifications.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No new notifications
            </p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className="p-2 rounded-lg bg-muted/50 hover:bg-muted cursor-pointer"
                >
                  <p className="text-sm">{n.message}</p>
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
  );
};
