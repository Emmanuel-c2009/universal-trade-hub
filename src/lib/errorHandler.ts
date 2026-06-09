import { supabase } from "@/integrations/supabase/client";

// Error types for user-friendly messages
const ERROR_MESSAGES: Record<string, string> = {
  // Database errors
  '23503': 'Your request could not be completed due to missing information. Our team has been notified.',
  '23505': 'This information already exists in our system. Please contact support if you believe this is an error.',
  '42P01': 'A system error occurred. Our team has been notified.',
  'PGRST200': 'A temporary system issue occurred. Please try again in a few minutes.',
  
  // Auth errors
  'auth/invalid-email': 'The email address you entered is not valid.',
  'auth/user-not-found': 'No account found with this email address.',
  'auth/wrong-password': 'Incorrect password. Please try again.',
  'auth/email-not-confirmed': 'Please verify your email address before logging in.',
  
  // Storage errors
  'storage/file-too-large': 'File is too large. Maximum size is 5MB.',
  'storage/unauthorized': 'You do not have permission to upload files.',
  
  // Default
  'default': 'Something went wrong. Our team has been notified and will resolve the issue shortly.'
};

// Database error codes that trigger admin notifications
const CRITICAL_ERRORS = ['23503', '23505', '42P01', 'PGRST200', '42501'];

interface ErrorDetails {
  user_id?: string;
  user_email?: string;
  page_url: string;
  component?: string;
  additional_data?: any;
}

// Send error notification to admin (Telegram + Email)
async function sendAdminErrorNotification(error: Error, details: ErrorDetails) {
  try {
    const message = `🚨 <b>ERROR ALERT</b>\n\n` +
      `<b>Type:</b> ${error.name}\n` +
      `<b>Message:</b> ${error.message}\n` +
      `<b>User ID:</b> ${details.user_id || 'Not logged in'}\n` +
      `<b>User Email:</b> ${details.user_email || 'Not logged in'}\n` +
      `<b>Page:</b> ${details.page_url}\n` +
      `<b>Component:</b> ${details.component || 'Unknown'}\n` +
      `<b>Time:</b> ${new Date().toLocaleString()}\n\n` +
      `<b>Stack:</b> ${error.stack?.substring(0, 500) || 'No stack trace'}`;
    
    // Send to Telegram (if configured)
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await supabase.functions.invoke('send-telegram-error', {
        body: { message }
      }).catch(console.error);
    }
    
    // Also send email to admin
    await supabase.functions.invoke('send-email', {
      body: {
        template_name: 'custom',
        recipient_email: 'universalstocktrade24@gmail.com',
        custom_subject: `🚨 Error Alert: ${error.name}`,
        custom_html: `
          <h2>Error Alert</h2>
          <p><strong>Type:</strong> ${error.name}</p>
          <p><strong>Message:</strong> ${error.message}</p>
          <p><strong>User ID:</strong> ${details.user_id || 'Not logged in'}</p>
          <p><strong>User Email:</strong> ${details.user_email || 'Not logged in'}</p>
          <p><strong>Page:</strong> ${details.page_url}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <pre style="background:#f4f4f4;padding:10px;overflow:auto;">${error.stack || 'No stack trace'}</pre>
        `
      }
    }).catch(console.error);
    
  } catch (err) {
    console.error('Failed to send error notification:', err);
  }
}

// Log error to database
async function logErrorToDatabase(error: Error, details: ErrorDetails) {
  try {
    await supabase.from('error_logs').insert({
      error_type: error.name,
      error_message: error.message,
      error_details: {
        stack: error.stack,
        component: details.component,
        additional_data: details.additional_data
      },
      user_id: details.user_id,
      user_email: details.user_email,
      page_url: details.page_url
    });
  } catch (err) {
    console.error('Failed to log error:', err);
  }
}

// Get user-friendly error message
function getUserFriendlyMessage(error: Error): string {
  // Check for PostgreSQL error code in message
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (error.message.includes(code)) {
      return message;
    }
  }
  
  // Check for auth error codes
  if (error.message.includes('AuthApiError')) {
    return ERROR_MESSAGES['auth/invalid-email'] || ERROR_MESSAGES.default;
  }
  
  // Return default message
  return ERROR_MESSAGES.default;
}

// Main error handler
export async function handleError(
  error: any,
  context: {
    component: string;
    action?: string;
    additionalData?: any;
    showToast?: boolean;
  }
): Promise<string> {
  const errorObj = error instanceof Error ? error : new Error(String(error));
  const userFriendlyMessage = getUserFriendlyMessage(errorObj);
  
  // Get current user info
  let userId: string | undefined;
  let userEmail: string | undefined;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    userId = session?.user?.id;
    userEmail = session?.user?.email;
  } catch (e) {
    // User not logged in
  }
  
  const details: ErrorDetails = {
    user_id: userId,
    user_email: userEmail,
    page_url: window.location.pathname,
    component: context.component,
    additional_data: {
      action: context.action,
      data: context.additionalData
    }
  };
  
  // Log to database
  await logErrorToDatabase(errorObj, details);
  
  // Send admin notification for critical errors
  const isCritical = CRITICAL_ERRORS.some(code => errorObj.message.includes(code));
  if (isCritical) {
    await sendAdminErrorNotification(errorObj, details);
  }
  
  // Show toast message if requested
  if (context.showToast !== false) {
    const toastModule = await import('sonner');
    toastModule.toast.error(userFriendlyMessage);
  }
  
  // Return the user-friendly message for further handling
  return userFriendlyMessage;
}

// Safe wrapper for async functions
export async function safeExecute<T>(
  fn: () => Promise<T>,
  context: {
    component: string;
    action?: string;
    fallbackValue?: T;
    showToast?: boolean;
  }
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    await handleError(error, {
      component: context.component,
      action: context.action,
      showToast: context.showToast
    });
    return context.fallbackValue;
  }
}

// Safe Supabase query wrapper
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context: {
    component: string;
    action: string;
    fallbackData?: T;
    showToast?: boolean;
  }
): Promise<T | null> {
  try {
    const { data, error } = await queryFn();
    if (error) {
      await handleError(error, {
        component: context.component,
        action: context.action,
        additionalData: { queryError: error },
        showToast: context.showToast
      });
      return context.fallbackData || null;
    }
    return data;
  } catch (error) {
    await handleError(error, {
      component: context.component,
      action: context.action,
      showToast: context.showToast
    });
    return context.fallbackData || null;
  }
}