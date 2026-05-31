import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { CopyTradingConfig } from "@/pages/admin/AdminCopyTrading";

interface ManualOverridePanelProps {
  config: CopyTradingConfig;
  onUpdate: (updates: Partial<CopyTradingConfig>, action: string, changes?: Record<string, unknown>) => void;
}

export const ManualOverridePanel = ({ config, onUpdate }: ManualOverridePanelProps) => {
  const [profitMin, setProfitMin] = useState(config.profit_min);
  const [profitMax, setProfitMax] = useState(config.profit_max);
  const [lossMin, setLossMin] = useState(config.loss_min);
  const [lossMax, setLossMax] = useState(config.loss_max);
  const [profitAllDurations, setProfitAllDurations] = useState(config.profit_apply_all_durations);
  const [lossAllDurations, setLossAllDurations] = useState(config.loss_apply_all_durations);
  const [decayEnabled, setDecayEnabled] = useState(config.profit_decay_enabled);
  const [decayAtTrade, setDecayAtTrade] = useState(config.profit_decay_at_trade);
  const [decayMax, setDecayMax] = useState(config.profit_decay_max);
  const [decayMin, setDecayMin] = useState(config.profit_decay_min);
  const [autoEnabled, setAutoEnabled] = useState(config.auto_randomization_enabled);
  const [autoInterval, setAutoInterval] = useState(config.auto_randomization_interval_minutes);

  // Per-duration profit
  const [p1hMin, setP1hMin] = useState(config.profit_1h_min);
  const [p1hMax, setP1hMax] = useState(config.profit_1h_max);
  const [p4hMin, setP4hMin] = useState(config.profit_4h_min);
  const [p4hMax, setP4hMax] = useState(config.profit_4h_max);
  const [p12hMin, setP12hMin] = useState(config.profit_12h_min);
  const [p12hMax, setP12hMax] = useState(config.profit_12h_max);
  const [p24hMin, setP24hMin] = useState(config.profit_24h_min);
  const [p24hMax, setP24hMax] = useState(config.profit_24h_max);

  // Per-duration loss
  const [l1hMin, setL1hMin] = useState(config.loss_1h_min);
  const [l1hMax, setL1hMax] = useState(config.loss_1h_max);
  const [l4hMin, setL4hMin] = useState(config.loss_4h_min);
  const [l4hMax, setL4hMax] = useState(config.loss_4h_max);
  const [l12hMin, setL12hMin] = useState(config.loss_12h_min);
  const [l12hMax, setL12hMax] = useState(config.loss_12h_max);
  const [l24hMin, setL24hMin] = useState(config.loss_24h_min);
  const [l24hMax, setL24hMax] = useState(config.loss_24h_max);

  const handleSave = () => {
    if (profitMin > profitMax || lossMin > lossMax) {
      return;
    }
    onUpdate({
      manual_profit_enabled: true,
      profit_min: profitMin, profit_max: profitMax, profit_apply_all_durations: profitAllDurations,
      profit_1h_min: p1hMin, profit_1h_max: p1hMax,
      profit_4h_min: p4hMin, profit_4h_max: p4hMax,
      profit_12h_min: p12hMin, profit_12h_max: p12hMax,
      profit_24h_min: p24hMin, profit_24h_max: p24hMax,
      manual_loss_enabled: true,
      loss_min: lossMin, loss_max: lossMax, loss_apply_all_durations: lossAllDurations,
      loss_1h_min: l1hMin, loss_1h_max: l1hMax,
      loss_4h_min: l4hMin, loss_4h_max: l4hMax,
      loss_12h_min: l12hMin, loss_12h_max: l12hMax,
      loss_24h_min: l24hMin, loss_24h_max: l24hMax,
      profit_decay_enabled: decayEnabled, profit_decay_at_trade: decayAtTrade,
      profit_decay_max: decayMax, profit_decay_min: decayMin,
      auto_randomization_enabled: autoEnabled,
      auto_randomization_interval_minutes: autoInterval,
    } as Partial<CopyTradingConfig>, "manual_config_update");
  };

  const DurationRow = ({ label, min, max, setMin, setMax }: { label: string; min: number; max: number; setMin: (v: number) => void; setMax: (v: number) => void }) => (
    <div className="grid grid-cols-3 gap-3 items-center">
      <span className="text-sm font-medium">{label}</span>
      <div>
        <Input type="number" step="0.1" min={0.1} max={100} value={min} onChange={e => setMin(Number(e.target.value))} className="h-8" />
      </div>
      <div>
        <Input type="number" step="0.1" min={0.1} max={100} value={max} onChange={e => setMax(Number(e.target.value))} className="h-8" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Profit Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4 text-emerald-400">Profit Configuration</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Profit %</Label>
              <div className="flex items-center gap-3 mt-1">
                <Slider value={[profitMin]} min={0.1} max={100} step={0.1} onValueChange={([v]) => setProfitMin(v)} className="flex-1" />
                <Input type="number" value={profitMin} onChange={e => setProfitMin(Number(e.target.value))} className="w-20 h-8" />
              </div>
            </div>
            <div>
              <Label>Maximum Profit %</Label>
              <div className="flex items-center gap-3 mt-1">
                <Slider value={[profitMax]} min={0.1} max={100} step={0.1} onValueChange={([v]) => setProfitMax(v)} className="flex-1" />
                <Input type="number" value={profitMax} onChange={e => setProfitMax(Number(e.target.value))} className="w-20 h-8" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={profitAllDurations} onCheckedChange={setProfitAllDurations} />
            <Label>Apply to All Durations</Label>
          </div>

          {!profitAllDurations && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className="w-4 h-4" /> Per-Duration Profit Ranges
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2 pl-4 border-l-2 border-border">
                <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground mb-1">
                  <span>Duration</span><span>Min %</span><span>Max %</span>
                </div>
                <DurationRow label="1 Hour" min={p1hMin} max={p1hMax} setMin={setP1hMin} setMax={setP1hMax} />
                <DurationRow label="4 Hours" min={p4hMin} max={p4hMax} setMin={setP4hMin} setMax={setP4hMax} />
                <DurationRow label="12 Hours" min={p12hMin} max={p12hMax} setMin={setP12hMin} setMax={setP12hMax} />
                <DurationRow label="24 Hours" min={p24hMin} max={p24hMax} setMin={setP24hMin} setMax={setP24hMax} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Loss Configuration */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4 text-red-400">Loss Configuration</h3>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Minimum Loss %</Label>
              <div className="flex items-center gap-3 mt-1">
                <Slider value={[lossMin]} min={0.1} max={100} step={0.1} onValueChange={([v]) => setLossMin(v)} className="flex-1" />
                <Input type="number" value={lossMin} onChange={e => setLossMin(Number(e.target.value))} className="w-20 h-8" />
              </div>
            </div>
            <div>
              <Label>Maximum Loss %</Label>
              <div className="flex items-center gap-3 mt-1">
                <Slider value={[lossMax]} min={0.1} max={100} step={0.1} onValueChange={([v]) => setLossMax(v)} className="flex-1" />
                <Input type="number" value={lossMax} onChange={e => setLossMax(Number(e.target.value))} className="w-20 h-8" />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch checked={lossAllDurations} onCheckedChange={setLossAllDurations} />
            <Label>Apply to All Durations</Label>
          </div>

          {!lossAllDurations && (
            <Collapsible>
              <CollapsibleTrigger className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                <ChevronDown className="w-4 h-4" /> Per-Duration Loss Ranges
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-3 space-y-2 pl-4 border-l-2 border-border">
                <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground mb-1">
                  <span>Duration</span><span>Min %</span><span>Max %</span>
                </div>
                <DurationRow label="1 Hour" min={l1hMin} max={l1hMax} setMin={setL1hMin} setMax={setL1hMax} />
                <DurationRow label="4 Hours" min={l4hMin} max={l4hMax} setMin={setL4hMin} setMax={setL4hMax} />
                <DurationRow label="12 Hours" min={l12hMin} max={l12hMax} setMin={setL12hMin} setMax={setL12hMax} />
                <DurationRow label="24 Hours" min={l24hMin} max={l24hMax} setMin={setL24hMin} setMax={setL24hMax} />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>

      {/* Profit Decay */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Profit Decay Override</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={decayEnabled} onCheckedChange={setDecayEnabled} />
            <Label>Enable Profit Decay</Label>
          </div>
          {decayEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">Activates at Trade #</Label>
                <Input type="number" min={2} max={20} value={decayAtTrade} onChange={e => setDecayAtTrade(Number(e.target.value))} className="h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Decay Min Profit %</Label>
                <Input type="number" step="0.1" value={decayMin} onChange={e => setDecayMin(Number(e.target.value))} className="h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs">Decay Max Profit %</Label>
                <Input type="number" step="0.1" value={decayMax} onChange={e => setDecayMax(Number(e.target.value))} className="h-8 mt-1" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Auto-Randomization */}
      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Auto-Randomization Interval</h3>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Switch checked={autoEnabled} onCheckedChange={setAutoEnabled} />
            <Label>Enable Auto-Randomization</Label>
          </div>
          {autoEnabled && (
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Every</Label>
              <Input type="number" min={1} max={1440} value={autoInterval} onChange={e => setAutoInterval(Number(e.target.value))} className="w-24 h-8" />
              <span className="text-sm text-muted-foreground">minutes</span>
            </div>
          )}
        </div>
      </div>

      <Button onClick={handleSave} className="w-full bg-blue-600 hover:bg-blue-700">
        Save Manual Override Configuration
      </Button>
    </div>
  );
};
