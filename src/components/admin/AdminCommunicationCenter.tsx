import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Mail, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export function AdminCommunicationCenter() {
  const [activeTab, setActiveTab] = useState('compose');
  const [sending, setSending] = useState(false);
  const [communications, setCommunications] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'both',
    category: 'announcement',
    send_to_all: true,
    recipient_emails: '',
    email_subject: '',
    email_html: '',
  });

  const fetchHistory = async () => {
    const { data } = await supabase
      .from('admin_communications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);
    if (data) setCommunications(data);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSend = async () => {
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.message && formData.type !== 'email') {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let recipientList: string[] = [];
      if (!formData.send_to_all && formData.recipient_emails) {
        recipientList = formData.recipient_emails.split(',').map(e => e.trim());
      }

      const { data: commData, error: commError } = await supabase
        .from('admin_communications')
        .insert({
          title: formData.title,
          message: formData.message,
          type: formData.type,
          category: formData.category,
          send_to_all: formData.send_to_all,
          recipient_emails: recipientList,
          email_subject: formData.email_subject || null,
          email_html: formData.email_html || null,
          created_by: session.user.id,
          status: 'pending',
        })
        .select()
        .single();

      if (commError) throw commError;

      const { error: sendError } = await supabase.functions.invoke('send-bulk-communication', {
        body: {
          communication_id: commData.id,
          title: formData.title,
          message: formData.message,
          type: formData.type,
          category: formData.category,
          email_subject: formData.email_subject,
          email_html: formData.email_html,
          send_to_all: formData.send_to_all,
          recipient_emails: recipientList,
        }
      });

      if (sendError) throw sendError;

      toast.success('Communication sent successfully!');
      
      setFormData({
        title: '',
        message: '',
        type: 'both',
        category: 'announcement',
        send_to_all: true,
        recipient_emails: '',
        email_subject: '',
        email_html: '',
      });
      
      fetchHistory();
      
    } catch (error: any) {
      toast.error(`Failed: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'sent') return <Badge className="bg-green-500">Sent</Badge>;
    if (status === 'pending') return <Badge className="bg-yellow-500">Pending</Badge>;
    if (status === 'failed') return <Badge className="bg-red-500">Failed</Badge>;
    return <Badge>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="compose">Send</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Send Communication</CardTitle>
              <CardDescription>Send notifications and/or emails to users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter title"
                />
              </div>

              <div>
                <Label>Send as</Label>
                <div className="flex gap-4 mt-2">
                  <Button
                    type="button"
                    variant={formData.type === 'notification' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'notification' })}
                    className="flex-1"
                  >
                    <Bell className="w-4 h-4 mr-2" /> Notification Only
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'email' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'email' })}
                    className="flex-1"
                  >
                    <Mail className="w-4 h-4 mr-2" /> Email Only
                  </Button>
                  <Button
                    type="button"
                    variant={formData.type === 'both' ? 'default' : 'outline'}
                    onClick={() => setFormData({ ...formData, type: 'both' })}
                    className="flex-1"
                  >
                    <Send className="w-4 h-4 mr-2" /> Both
                  </Button>
                </div>
              </div>

              <div>
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="promotion">Promotion</SelectItem>
                    <SelectItem value="update">Update</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.type === 'notification' || formData.type === 'both') && (
                <div>
                  <Label>Notification Message *</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Enter message for bell notification..."
                    rows={3}
                  />
                </div>
              )}

              {(formData.type === 'email' || formData.type === 'both') && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <Label>Email Subject *</Label>
                    <Input
                      value={formData.email_subject}
                      onChange={(e) => setFormData({ ...formData, email_subject: e.target.value })}
                      placeholder="Email subject"
                    />
                  </div>
                  <div>
                    <Label>Email Content (HTML)</Label>
                    <Textarea
                      value={formData.email_html}
                      onChange={(e) => setFormData({ ...formData, email_html: e.target.value })}
                      placeholder="<h1>Hello</h1><p>Your message here</p>"
                      rows={6}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use {'{{name}}'} for user's name, {'{{email}}'} for their email
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-4">
                  <Label>Send to all users</Label>
                  <Switch
                    checked={formData.send_to_all}
                    onCheckedChange={(checked) => setFormData({ ...formData, send_to_all: checked, recipient_emails: '' })}
                  />
                </div>
                
                {!formData.send_to_all && (
                  <div>
                    <Label>Specific emails (comma separated)</Label>
                    <Input
                      value={formData.recipient_emails}
                      onChange={(e) => setFormData({ ...formData, recipient_emails: e.target.value })}
                      placeholder="user1@email.com, user2@email.com"
                    />
                  </div>
                )}
              </div>

              <Button 
                onClick={handleSend} 
                disabled={sending}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {sending ? 'Sending...' : 'Send Communication'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Send History</CardTitle>
            </CardHeader>
            <CardContent>
              {communications.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No communications sent yet</p>
              ) : (
                <div className="space-y-4">
                  {communications.map((comm) => (
                    <div key={comm.id} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-semibold">{comm.title}</h3>
                          <p className="text-sm text-muted-foreground mt-1">{comm.message?.substring(0, 100)}</p>
                        </div>
                        {getStatusBadge(comm.status)}
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Type: {comm.type} • Category: {comm.category} • 
                        Sent: {new Date(comm.created_at).toLocaleString()}
                      </div>
                      <div className="text-xs mt-1">
                        Recipients: {comm.send_to_all ? 'All users' : `${comm.recipient_emails?.length || 0} specific users`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}