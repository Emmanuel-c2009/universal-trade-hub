// src/services/notificationService.ts
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = 'universalstocktrade24@gmail.com';
const ADMIN_TELEGRAM = '@UniversalStockTrade'; // Your admin Telegram username

export const sendDepositNotification = async (
  deposit: any,
  action: 'submitted' | 'approved' | 'declined'
) => {
  try {
    console.log(`[NOTIFICATION] Sending ${action} notification for deposit ${deposit.id}`);
    
    // Send all notifications in parallel (don't wait for all)
    await Promise.allSettled([
      sendAdminEmail(deposit, action),
      sendTelegramNotification(deposit, action),
      sendUserNotification(deposit, action),
      sendUserEmail(deposit, action),
    ]);
    
    console.log(`[NOTIFICATION] ✅ ${action} notification sent for deposit ${deposit.id}`);
  } catch (error) {
    console.error('[NOTIFICATION] Error:', error);
  }
};

export const sendP2PNotification = async (
  trade: any,
  action: 'submitted' | 'approved' | 'completed' | 'declined' | 'cancelled'
) => {
  try {
    console.log(`[NOTIFICATION] Sending P2P ${action} notification for trade ${trade.id}`);
    
    await Promise.allSettled([
      sendP2PAdminEmail(trade, action),
      sendP2PTelegram(trade, action),
      sendP2PUserNotification(trade, action),
      sendP2PUserEmail(trade, action),
    ]);
    
    console.log(`[NOTIFICATION] ✅ P2P ${action} notification sent`);
  } catch (error) {
    console.error('[NOTIFICATION] P2P Error:', error);
  }
};

export const sendWithdrawalNotification = async (
  withdrawal: any,
  action: 'submitted' | 'approved' | 'declined' | 'processing'
) => {
  try {
    console.log(`[NOTIFICATION] Sending withdrawal ${action} notification`);
    
    await Promise.allSettled([
      sendWithdrawalAdminEmail(withdrawal, action),
      sendWithdrawalTelegram(withdrawal, action),
      sendWithdrawalUserNotification(withdrawal, action),
      sendWithdrawalUserEmail(withdrawal, action),
    ]);
  } catch (error) {
    console.error('[NOTIFICATION] Withdrawal Error:', error);
  }
};

// ============ DEPOSIT NOTIFICATIONS ============

const sendAdminEmail = async (deposit: any, action: string) => {
  const subject = action === 'submitted' 
    ? `💰 New Deposit Request - €${deposit.amount}`
    : action === 'approved'
    ? `✅ Deposit Approved - €${deposit.amount}`
    : `❌ Deposit Declined - €${deposit.amount}`;
  
  const statusColor = action === 'approved' ? '#10b981' : action === 'declined' ? '#ef4444' : '#f59e0b';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
        <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Deposit ${action.toUpperCase()}</h2>
        </div>
        <div style="padding: 20px;">
          <p><strong>User:</strong> ${deposit.profiles?.full_name || 'Unknown'}</p>
          <p><strong>Email:</strong> ${deposit.profiles?.email}</p>
          <p><strong>Amount:</strong> €${deposit.amount.toLocaleString()}</p>
          <p><strong>Method:</strong> ${deposit.deposit_method?.toUpperCase()}</p>
          <p><strong>Type:</strong> ${deposit.crypto_type || 'Card'}</p>
          <p><strong>TXID:</strong> ${deposit.txid || 'N/A'}</p>
          <p><strong>Date:</strong> ${new Date(deposit.created_at).toLocaleString()}</p>
          <a href="https://ustrader24.online/admin/deposits" style="display: inline-block; padding: 10px 20px; background-color: ${statusColor}; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            View in Admin Panel
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'custom',
      recipient_email: ADMIN_EMAIL,
      custom_subject: subject,
      custom_html: html,
    }
  });
};

const sendTelegramNotification = async (deposit: any, action: string) => {
  await supabase.functions.invoke('send-email', {
    body: {
      notification_type: `deposit_${action}`,
      event_data: {
        user_name: deposit.profiles?.full_name,
        user_email: deposit.profiles?.email,
        amount: deposit.amount,
        method: deposit.deposit_method,
        crypto_type: deposit.crypto_type,
        deposit_id: deposit.id,
      }
    }
  });
};

const sendUserNotification = async (deposit: any, action: string) => {
  const title = action === 'approved' ? '✅ Deposit Approved' : action === 'declined' ? '❌ Deposit Declined' : '📝 Deposit Submitted';
  const message = action === 'approved' 
    ? `Your deposit of €${deposit.amount.toLocaleString()} has been approved and added to your balance.`
    : action === 'declined'
    ? `Your deposit of €${deposit.amount.toLocaleString()} was declined. Reason: ${deposit.admin_notes || 'Please contact support'}`
    : `Your deposit request of €${deposit.amount.toLocaleString()} has been submitted and is pending approval.`;
  
  await supabase.from('notifications').insert({
    user_id: deposit.user_id,
    title: title,
    message: message,
    type: 'deposit',
    related_id: deposit.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });
};

const sendUserEmail = async (deposit: any, action: string) => {
  const statusColor = action === 'approved' ? '#10b981' : action === 'declined' ? '#ef4444' : '#f59e0b';
  const statusText = action === 'approved' ? 'Approved' : action === 'declined' ? 'Declined' : 'Received';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="font-family: Arial, sans-serif; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden;">
        <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Deposit ${statusText}</h2>
        </div>
        <div style="padding: 20px;">
          <p>Dear ${deposit.profiles?.full_name || 'Valued Customer'},</p>
          <div style="text-align: center; margin: 20px 0;">
            <div style="font-size: 32px; font-weight: bold; color: ${statusColor};">€${deposit.amount.toLocaleString()}</div>
          </div>
          <p><strong>Status:</strong> ${action.toUpperCase()}</p>
          <p><strong>Method:</strong> ${deposit.deposit_method?.toUpperCase()}</p>
          ${deposit.crypto_type ? `<p><strong>Crypto:</strong> ${deposit.crypto_type}</p>` : ''}
          <a href="https://ustrader24.online/deposit-history" style="display: inline-block; padding: 10px 20px; background-color: ${statusColor}; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px;">
            View Deposit History
          </a>
        </div>
      </div>
    </body>
    </html>
  `;
  
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'custom',
      recipient_email: deposit.profiles?.email,
      custom_subject: `Deposit ${statusText} - €${deposit.amount.toLocaleString()}`,
      custom_html: html,
    }
  });
};

// ============ P2P NOTIFICATIONS ============

const sendP2PAdminEmail = async (trade: any, action: string) => {
  const subject = action === 'submitted' 
    ? `🔄 New P2P Trade Request - €${trade.amount}`
    : action === 'approved'
    ? `✅ P2P Trade Approved - €${trade.amount}`
    : action === 'completed'
    ? `💰 P2P Trade Completed - €${trade.amount}`
    : `❌ P2P Trade ${action} - €${trade.amount}`;
  
  const html = `
    <h2>P2P Trade ${action.toUpperCase()}</h2>
    <p><strong>User:</strong> ${trade.profiles?.full_name || 'Unknown'}</p>
    <p><strong>Email:</strong> ${trade.profiles?.email}</p>
    <p><strong>Amount:</strong> €${trade.amount}</p>
    <p><strong>Type:</strong> ${trade.crypto_type}</p>
    <a href="https://ustrader24.online/admin/p2p">View in Admin Panel</a>
  `;
  
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'custom',
      recipient_email: ADMIN_EMAIL,
      custom_subject: subject,
      custom_html: html,
    }
  });
};

const sendP2PTelegram = async (trade: any, action: string) => {
  await supabase.functions.invoke('send-email', {
    body: {
      notification_type: `p2p_trade_${action}`,
      event_data: {
        user_name: trade.profiles?.full_name,
        user_email: trade.profiles?.email,
        amount: trade.amount,
        trade_id: trade.id,
      }
    }
  });
};

const sendP2PUserNotification = async (trade: any, action: string) => {
  let title = '', message = '';
  
  if (action === 'approved') {
    title = '✅ Trade Approved';
    message = `Your P2P trade of €${trade.amount} has been approved. Please send payment within ${trade.default_escrow_minutes || 60} minutes.`;
  } else if (action === 'completed') {
    title = '💰 Trade Completed';
    message = `Your P2P trade of €${trade.amount} has been completed and added to your balance.`;
  } else if (action === 'declined') {
    title = '❌ Trade Declined';
    message = `Your P2P trade of €${trade.amount} was declined. Reason: ${trade.admin_notes || 'Please contact support'}`;
  } else {
    title = '📝 Trade Request Submitted';
    message = `Your P2P trade request of €${trade.amount} has been submitted and is pending approval.`;
  }
  
  await supabase.from('notifications').insert({
    user_id: trade.user_id,
    title: title,
    message: message,
    type: 'p2p_trade',
    related_id: trade.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });
};

const sendP2PUserEmail = async (trade: any, action: string) => {
  const statusText = action === 'approved' ? 'Approved' : action === 'completed' ? 'Completed' : action === 'declined' ? 'Declined' : 'Submitted';
  const statusColor = action === 'approved' ? '#f59e0b' : action === 'completed' ? '#10b981' : action === 'declined' ? '#ef4444' : '#3b82f6';
  
  const html = `
    <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
      <h2 style="color: white;">P2P Trade ${statusText}</h2>
    </div>
    <div style="padding: 20px;">
      <p>Dear ${trade.profiles?.full_name || 'Valued Customer'},</p>
      <div style="font-size: 32px; font-weight: bold; color: ${statusColor};">€${trade.amount}</div>
      <p><strong>Status:</strong> ${action.toUpperCase()}</p>
      <a href="https://ustrader24.online/p2p">View P2P Dashboard</a>
    </div>
  `;
  
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'custom',
      recipient_email: trade.profiles?.email,
      custom_subject: `P2P Trade ${statusText} - €${trade.amount}`,
      custom_html: html,
    }
  });
};

// ============ WITHDRAWAL NOTIFICATIONS ============

const sendWithdrawalAdminEmail = async (withdrawal: any, action: string) => {
  const subject = `🏦 Withdrawal ${action} - €${withdrawal.amount}`;
  
  const html = `
    <h2>Withdrawal ${action.toUpperCase()}</h2>
    <p><strong>User:</strong> ${withdrawal.profiles?.full_name || 'Unknown'}</p>
    <p><strong>Email:</strong> ${withdrawal.profiles?.email}</p>
    <p><strong>Amount:</strong> €${withdrawal.amount}</p>
    <p><strong>Method:</strong> ${withdrawal.withdrawal_method}</p>
    <a href="https://ustrader24.online/admin/withdrawals">View in Admin Panel</a>
  `;
  
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'custom',
      recipient_email: ADMIN_EMAIL,
      custom_subject: subject,
      custom_html: html,
    }
  });
};

const sendWithdrawalTelegram = async (withdrawal: any, action: string) => {
  await supabase.functions.invoke('send-email', {
    body: {
      notification_type: `withdrawal_${action}`,
      event_data: {
        user_name: withdrawal.profiles?.full_name,
        user_email: withdrawal.profiles?.email,
        amount: withdrawal.amount,
        method: withdrawal.withdrawal_method,
      }
    }
  });
};

const sendWithdrawalUserNotification = async (withdrawal: any, action: string) => {
  let title = '', message = '';
  
  if (action === 'approved') {
    title = '✅ Withdrawal Completed';
    message = `Your withdrawal of €${withdrawal.amount} has been processed and sent.`;
  } else if (action === 'processing') {
    title = '⏳ Withdrawal Processing';
    message = `Your withdrawal of €${withdrawal.amount} is being processed.`;
  } else if (action === 'declined') {
    title = '❌ Withdrawal Declined';
    message = `Your withdrawal of €${withdrawal.amount} was declined. Reason: ${withdrawal.admin_notes || 'Please contact support'}`;
  } else {
    title = '📝 Withdrawal Request Submitted';
    message = `Your withdrawal request of €${withdrawal.amount} has been submitted and is pending approval.`;
  }
  
  await supabase.from('notifications').insert({
    user_id: withdrawal.user_id,
    title: title,
    message: message,
    type: 'withdrawal',
    related_id: withdrawal.id,
    is_read: false,
    created_at: new Date().toISOString(),
  });
};

const sendWithdrawalUserEmail = async (withdrawal: any, action: string) => {
  const statusColor = action === 'approved' ? '#10b981' : action === 'processing' ? '#f59e0b' : '#ef4444';
  
  const html = `
    <div style="background-color: ${statusColor}; padding: 20px; text-align: center;">
      <h2 style="color: white;">Withdrawal ${action.toUpperCase()}</h2>
    </div>
    <div style="padding: 20px;">
      <p>Dear ${withdrawal.profiles?.full_name || 'Valued Customer'},</p>
      <div style="font-size: 32px; font-weight: bold; color: ${statusColor};">€${withdrawal.amount}</div>
      <a href="https://ustrader24.online/withdrawals">View Withdrawal History</a>
    </div>
  `;
  
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'custom',
      recipient_email: withdrawal.profiles?.email,
      custom_subject: `Withdrawal ${action} - €${withdrawal.amount}`,
      custom_html: html,
    }
  });
};