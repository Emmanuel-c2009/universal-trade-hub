// src/components/admin/UserEditModal.tsx - Phase 2A COMPLETE FIX
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2, MapPin, Phone, User, BadgeCheck, Coins } from "lucide-react";
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

interface UserBalance {
  funding_balance: number;
  main_balance: number;
  trading_balance: number;
  bonus_balance: number;
  challenges_balance: number;
  balance_eur: number;
  total_balance: number;
  is_test_account: boolean;
  usd_balance: number;
  btc_balance: number;
  eth_balance: number;
  ltc_balance: number;
  bnb_balance: number;
}

interface SupportedCrypto {
  id: string;
  symbol: string;
  name: string;
  is_active: boolean;
}

interface UserProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  profile_status: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  created_at: string | null;
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
    city: user.city || "",
    address: user.address || "",
    // EUR balances
    funding_balance: user.balances?.funding_balance || 0,
    trading_balance: user.balances?.trading_balance || 0,
    bonus_balance: user.balances?.bonus_balance || 0,
    challenges_balance: user.balances?.challenges_balance || 0,
    // Crypto balances
    usd_balance: user.balances?.usd_balance || 0,
    btc_balance: user.balances?.btc_balance || 0,
    eth_balance: user.balances?.eth_balance || 0,
    ltc_balance: user.balances?.ltc_balance || 0,
    bnb_balance: user.balances?.bnb_balance || 0,
  });
  const [saving, setSaving] = useState(false);
  const [balanceReason, setBalanceReason] = useState("");
  const [supportedCryptos, setSupportedCryptos] = useState<SupportedCrypto[]>([]);
  const [customBalances, setCustomBalances] = useState<Map<string, number>>(new Map());
  const { toast } = useToast();

  // Load supported cryptos when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSupportedCryptos();
      loadCustomCryptoBalances();
    }
  }, [isOpen, user.id]);

  const loadSupportedCryptos = async () => {
    try {
      // Fetch from supported_cryptos table
      const { data, error } = await supabase
        .from('supported_cryptos')
        .select('id, symbol, name, is_active')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) {
        console.error("Error loading supported cryptos:", error);
        return;
      }
      
      if (data) {
        setSupportedCryptos(data);
      }
    } catch (error) {
      console.error("Error loading supported cryptos:", error);
    }
  };

  const loadCustomCryptoBalances = async () => {
    try {
      // Fetch from user_crypto_wallets table
      const { data, error } = await supabase
        .from('user_crypto_wallets')
        .select('crypto_symbol, balance')
        .eq('user_id', user.id);
      
      if (error) {
        console.error("Error loading custom crypto balances:", error);
        return;
      }
      
      if (data) {
        const balanceMap = new Map();
        data.forEach(item => {
          balanceMap.set(item.crypto_symbol, Number(item.balance));
        });
        setCustomBalances(balanceMap);
      }
    } catch (error) {
      console.error("Error loading custom crypto balances:", error);
    }
  };

  // Format crypto value for display - supports decimal points
  const formatCryptoValue = (value: number): string => {
    if (value === 0) return '0';
    if (Math.abs(value) < 0.000001) return value.toFixed(8);
    if (Math.abs(value) < 0.001) return value.toFixed(6);
    if (Math.abs(value) < 1) return value.toFixed(4);
    return value.toString();
  };

  // Parse crypto value - supports both comma and dot decimals
  const parseCryptoValue = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    // Replace comma with dot for decimal support (European format)
    const cleaned = value.replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Handle number input changes
  const handleNumberChange = (field: string, value: string) => {
    const numValue = parseCryptoValue(value);
    setFormData(prev => ({ ...prev, [field]: numValue }));
  };

  // Handle custom crypto balance change
  const handleCustomCryptoChange = (symbol: string, value: string) => {
    const numValue = parseCryptoValue(value);
    setCustomBalances(prev => new Map(prev).set(symbol, numValue));
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
      // 1. Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: formData.full_name,
          profile_status: formData.profile_status,
          phone: formData.phone,
          country: formData.country,
          city: formData.city,
          address: formData.address,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // 2. Calculate total balance (EUR + Crypto)
      const totalBalance = Number(formData.funding_balance || 0) + 
                           Number(formData.trading_balance || 0) + 
                           Number(formData.bonus_balance || 0) + 
                           Number(formData.challenges_balance || 0) +
                           Number(formData.usd_balance || 0);

      // 3. Update user_balances (EUR balances)
      const { error: balanceError } = await supabase
        .from('user_balances')
        .update({
          funding_balance: Number(formData.funding_balance || 0),
          trading_balance: Number(formData.trading_balance || 0),
          bonus_balance: Number(formData.bonus_balance || 0),
          challenges_balance: Number(formData.challenges_balance || 0),
          main_balance: Number(formData.funding_balance || 0),
          balance_eur: Number(formData.funding_balance || 0),
          total_balance: totalBalance,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (balanceError) throw balanceError;

      // 4. Update user_wallet_balances (Main crypto table that dashboard reads from)
      const { error: walletError } = await supabase
        .from('user_wallet_balances')
        .upsert({
          user_id: user.id,
          usd_balance: Number(formData.usd_balance || 0),
          btc_balance: Number(formData.btc_balance || 0),
          eth_balance: Number(formData.eth_balance || 0),
          ltc_balance: Number(formData.ltc_balance || 0),
          bnb_balance: Number(formData.bnb_balance || 0),
          last_updated: new Date().toISOString(),
        }, { onConflict: 'user_id' });

      if (walletError) {
        console.error('Wallet update error:', walletError);
      }

      // 5. Update custom crypto balances in user_crypto_wallets
      for (const [symbol, balance] of customBalances) {
        const { error: customError } = await supabase
          .from('user_crypto_wallets')
          .upsert({
            user_id: user.id,
            crypto_symbol: symbol,
            balance: balance,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id, crypto_symbol' });
        
        if (customError) {
          console.error(`Error updating ${symbol}:`, customError);
        }
      }

      toast({
        title: "Success",
        description: `Updated ${user.full_name || user.email}'s balances successfully`,
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

  const displayTotal = Number(formData.funding_balance || 0) + 
                       Number(formData.trading_balance || 0) + 
                       Number(formData.bonus_balance || 0) + 
                       Number(formData.challenges_balance || 0) +
                       Number(formData.usd_balance || 0);

  // Filter out standard cryptos from custom list
  const standardCryptos = ['BTC', 'ETH', 'LTC', 'BNB', 'USDT'];
  const customCryptos = supportedCryptos.filter(c => !standardCryptos.includes(c.symbol));

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

          <Tabs defaultValue="eur" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="eur">EUR Balances</TabsTrigger>
              <TabsTrigger value="crypto">Crypto Balances</TabsTrigger>
              <TabsTrigger value="profile">Profile Info</TabsTrigger>
            </TabsList>

            {/* EUR Balances Tab */}
            <TabsContent value="eur" className="space-y-4">
              <div className="bg-gold/10 border border-gold/30 rounded-lg p-3 mb-2">
                <p className="text-sm text-gold">💰 Funding Balance is the main balance users see and use for trading</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gold">Funding Balance (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.funding_balance}
                    onChange={(e) => handleNumberChange('funding_balance', e.target.value)}
                    className="mt-1 border-gold/30 focus:border-gold"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Primary balance - users trade with this</p>
                </div>
                <div>
                  <Label>Trading Balance (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.trading_balance}
                    onChange={(e) => handleNumberChange('trading_balance', e.target.value)}
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Funds in active positions</p>
                </div>
                <div>
                  <Label>Bonus Balance (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.bonus_balance}
                    onChange={(e) => handleNumberChange('bonus_balance', e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Challenges Balance (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.challenges_balance}
                    onChange={(e) => handleNumberChange('challenges_balance', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              <div className="bg-muted/30 p-3 rounded-lg mt-2">
                <p className="text-sm">
                  Total EUR Balance: <span className="text-emerald-500 font-bold">
                    €{displayTotal.toLocaleString()}
                  </span>
                </p>
              </div>
            </TabsContent>

            {/* Crypto Balances Tab - Dynamic from supported_cryptos */}
            <TabsContent value="crypto" className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-2">
                <p className="text-sm text-blue-400">🪙 Use decimal point (.) for values - Example: 0.00000001</p>
              </div>
              
              {/* Standard Cryptos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-green-400">USDT Balance (€)</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formData.usd_balance}
                    onChange={(e) => handleNumberChange('usd_balance', e.target.value)}
                    className="mt-1 font-mono"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label className="text-orange-500">BTC Balance</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatCryptoValue(formData.btc_balance)}
                    onChange={(e) => handleNumberChange('btc_balance', e.target.value)}
                    className="mt-1 font-mono"
                    placeholder="0.00000000"
                  />
                </div>
                <div>
                  <Label className="text-blue-400">ETH Balance</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatCryptoValue(formData.eth_balance)}
                    onChange={(e) => handleNumberChange('eth_balance', e.target.value)}
                    className="mt-1 font-mono"
                    placeholder="0.00000000"
                  />
                </div>
                <div>
                  <Label className="text-gray-400">LTC Balance</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatCryptoValue(formData.ltc_balance)}
                    onChange={(e) => handleNumberChange('ltc_balance', e.target.value)}
                    className="mt-1 font-mono"
                    placeholder="0.00000000"
                  />
                </div>
                <div>
                  <Label className="text-yellow-500">BNB Balance</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    value={formatCryptoValue(formData.bnb_balance)}
                    onChange={(e) => handleNumberChange('bnb_balance', e.target.value)}
                    className="mt-1 font-mono"
                    placeholder="0.00000000"
                  />
                </div>
              </div>

              {/* Custom Cryptos - Dynamically loaded from supported_cryptos */}
              {customCryptos.length > 0 && (
                <div className="border-t pt-4 mt-4">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Coins className="w-4 h-4" />
                    Custom Cryptocurrencies
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {customCryptos.map((crypto) => {
                      const balance = customBalances.get(crypto.symbol) || 0;
                      return (
                        <div key={crypto.id}>
                          <Label>{crypto.symbol} Balance ({crypto.name})</Label>
                          <Input
                            type="text"
                            inputMode="decimal"
                            value={formatCryptoValue(balance)}
                            onChange={(e) => handleCustomCryptoChange(crypto.symbol, e.target.value)}
                            className="mt-1 font-mono"
                            placeholder="0.00000000"
                          />
                          <p className="text-xs text-muted-foreground mt-1">{crypto.name}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Profile Info Tab */}
            <TabsContent value="profile" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Email (Read Only)</Label>
                  <Input value={user.email || ""} disabled className="mt-1 bg-muted" />
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <User className="w-3 h-3" /> Full Name
                  </Label>
                  <Input
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="mt-1"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <BadgeCheck className="w-3 h-3" /> Status
                  </Label>
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

                <div>
                  <Label className="flex items-center gap-1">
                    <Phone className="w-3 h-3" /> Phone
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="mt-1"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <Label className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Country
                  </Label>
                  <Input
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="mt-1"
                    placeholder="Country"
                  />
                </div>

                <div>
                  <Label>City</Label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="mt-1"
                    placeholder="City"
                  />
                </div>

                <div className="col-span-2">
                  <Label>Address</Label>
                  <Textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="mt-1"
                    placeholder="Street address"
                    rows={2}
                  />
                </div>

                <div className="col-span-2">
                  <Label>Joined Date</Label>
                  <Input value={user.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"} disabled className="mt-1 bg-muted" />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Reason Field (Required) */}
          <div className="mt-6 pt-4 border-t">
            <Label>Reason for Changes *</Label>
            <Textarea
              value={balanceReason}
              onChange={(e) => setBalanceReason(e.target.value)}
              placeholder="Explain why you're making these changes (required for audit)"
              className="mt-1"
              rows={3}
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