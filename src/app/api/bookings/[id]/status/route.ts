export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/* Valid driver_status transitions */
const DRIVER_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted'],
  accepted: ['on_the_way'],
  on_the_way: ['picked_up'],
  picked_up: ['delivered'],
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    const { status, driverStatus, cancelledReason } = body as {
      status?: string;
      driverStatus?: string;
      cancelledReason?: string;
    };

    if (!status && !driverStatus) {
      return NextResponse.json(
        { error: 'Either status or driverStatus is required' },
        { status: 400 }
      );
    }

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

    /* ── Fetch booking ── */
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*, drivers!bookings_driver_id_fkey(user_id)')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    /* ── Determine if user is the assigned driver ── */
    const driverRecord = booking.drivers as { user_id: string } | null;
    const isAssignedDriver = driverRecord?.user_id === user.id;

    if (!isAdmin && !isAssignedDriver) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updates: Record<string, unknown> = {};
    let notificationMessage = '';

    /* ── Admin: set booking status ── */
    if (status && isAdmin) {
      if (status === 'cancelled') {
        updates.status = 'cancelled';
        updates.cancelled_reason = cancelledReason || 'Cancelled by admin';
        notificationMessage = `Booking ${booking.ref} has been cancelled by admin.`;
      } else if (status === 'assigned' && booking.status === 'pending') {
        updates.status = 'assigned';
        notificationMessage = `Booking ${booking.ref} status changed to assigned.`;
      } else {
        return NextResponse.json(
          { error: `Invalid admin status transition: ${booking.status} -> ${status}` },
          { status: 400 }
        );
      }
    }

    /* ── Driver: set driver_status transitions ── */
    if (driverStatus && isAssignedDriver) {
      const currentDriverStatus = booking.driver_status as string;

      // Special case: driver declines the assigned booking
      if (driverStatus === 'declined' && booking.status === 'assigned') {
        updates.driver_status = 'declined';
        updates.status = 'pending';
        updates.driver_id = null;
        updates.vehicle_id = null;
        updates.assigned_at = null;
        notificationMessage = `Driver declined booking ${booking.ref}. Booking returned to pending.`;
      } else {
        // Validate transition
        const allowed = DRIVER_TRANSITIONS[currentDriverStatus];
        if (!allowed || !allowed.includes(driverStatus)) {
          return NextResponse.json(
            { error: `Invalid driver status transition: ${currentDriverStatus} -> ${driverStatus}` },
            { status: 400 }
          );
        }

        updates.driver_status = driverStatus;

        // Set timestamps for each stage
        if (driverStatus === 'accepted') {
          updates.accepted_at = new Date().toISOString();
          updates.status = 'in_progress';
          notificationMessage = `Driver accepted booking ${booking.ref}.`;
        } else if (driverStatus === 'on_the_way') {
          notificationMessage = `Driver is on the way for booking ${booking.ref}.`;
        } else if (driverStatus === 'picked_up') {
          updates.picked_up_at = new Date().toISOString();
          notificationMessage = `Cargo picked up for booking ${booking.ref}.`;
        } else if (driverStatus === 'delivered') {
          updates.delivered_at = new Date().toISOString();
          updates.status = 'completed';
          notificationMessage = `Booking ${booking.ref} delivered successfully.`;
        }
      }
    }

    /* ── Admin cancellation with driver_status not set ── */
    if (status === 'cancelled' && !driverStatus && !isAdmin) {
      return NextResponse.json({ error: 'Only admins can cancel via status field' }, { status: 403 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid status updates provided' }, { status: 400 });
    }

    /* ── Apply update (vehicle auto-released by DB trigger on completed/cancelled) ── */
    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update(updates)
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) {
      console.error('Booking status update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update booking status' }, { status: 500 });
    }

    /* ── Insert notification ── */
    if (notificationMessage) {
      try {
        const notifyTargets: string[] = [];

        // Notify client
        if (booking.client_id) notifyTargets.push(booking.client_id);

        // Notify driver (if still assigned)
        if (driverRecord?.user_id && updates.driver_id !== null) {
          notifyTargets.push(driverRecord.user_id);
        }

        // Notify admins on declines/cancellations
        if (updates.status === 'pending' || updates.status === 'cancelled') {
          const { data: admins } = await supabase
            .from('users')
            .select('id')
            .in('role', ['admin', 'super_admin']);
          if (admins) {
            notifyTargets.push(...admins.map((a) => a.id));
          }
        }

        // Deduplicate
        const uniqueTargets = [...new Set(notifyTargets)];
        if (uniqueTargets.length > 0) {
          const notifications = uniqueTargets.map((uid) => ({
            user_id: uid,
            type: 'booking_status_update',
            message: notificationMessage,
            channel: 'in_app',
          }));
          await supabase.from('notifications').insert(notifications);
        }
      } catch (notifyErr) {
        console.warn('Status notification failed (non-critical):', notifyErr);
      }
    }

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error('Booking status API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
