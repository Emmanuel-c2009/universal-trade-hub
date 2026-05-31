import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AIBot {
  id: string;
  name: string;
  description: string | null;
  monthly_cost: number;
  star_rating: number;
  profit_range_min: number;
  profit_range_max: number;
  is_active: boolean;
  trading_pairs: string[];
  avatar_url: string | null;
}

interface BotEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  bot: AIBot | null;
  isCreating: boolean;
  onSave: () => void;
}

export const BotEditModal = ({ isOpen, onClose, bot, isCreating, onSave }: BotEditModalProps) => {
  const [formData, setFormData] = useState({
    name: bot?.name || "",
    description: bot?.description || "",
    monthly_cost: bot?.monthly_cost || 0,
    star_rating: bot?.star_rating || 5,
    profit_range_min: bot?.profit_range_min || 5,
    profit_range_max: bot?.profit_range_max || 60,
    is_active: bot?.is_active ?? true,
    trading_pairs: bot?.trading_pairs || ["EUR/USD", "BTC/USD"],
  });
  const [newPair, setNewPair] = useState("");
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleAddPair = () => {
    if (newPair && !formData.trading_pairs.includes(newPair)) {
      setFormData({
        ...formData,
        trading_pairs: [...formData.trading_pairs, newPair.toUpperCase()],
      });
      setNewPair("");
    }
  };

  const handleRemovePair = (pair: string) => {
    setFormData({
      ...formData,
      trading_pairs: formData.trading_pairs.filter((p) => p !== pair),
    });
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: "Error",
        description: "Bot name is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      if (isCreating) {
        const { error } = await supabase.from('ai_bots').insert({
          name: formData.name,
          description: formData.description,
          monthly_cost: formData.monthly_cost,
          star_rating: formData.star_rating,
          profit_range_min: formData.profit_range_min,
          profit_range_max: formData.profit_range_max,
          is_active: formData.is_active,
          trading_pairs: formData.trading_pairs,
        });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Bot created successfully",
        });
      } else if (bot) {
        const { error } = await supabase
          .from('ai_bots')
          .update({
            name: formData.name,
            description: formData.description,
            monthly_cost: formData.monthly_cost,
            star_rating: formData.star_rating,
            profit_range_min: formData.profit_range_min,
            profit_range_max: formData.profit_range_max,
            is_active: formData.is_active,
            trading_pairs: formData.trading_pairs,
          })
          .eq('id', bot.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Bot updated successfully",
        });
      }

      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving bot:', error);
      toast({
        title: "Error",
        description: "Failed to save bot",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

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
          className="relative bg-card border border-border rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto z-10"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">
              {isCreating ? "Create New Bot" : "Edit Bot"}
            </h2>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label>Bot Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Quantum Scalar"
                className="mt-1"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the bot's trading strategy..."
                className="mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Cost (€)</Label>
                <Input
                  type="number"
                  value={formData.monthly_cost}
                  onChange={(e) => setFormData({ ...formData, monthly_cost: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Star Rating</Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="5"
                  value={formData.star_rating}
                  onChange={(e) => setFormData({ ...formData, star_rating: parseFloat(e.target.value) || 5 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Profit Range Min (%)</Label>
                <Input
                  type="number"
                  value={formData.profit_range_min}
                  onChange={(e) => setFormData({ ...formData, profit_range_min: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Profit Range Max (%)</Label>
                <Input
                  type="number"
                  value={formData.profit_range_max}
                  onChange={(e) => setFormData({ ...formData, profit_range_max: parseFloat(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label>Active Status</Label>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>

            <div>
              <Label>Trading Pairs</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={newPair}
                  onChange={(e) => setNewPair(e.target.value)}
                  placeholder="e.g., XRP/USD"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPair()}
                />
                <Button type="button" onClick={handleAddPair} size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.trading_pairs.map((pair) => (
                  <Badge key={pair} variant="secondary" className="flex items-center gap-1">
                    {pair}
                    <button onClick={() => handleRemovePair(pair)}>
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
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
                  {isCreating ? "Create Bot" : "Save Changes"}
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
