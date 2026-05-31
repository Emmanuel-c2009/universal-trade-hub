// src/components/admin/ManualReceiptModal.tsx

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { downloadReceipt, generateQRCodeDataURL, ReceiptData } from '@/utils/receiptGenerator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ManualReceiptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualReceiptModal({ open, onOpenChange }: ManualReceiptModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<ReceiptData>>({
    type: 'deposit',
    method: 'crypto',
    amount: 0,
    currency: 'EUR',
    status: 'approved',
    date: new Date(),
    userFullName: '',
    userEmail: '',
    cryptoType: '',
    network: '',
    walletAddress: '',
    cardLast4: '',
    bankName: '',
    accountNumber: '',
    transactionId: '',
    notes: '',
  });

  const searchUsers = async (term: string) => {
    if (term.length < 2) return;
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .ilike('full_name', `%${term}%`)
      .limit(10);
    setUsers(data || []);
    setShowUserDropdown(true);
  };

  const selectUser = (user: any) => {
    console.log("Selecting user:", user);
    setFormData({
      ...formData,
      userFullName: user.full_name,
      userEmail: user.email,
    });
    setSelectedUserId(user.id);
    setSearchTerm(`${user.full_name} (${user.email})`);
    setShowUserDropdown(false);
  };

  const handleDownload = async () => {
    console.log("Form data before validation:", {
      userFullName: formData.userFullName,
      userEmail: formData.userEmail,
      amount: formData.amount,
    });

    if (!formData.userFullName || !formData.userEmail) {
      toast({
        title: 'Error',
        description: 'Please select a user from the search dropdown',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast({
        title: 'Error',
        description: 'Please enter a valid amount (greater than 0)',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const qrUrl = await generateQRCodeDataURL('https://ustrader24.online/');
      await downloadReceipt(formData as ReceiptData, qrUrl);
      toast({ title: 'Success', description: 'Receipt downloaded successfully' });
      onOpenChange(false);
    } catch (error) {
      console.error("Download error:", error);
      toast({
        title: 'Error',
        description: 'Failed to generate receipt. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      type: 'deposit',
      method: 'crypto',
      amount: 0,
      currency: 'EUR',
      status: 'approved',
      date: new Date(),
      userFullName: '',
      userEmail: '',
      cryptoType: '',
      network: '',
      walletAddress: '',
      cardLast4: '',
      bankName: '',
      accountNumber: '',
      transactionId: '',
      notes: '',
    });
    setSearchTerm('');
    setSelectedUserId(null);
    setUsers([]);
    setShowUserDropdown(false);
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) resetForm();
      onOpenChange(newOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Manual Receipt</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* User Selection */}
          <div>
            <Label>Select User *</Label>
            <Input
              placeholder="Search user by name or email (min 2 characters)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                searchUsers(e.target.value);
              }}
              onFocus={() => {
                if (searchTerm.length >= 2) {
                  searchUsers(searchTerm);
                }
              }}
            />
            {showUserDropdown && users.length > 0 && (
              <div className="border rounded-md mt-1 max-h-40 overflow-y-auto bg-white z-50 relative shadow-lg">
                {users.map((user) => (
                  <div
                    key={user.id}
                    className="p-2 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                    onClick={() => selectUser(user)}
                  >
                    <div className="font-medium">{user.full_name || 'Unknown'}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                ))}
              </div>
            )}
            {formData.userFullName && (
              <p className="text-xs text-green-600 mt-1">✓ Selected: {formData.userFullName}</p>
            )}
          </div>

          {/* Type and Method */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Type</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="deposit">Deposit</SelectItem>
                  <SelectItem value="withdrawal">Withdrawal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Method</Label>
              <Select
                value={formData.method}
                onValueChange={(v) => setFormData({ ...formData, method: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="crypto">Crypto</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="p2p">P2P</SelectItem>
                  <SelectItem value="bank">Bank Transfer</SelectItem>
                  <SelectItem value="cash_mailing">Cash Mailing</SelectItem>
                  <SelectItem value="card_withdrawal">Withdrawal to Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Amount and Currency */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount === 0 ? '' : formData.amount}
                onChange={(e) =>
                  setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                }
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label>Currency</Label>
              <Input
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              />
            </div>
          </div>

          {/* Crypto-specific fields */}
          {formData.method === 'crypto' && (
            <>
              <div>
                <Label>Crypto Type</Label>
                <Input
                  value={formData.cryptoType}
                  onChange={(e) => setFormData({ ...formData, cryptoType: e.target.value })}
                  placeholder="e.g., Bitcoin, Ethereum, USDT"
                />
              </div>
              <div>
                <Label>Network</Label>
                <Input
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  placeholder="e.g., ERC20, BEP20, TRC20"
                />
              </div>
              <div>
                <Label>Wallet Address</Label>
                <Input
                  value={formData.walletAddress}
                  onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                  placeholder="Wallet address"
                />
              </div>
            </>
          )}

          {/* Card-specific fields */}
          {formData.method === 'card' && (
            <div>
              <Label>Card Last 4 Digits</Label>
              <Input
                maxLength={4}
                value={formData.cardLast4}
                onChange={(e) => setFormData({ ...formData, cardLast4: e.target.value })}
                placeholder="1234"
              />
            </div>
          )}

          {/* Bank-specific fields */}
          {formData.method === 'bank' && (
            <>
              <div>
                <Label>Bank Name</Label>
                <Input
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  placeholder="Bank name"
                />
              </div>
              <div>
                <Label>Account Number</Label>
                <Input
                  value={formData.accountNumber}
                  onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                  placeholder="Account number"
                />
              </div>
            </>
          )}

          {/* Common fields */}
          <div>
            <Label>Transaction ID (optional)</Label>
            <Input
              value={formData.transactionId}
              onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
              placeholder="Transaction reference"
            />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <Input
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleDownload} disabled={loading}>
              {loading ? 'Generating...' : 'Download Receipt'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}