export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
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
      paymentMethod: string;
      distanceKm: number;
    };

    /* Validate required fields */
    if (!jobType || !vehicle || !pickup || !dropoff || !date || !time || !name || !phone) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!PRICING_TABLE[vehicle]) {
      return Response.json({ error: 'Invalid vehicle type' }, { status: 400 });
    }

    /* Calculate quote server-side */
    const quote = calculateQuote(vehicle, distanceKm || 10);
    const ref = generateBookingRef();

    /* Insert into Supabase */
    const supabase = await createClient();
    const { error: dbError } = await supabase.from('bookings').insert({
      ref,
      job_type: jobType,
      vehicle,
      pickup,
      dropoff,
      date,
      time,
      client_name: name,
      phone,
      email: email || null,
      notes: notes || null,
      payment_method: paymentMethod || 'eft',
      distance_km: distanceKm || 10,
      total: quote.total,
      base_fare: quote.base,
      distance_cost: quote.distanceCost,
      commission: quote.commission,
      driver_payout: quote.driverPayout,
      status: 'pending',
    });

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return Response.json({ error: 'Failed to save booking' }, { status: 500 });
    }

    /* Send confirmation email via Brevo (non-blocking) */
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
        // Don't fail the booking if email fails
        console.warn('Brevo email failed (non-critical):', emailErr);
      }
    }

    return Response.json({ ref, quote });
  } catch (err) {
    console.error('Pricing API error:', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
