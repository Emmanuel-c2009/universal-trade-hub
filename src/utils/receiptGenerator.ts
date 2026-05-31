// src/utils/receiptGenerator.ts

export interface ReceiptData {
  type: 'deposit' | 'withdrawal';
  method: 'crypto' | 'card' | 'p2p' | 'bank' | 'cash_mailing' | 'card_withdrawal';
  amount: number;
  currency?: string;
  status: string;
  transactionId?: string;
  userFullName: string;
  userEmail: string;
  date: Date;
  cryptoType?: string;
  network?: string;
  walletAddress?: string;
  cardLast4?: string;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
}

// Your logo URL - FIXED
const LOGO_URL = 'https://xnnhoqvtooyipjvyfvms.supabase.co/storage/v1/object/public/Public-assets/logo.png';

// Generate QR code data URL
export const generateQRCodeDataURL = async (text: string): Promise<string> => {
  return `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(text)}`;
};

// Generate receipt HTML
export const generateReceiptHTML = async (
  data: ReceiptData,
  qrCodeUrl: string
): Promise<string> => {
  const getMethodDisplay = () => {
    switch (data.method) {
      case 'crypto': return 'Cryptocurrency';
      case 'card': return 'Credit/Debit Card';
      case 'p2p': return 'P2P Transfer';
      case 'bank': return 'Bank Transfer';
      case 'cash_mailing': return 'Cash Mailing';
      case 'card_withdrawal': return 'Withdrawal to Card';
      default: return data.method;
    }
  };

  const getMethodDetails = () => {
    switch (data.method) {
      case 'crypto':
        return `
          <tr><td>Crypto Type</td><td>${data.cryptoType || 'N/A'}</td></tr>
          <tr><td>Network</td><td>${data.network || 'N/A'}</td></tr>
          <tr><td>Wallet Address</td><td><code>${data.walletAddress || 'N/A'}</code></td></tr>
        `;
      case 'card':
        return `<tr><td>Card Number</td><td>**** ${data.cardLast4 || 'N/A'}</td></tr>`;
      case 'bank':
        return `
          <tr><td>Bank Name</td><td>${data.bankName || 'N/A'}</td></tr>
          <tr><td>Account Number</td><td>${data.accountNumber || 'N/A'}</td></tr>
        `;
      default: return '';
    }
  };

  const receiptNumber = `${data.type.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  const amountFormatted = data.amount.toLocaleString();
  const currency = data.currency || 'EUR';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${data.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Receipt - Universal Stock Trade</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 40px 20px; }
        .receipt-container { max-width: 700px; margin: 0 auto; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); overflow: hidden; }
        .receipt-header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 30px; text-align: center; color: white; }
        .logo { max-width: 180px; margin-bottom: 15px; }
        .receipt-header h1 { margin: 0; font-size: 24px; }
        .receipt-header p { margin: 5px 0 0; opacity: 0.8; }
        .receipt-body { padding: 30px; }
        .amount-section { text-align: center; margin: 20px 0; }
        .amount { font-size: 48px; font-weight: bold; color: #10b981; }
        .status-badge { display: inline-block; padding: 6px 16px; border-radius: 20px; font-size: 14px; font-weight: 600; background: #d1fae5; color: #065f46; }
        .details-table { width: 100%; margin: 20px 0; border-collapse: collapse; }
        .details-table td { padding: 12px 8px; border-bottom: 1px solid #e5e7eb; }
        .details-table td:first-child { font-weight: 600; width: 40%; color: #374151; }
        .qr-section { display: flex; justify-content: space-between; align-items: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        .qr-code { text-align: center; }
        .qr-code img { width: 100px; height: 100px; }
        .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
        @media print { body { background: white; padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="receipt-container">
        <div class="receipt-header">
          <img src="${LOGO_URL}" alt="Universal Stock Trade" class="logo" onerror="this.style.display='none'">
          <h1>${data.type === 'deposit' ? 'Deposit' : 'Withdrawal'} Receipt</h1>
          <p>Universal Stock Trade</p>
        </div>
        <div class="receipt-body">
          <div class="amount-section">
            <div class="amount">${currency} ${amountFormatted}</div>
            <span class="status-badge">${data.status.toUpperCase()}</span>
          </div>
          <table class="details-table">
            <tr><td>Receipt Number</td><td>#${receiptNumber}</td></tr>
            <tr><td>Date & Time</td><td>${data.date.toLocaleString()}</td></tr>
            <tr><td>User</td><td>${data.userFullName} (${data.userEmail})</td></tr>
            <tr><td>Transaction Type</td><td>${data.type === 'deposit' ? 'Deposit' : 'Withdrawal'}</td></tr>
            <tr><td>Payment Method</td><td>${getMethodDisplay()}</td></tr>
            ${getMethodDetails()}
            ${data.transactionId ? `<tr><td>Transaction ID</td><td><code>${data.transactionId}</code></td></tr>` : ''}
            ${data.notes ? `<tr><td>Notes</td><td>${data.notes}</td></tr>` : ''}
          </table>
          <div class="qr-section">
            <div><p><strong>Scan to visit our website</strong></p><p style="font-size:12px;">ustrader24.online</p></div>
            <div class="qr-code"><img src="${qrCodeUrl}" alt="QR Code"><p>Scan me</p></div>
          </div>
        </div>
        <div class="footer">
          <p>Thank you for trading with Universal Stock Trade</p>
          <p>This is an electronic receipt - no signature required</p>
          <p>© ${new Date().getFullYear()} Universal Stock Trade. All rights reserved.</p>
        </div>
      </div>
      <div class="no-print" style="text-align:center; margin-top:20px;">
        <button onclick="window.print()" style="padding:10px 20px; background:#3b82f6; color:white; border:none; border-radius:8px; cursor:pointer;">🖨️ Print Receipt</button>
      </div>
    </body>
    </html>
  `;
};

// Download receipt as HTML file - FIXED: 2 arguments only
export const downloadReceipt = async (data: ReceiptData, qrCodeUrl: string) => {
  const html = await generateReceiptHTML(data, qrCodeUrl);
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.type}_receipt_${Date.now()}.html`;
  a.click();
  URL.revokeObjectURL(url);
};