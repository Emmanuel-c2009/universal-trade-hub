import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  FileText,
  X,
  Check,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { format, isToday, isYesterday } from "date-fns";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_type: "user" | "admin";
  message_type: "text" | "image" | "pdf" | "file";
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  is_read: boolean;
  created_at: string;
}

export default function MessageCenter() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (profileData) setProfile(profileData);

      // Fetch or create conversation
      let { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (!conversation) {
        const { data: newConversation, error } = await supabase
          .from("conversations")
          .insert({ user_id: session.user.id, subject: "Support Chat" })
          .select()
          .single();

        if (error) {
          console.error("Error creating conversation:", error);
        } else {
          conversation = newConversation;
        }
      }

      if (conversation) {
        setConversationId(conversation.id);

        // Fetch messages
        const { data: messagesData } = await supabase
          .from("messages")
          .select("*")
          .eq("conversation_id", conversation.id)
          .order("created_at", { ascending: true });

        if (messagesData) setMessages(messagesData as Message[]);

        // Mark messages as read
        await supabase
          .from("messages")
          .update({ is_read: true })
          .eq("conversation_id", conversation.id)
          .eq("sender_type", "admin")
          .eq("is_read", false);

        // Reset unread count
        await supabase
          .from("conversations")
          .update({ unread_user: 0 })
          .eq("id", conversation.id);
      }

      setLoading(false);
    };

    fetchData();
  }, [navigate]);

  // Set up realtime subscription
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => [...prev, newMsg]);

          // Mark as read if from admin
          if (newMsg.sender_type === "admin") {
            supabase
              .from("messages")
              .update({ is_read: true })
              .eq("id", newMsg.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const sendMessage = async (
    content: string,
    type: "text" | "image" | "pdf" | "file" = "text",
    fileUrl?: string,
    fileName?: string
  ) => {
    if (!conversationId) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: session.user.id,
        sender_type: "user",
        message_type: type,
        content: type === "text" ? content : null,
        file_url: fileUrl || null,
        file_name: fileName || null,
      });

      if (error) throw error;

      // Update conversation last_message_at
      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    setSending(true);
    await sendMessage(newMessage.trim());
    setSending(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;

    const file = e.target.files[0];
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${session.user.id}/messages/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("verification-documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("verification-documents")
        .getPublicUrl(filePath);

      const fileType = file.type.startsWith("image/")
        ? "image"
        : file.type === "application/pdf"
        ? "pdf"
        : "file";

      await sendMessage("", fileType, publicUrl, file.name);
    } catch (error: any) {
      toast({
        title: "Error uploading file",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const formatMessageDate = (date: string) => {
    const d = new Date(date);
    if (isToday(d)) return `Today ${format(d, "HH:mm")}`;
    if (isYesterday(d)) return `Yesterday ${format(d, "HH:mm")}`;
    return format(d, "MMM d, yyyy HH:mm");
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { [key: string]: Message[] } = {};
    messages.forEach((msg) => {
      const date = format(new Date(msg.created_at), "yyyy-MM-dd");
      if (!groups[date]) groups[date] = [];
      groups[date].push(msg);
    });
    return groups;
  };

  const groupedMessages = groupMessagesByDate(messages);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={profile?.full_name || "User"}
        onMenuClick={() => setSidebarOpen(true)}
        notificationCount={0}
        messageCount={0}
      />

      <main className="container mx-auto px-4 pt-40 max-w-3xl h-[calc(100vh-200px)] flex flex-col">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Message Center</h1>
          <p className="text-sm text-muted-foreground">
            Chat with our support team
          </p>
        </div>

        <Card className="flex-1 flex flex-col overflow-hidden">
          {/* Messages */}
          <ScrollArea className="flex-1 p-4">
            {Object.entries(groupedMessages).map(([date, msgs]) => (
              <div key={date}>
                <div className="text-center my-4">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {isToday(new Date(date))
                      ? "Today"
                      : isYesterday(new Date(date))
                      ? "Yesterday"
                      : format(new Date(date), "MMMM d, yyyy")}
                  </span>
                </div>
                {msgs.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex mb-4 ${
                      msg.sender_type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`flex gap-2 max-w-[80%] ${
                        msg.sender_type === "user"
                          ? "flex-row-reverse"
                          : "flex-row"
                      }`}
                    >
                      <Avatar className="w-8 h-8">
                        {msg.sender_type === "admin" ? (
                          <AvatarFallback className="bg-secondary text-secondary-foreground">
                            UST
                          </AvatarFallback>
                        ) : (
                          <>
                            <AvatarImage src={profile?.avatar_url} />
                            <AvatarFallback>
                              {profile?.full_name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </>
                        )}
                      </Avatar>
                      <div>
                        <div
                          className={`rounded-2xl px-4 py-2 ${
                            msg.sender_type === "user"
                              ? "bg-secondary text-secondary-foreground rounded-br-sm"
                              : "bg-muted rounded-bl-sm"
                          }`}
                        >
                          {msg.message_type === "text" && (
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          )}
                          {msg.message_type === "image" && msg.file_url && (
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <img
                                src={msg.file_url}
                                alt="Shared image"
                                className="max-w-xs rounded-lg"
                              />
                            </a>
                          )}
                          {msg.message_type === "pdf" && msg.file_url && (
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-500 hover:underline"
                            >
                              <FileText className="w-5 h-5" />
                              {msg.file_name || "Document.pdf"}
                            </a>
                          )}
                          {msg.message_type === "file" && msg.file_url && (
                            <a
                              href={msg.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 text-blue-500 hover:underline"
                            >
                              <Paperclip className="w-5 h-5" />
                              {msg.file_name || "File"}
                            </a>
                          )}
                        </div>
                        <div
                          className={`flex items-center gap-1 mt-1 text-xs text-muted-foreground ${
                            msg.sender_type === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          <span>{format(new Date(msg.created_at), "HH:mm")}</span>
                          {msg.sender_type === "user" && (
                            <span>
                              {msg.is_read ? (
                                <CheckCheck className="w-3 h-3 text-secondary" />
                              ) : (
                                <Check className="w-3 h-3" />
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-12">
                <p>No messages yet. Start a conversation!</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Input */}
          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*,.pdf"
                className="hidden"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-secondary border-t-transparent rounded-full" />
                ) : (
                  <Paperclip className="w-5 h-5" />
                )}
              </Button>
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                disabled={sending}
              />
              <Button
                onClick={handleSend}
                disabled={!newMessage.trim() || sending}
              >
                <Send className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
