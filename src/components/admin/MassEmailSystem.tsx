import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Send, Loader2, Mail, Users, FileText, Eye, Save, Trash2, Plus, 
  Search, X, Check, ChevronDown, Upload, Settings, Server, 
  Edit2, Copy, CheckCircle, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Progress } from '@/components/ui/progress';
import { EmailTemplateManager } from './EmailTemplateManager';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface EmailTemplate {
  id: string;
  template_name: string;
  subject_line: string;
  body_html: string;
  is_default: boolean;
  created_at: string;
}

interface EmailSender {
  id: string;
  name: string;
  provider: string;
  email: string;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  is_active: boolean;
  is_default: boolean;
}

export function MassEmailSystem() {
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [selectedSenderId, setSelectedSenderId] = useState<string>('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [manageSendersOpen, setManageSendersOpen] = useState(false);
  const [editingSender, setEditingSender] = useState<EmailSender | null>(null);
  
  // External recipients
  const [manualEmails, setManualEmails] = useState('');
  const [uploadedEmails, setUploadedEmails] = useState<string[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  const [includeExisting, setIncludeExisting] = useState(true);
  const [includeManual, setIncludeManual] = useState(false);
  const [includeUpload, setIncludeUpload] = useState(false);
  
  // New Sender Form
  const [senderForm, setSenderForm] = useState({
    name: '',
    provider: 'smtp',
    email: '',
    smtp_host: '',
    smtp_port: '587',
    smtp_user: '',
    smtp_pass: '',
    is_default: false,
  });
  
  const [formData, setFormData] = useState({
    send_to_all: true,
    subject: '',
    message: '',
    selected_template_id: '',
  });

  // Fetch users
  const fetchUsers = async () => {
    setFetchingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error(`Failed to load users: ${error.message}`);
    } finally {
      setFetchingUsers(false);
    }
  };

  // Fetch email templates
  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, template_name, subject_line, body_html, is_default, created_at')
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      setTemplates(data || []);
    } catch (error: any) {
      console.error('Error fetching templates:', error);
    }
  };

  // Fetch email senders
  const fetchSenders = async () => {
    try {
      const { data, error } = await supabase
        .from('email_senders')
        .select('*')
        .eq('is_active', true)
        .order('is_default', { ascending: false });
      
      if (error) throw error;
      setSenders(data || []);
      
      // Set default sender
      const defaultSender = data?.find(s => s.is_default);
      if (defaultSender) {
        setSelectedSenderId(defaultSender.id);
      } else if (data && data.length > 0) {
        setSelectedSenderId(data[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching senders:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchTemplates();
    fetchSenders();
  }, []);

  // Get selected sender details
  const getSelectedSender = () => {
    return senders.find(s => s.id === selectedSenderId);
  };

  // Parse manual emails
  const parseManualEmails = (): string[] => {
    if (!manualEmails.trim()) return [];
    return manualEmails
      .split(/[,\n]/)
      .map(email => email.trim().toLowerCase())
      .filter(email => email.includes('@') && email.length > 5);
  };

  // Parse uploaded file
  const parseUploadedFile = async (file: File): Promise<string[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const content = e.target?.result as string;
        let emails: string[] = [];
        
        if (file.name.endsWith('.csv')) {
          const lines = content.split('\n');
          const headers = lines[0].toLowerCase().split(',');
          const emailColumnIndex = headers.findIndex(h => h.includes('email'));
          
          if (emailColumnIndex >= 0) {
            for (let i = 1; i < lines.length; i++) {
              const cols = lines[i].split(',');
              if (cols[emailColumnIndex]) {
                const email = cols[emailColumnIndex].trim().toLowerCase().replace(/['"]/g, '');
                if (email.includes('@')) emails.push(email);
              }
            }
          } else {
            for (const line of lines) {
              const email = line.trim().toLowerCase().replace(/['"]/g, '');
              if (email.includes('@')) emails.push(email);
            }
          }
        } else {
          const lines = content.split('\n');
          for (const line of lines) {
            const email = line.trim().toLowerCase();
            if (email.includes('@')) emails.push(email);
          }
        }
        
        emails = [...new Set(emails)];
        resolve(emails);
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      
      if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
        reader.readAsText(file);
      } else {
        reject(new Error('Unsupported file type. Please upload CSV or TXT files.'));
      }
    });
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      toast.error('Please upload CSV or TXT file');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 100);
    
    try {
      const emails = await parseUploadedFile(file);
      setUploadedEmails(emails);
      setUploadFileName(file.name);
      setIncludeUpload(true);
      toast.success(`Loaded ${emails.length} emails from ${file.name}`);
    } catch (error: any) {
      toast.error(`Failed to parse file: ${error.message}`);
    } finally {
      clearInterval(interval);
      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        setUploadProgress(0);
      }, 500);
    }
  };

  // Get all recipients
  const getAllRecipients = () => {
    let recipients: { email: string; name: string | null; id: string | null }[] = [];
    
    if (includeExisting) {
      if (formData.send_to_all) {
        recipients.push(...users.map(u => ({ email: u.email, name: u.full_name, id: u.id })));
      } else {
        recipients.push(...selectedUsers.map(u => ({ email: u.email, name: u.full_name, id: u.id })));
      }
    }
    
    if (includeManual) {
      const manualEmailList = parseManualEmails();
      for (const email of manualEmailList) {
        if (!recipients.some(r => r.email === email)) {
          recipients.push({ email, name: null, id: null });
        }
      }
    }
    
    if (includeUpload) {
      for (const email of uploadedEmails) {
        if (!recipients.some(r => r.email === email)) {
          recipients.push({ email, name: null, id: null });
        }
      }
    }
    
    return recipients;
  };

  // Filter users by search
  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Add user to selection
  const addUser = (user: User) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearchOpen(false);
    setSearchTerm('');
  };

  // Remove user from selection
  const removeUser = (userId: string) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  // Select all users
  const selectAllUsers = () => {
    setSelectedUsers([...users]);
    setFormData(prev => ({ ...prev, send_to_all: false }));
  };

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setFormData({
        ...formData,
        subject: template.subject_line,
        message: template.body_html,
        selected_template_id: templateId,
      });
      toast.success(`Template "${template.template_name}" loaded`);
    }
  };

  // Save as template
  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!formData.subject) {
      toast.error('Please enter a subject');
      return;
    }
    if (!formData.message) {
      toast.error('Please enter email content');
      return;
    }

    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          template_name: newTemplateName,
          subject_line: formData.subject,
          body_html: formData.message,
          is_default: false,
        });

      if (error) throw error;

      toast.success('Template saved successfully!');
      setSaveTemplateOpen(false);
      setNewTemplateName('');
      fetchTemplates();
    } catch (error: any) {
      toast.error(`Failed to save template: ${error.message}`);
    }
  };

  // Save SMTP Sender
  const saveSender = async () => {
    if (!senderForm.name) {
      toast.error('Please enter a sender name');
      return;
    }
    if (!senderForm.email) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const senderData = {
        name: senderForm.name,
        provider: senderForm.provider,
        email: senderForm.email,
        smtp_host: senderForm.provider === 'smtp' || senderForm.provider === 'gmail' ? senderForm.smtp_host : null,
        smtp_port: senderForm.provider === 'smtp' || senderForm.provider === 'gmail' ? parseInt(senderForm.smtp_port) : null,
        smtp_user: senderForm.provider === 'smtp' || senderForm.provider === 'gmail' ? senderForm.smtp_user : null,
        smtp_pass: (senderForm.provider === 'smtp' || senderForm.provider === 'gmail') && senderForm.smtp_pass ? senderForm.smtp_pass : null,
        is_active: true,
        is_default: senderForm.is_default,
        created_by: session.user.id,
      };

      if (editingSender) {
        // Update existing
        const { error } = await supabase
          .from('email_senders')
          .update(senderData)
          .eq('id', editingSender.id);

        if (error) throw error;
        toast.success('Sender updated successfully');
      } else {
        // Insert new
        const { error } = await supabase
          .from('email_senders')
          .insert(senderData);

        if (error) throw error;
        toast.success('Sender added successfully');
      }

      // If this sender is default, update others
      if (senderForm.is_default) {
        await supabase
          .from('email_senders')
          .update({ is_default: false })
          .neq('id', editingSender?.id || '');
      }

      setManageSendersOpen(false);
      setEditingSender(null);
      setSenderForm({
        name: '',
        provider: 'smtp',
        email: '',
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        is_default: false,
      });
      fetchSenders();
    } catch (error: any) {
      toast.error(`Failed to save sender: ${error.message}`);
    }
  };

  // Delete sender
  const deleteSender = async (sender: EmailSender) => {
    if (!confirm(`Delete sender "${sender.name}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('email_senders')
        .delete()
        .eq('id', sender.id);

      if (error) throw error;
      toast.success('Sender deleted');
      fetchSenders();
    } catch (error: any) {
      toast.error(`Failed to delete: ${error.message}`);
    }
  };

  // Send emails
  const handleSend = async () => {
    if (!formData.subject) {
      toast.error('Please enter an email subject');
      return;
    }
    if (!formData.message) {
      toast.error('Please enter email content');
      return;
    }
    if (!selectedSenderId) {
      toast.error('Please select an email sender');
      return;
    }

    const recipients = getAllRecipients();
    
    if (recipients.length === 0) {
      toast.error('No recipients selected');
      return;
    }

    const selectedSender = getSelectedSender();
    if (!selectedSender) {
      toast.error('Selected sender not found');
      return;
    }

    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Prepare sender config
      const senderConfig = {
        provider: selectedSender.provider,
        from_email: selectedSender.email,
        from_name: selectedSender.name,
        smtp_host: selectedSender.smtp_host,
        smtp_port: selectedSender.smtp_port,
        smtp_user: selectedSender.smtp_user,
        smtp_pass: selectedSender.smtp_pass,
      };

      // Call edge function to send bulk emails
      const { error: sendError } = await supabase.functions.invoke('send-bulk-emails', {
        body: {
          sender: senderConfig,
          subject: formData.subject,
          html_content: formData.message,
          recipients: recipients.map(r => r.email),
          recipients_data: recipients,
          created_by: session.user.id,
        }
      });

      if (sendError) throw sendError;

      toast.success(`Emails sent to ${recipients.length} recipients!`);
      
      // Reset external fields after send
      setManualEmails('');
      setUploadedEmails([]);
      setUploadFileName('');
      setIncludeManual(false);
      setIncludeUpload(false);
      
    } catch (error: any) {
      toast.error(`Failed to send emails: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const recipients = getAllRecipients();
  const manualEmailCount = parseManualEmails().length;
  const totalRecipients = recipients.length;
  const selectedSender = getSelectedSender();

  return (
    <div className="space-y-6">
      <Tabs defaultValue="compose" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-3 bg-[#1a0b2e] border border-[#DA123E33]">
          <TabsTrigger value="compose" className="data-[state=active]:bg-[#DA123E] data-[state=active]:text-white">
            Compose Email
          </TabsTrigger>
          <TabsTrigger value="templates" className="data-[state=active]:bg-[#DA123E] data-[state=active]:text-white">
            Templates ({templates.length})
          </TabsTrigger>
          <TabsTrigger value="manage" className="data-[state=active]:bg-[#DA123E] data-[state=active]:text-white">
            Manage Templates
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6 mt-6">
          <Card className="bg-[#1a0b2e] border-[#DA123E33]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">Mass Email System</CardTitle>
                  <CardDescription className="text-gray-400">
                    Send bulk emails using your configured email senders
                  </CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingSender(null);
                    setSenderForm({
                      name: '',
                      provider: 'smtp',
                      email: '',
                      smtp_host: '',
                      smtp_port: '587',
                      smtp_user: '',
                      smtp_pass: '',
                      is_default: false,
                    });
                    setManageSendersOpen(true);
                  }}
                  className="border-[#DA123E33] text-gray-300"
                >
                  <Settings className="w-4 h-4 mr-2" /> Manage Senders
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Sender Selection */}
              <div>
                <Label className="text-gray-300">Send From *</Label>
                <Select value={selectedSenderId} onValueChange={setSelectedSenderId}>
                  <SelectTrigger className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white">
                    <SelectValue placeholder="Select email sender" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a0b2e] border-[#DA123E33]">
                    {senders.map((sender) => (
                      <SelectItem key={sender.id} value={sender.id}>
                        <div className="flex items-center gap-2">
                          {sender.provider === 'resend' ? (
                            <Mail className="w-4 h-4 text-blue-400" />
                          ) : sender.provider === 'gmail' ? (
                            <Mail className="w-4 h-4 text-red-400" />
                          ) : (
                            <Server className="w-4 h-4 text-green-400" />
                          )}
                          <span>{sender.name}</span>
                          <span className="text-xs text-gray-400">({sender.email})</span>
                          {sender.is_default && (
                            <Badge className="bg-gold text-black text-xs ml-2">Default</Badge>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSender && (
                  <p className="text-xs text-gray-500 mt-1">
                    Sending from: {selectedSender.name} &lt;{selectedSender.email}&gt; via {selectedSender.provider.toUpperCase()}
                  </p>
                )}
              </div>

              {/* Load Template Dropdown */}
              {templates.length > 0 && (
                <div>
                  <Label className="text-gray-300">Load Template</Label>
                  <Select value={formData.selected_template_id} onValueChange={loadTemplate}>
                    <SelectTrigger className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white">
                      <SelectValue placeholder="Select a template to load" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0b2e] border-[#DA123E33]">
                      {templates.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          <div className="flex items-center gap-2">
                            <span>{t.template_name}</span>
                            {t.is_default && (
                              <Badge className="bg-gold text-black text-xs">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Subject */}
              <div>
                <Label className="text-gray-300">Email Subject *</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Enter email subject"
                  className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                />
              </div>

              {/* Message Content */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label className="text-gray-300">Email Content (HTML) *</Label>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPreviewOpen(true)} className="border-[#DA123E33] text-gray-300">
                      <Eye className="w-3 h-3 mr-1" /> Preview
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSaveTemplateOpen(true)} className="border-[#DA123E33] text-gray-300">
                      <Save className="w-3 h-3 mr-1" /> Save as Template
                    </Button>
                  </div>
                </div>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  placeholder="<h1>Hello {{name}},</h1><p>Your message here...</p>"
                  rows={10}
                  className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Available variables: {'{{name}}'} for user's name, {'{{email}}'} for their email, {'{{date}}'} for current date
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Tip: Add logo to email: {'<img src="https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/Public-assets/logo.png" alt="Logo" style="max-width: 150px;" />'}
                </p>
              </div>

              {/* Recipients Section */}
              <div className="border-t border-[#DA123E33] pt-4">
                <h3 className="text-base font-semibold text-white mb-4">Recipients</h3>
                
                {/* Existing Platform Users */}
                <div className="mb-4 p-4 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Platform Users
                    </Label>
                    <Switch
                      checked={includeExisting}
                      onCheckedChange={setIncludeExisting}
                    />
                  </div>
                  
                  {includeExisting && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Send to:</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">All Users</span>
                          <Switch
                            checked={formData.send_to_all}
                            onCheckedChange={(checked) => setFormData({ ...formData, send_to_all: checked })}
                          />
                        </div>
                      </div>
                      
                      {!formData.send_to_all && (
                        <div className="space-y-3">
                          <div className="flex gap-2">
                            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                              <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between border-[#DA123E33] text-gray-300">
                                  <Search className="w-4 h-4 mr-2" />
                                  Search users...
                                  <ChevronDown className="w-4 h-4 ml-2" />
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-[400px] p-0 bg-[#1a0b2e] border-[#DA123E33]">
                                <Command>
                                  <CommandInput 
                                    placeholder="Search by email or name..." 
                                    value={searchTerm}
                                    onValueChange={setSearchTerm}
                                    className="text-white"
                                  />
                                  <CommandList>
                                    <CommandEmpty className="text-gray-400 p-4">No users found.</CommandEmpty>
                                    <CommandGroup>
                                      {filteredUsers.slice(0, 10).map((user) => (
                                        <CommandItem
                                          key={user.id}
                                          onSelect={() => addUser(user)}
                                          className="cursor-pointer hover:bg-[#DA123E33] text-white"
                                        >
                                          <Avatar className="w-6 h-6 mr-2">
                                            <AvatarFallback className="bg-[#DA123E] text-white text-xs">
                                              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                            </AvatarFallback>
                                          </Avatar>
                                          <div className="flex-1">
                                            <p className="text-sm">{user.full_name || 'No name'}</p>
                                            <p className="text-xs text-gray-400">{user.email}</p>
                                          </div>
                                          <Check className="w-4 h-4 text-green-500" />
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </CommandList>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            
                            <Button 
                              variant="outline" 
                              onClick={selectAllUsers}
                              className="border-[#DA123E33] text-gray-300"
                            >
                              <Users className="w-4 h-4 mr-2" /> Select All
                            </Button>
                          </div>
                          
                          {selectedUsers.length > 0 && (
                            <div className="border border-[#DA123E33] rounded-lg p-3 max-h-32 overflow-y-auto">
                              <div className="flex flex-wrap gap-2">
                                {selectedUsers.map((user) => (
                                  <Badge key={user.id} className="bg-[#DA123E] text-white hover:bg-[#DA123E]/80">
                                    {user.full_name || user.email}
                                    <button
                                      onClick={() => removeUser(user.id)}
                                      className="ml-2 hover:text-gray-300"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {formData.send_to_all && (
                        <p className="text-sm text-gray-400">
                          Will be sent to all {users.length} registered users
                        </p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Manual Email Entry */}
                <div className="mb-4 p-4 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Mail className="w-4 h-4" /> Manual Entry
                    </Label>
                    <Switch
                      checked={includeManual}
                      onCheckedChange={setIncludeManual}
                    />
                  </div>
                  
                  {includeManual && (
                    <div>
                      <Label className="text-gray-400 text-sm">Enter email addresses (comma or new line separated)</Label>
                      <Textarea
                        value={manualEmails}
                        onChange={(e) => setManualEmails(e.target.value)}
                        placeholder="example@gmail.com, friend@yahoo.com&#10;colleague@outlook.com"
                        rows={4}
                        className="mt-2 bg-[#0b0821] border-[#DA123E33] text-white"
                      />
                      {manualEmailCount > 0 && (
                        <p className="text-xs text-green-500 mt-1">{manualEmailCount} email(s) detected</p>
                      )}
                    </div>
                  )}
                </div>
                
                {/* File Upload (CSV/TXT) */}
                <div className="p-4 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-gray-300 flex items-center gap-2">
                      <Upload className="w-4 h-4" /> Upload CSV/TXT File
                    </Label>
                    <Switch
                      checked={includeUpload}
                      onCheckedChange={setIncludeUpload}
                    />
                  </div>
                  
                  {includeUpload && (
                    <div className="space-y-3">
                      <Input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                        className="bg-[#0b0821] border-[#DA123E33] text-white"
                      />
                      
                      {isUploading && (
                        <div className="space-y-2">
                          <Progress value={uploadProgress} className="h-2" />
                          <p className="text-xs text-gray-400">Processing file... {uploadProgress}%</p>
                        </div>
                      )}
                      
                      {uploadedEmails.length > 0 && !isUploading && (
                        <div className="border border-[#DA123E33] rounded-lg p-3">
                          <p className="text-sm text-green-500 mb-2">
                            Loaded {uploadedEmails.length} emails from {uploadFileName}
                          </p>
                          <div className="max-h-32 overflow-y-auto">
                            <div className="flex flex-wrap gap-2">
                              {uploadedEmails.slice(0, 20).map((email, idx) => (
                                <Badge key={idx} className="bg-green-600 text-white text-xs">
                                  {email}
                                </Badge>
                              ))}
                              {uploadedEmails.length > 20 && (
                                <Badge className="bg-gray-600 text-white text-xs">
                                  +{uploadedEmails.length - 20} more
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipients Summary */}
              {totalRecipients > 0 && (
                <div className="p-3 rounded-lg bg-[#DA123E]/10 border border-[#DA123E33]">
                  <p className="text-sm text-white">
                    <strong>Total Recipients: {totalRecipients}</strong>
                  </p>
                  <div className="text-xs text-gray-400 mt-1">
                    {includeExisting && (
                      <span>• Platform users: {formData.send_to_all ? users.length : selectedUsers.length}</span>
                    )}
                    {includeManual && manualEmailCount > 0 && (
                      <span className="ml-2">• Manual entries: {manualEmailCount}</span>
                    )}
                    {includeUpload && uploadedEmails.length > 0 && (
                      <span className="ml-2">• Uploaded: {uploadedEmails.length}</span>
                    )}
                  </div>
                </div>
              )}

              {/* Send Button */}
              <Button 
                onClick={handleSend} 
                disabled={loading || totalRecipients === 0 || !selectedSenderId}
                className="w-full bg-[#DA123E] hover:bg-[#DA123E]/80 text-white"
                size="lg"
              >
                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {loading ? 'Sending...' : `Send Email to ${totalRecipients} Recipient${totalRecipients !== 1 ? 's' : ''}`}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="mt-6">
          <Card className="bg-[#1a0b2e] border-[#DA123E33]">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-white">Email Templates</CardTitle>
                  <CardDescription className="text-gray-400">Quick load templates for your emails</CardDescription>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewTemplateName('');
                    setSaveTemplateOpen(true);
                  }}
                  className="border-[#DA123E33] text-gray-300"
                >
                  <Plus className="w-4 h-4 mr-2" /> New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {templates.length === 0 ? (
                <p className="text-center text-gray-400 py-8">No templates found. Create your first template!</p>
              ) : (
                <div className="grid gap-3">
                  {templates.map((template) => (
                    <div key={template.id} className="border border-[#DA123E33] rounded-lg p-3 hover:bg-[#0b0821] transition-colors cursor-pointer" onClick={() => loadTemplate(template.id)}>
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#DA123E]" />
                            <h3 className="font-semibold text-white">{template.template_name}</h3>
                            {template.is_default && (
                              <Badge className="bg-gold text-black text-xs">Default</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1">Subject: {template.subject_line}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            loadTemplate(template.id);
                          }}
                          className="border-[#DA123E33] text-gray-300"
                        >
                          <FileText className="w-3 h-3 mr-1" /> Load
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Manage Templates Tab */}
        <TabsContent value="manage" className="mt-6">
          <EmailTemplateManager />
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-[#1a0b2e] border border-[#DA123E33]">
          <DialogHeader>
            <DialogTitle className="text-white">Email Preview</DialogTitle>
          </DialogHeader>
          <div className="border border-[#DA123E33] rounded-lg p-4 bg-white dark:bg-gray-900">
            <div className="text-sm text-gray-500 mb-2 pb-2 border-b">
              Subject: {formData.subject}
            </div>
            <div 
              className="prose dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ 
                __html: formData.message
                  .replace(/{{name}}/g, 'John Doe')
                  .replace(/{{email}}/g, 'user@example.com')
                  .replace(/{{date}}/g, new Date().toLocaleDateString())
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="border-gray-600 text-gray-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="bg-[#1a0b2e] border border-[#DA123E33]">
          <DialogHeader>
            <DialogTitle className="text-white">Save as Template</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-gray-300">Template Name</Label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g., Welcome Email, Deposit Confirmation"
                className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setSaveTemplateOpen(false)} className="border-gray-600 text-gray-300">
                Cancel
              </Button>
              <Button onClick={saveAsTemplate} className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white">
                <Save className="w-4 h-4 mr-2" /> Save Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Senders Dialog */}
      <Dialog open={manageSendersOpen} onOpenChange={setManageSendersOpen}>
        <DialogContent className="max-w-2xl bg-[#1a0b2e] border border-[#DA123E33]">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingSender ? 'Edit Email Sender' : 'Add Email Sender'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Existing Senders List */}
            {senders.length > 0 && !editingSender && (
              <div className="space-y-2">
                <Label className="text-gray-300">Configured Senders</Label>
                <div className="border border-[#DA123E33] rounded-lg max-h-48 overflow-y-auto">
                  {senders.map((sender) => (
                    <div key={sender.id} className="flex justify-between items-center p-3 border-b border-[#DA123E33] last:border-0">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{sender.name}</span>
                          {sender.is_default && (
                            <Badge className="bg-gold text-black text-xs">Default</Badge>
                          )}
                          <Badge className="bg-gray-600 text-white text-xs">{sender.provider}</Badge>
                        </div>
                        <p className="text-xs text-gray-400">{sender.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setEditingSender(sender);
                            setSenderForm({
                              name: sender.name,
                              provider: sender.provider,
                              email: sender.email,
                              smtp_host: sender.smtp_host || '',
                              smtp_port: sender.smtp_port?.toString() || '587',
                              smtp_user: sender.smtp_user || '',
                              smtp_pass: '',
                              is_default: sender.is_default,
                            });
                          }}
                          className="text-gray-400"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => deleteSender(sender)}
                          className="text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-[#DA123E33] pt-4">
              <h4 className="text-white font-medium mb-3">{editingSender ? 'Edit Sender' : 'Add New Sender'}</h4>
              
              <div className="space-y-3">
                <div>
                  <Label className="text-gray-300">Sender Name *</Label>
                  <Input
                    value={senderForm.name}
                    onChange={(e) => setSenderForm({ ...senderForm, name: e.target.value })}
                    placeholder="e.g., Universal Stock Trade, Support Team"
                    className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-300">Provider *</Label>
                  <Select value={senderForm.provider} onValueChange={(v) => setSenderForm({ ...senderForm, provider: v })}>
                    <SelectTrigger className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a0b2e] border-[#DA123E33]">
                      <SelectItem value="resend">Resend API</SelectItem>
                      <SelectItem value="gmail">Gmail SMTP</SelectItem>
                      <SelectItem value="smtp">Custom SMTP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-gray-300">Email Address *</Label>
                  <Input
                    value={senderForm.email}
                    onChange={(e) => setSenderForm({ ...senderForm, email: e.target.value })}
                    placeholder="sender@yourdomain.com"
                    className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                  />
                </div>

                {(senderForm.provider === 'gmail' || senderForm.provider === 'smtp') && (
                  <>
                    <div>
                      <Label className="text-gray-300">SMTP Host</Label>
                      <Input
                        value={senderForm.smtp_host}
                        onChange={(e) => setSenderForm({ ...senderForm, smtp_host: e.target.value })}
                        placeholder={senderForm.provider === 'gmail' ? 'smtp.gmail.com' : 'smtp.example.com'}
                        className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-300">Port</Label>
                        <Input
                          value={senderForm.smtp_port}
                          onChange={(e) => setSenderForm({ ...senderForm, smtp_port: e.target.value })}
                          placeholder="587"
                          className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-300">Username</Label>
                        <Input
                          value={senderForm.smtp_user}
                          onChange={(e) => setSenderForm({ ...senderForm, smtp_user: e.target.value })}
                          placeholder="your-email@gmail.com"
                          className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-gray-300">Password / App Password</Label>
                      <Input
                        type="password"
                        value={senderForm.smtp_pass}
                        onChange={(e) => setSenderForm({ ...senderForm, smtp_pass: e.target.value })}
                        placeholder="••••••••"
                        className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
                      />
                      {senderForm.provider === 'gmail' && (
                        <p className="text-xs text-gray-500 mt-1">
                          Use App Password (not your regular Gmail password). Get it from Google Account → Security → App Passwords.
                        </p>
                      )}
                    </div>
                  </>
                )}

                <div className="flex items-center gap-3">
                  <Switch
                    checked={senderForm.is_default}
                    onCheckedChange={(checked) => setSenderForm({ ...senderForm, is_default: checked })}
                  />
                  <Label className="text-gray-300">Set as default sender</Label>
                </div>

                <div className="flex gap-3 justify-end pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditingSender(null);
                      setSenderForm({
                        name: '',
                        provider: 'smtp',
                        email: '',
                        smtp_host: '',
                        smtp_port: '587',
                        smtp_user: '',
                        smtp_pass: '',
                        is_default: false,
                      });
                    }}
                    className="border-gray-600 text-gray-300"
                  >
                    Clear
                  </Button>
                  <Button onClick={saveSender} className="bg-[#DA123E] hover:bg-[#DA123E]/80 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    {editingSender ? 'Update Sender' : 'Add Sender'}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setManageSendersOpen(false)} className="border-gray-600 text-gray-300">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}