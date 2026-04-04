export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/brevo';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    /* ── Auth: admin only ── */
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, type, message, channel } = body as {
      userId?: string;
      type: string;
      message: string;
      channel?: string;
    };

    if (!type || !message) {
      return NextResponse.json({ error: 'type and message are required' }, { status: 400 });
    }

    const notificationChannel = channel || 'in_app';
    let targetUsers: { id: string; email: string | null; full_name: string | null }[] = [];

    /* ── Determine recipients ── */
    if (userId) {
      // Single user
      const { data: targetUser, error: userErr } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', userId)
        .single();

      if (userErr || !targetUser) {
        return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
      }
      targetUsers = [targetUser];
    } else if (type === 'broadcast_drivers') {
      const { data: drivers, error: driversErr } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'driver');

      if (driversErr) {
        return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 });
      }
      targetUsers = drivers || [];
    } else if (type === 'broadcast_clients') {
      const { data: clients, error: clientsErr } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('role', 'client');

      if (clientsErr) {
        return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
      }
      targetUsers = clients || [];
    } else {
      return NextResponse.json(
        { error: 'Provide userId for single notification, or use type broadcast_drivers/broadcast_clients' },
        { status: 400 }
      );
    }

    if (targetUsers.length === 0) {
      return NextResponse.json({ sent: 0, message: 'No recipients found' });
    }

    /* ── Insert in-app notifications ── */
    const notifications = targetUsers.map((u) => ({
      user_id: u.id,
      type,
      message,
      channel: notificationChannel,
    }));

    const { error: insertErr } = await supabase.from('notifications').insert(notifications);

    if (insertErr) {
      console.error('Notification insert error:', insertErr);
      return NextResponse.json({ error: 'Failed to send notifications' }, { status: 500 });
    }

    /* ── Send emails if channel includes email ── */
    let emailsSent = 0;
    if (notificationChannel === 'email') {
      for (const u of targetUsers) {
        if (u.email) {
          try {
            await sendEmail({
              to: [{ email: u.email, name: u.full_name || undefined }],
              subject: `CapeLoad Notification: ${type}`,
              htmlContent: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #0d0d14; padding: 24px; text-align: center;">
                    <h1 style="color: #f15f22; margin: 0; font-size: 24px;">CapeLoad</h1>
                  </div>
                  <div style="padding: 32px 24px; background: #fff;">
                    <p style="color: #666; font-size: 14px;">${message}</p>
                  </div>
                  <div style="background: #f5f5f3; padding: 16px 24px; text-align: center; font-size: 12px; color: #999;">
                    CapeLoad Logistics &middot; Cape Town, Western Cape
                  </div>
                </div>
              `,
            });
            emailsSent++;
          } catch (emailErr) {
            console.warn(`Email to ${u.email} failed:`, emailErr);
          }
        }
      }
    }

    return NextResponse.json({
      sent: targetUsers.length,
      emailsSent,
    });
  } catch (err) {
    console.error('Notifications send API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
