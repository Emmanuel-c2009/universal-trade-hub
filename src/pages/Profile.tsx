import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { User as UserIcon, Upload, Trash2, ShieldCheck, ShieldAlert, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SidebarNav } from "@/components/dashboard/SidebarNav";
import { BottomNav } from "@/components/dashboard/BottomNav";

interface ProfileData {
  full_name: string;
  email: string;
  phone: string;
  country: string;
  address: string;
  state: string;
  city: string;
  date_of_birth: string;
  avatar_url: string;
  profile_status: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      fetchProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !profile) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          address: profile.address,
          state: profile.state,
          city: profile.city,
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0] || !user) return;

    const file = event.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile!, avatar_url: publicUrl });
      toast({
        title: "Success",
        description: "Profile picture updated",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (error) throw error;

      setProfile({ ...profile!, avatar_url: "" });
      toast({
        title: "Success",
        description: "Profile picture removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 lg:pb-0">
      <SidebarNav isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <DashboardHeader
        userName={profile?.full_name || "User"}
        onMenuClick={() => setSidebarOpen(true)}
        notificationCount={0}
        messageCount={0}
      />

      <main className="container mx-auto px-4 pt-40 max-w-4xl">
        {/* Header with Gradient */}
        <div className="bg-gradient-to-r from-secondary/20 via-gold/20 to-secondary/20 rounded-t-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-foreground">My Profile</h1>
          <p className="text-muted-foreground mt-2">Manage your account information</p>
        </div>

        {/* Verification Status */}
        <Card className="p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {profile?.profile_status === "verified" ? (
                <>
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  <div>
                    <h2 className="text-lg font-semibold">Account Verified</h2>
                    <p className="text-sm text-muted-foreground">Your identity has been verified</p>
                  </div>
                </>
              ) : profile?.profile_status === "pending" ? (
                <>
                  <Clock className="w-8 h-8 text-amber-500" />
                  <div>
                    <h2 className="text-lg font-semibold">Verification Pending</h2>
                    <p className="text-sm text-muted-foreground">Your documents are under review</p>
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-8 h-8 text-muted-foreground" />
                  <div>
                    <h2 className="text-lg font-semibold">Not Verified</h2>
                    <p className="text-sm text-muted-foreground">Verify your account for full access</p>
                  </div>
                </>
              )}
            </div>
            {profile?.profile_status === "verified" ? (
              <Badge className="bg-emerald-500/20 text-emerald-500 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Verified
              </Badge>
            ) : (
              <Button variant="outline" size="sm" onClick={() => navigate("/verification")}>
                {profile?.profile_status === "pending" ? "View Status" : "Start Verification"}
              </Button>
            )}
          </div>
        </Card>

        {/* Profile Picture Section */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Profile Picture</h2>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback>
                  <UserIcon className="h-12 w-12" />
                </AvatarFallback>
              </Avatar>
              {profile?.profile_status === "verified" && (
                <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-1">
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button asChild disabled={uploading}>
                <label className="cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                </label>
              </Button>
              {profile?.avatar_url && (
                <Button variant="destructive" onClick={handleRemoveAvatar}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Editable Information */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Editable Information</h2>
          <div className="grid gap-4">
            <div>
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={profile?.address || ""}
                onChange={(e) => setProfile({ ...profile!, address: e.target.value })}
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={profile?.state || ""}
                  onChange={(e) => setProfile({ ...profile!, state: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={profile?.city || ""}
                  onChange={(e) => setProfile({ ...profile!, city: e.target.value })}
                />
              </div>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full md:w-auto">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>

        {/* Non-Editable Information */}
        <Card className="p-6 mb-6 bg-muted/30">
          <h2 className="text-xl font-semibold mb-4">Account Information</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Contact support to update these fields
          </p>
          <div className="grid gap-4">
            <div>
              <Label>Full Name</Label>
              <Input value={profile?.full_name || ""} disabled />
            </div>
            <div>
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label>Phone</Label>
                <Input value={profile?.phone || ""} disabled />
              </div>
              <div>
                <Label>Country</Label>
                <Input value={profile?.country || ""} disabled />
              </div>
            </div>
            <div>
              <Label>Date of Birth</Label>
              <Input value={profile?.date_of_birth || ""} disabled />
            </div>
          </div>
        </Card>
      </main>

      <BottomNav />
    </div>
  );
}
