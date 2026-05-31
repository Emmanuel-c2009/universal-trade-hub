// supabase/functions/telegram-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
      }
    })
  }

  try {
    const update = await req.json()
    console.log('Telegram webhook received:', JSON.stringify(update, null, 2))
    
    if (update.message) {
      const message = update.message
      const chatId = message.chat.id.toString()
      const text = message.text
      const replyToMessageId = message.reply_to_message?.message_id
      
      // Check if this is a vendor reply
      const { data: vendor, error: vendorError } = await supabase
        .from('p2p_vendors')
        .select('id, full_name, telegram_chat_id')
        .eq('telegram_chat_id', chatId)
        .maybeSingle()
      
      if (vendor && !vendorError && replyToMessageId) {
        // Find the most recent trade for this vendor
        const { data: trade } = await supabase
          .from('p2p_trades')
          .select('id, user_id, amount, status')
          .eq('vendor_id', vendor.id)
          .in('status', ['pending', 'payment_sent'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()
        
        if (trade) {
          // Save vendor's reply
          const { error: insertError } = await supabase
            .from('p2p_chat_messages')
            .insert({
              trade_id: trade.id,
              sender_id: vendor.id,
              sender_type: 'vendor',
              message: text,
              telegram_message_id: message.message_id.toString()
            })
          
          if (!insertError) {
            // Notify user
            await supabase.from('notifications').insert({
              user_id: trade.user_id,
              title: 'Vendor Response',
              message: `Vendor replied: ${text.substring(0, 100)}`,
              type: 'p2p_chat',
              related_id: trade.id
            })
            
            // Notify admin via edge function
            await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify({
                notification_type: 'p2p_chat_message',
                event_data: {
                  trade_id: trade.id,
                  message: text,
                  sender_name: vendor.full_name,
                  sender_type: 'vendor',
                  user_id: trade.user_id
                }
              })
            })
          }
        }
      }
    }
    
    return new Response(JSON.stringify({ ok: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    console.error('Webhook error:', errorMessage)
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    })
  }
})