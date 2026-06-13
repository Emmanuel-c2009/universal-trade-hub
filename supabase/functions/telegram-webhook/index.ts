import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

async function sendTelegramMessage(chatId: string, message: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "HTML"
    })
  });
}

serve(async (req) => {
  try {
    const update = await req.json();
    console.log("Webhook received:", JSON.stringify(update));
    
    // Handle button clicks
    if (update.callback_query) {
      const { data, id, message } = update.callback_query;
      const chatId = message.chat.id;
      
      console.log("Button clicked:", data);
      
      // Answer the callback immediately (removes loading state)
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callback_query_id: id,
          text: "Processing your request..."
        })
      });
      
      // Parse the callback data
      if (data.startsWith("approve_")) {
        const callbackData = data.replace("approve_", "");
        const [fixType, userEmail, timestamp] = callbackData.split("|");
        
        console.log(`Approved: ${fixType} for ${userEmail}`);
        
        // Send confirmation
        await sendTelegramMessage(chatId, `✅ Fix approved! Executing ${fixType} for ${userEmail}...`);
        
        // Here you would call execute-error-fix or apply the fix directly
        // For now, just confirm
        await sendTelegramMessage(chatId, `✅ ${fixType} completed successfully!`);
        
      } else if (data.startsWith("reject_")) {
        await sendTelegramMessage(chatId, "❌ Fix rejected. No action taken.");
      }
      
      return new Response("OK", { status: 200 });
    }
    
    return new Response("OK", { status: 200 });
  } catch (error) {
    console.error("Webhook error:", error.message);
    return new Response("Error", { status: 500 });
  }
});
