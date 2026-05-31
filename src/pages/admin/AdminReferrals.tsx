import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Save, Power, Users, Gift, TrendingUp, DollarSign } from 'lucide-react';

interface ReferralSettings {
  id: number;
  system_enabled: boolean;
  signup_bonus_referrer: number;
  signup_bonus_referred: number;
  deposit_bonus_percentage: number;
  min_deposit_for_bonus: number;
  trading_commission_percentage: number;
  max_bonus_per_referral: number;
  payout_threshold: number;
  bonus_currency: string;
  deposit_time_limit_days: number;
}

export const AdminReferrals = () => {
  const [settings, setSettings] = useState<ReferralSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalBonusPaid: 0,
    activeReferrers: 0,
  });

  useEffect(() => {
    fetchSettings();
    fetchStats();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load referral settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Count total referrals
      const { count: referralCount } = await supabase
        .from('referrals')
        .select('*', { count: 'exact', head: true });

      // Count users who have at least one referral
      const { data: referrers } = await supabase
        .from('referrals')
        .select('referrer_id')
        .not('referrer_id', 'is', null);

      const uniqueReferrers = new Set(referrers?.map(r => r.referrer_id) || []);

      // Sum of paid bonuses
      const { data: earnings } = await supabase
        .from('referral_earnings')
        .select('amount')
        .eq('status', 'paid');

      const totalPaid = earnings?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setStats({
        totalReferrals: referralCount || 0,
        totalBonusPaid: totalPaid,
        activeReferrers: uniqueReferrers.size,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSave = async () => {
    if (!settings) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('referral_settings')
        .update({
          system_enabled: settings.system_enabled,
          signup_bonus_referrer: settings.signup_bonus_referrer,
          signup_bonus_referred: settings.signup_bonus_referred,
          deposit_bonus_percentage: settings.deposit_bonus_percentage,
          min_deposit_for_bonus: settings.min_deposit_for_bonus,
          trading_commission_percentage: settings.trading_commission_percentage,
          max_bonus_per_referral: settings.max_bonus_per_referral,
          payout_threshold: settings.payout_threshold,
          deposit_time_limit_days: settings.deposit_time_limit_days,
          updated_at: new Date().toISOString(),
        })
        .eq('id', settings.id);

      if (error) throw error;
      toast.success('Referral settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Referral System</h1>
          <p className="text-muted-foreground">Configure bonuses and track referral performance</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-secondary hover:bg-secondary/80">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            <Users className="w-4 h-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Bonus Paid</CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats.totalBonusPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Referrers</CardTitle>
            <Gift className="w-4 h-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeReferrers}</div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Cards */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* System Status */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Power className="w-5 h-5 text-secondary" />
              System Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Referral System</p>
                <p className="text-sm text-muted-foreground">Enable or disable the entire referral system</p>
              </div>
              <Switch
                checked={settings?.system_enabled}
                onCheckedChange={(checked) => setSettings({ ...settings!, system_enabled: checked })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Signup Bonuses */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-secondary" />
              Signup Bonuses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Referrer Bonus (€)</Label>
              <Input
                type="number"
                value={settings?.signup_bonus_referrer}
                onChange={(e) => setSettings({ ...settings!, signup_bonus_referrer: parseFloat(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">User gets this when someone signs up using their link</p>
            </div>
            <div>
              <Label>Referred User Bonus (€)</Label>
              <Input
                type="number"
                value={settings?.signup_bonus_referred}
                onChange={(e) => setSettings({ ...settings!, signup_bonus_referred: parseFloat(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">New user gets this when they sign up with a referral link</p>
            </div>
          </CardContent>
        </Card>

        {/* Deposit Bonuses */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Deposit Bonuses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Deposit Bonus Percentage (%)</Label>
              <Input
                type="number"
                value={settings?.deposit_bonus_percentage}
                onChange={(e) => setSettings({ ...settings!, deposit_bonus_percentage: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Minimum Deposit (€)</Label>
              <Input
                type="number"
                value={settings?.min_deposit_for_bonus}
                onChange={(e) => setSettings({ ...settings!, min_deposit_for_bonus: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Time Limit (Days)</Label>
              <Input
                type="number"
                value={settings?.deposit_time_limit_days}
                onChange={(e) => setSettings({ ...settings!, deposit_time_limit_days: parseInt(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Days to make first deposit after signup</p>
            </div>
          </CardContent>
        </Card>

        {/* Trading & Withdrawal */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gold" />
              Trading Commission & Withdrawal
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Trading Commission (%)</Label>
              <Input
                type="number"
                value={settings?.trading_commission_percentage}
                onChange={(e) => setSettings({ ...settings!, trading_commission_percentage: parseFloat(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Referrer gets this % of referred user's trading fees</p>
            </div>
            <div>
              <Label>Max Bonus per Referral (€)</Label>
              <Input
                type="number"
                value={settings?.max_bonus_per_referral}
                onChange={(e) => setSettings({ ...settings!, max_bonus_per_referral: parseFloat(e.target.value) })}
                className="mt-1"
              />
            </div>
            <div>
              <Label>Payout Threshold (€)</Label>
              <Input
                type="number"
                value={settings?.payout_threshold}
                onChange={(e) => setSettings({ ...settings!, payout_threshold: parseFloat(e.target.value) })}
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum amount to withdraw referral earnings</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};