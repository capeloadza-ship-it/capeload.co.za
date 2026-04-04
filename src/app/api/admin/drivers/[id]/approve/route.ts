export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, driverApprovedEmail } from '@/lib/brevo';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: driverId } = await params;
    const supabase = await createClient();

    /* ── Auth: admin/super_admin only ── */
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

    /* ── Fetch driver ── */
    const { data: driver, error: driverErr } = await supabase
      .from('drivers')
      .select('*, users!drivers_user_id_fkey(id, email, full_name)')
      .eq('id', driverId)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (driver.status === 'approved') {
      return NextResponse.json({ error: 'Driver is already approved' }, { status: 400 });
    }

    /* ── Update driver status ── */
    const { data: updatedDriver, error: updateErr } = await supabase
      .from('drivers')
      .update({ status: 'approved' })
      .eq('id', driverId)
      .select()
      .single();

    if (updateErr) {
      console.error('Driver approve update error:', updateErr);
      return NextResponse.json({ error: 'Failed to approve driver' }, { status: 500 });
    }

    /* ── Set user role to driver ── */
    const driverUser = driver.users as { id: string; email: string; full_name: string } | null;
    if (driverUser) {
      await supabase
        .from('users')
        .update({ role: 'driver' })
        .eq('id', driverUser.id);
    }

    /* ── Notify driver ── */
    try {
      if (driver.user_id) {
        await supabase.from('notifications').insert({
          user_id: driver.user_id,
          type: 'driver_approved',
          message: 'Your driver application has been approved! You can now start accepting jobs.',
          channel: 'in_app',
        });
      }
    } catch (notifyErr) {
      console.warn('Driver approval notification failed (non-critical):', notifyErr);
    }

    /* ── Send approval email via Brevo ── */
    if (driverUser?.email) {
      try {
        const tpl = driverApprovedEmail(driverUser.full_name || 'Driver');
        await sendEmail({
          to: [{ email: driverUser.email, name: driverUser.full_name || undefined }],
          subject: tpl.subject,
          htmlContent: tpl.htmlContent,
        });
      } catch (emailErr) {
        console.warn('Driver approval email failed (non-critical):', emailErr);
      }
    }

    return NextResponse.json({ driver: updatedDriver });
  } catch (err) {
    console.error('Driver approve API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
