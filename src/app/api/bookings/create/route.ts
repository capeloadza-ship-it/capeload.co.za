export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import {
  calculateQuote,
  generateBookingRef,
  PRICING_TABLE,
  JOB_NAMES,
  type VehicleType,
  type JobType,
} from '@/lib/pricing';
import { createClient } from '@/lib/supabase/server';
import { sendEmail, bookingConfirmationEmail } from '@/lib/brevo';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      jobType,
      vehicle,
      pickup,
      dropoff,
      date,
      time,
      name,
      phone,
      email,
      notes,
      paymentMethod,
      distanceKm,
    } = body as {
      jobType: JobType;
      vehicle: VehicleType;
      pickup: string;
      dropoff: string;
      date: string;
      time: string;
      name: string;
      phone: string;
      email?: string;
      notes?: string;
      paymentMethod?: string;
      distanceKm?: number;
    };

    /* ── Validate required fields ── */
    if (!jobType || !vehicle || !pickup || !dropoff || !date || !time || !name || !phone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!PRICING_TABLE[vehicle]) {
      return NextResponse.json({ error: 'Invalid vehicle type' }, { status: 400 });
    }

    const validJobTypes: JobType[] = ['move', 'courier', 'haul'];
    if (!validJobTypes.includes(jobType)) {
      return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
    }

    /* ── Calculate quote server-side ── */
    const km = distanceKm || 10;
    const quote = calculateQuote(vehicle, km);
    const ref = generateBookingRef();

    const supabase = await createClient();

    /* ── Check vehicle availability ── */
    const { data: availableVehicles, error: vehicleErr } = await supabase
      .from('vehicles')
      .select('id')
      .eq('type', vehicle)
      .eq('availability_status', 'available')
      .eq('status', 'approved')
      .limit(1);

    if (vehicleErr) {
      console.error('Vehicle availability check error:', vehicleErr);
      return NextResponse.json({ error: 'Failed to check vehicle availability' }, { status: 500 });
    }

    if (!availableVehicles || availableVehicles.length === 0) {
      return NextResponse.json(
        { error: 'No vehicles available for the requested type', available: false },
        { status: 200 }
      );
    }

    /* ── Resolve client_id if authenticated ── */
    let clientId: string | null = null;
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      clientId = user.id;
    }

    /* ── Insert booking ── */
    const { data: booking, error: dbError } = await supabase
      .from('bookings')
      .insert({
        ref,
        job_type: jobType,
        vehicle_type: vehicle,
        pickup_address: pickup,
        dropoff_address: dropoff,
        booking_date: date,
        booking_time: time,
        client_name: name,
        client_phone: phone,
        client_email: email || null,
        notes: notes || null,
        payment_method: paymentMethod || 'eft',
        distance_km: km,
        total: quote.total,
        base_fare: quote.base,
        distance_cost: quote.distanceCost,
        commission: quote.commission,
        commission_rate: quote.commissionRate,
        driver_payout: quote.driverPayout,
        status: 'pending',
        driver_status: 'pending',
        client_id: clientId,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return NextResponse.json({ error: 'Failed to save booking' }, { status: 500 });
    }

    /* ── Notify all admin users ── */
    try {
      const { data: admins } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'super_admin']);

      if (admins && admins.length > 0) {
        const notifications = admins.map((admin) => ({
          user_id: admin.id,
          type: 'new_booking',
          message: `New booking ${ref} — ${JOB_NAMES[jobType]} with ${PRICING_TABLE[vehicle].label} from ${pickup}`,
          channel: 'in_app',
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch (notifyErr) {
      console.warn('Admin notification failed (non-critical):', notifyErr);
    }

    /* ── Send confirmation email via Brevo (non-blocking) ── */
    if (email) {
      try {
        const tpl = bookingConfirmationEmail({
          ref,
          clientName: name,
          jobType: JOB_NAMES[jobType],
          vehicle: PRICING_TABLE[vehicle].label,
          pickup,
          dropoff,
          date,
          time,
          total: quote.total,
        });
        await sendEmail({
          to: [{ email, name }],
          subject: tpl.subject,
          htmlContent: tpl.htmlContent,
        });
      } catch (emailErr) {
        console.warn('Brevo email failed (non-critical):', emailErr);
      }
    }

    return NextResponse.json({ ref, quote, available: true });
  } catch (err) {
    console.error('Booking create API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
