import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export default function AdminAnnouncements() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState('info');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const sendAnnouncement = async () => {
    if (!title.trim() || !message.trim()) {
      setResult({ success: false, message: 'Please fill in both title and message' });
      return;
    }

    setSending(true);
    setResult(null);

    try {
      // Get all users
      const { data: users, error: usersError } = await supabase
        .from('profiles')
        .select('id');
      
      if (usersError) throw usersError;
      
      if (!users || users.length === 0) {
        throw new Error('No users found');
      }

      // Insert notification for each user
      const notifications = users.map(user => ({
        user_id: user.id,
        title: title,
        message: message,
        notification_type: type,
        link: '/announcements'
      }));

      // Insert in batches of 100
      const batchSize = 100;
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('user_notifications')
          .insert(batch);
        
        if (insertError) throw insertError;
      }

      setResult({ 
        success: true, 
        message: `Announcement sent to ${users.length} users successfully!` 
      });
      
      setTitle('');
      setMessage('');
      
    } catch (error: any) {
      setResult({ success: false, message: error.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Send Announcement</h1>
      
      <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #ddd', padding: '24px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Announcement Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
          >
            <option value="info">📢 Information</option>
            <option value="success">✅ Success / Update</option>
            <option value="warning">⚠️ Warning</option>
            <option value="announcement">📣 Announcement</option>
          </select>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., New Feature: AI Trading Bots"
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px' }}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write your announcement message here..."
            rows={6}
            style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '6px', resize: 'vertical' }}
          />
        </div>

        {result && (
          <div style={{
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '20px',
            backgroundColor: result.success ? '#d1fae5' : '#fee2e2',
            color: result.success ? '#065f46' : '#991b1b'
          }}>
            {result.message}
          </div>
        )}

        <button
          onClick={sendAnnouncement}
          disabled={sending}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: sending ? 'not-allowed' : 'pointer',
            opacity: sending ? 0.6 : 1
          }}
        >
          {sending ? 'Sending...' : 'Send Announcement to All Users'}
        </button>
      </div>
    </div>
  );
}