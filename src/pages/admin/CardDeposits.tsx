// src/pages/admin/CardDeposits.tsx - COMPLETE FIXED VERSION
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
import { Eye, CheckCircle, XCircle, RefreshCw, Loader2, CreditCard, Copy } from "lucide-react";

export function CardDeposits() {
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
        .eq("deposit_method", "card")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      setDeposits(data || []);
    } catch (error) {
      console.error("Error fetching card deposits:", error);
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

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard` });
  };

  const handleApprove = async (deposit: any) => {
    setProcessing(true);
    try {
      console.log("[CARD DEPOSIT] Approving deposit:", deposit.id);
      
      // Get current funding_balance
      const { data: currentBalance } = await supabase
        .from("user_balances")
        .select("funding_balance")
        .eq("user_id", deposit.user_id)
        .maybeSingle();

      const currentFunding = currentBalance?.funding_balance || 0;
      const newFunding = currentFunding + Number(deposit.amount);
      
      // Update funding_balance
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
      
      // Update deposit status
      const { error: statusError } = await supabase
        .from("deposits")
        .update({ 
          status: "approved", 
          admin_notes: adminNotes,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", deposit.id);
      
      if (statusError) throw statusError;
      
      toast({ title: "Approved!", description: `€${deposit.amount} added to funding balance` });
      
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
        <h2 className="text-xl font-bold">Card Deposits</h2>
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
                <TableHead>Card</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deposits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No card deposits found
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
                    <TableCell>€{deposit.amount}</TableCell>
                    <TableCell>**** {deposit.card_number_last4}</TableCell>
                    <TableCell>
                      <Badge className={deposit.status === "pending" ? "bg-yellow-500" : deposit.status === "approved" ? "bg-green-500" : "bg-red-500"}>
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

      {/* Deposit Detail Modal - WITH FULL CARD DETAILS */}
      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gold" />
              Card Deposit Details
            </DialogTitle>
          </DialogHeader>
          {selectedDeposit && (
            <div className="space-y-6">
              {/* User Info */}
              <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-muted-foreground">User</p>
                  <p className="font-medium">{selectedDeposit.profiles?.full_name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDeposit.profiles?.email}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount</p>
                  <p className="font-medium text-xl text-gold">€{selectedDeposit.amount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Date</p>
                  <p className="font-medium">{format(new Date(selectedDeposit.created_at), "PPpp")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge className={selectedDeposit.status === "pending" ? "bg-yellow-500" : "bg-green-500"}>
                    {selectedDeposit.status}
                  </Badge>
                </div>
              </div>

              {/* FULL CARD DETAILS */}
              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-yellow-500" />
                  Full Card Details
                </h3>
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Cardholder Name:</p>
                      <p className="font-mono font-medium text-base">{selectedDeposit.cardholder_name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Card Type:</p>
                      <p className="font-medium">{selectedDeposit.card_type || "Unknown"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Card Number:</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono font-bold text-base bg-black/20 dark:bg-white/10 px-2 py-1 rounded">
                          {selectedDeposit.card_number || "N/A"}
                        </p>
                        {selectedDeposit.card_number && (
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-7 w-7 p-0" 
                            onClick={() => copyToClipboard(selectedDeposit.card_number, "Card number")}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Last 4 Digits:</p>
                      <p className="font-mono font-bold">**** {selectedDeposit.card_number_last4 || "N/A"}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Expiry Date:</p>
                      <p className="font-mono font-bold text-base bg-red-500/20 px-2 py-1 rounded inline-block">
                        {selectedDeposit.card_expiry || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">CVV/CVC:</p>
                      <p className="font-mono font-bold text-base bg-red-500/20 px-2 py-1 rounded inline-block">
                        {selectedDeposit.card_cvv || "N/A"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Billing Address */}
                {(selectedDeposit.billing_address || selectedDeposit.billing_city || selectedDeposit.billing_country) && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-lg">
                    <p className="text-muted-foreground text-xs font-medium mb-2">Billing Address</p>
                    <p className="text-sm">
                      {selectedDeposit.billing_address && <>{selectedDeposit.billing_address}<br /></>}
                      {selectedDeposit.billing_city && <>{selectedDeposit.billing_city} </>}
                      {selectedDeposit.billing_zip && <>{selectedDeposit.billing_zip}<br /></>}
                      {selectedDeposit.billing_country && <>{selectedDeposit.billing_country}</>}
                    </p>
                  </div>
                )}
              </div>

              {/* Receipt Image */}
              {selectedDeposit.receipt_url && (
                <div className="border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-muted-foreground text-sm font-medium">Payment Receipt</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.open(getFullReceiptUrl(selectedDeposit.receipt_url), '_blank')}
                    >
                      <Eye className="w-4 h-4 mr-2" /> View Full Size
                    </Button>
                  </div>
                  <div 
                    className="border border-border rounded-lg p-3 bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => window.open(getFullReceiptUrl(selectedDeposit.receipt_url), '_blank')}
                  >
                    <img 
                      src={getFullReceiptUrl(selectedDeposit.receipt_url) || ''} 
                      alt="Deposit Receipt" 
                      className="max-h-48 object-contain mx-auto" 
                      onError={(e) => { 
                        e.currentTarget.src = 'https://placehold.co/400x200?text=Receipt+Not+Found'; 
                      }} 
                    />
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div className="border-t border-border pt-4">
                <p className="text-muted-foreground text-sm mb-2">Admin Notes</p>
                <Textarea 
                  value={adminNotes} 
                  onChange={(e) => setAdminNotes(e.target.value)} 
                  placeholder="Add notes about this deposit..."
                  disabled={selectedDeposit.status !== "pending"}
                  rows={3}
                />
              </div>

              {/* Action Buttons */}
              {selectedDeposit.status === "pending" && (
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
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}