import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Save, Play, Trash2 } from "lucide-react";
import type { CopyTradingConfig } from "@/pages/admin/AdminCopyTrading";

interface Preset {
  id: string;
  name: string;
  description: string | null;
  tags: string[];
  config: Record<string, unknown>;
  created_at: string;
}

interface PresetsPanelProps {
  config: CopyTradingConfig;
  onApply: (preset: Preset) => void;
  userId: string | null;
}

export const PresetsPanel = ({ config, onApply, userId }: PresetsPanelProps) => {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTags, setNewTags] = useState("");

  useEffect(() => {
    fetchPresets();
  }, []);

  const fetchPresets = async () => {
    const { data } = await supabase.from("copy_trading_presets").select("*").order("created_at");
    setPresets((data || []) as unknown as Preset[]);
  };

  const saveCurrentAsPreset = async () => {
    if (!newName.trim()) { toast.error("Name is required"); return; }
    await supabase.from("copy_trading_presets").insert([{
      name: newName,
      description: newDesc || null,
      tags: newTags.split(",").map(t => t.trim()).filter(Boolean),
      config: {
        profit_min: config.profit_min,
        profit_max: config.profit_max,
        loss_min: config.loss_min,
        loss_max: config.loss_max,
        interval: config.auto_randomization_interval_minutes,
        decay_enabled: config.profit_decay_enabled,
      } as any,
      created_by: userId,
    }]);
    toast.success("Preset saved");
    setNewName("");
    setNewDesc("");
    setNewTags("");
    fetchPresets();
  };

  const deletePreset = async (id: string) => {
    await supabase.from("copy_trading_presets").delete().eq("id", id);
    toast.success("Preset deleted");
    fetchPresets();
  };

  return (
    <div className="space-y-6">
      {/* Save Current */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Save Current Configuration as Preset</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>Preset Name *</Label>
            <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g., Weekend Promo" className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Optional" className="mt-1" />
          </div>
          <div>
            <Label>Tags (comma-separated)</Label>
            <Input value={newTags} onChange={e => setNewTags(e.target.value)} placeholder="e.g., promo, testing" className="mt-1" />
          </div>
        </div>
        <Button onClick={saveCurrentAsPreset} className="mt-4" disabled={!newName.trim()}>
          <Save className="w-4 h-4 mr-2" /> Save Preset
        </Button>
      </div>

      {/* Preset List */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Available Presets</h3>
        <div className="space-y-3">
          {presets.map(preset => {
            const c = preset.config;
            return (
              <div key={preset.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border border-border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{preset.name}</span>
                    {preset.tags?.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                  {preset.description && <p className="text-xs text-muted-foreground">{preset.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    P: {String(c.profit_min)}%-{String(c.profit_max)}% | L: {String(c.loss_min)}%-{String(c.loss_max)}% | Interval: {String(c.interval)}min
                  </p>
                </div>
                <div className="flex gap-2">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="default">
                        <Play className="w-3 h-3 mr-1" /> Apply
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apply Preset "{preset.name}"?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will switch to Manual Override mode and apply the preset settings. Existing active trades will not be affected.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => onApply(preset)}>Apply Preset</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                  <Button size="sm" variant="ghost" onClick={() => deletePreset(preset.id)}>
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            );
          })}
          {presets.length === 0 && <p className="text-muted-foreground text-sm">No presets configured yet.</p>}
        </div>
      </div>
    </div>
  );
};
