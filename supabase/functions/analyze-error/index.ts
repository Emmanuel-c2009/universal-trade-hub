import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function sendTelegramMessage(message: string, buttons?: any) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const payload: any = {
    chat_id: TELEGRAM_CHAT_ID,
    text: message,
    parse_mode: "HTML"
  };
  if (buttons) {
    payload.reply_markup = buttons;
  }
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  return await response.json();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  try {
    const body = await req.json();
    const error_message = body.error_message || "Unknown error";
    const user_email = body.user_email || "Unknown user";
    const page_url = body.page_url || "Unknown page";
    
    // Get AI analysis from Groq
    let suggestedFix = "notify_user";
    let rootCause = error_message;
    
    try {
      const response = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You analyze errors. Choose fix: profile_update, balance_update, retry, notify_user. Respond ONLY with JSON: {\"fix\":\"fix_type\",\"cause\":\"brief cause\"}" },
            { role: "user", content: `Error: ${error_message}` }
          ],
          temperature: 0.1,
          max_tokens: 100
        })
      });
      
      const data = await response.json();
      if (response.ok && data.choices?.[0]?.message?.content) {
        const text = data.choices[0].message.content;
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          suggestedFix = parsed.fix || suggestedFix;
          rootCause = parsed.cause || rootCause;
        }
      }
    } catch (err) {
      console.error("Groq error:", err);
    }
    
    // Create SIMPLE callback data - no btoa, just plain text
    const callbackData = `${suggestedFix}|${user_email}|${Date.now()}`;
    
    const message = `
⚠️ <b>ERROR DETECTED</b>

<b>Error:</b> ${error_message}
<b>User:</b> ${user_email}
<b>Page:</b> ${page_url}

🤖 <b>Groq AI:</b>
<b>Fix:</b> ${suggestedFix}
<b>Cause:</b> ${rootCause}

<b>Apply this fix?</b>`;
    
    const result = await sendTelegramMessage(message, {
      inline_keyboard: [[
        { text: "✅ Yes", callback_data: `approve_${callbackData}` },
        { text: "❌ No", callback_data: `reject_${callbackData}` }
      ]]
    });
    
    return new Response(JSON.stringify({ 
      success: true, 
      ai_fix: suggestedFix,
      telegram_ok: result.ok,
      telegram_error: result.description || "none"
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
