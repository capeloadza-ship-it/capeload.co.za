export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    /* ── Parse optional reason ── */
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional
    }

    /* ── Fetch driver ── */
    const { data: driver, error: driverErr } = await supabase
      .from('drivers')
      .select('id, user_id, status')
      .eq('id', driverId)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (driver.status === 'rejected') {
      return NextResponse.json({ error: 'Driver is already rejected' }, { status: 400 });
    }

    /* ── Update driver status ── */
    const { data: updatedDriver, error: updateErr } = await supabase
      .from('drivers')
      .update({ status: 'rejected' })
      .eq('id', driverId)
      .select()
      .single();

    if (updateErr) {
      console.error('Driver reject update error:', updateErr);
      return NextResponse.json({ error: 'Failed to reject driver' }, { status: 500 });
    }

    /* ── Notify driver ── */
    try {
      const message = reason
        ? `Your driver application has been declined. Reason: ${reason}`
        : 'Your driver application has been declined. Contact support for details.';

      await supabase.from('notifications').insert({
        user_id: driver.user_id,
        type: 'driver_rejected',
        message,
        channel: 'in_app',
      });
    } catch (notifyErr) {
      console.warn('Driver rejection notification failed (non-critical):', notifyErr);
    }

    return NextResponse.json({ driver: updatedDriver });
  } catch (err) {
    console.error('Driver reject API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
