// src/pages/admin/CryptoDeposits.tsx - COMPLETE WITH NOTIFICATIONS
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Eye, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { sendDepositNotification } from "@/services/notificationService";

export function CryptoDeposits() {
  const { toast } = useToast();
  const [deposits, setDeposits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDeposit, setSelectedDeposit] = useState<any>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => { 
    fetchDeposits(); 
  }, []);

  const fetchDeposits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("deposits")
        .select(`*, profiles!deposits_user_id_fkey(full_name, email)`)
        .eq("deposit_method", "crypto")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error("Error fetching crypto deposits:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFullReceiptUrl = (receiptUrl: string | null) => {
    if (!receiptUrl) return null;
    if (receiptUrl.startsWith('http')) return receiptUrl;
    const SUPABASE_URL = 'https://xnnhoqvtooyipjvyfvms.supabase.co';
    const bucketName = 'deposit-proofs';
    return `${SUPABASE_URL}/storage/v1/object/public/${bucketName}/${receiptUrl}`;
  };

  const handleApprove = async (deposit: any) => {
    setProcessing(true);
    try {
      console.log("[CRYPTO DEPOSIT] Approving deposit:", deposit.id);
      console.log("[CRYPTO DEPOSIT] Amount:", deposit.amount);
      console.log("[CRYPTO DEPOSIT] User ID:", deposit.user_id);
      
      // 1. Get current funding_balance
      const { data: currentBalance, error: fetchError } = await supabase
        .from("user_balances")
        .select("funding_balance")
        .eq("user_id", deposit.user_id)
        .maybeSingle();

      if (fetchError) {
        console.error("Fetch error:", fetchError);
      }

      const currentFunding = currentBalance?.funding_balance || 0;
      const newFunding = currentFunding + Number(deposit.amount);
      
      console.log(`[CRYPTO DEPOSIT] funding_balance: ${currentFunding} → ${newFunding}`);
      
      // 2. Update funding_balance
      const { error: updateError } = await supabase
        .from("user_balances")
        .update({ 
          funding_balance: newFunding,
          updated_at: new Date().toISOString() 
        })
        .eq("user_id", deposit.user_id);
      
      if (updateError) {
        console.error("Update error:", updateError);
        toast({ title: "Balance Update Failed", description: updateError.message, variant: "destructive" });
        setProcessing(false);
        return;
      }
      
      console.log("[CRYPTO DEPOSIT] Balance updated successfully");
      
      // 3. Update deposit status to approved
      const { error: statusError } = await supabase
        .from("deposits")
        .update({ 
          status: "approved", 
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", deposit.id);
      
      if (statusError) {
        console.error("Status update error:", statusError);
        throw statusError;
      }
      
      console.log("[CRYPTO DEPOSIT] Deposit status updated to approved");
      
      // 4. Send notifications (Email, Telegram, User Bell)
      await sendDepositNotification(deposit, 'approved');
      
      toast({ 
        title: "Approved!", 
        description: `${deposit.amount} ${deposit.crypto_type} added to funding balance` 
      });
      
      // Refresh the list
      await fetchDeposits();
      setSelectedDeposit(null);
      setAdminNotes("");
      
    } catch (error) {
      console.error("Error approving deposit:", error);
      toast({ title: "Error", description: "Failed to approve deposit", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async (deposit: any) => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("deposits")
        .update({ 
          status: "declined", 
          admin_notes: adminNotes, 
          reviewed_at: new Date().toISOString()
        })
        .eq("id", deposit.id);
      
      if (error) throw error;
      
      // Send decline notification
      await sendDepositNotification(deposit, 'declined');
      
      toast({ title: "Declined", description: "Deposit has been declined" });
      await fetchDeposits();
      setSelectedDeposit(null);
      setAdminNotes("");
      
    } catch (error) {
      console.error("Error:", error);
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">Crypto Deposits</h2>
        <Button variant="outline" onClick={fetchDeposits}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Crypto</TableHead>
                <TableHead>Network</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No crypto deposits found
                  </TableCell>
                </TableRow>
              ) : (
                deposits.map((deposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>{format(new Date(deposit.created_at), "MMM dd, HH:mm")}</TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">{deposit.profiles?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{deposit.profiles?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{deposit.amount}</TableCell>
                    <TableCell>{deposit.crypto_type}</TableCell>
                    <TableCell>{deposit.network || "-"}</TableCell>
                    <TableCell>
                      <Badge className={
                        deposit.status === "pending" ? "bg-yellow-500" : 
                        deposit.status === "approved" ? "bg-green-500" : 
                        "bg-red-500"
                      }>
                        {deposit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => { 
                          setSelectedDeposit(deposit); 
                          setAdminNotes(deposit.admin_notes || ""); 
                        }}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Approve/Decline Modal */}
      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Process Crypto Deposit</DialogTitle></DialogHeader>
          {selectedDeposit && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <p className="text-muted-foreground">User:</p>
                <p className="font-medium">{selectedDeposit.profiles?.full_name}</p>
                <p className="text-muted-foreground">Email:</p>
                <p className="font-medium">{selectedDeposit.profiles?.email}</p>
                <p className="text-muted-foreground">Amount:</p>
                <p className="font-medium">{selectedDeposit.amount} {selectedDeposit.crypto_type}</p>
                <p className="text-muted-foreground">Network:</p>
                <p>{selectedDeposit.network || "-"}</p>
                <p className="text-muted-foreground">TXID:</p>
                <p className="text-xs font-mono break-all">{selectedDeposit.txid || "-"}</p>
              </div>

              {selectedDeposit.receipt_url && (
                <div>
                  <p className="text-sm font-medium mb-1">Receipt</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => window.open(getFullReceiptUrl(selectedDeposit.receipt_url), '_blank')}
                  >
                    View Receipt
                  </Button>
                </div>
              )}

              <div>
                <p className="text-sm font-medium mb-1">Admin Notes</p>
                <Textarea 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)} 
                  placeholder="Add notes about this deposit..."
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  className="flex-1 bg-green-600 hover:bg-green-700" 
                  onClick={() => handleApprove(selectedDeposit)} 
                  disabled={processing}
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                  Approve & Credit Funding Balance
                </Button>
                <Button 
                  variant="destructive" 
                  className="flex-1" 
                  onClick={() => handleDecline(selectedDeposit)} 
                  disabled={processing}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}