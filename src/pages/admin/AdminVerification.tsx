import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Eye, CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";

interface VerificationApplication {
  id: string;
  user_id: string;
  status: string;
  personal_info: any;
  id_document_path: string;
  id_document_back_path: string;
  utility_bill_path: string;
  selfie_path: string;
  admin_notes: string;
  created_at: string;
  reviewed_at: string;
  id_type: string;
  utility_type: string;
}

export default function AdminVerification() {
  const { toast } = useToast();
  const [applications, setApplications] = useState<VerificationApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [selectedApp, setSelectedApp] = useState<VerificationApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});

  useEffect(() => {
    fetchApplications();
  }, [selectedStatus]);

  const fetchApplications = async () => {
    setLoading(true);
    
    let query = supabase
      .from("user_verifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (selectedStatus !== "all") {
      query = query.eq("status", selectedStatus);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching applications:", error);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      console.log("Fetched applications:", data);
      setApplications(data || []);
      
      const userIds = [...new Set(data?.map(app => app.user_id) || [])];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email, phone, country, city, address")
          .in("id", userIds);
        
        if (profiles) {
          const profileMap: Record<string, any> = {};
          profiles.forEach(profile => {
            profileMap[profile.id] = profile;
          });
          setUserProfiles(profileMap);
        }
      }
    }
    setLoading(false);
  };

  const getDocumentUrl = (path: string) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    const SUPABASE_URL = "https://xnnhoqvtooyipjvyfvms.supabase.co";
    return `${SUPABASE_URL}/storage/v1/object/public/verification-documents/${path}`;
  };

  const handleDocumentClick = (url: string) => {
    if (url) window.open(url, "_blank");
    else toast({ title: "Error", description: "Document not found", variant: "destructive" });
  };

  const sendTelegramNotification = async (type: string, eventData: any) => {
    try {
      await supabase.functions.invoke("send-email", {
        body: { notification_type: type, event_data: eventData },
      });
    } catch (error) {
      console.error("Telegram error:", error);
    }
  };

  const sendEmailNotification = async (email: string, subject: string, html: string) => {
    try {
      await supabase.functions.invoke("send-email", {
        body: {
          template_name: "custom",
          recipient_email: email,
          custom_subject: subject,
          custom_html: html,
        },
      });
    } catch (error) {
      console.error("Email error:", error);
    }
  };

  const sendInAppNotification = async (userId: string, title: string, message: string, type: string, link: string) => {
    try {
      await supabase.from("user_notifications").insert({
        user_id: userId,
        title: title,
        message: message,
        notification_type: type,
        link: link,
      });
    } catch (error) {
      console.error("In-app notification error:", error);
    }
  };

  // ===== NEW: Migration notification function (ADDED - does not affect existing code) =====
  const sendMigrationNotification = async (userId: string, email: string, userName: string, fundingBalance: number) => {
    try {
      // Call the new migration edge function
      await supabase.functions.invoke("send-migration-notification", {
        body: {
          type: "migration_complete",
          email: email,
          user_name: userName,
          funding_balance: fundingBalance.toFixed(2),
          verification_link: `${window.location.origin}/verification`,
        },
      });
      
      console.log("Migration notification sent to:", email);
    } catch (error) {
      console.error("Migration notification error:", error);
      // Don't block the approval process if notification fails
    }
  };

  // ===== NEW: Check if user is a migrated user (ADDED - does not affect existing code) =====
  const isMigratedUser = async (userId: string): Promise<boolean> => {
    try {
      // Check if user has funding_balance (migrated users have this set)
      const { data: balance } = await supabase
        .from("user_balances")
        .select("funding_balance")
        .eq("user_id", userId)
        .single();
      
      // If funding_balance exists and is not null/zero, they're a migrated user
      // Also check if password is NEEDS_RESET (migration marker)
      const { data: profile } = await supabase
        .from("profiles")
        .select("password")
        .eq("id", userId)
        .single();
      
      return !!(balance?.funding_balance && balance.funding_balance !== 0);
    } catch {
      return false;
    }
  };
  // ===== END OF NEW FUNCTIONS =====

  const getPersonalInfo = (info: any) => {
    if (!info) return {};
    let parsed = info;
    if (typeof info === "string") {
      try { parsed = JSON.parse(info); } catch { return {}; }
    }
    
    return {
      fullName: parsed.fullName || parsed.full_name || parsed.name || "N/A",
      dateOfBirth: parsed.dateOfBirth || parsed.date_of_birth || parsed.dob || "N/A",
      nationality: parsed.nationality || "N/A",
      country: parsed.countryOfResidence || parsed.country || "N/A",
      city: parsed.city || "N/A",
      address: parsed.streetAddress || parsed.address || parsed.street_address || "N/A",
      postalCode: parsed.postalCode || parsed.postal_code || "N/A",
      phone: parsed.phone || parsed.phoneNumber || parsed.mobile || null,
      idDocumentType: parsed.idDocumentType || parsed.id_type || "N/A",
    };
  };

  const updateStatus = async (id: string, userId: string, newStatus: string) => {
    setProcessingId(id);
    
    try {
      const { error } = await supabase
        .from("user_verifications")
        .update({ status: newStatus, reviewed_at: new Date().toISOString(), admin_notes: adminNotes })
        .eq("id", id);

      if (error) throw error;

      const profileStatus = newStatus === "approved" ? "verified" : newStatus === "rejected" ? "unverified" : newStatus;
      
      const currentApp = applications.find(app => app.id === id);
      
      if (newStatus === "approved" && currentApp) {
        const personalInfo = getPersonalInfo(currentApp.personal_info);
        
        const updateData: any = {
          profile_status: profileStatus,
        };
        
        if (personalInfo.fullName && personalInfo.fullName !== "N/A") {
          updateData.full_name = personalInfo.fullName;
        }
        if (personalInfo.country && personalInfo.country !== "N/A") {
          updateData.country = personalInfo.country;
        }
        if (personalInfo.city && personalInfo.city !== "N/A") {
          updateData.city = personalInfo.city;
        }
        if (personalInfo.address && personalInfo.address !== "N/A") {
          updateData.address = personalInfo.address;
        }
        
        console.log("Updating profile with:", updateData);
        
        const { error: profileError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", userId);

        if (profileError) {
          console.error("Error updating profile details:", profileError);
          toast({ title: "Warning", description: "Profile updated but details couldn't be saved", variant: "default" });
        }

        // ===== NEW: Send migration notification for migrated users (ADDED) =====
        const migrated = await isMigratedUser(userId);
        if (migrated) {
          const userProfile = userProfiles[userId];
          // Get funding balance from user_balances
          const { data: balanceData } = await supabase
            .from("user_balances")
            .select("funding_balance")
            .eq("user_id", userId)
            .single();
          
          const fundingBalance = balanceData?.funding_balance || 0;
          
          await sendMigrationNotification(
            userId,
            userProfile?.email,
            userProfile?.full_name || "Valued Customer",
            fundingBalance
          );
          
          // Also send a special in-app notification for migration completion
          await sendInAppNotification(
            userId,
            "🎉 Migration Complete!",
            `Your account has been successfully migrated. Your balance is €${fundingBalance.toFixed(2)}. You're now fully verified!`,
            "success",
            "/dashboard"
          );
        }
        // ===== END OF ADDED CODE =====
      } else {
        await supabase
          .from("profiles")
          .update({ profile_status: profileStatus })
          .eq("id", userId);
      }

      const { data: updatedProfile } = await supabase
        .from("profiles")
        .select("id, full_name, email, phone, country, city, address")
        .eq("id", userId)
        .single();
      
      if (updatedProfile) {
        setUserProfiles(prev => ({ ...prev, [userId]: updatedProfile }));
      }

      const userProfile = userProfiles[userId];

      if (newStatus === "approved") {
        await sendTelegramNotification("verification_approved", {
          user_name: userProfile?.full_name,
          user_email: userProfile?.email,
        });

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Verification Approved!</h2>
            <p>Dear ${userProfile?.full_name || "Valued Customer"},</p>
            <p>Congratulations! Your account has been successfully verified.</p>
            <p>You now have full access to all platform features.</p>
            <p>Thank you,<br>Universal Stock Trade Team</p>
          </body>
          </html>
        `;
        await sendEmailNotification(userProfile?.email, "Verification Approved - Universal Stock Trade", emailHtml);

        await sendInAppNotification(
          userId,
          "Verification Approved",
          "Your account has been verified. You now have full access to all features.",
          "success",
          "/dashboard"
        );
      } else if (newStatus === "rejected") {
        await sendTelegramNotification("verification_rejected", {
          user_name: userProfile?.full_name,
          user_email: userProfile?.email,
          reason: adminNotes || "Documents did not meet requirements",
        });

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head><meta charset="UTF-8"></head>
          <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Verification Failed</h2>
            <p>Dear ${userProfile?.full_name || "Valued Customer"},</p>
            <p>Your verification could not be completed.</p>
            <p><strong>Reason:</strong> ${adminNotes || "Documents did not meet requirements"}</p>
            <p>Please submit a new verification request with clear documents.</p>
            <p>Thank you,<br>Universal Stock Trade Team</p>
          </body>
          </html>
        `;
        await sendEmailNotification(userProfile?.email, "Verification Failed - Universal Stock Trade", emailHtml);

        await sendInAppNotification(
          userId,
          "Verification Rejected",
          `Your verification was rejected. Reason: ${adminNotes || "Documents did not meet requirements"}`,
          "error",
          "/verification"
        );
      }

      toast({ title: `Verification ${newStatus}`, description: "User has been notified" });
      setSelectedApp(null);
      setAdminNotes("");
      fetchApplications();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setProcessingId(null);
    }
  };

  const getPersonalInfoDisplay = (info: any) => {
    const parsed = getPersonalInfo(info);
    return (
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Full Name:</span> {parsed.fullName}</div>
        <div><span className="text-gray-500">Date of Birth:</span> {parsed.dateOfBirth}</div>
        <div><span className="text-gray-500">Nationality:</span> {parsed.nationality}</div>
        <div><span className="text-gray-500">Country:</span> {parsed.country}</div>
        <div><span className="text-gray-500">City:</span> {parsed.city}</div>
        <div><span className="text-gray-500">Address:</span> {parsed.address}</div>
        <div><span className="text-gray-500">Postal Code:</span> {parsed.postalCode}</div>
        <div><span className="text-gray-500">ID Type:</span> {parsed.idDocumentType}</div>
      </div>
    );
  };

  const pendingCount = applications.filter(a => a.status === "pending").length;
  const approvedCount = applications.filter(a => a.status === "approved").length;
  const rejectedCount = applications.filter(a => a.status === "rejected").length;

  if (loading) {
    return (
      <div className="p-6 flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Account Verification Management</h1>
          <p className="text-muted-foreground">Review and process user verification applications</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchApplications}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200 cursor-pointer" onClick={() => setSelectedStatus("pending")}>
          <div className="text-2xl font-bold text-amber-600">{pendingCount}</div>
          <div className="text-amber-600">Pending</div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200 cursor-pointer" onClick={() => setSelectedStatus("approved")}>
          <div className="text-2xl font-bold text-emerald-600">{approvedCount}</div>
          <div className="text-emerald-600">Approved</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg border border-red-200 cursor-pointer" onClick={() => setSelectedStatus("rejected")}>
          <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          <div className="text-red-600">Rejected</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 cursor-pointer" onClick={() => setSelectedStatus("all")}>
          <div className="text-2xl font-bold text-blue-600">{applications.length}</div>
          <div className="text-blue-600">All</div>
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {["pending", "approved", "rejected", "all"].map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedStatus(tab)}
            className={`px-4 py-2 capitalize ${selectedStatus === tab ? "border-b-2 border-blue-600 text-blue-600 font-medium" : "text-gray-500"}`}
          >
            {tab} ({tab === "all" ? applications.length : applications.filter(a => a.status === tab).length})
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Submitted</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>ID Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {applications.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    No verification applications found.
                  </TableCell>
                </TableRow>
              ) : (
                applications.map((app) => {
                  const profile = userProfiles[app.user_id];
                  return (
                    <TableRow key={app.id}>
                      <TableCell className="text-sm">{new Date(app.created_at).toLocaleString()}</TableCell>
                      <TableCell>{profile?.full_name || "Unknown"}</TableCell>
                      <TableCell className="text-sm">{profile?.email || "No email"}</TableCell>
                      <TableCell className="text-sm capitalize">{app.id_type || "N/A"}</TableCell>
                      <TableCell>
                        <Badge className={
                          app.status === "pending" ? "bg-amber-100 text-amber-700" :
                          app.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          "bg-red-100 text-red-700"
                        }>
                          {app.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            const { data: profile } = await supabase
                              .from("profiles")
                              .select("id, full_name, email, phone, country, city, address")
                              .eq("id", app.user_id)
                              .single();
                            if (profile) {
                              setUserProfiles(prev => ({ ...prev, [profile.id]: profile }));
                            }
                            setSelectedApp(app);
                            setAdminNotes(app.admin_notes || "");
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!selectedApp} onOpenChange={() => setSelectedApp(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Verification Details</DialogTitle>
          </DialogHeader>
          {selectedApp && (
            <div className="space-y-4">
              {(() => {
                const profile = userProfiles[selectedApp.user_id];
                return (
                  <>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div><p className="text-gray-500">User</p><p className="font-medium">{profile?.full_name || "Unknown"}</p></div>
                      <div><p className="text-gray-500">Email</p><p className="font-medium">{profile?.email || "No email"}</p></div>
                      <div><p className="text-gray-500">Phone (from registration)</p><p className="font-medium">{profile?.phone || "Not provided"}</p></div>
                      <div><p className="text-gray-500">Submitted</p><p className="font-medium">{new Date(selectedApp.created_at).toLocaleString()}</p></div>
                      <div><p className="text-gray-500">ID Type</p><p className="font-medium capitalize">{selectedApp.id_type || "N/A"}</p></div>
                      <div><p className="text-gray-500">Status</p>
                        <Badge className={
                          selectedApp.status === "pending" ? "bg-amber-100 text-amber-700" :
                          selectedApp.status === "approved" ? "bg-emerald-100 text-emerald-700" :
                          "bg-red-100 text-red-700"
                        }>
                          {selectedApp.status}
                        </Badge>
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Verification Information</h3>
                      {getPersonalInfoDisplay(selectedApp.personal_info)}
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Documents</h3>
                      <div className="flex flex-wrap gap-3">
                        {selectedApp.id_document_path && (
                          <Button variant="outline" onClick={() => handleDocumentClick(getDocumentUrl(selectedApp.id_document_path))}>
                            📄 ID Document (Front)
                          </Button>
                        )}
                        {selectedApp.id_document_back_path && (
                          <Button variant="outline" onClick={() => handleDocumentClick(getDocumentUrl(selectedApp.id_document_back_path))}>
                            📄 ID Document (Back)
                          </Button>
                        )}
                        {selectedApp.utility_bill_path && (
                          <Button variant="outline" onClick={() => handleDocumentClick(getDocumentUrl(selectedApp.utility_bill_path))}>
                            📄 Proof of Address
                          </Button>
                        )}
                        {selectedApp.selfie_path && (
                          <Button variant="outline" onClick={() => handleDocumentClick(getDocumentUrl(selectedApp.selfie_path))}>
                            📸 Selfie
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-2">Admin Notes</h3>
                      <Textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add notes about this verification..."
                        disabled={selectedApp.status !== "pending"}
                      />
                    </div>

                    {selectedApp.status === "pending" && (
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => updateStatus(selectedApp.id, selectedApp.user_id, "approved")}
                          disabled={processingId === selectedApp.id}
                        >
                          {processingId === selectedApp.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                          Approve
                        </Button>
                        <Button
                          variant="destructive"
                          className="flex-1"
                          onClick={() => updateStatus(selectedApp.id, selectedApp.user_id, "rejected")}
                          disabled={processingId === selectedApp.id}
                        >
                          {processingId === selectedApp.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                          Reject
                        </Button>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}