import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { COUNTRIES, NATIONALITIES } from "@/lib/locationData";

const TWO_SIDED_IDS = ["drivers_license", "national_id", "voters_card"];
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const SUPABASE_URL = 'https://xnnhoqvtooyipjvyfvms.supabase.co';

function getFullImageUrl(path: string): string {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/verification-documents/${path}`;
}

export default function Verification() {
  const [user, setUser] = useState<User | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [personal, setPersonal] = useState({
    dateOfBirth: "",
    nationality: "",
    countryOfResidence: "",
    city: "",
    streetAddress: "",
    postalCode: "",
    phone: "",  // Added phone field
  });

  const [formData, setFormData] = useState({
    idType: "",
    idDocumentFront: null as File | null,
    idDocumentBack: null as File | null,
    utilityType: "",
    utilityBill: null as File | null,
    selfie: null as File | null,
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
      checkVerificationStatus(session.user.id);
      fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) navigate("/auth");
      else setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) {
      setProfile(data);
      // Pre-fill phone if exists in profile
      if (data.phone) {
        setPersonal(prev => ({ ...prev, phone: data.phone }));
      }
    }
  };

  const checkVerificationStatus = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_verifications")
      .select("status, rejection_reason")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setVerificationStatus(data.status);
      setRejectionReason(data.rejection_reason);
    }
  };

  const validateFile = (file: File, allowPdf: boolean = true): string | null => {
    if (file.size > MAX_FILE_SIZE) return "File must be less than 5MB";
    const validTypes = allowPdf ? ["image/jpeg", "image/png", "image/jpg", "application/pdf"] : ["image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) return allowPdf ? "Only JPG, PNG, or PDF allowed" : "Only JPG or PNG allowed";
    return null;
  };

  const onFileChange = (key: keyof typeof formData, file: File | null, allowPdf = true) => {
    if (file) {
      const err = validateFile(file, allowPdf);
      if (err) {
        toast({ title: "Invalid file", description: err, variant: "destructive" });
        return;
      }
    }
    setFormData({ ...formData, [key]: file });
  };

  const uploadFile = async (file: File, folder: string): Promise<string> => {
    if (!user) throw new Error("No user");
    const fileExt = file.name.split(".").pop();
    const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from("verification-documents").upload(fileName, file);
    if (uploadError) throw uploadError;
    return fileName;
  };

  const isPersonalComplete = () =>
    personal.dateOfBirth && personal.nationality && personal.countryOfResidence &&
    personal.city.trim() && personal.streetAddress.trim() && personal.postalCode.trim();

  const needsBack = TWO_SIDED_IDS.includes(formData.idType);
  const isIdComplete = () => formData.idType && formData.idDocumentFront && (!needsBack || formData.idDocumentBack);

  const sendNotification = async (type: string, eventData: any, documentUrls: any = null) => {
    try {
      const body: any = {
        notification_type: type,
        event_data: eventData,
      };
      if (documentUrls) {
        body.document_urls = documentUrls;
      }
      await supabase.functions.invoke("send-email", { body });
    } catch (error) {
      console.error("Notification error:", error);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!isPersonalComplete() || !isIdComplete() || !formData.utilityType || !formData.utilityBill || !formData.selfie) {
      toast({ title: "Error", description: "Please complete all steps", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const idFrontPath = await uploadFile(formData.idDocumentFront!, "id-documents");
      let idBackPath: string | null = null;
      if (needsBack && formData.idDocumentBack) {
        idBackPath = await uploadFile(formData.idDocumentBack, "id-documents");
      }
      const utilityPath = await uploadFile(formData.utilityBill!, "utility-bills");
      const selfiePath = await uploadFile(formData.selfie!, "selfies");

      // Include phone in personal_info
      const personalInfoWithPhone = {
        ...personal,
        phone: personal.phone || null,
      };

      const { error } = await (supabase as any).from("user_verifications").insert({
        user_id: user.id,
        id_type: formData.idType,
        id_document_path: idFrontPath,
        id_document_back_path: idBackPath,
        utility_type: formData.utilityType,
        utility_bill_path: utilityPath,
        selfie_path: selfiePath,
        personal_info: personalInfoWithPhone,
      });

      if (error) throw error;

      // Also update the profiles table with phone number if provided
      const profileUpdate: any = { profile_status: "pending" };
      if (personal.phone) {
        profileUpdate.phone = personal.phone;
      }
      await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

      // Send notification with document images
      await sendNotification("verification_submitted", {
        user_name: profile?.full_name || user.email,
        user_email: user.email,
        id_type: formData.idType,
        phone: personal.phone || "Not provided",
      }, {
        id_front: idFrontPath ? getFullImageUrl(idFrontPath) : null,
        id_back: idBackPath ? getFullImageUrl(idBackPath) : null,
        proof_of_address: utilityPath ? getFullImageUrl(utilityPath) : null,
        selfie: selfiePath ? getFullImageUrl(selfiePath) : null,
      });

      // Email user — under review
      supabase.functions.invoke("send-email", {
        body: {
          template_name: "verification_under_review",
          recipient_email: user.email,
          variables: { user_name: profile?.full_name || user.email },
        },
      }).catch((e) => console.warn("User email failed:", e));

      toast({ title: "✅ Application submitted", description: "Under review. Redirecting…" });
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (error: any) {
      console.error("Verification submission error:", error);
      toast({ title: "Submission failed", description: `${error.message || "Unknown error"}. Please try again.`, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReapply = () => {
    setVerificationStatus(null);
    setRejectionReason(null);
    setCurrentStep(1);
    setFormData({ idType: "", idDocumentFront: null, idDocumentBack: null, utilityType: "", utilityBill: null, selfie: null });
    setPersonal({ dateOfBirth: "", nationality: "", countryOfResidence: "", city: "", streetAddress: "", postalCode: "", phone: "" });
  };

  const userName = profile?.full_name || user?.email?.split("@")[0] || "User";

  if (verificationStatus === "pending") {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} notificationCount={0} messageCount={0} avatarUrl={profile?.avatar_url} verificationStatus={profile?.profile_status} />
        <main className="container mx-auto px-4 pt-40 max-w-2xl">
          <Card className="p-8 text-center">
            <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verification Pending</h2>
            <p className="text-muted-foreground">You already have a pending verification request. Please wait for admin review.</p>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (verificationStatus === "rejected") {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} notificationCount={0} messageCount={0} avatarUrl={profile?.avatar_url} verificationStatus={profile?.profile_status} />
        <main className="container mx-auto px-4 pt-40 max-w-2xl">
          <Card className="p-8 text-center border-destructive/50">
            <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Verification Rejected</h2>
            {rejectionReason && (
              <div className="bg-destructive/10 rounded-lg p-4 mb-4 text-left">
                <div className="flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4 text-destructive" /><span className="font-medium text-destructive">Rejection Reason</span></div>
                <p className="text-sm text-muted-foreground">{rejectionReason}</p>
              </div>
            )}
            <p className="text-muted-foreground mb-6">You can submit a new verification with corrected documents.</p>
            <Button onClick={handleReapply} className="bg-gold text-black hover:bg-gold/90">Reapply for Verification</Button>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (verificationStatus === "approved" || profile?.profile_status === "verified") {
    return (
      <div className="min-h-screen bg-background pb-20 lg:pb-0">
        <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} notificationCount={0} messageCount={0} avatarUrl={profile?.avatar_url} verificationStatus="verified" />
        <main className="container mx-auto px-4 pt-40 max-w-2xl">
          <Card className="p-8 text-center border-emerald-500/50">
            <CheckCircle className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Account Verified</h2>
            <p className="text-muted-foreground">Your account is fully verified. You have access to all features.</p>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader userName={userName} onMenuClick={() => setSidebarOpen(true)} notificationCount={0} messageCount={0} avatarUrl={profile?.avatar_url} verificationStatus={profile?.profile_status} />

      <main className="container mx-auto px-4 pt-40 max-w-3xl">
        <div className="bg-gradient-to-r from-secondary/20 via-gold/20 to-secondary/20 rounded-t-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-foreground">Account Verification</h1>
          <p className="text-muted-foreground mt-2">Complete verification to unlock all features</p>
        </div>

        <div className="flex justify-between mb-8">
          {[1, 2, 3, 4].map((step) => (
            <div key={step} className="flex flex-col items-center flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${currentStep >= step ? "bg-secondary text-white" : "bg-muted text-muted-foreground"}`}>{step}</div>
              <span className="text-xs mt-2 text-center">{step === 1 && "Personal Info"}{step === 2 && "ID Document"}{step === 3 && "Proof of Address"}{step === 4 && "Selfie"}</span>
            </div>
          ))}
        </div>

        {currentStep === 1 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 1: Personal Information</h2>
            <p className="text-sm text-muted-foreground mb-4">Your full name is auto-filled from your profile.</p>
            <div className="space-y-4">
              <div><Label>Full Name</Label><Input value={profile?.full_name || ""} disabled readOnly /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label htmlFor="dob">Date of Birth</Label><Input id="dob" type="date" value={personal.dateOfBirth} onChange={(e) => setPersonal({ ...personal, dateOfBirth: e.target.value })} /></div>
                <div><Label>Nationality</Label><Select value={personal.nationality} onValueChange={(v) => setPersonal({ ...personal, nationality: v })}><SelectTrigger><SelectValue placeholder="Select nationality" /></SelectTrigger><SelectContent className="max-h-72">{NATIONALITIES.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent></Select></div>
              </div>
              <div><Label>Country of Residence</Label><Select value={personal.countryOfResidence} onValueChange={(v) => setPersonal({ ...personal, countryOfResidence: v })}><SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger><SelectContent className="max-h-72">{COUNTRIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
              <div><Label htmlFor="street">Street Address</Label><Input id="street" value={personal.streetAddress} onChange={(e) => setPersonal({ ...personal, streetAddress: e.target.value })} /></div>
              <div className="grid md:grid-cols-2 gap-4">
                <div><Label htmlFor="city">City</Label><Input id="city" value={personal.city} onChange={(e) => setPersonal({ ...personal, city: e.target.value })} /></div>
                <div><Label htmlFor="postal">Postal Code</Label><Input id="postal" value={personal.postalCode} onChange={(e) => setPersonal({ ...personal, postalCode: e.target.value })} /></div>
              </div>
              {/* NEW: Phone Number Field */}
              <div><Label htmlFor="phone">Phone Number (Optional but recommended)</Label><Input id="phone" type="tel" placeholder="+1234567890" value={personal.phone} onChange={(e) => setPersonal({ ...personal, phone: e.target.value })} /><p className="text-xs text-muted-foreground mt-1">For account recovery and important notifications</p></div>
              <Button onClick={() => setCurrentStep(2)} disabled={!isPersonalComplete()} className="w-full">Continue</Button>
            </div>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 2: Identity Document</h2>
            <div className="space-y-4">
              <div><Label>Document Type</Label><Select value={formData.idType} onValueChange={(value) => setFormData({ ...formData, idType: value, idDocumentFront: null, idDocumentBack: null })}><SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger><SelectContent><SelectItem value="passport">Passport</SelectItem><SelectItem value="drivers_license">Driver's License</SelectItem><SelectItem value="national_id">National ID Card</SelectItem><SelectItem value="residence_permit">Residence Permit</SelectItem><SelectItem value="voters_card">Voter ID</SelectItem><SelectItem value="other">Other</SelectItem></SelectContent></Select></div>
              {formData.idType && (<><div><Label>{needsBack ? "Front Side" : "Document"} (JPG, PNG, PDF — max 5MB)</Label><Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => onFileChange("idDocumentFront", e.target.files?.[0] || null)} />{formData.idDocumentFront && <p className="text-xs text-muted-foreground mt-1">✓ {formData.idDocumentFront.name}</p>}</div>{needsBack && (<div><Label>Back Side (JPG, PNG, PDF — max 5MB)</Label><Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => onFileChange("idDocumentBack", e.target.files?.[0] || null)} />{formData.idDocumentBack && <p className="text-xs text-muted-foreground mt-1">✓ {formData.idDocumentBack.name}</p>}</div>)}</>)}
              <div className="flex gap-3"><Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button><Button onClick={() => setCurrentStep(3)} disabled={!isIdComplete()} className="flex-1">Continue</Button></div>
            </div>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 3: Proof of Address</h2>
            <div className="space-y-4">
              <div><Label>Document Type</Label><Select value={formData.utilityType} onValueChange={(value) => setFormData({ ...formData, utilityType: value })}><SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger><SelectContent><SelectItem value="utility_bill">Utility Bill</SelectItem><SelectItem value="bank_statement">Bank Statement</SelectItem><SelectItem value="government_letter">Government Letter</SelectItem></SelectContent></Select></div>
              <div><Label>Upload (less than 3 months old, max 5MB)</Label><Input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => onFileChange("utilityBill", e.target.files?.[0] || null)} />{formData.utilityBill && <p className="text-xs text-muted-foreground mt-1">✓ {formData.utilityBill.name}</p>}</div>
              <div className="flex gap-3"><Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button><Button onClick={() => setCurrentStep(4)} disabled={!formData.utilityType || !formData.utilityBill} className="flex-1">Continue</Button></div>
            </div>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Step 4: Selfie Verification</h2>
            <div className="space-y-4">
              <div><Label>Upload Selfie with ID next to your face (JPG, PNG — max 5MB)</Label><p className="text-sm text-muted-foreground mb-2">Take a clear, well-lit selfie holding your ID document next to your face</p><Input type="file" accept="image/jpeg,image/png" onChange={(e) => onFileChange("selfie", e.target.files?.[0] || null, false)} />{formData.selfie && <p className="text-xs text-muted-foreground mt-1">✓ {formData.selfie.name}</p>}</div>
              <div className="flex gap-3"><Button variant="outline" onClick={() => setCurrentStep(3)}>Back</Button><Button onClick={handleSubmit} disabled={!formData.selfie || submitting} className="flex-1">{submitting ? "Submitting..." : "Submit Verification"}</Button></div>
            </div>
          </Card>
        )}
      </main>
      <BottomNav />
    </div>
  );
}