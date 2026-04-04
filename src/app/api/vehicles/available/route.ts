export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get('type');

    const supabase = await createClient();

    /* ── Query available + approved vehicles ── */
    let query = supabase
      .from('vehicles')
      .select('id, type, make, model, reg_plate')
      .eq('availability_status', 'available')
      .eq('status', 'approved');

    if (typeFilter) {
      query = query.eq('type', typeFilter);
    }

    const { data: vehicles, error } = await query;

    if (error) {
      console.error('Available vehicles query error:', error);
      return NextResponse.json({ error: 'Failed to fetch available vehicles' }, { status: 500 });
    }

    /* ── Build counts per type ── */
    const counts: Record<string, number> = {};
    for (const v of vehicles || []) {
      counts[v.type] = (counts[v.type] || 0) + 1;
    }

    return NextResponse.json({ vehicles: vehicles || [], counts });
  } catch (err) {
    console.error('Available vehicles API error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
