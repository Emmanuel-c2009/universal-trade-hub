// src/lib/profitMilestones.ts
import { supabase } from '@/integrations/supabase/client';

// Milestones to track (in Euros)
const MILESTONES = [500, 1000, 5000, 10000, 15000, 25000, 50000, 100000];

// Check if user has reached new milestones
export async function checkProfitMilestones(userId: string) {
  try {
    // Get user's total profit
    const { data: totalProfit, error: profitError } = await supabase
      .rpc('get_user_total_profit', { user_id_param: userId });
    
    if (profitError) throw profitError;
    
    // Get already achieved milestones
    const { data: achievedMilestones, error: achievedError } = await supabase
      .from('user_profit_milestones')
      .select('milestone_amount')
      .eq('user_id', userId);
    
    if (achievedError) throw achievedError;
    
    const achievedAmounts = achievedMilestones?.map(m => m.milestone_amount) || [];
    
    // Find new milestones reached
    const newMilestones = MILESTONES.filter(m => 
      totalProfit >= m && !achievedAmounts.includes(m)
    );
    
    // Process each new milestone
    for (const milestone of newMilestones) {
      await sendMilestoneNotification(userId, milestone, totalProfit);
    }
    
    return { newMilestones, totalProfit };
  } catch (error) {
    console.error('Error checking milestones:', error);
    return { newMilestones: [], totalProfit: 0 };
  }
}

// Send notification for milestone achievement
async function sendMilestoneNotification(userId: string, milestone: number, totalProfit: number) {
  try {
    // Get user details
    const { data: user } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', userId)
      .single();
    
    if (!user) return;
    
    // 1. Create In-App Notification (Bell Icon)
    await supabase.from('user_notifications').insert({
      user_id: userId,
      title: '🎉 Profit Milestone Achieved!',
      message: `Congratulations ${user.full_name || 'Trader'}! You've reached €${milestone.toLocaleString()} in total profits!`,
      type: 'achievement',
      read: false,
      created_at: new Date().toISOString()
    });
    
    // 2. Send Email
    await sendAchievementEmail(user.email, user.full_name, milestone, totalProfit);
    
    // 3. Record milestone as achieved
    await supabase.from('user_profit_milestones').insert({
      user_id: userId,
      milestone_amount: milestone,
      achieved_at: new Date().toISOString(),
      notification_sent: true,
      email_sent: true
    });
    
    console.log(`✅ Milestone €${milestone} notification sent to user ${userId}`);
    
  } catch (error) {
    console.error(`Failed to send milestone ${milestone} notification:`, error);
  }
}

// Send congratulatory email
async function sendAchievementEmail(email: string, name: string, milestone: number, totalProfit: number) {
  const nextMilestone = getNextMilestone(milestone);
  
  const subject = `🎉 Congratulations! You've reached €${milestone.toLocaleString()} in profits!`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 20px; background: linear-gradient(135deg, #1a0b2e, #DA123E); border-radius: 10px 10px 0 0; }
        .header h1 { color: white; margin: 0; }
        .content { background: #f5f5f5; padding: 30px; border-radius: 0 0 10px 10px; }
        .profit { font-size: 32px; font-weight: bold; color: #DA123E; text-align: center; margin: 20px 0; }
        .milestone { font-size: 48px; font-weight: bold; color: #f59e0b; text-align: center; margin: 20px 0; }
        .next-goal { background: #e8f5e9; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; }
        .button { display: inline-block; padding: 12px 24px; background: #DA123E; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Congratulations! 🎉</h1>
        </div>
        <div class="content">
          <h2 style="text-align: center;">Dear ${name || 'Trader'},</h2>
          
          <div class="milestone">€${milestone.toLocaleString()}</div>
          
          <p style="text-align: center; font-size: 18px;">You've reached an amazing profit milestone!</p>
          
          <div class="profit">Total Profit: €${totalProfit.toLocaleString()}</div>
          
          ${nextMilestone ? `
            <div class="next-goal">
              <strong>🎯 Next Goal: €${nextMilestone.toLocaleString()}</strong>
              <p>You need €${(nextMilestone - totalProfit).toLocaleString()} more to reach your next milestone!</p>
            </div>
          ` : ''}
          
          <div style="text-align: center;">
            <a href="https://ustrader24.online/dashboard" class="button">View Dashboard</a>
          </div>
          
          <p style="text-align: center; margin-top: 20px;">
            Keep up the great work! Your success is our success.
          </p>
        </div>
        <div class="footer">
          <p>Universal Stock Trade - Empowering Traders Worldwide</p>
        </div>
      </div>
    </body>
    </html>
  `;
  
  // Call your existing send-email edge function
  await supabase.functions.invoke('send-email', {
    body: {
      template_name: 'custom',
      recipient_email: email,
      custom_subject: subject,
      custom_html: html
    }
  });
}

// Helper to get next milestone
function getNextMilestone(currentMilestone: number): number | null {
  const milestones = [500, 1000, 5000, 10000, 15000, 25000, 50000, 100000];
  const currentIndex = milestones.indexOf(currentMilestone);
  if (currentIndex !== -1 && currentIndex + 1 < milestones.length) {
    return milestones[currentIndex + 1];
  }
  return null;
}