import { useState, useEffect } from "react";
import {
  Flag,
  Search,
  Edit,
  Users,
  Eye,
  EyeOff,
  Rocket,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeatureFlag {
  id: string;
  feature_name: string;
  display_name: string;
  description: string | null;
  icon: string | null;
  route: string | null;
  visibility_type: string;
  coming_soon_message: string | null;
  is_active: boolean;
  order_index: number;
}

interface UserAccess {
  id: string;
  user_id: string;
  feature_id: string;
  has_access: boolean;
  granted_at: string;
  expires_at: string | null;
  profiles?: { full_name: string; email: string };
}

export const AdminFeatures = () => {
  const { toast } = useToast();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [userAccess, setUserAccess] = useState<UserAccess[]>([]);
  const [loading, setLoading] = useState(true);
  const [editFeature, setEditFeature] = useState<FeatureFlag | null>(null);
  const [editForm, setEditForm] = useState<Partial<FeatureFlag>>({});
  const [accessSearch, setAccessSearch] = useState("");
  const [selectedFeatureForAccess, setSelectedFeatureForAccess] = useState<string>("");
  const [grantEmail, setGrantEmail] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: flagsData } = await (supabase as any)
        .from("feature_flags")
        .select("*")
        .order("order_index");

      setFeatures(flagsData || []);

      const { data: accessData } = await (supabase as any)
        .from("user_feature_access")
        .select(`*, profiles!user_feature_access_user_id_fkey(full_name, email)`)
        .order("granted_at", { ascending: false });

      setUserAccess(accessData || []);
    } catch (error) {
      console.error("Error fetching features:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditFeature = (feature: FeatureFlag) => {
    setEditFeature(feature);
    setEditForm({ ...feature });
  };

  const handleSaveFeature = async () => {
    if (!editFeature) return;
    try {
      const { error } = await (supabase as any)
        .from("feature_flags")
        .update({
          display_name: editForm.display_name,
          description: editForm.description,
          visibility_type: editForm.visibility_type,
          coming_soon_message: editForm.coming_soon_message,
          icon: editForm.icon,
          route: editForm.route,
          order_index: editForm.order_index,
          is_active: editForm.is_active,
        })
        .eq("id", editFeature.id);

      if (error) throw error;
      toast({ title: "Feature updated" });
      setEditFeature(null);
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleReleaseFeature = async (featureId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("feature_flags")
        .update({ visibility_type: "all", coming_soon_message: null })
        .eq("id", featureId);

      if (error) throw error;
      toast({ title: "Feature released to all users!" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleGrantAccess = async () => {
    if (!grantEmail || !selectedFeatureForAccess) {
      toast({ title: "Error", description: "Enter email and select feature", variant: "destructive" });
      return;
    }
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", grantEmail)
        .single();

      if (!profile) {
        toast({ title: "Error", description: "User not found", variant: "destructive" });
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await (supabase as any)
        .from("user_feature_access")
        .upsert({
          user_id: profile.id,
          feature_id: selectedFeatureForAccess,
          has_access: true,
          granted_by: user?.id,
        }, { onConflict: "user_id,feature_id" });

      if (error) throw error;
      toast({ title: "Access granted" });
      setGrantEmail("");
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleRevokeAccess = async (accessId: string) => {
    try {
      const { error } = await (supabase as any)
        .from("user_feature_access")
        .delete()
        .eq("id", accessId);

      if (error) throw error;
      toast({ title: "Access revoked" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const getVisibilityBadge = (type: string) => {
    switch (type) {
      case "all": return <Badge className="bg-emerald-500/20 text-emerald-500">All Users</Badge>;
      case "specific_users": return <Badge className="bg-amber-500/20 text-amber-500">Specific Users</Badge>;
      case "admins_only": return <Badge className="bg-purple-500/20 text-purple-500">Admins Only</Badge>;
      case "coming_soon": return <Badge className="bg-blue-500/20 text-blue-500">Coming Soon</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (loading) {
    return <div className="p-6"><div className="animate-pulse space-y-4"><div className="h-8 bg-muted rounded w-48" /><div className="h-64 bg-muted rounded" /></div></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Flag className="w-6 h-6 text-secondary" />
          Feature Visibility Control
        </h1>
        <p className="text-muted-foreground">Manage which features are visible to users</p>
      </div>

      <Tabs defaultValue="features">
        <TabsList>
          <TabsTrigger value="features">Feature Flags</TabsTrigger>
          <TabsTrigger value="access">User Access</TabsTrigger>
        </TabsList>

        <TabsContent value="features" className="space-y-4">
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Feature</TableHead>
                    <TableHead>Display Name</TableHead>
                    <TableHead>Visibility</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {features.map((feature) => (
                    <TableRow key={feature.id}>
                      <TableCell className="font-mono text-sm">{feature.feature_name}</TableCell>
                      <TableCell className="font-medium">{feature.display_name}</TableCell>
                      <TableCell>{getVisibilityBadge(feature.visibility_type)}</TableCell>
                      <TableCell>
                        {feature.coming_soon_message ? (
                          <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                        ) : (
                          <Badge className="bg-emerald-500/20 text-emerald-500 text-xs">Active</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEditFeature(feature)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          {feature.visibility_type !== "all" && (
                            <Button size="sm" variant="outline" onClick={() => handleReleaseFeature(feature.id)} className="text-xs">
                              <Rocket className="w-3 h-3 mr-1" /> Release
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access" className="space-y-4">
          {/* Grant Access Form */}
          <Card className="bg-card border-border">
            <CardContent className="pt-4">
              <h3 className="font-semibold mb-3">Grant Feature Access</h3>
              <div className="flex flex-col md:flex-row gap-3">
                <Input placeholder="User email" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} className="flex-1" />
                <Select value={selectedFeatureForAccess} onValueChange={setSelectedFeatureForAccess}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Select feature" />
                  </SelectTrigger>
                  <SelectContent>
                    {features.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.display_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleGrantAccess}>Grant Access</Button>
              </div>
            </CardContent>
          </Card>

          {/* Access List */}
          <Card className="bg-card border-border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Feature</TableHead>
                    <TableHead>Granted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {userAccess.map((access) => (
                    <TableRow key={access.id}>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{access.profiles?.full_name || "Unknown"}</p>
                          <p className="text-muted-foreground text-xs">{access.profiles?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>{features.find((f) => f.id === access.feature_id)?.display_name || "Unknown"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(access.granted_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="destructive" onClick={() => handleRevokeAccess(access.id)}>Revoke</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {userAccess.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No user-specific access configured.</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Feature Modal */}
      <Dialog open={!!editFeature} onOpenChange={() => setEditFeature(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Feature</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Feature Name</Label>
              <Input value={editForm.feature_name || ""} disabled />
            </div>
            <div>
              <Label>Display Name</Label>
              <Input value={editForm.display_name || ""} onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })} />
            </div>
            <div>
              <Label>Visibility Type</Label>
              <Select value={editForm.visibility_type || "all"} onValueChange={(v) => setEditForm({ ...editForm, visibility_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  <SelectItem value="specific_users">Specific Users Only</SelectItem>
                  <SelectItem value="admins_only">Admins Only</SelectItem>
                  <SelectItem value="coming_soon">Coming Soon</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Coming Soon Message</Label>
              <Textarea value={editForm.coming_soon_message || ""} onChange={(e) => setEditForm({ ...editForm, coming_soon_message: e.target.value })} />
            </div>
            <div>
              <Label>Route</Label>
              <Input value={editForm.route || ""} onChange={(e) => setEditForm({ ...editForm, route: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.is_active || false} onCheckedChange={(v) => setEditForm({ ...editForm, is_active: v })} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSaveFeature} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
