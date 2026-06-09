import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an AI assistant for a trading platform. Analyze this error and respond with ONLY valid JSON.

Example response:
{
  "error_type": "database",
  "root_cause": "User profile missing",
  "suggested_fix_type": "profile_update",
  "suggested_fix_details": {"email": "user@example.com", "full_name": "User Name"},
  "confidence": "high",
  "user_friendly_message": "Your profile is being created"
}

Available fix types: sql_query, balance_update, profile_update, retry, notify_user

Analyze this error and respond with ONLY JSON:`;

async function sendToTelegramWithButtons(message: string, callbackData: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Yes, apply fix", callback_data: `approve_${callbackData}` },
          { text: "❌ No, reject", callback_data: `reject_${callbackData}` }
        ]]
      }
    })
  });
  return await response.json();
}

async function sendSimpleTelegramMessage(message: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML"
    })
  });
}

serve(async (req) => {
  try {
    // Parse the request body safely
    let body = {};
    try {
      body = await req.json();
    } catch (parseError) {
      console.error("Failed to parse JSON:", parseError);
      body = {};
    }
    
    // Safely extract values with defaults for EVERY field
    const error_message = body.error_message || "No error message provided";
    const error_stack = body.error_stack || "No stack trace available";
    const user_id = body.user_id || null;
    const user_email = body.user_email || "Not logged in";
    const page_url = body.page_url || "Unknown page";
    
    // Log received data
    console.log("Received error:", {
      message: error_message,
      user: user_email,
      page: page_url
    });
    
    // Send processing message - safely handle substring
    let shortMessage = error_message;
    if (typeof shortMessage === "string" && shortMessage.length > 100) {
      shortMessage = shortMessage.substring(0, 100) + "...";
    }
    await sendSimpleTelegramMessage(`🤖 AI is analyzing: ${shortMessage}`);
    
    // Prepare prompt for Gemini
    const safeErrorMessage = typeof error_message === "string" ? error_message : String(error_message);
    const safeErrorStack = typeof error_stack === "string" ? error_stack : String(error_stack);
    
    const prompt = `${SYSTEM_PROMPT}\n\nError: ${safeErrorMessage}\nStack: ${safeErrorStack}\nUser: ${user_email}`;
    
    // Call Gemini API
    const geminiResponse = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          topP: 0.95,
          topK: 40
        }
      })
    });
    
    const geminiData = await geminiResponse.json();
    const geminiText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    
    // Parse Gemini response
    let analysis = {
      error_type: "unknown",
      root_cause: "Unable to determine root cause",
      suggested_fix_type: "notify_user",
      suggested_fix_details: {},
      confidence: "low",
      user_friendly_message: "An error occurred. Our team has been notified."
    };
    
    try {
      const jsonMatch = geminiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = {
          error_type: parsed.error_type || analysis.error_type,
          root_cause: parsed.root_cause || analysis.root_cause,
          suggested_fix_type: parsed.suggested_fix_type || analysis.suggested_fix_type,
          suggested_fix_details: parsed.suggested_fix_details || analysis.suggested_fix_details,
          confidence: parsed.confidence || analysis.confidence,
          user_friendly_message: parsed.user_friendly_message || analysis.user_friendly_message
        };
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", geminiText);
    }
    
    // Create callback data
    const callbackData = btoa(JSON.stringify({
      fix_type: analysis.suggested_fix_type,
      fix_details: analysis.suggested_fix_details,
      error_message: safeErrorMessage,
      user_id: user_id,
      user_email: user_email
    }));
    
    // Send final message to Telegram
    const telegramMessage = `
🤖 <b>AI Error Analysis</b>

📌 <b>Type:</b> ${analysis.error_type}
🎯 <b>Confidence:</b> ${analysis.confidence}

📝 <b>Root Cause:</b>
${analysis.root_cause}

🔧 <b>Suggested Fix Type:</b> ${analysis.suggested_fix_type}
<code>${JSON.stringify(analysis.suggested_fix_details, null, 2)}</code>

👤 <b>User:</b> ${user_email}
📍 <b>Page:</b> ${page_url}
⏰ <b>Time:</b> ${new Date().toLocaleString()}

💬 <b>Message:</b> ${analysis.user_friendly_message}

<u>Apply this fix?</u>`;
    
    await sendToTelegramWithButtons(telegramMessage, callbackData);
    
    return new Response(JSON.stringify({ success: true, analysis }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Function error:", errorMessage);
    
    // Try to send error notification
    try {
      await sendSimpleTelegramMessage(`❌ Error Analysis Failed: ${errorMessage}`);
    } catch (tgError) {
      console.error("Failed to send Telegram message:", tgError);
    }
    
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
});
