import { supabase } from "@/integrations/supabase/client";

interface AIErrorContext {
  component: string;
  action?: string;
  additionalData?: any;
}

export async function sendErrorToAI(error: Error, context: AIErrorContext) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    const payload = {
      error_message: error.message,
      error_stack: error.stack,
      error_type: error.name,
      user_id: session?.user?.id,
      user_email: session?.user?.email,
      page_url: window.location.pathname,
      component: context.component,
      action: context.action,
      additional_data: context.additionalData
    };
    
    console.log("📤 Sending error to AI for analysis:", error.message);
    
    const { data, error: invokeError } = await supabase.functions.invoke('analyze-error', {
      body: payload
    });
    
    if (invokeError) {
      console.error('Failed to send error to AI:', invokeError);
    } else {
      console.log('✅ Error sent to AI successfully');
    }
    
    return data;
  } catch (err) {
    console.error('AI error handler failed:', err);
  }
}

export function getUserFriendlyError(error: Error): string {
  const message = error.message;
  
  if (message.includes('23503')) {
    return 'Your request could not be completed. Our AI system is analyzing the issue.';
  }
  if (message.includes('23505')) {
    return 'This information already exists. Our AI system will resolve this shortly.';
  }
  if (message.includes('42P01')) {
    return 'A system error occurred. Our AI is working on a fix.';
  }
  if (message.includes('storage/file-too-large')) {
    return 'File is too large. Maximum size is 5MB.';
  }
  if (message.includes('JWT')) {
    return 'Your session expired. Please refresh the page and log in again.';
  }
  if (message.includes('network')) {
    return 'Network error. Our AI will attempt to resolve this automatically.';
  }
  
  return 'Something went wrong. Our AI system is analyzing and will fix it automatically.';
}
