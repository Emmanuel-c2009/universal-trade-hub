import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, Trash2, Plus } from "lucide-react";

interface Schedule {
  id: string;
  name: string;
  scheduled_at: string;
  config: Record<string, unknown>;
  is_active: boolean;
  executed: boolean;
  executed_at: string | null;
  created_at: string;
}

export const SchedulesPanel = ({ userId }: { userId: string | null }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [action, setAction] = useState("manual_override");
  const [profitMax, setProfitMax] = useState(50);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    const { data } = await supabase.from("copy_trading_schedules").select("*").order("scheduled_at");
    setSchedules((data || []) as unknown as Schedule[]);
  };

  const createSchedule = async () => {
    if (!name || !scheduledAt || !userId) return;
    await supabase.from("copy_trading_schedules").insert([{
      name,
      scheduled_at: new Date(scheduledAt).toISOString(),
      config: { action, profit_max: profitMax } as any,
      created_by: userId,
    }]);
    toast.success("Schedule created");
    setShowForm(false);
    setName("");
    setScheduledAt("");
    fetchSchedules();
  };

  const deleteSchedule = async (id: string) => {
    await supabase.from("copy_trading_schedules").delete().eq("id", id);
    toast.success("Schedule deleted");
    fetchSchedules();
  };

  const toggleSchedule = async (id: string, active: boolean) => {
    await supabase.from("copy_trading_schedules").update({ is_active: active } as Record<string, unknown>).eq("id", id);
    fetchSchedules();
  };

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Scheduled Configuration Changes</h3>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-1" /> New Schedule
          </Button>
        </div>

        {showForm && (
          <div className="border border-border rounded-lg p-4 mb-4 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Weekend Promotion" className="mt-1" />
              </div>
              <div>
                <Label>Scheduled At</Label>
                <Input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Action</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_override">Switch to Manual Override</SelectItem>
                    <SelectItem value="default_random">Revert to Default Random</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {action === "manual_override" && (
                <div>
                  <Label>Max Profit %</Label>
                  <Input type="number" value={profitMax} onChange={e => setProfitMax(Number(e.target.value))} className="mt-1" />
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button onClick={createSchedule} disabled={!name || !scheduledAt}>Create Schedule</Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {schedules.map(s => (
            <div key={s.id} className="flex items-center justify-between py-3 px-4 border border-border rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(s.scheduled_at), "MMM d, yyyy HH:mm")}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {s.executed ? (
                  <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">Executed</Badge>
                ) : (
                  <Switch checked={s.is_active} onCheckedChange={v => toggleSchedule(s.id, v)} />
                )}
                <Button variant="ghost" size="icon" onClick={() => deleteSchedule(s.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {schedules.length === 0 && <p className="text-muted-foreground text-sm">No scheduled changes.</p>}
        </div>
      </div>
    </div>
  );
};
