export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { sendEmail } from '@/lib/brevo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const { to, subject, htmlContent } = body as {
      to: { email: string; name?: string }[];
      subject: string;
      htmlContent: string;
    };

    if (!to || !subject || !htmlContent) {
      return Response.json({ error: 'Missing required fields: to, subject, htmlContent' }, { status: 400 });
    }

    if (!Array.isArray(to) || to.length === 0) {
      return Response.json({ error: 'to must be a non-empty array' }, { status: 400 });
    }

    const result = await sendEmail({ to, subject, htmlContent });
    return Response.json({ success: true, result });
  } catch (err) {
    console.error('Email API error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    return Response.json({ error: message }, { status: 500 });
  }
}
