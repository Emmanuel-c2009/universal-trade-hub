// supabase/functions/send-bulk-communication/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      communication_id, 
      title, 
      message, 
      type, 
      category, 
      priority,
      email_subject,
      email_html,
      recipients,
      all_users,
      retry_failed 
    } = await req.json();

    // Get communication record
    const { data: comm, error: commError } = await supabaseClient
      .from('admin_communications')
      .select('*')
      .eq('id', communication_id)
      .single();

    if (commError) throw commError;

    let targetRecipients = recipients;
    let targetUsers = all_users;

    // If retrying failed sends
    if (retry_failed && comm) {
      // Get users who haven't received
      const { data: existingNotifications } = await supabaseClient
        .from('user_notifications')
        .select('user_id')
        .eq('communication_id', communication_id);

      const existingUserIds = new Set(existingNotifications?.map(n => n.user_id) || []);
      
      const { data: profiles } = await supabaseClient
        .from('profiles')
        .select('id, email, full_name')
        .not('id', 'in', `(${Array.from(existingUserIds).join(',')})`);

      targetUsers = profiles || [];
      targetRecipients = targetUsers.map(u => u.email);
    }

    let successCount = 0;
    let failCount = 0;

    // Send notifications (bell icon)
    if (type === 'notification' || type === 'both') {
      for (const user of (targetUsers || [])) {
        try {
          await supabaseClient
            .from('user_notifications')
            .insert({
              user_id: user.id,
              communication_id: communication_id,
              title: title,
              message: message,
              type: category,
              category: category,
            });
          successCount++;
        } catch (error) {
          console.error(`Failed to send notification to ${user.email}:`, error);
          failCount++;
        }
      }
    }

    // Send emails
    if (type === 'email' || type === 'both') {
      for (const recipient of (targetRecipients || [])) {
        try {
          // Find user data for personalization
          const user = targetUsers?.find(u => u.email === recipient);
          
          let personalizedHtml = email_html || message;
          if (user) {
            personalizedHtml = personalizedHtml
              .replace(/{{name}}/g, user.full_name || 'User')
              .replace(/{{email}}/g, user.email)
              .replace(/{{date}}/g, new Date().toLocaleDateString());
          }

          await supabaseClient.functions.invoke('send-email', {
            body: {
              template_name: 'custom',
              recipient_email: recipient,
              custom_subject: email_subject || title,
              custom_html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #1a1a2e 0%, #0f0f23 100%); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0;">Universal Stock Trade</h1>
                  </div>
                  <div style="padding: 30px;">
                    ${personalizedHtml}
                  </div>
                  <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 12px; color: #666;">
                    <p>Universal Stock Trade • support@ustrader24.online</p>
                  </div>
                </div>
              `,
            }
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send email to ${recipient}:`, error);
          failCount++;
        }
      }
    }

    // Update communication record
    await supabaseClient
      .from('admin_communications')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        successful_sends: successCount,
        failed_sends: failCount,
      })
      .eq('id', communication_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        successful: successCount, 
        failed: failCount 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});