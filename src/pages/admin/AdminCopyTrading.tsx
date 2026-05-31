import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CopyTradingStatusCard } from "@/components/admin/copytrading/StatusCard";
import { DefaultModeCard } from "@/components/admin/copytrading/DefaultModeCard";
import { ManualOverridePanel } from "@/components/admin/copytrading/ManualOverridePanel";
import { FixedOutcomePanel } from "@/components/admin/copytrading/FixedOutcomePanel";
import { ExpertOverrides } from "@/components/admin/copytrading/ExpertOverrides";
import { PresetsPanel } from "@/components/admin/copytrading/PresetsPanel";
import { SchedulesPanel } from "@/components/admin/copytrading/SchedulesPanel";
import { AuditLogPanel } from "@/components/admin/copytrading/AuditLogPanel";

export interface CopyTradingConfig {
  id: string;
  mode: string;
  manual_profit_enabled: boolean;
  profit_min: number;
  profit_max: number;
  profit_apply_all_durations: boolean;
  profit_1h_min: number;
  profit_1h_max: number;
  profit_4h_min: number;
  profit_4h_max: number;
  profit_12h_min: number;
  profit_12h_max: number;
  profit_24h_min: number;
  profit_24h_max: number;
  manual_loss_enabled: boolean;
  loss_min: number;
  loss_max: number;
  loss_apply_all_durations: boolean;
  loss_1h_min: number;
  loss_1h_max: number;
  loss_4h_min: number;
  loss_4h_max: number;
  loss_12h_min: number;
  loss_12h_max: number;
  loss_24h_min: number;
  loss_24h_max: number;
  profit_decay_enabled: boolean;
  profit_decay_at_trade: number;
  profit_decay_max: number;
  profit_decay_min: number;
  auto_randomization_enabled: boolean;
  auto_randomization_interval_minutes: number;
  last_randomization_at: string | null;
  fixed_outcome_enabled: boolean;
  fixed_profit_pct: number;
  fixed_loss_pct: number;
  fixed_outcome_duration_type: string;
  fixed_outcome_trade_count: number;
  fixed_outcome_time_minutes: number;
  fixed_outcome_started_at: string | null;
  last_configured_by: string | null;
  active_since: string;
  updated_at: string;
}

export const AdminCopyTrading = () => {
  const [config, setConfig] = useState<CopyTradingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    const { data, error } = await supabase
      .from("copy_trading_config")
      .select("*")
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching config:", error);
      toast.error("Failed to load configuration");
    } else {
      setConfig(data as unknown as CopyTradingConfig);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    fetchConfig();
  }, [fetchConfig]);

  const updateConfig = async (updates: Partial<CopyTradingConfig>, action: string, changes?: Record<string, unknown>) => {
    if (!config || !userId) return;

    const { error } = await supabase
      .from("copy_trading_config")
      .update({ ...updates, last_configured_by: userId } as Record<string, unknown>)
      .eq("id", config.id);

    if (error) {
      toast.error("Failed to update configuration");
      console.error(error);
      return;
    }

    // Audit log
    await supabase.from("copy_trading_audit_log").insert([{
      admin_id: userId,
      action,
      mode_from: config.mode,
      mode_to: (updates as any).mode || config.mode,
      changes: (changes || updates) as any,
    }]);

    toast.success("Configuration updated");
    fetchConfig();
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-secondary" />
      </div>
    );
  }

  if (!config) {
    return <div className="p-6 text-destructive">Failed to load configuration.</div>;
  }

  const modeBadge = config.fixed_outcome_enabled
    ? { label: "Fixed Outcome", color: "bg-red-500/20 text-red-400 border-red-500/30" }
    : config.mode === "manual_override"
    ? { label: "Manual Override", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" }
    : { label: "Default Random", color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Copy Trading Control Panel</h1>
          <p className="text-muted-foreground text-sm">Configure the trade randomization engine</p>
        </div>
        <Badge className={`${modeBadge.color} border text-sm px-3 py-1`}>
          {modeBadge.label}
        </Badge>
      </div>

      <CopyTradingStatusCard config={config} onToggleMode={() => {
        const newMode = config.mode === "default_random" ? "manual_override" : "default_random";
        updateConfig({ mode: newMode } as Partial<CopyTradingConfig>, "mode_switch", { from: config.mode, to: newMode });
      }} />

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1 h-auto">
          <TabsTrigger value="config">Configuration</TabsTrigger>
          <TabsTrigger value="experts">Expert Overrides</TabsTrigger>
          <TabsTrigger value="presets">Presets</TabsTrigger>
          <TabsTrigger value="schedules">Schedules</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-6">
          {config.mode === "default_random" ? (
            <DefaultModeCard config={config} onCopyToManual={() => {
              updateConfig({ mode: "manual_override", manual_profit_enabled: true, manual_loss_enabled: true } as Partial<CopyTradingConfig>, "copy_to_manual");
            }} />
          ) : (
            <ManualOverridePanel config={config} onUpdate={updateConfig} />
          )}
          <FixedOutcomePanel config={config} onUpdate={updateConfig} />
        </TabsContent>

        <TabsContent value="experts">
          <ExpertOverrides userId={userId} />
        </TabsContent>

        <TabsContent value="presets">
          <PresetsPanel config={config} onApply={(preset) => {
            const presetConfig = preset.config as Record<string, unknown>;
            updateConfig({
              mode: "manual_override",
              manual_profit_enabled: true,
              manual_loss_enabled: true,
              profit_min: presetConfig.profit_min as number,
              profit_max: presetConfig.profit_max as number,
              loss_min: presetConfig.loss_min as number,
              loss_max: presetConfig.loss_max as number,
              auto_randomization_interval_minutes: presetConfig.interval as number,
              profit_decay_enabled: presetConfig.decay_enabled as boolean,
            } as Partial<CopyTradingConfig>, "preset_applied", { preset_name: preset.name });
          }} userId={userId} />
        </TabsContent>

        <TabsContent value="schedules">
          <SchedulesPanel userId={userId} />
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};
