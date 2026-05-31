// @ts-nocheck
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';
import nodemailer from 'https://esm.sh/nodemailer';

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
    const { 
      provider, 
      smtp_config, 
      subject, 
      html_content, 
      recipients, 
      users, 
      created_by 
    } = await req.json();

    let successCount = 0;
    let failCount = 0;

    if (provider === 'resend') {
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      
      for (let i = 0; i < recipients.length; i++) {
        const user = users[i];
        let personalizedHtml = html_content
          .replace(/{{name}}/g, user?.full_name || 'User')
          .replace(/{{email}}/g, user?.email || recipients[i])
          .replace(/{{date}}/g, new Date().toLocaleDateString());

        try {
          await resend.emails.send({
            from: 'Universal Stock Trade <noreply@ustrader24.online>',
            to: recipients[i],
            subject: subject,
            html: personalizedHtml,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send to ${recipients[i]}:`, error);
          failCount++;
        }
      }
    } else if (provider === 'smtp' && smtp_config) {
      const transporter = nodemailer.createTransport({
        host: smtp_config.host,
        port: smtp_config.port,
        secure: smtp_config.port === 465,
        auth: {
          user: smtp_config.user,
          pass: smtp_config.pass,
        },
      });

      for (let i = 0; i < recipients.length; i++) {
        const user = users[i];
        let personalizedHtml = html_content
          .replace(/{{name}}/g, user?.full_name || 'User')
          .replace(/{{email}}/g, user?.email || recipients[i])
          .replace(/{{date}}/g, new Date().toLocaleDateString());

        try {
          await transporter.sendMail({
            from: `"Universal Stock Trade" <${smtp_config.user}>`,
            to: recipients[i],
            subject: subject,
            html: personalizedHtml,
          });
          successCount++;
        } catch (error) {
          console.error(`Failed to send to ${recipients[i]}:`, error);
          failCount++;
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, successful: successCount, failed: failCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});