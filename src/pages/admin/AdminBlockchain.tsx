// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Link as LinkIcon,
  Edit,
  Save,
  Plus,
  Trash2,
  Upload,
  QrCode,
  Percent,
  DollarSign,
  Bitcoin,
  Banknote,
  CreditCard,
  Truck,
  TrendingUp,
  TrendingDown,
  Shuffle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BlockchainAddress {
  id: string;
  address_type: "deposit" | "gateway";
  crypto_symbol: string;
  crypto_name: string;
  network: string;
  wallet_address: string;
  qr_code_url: string | null;
  is_active: boolean;
  display_order: number | null;
}

interface ShuffleSettings {
  id: number;
  shuffle_enabled: boolean;
  shuffle_interval_minutes: number;
  shuffle_mode: "random" | "sequential";
  updated_at: string;
}

interface FeeConfig {
  id: string;
  user_id: string | null;
  fee_enabled: boolean;
  crypto_enabled: boolean;
  bank_enabled: boolean;
  card_enabled: boolean;
  cash_mailing_enabled: boolean;
  crypto_fee_percent: number | null;
  bank_fee_percent: number | null;
  card_fee_percent: number | null;
  cash_mailing_fee_percent: number | null;
  crypto_min_limit: number | null;
  crypto_max_limit: number | null;
  bank_min_limit: number | null;
  bank_max_limit: number | null;
  card_min_limit: number | null;
  card_max_limit: number | null;
  cash_mailing_min_limit: number | null;
  cash_mailing_max_limit: number | null;
  minimum_withdrawal: number | null;
  custom_message: string | null;
}

export const AdminBlockchain = () => {
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<BlockchainAddress[]>([]);
  const [feeConfig, setFeeConfig] = useState<FeeConfig | null>(null);
  const [shuffleSettings, setShuffleSettings] = useState<ShuffleSettings>({
    id: 1,
    shuffle_enabled: false,
    shuffle_interval_minutes: 5,
    shuffle_mode: "random",
    updated_at: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<BlockchainAddress | null>(null);
  const [qrCodeFile, setQrCodeFile] = useState<File | null>(null);
  const [qrCodePreview, setQrCodePreview] = useState<string | null>(null);

  // Address form state
  const [addressForm, setAddressForm] = useState({
    address_type: "deposit" as "deposit" | "gateway",
    crypto_symbol: "",
    crypto_name: "",
    network: "",
    wallet_address: "",
    qr_code_url: "",
  });

  // Fee form state
  const [feeForm, setFeeForm] = useState({
    fee_enabled: true,
    crypto_enabled: true,
    bank_enabled: true,
    card_enabled: true,
    cash_mailing_enabled: true,
    crypto_fee_percent: 10,
    bank_fee_percent: 8,
    card_fee_percent: 8,
    cash_mailing_fee_percent: 15,
    crypto_min_limit: 100,
    crypto_max_limit: 50000,
    bank_min_limit: 100,
    bank_max_limit: 50000,
    card_min_limit: 100,
    card_max_limit: 10000,
    cash_mailing_min_limit: 20000,
    cash_mailing_max_limit: 100000,
    minimum_withdrawal: 100,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [addressesRes, feeRes, shuffleRes] = await Promise.all([
        supabase
          .from("blockchain_addresses")
          .select("*")
          .order("address_type")
          .order("display_order"),
        supabase
          .from("withdrawal_fee_config")
          .select("*")
          .is("user_id", null)
          .single(),
        supabase
          .from("blockchain_shuffle_settings")
          .select("*")
          .maybeSingle(),
      ]);

      if (addressesRes.data) setAddresses(addressesRes.data as BlockchainAddress[]);
      if (feeRes.data) {
        const data = feeRes.data as any;
        setFeeConfig(data as FeeConfig);
        setFeeForm({
          fee_enabled: data.fee_enabled,
          crypto_enabled: data.crypto_enabled !== undefined ? data.crypto_enabled : true,
          bank_enabled: data.bank_enabled !== undefined ? data.bank_enabled : true,
          card_enabled: data.card_enabled !== undefined ? data.card_enabled : true,
          cash_mailing_enabled: data.cash_mailing_enabled !== undefined ? data.cash_mailing_enabled : true,
          crypto_fee_percent: data.crypto_fee_percent || 10,
          bank_fee_percent: data.bank_fee_percent || 8,
          card_fee_percent: data.card_fee_percent || 8,
          cash_mailing_fee_percent: data.cash_mailing_fee_percent || 15,
          crypto_min_limit: data.crypto_min_limit || 100,
          crypto_max_limit: data.crypto_max_limit || 50000,
          bank_min_limit: data.bank_min_limit || 100,
          bank_max_limit: data.bank_max_limit || 50000,
          card_min_limit: data.card_min_limit || 100,
          card_max_limit: data.card_max_limit || 10000,
          cash_mailing_min_limit: data.cash_mailing_min_limit || 20000,
          cash_mailing_max_limit: data.cash_mailing_max_limit || 100000,
          minimum_withdrawal: data.minimum_withdrawal || 100,
        });
      }
      
      if (shuffleRes.data) {
        setShuffleSettings(shuffleRes.data as ShuffleSettings);
      }
    } catch (error) {
      console.error("Error fetching blockchain data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAddress = async () => {
    try {
      let qrCodeUrl = addressForm.qr_code_url;
      
      // Upload QR code image if a file was selected
      if (qrCodeFile) {
        const fileName = `gateway_qr/${Date.now()}-${qrCodeFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("public-assets")
          .upload(fileName, qrCodeFile);
        
        if (!uploadError && uploadData) {
          const { data: publicUrl } = supabase.storage
            .from("public-assets")
            .getPublicUrl(fileName);
          qrCodeUrl = publicUrl.publicUrl;
        }
      }
      
      if (editingAddress) {
        const { error } = await supabase
          .from("blockchain_addresses")
          .update({
            crypto_symbol: addressForm.crypto_symbol,
            crypto_name: addressForm.crypto_name,
            network: addressForm.network,
            wallet_address: addressForm.wallet_address,
            qr_code_url: qrCodeUrl || null,
          })
          .eq("id", editingAddress.id);

        if (error) throw error;
        toast({ title: "Address updated successfully" });
      } else {
        const { error } = await supabase.from("blockchain_addresses").insert({
          address_type: addressForm.address_type,
          crypto_symbol: addressForm.crypto_symbol,
          crypto_name: addressForm.crypto_name,
          network: addressForm.network,
          wallet_address: addressForm.wallet_address,
          qr_code_url: qrCodeUrl || null,
        });

        if (error) throw error;
        toast({ title: "Address created successfully" });
      }

      setAddressModalOpen(false);
      setEditingAddress(null);
      setQrCodeFile(null);
      setQrCodePreview(null);
      resetAddressForm();
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveShuffleSettings = async () => {
    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      // First, check if a row exists
      const { data: existing, error: checkError } = await supabase
        .from("blockchain_shuffle_settings")
        .select("id")
        .maybeSingle();
      
      console.log("Existing row:", existing);
      console.log("Check error:", checkError);
      
      let result;
      if (existing && existing.id) {
        // Update existing row
        console.log("Updating existing row with id:", existing.id);
        result = await supabase
          .from("blockchain_shuffle_settings")
          .update({
            shuffle_enabled: shuffleSettings.shuffle_enabled,
            shuffle_interval_minutes: shuffleSettings.shuffle_interval_minutes,
            shuffle_mode: shuffleSettings.shuffle_mode,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          })
          .eq("id", existing.id);
      } else {
        // Insert new row
        console.log("Inserting new row");
        result = await supabase
          .from("blockchain_shuffle_settings")
          .insert({
            shuffle_enabled: shuffleSettings.shuffle_enabled,
            shuffle_interval_minutes: shuffleSettings.shuffle_interval_minutes,
            shuffle_mode: shuffleSettings.shuffle_mode,
            updated_at: new Date().toISOString(),
            updated_by: user?.id,
          });
      }
      
      if (result.error) throw result.error;
      
      toast({ title: "Shuffle settings saved successfully" });
      fetchData();
    } catch (error: any) {
      console.error("Save error:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSaveFees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (feeConfig) {
        const { error } = await supabase
          .from("withdrawal_fee_config")
          .update({
            fee_enabled: feeForm.fee_enabled,
            crypto_enabled: feeForm.crypto_enabled,
            bank_enabled: feeForm.bank_enabled,
            card_enabled: feeForm.card_enabled,
            cash_mailing_enabled: feeForm.cash_mailing_enabled,
            crypto_fee_percent: feeForm.crypto_fee_percent,
            bank_fee_percent: feeForm.bank_fee_percent,
            card_fee_percent: feeForm.card_fee_percent,
            cash_mailing_fee_percent: feeForm.cash_mailing_fee_percent,
            crypto_min_limit: feeForm.crypto_min_limit,
            crypto_max_limit: feeForm.crypto_max_limit,
            bank_min_limit: feeForm.bank_min_limit,
            bank_max_limit: feeForm.bank_max_limit,
            card_min_limit: feeForm.card_min_limit,
            card_max_limit: feeForm.card_max_limit,
            cash_mailing_min_limit: feeForm.cash_mailing_min_limit,
            cash_mailing_max_limit: feeForm.cash_mailing_max_limit,
            minimum_withdrawal: feeForm.minimum_withdrawal,
          })
          .eq("id", feeConfig.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("withdrawal_fee_config").insert({
          fee_enabled: feeForm.fee_enabled,
          crypto_enabled: feeForm.crypto_enabled,
          bank_enabled: feeForm.bank_enabled,
          card_enabled: feeForm.card_enabled,
          cash_mailing_enabled: feeForm.cash_mailing_enabled,
          crypto_fee_percent: feeForm.crypto_fee_percent,
          bank_fee_percent: feeForm.bank_fee_percent,
          card_fee_percent: feeForm.card_fee_percent,
          cash_mailing_fee_percent: feeForm.cash_mailing_fee_percent,
          crypto_min_limit: feeForm.crypto_min_limit,
          crypto_max_limit: feeForm.crypto_max_limit,
          bank_min_limit: feeForm.bank_min_limit,
          bank_max_limit: feeForm.bank_max_limit,
          card_min_limit: feeForm.card_min_limit,
          card_max_limit: feeForm.card_max_limit,
          cash_mailing_min_limit: feeForm.cash_mailing_min_limit,
          cash_mailing_max_limit: feeForm.cash_mailing_max_limit,
          minimum_withdrawal: feeForm.minimum_withdrawal,
          created_by: user?.id,
        });

        if (error) throw error;
      }

      toast({ title: "Fee configuration saved successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleAddress = async (address: BlockchainAddress) => {
    try {
      const { error } = await supabase
        .from("blockchain_addresses")
        .update({ is_active: !address.is_active })
        .eq("id", address.id);

      if (error) throw error;
      toast({ title: `Address ${address.is_active ? "disabled" : "enabled"}` });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    if (!confirm("Are you sure you want to delete this address?")) return;

    try {
      const { error } = await supabase
        .from("blockchain_addresses")
        .delete()
        .eq("id", addressId);

      if (error) throw error;
      toast({ title: "Address deleted successfully" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const openEditAddress = (address: BlockchainAddress) => {
    setEditingAddress(address);
    setAddressForm({
      address_type: address.address_type,
      crypto_symbol: address.crypto_symbol,
      crypto_name: address.crypto_name,
      network: address.network,
      wallet_address: address.wallet_address,
      qr_code_url: address.qr_code_url || "",
    });
    setQrCodePreview(address.qr_code_url);
    setQrCodeFile(null);
    setAddressModalOpen(true);
  };

  const resetAddressForm = () => {
    setAddressForm({
      address_type: "deposit",
      crypto_symbol: "",
      crypto_name: "",
      network: "",
      wallet_address: "",
      qr_code_url: "",
    });
    setQrCodePreview(null);
    setQrCodeFile(null);
  };

  const depositAddresses = addresses.filter((a) => a.address_type === "deposit");
  const gatewayAddresses = addresses.filter((a) => a.address_type === "gateway");

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <LinkIcon className="w-6 h-6 text-secondary" />
            Blockchain Settings
          </h1>
          <p className="text-muted-foreground">
            Manage crypto addresses, withdrawal fees, limits, and auto-shuffle settings
          </p>
        </div>
        <Dialog open={addressModalOpen} onOpenChange={setAddressModalOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingAddress(null); resetAddressForm(); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingAddress ? "Edit Address" : "Add New Address"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!editingAddress && (
                <div className="space-y-2">
                  <Label>Address Type</Label>
                  <Select
                    value={addressForm.address_type}
                    onValueChange={(v) =>
                      setAddressForm({ ...addressForm, address_type: v as "deposit" | "gateway" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="deposit">Deposit Address</SelectItem>
                      <SelectItem value="gateway">Gateway (Fee) Address</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Crypto Symbol</Label>
                  <Input
                    value={addressForm.crypto_symbol}
                    onChange={(e) =>
                      setAddressForm({ ...addressForm, crypto_symbol: e.target.value.toUpperCase() })
                    }
                    placeholder="BTC"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Network</Label>
                  <Input
                    value={addressForm.network}
                    onChange={(e) => setAddressForm({ ...addressForm, network: e.target.value })}
                    placeholder="BTC / TRC20 / ERC20"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Crypto Name</Label>
                <Input
                  value={addressForm.crypto_name}
                  onChange={(e) => setAddressForm({ ...addressForm, crypto_name: e.target.value })}
                  placeholder="Bitcoin"
                />
              </div>
              <div className="space-y-2">
                <Label>Wallet Address</Label>
                <Input
                  value={addressForm.wallet_address}
                  onChange={(e) => setAddressForm({ ...addressForm, wallet_address: e.target.value })}
                  placeholder="bc1q..."
                />
              </div>
              <div className="space-y-2">
                <Label>QR Code Image (Upload from device)</Label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setQrCodeFile(file);
                      const preview = URL.createObjectURL(file);
                      setQrCodePreview(preview);
                    }
                  }}
                  className="w-full p-2 border rounded-lg bg-background"
                />
                {qrCodePreview && (
                  <div className="mt-2 flex justify-center">
                    <img src={qrCodePreview} alt="QR Preview" className="w-24 h-24 border rounded-lg" />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">Upload a QR code image for this address (optional)</p>
              </div>
              <Button onClick={handleSaveAddress} className="w-full">
                {editingAddress ? "Update Address" : "Create Address"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="deposit" className="space-y-6">
        <TabsList>
          <TabsTrigger value="deposit">Deposit Addresses</TabsTrigger>
          <TabsTrigger value="gateway">Gateway Addresses</TabsTrigger>
          <TabsTrigger value="shuffle">Auto-Shuffle Settings</TabsTrigger>
          <TabsTrigger value="fees">Fee & Limit Configuration</TabsTrigger>
        </TabsList>

        {/* Deposit Addresses */}
        <TabsContent value="deposit">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">
                Deposit Addresses
                <Badge variant="secondary" className="ml-2">
                  {depositAddresses.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crypto</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>QR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {depositAddresses.map((addr) => (
                    <TableRow key={addr.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{addr.crypto_symbol}</p>
                          <p className="text-xs text-muted-foreground">{addr.crypto_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{addr.network}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px] block">
                          {addr.wallet_address}
                        </code>
                      </TableCell>
                      <TableCell>
                        {addr.qr_code_url ? (
                          <img src={addr.qr_code_url} alt="QR" className="w-8 h-8 rounded" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={addr.is_active}
                          onCheckedChange={() => handleToggleAddress(addr)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEditAddress(addr)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAddress(addr.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gateway Addresses */}
        <TabsContent value="gateway">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">
                Gateway (Fee Payment) Addresses
                <Badge variant="secondary" className="ml-2">
                  {gatewayAddresses.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Crypto</TableHead>
                    <TableHead>Network</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>QR</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {gatewayAddresses.map((addr) => (
                    <TableRow key={addr.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{addr.crypto_symbol}</p>
                          <p className="text-xs text-muted-foreground">{addr.crypto_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>{addr.network}</TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded truncate max-w-[200px] block">
                          {addr.wallet_address}
                        </code>
                      </TableCell>
                      <TableCell>
                        {addr.qr_code_url ? (
                          <img src={addr.qr_code_url} alt="QR" className="w-8 h-8 rounded" />
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={addr.is_active}
                          onCheckedChange={() => handleToggleAddress(addr)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => openEditAddress(addr)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteAddress(addr.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Auto-Shuffle Settings Tab */}
        <TabsContent value="shuffle">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-secondary" />
                Auto-Shuffle Address
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Automatically rotate payment addresses on the blockchain gateway page every X minutes
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Enable/Disable */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">🔄 Enable Auto-Shuffle</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, the blockchain gateway page will automatically change the payment address at the specified interval
                  </p>
                </div>
                <Switch
                  checked={shuffleSettings.shuffle_enabled}
                  onCheckedChange={(checked) => 
                    setShuffleSettings({ ...shuffleSettings, shuffle_enabled: checked })
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Shuffle Interval (Minutes)
                  </Label>
                  <Select
                    value={shuffleSettings.shuffle_interval_minutes.toString()}
                    onValueChange={(v) =>
                      setShuffleSettings({ ...shuffleSettings, shuffle_interval_minutes: parseInt(v) })
                    }
                    disabled={!shuffleSettings.shuffle_enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 minute</SelectItem>
                      <SelectItem value="2">2 minutes</SelectItem>
                      <SelectItem value="3">3 minutes</SelectItem>
                      <SelectItem value="5">5 minutes</SelectItem>
                      <SelectItem value="10">10 minutes</SelectItem>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    How often the address should change on the user's blockchain gateway page
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Shuffle className="w-4 h-4" />
                    Shuffle Mode
                  </Label>
                  <Select
                    value={shuffleSettings.shuffle_mode}
                    onValueChange={(v: "random" | "sequential") =>
                      setShuffleSettings({ ...shuffleSettings, shuffle_mode: v })
                    }
                    disabled={!shuffleSettings.shuffle_enabled}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="random">Random - Pick random address each time</SelectItem>
                      <SelectItem value="sequential">Sequential - Cycle through addresses in order</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Random: selects any available address. Sequential: cycles through addresses in order
                  </p>
                </div>
              </div>

              {/* How it works info */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="font-medium mb-2 flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  How Auto-Shuffle Works:
                </h3>
                <ul className="text-sm text-muted-foreground space-y-1 ml-4 list-disc">
                  <li>When ENABLED: The address changes every selected interval</li>
                  <li>When DISABLED: User selects from available gateway addresses manually</li>
                  <li>The timer on user page will reset when the address changes</li>
                  <li>After cycling through all addresses (sequential mode), the transaction is cancelled</li>
                  <li>Random mode will randomly pick from available addresses each time</li>
                </ul>
              </div>

              <Button onClick={handleSaveShuffleSettings} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Shuffle Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee & Limit Configuration */}
        <TabsContent value="fees">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Withdrawal Fee & Limit Configuration
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure blockchain network fees and withdrawal limits for each method.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Enable/Disable All */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">🌐 Master Enable Blockchain Network Fees</p>
                  <p className="text-sm text-muted-foreground">
                    Turn ON/OFF all blockchain fees at once.
                  </p>
                </div>
                <Switch
                  checked={feeForm.fee_enabled}
                  onCheckedChange={(checked) => setFeeForm({ ...feeForm, fee_enabled: checked })}
                />
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-4">Individual Method Settings</p>
                <div className="grid grid-cols-1 gap-6">
                  
                  {/* Crypto Withdrawal */}
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Bitcoin className="w-5 h-5 text-gold" />
                        <span className="font-medium">Crypto Withdrawal</span>
                      </div>
                      <Switch
                        checked={feeForm.crypto_enabled}
                        onCheckedChange={(checked) => setFeeForm({ ...feeForm, crypto_enabled: checked })}
                        disabled={!feeForm.fee_enabled}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Fee Percentage (%)</Label>
                        <Input
                          type="number"
                          value={feeForm.crypto_fee_percent}
                          onChange={(e) =>
                            setFeeForm({ ...feeForm, crypto_fee_percent: parseFloat(e.target.value) })
                          }
                          disabled={!feeForm.crypto_enabled || !feeForm.fee_enabled}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Min Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.crypto_min_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, crypto_min_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Max Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.crypto_max_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, crypto_max_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {feeForm.crypto_enabled ? "✅ Enabled" : "❌ Disabled"} - Fee: {feeForm.crypto_fee_percent}% | Limits: €{feeForm.crypto_min_limit} - €{feeForm.crypto_max_limit}
                    </p>
                  </div>

                  {/* Bank Withdrawal */}
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Banknote className="w-5 h-5 text-blue-500" />
                        <span className="font-medium">Bank Withdrawal</span>
                      </div>
                      <Switch
                        checked={feeForm.bank_enabled}
                        onCheckedChange={(checked) => setFeeForm({ ...feeForm, bank_enabled: checked })}
                        disabled={!feeForm.fee_enabled}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Fee Percentage (%)</Label>
                        <Input
                          type="number"
                          value={feeForm.bank_fee_percent}
                          onChange={(e) =>
                            setFeeForm({ ...feeForm, bank_fee_percent: parseFloat(e.target.value) })
                          }
                          disabled={!feeForm.bank_enabled || !feeForm.fee_enabled}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Min Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.bank_min_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, bank_min_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Max Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.bank_max_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, bank_max_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {feeForm.bank_enabled ? "✅ Enabled" : "❌ Disabled"} - Fee: {feeForm.bank_fee_percent}% | Limits: €{feeForm.bank_min_limit} - €{feeForm.bank_max_limit}
                    </p>
                  </div>

                  {/* Card Withdrawal */}
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-secondary" />
                        <span className="font-medium">Card Withdrawal</span>
                      </div>
                      <Switch
                        checked={feeForm.card_enabled}
                        onCheckedChange={(checked) => setFeeForm({ ...feeForm, card_enabled: checked })}
                        disabled={!feeForm.fee_enabled}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Fee Percentage (%)</Label>
                        <Input
                          type="number"
                          value={feeForm.card_fee_percent}
                          onChange={(e) =>
                            setFeeForm({ ...feeForm, card_fee_percent: parseFloat(e.target.value) })
                          }
                          disabled={!feeForm.card_enabled || !feeForm.fee_enabled}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Min Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.card_min_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, card_min_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Max Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.card_max_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, card_max_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {feeForm.card_enabled ? "✅ Enabled" : "❌ Disabled"} - Fee: {feeForm.card_fee_percent}% | Limits: €{feeForm.card_min_limit} - €{feeForm.card_max_limit}
                    </p>
                  </div>

                  {/* Cash Mailing */}
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Truck className="w-5 h-5 text-purple-500" />
                        <span className="font-medium">Cash Mailing</span>
                      </div>
                      <Switch
                        checked={feeForm.cash_mailing_enabled}
                        onCheckedChange={(checked) => setFeeForm({ ...feeForm, cash_mailing_enabled: checked })}
                        disabled={!feeForm.fee_enabled}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Fee Percentage (%)</Label>
                        <Input
                          type="number"
                          value={feeForm.cash_mailing_fee_percent}
                          onChange={(e) =>
                            setFeeForm({ ...feeForm, cash_mailing_fee_percent: parseFloat(e.target.value) })
                          }
                          disabled={!feeForm.cash_mailing_enabled || !feeForm.fee_enabled}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="flex items-center gap-1"><TrendingDown className="w-3 h-3" /> Min Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.cash_mailing_min_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, cash_mailing_min_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                        <div>
                          <Label className="flex items-center gap-1"><TrendingUp className="w-3 h-3" /> Max Limit (€)</Label>
                          <Input
                            type="number"
                            value={feeForm.cash_mailing_max_limit}
                            onChange={(e) =>
                              setFeeForm({ ...feeForm, cash_mailing_max_limit: parseFloat(e.target.value) })
                            }
                          />
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {feeForm.cash_mailing_enabled ? "✅ Enabled" : "❌ Disabled"} - Fee: {feeForm.cash_mailing_fee_percent}% | Limits: €{feeForm.cash_mailing_min_limit} - €{feeForm.cash_mailing_max_limit}
                    </p>
                  </div>
                </div>
              </div>

              {/* Global Minimum Withdrawal */}
              <div className="space-y-2 border-t border-border pt-4">
                <Label className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Global Minimum Withdrawal Amount (€)
                </Label>
                <Input
                  type="number"
                  value={feeForm.minimum_withdrawal}
                  onChange={(e) =>
                    setFeeForm({ ...feeForm, minimum_withdrawal: parseFloat(e.target.value) })
                  }
                  className="max-w-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Users cannot withdraw less than this amount (overrides method-specific min limits)
                </p>
              </div>

              <Button onClick={handleSaveFees} className="w-full md:w-auto">
                <Save className="w-4 h-4 mr-2" />
                Save Fee Configuration
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};