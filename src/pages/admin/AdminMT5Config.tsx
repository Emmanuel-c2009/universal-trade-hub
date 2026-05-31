import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { formatEUR } from "@/lib/utils";
import { Plus, Trash2, Settings2 } from "lucide-react";

interface MT5Config {
  id: string;
  currency_pair: string;
  stop_loss: number;
  take_profit: number;
  profit_margin: number;
  loss_margin: number;
  timeframe_minutes: number | null;
  expiry_date: string | null;
  is_active: boolean;
  created_at: string;
}

interface MT5DefaultConfig {
  id: string;
  mode: string;
  margin_min: number;
  margin_max: number;
}

const CURRENCY_PAIRS = [
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD',
  'NZDUSD', 'EURGBP', 'EURJPY', 'GBPJPY',
  'XAUUSD', 'XAGUSD',
  'BTCUSD', 'ETHUSD', 'LTCUSD', 'XRPUSD', 'BNBUSD', 'SOLUSD',
];

const TIMEFRAMES = [
  { value: 5, label: '5 minutes' },
  { value: 10, label: '10 minutes' },
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 60, label: '1 hour' },
];

export const AdminMT5Config = () => {
  const [configs, setConfigs] = useState<MT5Config[]>([]);
  const [defaultConfig, setDefaultConfig] = useState<MT5DefaultConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [currencyPair, setCurrencyPair] = useState("EURUSD");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [profitMargin, setProfitMargin] = useState([80]);
  const [lossMargin, setLossMargin] = useState([10]);
  const [timeframeMinutes, setTimeframeMinutes] = useState("10");
  const [expiryDate, setExpiryDate] = useState("");
  const [saving, setSaving] = useState(false);

  // Default config state
  const [configMode, setConfigMode] = useState("default");
  const [configMin, setConfigMin] = useState([1]);
  const [configMax, setConfigMax] = useState([30]);

  useEffect(() => {
    fetchConfigs();
    fetchDefaultConfig();
  }, []);

  const fetchConfigs = async () => {
    const { data, error } = await supabase
      .from('mt5_configurations')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setConfigs((data || []) as unknown as MT5Config[]);
    setLoading(false);
  };

  const fetchDefaultConfig = async () => {
    const { data } = await supabase
      .from('mt5_default_config')
      .select('*')
      .limit(1)
      .single();
    if (data) {
      const c = data as MT5DefaultConfig;
      setDefaultConfig(c);
      setConfigMode(c.mode);
      setConfigMin([c.margin_min]);
      setConfigMax([c.margin_max]);
    }
  };

  const handleSaveConfig = async () => {
    if (!stopLoss || !takeProfit) {
      toast.error("Please enter both Stop Loss and Take Profit values");
      return;
    }

    setSaving(true);
    const { data: user } = await supabase.auth.getUser();

    const { error } = await supabase.from('mt5_configurations').insert({
      currency_pair: currencyPair,
      stop_loss: parseFloat(stopLoss),
      take_profit: parseFloat(takeProfit),
      profit_margin: profitMargin[0],
      loss_margin: lossMargin[0],
      timeframe_minutes: parseInt(timeframeMinutes),
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      is_active: true,
      created_by: user.user?.id,
    });

    if (error) {
      toast.error("Failed to save: " + error.message);
    } else {
      toast.success(`Configuration saved for ${currencyPair}`);
      setStopLoss("");
      setTakeProfit("");
      fetchConfigs();
    }
    setSaving(false);
  };

  const handleDeactivate = async (id: string) => {
    const { error } = await supabase
      .from('mt5_configurations')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (!error) {
      toast.success("Configuration deactivated");
      fetchConfigs();
    }
  };

  const handleSaveDefaultConfig = async () => {
    if (!defaultConfig) return;
    const { error } = await supabase
      .from('mt5_default_config')
      .update({
        mode: configMode,
        margin_min: configMin[0],
        margin_max: configMax[0],
        updated_at: new Date().toISOString(),
      })
      .eq('id', defaultConfig.id);
    if (!error) toast.success("Default settings saved");
    else toast.error("Failed to save settings");
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">MT5 Configuration</h1>
        <p className="text-muted-foreground">Manage SL/TP configurations and default margin settings per currency pair</p>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="config">New Configuration</TabsTrigger>
          <TabsTrigger value="active">Active ({configs.filter(c => c.is_active).length})</TabsTrigger>
          <TabsTrigger value="defaults">Default Settings</TabsTrigger>
        </TabsList>

        {/* Tab 1: New SL/TP Configuration */}
        <TabsContent value="config">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5" /> New SL/TP Configuration (Trade Signal)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Currency Pair</Label>
                <Select value={currencyPair} onValueChange={setCurrencyPair}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCY_PAIRS.map(pair => (
                      <SelectItem key={pair} value={pair}>{pair}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Stop Loss (SL)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    placeholder="e.g. 1.09634"
                    className="font-mono"
                  />
                </div>
                <div>
                  <Label>Take Profit (TP)</Label>
                  <Input
                    type="number"
                    step="0.00001"
                    value={takeProfit}
                    onChange={e => setTakeProfit(e.target.value)}
                    placeholder="e.g. 1.15200"
                    className="font-mono"
                  />
                </div>
              </div>

              <div>
                <Label>Profit Margin: {profitMargin[0]}%</Label>
                <Slider value={profitMargin} onValueChange={setProfitMargin} min={1} max={100} step={1} />
              </div>

              <div>
                <Label>Loss Margin: {lossMargin[0]}%</Label>
                <Slider value={lossMargin} onValueChange={setLossMargin} min={1} max={100} step={1} />
              </div>

              <div>
                <Label>Timeframe</Label>
                <Select value={timeframeMinutes} onValueChange={setTimeframeMinutes}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMEFRAMES.map(tf => (
                      <SelectItem key={tf.value} value={tf.value.toString()}>{tf.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Expiry Date (optional)</Label>
                <Input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} />
              </div>

              <Button onClick={handleSaveConfig} disabled={saving} className="w-full">
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Active Configurations */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle>Active Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              {configs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No configurations yet</p>
              ) : (
                <div className="space-y-3">
                  {configs.map(config => (
                    <div key={config.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-lg">{config.currency_pair}</span>
                          <Badge variant={config.is_active ? 'default' : 'secondary'}>
                            {config.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
                          <span>SL: <span className="font-mono text-destructive">{Number(config.stop_loss).toFixed(5)}</span></span>
                          <span>TP: <span className="font-mono text-primary">{Number(config.take_profit).toFixed(5)}</span></span>
                          <span>Profit: {config.profit_margin}%</span>
                          <span>Loss: {config.loss_margin}%</span>
                          <span>Timeframe: {config.timeframe_minutes || 10}min</span>
                        </div>
                        {config.expiry_date && (
                          <div className="text-xs text-muted-foreground">
                            Expires: {new Date(config.expiry_date).toLocaleString()}
                          </div>
                        )}
                      </div>
                      {config.is_active && (
                        <Button variant="destructive" size="sm" onClick={() => handleDeactivate(config.id)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Deactivate
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Default Settings */}
        <TabsContent value="defaults">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="w-5 h-5" /> Default Margin Settings (Global Mode)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Mode</Label>
                <Select value={configMode} onValueChange={setConfigMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default System (Normal Market)</SelectItem>
                    <SelectItem value="profit_only">Profit Only (Auto-Win)</SelectItem>
                    <SelectItem value="loss_only">Loss Only (Auto-Loss)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {configMode === 'profit_only' && (
                <div>
                  <Label>Profit Margin: {configMin[0]}%</Label>
                  <Slider value={configMin} onValueChange={setConfigMin} min={1} max={50} step={1} />
                </div>
              )}

              {configMode === 'loss_only' && (
                <div>
                  <Label>Loss Margin: {configMax[0]}%</Label>
                  <Slider value={configMax} onValueChange={setConfigMax} min={1} max={50} step={1} />
                </div>
              )}

              <Button onClick={handleSaveDefaultConfig} className="w-full">Save Default Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
