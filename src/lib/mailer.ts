import { getEnv } from './env.js';

export async function sendEnquiryNotification(enquiry: {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  company?: string | null;
  service?: string | null;
  message?: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const env = getEnv();

  // Strip CR/LF from all header values to prevent email header injection
  const sanitizeHeader = (str: string) => str.replace(/[\r\n]+/g, ' ').trim();
  const safeName = sanitizeHeader(enquiry.name);
  const safeService = enquiry.service ? sanitizeHeader(enquiry.service) : 'General';

  const subject = `New enquiry: ${safeService}: ${safeName}`;
  const adminUrl = `${env.APP_ORIGIN}/admin/enquiries/${enquiry.id}`;

  // Plain-text email body (never evaluate user input as HTML)
  const textBody = [
    `New enquiry received on KAIDS website:`,
    `--------------------------------------`,
    `ID: ${enquiry.id}`,
    `Name: ${enquiry.name}`,
    `Phone: ${enquiry.phone}`,
    `Email: ${enquiry.email || 'None provided'}`,
    `Company: ${enquiry.company || 'None provided'}`,
    `Service: ${enquiry.service || 'Not sure yet'}`,
    `Message:`,
    `${enquiry.message || 'No additional details provided'}`,
    `--------------------------------------`,
    `View and manage in Admin Panel:`,
    `${adminUrl}`
  ].join('\n');

  try {
    const toRecipients = env.NOTIFY_TO.split(',').map(e => e.trim()).filter(Boolean);

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.MAIL_PROVIDER_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: env.MAIL_FROM,
        to: toRecipients,
        subject,
        text: textBody
      })
    });

    if (!res.ok) {
      const errJson: any = await res.json().catch(() => ({}));
      throw new Error(errJson?.message || `HTTP ${res.status}`);
    }

    console.log(`[MAIL] Notification email dispatched for enquiry ID: ${enquiry.id}`);
    return { success: true };
  } catch (err: any) {
    console.error(`[MAIL ERROR] Failed to send notification email for enquiry ID ${enquiry.id}:`, err?.message || err);
    return { success: false, error: err?.message || 'Email delivery failed' };
  }
}
