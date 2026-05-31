import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Edit, ToggleLeft, Coins, Save, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  fetchSupportedCryptos,
  addSupportedCrypto,
  updateSupportedCrypto,
  SupportedCrypto,
} from "@/services/adminService";

export const AdminCryptoManager = () => {
  const [cryptos, setCryptos] = useState<SupportedCrypto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCrypto, setEditingCrypto] = useState<SupportedCrypto | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    symbol: "",
    name: "",
    network: "",
    decimals: 8,
    logo_url: "",
    is_active: true,
    allow_deposit: true,
    allow_withdrawal: true,
    allow_trading: true,
    min_deposit: 0,
    min_withdrawal: 0,
    withdrawal_fee: 0,
    display_order: 0,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await fetchSupportedCryptos();
      setCryptos(data);
    } catch (error) {
      console.error("Error fetching cryptos:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const resetForm = () => {
    setFormData({
      symbol: "",
      name: "",
      network: "",
      decimals: 8,
      logo_url: "",
      is_active: true,
      allow_deposit: true,
      allow_withdrawal: true,
      allow_trading: true,
      min_deposit: 0,
      min_withdrawal: 0,
      withdrawal_fee: 0,
      display_order: cryptos.length + 1,
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingCrypto(null);
    setShowAddModal(true);
  };

  const openEditModal = (crypto: SupportedCrypto) => {
    setEditingCrypto(crypto);
    setFormData({
      symbol: crypto.symbol,
      name: crypto.name,
      network: crypto.network,
      decimals: crypto.decimals,
      logo_url: crypto.logo_url || "",
      is_active: crypto.is_active,
      allow_deposit: crypto.allow_deposit,
      allow_withdrawal: crypto.allow_withdrawal,
      allow_trading: crypto.allow_trading,
      min_deposit: crypto.min_deposit,
      min_withdrawal: crypto.min_withdrawal,
      withdrawal_fee: crypto.withdrawal_fee,
      display_order: crypto.display_order,
    });
    setShowAddModal(true);
  };

  const handleSave = async () => {
    if (!formData.symbol || !formData.name || !formData.network) {
      toast.error("Please fill in all required fields");
      return;
    }

    setSaving(true);
    try {
      if (editingCrypto) {
        await updateSupportedCrypto(editingCrypto.id, formData);
        toast.success("Cryptocurrency updated");
      } else {
        await addSupportedCrypto(formData as any);
        toast.success("Cryptocurrency added");
      }
      setShowAddModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (crypto: SupportedCrypto) => {
    try {
      await updateSupportedCrypto(crypto.id, { is_active: !crypto.is_active });
      toast.success(`${crypto.symbol} ${crypto.is_active ? "disabled" : "enabled"}`);
      fetchData();
    } catch (error) {
      toast.error("Failed to update status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Coins className="w-5 h-5 text-gold" />
            Cryptocurrency Management
          </h2>
          <p className="text-sm text-muted-foreground">
            Add and configure supported cryptocurrencies
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-4 h-4 mr-2" />
          Add Crypto
        </Button>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Network</TableHead>
              <TableHead>Deposit</TableHead>
              <TableHead>Withdrawal</TableHead>
              <TableHead>Trading</TableHead>
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
            ) : cryptos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  No cryptocurrencies configured
                </TableCell>
              </TableRow>
            ) : (
              cryptos.map((crypto) => (
                <TableRow key={crypto.id}>
                  <TableCell className="font-bold">{crypto.symbol}</TableCell>
                  <TableCell>{crypto.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{crypto.network}</Badge>
                  </TableCell>
                  <TableCell>
                    {crypto.allow_deposit ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {crypto.allow_withdrawal ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {crypto.allow_trading ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400">Yes</Badge>
                    ) : (
                      <Badge variant="outline">No</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={crypto.is_active}
                      onCheckedChange={() => toggleActive(crypto)}
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => openEditModal(crypto)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCrypto ? `Edit ${editingCrypto.symbol}` : "Add Cryptocurrency"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Symbol *</Label>
                <Input
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="BTC"
                  disabled={!!editingCrypto}
                />
              </div>
              <div>
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Bitcoin"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Network *</Label>
                <Input
                  value={formData.network}
                  onChange={(e) => setFormData({ ...formData, network: e.target.value })}
                  placeholder="BTC / ERC20 / TRC20"
                />
              </div>
              <div>
                <Label>Decimals</Label>
                <Input
                  type="number"
                  value={formData.decimals}
                  onChange={(e) => setFormData({ ...formData, decimals: parseInt(e.target.value) })}
                />
              </div>
            </div>

            <div>
              <Label>Logo URL</Label>
              <Input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Min Deposit</Label>
                <Input
                  type="number"
                  value={formData.min_deposit}
                  onChange={(e) => setFormData({ ...formData, min_deposit: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Min Withdrawal</Label>
                <Input
                  type="number"
                  value={formData.min_withdrawal}
                  onChange={(e) => setFormData({ ...formData, min_withdrawal: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <Label>Withdrawal Fee</Label>
                <Input
                  type="number"
                  value={formData.withdrawal_fee}
                  onChange={(e) => setFormData({ ...formData, withdrawal_fee: parseFloat(e.target.value) })}
                />
              </div>
            </div>

            <div className="flex gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.allow_deposit}
                  onCheckedChange={(v) => setFormData({ ...formData, allow_deposit: v })}
                />
                <Label>Deposit</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.allow_withdrawal}
                  onCheckedChange={(v) => setFormData({ ...formData, allow_withdrawal: v })}
                />
                <Label>Withdrawal</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.allow_trading}
                  onCheckedChange={(v) => setFormData({ ...formData, allow_trading: v })}
                />
                <Label>Trading</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
