import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Ticket, 
  MessageSquare, 
  Send, 
  Loader2, 
  Plus,
  RefreshCw,
  Calendar,
  Paperclip,
  X,
  Eye,
  Download,
  File,
  FileText,
  Image
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDistanceToNow, format } from 'date-fns';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { SidebarNav } from '@/components/dashboard/SidebarNav';
import { BottomNav } from '@/components/dashboard/BottomNav';
import { SupportTicketModal } from '@/components/SupportTicketModal';

interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  message: string;
  screenshot_url: string | null;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  user_last_read_at: string | null;
}

interface TicketReply {
  id: string;
  ticket_id: string;
  message: string;
  is_admin: boolean;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  created_at: string;
  user?: {
    full_name: string | null;
    email: string;
  };
}

export default function UserMessages() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [replyMessage, setReplyMessage] = useState('');
  const [replyAttachment, setReplyAttachment] = useState<File | null>(null);
  const [replyAttachmentPreview, setReplyAttachmentPreview] = useState<string | null>(null);
  const [sendingReply, setSendingReply] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState('');
  const [previewFileName, setPreviewFileName] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (data) setProfile(data);
  };

  const fetchTickets = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      console.error('Failed to load tickets:', error);
      toast.error(`Failed to load tickets: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch replies without join - separate queries
  const fetchReplies = async (ticketId: string) => {
    try {
      const { data: repliesData, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (repliesError) {
        console.error('Error fetching replies:', repliesError);
        return [];
      }

      if (!repliesData || repliesData.length === 0) {
        return [];
      }

      const userIds = [...new Set(repliesData.map(r => r.user_id))];
      
      if (userIds.length === 0) {
        return repliesData;
      }

      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        return repliesData;
      }

      const userMap = new Map();
      profilesData?.forEach(profile => {
        userMap.set(profile.id, profile);
      });

      const repliesWithUsers = repliesData.map(reply => ({
        ...reply,
        user: userMap.get(reply.user_id) || { full_name: 'Unknown', email: 'Unknown' }
      }));

      return repliesWithUsers;
    } catch (error) {
      console.error('Error in fetchReplies:', error);
      return [];
    }
  };

  const openTicketDetails = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    const ticketReplies = await fetchReplies(ticket.id);
    setReplies(ticketReplies);
    setReplyMessage('');
    setReplyAttachment(null);
    setReplyAttachmentPreview(null);
    setDetailsOpen(true);
    
    // Update user_last_read_at when opening ticket
    await supabase
      .from('support_tickets')
      .update({ user_last_read_at: new Date().toISOString() })
      .eq('id', ticket.id);
  };

  const uploadAttachment = async (file: File, ticketId: string): Promise<string | null> => {
    if (!file) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `tickets/${ticketId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(fileName, file);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload attachment');
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-attachments')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleReplyFileSelect = (file: File | null) => {
    if (!file) {
      setReplyAttachment(null);
      setReplyAttachmentPreview(null);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max size is 10MB');
      return;
    }
    
    setReplyAttachment(file);
    if (file.type.startsWith('image/')) {
      const previewUrl = URL.createObjectURL(file);
      setReplyAttachmentPreview(previewUrl);
    } else {
      setReplyAttachmentPreview(null);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim() && !replyAttachment) {
      toast.error('Please enter a message or attach a file');
      return;
    }
    if (!selectedTicket) return;

    setSendingReply(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let attachmentUrl = null;
      let attachmentName = null;
      let attachmentType = null;
      let attachmentSize = null;

      if (replyAttachment) {
        attachmentUrl = await uploadAttachment(replyAttachment, selectedTicket.id);
        if (attachmentUrl) {
          attachmentName = replyAttachment.name;
          attachmentType = replyAttachment.type;
          attachmentSize = replyAttachment.size;
        }
      }

      const { error: replyError } = await supabase
        .from('ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: session.user.id,
          message: replyMessage || null,
          is_admin: false,
          attachment_url: attachmentUrl,
          attachment_name: attachmentName,
          attachment_type: attachmentType,
          attachment_size: attachmentSize,
        });

      if (replyError) throw replyError;

      await supabase
        .from('support_tickets')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedTicket.id);

      // Send Telegram notification to admin when user replies
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            notification_type: 'ticket_reply_from_user',
            event_data: {
              ticket_number: selectedTicket.ticket_number,
              subject: selectedTicket.subject,
              reply_message: replyMessage || '(Attachment only)',
              user_name: profile?.full_name || 'User',
              user_email: profile?.email,
              attachment_url: attachmentUrl,
            }
          }
        });
        console.log('Admin notification sent');
      } catch (notifyErr) {
        console.error('Notification error:', notifyErr);
      }

      toast.success('Reply sent successfully!');
      
      const newReplies = await fetchReplies(selectedTicket.id);
      setReplies(newReplies);
      setReplyMessage('');
      setReplyAttachment(null);
      setReplyAttachmentPreview(null);
      fetchTickets();
      
    } catch (error: any) {
      toast.error(`Failed to send reply: ${error.message}`);
    } finally {
      setSendingReply(false);
    }
  };

  const openAttachmentPreview = (url: string, name: string, type: string) => {
    setPreviewImageUrl(url);
    setPreviewFileName(name);
    if (type?.startsWith('image/')) {
      setImagePreviewOpen(true);
    } else {
      window.open(url, '_blank');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open': return <Badge className="bg-yellow-500/20 text-yellow-500">Open</Badge>;
      case 'in_progress': return <Badge className="bg-blue-500/20 text-blue-500">In Progress</Badge>;
      case 'resolved': return <Badge className="bg-green-500/20 text-green-500">Resolved</Badge>;
      case 'closed': return <Badge className="bg-gray-500/20 text-gray-500">Closed</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent': return <Badge className="bg-red-500/20 text-red-500">Urgent</Badge>;
      case 'high': return <Badge className="bg-orange-500/20 text-orange-500">High</Badge>;
      case 'normal': return <Badge className="bg-blue-500/20 text-blue-500">Normal</Badge>;
      case 'low': return <Badge className="bg-green-500/20 text-green-500">Low</Badge>;
      default: return <Badge>{priority}</Badge>;
    }
  };

  const isImageFile = (type: string) => type?.startsWith('image/');

  useEffect(() => {
    fetchProfile();
    fetchTickets();
  }, [refreshTrigger]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!detailsOpen) {
        fetchTickets();
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [detailsOpen]);

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={profile?.full_name || "User"}
        onMenuClick={() => setSidebarOpen(true)}
        avatarUrl={profile?.avatar_url}
        verificationStatus={profile?.profile_status}
      />

      <main className="container mx-auto px-4 pt-40 max-w-4xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
            <p className="text-gray-400 text-sm">View and manage your support requests</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setRefreshTrigger(prev => prev + 1)}
              className="border-[#DA123E33] text-gray-300"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            <Button 
              onClick={() => setTicketModalOpen(true)}
              className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white"
            >
              <Plus className="w-4 h-4 mr-2" /> New Ticket
            </Button>
          </div>
        </div>

        <Card className="bg-[#1a0b2e] border-[#DA123E33]">
          <CardHeader>
            <CardTitle className="text-white">My Tickets</CardTitle>
            <CardDescription className="text-gray-400">
              {tickets.length} ticket{tickets.length !== 1 ? 's' : ''} total
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-[#DA123E]" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="text-center py-8">
                <Ticket className="w-12 h-12 mx-auto text-gray-500 mb-3" />
                <p className="text-gray-400">No tickets yet</p>
                <Button 
                  variant="link" 
                  onClick={() => setTicketModalOpen(true)}
                  className="text-[#DA123E]"
                >
                  Create your first support ticket
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    className="p-4 rounded-lg border border-[#DA123E33] hover:bg-[#0b0821] cursor-pointer transition-colors"
                    onClick={() => openTicketDetails(ticket)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Ticket className="w-4 h-4 text-[#DA123E]" />
                          <span className="font-mono text-sm text-[#DA123E]">{ticket.ticket_number}</span>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <h3 className="font-semibold text-white mb-1">{ticket.subject}</h3>
                        <p className="text-sm text-gray-400 line-clamp-2">{ticket.message}</p>
                        {ticket.screenshot_url && (
                          <div className="flex items-center gap-1 mt-2">
                            <Paperclip className="w-3 h-3 text-[#DA123E]" />
                            <span className="text-xs text-gray-500">Has attachment</span>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                          </span>
                          {ticket.updated_at !== ticket.created_at && (
                            <span>Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Ticket Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-[#1a0b2e] border border-[#DA123E33] text-white">
          <DialogHeader>
            <DialogTitle className="text-white">Ticket #{selectedTicket?.ticket_number}</DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-6">
              <div className="p-4 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                <div className="flex gap-2 mb-3">
                  {getStatusBadge(selectedTicket.status)}
                  {getPriorityBadge(selectedTicket.priority)}
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-2">{selectedTicket.subject}</h3>
                <p className="text-gray-300 mb-3">{selectedTicket.message}</p>
                
                {selectedTicket.screenshot_url && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-400 mb-2">Attachment:</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAttachmentPreview(selectedTicket.screenshot_url!, 'Screenshot', 'image/png')}
                      className="border-[#DA123E33] text-gray-300"
                    >
                      <Eye className="w-3 h-3 mr-1" /> View Screenshot
                    </Button>
                  </div>
                )}
                
                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>Created: {format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}</span>
                  {selectedTicket.updated_at !== selectedTicket.created_at && (
                    <span>Last updated: {formatDistanceToNow(new Date(selectedTicket.updated_at), { addSuffix: true })}</span>
                  )}
                </div>
              </div>

              {/* Replies - Conversation History */}
              <div>
                <h4 className="font-semibold text-white mb-3">Conversation</h4>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {replies.length === 0 ? (
                    <p className="text-center text-gray-400 py-4">No replies yet. Our team will respond shortly.</p>
                  ) : (
                    replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`p-3 rounded-lg ${
                          reply.is_admin 
                            ? 'bg-[#DA123E]/10 border border-[#DA123E33] ml-4' 
                            : 'bg-[#0b0821] border border-[#DA123E33] mr-4'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarFallback className="bg-[#DA123E] text-white text-xs">
                                {reply.is_admin ? 'A' : (reply.user?.full_name?.charAt(0) || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm font-medium text-white">
                              {reply.is_admin ? 'Support Team' : (reply.user?.full_name || 'You')}
                            </span>
                            {reply.is_admin && (
                              <Badge className="bg-[#DA123E] text-white text-xs">Staff</Badge>
                            )}
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-gray-300">{reply.message}</p>
                        {reply.attachment_url && (
                          <div className="mt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openAttachmentPreview(reply.attachment_url!, reply.attachment_name || 'Attachment', reply.attachment_type || '')}
                              className="border-[#DA123E33] text-gray-300 text-xs"
                            >
                              {isImageFile(reply.attachment_type || '') ? (
                                <Image className="w-3 h-3 mr-1" />
                              ) : (
                                <FileText className="w-3 h-3 mr-1" />
                              )}
                              📎 {reply.attachment_name || 'View Attachment'}
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Reply Box */}
              {selectedTicket.status !== 'closed' && selectedTicket.status !== 'resolved' && (
                <div className="border-t border-[#DA123E33] pt-4">
                  <Label className="text-gray-300">Add a reply</Label>
                  <Textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder="Type your message here..."
                    rows={4}
                    className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                  />
                  
                  <div className="mt-3">
                    <Label className="text-gray-300 text-sm">Attach File (Optional - max 10MB)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        type="file"
                        accept="image/*,.pdf,.doc,.docx,.txt"
                        onChange={(e) => handleReplyFileSelect(e.target.files?.[0] || null)}
                        className="bg-[#0b0821] border-[#DA123E33] text-white text-sm"
                      />
                    </div>
                    {replyAttachmentPreview && (
                      <div className="mt-2 relative inline-block">
                        <img 
                          src={replyAttachmentPreview} 
                          alt="Preview" 
                          className="h-16 w-16 object-cover rounded-lg border border-[#DA123E33]"
                        />
                        <button
                          onClick={() => handleReplyFileSelect(null)}
                          className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    )}
                    {replyAttachment && !replyAttachmentPreview && (
                      <div className="mt-2 flex items-center gap-2 p-2 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                        <File className="w-4 h-4 text-[#DA123E]" />
                        <span className="text-xs text-gray-300">{replyAttachment.name}</span>
                        <button
                          onClick={() => handleReplyFileSelect(null)}
                          className="ml-auto text-red-500"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end mt-3">
                    <Button 
                      onClick={handleSendReply} 
                      disabled={sendingReply || (!replyMessage.trim() && !replyAttachment)}
                      className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white"
                    >
                      {sendingReply ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                      Send Reply
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)} className="border-gray-600 text-gray-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Dialog */}
      <Dialog open={imagePreviewOpen} onOpenChange={setImagePreviewOpen}>
        <DialogContent className="max-w-2xl bg-[#1a0b2e] border border-[#DA123E33]">
          <DialogHeader>
            <DialogTitle className="text-white">{previewFileName || 'Preview'}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center">
            <img 
              src={previewImageUrl} 
              alt="Preview" 
              className="max-w-full max-h-[60vh] object-contain rounded-lg"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => window.open(previewImageUrl, '_blank')}
              className="border-[#DA123E33] text-gray-300"
            >
              <Download className="w-4 h-4 mr-2" /> Download
            </Button>
            <Button variant="outline" onClick={() => setImagePreviewOpen(false)} className="border-gray-600 text-gray-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Ticket Modal */}
      <SupportTicketModal
        isOpen={ticketModalOpen}
        onClose={() => {
          setTicketModalOpen(false);
          setRefreshTrigger(prev => prev + 1);
        }}
        userId={profile?.id || ''}
        userEmail={profile?.email || ''}
        userName={profile?.full_name || ''}
      />

      <BottomNav />
    </div>
  );
}