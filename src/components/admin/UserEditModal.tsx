// src/components/admin/UserEditModal.tsx - UPDATED WITH FUNDING_BALANCE (UI UNCHANGED)
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2, Wallet, Plus, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  fetchUserCryptoWallets,
  fetchSupportedCryptos,
  createUserCryptoWallet,
  updateUserCryptoWalletBalance,
  UserCryptoWallet,
  SupportedCrypto,
} from "@/services/adminService";

interface UserBalance {
  funding_balance: number;
  main_balance: number;
  trading_balance: number;
  litecoin_balance: number;
  bonus_balance: number;
  btc_balance: number;
  eth_balance: number;
  usdt_balance: number;
  bnb_balance: number;
  is_test_account: boolean;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  profile_status: string | null;
  phone: string | null;
  country: string | null;
  balances?: UserBalance | null;
}

interface UserEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
  onSave: () => void;
}

export const UserEditModal = ({ isOpen, onClose, user, onSave }: UserEditModalProps) => {
  const [formData, setFormData] = useState({
    full_name: user.full_name || "",
    profile_status: user.profile_status || "unverified",
    phone: user.phone || "",
    country: user.country || "",
    funding_balance: user.balances?.funding_balance || user.balances?.main_balance || 0,
    main_balance: user.balances?.main_balance || user.balances?.funding_balance || 0,
    trading_balance: user.balances?.trading_balance || 0,
    litecoin_balance: user.balances?.litecoin_balance || 0,
    bonus_balance: user.balances?.bonus_balance || 0,
    btc_balance: user.balances?.btc_balance || 0,
    eth_balance: user.balances?.eth_balance || 0,
    usdt_balance: user.balances?.usdt_balance || 0,
    bnb_balance: user.balances?.bnb_balance || 0,
  });
  const [saving, setSaving] = useState(false);
  const [balanceReason, setBalanceReason] = useState("");
  const [cryptoWallets, setCryptoWallets] = useState<UserCryptoWallet[]>([]);
  const [supportedCryptos, setSupportedCryptos] = useState<SupportedCrypto[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadCryptoData();
    }
  }, [isOpen, user.id]);

  const loadCryptoData = async () => {
    setLoadingWallets(true);
    try {
      const [wallets, cryptos] = await Promise.all([
        fetchUserCryptoWallets(user.id),
        fetchSupportedCryptos(),
      ]);
      setCryptoWallets(wallets);
      setSupportedCryptos(cryptos);
    } catch (error) {
      console.error("Error loading crypto data:", error);
    } finally {
      setLoadingWallets(false);
    }
  };

  const handleSave = async () => {
    if (!balanceReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the changes",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          profile_status: formData.profile_status,
          phone: formData.phone,
          country: formData.country,
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Update balances with audit log
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      const previousBalances = user.balances || {
        funding_balance: 0,
        main_balance: 0,
        trading_balance: 0,
        litecoin_balance: 0,
        bonus_balance: 0,
        btc_balance: 0,
        eth_balance: 0,
        usdt_balance: 0,
        bnb_balance: 0,
      };

      // Log each balance change
      const balanceFields = [
        { field: 'funding_balance', prev: previousBalances.funding_balance || previousBalances.main_balance, curr: formData.funding_balance },
        { field: 'main_balance', prev: previousBalances.main_balance || previousBalances.funding_balance, curr: formData.main_balance },
        { field: 'trading_balance', prev: previousBalances.trading_balance, curr: formData.trading_balance },
        { field: 'litecoin_balance', prev: previousBalances.litecoin_balance, curr: formData.litecoin_balance },
        { field: 'bonus_balance', prev: previousBalances.bonus_balance, curr: formData.bonus_balance },
        { field: 'btc_balance', prev: previousBalances.btc_balance, curr: formData.btc_balance },
        { field: 'eth_balance', prev: previousBalances.eth_balance, curr: formData.eth_balance },
        { field: 'usdt_balance', prev: previousBalances.usdt_balance, curr: formData.usdt_balance },
        { field: 'bnb_balance', prev: previousBalances.bnb_balance, curr: formData.bnb_balance },
      ];

      for (const bal of balanceFields) {
        if (bal.prev !== bal.curr) {
          await supabase.from('balance_audit_log').insert({
            user_id: user.id,
            admin_id: adminUser?.id,
            balance_type: bal.field,
            previous_value: bal.prev || 0,
            new_value: bal.curr,
            change_amount: bal.curr - (bal.prev || 0),
            reason: balanceReason,
          });
        }
      }

      // Update balances - updates both funding_balance and main_balance for compatibility
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({
          // Main balance (funding_balance is the primary)
          funding_balance: formData.funding_balance,
          main_balance: formData.funding_balance,
          trading_balance: formData.trading_balance,
          bonus_balance: formData.bonus_balance,
          challenges_balance: 0,
          
          // Crypto balances
          btc_balance: formData.btc_balance || 0,
          eth_balance: formData.eth_balance || 0,
          usdt_balance: formData.usdt_balance || 0,
          litecoin_balance: formData.litecoin_balance || 0,
          bnb_balance: formData.bnb_balance || 0,
          
          // Original columns for compatibility
          balance_btc: formData.btc_balance || 0,
          balance_eth: formData.eth_balance || 0,
          balance_usdt: formData.usdt_balance || 0,
          balance_ltc: formData.litecoin_balance || 0,
          balance_bnb: formData.bnb_balance || 0,
          
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (balanceError) {
        console.error('Balance update error:', balanceError);
        throw balanceError;
      }

      // Log admin action
      if (adminUser) {
        await supabase.from('admin_audit_log').insert([{
          actor_user_id: adminUser.id,
          target_user_id: user.id,
          action: 'user_edit',
          metadata: JSON.parse(JSON.stringify({
            reason: balanceReason,
            changes: formData,
            previous: {
              full_name: user.full_name,
              profile_status: user.profile_status,
              balances: previousBalances,
            },
          })),
        }]);
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      onSave();
      onClose();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: "Error",
        description: "Failed to update user",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAddCryptoWallet = async (cryptoId: string) => {
    try {
      await createUserCryptoWallet(user.id, cryptoId);
      toast({ title: "Wallet created" });
      loadCryptoData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create wallet",
        variant: "destructive",
      });
    }
  };

  const handleUpdateCryptoBalance = async (wallet: UserCryptoWallet, newBalance: number) => {
    if (!balanceReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the changes",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateUserCryptoWalletBalance(
        wallet.id,
        newBalance,
        user.id,
        wallet.crypto?.symbol || "UNKNOWN",
        wallet.balance,
        balanceReason
      );
      toast({ title: "Wallet balance updated" });
      loadCryptoData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update wallet",
        variant: "destructive",
      });
    }
  };

  const availableCryptos = supportedCryptos.filter(
    (c) => !cryptoWallets.some((w) => w.crypto_id === c.id)
  );

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative bg-card border border-border rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Edit User: {user.email}</h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="balances">Fiat Balances</TabsTrigger>
              <TabsTrigger value="crypto">Crypto Wallets</TabsTrigger>
            </TabsList>

            {/* Profile Tab - UI UNCHANGED */}
            <TabsContent value="profile" className="space-y-4">
              <div>
                <Label>Email (Read Only)</Label>
                <Input value={user.email || ""} disabled className="mt-1" />
              </div>

              <div>
                <Label>Full Name</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Status</Label>
                <Select
                  value={formData.profile_status}
                  onValueChange={(value) => setFormData({ ...formData, profile_status: value })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unverified">Unverified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Country</Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </TabsContent>

            {/* Fiat Balances Tab - UI UNCHANGED, but uses funding_balance */}
            <TabsContent value="balances" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Main Balance (€)</Label>
                  <Input
                    type="number"
                    value={formData.funding_balance}
                    onChange={(e) => setFormData({ ...formData, funding_balance: parseFloat(e.target.value) || 0, main_balance: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Trading Balance (€)</Label>
                  <Input
                    type="number"
                    value={formData.trading_balance}
                    onChange={(e) => setFormData({ ...formData, trading_balance: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Bonus Balance (€)</Label>
                  <Input
                    type="number"
                    value={formData.bonus_balance}
                    onChange={(e) => setFormData({ ...formData, bonus_balance: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Litecoin Balance (€)</Label>
                  <Input
                    type="number"
                    value={formData.litecoin_balance}
                    onChange={(e) => setFormData({ ...formData, litecoin_balance: parseFloat(e.target.value) || 0 })}
                    className="mt-1"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Direct Crypto (Legacy)
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>BTC Balance</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={formData.btc_balance}
                      onChange={(e) => setFormData({ ...formData, btc_balance: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>ETH Balance</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={formData.eth_balance}
                      onChange={(e) => setFormData({ ...formData, eth_balance: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>USDT Balance</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.usdt_balance}
                      onChange={(e) => setFormData({ ...formData, usdt_balance: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>BNB Balance</Label>
                    <Input
                      type="number"
                      step="0.00000001"
                      value={formData.bnb_balance}
                      onChange={(e) => setFormData({ ...formData, bnb_balance: parseFloat(e.target.value) || 0 })}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Crypto Wallets Tab - UI UNCHANGED */}
            <TabsContent value="crypto" className="space-y-4">
              {loadingWallets ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <>
                  {cryptoWallets.length > 0 ? (
                    <div className="space-y-3">
                      {cryptoWallets.map((wallet) => (
                        <div
                          key={wallet.id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Wallet className="w-5 h-5 text-gold" />
                            <div>
                              <p className="font-medium">{wallet.crypto?.symbol}</p>
                              <p className="text-xs text-muted-foreground">{wallet.crypto?.name}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              step="0.00000001"
                              defaultValue={wallet.balance}
                              className="w-32 text-right font-mono"
                              onBlur={(e) => {
                                const newBalance = parseFloat(e.target.value) || 0;
                                if (newBalance !== wallet.balance) {
                                  handleUpdateCryptoBalance(wallet, newBalance);
                                }
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      No crypto wallets configured for this user
                    </p>
                  )}

                  {availableCryptos.length > 0 && (
                    <div className="border-t pt-4">
                      <Label>Add New Wallet</Label>
                      <div className="flex gap-2 mt-2">
                        <Select onValueChange={handleAddCryptoWallet}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select cryptocurrency" />
                          </SelectTrigger>
                          <SelectContent>
                            {availableCryptos.map((crypto) => (
                              <SelectItem key={crypto.id} value={crypto.id}>
                                {crypto.symbol} - {crypto.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
          </Tabs>

          {/* Reason Field (Required) - UI UNCHANGED */}
          <div className="mt-6 pt-4 border-t">
            <Label>Reason for Changes *</Label>
            <Textarea
              value={balanceReason}
              onChange={(e) => setBalanceReason(e.target.value)}
              placeholder="Explain why you're making these changes (required for audit)"
              className="mt-1"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="flex-1 bg-gradient-to-r from-secondary to-gold">
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};