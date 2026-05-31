import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

// Hardcoded expert list (matches CopyTrading.tsx)
const EXPERTS = [
  { id: "1", name: "Adriano Mendes" },
  { id: "2", name: "Sarah Chen" },
  { id: "3", name: "Marcus Weber" },
  { id: "4", name: "Elena Volkov" },
  { id: "5", name: "James O'Connor" },
  { id: "6", name: "Yuki Tanaka" },
];

interface ExpertOverride {
  id: string;
  expert_id: string;
  enabled: boolean;
  profit_min: number;
  profit_max: number;
  loss_min: number;
  loss_max: number;
  profit_decay_enabled: boolean;
  fixed_outcome_enabled: boolean;
  fixed_profit_pct: number;
  fixed_loss_pct: number;
}

export const ExpertOverrides = ({ userId }: { userId: string | null }) => {
  const [overrides, setOverrides] = useState<ExpertOverride[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<string>("");
  const [editOverride, setEditOverride] = useState<Partial<ExpertOverride> | null>(null);

  useEffect(() => {
    fetchOverrides();
  }, []);

  const fetchOverrides = async () => {
    const { data } = await supabase.from("copy_trading_expert_overrides").select("*");
    setOverrides((data || []) as unknown as ExpertOverride[]);
  };

  const handleSelectExpert = (expertId: string) => {
    setSelectedExpert(expertId);
    const existing = overrides.find(o => o.expert_id === expertId);
    if (existing) {
      setEditOverride(existing);
    } else {
      setEditOverride({ expert_id: expertId, enabled: false, profit_min: 0.5, profit_max: 15, loss_min: 0.5, loss_max: 100, profit_decay_enabled: true, fixed_outcome_enabled: false, fixed_profit_pct: 10, fixed_loss_pct: 0 });
    }
  };

  const handleSave = async () => {
    if (!editOverride || !selectedExpert || !userId) return;

    const payload = {
      expert_id: selectedExpert,
      enabled: editOverride.enabled || false,
      profit_min: editOverride.profit_min,
      profit_max: editOverride.profit_max,
      loss_min: editOverride.loss_min,
      loss_max: editOverride.loss_max,
      profit_decay_enabled: editOverride.profit_decay_enabled,
      fixed_outcome_enabled: editOverride.fixed_outcome_enabled,
      fixed_profit_pct: editOverride.fixed_profit_pct,
      fixed_loss_pct: editOverride.fixed_loss_pct,
      configured_by: userId,
    };

    const existing = overrides.find(o => o.expert_id === selectedExpert);
    if (existing) {
      await supabase.from("copy_trading_expert_overrides").update(payload as any).eq("id", existing.id);
    } else {
      await supabase.from("copy_trading_expert_overrides").insert([payload as any]);
    }

    // Audit
    await supabase.from("copy_trading_audit_log").insert([{
      admin_id: userId,
      action: "expert_override_update",
      changes: { expert_id: selectedExpert, ...payload } as any,
    }]);

    toast.success("Expert override saved");
    fetchOverrides();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Per-Expert Trader Override</h3>
        <p className="text-sm text-muted-foreground mb-4">Override global settings for specific expert traders. Per-expert settings take priority over global settings.</p>

        <div className="mb-6">
          <Label>Select Expert Trader</Label>
          <Select value={selectedExpert} onValueChange={handleSelectExpert}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Choose an expert..." />
            </SelectTrigger>
            <SelectContent>
              {EXPERTS.map(e => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                  {overrides.find(o => o.expert_id === e.id && o.enabled) && (
                    <span className="ml-2 text-purple-400">● Override Active</span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {editOverride && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={editOverride.enabled} onCheckedChange={v => setEditOverride({...editOverride, enabled: v})} />
                <Label>Enable Override for {EXPERTS.find(e => e.id === selectedExpert)?.name}</Label>
              </div>
              {editOverride.enabled && <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Active</Badge>}
            </div>

            {editOverride.enabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Profit Min %</Label>
                    <Input type="number" step="0.1" value={editOverride.profit_min} onChange={e => setEditOverride({...editOverride, profit_min: Number(e.target.value)})} className="h-8 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Profit Max %</Label>
                    <Input type="number" step="0.1" value={editOverride.profit_max} onChange={e => setEditOverride({...editOverride, profit_max: Number(e.target.value)})} className="h-8 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Loss Min %</Label>
                    <Input type="number" step="0.1" value={editOverride.loss_min} onChange={e => setEditOverride({...editOverride, loss_min: Number(e.target.value)})} className="h-8 mt-1" />
                  </div>
                  <div>
                    <Label className="text-xs">Loss Max %</Label>
                    <Input type="number" step="0.1" value={editOverride.loss_max} onChange={e => setEditOverride({...editOverride, loss_max: Number(e.target.value)})} className="h-8 mt-1" />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={editOverride.profit_decay_enabled} onCheckedChange={v => setEditOverride({...editOverride, profit_decay_enabled: v})} />
                  <Label className="text-sm">Profit Decay</Label>
                </div>

                <div className="flex items-center gap-2">
                  <Switch checked={editOverride.fixed_outcome_enabled} onCheckedChange={v => setEditOverride({...editOverride, fixed_outcome_enabled: v})} />
                  <Label className="text-sm">Fixed Outcome for this Expert</Label>
                </div>

                {editOverride.fixed_outcome_enabled && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs">Fixed Profit %</Label>
                      <Input type="number" step="0.1" value={editOverride.fixed_profit_pct} onChange={e => setEditOverride({...editOverride, fixed_profit_pct: Number(e.target.value)})} className="h-8 mt-1" />
                    </div>
                    <div>
                      <Label className="text-xs">Fixed Loss %</Label>
                      <Input type="number" step="0.1" value={editOverride.fixed_loss_pct} onChange={e => setEditOverride({...editOverride, fixed_loss_pct: Number(e.target.value)})} className="h-8 mt-1" />
                    </div>
                  </div>
                )}

                <Button onClick={handleSave} className="w-full">Save Expert Override</Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Active Overrides Summary */}
      {overrides.filter(o => o.enabled).length > 0 && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-semibold mb-3">Active Expert Overrides</h3>
          <div className="space-y-2">
            {overrides.filter(o => o.enabled).map(o => {
              const expert = EXPERTS.find(e => e.id === o.expert_id);
              return (
                <div key={o.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">Override</Badge>
                    <span className="font-medium">{expert?.name || o.expert_id}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    P: {o.profit_min}%-{o.profit_max}% | L: {o.loss_min}%-{o.loss_max}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Priority Hierarchy */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 text-sm">
        <h4 className="font-semibold mb-2">Priority Hierarchy</h4>
        <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
          <li><span className="text-red-400">Fixed Outcome Mode</span> (if enabled) → OVERRIDES EVERYTHING</li>
          <li><span className="text-purple-400">Per-Expert Override</span> (if enabled) → APPLIES TO SPECIFIC TRADER ONLY</li>
          <li><span className="text-blue-400">Global Manual Override</span> (if enabled) → APPLIES TO ALL OTHER TRADERS</li>
          <li><span className="text-emerald-400">Default Random Mode</span> → FALLBACK</li>
        </ol>
      </div>
    </div>
  );
};
