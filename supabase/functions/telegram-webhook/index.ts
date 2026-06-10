import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

serve(async (req) => {
  try {
    const update = await req.json();
    
    if (update.callback_query) {
      const { data, id, message } = update.callback_query;
      const chatId = message.chat.id;
      const userEmail = atob(data.replace("yes_", "").replace("no_", ""));
      
      // Answer callback
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: id,
          text: "Processing fix..."
        })
      });
      
      if (data.startsWith("yes_")) {
        // Try to create the profile
        const { error } = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({
            id: userEmail,
            email: userEmail,
            full_name: "Auto Created",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            profile_status: "active"
          })
        });
        
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: error ? `❌ Fix failed: ${error.message}` : "✅ Profile created successfully!",
            parse_mode: "HTML"
          })
        });
      } else {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "❌ Fix rejected. No action taken.",
            parse_mode: "HTML"
          })
        });
      }
    }
    
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response("Error", { status: 500 });
  }
});
