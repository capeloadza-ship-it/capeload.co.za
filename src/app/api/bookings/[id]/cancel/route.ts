export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    /* ── Auth required ── */
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 401 });
    }

    const isAdmin = ['admin', 'super_admin'].includes(currentUser.role);

    /* ── Parse optional reason ── */
    let reason: string | undefined;
    try {
      const body = await request.json();
      reason = body.reason;
    } catch {
      // Body is optional
    }

    /* ── Fetch booking ── */
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    /* ── Authorization: client (own booking) or admin ── */
    const isOwnBooking = booking.client_id === user.id;

    if (!isAdmin && !isOwnBooking) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    /* ── Validate cancellable status ── */
    if (!['pending', 'assigned'].includes(booking.status)) {
      return NextResponse.json(
        { error: `Cannot cancel booking with status '${booking.status}'. Only pending or assigned bookings can be cancelled.` },
        { status: 400 }
      );
    }

    /* ── Cancel booking (vehicle auto-released by DB trigger) ── */
    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_reason: reason || (isAdmin ? 'Cancelled by admin' : 'Cancelled by client'),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) {
      console.error('Booking cancel update error:', updateErr);
      return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
    }

    /* ── Notifications ── */
    try {
      const notifyTargets: string[] = [];

      // Notify client
      if (booking.client_id) notifyTargets.push(booking.client_id);

      // Notify assigned driver
      if (booking.driver_id) {
        const { data: driver } = await supabase
          .from('drivers')
          .select('user_id')
          .eq('id', booking.driver_id)
          .single();
        if (driver) notifyTargets.push(driver.user_id);
      }

      // Notify admins
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin']);
      if (admins) {
        notifyTargets.push(...admins.map((a) => a.id));
      }

      // Deduplicate and remove the person who cancelled (they already know)
      const uniqueTargets = [...new Set(notifyTargets)].filter((uid) => uid !== user.id);

      if (uniqueTargets.length > 0) {
        const notifications = uniqueTargets.map((uid) => ({
          user_id: uid,
          type: 'booking_cancelled',
          message: `Booking ${booking.ref} has been cancelled.${reason ? ` Reason: ${reason}` : ''}`,
          channel: 'in_app',
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch (notifyErr) {
      console.warn('Cancel notification failed (non-critical):', notifyErr);
    }

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error('Booking cancel API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
