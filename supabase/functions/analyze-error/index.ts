import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const SYSTEM_PROMPT = `You are an AI assistant for a trading platform. Analyze errors and respond in JSON format.

Respond with EXACTLY this structure:
{
  "error_type": "database or auth or network or unknown",
  "root_cause": "What caused this error",
  "suggested_fix_type": "sql_query or balance_update or profile_update or retry",
  "suggested_fix_details": {
    "query": "exact SQL to run",
    "table": "table name",
    "user_id": "affected user ID"
  },
  "confidence": "high/medium/low",
  "user_friendly_message": "Message to show the user"
}`;

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

async function analyzeWithGemini(errorMessage: string, errorStack: string) {
  const prompt = `${SYSTEM_PROMPT}\n\nError: ${errorMessage}\nStack: ${errorStack || "No stack trace"}`;
  const response = await fetch(GEMINI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    })
  });
  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
    return JSON.parse(text);
  } catch (e) {
    return {
      error_type: "unknown",
      root_cause: "Could not analyze error",
      suggested_fix_type: "retry",
      suggested_fix_details: {},
      confidence: "low",
      user_friendly_message: "An error occurred. Our team has been notified."
    };
  }
}

serve(async (req) => {
  try {
    const { error_message, error_stack, user_id, user_email, page_url } = await req.json();
    console.log("📝 Analyzing error:", error_message);
    const analysis = await analyzeWithGemini(error_message, error_stack);
    const callbackData = btoa(JSON.stringify({
      fix_type: analysis.suggested_fix_type,
      fix_details: analysis.suggested_fix_details,
      error_message: error_message,
      user_id: user_id
    }));
    const telegramMessage = `
🤖 <b>AI Error Analysis</b>

📌 Type: ${analysis.error_type}
🎯 Confidence: ${analysis.confidence}

📝 <b>Root Cause:</b>
${analysis.root_cause}

🔧 <b>Suggested Fix:</b>
<code>${JSON.stringify(analysis.suggested_fix_details, null, 2)}</code>

👤 User: ${user_email || "Not logged in"}
📍 Page: ${page_url}
⏰ Time: ${new Date().toLocaleString()}

<u>Apply this fix?</u>`;
    await sendToTelegramWithButtons(telegramMessage, callbackData);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
