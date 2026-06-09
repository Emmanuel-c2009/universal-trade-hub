import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useErrorHandler(componentName: string) {
  const [error, setError] = useState<string | null>(null);

  const handleError = async (err: any, context?: string) => {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    const userFriendlyMessage = getUserFriendlyMessage(errorObj.message);
    
    setError(userFriendlyMessage);
    
    const { data: { session } } = await supabase.auth.getSession();
    await supabase.functions.invoke('send-telegram-error', {
      body: { 
        message: `🚨 <b>ERROR</b>\nComponent: ${componentName}\nContext: ${context || 'Unknown'}\nUser: ${session?.user?.email || 'Not logged in'}\nError: ${errorObj.message}\nStack: ${errorObj.stack?.substring(0, 300)}`
      }
    }).catch(console.error);
    
    setTimeout(() => setError(null), 5000);
    
    return userFriendlyMessage;
  };

  const clearError = () => setError(null);

  return { error, handleError, clearError };
}

function getUserFriendlyMessage(message: string): string {
  if (message.includes('23503')) return 'Request failed. Our team has been notified.';
  if (message.includes('23505')) return 'This already exists. Contact support.';
  if (message.includes('storage/file-too-large')) return 'File too large (max 5MB).';
  if (message.includes('network')) return 'Network error. Check your connection.';
  return 'Something went wrong. Our team has been notified.';
}