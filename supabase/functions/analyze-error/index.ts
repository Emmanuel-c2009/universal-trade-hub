import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

serve(async (req) => {
  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    const error_message = body.error_message || "Unknown error";
    const user_email = body.user_email || "Unknown user";
    const page_url = body.page_url || "Unknown page";
    
    console.log("Processing error:", error_message);
    
    // Simple callback data
    const simpleData = btoa(user_email);
    
    const message = `⚠️ ERROR: ${error_message}\nUser: ${user_email}\nPage: ${page_url}\n\nFix?`;
    
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        reply_markup: {
          inline_keyboard: [[
            { text: "✅ Yes", callback_data: `yes_${simpleData}` },
            { text: "❌ No", callback_data: `no_${simpleData}` }
          ]]
        }
      })
    });
    
    const result = await response.json();
    console.log("Telegram send result:", result.ok);
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    console.error("Error:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
