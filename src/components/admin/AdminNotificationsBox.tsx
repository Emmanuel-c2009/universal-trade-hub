import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Bell, Send, Loader2, Users, Search, X, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export function AdminNotificationsBox() {
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [sendToAll, setSendToAll] = useState(true);
  const [userSearchOpen, setUserSearchOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'announcement',
    priority: 'normal',
  });

  // Fetch all users
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, avatar_url')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      toast.error(`Failed to load users: ${error.message}`);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

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
    setSendToAll(false);
  };

  // Send notification
  const handleSend = async () => {
    if (!formData.title) {
      toast.error('Please enter a title');
      return;
    }
    if (!formData.message) {
      toast.error('Please enter a message');
      return;
    }

    let targetUsers: User[] = [];
    
    if (sendToAll) {
      targetUsers = users;
    } else {
      targetUsers = selectedUsers;
    }

    if (targetUsers.length === 0) {
      toast.error('No users selected');
      return;
    }

    setSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Insert notifications for each user using correct column names
      const notifications = targetUsers.map(user => ({
        user_id: user.id,
        title: formData.title,
        message: formData.message,
        type: formData.category,
        notification_type: 'admin_manual',
        priority: formData.priority,
        is_read: false,
        created_at: new Date().toISOString(),
      }));

      // Batch insert in chunks of 100
      const chunkSize = 100;
      for (let i = 0; i < notifications.length; i += chunkSize) {
        const chunk = notifications.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from('user_notifications')
          .insert(chunk);
        if (insertError) throw insertError;
      }

      // Log admin action
      await supabase
        .from('admin_communications')
        .insert({
          title: formData.title,
          message: formData.message,
          type: 'notification',
          category: formData.category,
          priority: formData.priority,
          send_to_all: sendToAll,
          recipient_emails: targetUsers.map(u => u.email),
          created_by: session.user.id,
          status: 'sent',
          sent_at: new Date().toISOString(),
          total_recipients: targetUsers.length,
          successful_sends: targetUsers.length,
        });

      toast.success(`Notification sent to ${targetUsers.length} users!`);
      
      // Reset form
      setFormData({
        title: '',
        message: '',
        category: 'announcement',
        priority: 'normal',
      });
      setSelectedUsers([]);
      setSendToAll(true);
      
    } catch (error: any) {
      toast.error(`Failed to send: ${error.message}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-[#1a0b2e] border-[#DA123E33]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Bell className="w-5 h-5 text-[#DA123E]" />
            Send Notification to Users
          </CardTitle>
          <CardDescription className="text-gray-400">
            Send bell notifications to all users or selected users
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Title */}
          <div>
            <Label className="text-gray-300">Notification Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Important Platform Update"
              className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-gray-300">Category</Label>
              <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
                <SelectTrigger className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a0b2e] border-[#DA123E33]">
                  <SelectItem value="announcement">📢 Announcement</SelectItem>
                  <SelectItem value="security">🔒 Security</SelectItem>
                  <SelectItem value="promotion">🎉 Promotion</SelectItem>
                  <SelectItem value="update">🔄 Update</SelectItem>
                  <SelectItem value="maintenance">🔧 Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-300">Priority</Label>
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
          </div>

          {/* Message */}
          <div>
            <Label className="text-gray-300">Notification Message *</Label>
            <Textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Enter the message users will see in their bell notification..."
              rows={4}
              className="mt-1 bg-[#0b0821] border-[#DA123E33] text-white"
            />
          </div>

          {/* Recipients Selection */}
          <div className="border-t border-[#DA123E33] pt-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold text-white">Send to</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">All Users</span>
                <Switch
                  checked={sendToAll}
                  onCheckedChange={(checked) => {
                    setSendToAll(checked);
                    if (checked) setSelectedUsers([]);
                  }}
                />
              </div>
            </div>

            {!sendToAll && (
              <div className="space-y-4">
                {/* User Search with Autocomplete */}
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
                
                {/* Selected Users Tags */}
                {selectedUsers.length > 0 && (
                  <div className="border border-[#DA123E33] rounded-lg p-3 max-h-48 overflow-y-auto">
                    <p className="text-xs text-gray-400 mb-2">Selected Users ({selectedUsers.length})</p>
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
            
            {sendToAll && (
              <div className="p-3 rounded-lg bg-[#0b0821] border border-[#DA123E33]">
                <p className="text-sm text-gray-400">
                  <Users className="w-4 h-4 inline mr-2" />
                  Notification will be sent to all {users.length} registered users
                </p>
              </div>
            )}
          </div>

          {/* Send Button */}
          <Button 
            onClick={handleSend} 
            disabled={sending}
            className="w-full bg-[#DA123E] hover:bg-[#DA123E]/80 text-white"
            size="lg"
          >
            {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Bell className="w-4 h-4 mr-2" />}
            {sending ? 'Sending...' : `Send Notification to ${sendToAll ? 'All Users' : `${selectedUsers.length} Users`}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}