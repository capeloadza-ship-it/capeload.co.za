'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Booking {
  id: string;
  ref: string;
  user_id: string;
  driver_id: string | null;
  client_name: string;
  job_type: string;
  pickup: string;
  dropoff: string;
  vehicle_type: string;
  status: string;
  driver_status: string | null;
  total: number;
  driver_payout: number;
  driver_name: string | null;
  date: string;
  time: string;
  assigned_at: string | null;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  cancelled_reason: string | null;
  admin_notes: string | null;
  proof_of_delivery_url: string | null;
  created_at: string;
}

interface UseRealtimeBookingsOptions {
  clientId?: string;
  driverId?: string;
  all?: boolean;
}

export function useRealtimeBookings(options: UseRealtimeBookingsOptions = {}) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      let query = supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (options.clientId) {
        query = query.eq('user_id', options.clientId);
      } else if (options.driverId) {
        query = query.eq('driver_id', options.driverId);
      }

      const { data } = await query;
      if (data) setBookings(data as Booking[]);
      setLoading(false);
    }

    load();

    // Set up realtime subscription
    const channelName = `bookings-${options.clientId || options.driverId || 'all'}-${Date.now()}`;
    const channel = supabase.channel(channelName);

    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          const newBooking = payload.new as Booking;
          // Filter client-side if needed
          if (options.clientId && newBooking.user_id !== options.clientId) return;
          if (options.driverId && newBooking.driver_id !== options.driverId) return;
          setBookings((prev) => [newBooking, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          const updated = payload.new as Booking;
          setBookings((prev) =>
            prev.map((b) => (b.id === updated.id ? updated : b))
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [options.clientId, options.driverId, options.all]);

  return { bookings, setBookings, loading };
}
