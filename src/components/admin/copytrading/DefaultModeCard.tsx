import { Button } from "@/components/ui/button";
import type { CopyTradingConfig } from "@/pages/admin/AdminCopyTrading";

interface DefaultModeCardProps {
  config: CopyTradingConfig;
  onCopyToManual: () => void;
}

export const DefaultModeCard = ({ config, onCopyToManual }: DefaultModeCardProps) => {
  const profitRanges = [
    { label: "1 Hour", trades: "+0.5% to +15%", decay: "N/A" },
    { label: "4 Hours", trades: "+1% to +25%", decay: "N/A" },
    { label: "12 Hours", trades: "+2% to +45%", decay: "+1% to +25%" },
    { label: "24 Hours", trades: "+3% to +65%", decay: "+1% to +25%" },
  ];

  const lossRanges = [
    { label: "1 Hour", range: "-0.5% to -100%" },
    { label: "4 Hours", range: "-1% to -100%" },
    { label: "12 Hours", range: "-2% to -100%" },
    { label: "24 Hours", range: "-3% to -100%" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Default Profit Ranges</h3>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Read-Only</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Duration</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Trade 1-5</th>
                <th className="text-left py-2 text-muted-foreground font-medium">Trade 6-12 (Decay)</th>
              </tr>
            </thead>
            <tbody>
              {profitRanges.map((r) => (
                <tr key={r.label} className="border-b border-border/50">
                  <td className="py-2 font-medium">{r.label}</td>
                  <td className="py-2 text-emerald-400">{r.trades}</td>
                  <td className="py-2 text-amber-400">{r.decay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <h3 className="font-semibold text-lg mb-4">Default Loss Ranges</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-2 text-muted-foreground font-medium">Duration</th>
                <th className="text-left py-2 text-muted-foreground font-medium">All Trades</th>
              </tr>
            </thead>
            <tbody>
              {lossRanges.map((r) => (
                <tr key={r.label} className="border-b border-border/50">
                  <td className="py-2 font-medium">{r.label}</td>
                  <td className="py-2 text-red-400">{r.range}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Auto-Randomization Interval: <span className="font-medium text-foreground">5 Minutes (Fixed)</span></p>
            <p className="text-sm text-muted-foreground mt-1">Profit Decay: <span className="font-medium text-foreground">Active – Activates at Trade 6</span></p>
          </div>
          <Button onClick={onCopyToManual} variant="outline">
            Copy to Manual Override
          </Button>
        </div>
      </div>
    </div>
  );
};
