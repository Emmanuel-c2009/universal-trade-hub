import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");

async function sendTelegramMessage(message: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: "HTML" })
  });
}

async function executeFix(fixType: string, fixDetails: any, userId: string) {
  const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  let result = { success: false, message: "" };
  switch (fixType) {
    case "balance_update":
      try {
        const { error } = await supabaseAdmin.from("user_balances").update({ funding_balance: fixDetails.new_balance, updated_at: new Date().toISOString() }).eq("user_id", userId);
        if (error) throw error;
        result = { success: true, message: `Balance updated to €${fixDetails.new_balance}` };
      } catch (error: any) { result = { success: false, message: `Balance update failed: ${error.message}` }; }
      break;
    case "profile_update":
      try {
        const { error } = await supabaseAdmin.from("profiles").insert({ id: userId, email: fixDetails.email, full_name: fixDetails.full_name, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), profile_status: "unverified" }).onConflict("id").ignore();
        if (error) throw error;
        result = { success: true, message: "Profile created successfully" };
      } catch (error: any) { result = { success: false, message: `Profile creation failed: ${error.message}` }; }
      break;
    default: result = { success: false, message: `Unknown fix type: ${fixType}` };
  }
  return result;
}

serve(async (req) => {
  try {
    const { action, fix_data, user_id } = await req.json();
    const fixDetails = JSON.parse(atob(fix_data));
    if (action === "approve") {
      const result = await executeFix(fixDetails.fix_type, fixDetails.fix_details, user_id);
      await sendTelegramMessage(result.success ? `✅ FIX APPLIED: ${result.message}` : `❌ FIX FAILED: ${result.message}`);
      return new Response(JSON.stringify({ success: result.success, message: result.message }), { status: 200 });
    } else if (action === "reject") {
      await sendTelegramMessage(`🚫 FIX REJECTED for ${fixDetails.error_message}`);
      return new Response(JSON.stringify({ success: true, message: "Fix rejected" }), { status: 200 });
    }
    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
