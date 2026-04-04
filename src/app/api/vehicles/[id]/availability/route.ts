export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = ['available', 'unavailable', 'maintenance'] as const;
type AvailabilityStatus = (typeof VALID_STATUSES)[number];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: vehicleId } = await params;
    const body = await request.json();
    const { availability_status } = body as { availability_status: AvailabilityStatus };

    if (!availability_status || !VALID_STATUSES.includes(availability_status)) {
      return NextResponse.json(
        { error: `Invalid availability_status. Must be one of: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    /* ── Auth: vehicle owner (driver) only ── */
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    /* ── Get driver profile for this user ── */
    const { data: driverProfile } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    /* ── Validate vehicle belongs to this driver ── */
    const { data: vehicle, error: vehicleErr } = await supabase
      .from('vehicles')
      .select('id, owner_id, availability_status')
      .eq('id', vehicleId)
      .single();

    if (vehicleErr || !vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    if (vehicle.owner_id !== driverProfile.id) {
      return NextResponse.json({ error: 'Forbidden: not your vehicle' }, { status: 403 });
    }

    /* ── Check vehicle not assigned to active booking ── */
    const { data: activeBookings, error: activeErr } = await supabase
      .from('bookings')
      .select('id')
      .eq('vehicle_id', vehicleId)
      .in('status', ['assigned', 'in_progress'])
      .limit(1);

    if (activeErr) {
      console.error('Active booking check error:', activeErr);
      return NextResponse.json({ error: 'Failed to check active bookings' }, { status: 500 });
    }

    if (activeBookings && activeBookings.length > 0) {
      return NextResponse.json(
        { error: 'Cannot change availability while vehicle is assigned to an active booking' },
        { status: 400 }
      );
    }

    /* ── Update availability ── */
    const { data: updated, error: updateErr } = await supabase
      .from('vehicles')
      .update({ availability_status })
      .eq('id', vehicleId)
      .select()
      .single();

    if (updateErr) {
      console.error('Vehicle availability update error:', updateErr);
      return NextResponse.json({ error: 'Failed to update vehicle availability' }, { status: 500 });
    }

    return NextResponse.json({ vehicle: updated });
  } catch (err) {
    console.error('Vehicle availability API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
