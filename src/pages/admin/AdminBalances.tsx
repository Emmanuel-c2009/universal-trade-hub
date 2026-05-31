import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Wallet, Edit, History, AlertCircle, Save, RefreshCw, Coins } from "lucide-react";
import { toast } from "sonner";
import { AdminCryptoManager } from "@/components/admin/AdminCryptoManager";

interface UserWithBalance {
  id: string;
  email: string;
  full_name: string;
  balance: {
    main_balance: number;
    trading_balance: number;
    bonus_balance: number;
    challenges_balance: number;
    litecoin_balance: number;
    btc_balance: number;
    eth_balance: number;
    usdt_balance: number;
    bnb_balance: number;
    total_profit: number;
    win_rate: number;
    total_trades: number;
    today_pnl: number;
    is_test_account: boolean;
  } | null;
}

interface AuditLog {
  id: string;
  user_id: string;
  balance_type: string;
  previous_value: number;
  new_value: number;
  change_amount: number;
  reason: string;
  created_at: string;
  admin_id: string | null;
}

const BALANCE_FIELDS = [
  { key: 'main_balance', label: 'Funding Balance', symbol: '€' },
  { key: 'trading_balance', label: 'Trading Balance', symbol: '€' },
  { key: 'bonus_balance', label: 'Bonus Balance', symbol: '€' },
  { key: 'challenges_balance', label: 'Challenges Balance', symbol: '€' },
  { key: 'btc_balance', label: 'BTC Wallet', symbol: 'BTC' },
  { key: 'eth_balance', label: 'ETH Wallet', symbol: 'ETH' },
  { key: 'usdt_balance', label: 'USDT Wallet', symbol: 'USDT' },
  { key: 'litecoin_balance', label: 'LTC Wallet', symbol: 'LTC' },
  { key: 'bnb_balance', label: 'BNB Wallet', symbol: 'BNB' },
  { key: 'total_profit', label: 'Total Profit', symbol: '€' },
  { key: 'win_rate', label: 'Win Rate', symbol: '%' },
  { key: 'total_trades', label: 'Total Trades', symbol: '' },
  { key: 'today_pnl', label: "Today's P&L", symbol: '€' },
];

const AdminBalances = () => {
  const [users, setUsers] = useState<UserWithBalance[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserWithBalance | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editField, setEditField] = useState("");
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      setLoading(false);
      return;
    }

    const { data: balances, error: balancesError } = await supabase
      .from('user_balances')
      .select('*');

    if (balancesError) {
      console.error('Error fetching balances:', balancesError);
    }

    const usersWithBalances = profiles?.map(profile => ({
      ...profile,
      balance: balances?.find(b => b.user_id === profile.id) || null
    })) || [];

    setUsers(usersWithBalances);
    setLoading(false);
  };

  const fetchAuditLogs = async (userId?: string) => {
    let query = supabase
      .from('balance_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (!error && data) {
      setAuditLogs(data);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, []);

  const filteredUsers = users.filter(user =>
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleEditBalance = (user: UserWithBalance, field: string) => {
    setSelectedUser(user);
    setEditField(field);
    setEditValue(user.balance?.[field as keyof typeof user.balance]?.toString() || '0');
    setEditReason('');
    setShowEditModal(true);
  };

  const handleSaveBalance = async () => {
    if (!selectedUser || !editField || !editReason) {
      toast.error('Please provide a reason for this adjustment');
      return;
    }

    setSaving(true);

    const previousValue = selectedUser.balance?.[editField as keyof typeof selectedUser.balance] || 0;
    const newValue = parseFloat(editValue);
    const changeAmount = newValue - Number(previousValue);

    // Update the balance
    const { error: updateError } = await supabase
      .from('user_balances')
      .update({ [editField]: newValue })
      .eq('user_id', selectedUser.id);

    if (updateError) {
      toast.error('Failed to update balance');
      setSaving(false);
      return;
    }

    // Get current admin user
    const { data: { user } } = await supabase.auth.getUser();

    // Log the change
    await supabase.from('balance_audit_log').insert({
      user_id: selectedUser.id,
      admin_id: user?.id,
      balance_type: editField,
      previous_value: Number(previousValue),
      new_value: newValue,
      change_amount: changeAmount,
      reason: editReason,
    });

    toast.success('Balance updated successfully');
    setSaving(false);
    setShowEditModal(false);
    fetchUsers();
    fetchAuditLogs(selectedUser.id);
  };

  const getTotalAssets = (balance: UserWithBalance['balance']) => {
    if (!balance) return 0;
    return (balance.main_balance || 0) + 
           (balance.trading_balance || 0) + 
           (balance.bonus_balance || 0) + 
           (balance.challenges_balance || 0);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Balance Management</h1>
          <p className="text-muted-foreground">View and edit all user balances</p>
        </div>
        <Button onClick={fetchUsers} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users & Balances</TabsTrigger>
          <TabsTrigger value="crypto">Crypto Management</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          {/* Search */}
          <Card className="p-4 mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {/* Users Table */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Total Assets</TableHead>
                  <TableHead>Funding</TableHead>
                  <TableHead>Trading</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Crypto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No users found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.full_name || 'N/A'}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-bold">
                        €{getTotalAssets(user.balance).toFixed(2)}
                      </TableCell>
                      <TableCell>€{(user.balance?.main_balance || 0).toFixed(2)}</TableCell>
                      <TableCell>€{(user.balance?.trading_balance || 0).toFixed(2)}</TableCell>
                      <TableCell>€{(user.balance?.bonus_balance || 0).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="text-xs">
                          <span className="text-orange-500">{(user.balance?.btc_balance || 0).toFixed(4)} BTC</span>
                          <br />
                          <span className="text-purple-500">{(user.balance?.eth_balance || 0).toFixed(4)} ETH</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {user.balance?.is_test_account ? (
                          <Badge variant="outline" className="border-gold text-gold">Demo</Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-500">Live</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedUser(user);
                            fetchAuditLogs(user.id);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>

          {/* Selected User Details */}
          {selectedUser && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="mt-6 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold">{selectedUser.full_name || 'Unknown User'}</h2>
                    <p className="text-muted-foreground">{selectedUser.email}</p>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedUser(null)}>
                    Close
                  </Button>
                </div>

                <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
                  {BALANCE_FIELDS.map((field) => (
                    <div key={field.key} className="p-4 bg-muted/50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{field.label}</span>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => handleEditBalance(selectedUser, field.key)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-xl font-bold">
                        {(() => {
                          const value = selectedUser.balance?.[field.key as keyof typeof selectedUser.balance];
                          const numValue = typeof value === 'number' ? value : 0;
                          if (field.symbol === '%' || field.symbol === '') {
                            return numValue;
                          } else if (field.symbol === '€') {
                            return `€${numValue.toFixed(2)}`;
                          } else {
                            return `${numValue.toFixed(6)} ${field.symbol}`;
                          }
                        })()}
                      </p>
                    </div>
                  ))}
                </div>

                {/* User's Recent Audit Logs */}
                <div className="mt-6">
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <History className="w-4 h-4" />
                    Recent Changes
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {auditLogs.filter(log => log.user_id === selectedUser.id).slice(0, 10).map((log) => (
                      <div key={log.id} className="p-3 bg-muted/30 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{log.balance_type}</span>
                          <span className={log.change_amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                            {log.change_amount >= 0 ? '+' : ''}{log.change_amount.toFixed(4)}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1">{log.reason}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              All Balance Changes
            </h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>User ID</TableHead>
                  <TableHead>Balance Type</TableHead>
                  <TableHead>Previous</TableHead>
                  <TableHead>New</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {log.user_id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{log.balance_type}</TableCell>
                    <TableCell>{log.previous_value.toFixed(4)}</TableCell>
                    <TableCell>{log.new_value.toFixed(4)}</TableCell>
                    <TableCell className={log.change_amount >= 0 ? 'text-green-500' : 'text-red-500'}>
                      {log.change_amount >= 0 ? '+' : ''}{log.change_amount.toFixed(4)}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{log.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="crypto">
          <AdminCryptoManager />
        </TabsContent>
      </Tabs>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {BALANCE_FIELDS.find(f => f.key === editField)?.label}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">User</p>
              <p className="font-medium">{selectedUser?.email}</p>
            </div>

            <div>
              <Label>New Value</Label>
              <Input
                type="number"
                step="0.000001"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Reason for Adjustment *</Label>
              <Select value={editReason} onValueChange={setEditReason}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit_approved">Deposit Approved</SelectItem>
                  <SelectItem value="withdrawal_processed">Withdrawal Processed</SelectItem>
                  <SelectItem value="bonus_credit">Bonus Credit</SelectItem>
                  <SelectItem value="trading_profit">Trading Profit</SelectItem>
                  <SelectItem value="trading_loss">Trading Loss</SelectItem>
                  <SelectItem value="correction">Balance Correction</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {editReason === 'other' && (
              <div>
                <Label>Custom Reason</Label>
                <Textarea
                  placeholder="Enter custom reason..."
                  onChange={(e) => setEditReason(e.target.value)}
                  className="mt-2"
                />
              </div>
            )}

            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 shrink-0" />
              <p className="text-sm text-muted-foreground">
                This action will be logged in the audit trail. Make sure the adjustment is correct.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBalance} disabled={saving || !editReason}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBalances;
