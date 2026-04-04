export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookingId } = await params;
    const supabase = await createClient();

    /* ── Auth: driver only ── */
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!currentUser || currentUser.role !== 'driver') {
      return NextResponse.json({ error: 'Forbidden: driver access required' }, { status: 403 });
    }

    /* ── Validate booking belongs to this driver ── */
    const { data: driverProfile } = await supabase
      .from('drivers')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!driverProfile) {
      return NextResponse.json({ error: 'Driver profile not found' }, { status: 404 });
    }

    const { data: booking, error: bookingErr } = await supabase
      .from('bookings')
      .select('id, ref, driver_id')
      .eq('id', bookingId)
      .single();

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.driver_id !== driverProfile.id) {
      return NextResponse.json({ error: 'Forbidden: not your assigned booking' }, { status: 403 });
    }

    /* ── Parse FormData ── */
    const formData = await request.formData();
    const file = formData.get('image') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Maximum 5 MB.' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    /* ── Convert to base64 data URL ── */
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${file.type};base64,${base64}`;

    /* ── Update booking with proof URL ── */
    const { error: updateErr } = await supabase
      .from('bookings')
      .update({ proof_of_delivery_url: dataUrl })
      .eq('id', bookingId);

    if (updateErr) {
      console.error('Proof of delivery update error:', updateErr);
      return NextResponse.json({ error: 'Failed to save proof of delivery' }, { status: 500 });
    }

    return NextResponse.json({ url: dataUrl });
  } catch (err) {
    console.error('Proof of delivery API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
