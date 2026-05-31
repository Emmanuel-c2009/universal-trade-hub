import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
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
import type { CopyTradingConfig } from "@/pages/admin/AdminCopyTrading";

interface FixedOutcomePanelProps {
  config: CopyTradingConfig;
  onUpdate: (updates: Partial<CopyTradingConfig>, action: string, changes?: Record<string, unknown>) => void;
}

export const FixedOutcomePanel = ({ config, onUpdate }: FixedOutcomePanelProps) => {
  const [enabled, setEnabled] = useState(config.fixed_outcome_enabled);
  const [profitPct, setProfitPct] = useState(config.fixed_profit_pct);
  const [lossPct, setLossPct] = useState(config.fixed_loss_pct);
  const [durationType, setDurationType] = useState(config.fixed_outcome_duration_type);
  const [tradeCount, setTradeCount] = useState(config.fixed_outcome_trade_count);
  const [timeMinutes, setTimeMinutes] = useState(config.fixed_outcome_time_minutes);

  const handleSave = () => {
    onUpdate({
      fixed_outcome_enabled: enabled,
      fixed_profit_pct: profitPct,
      fixed_loss_pct: lossPct,
      fixed_outcome_duration_type: durationType,
      fixed_outcome_trade_count: tradeCount,
      fixed_outcome_time_minutes: timeMinutes,
      fixed_outcome_started_at: enabled ? new Date().toISOString() : null,
    } as Partial<CopyTradingConfig>, enabled ? "fixed_outcome_enabled" : "fixed_outcome_disabled");
  };

  return (
    <div className={`bg-card border rounded-xl p-6 ${enabled ? "border-red-500/50" : "border-border"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {enabled && <AlertTriangle className="w-5 h-5 text-red-500" />}
          <h3 className="font-semibold text-lg">Fixed Outcome Override</h3>
        </div>
        {enabled ? (
          <span className="text-xs bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-1 rounded">ACTIVE</span>
        ) : (
          <span className="text-xs text-muted-foreground">Emergency / Testing</span>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          {!enabled ? (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <div className="flex items-center gap-2 cursor-pointer">
                  <Switch checked={enabled} />
                  <Label>Enable Fixed Outcome Mode</Label>
                </div>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2 text-red-500">
                    <AlertTriangle className="w-5 h-5" /> WARNING – Fixed Outcome Mode
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Fixed Outcome Mode removes all randomness. Every trade will receive the exact profit/loss percentage you set. This is intended for testing only. Are you sure?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => setEnabled(true)} className="bg-red-600 hover:bg-red-700">
                    Enable Fixed Mode
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : (
            <>
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              <Label>Fixed Outcome Mode Enabled</Label>
            </>
          )}
        </div>

        {enabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fixed Profit %</Label>
                <Input type="number" step="0.1" min={0} max={100} value={profitPct} onChange={e => setProfitPct(Number(e.target.value))} className="mt-1" />
              </div>
              <div>
                <Label>Fixed Loss %</Label>
                <Input type="number" step="0.1" min={0} max={100} value={lossPct} onChange={e => setLossPct(Number(e.target.value))} className="mt-1" />
              </div>
            </div>

            <div>
              <Label>Duration</Label>
              <Select value={durationType} onValueChange={setDurationType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="until_disabled">Apply until disabled</SelectItem>
                  <SelectItem value="trade_count">Apply to next N trades</SelectItem>
                  <SelectItem value="time_limit">Apply for N minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {durationType === "trade_count" && (
              <div>
                <Label>Number of trades</Label>
                <Input type="number" min={1} value={tradeCount} onChange={e => setTradeCount(Number(e.target.value))} className="mt-1" />
              </div>
            )}

            {durationType === "time_limit" && (
              <div>
                <Label>Duration (minutes)</Label>
                <Input type="number" min={1} value={timeMinutes} onChange={e => setTimeMinutes(Number(e.target.value))} className="mt-1" />
              </div>
            )}

            <Button onClick={handleSave} variant="destructive" className="w-full">
              Save Fixed Outcome Settings
            </Button>
          </>
        )}

        {!enabled && config.fixed_outcome_enabled && (
          <Button onClick={handleSave} variant="outline" className="w-full">
            Disable Fixed Outcome Mode
          </Button>
        )}
      </div>
    </div>
  );
};
