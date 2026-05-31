import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendViaResend(apiKey: string, to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "Universal Stock Trade <noreply@universalstocktrade.com>",
      to: [to],
      subject,
      html,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Resend failed: ${JSON.stringify(data)}`);
  return { provider: "resend", id: data.id };
}

async function sendViaSmtp(user: string, password: string, to: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 587,
      tls: true,
      auth: { username: user, password },
    },
  });
  try {
    await client.send({
      from: `Universal Stock Trade <${user}>`,
      to,
      subject,
      content: "Please view this message in an HTML-capable client.",
      html,
    });
  } finally {
    await client.close();
  }
  return { provider: "gmail_smtp", id: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { template_name, recipient_email, variables } = await req.json();
    if (!template_name || !recipient_email) {
      return new Response(JSON.stringify({ error: "template_name and recipient_email are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const smtpUser = Deno.env.get("GMAIL_SMTP_USER");
    const smtpPass = Deno.env.get("GMAIL_SMTP_PASSWORD");
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: template, error: tErr } = await supabase
      .from("email_templates").select("*").eq("template_name", template_name).single();
    if (tErr || !template) {
      return new Response(JSON.stringify({ error: `Template '${template_name}' not found` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let subject = template.subject;
    let bodyHtml = template.body_html;
    if (variables && typeof variables === "object") {
      for (const [k, v] of Object.entries(variables)) {
        const re = new RegExp(`\\{\\{${k}\\}\\}`, "g");
        subject = subject.replace(re, String(v));
        bodyHtml = bodyHtml.replace(re, String(v));
      }
    }

    let result: { provider: string; id: string | null } | null = null;
    let lastError: string | null = null;

    // Try Resend first
    if (resendApiKey) {
      try {
        result = await sendViaResend(resendApiKey, recipient_email, subject, bodyHtml);
      } catch (e: any) {
        lastError = `Resend: ${e.message}`;
        console.warn(lastError);
      }
    }

    // Fallback: Gmail SMTP
    if (!result && smtpUser && smtpPass) {
      try {
        result = await sendViaSmtp(smtpUser, smtpPass, recipient_email, subject, bodyHtml);
      } catch (e: any) {
        lastError = `${lastError ? lastError + " | " : ""}SMTP: ${e.message}`;
        console.error(lastError);
      }
    }

    if (!result) {
      // No providers available — log only
      if (!resendApiKey && !smtpUser) {
        console.log("No email provider configured. Email logged:", { recipient_email, subject });
        return new Response(JSON.stringify({ success: true, message: "Email logged (no provider configured)" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "All email providers failed", details: lastError }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Best-effort log
    try {
      await supabase.from("email_logs").insert({
        template_name, recipient_email, subject,
        status: "sent", metadata: { provider: result.provider, id: result.id },
      });
    } catch (_) { /* table may not exist */ }

    return new Response(JSON.stringify({ success: true, provider: result.provider, id: result.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
