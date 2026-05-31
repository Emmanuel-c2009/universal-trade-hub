import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface AuditEntry {
  id: string;
  admin_id: string;
  action: string;
  mode_from: string | null;
  mode_to: string | null;
  changes: Record<string, unknown> | null;
  preset_used: string | null;
  created_at: string;
}

export const AuditLogPanel = () => {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    const { data } = await supabase
      .from("copy_trading_audit_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setLogs((data || []) as unknown as AuditEntry[]);
  };

  const filtered = filter === "all" ? logs : logs.filter(l => l.action.includes(filter));

  const exportCSV = () => {
    const headers = "Timestamp,Action,Mode From,Mode To,Changes\n";
    const rows = filtered.map(l =>
      `"${format(new Date(l.created_at), "yyyy-MM-dd HH:mm:ss")}","${l.action}","${l.mode_from || ""}","${l.mode_to || ""}","${JSON.stringify(l.changes || {}).replace(/"/g, '""')}"`
    ).join("\n");
    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "copy-trading-audit.csv";
    a.click();
  };

  const actionBadgeColor = (action: string) => {
    if (action.includes("mode_switch")) return "bg-blue-500/20 text-blue-400";
    if (action.includes("fixed")) return "bg-red-500/20 text-red-400";
    if (action.includes("expert")) return "bg-purple-500/20 text-purple-400";
    if (action.includes("preset")) return "bg-amber-500/20 text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Configuration Change Log</h3>
        <div className="flex items-center gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder="Filter..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Changes</SelectItem>
              <SelectItem value="mode_switch">Mode Switches</SelectItem>
              <SelectItem value="manual">Manual Config</SelectItem>
              <SelectItem value="fixed">Fixed Outcome</SelectItem>
              <SelectItem value="expert">Expert Overrides</SelectItem>
              <SelectItem value="preset">Preset Applied</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3 h-3 mr-1" /> CSV
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="py-2 text-muted-foreground font-medium">Timestamp</th>
              <th className="py-2 text-muted-foreground font-medium">Action</th>
              <th className="py-2 text-muted-foreground font-medium">Mode</th>
              <th className="py-2 text-muted-foreground font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(log => (
              <tr key={log.id} className="border-b border-border/50">
                <td className="py-2 font-mono text-xs">{format(new Date(log.created_at), "MMM d HH:mm:ss")}</td>
                <td className="py-2">
                  <Badge className={`${actionBadgeColor(log.action)} border-0 text-xs`}>{log.action}</Badge>
                </td>
                <td className="py-2 text-xs">
                  {log.mode_from && log.mode_to ? `${log.mode_from} → ${log.mode_to}` : log.mode_to || "-"}
                </td>
                <td className="py-2 text-xs text-muted-foreground max-w-[200px] truncate">
                  {log.preset_used ? `Preset: ${log.preset_used}` : log.changes ? JSON.stringify(log.changes).slice(0, 80) : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No audit entries found.</p>}
    </div>
  );
};
