import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, Loader2, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SupportTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userEmail: string;
  userName: string;
}

export function SupportTicketModal({ isOpen, onClose, userId, userEmail, userName }: SupportTicketModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    subject: '',
    priority: 'normal',
    message: '',
  });
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const generateTicketNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TKT-${timestamp}-${random}`;
  };

  const handleFileSelect = (file: File | null) => {
    if (!file) {
      setScreenshot(null);
      setScreenshotPreview(null);
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Max size is 5MB');
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      toast.error('Only image files are allowed');
      return;
    }
    
    setScreenshot(file);
    const previewUrl = URL.createObjectURL(file);
    setScreenshotPreview(previewUrl);
  };

  const uploadScreenshot = async (file: File): Promise<string | null> => {
    if (!file) return null;
    
    setIsUploading(true);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `tickets/${userId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('ticket-screenshots')
      .upload(fileName, file);
    
    setIsUploading(false);
    
    if (uploadError) {
      console.error('Upload error:', uploadError);
      toast.error('Failed to upload screenshot');
      return null;
    }
    
    const { data: { publicUrl } } = supabase.storage
      .from('ticket-screenshots')
      .getPublicUrl(fileName);
    
    return publicUrl;
  };

  const handleSubmit = async () => {
    if (!formData.subject) {
      toast.error('Please enter a subject');
      return;
    }
    if (!formData.message) {
      toast.error('Please enter your message');
      return;
    }

    setSubmitting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in');
        setSubmitting(false);
        return;
      }
      
      const ticketNumber = generateTicketNumber();
      let screenshotUrl = null;
      
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
        if (!screenshotUrl && screenshot) {
          setSubmitting(false);
          return;
        }
      }
      
      // Insert ticket
      const { data: ticketData, error: insertError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          ticket_number: ticketNumber,
          subject: formData.subject,
          message: formData.message,
          screenshot_url: screenshotUrl,
          priority: formData.priority,
          status: 'open',
        })
        .select();
      
      if (insertError) throw insertError;
      
      console.log('Ticket created:', ticketData);
      
      // Send notifications to admin (Telegram + Email)
      const notificationPayload = {
        notification_type: 'ticket_created',
        event_data: {
          ticket_number: ticketNumber,
          subject: formData.subject,
          priority: formData.priority,
          message: formData.message,
          user_name: userName || userEmail,
          user_email: userEmail,
        },
        receipt_url: screenshotUrl,
      };
      
      console.log('Sending notification with payload:', notificationPayload);
      
      const { data: notifyData, error: notifyError } = await supabase.functions.invoke('send-email', {
        body: notificationPayload,
      });
      
      if (notifyError) {
        console.error('Notification error:', notifyError);
      } else {
        console.log('Notification sent:', notifyData);
      }
      
      // Also create a user notification in the database for the bell icon
      await supabase
        .from('user_notifications')
        .insert({
          user_id: userId,
          title: `Ticket #${ticketNumber} Created`,
          message: `Your support ticket "${formData.subject}" has been submitted. We'll respond shortly.`,
          type: 'ticket',
          notification_type: 'ticket_created',
          reference_id: ticketNumber,
          reference_table: 'support_tickets',
          is_read: false,
        });
      
      toast.success(`Ticket #${ticketNumber} submitted successfully!`);
      
      setFormData({ subject: '', priority: 'normal', message: '' });
      setScreenshot(null);
      setScreenshotPreview(null);
      onClose();
      
      // Refresh the page to show the new ticket
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      console.error('Submit error:', error);
      toast.error(`Failed to submit ticket: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-[#1a0b2e] border border-[#DA123E33] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Submit Support Ticket</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-gray-300">Subject *</Label>
            <Input
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Brief description of your issue"
              className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
            />
          </div>
          
          <div>
            <Label className="text-gray-300">Priority *</Label>
            <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
              <SelectTrigger className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a0b2e] border-[#DA123E33]">
                <SelectItem value="low">🟢 Low</SelectItem>
                <SelectItem value="normal">🔵 Normal</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="urgent">🔴 Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label className="text-gray-300">Message *</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Describe your issue in detail..."
              rows={5}
              className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
            />
          </div>
          
          <div>
            <Label className="text-gray-300">Screenshot (Optional, max 5MB)</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                className="bg-[#0b0821] border-[#DA123E33] text-white"
              />
            </div>
            {screenshotPreview && (
              <div className="mt-2 relative inline-block">
                <img 
                  src={screenshotPreview} 
                  alt="Preview" 
                  className="h-20 w-20 object-cover rounded-lg border border-[#DA123E33]"
                />
                <button
                  onClick={() => handleFileSelect(null)}
                  className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            )}
            {isUploading && <Loader2 className="w-4 h-4 animate-spin text-[#DA123E] mt-2" />}
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1 border-gray-600 text-gray-300">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={submitting || isUploading}
              className="flex-1 bg-[#DA123E] hover:bg-[#DA123E]/80 text-white"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {submitting ? 'Submitting...' : 'Submit Ticket'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}