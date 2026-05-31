import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface FeatureFlag {
  id: string;
  feature_name: string;
  display_name: string;
  visibility_type: string;
  coming_soon_message: string | null;
  route: string | null;
}

const SUPER_ADMIN_EMAILS = [
  "universalstocktrade24@gmail.com",
  "marcosgilbertothiago@gmail.com",
];

export const useFeatureFlags = () => {
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAccessIds, setUserAccessIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setUserEmail(session.user.email || null);

      // Fetch feature flags
      const { data: flags } = await (supabase as any)
        .from("feature_flags")
        .select("*")
        .eq("is_active", true);

      setFeatures(flags || []);

      // Fetch user-specific access
      const { data: access } = await (supabase as any)
        .from("user_feature_access")
        .select("feature_id")
        .eq("user_id", session.user.id)
        .eq("has_access", true);

      setUserAccessIds((access || []).map((a: any) => a.feature_id));
      setLoading(false);
    };

    init();
  }, []);

  const isSuperUser = userEmail ? SUPER_ADMIN_EMAILS.includes(userEmail) : false;

  const isFeatureVisible = (featureName: string): boolean => {
    const feature = features.find((f) => f.feature_name === featureName);
    if (!feature) return true; // If no flag exists, show by default

    if (feature.visibility_type === "all") return true;
    if (isSuperUser) return true; // Super admins see everything
    if (feature.visibility_type === "specific_users") {
      return userAccessIds.includes(feature.id);
    }
    if (feature.visibility_type === "admins_only") return isSuperUser;
    return false;
  };

  const getComingSoonMessage = (featureName: string): string | null => {
    const feature = features.find((f) => f.feature_name === featureName);
    if (!feature) return null;
    if (feature.visibility_type !== "all" && isSuperUser) {
      return feature.coming_soon_message;
    }
    return null;
  };

  const isComingSoon = (featureName: string): boolean => {
    const feature = features.find((f) => f.feature_name === featureName);
    if (!feature) return false;
    return feature.visibility_type !== "all" && isSuperUser;
  };

  return { isFeatureVisible, getComingSoonMessage, isComingSoon, loading, isSuperUser };
};
