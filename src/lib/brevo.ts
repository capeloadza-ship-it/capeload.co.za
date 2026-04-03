// Brevo (Sendinblue) transactional email wrapper
// Uses REST API v3 — no SDK needed

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

interface EmailParams {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
}

export async function sendEmail({ to, subject, htmlContent }: EmailParams) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error('BREVO_API_KEY not configured');

  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'noreply@capeload.co.za';
  const senderName = process.env.BREVO_SENDER_NAME || 'CapeLoad Logistics';

  const res = await fetch(BREVO_API_URL, {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to,
      subject,
      htmlContent,
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Brevo API error: ${res.status} ${error}`);
  }

  return res.json();
}

// Pre-built email templates
export function bookingConfirmationEmail(data: {
  ref: string;
  clientName: string;
  jobType: string;
  vehicle: string;
  pickup: string;
  dropoff: string;
  date: string;
  time: string;
  total: number;
}) {
  return {
    subject: `Booking Confirmed — ${data.ref} | CapeLoad`,
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d0d14; padding: 24px; text-align: center;">
          <h1 style="color: #f15f22; margin: 0; font-size: 24px;">CapeLoad</h1>
          <p style="color: #888; margin: 4px 0 0; font-size: 12px;">Your load, our road.</p>
        </div>
        <div style="padding: 32px 24px; background: #fff;">
          <h2 style="color: #1a1a1a; margin: 0 0 8px;">Booking confirmed!</h2>
          <p style="color: #666; font-size: 14px;">Hi ${data.clientName}, your booking <strong>${data.ref}</strong> has been confirmed.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 14px;">
            <tr><td style="padding: 8px 0; color: #999; border-bottom: 1px solid #eee;">Job type</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #eee;">${data.jobType}</td></tr>
            <tr><td style="padding: 8px 0; color: #999; border-bottom: 1px solid #eee;">Vehicle</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #eee;">${data.vehicle}</td></tr>
            <tr><td style="padding: 8px 0; color: #999; border-bottom: 1px solid #eee;">Route</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #eee;">${data.pickup} → ${data.dropoff}</td></tr>
            <tr><td style="padding: 8px 0; color: #999; border-bottom: 1px solid #eee;">Date & time</td><td style="padding: 8px 0; text-align: right; border-bottom: 1px solid #eee;">${data.date} at ${data.time}</td></tr>
            <tr><td style="padding: 12px 0; font-weight: 700; border-top: 2px solid #1a1a1a;">Total</td><td style="padding: 12px 0; text-align: right; font-weight: 700; font-size: 18px; color: #f15f22; border-top: 2px solid #1a1a1a;">R${data.total.toLocaleString()}</td></tr>
          </table>
          <p style="color: #666; font-size: 13px;">We'll assign a verified driver and send you updates via WhatsApp.</p>
        </div>
        <div style="background: #f5f5f3; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
          CapeLoad Logistics &middot; Cape Town, Western Cape &middot; capeload.co.za
        </div>
      </div>
    `,
  };
}

export function driverApprovedEmail(driverName: string) {
  return {
    subject: 'Welcome to CapeLoad — You\'re Approved!',
    htmlContent: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #0d0d14; padding: 24px; text-align: center;">
          <h1 style="color: #f15f22; margin: 0; font-size: 24px;">CapeLoad</h1>
        </div>
        <div style="padding: 32px 24px; background: #fff;">
          <h2 style="color: #1a1a1a;">Welcome aboard, ${driverName}!</h2>
          <p style="color: #666; font-size: 14px;">Your driver application has been approved. You can now log in to your Driver Portal and start accepting jobs.</p>
          <p style="color: #666; font-size: 14px;">Set your vehicle availability, and we'll send job alerts to your WhatsApp whenever there's a match in your area.</p>
          <a href="https://capeload.co.za/portal/driver" style="display: inline-block; padding: 12px 28px; background: #f15f22; color: #fff; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px;">Go to Driver Portal</a>
        </div>
        <div style="background: #f5f5f3; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
          CapeLoad Logistics &middot; Cape Town, Western Cape
        </div>
      </div>
    `,
  };
}
