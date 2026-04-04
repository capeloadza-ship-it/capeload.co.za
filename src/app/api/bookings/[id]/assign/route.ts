export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const body = await request.json();
    const { driverId, vehicleId } = body as { driverId: string; vehicleId: string };

    if (!driverId || !vehicleId) {
      return NextResponse.json({ error: 'driverId and vehicleId are required' }, { status: 400 });
    }

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

    /* ── Validate booking is pending ── */
    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot assign: booking status is '${booking.status}', expected 'pending'` },
        { status: 400 }
      );
    }

    /* ── Validate vehicle: available + approved ── */
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicles')
      .select('id, availability_status, status')
      .eq('id', vehicleId)
      .single();

    if (vehicleErr || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (vehicle.availability_status !== 'available' || vehicle.status !== 'approved') {
      return NextResponse.json(
        { error: 'Vehicle is not available or not approved' },
        { status: 400 }
      );
    }

    /* ── Validate driver: approved ── */
    const { data: driver, error: driverErr } = await supabase
      .from('drivers')
      .select('id, user_id, status')
      .eq('id', driverId)
      .single();

    if (driverErr || !driver) {
      return NextResponse.json({ error: 'Driver not found' }, { status: 404 });
    }

    if (driver.status !== 'approved') {
      return NextResponse.json(
        { error: `Driver status is '${driver.status}', must be 'approved'` },
        { status: 400 }
      );
    }

    /* ── Update booking (vehicle auto-locked by DB trigger) ── */
    const { data: updated, error: updateErr } = await supabase
      .from('bookings')
      .update({
        driver_id: driverId,
        vehicle_id: vehicleId,
        status: 'assigned',
        driver_status: 'pending',
        assigned_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select()
      .single();

    if (updateErr) {
      console.error('Booking assign update error:', updateErr);
      return NextResponse.json({ error: 'Failed to assign booking' }, { status: 500 });
    }

    /* ── Notifications for driver + client ── */
    try {
      const notifications = [];

      // Notify driver
      notifications.push({
        user_id: driver.user_id,
        type: 'booking_assigned',
        message: `You have been assigned booking ${booking.ref}. Check your portal for details.`,
        channel: 'in_app',
      });

      // Notify client (if authenticated)
      if (booking.client_id) {
        notifications.push({
          user_id: booking.client_id,
          type: 'driver_assigned',
          message: `A driver has been assigned to your booking ${booking.ref}.`,
          channel: 'in_app',
        });
      }

      if (notifications.length > 0) {
        await supabase.from('notifications').insert(notifications);
      }
    } catch (notifyErr) {
      console.warn('Assignment notification failed (non-critical):', notifyErr);
    }

    return NextResponse.json({ booking: updated });
  } catch (err) {
    console.error('Booking assign API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
