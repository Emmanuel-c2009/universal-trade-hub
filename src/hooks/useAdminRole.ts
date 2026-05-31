import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminRoleState {
  isAdmin: boolean;
  isModerator: boolean;
  isLoading: boolean;
  userId: string | null;
}

export const useAdminRole = () => {
  const [state, setState] = useState<AdminRoleState>({
    isAdmin: false,
    isModerator: false,
    isLoading: true,
    userId: null,
  });

  const checkAdminRole = useCallback(async (userId: string) => {
    try {
      // Use the secure server-side function to check roles
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin', {
        _user_id: userId
      });

      if (adminError) {
        console.error('Error checking admin role:', adminError);
        return { isAdmin: false, isModerator: false };
      }

      const { data: isModerator, error: modError } = await supabase.rpc('has_role', {
        _user_id: userId,
        _role: 'moderator'
      });

      if (modError) {
        console.error('Error checking moderator role:', modError);
      }

      return { isAdmin: !!isAdmin, isModerator: !!isModerator };
    } catch (error) {
      console.error('Error checking roles:', error);
      return { isAdmin: false, isModerator: false };
    }
  }, []);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const roles = await checkAdminRole(session.user.id);
        setState({
          isAdmin: roles.isAdmin,
          isModerator: roles.isModerator,
          isLoading: false,
          userId: session.user.id,
        });
      } else {
        setState({
          isAdmin: false,
          isModerator: false,
          isLoading: false,
          userId: null,
        });
      }
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const roles = await checkAdminRole(session.user.id);
        setState({
          isAdmin: roles.isAdmin,
          isModerator: roles.isModerator,
          isLoading: false,
          userId: session.user.id,
        });
      } else {
        setState({
          isAdmin: false,
          isModerator: false,
          isLoading: false,
          userId: null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [checkAdminRole]);

  return state;
};
