import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Sends a one-time welcome email after the user confirms their account
 * and signs in for the first time. Tracks per-user via localStorage to
 * avoid duplicate sends. Mounted once at the app root.
 */
export const WelcomeEmailTrigger = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session?.user) return;

      const userId = session.user.id;
      const flagKey = `welcome_email_sent_${userId}`;
      if (localStorage.getItem(flagKey)) return;

      // Only send once email is confirmed (Supabase sets email_confirmed_at)
      if (!session.user.email_confirmed_at) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", userId)
          .maybeSingle();

        await supabase.functions.invoke("send-email", {
          body: {
            template_name: "welcome",
            recipient_email: profile?.email || session.user.email,
            variables: {
              user_name: profile?.full_name || session.user.email?.split("@")[0] || "Trader",
            },
          },
        });
        localStorage.setItem(flagKey, "1");
      } catch (err) {
        // Don't block login on email failure
        console.warn("Welcome email failed:", err);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
};
