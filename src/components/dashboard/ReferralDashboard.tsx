import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Copy, Check, Users, Gift, TrendingUp, Download, Share2 } from 'lucide-react';

interface ReferralStats {
  referral_code: string;
  total_referrals: number;
  total_earned: number;
  pending_earnings: number;
  share_link: string;
  referrals: any[];
  earnings: any[];
  settings: {
    signup_bonus_referrer: number;
    signup_bonus_referred: number;
    deposit_bonus_percentage: number;
    trading_commission_percentage: number;
    payout_threshold: number;
  };
}

export const ReferralDashboard = () => {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [withdrawing, setWithdrawing] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralStats();
  }, []);

  const fetchReferralStats = async () => {
    try {
      // Get user's profile for referral code
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code, total_referral_earnings, pending_referral_earnings, total_referrals_count')
        .single();

      // Get referrals list
      const { data: referrals } = await supabase
        .from('referrals')
        .select(`
          id,
          status,
          first_deposit_amount,
          created_at,
          referred:profiles!referred_id(full_name, email)
        `)
        .eq('referrer_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      // Get earnings
      const { data: earnings } = await supabase
        .from('referral_earnings')
        .select('*')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .order('created_at', { ascending: false });

      // Get settings
      const { data: settings } = await supabase
        .from('referral_settings')
        .select('*')
        .single();

      const totalEarned = earnings?.filter(e => e.status === 'paid').reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const pendingEarnings = earnings?.filter(e => e.status === 'pending').reduce((sum, e) => sum + Number(e.amount), 0) || 0;

      setStats({
        referral_code: profile?.referral_code || '',
        total_referrals: referrals?.length || 0,
        total_earned: totalEarned,
        pending_earnings: pendingEarnings,
        share_link: `${window.location.origin}/auth?ref=${profile?.referral_code}`,
        referrals: referrals || [],
        earnings: earnings || [],
        settings: settings || {
          signup_bonus_referrer: 10,
          signup_bonus_referred: 5,
          deposit_bonus_percentage: 5,
          trading_commission_percentage: 10,
          payout_threshold: 20,
        },
      });
    } catch (error) {
      console.error('Error fetching referral stats:', error);
      toast.error('Failed to load referral data');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleWithdrawBonus = async () => {
    if (!stats || stats.pending_earnings < stats.settings.payout_threshold) {
      toast.error(`Minimum withdrawal amount is €${stats?.settings.payout_threshold}`);
      return;
    }

    setWithdrawing(true);
    try {
      const { data, error } = await supabase.functions.invoke('withdraw-referral-bonus', {
        body: { amount: stats.pending_earnings }
      });

      if (error) throw error;
      
      // Show success message with where the money went
      toast.success(`€${stats.pending_earnings} has been added to your Bonus Balance! You can now transfer it to Funding Balance.`);
      
      // Refresh the stats
      await fetchReferralStats();
      
      // Small delay to show success message
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (error: any) {
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setWithdrawing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-secondary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Referral Program</h2>
        <p className="text-muted-foreground mt-1">Invite friends and earn rewards</p>
      </div>

      {/* Referral Link Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-secondary" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 bg-muted rounded-lg px-4 py-3 border border-border">
              <code className="text-sm break-all">{stats?.share_link}</code>
            </div>
            <Button onClick={() => copyToClipboard(stats?.share_link || '')} className="bg-secondary hover:bg-secondary/80">
              {copied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
          </div>
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm">
              <span className="font-medium">Referral Code:</span>{' '}
              <code className="text-secondary font-mono">{stats?.referral_code}</code>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Share this link with friends. When they sign up, you both get bonuses!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Referrals</CardTitle>
            <Users className="w-4 h-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total_referrals || 0}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
            <Gift className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats?.total_earned?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Earnings</CardTitle>
            <TrendingUp className="w-4 h-4 text-gold" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">€{stats?.pending_earnings?.toFixed(2) || '0.00'}</div>
          </CardContent>
        </Card>
      </div>

      {/* Withdraw Button */}
      {stats && stats.pending_earnings > 0 && (
        <Card className="bg-gradient-to-r from-secondary/20 via-secondary/10 to-transparent border-secondary/30">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h3 className="font-semibold text-lg">Ready to Withdraw?</h3>
                <p className="text-sm text-muted-foreground">
                  You have €{stats.pending_earnings.toFixed(2)} available
                  {stats.settings.payout_threshold && stats.pending_earnings < stats.settings.payout_threshold && 
                    ` (Minimum: €${stats.settings.payout_threshold})`
                  }
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Funds will be added to your Bonus Balance, then use Transfer Balance to move to Funding Balance
                </p>
              </div>
              <Button
                onClick={handleWithdrawBonus}
                disabled={withdrawing || stats.pending_earnings < stats.settings.payout_threshold}
                className="bg-secondary hover:bg-secondary/80"
              >
                <Download className="w-4 h-4 mr-2" />
                {withdrawing ? 'Processing...' : 'Withdraw Bonus'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bonus Info Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">🎁 Signup Bonus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              You get <span className="font-bold text-secondary">€{stats?.settings.signup_bonus_referrer}</span> per referral
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Your friend gets €{stats?.settings.signup_bonus_referred}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">💰 Deposit Bonus</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-bold text-secondary">{stats?.settings.deposit_bonus_percentage}%</span> of friend's first deposit
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              When they make their first deposit
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-sm font-medium">📊 Trading Commission</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <span className="font-bold text-secondary">{stats?.settings.trading_commission_percentage}%</span> of trading fees
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Earn from every trade they make
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Referral History Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle>Referral History</CardTitle>
        </CardHeader>
        <CardContent>
          {stats?.referrals && stats.referrals.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border">
                  <tr>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">User</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">First Deposit</th>
                    <th className="text-left py-3 text-sm font-medium text-muted-foreground">Date</th>
                    <th className="text-right py-3 text-sm font-medium text-muted-foreground">Earned</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {stats.referrals.map((referral) => {
                    const referralEarnings = stats.earnings?.filter(e => e.referral_id === referral.id) || [];
                    const totalEarned = referralEarnings.reduce((sum, e) => sum + Number(e.amount), 0);
                    return (
                      <tr key={referral.id} className="hover:bg-muted/50">
                        <td className="py-3 text-sm">
                          {referral.referred?.full_name || referral.referred?.email?.split('@')[0] || 'Anonymous'}
                        </td>
                        <td className="py-3">
                          <span className={`inline-flex px-2 py-1 rounded-full text-xs ${
                            referral.status === 'completed' 
                              ? 'bg-emerald-500/20 text-emerald-500' 
                              : 'bg-yellow-500/20 text-yellow-500'
                          }`}>
                            {referral.status}
                          </span>
                        </td>
                        <td className="py-3 text-sm">
                          {referral.first_deposit_amount ? `€${referral.first_deposit_amount}` : '-'}
                        </td>
                        <td className="py-3 text-sm text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-sm text-right font-medium text-emerald-500">
                          {totalEarned > 0 ? `€${totalEarned.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No referrals yet. Share your link to get started!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};