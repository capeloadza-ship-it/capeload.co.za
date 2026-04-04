'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { PRICING_TABLE } from '@/lib/pricing';
import styles from './page.module.css';

type Tab = 'active' | 'recurring' | 'history' | 'tracking';

interface Booking {
  id: string;
  ref: string;
  job_type: string;
  pickup: string;
  dropoff: string;
  vehicle_type: string;
  status: string;
  total: number;
  date: string;
  time: string;
  driver_name: string | null;
  created_at: string;
}

const vehicleLabel = (type: string) =>
  PRICING_TABLE[type as keyof typeof PRICING_TABLE]?.label || type;

const jobIcon = (type: string) => {
  const map: Record<string, { cls: string; emoji: string }> = {
    move: { cls: styles.jobIconMove, emoji: '📦' },
    courier: { cls: styles.jobIconCourier, emoji: '🚚' },
    haul: { cls: styles.jobIconHaul, emoji: '🏗' },
  };
  return map[type] || map.move;
};

export default function ClientPortal() {
  const { user, profile } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [stats, setStats] = useState({ active: 0, completedMonth: 0, totalSpent: 0 });

  const supabase = createClient();

  const loadBookings = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);
    if (data) setBookings(data as Booking[]);
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [activeRes, completedRes, spentRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pending', 'active']),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'completed').gte('created_at', monthStart),
      supabase.from('bookings').select('total').eq('user_id', user.id),
    ]);

    setStats({
      active: activeRes.count || 0,
      completedMonth: completedRes.count || 0,
      totalSpent: (spentRes.data || []).reduce((s: number, b: { total: number }) => s + (b.total || 0), 0),
    });
  }, [user]);

  useEffect(() => {
    loadBookings();
    loadStats();
  }, [loadBookings, loadStats]);

  const activeBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'active');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const inProgressBookings = bookings.filter((b) => b.status === 'active');

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'recurring', label: 'Recurring' },
    { key: 'history', label: 'History' },
    { key: 'tracking', label: 'Live Tracking' },
  ];

  return (
    <div className={styles.portalLayout}>
      <div className={styles.portalHeader}>
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>Manage your bookings and track deliveries</p>
        </div>
        <Link href="/booking" className={styles.btnPrimary}>
          + New Booking
        </Link>
      </div>

      {/* Stats */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active bookings</div>
          <div className={`${styles.statValue} ${styles.orange}`}>{stats.active}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Completed this month</div>
          <div className={`${styles.statValue} ${styles.blue}`}>{stats.completedMonth}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total spent</div>
          <div className={`${styles.statValue} ${styles.green}`}>R{stats.totalSpent.toLocaleString()}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button
            key={t.key}
            className={activeTab === t.key ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active Tab */}
      {activeTab === 'active' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Upcoming &amp; active</div>
          {activeBookings.length === 0 && (
            <div className={styles.empty}>No active bookings</div>
          )}
          {activeBookings.map((b) => {
            const icon = jobIcon(b.job_type);
            const badgeCls = b.status === 'active' ? styles.badgeBlue : styles.badgeOrange;
            const badgeLabel = b.status === 'active' ? 'In Progress' : 'Pending';
            return (
              <div key={b.id} className={styles.jobItem}>
                <div className={styles.jobItemLeft}>
                  <div className={`${styles.jobIcon} ${icon.cls}`}>{icon.emoji}</div>
                  <div className={styles.jobMeta}>
                    <h4>{b.job_type.charAt(0).toUpperCase() + b.job_type.slice(1)} — {vehicleLabel(b.vehicle_type)}</h4>
                    <p>{(b.pickup || '').split(',')[0]} &rarr; {(b.dropoff || '').split(',')[0]} &middot; {b.driver_name || 'Pending driver'}</p>
                  </div>
                </div>
                <div className={styles.jobItemRight}>
                  <span className={`${styles.badge} ${badgeCls}`}>{badgeLabel}</span>
                  <div className={styles.jobDate}>{b.date || 'Flexible'}{b.time ? `, ${b.time}` : ''}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recurring Tab */}
      {activeTab === 'recurring' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Job templates</div>
          </div>
          <div className={styles.empty}>No recurring templates yet. Complete a booking and save it as a template.</div>
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Job history</div>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Ref</th>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Route</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {completedBookings.map((b) => (
                  <tr key={b.id}>
                    <td>{b.ref}</td>
                    <td>{b.date || new Date(b.created_at).toLocaleDateString()}</td>
                    <td>{b.job_type.charAt(0).toUpperCase() + b.job_type.slice(1)}</td>
                    <td>{(b.pickup || '').split(',')[0]} &rarr; {(b.dropoff || '').split(',')[0]}</td>
                    <td style={{ fontWeight: 700 }}>R{(b.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {completedBookings.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No completed bookings yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Live Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Live driver tracking</div>
          <div className={styles.mapPlaceholder}>
            Map will display here when a driver is en route (Google Maps integration)
          </div>
          {inProgressBookings.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {inProgressBookings.map((b) => (
                <div key={b.id} className={styles.jobItem} style={{ borderBottom: 'none' }}>
                  <div className={styles.jobItemLeft}>
                    <div className={`${styles.jobIcon} ${styles.jobIconMove}`}>📦</div>
                    <div className={styles.jobMeta}>
                      <h4>Driver: {b.driver_name || 'Assigned'}</h4>
                      <p>{(b.pickup || '').split(',')[0]} &rarr; {(b.dropoff || '').split(',')[0]}</p>
                    </div>
                  </div>
                  <div className={styles.jobItemRight}>
                    <span className={`${styles.badge} ${styles.badgeBlue}`}>En Route</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {inProgressBookings.length === 0 && (
            <div className={styles.empty} style={{ marginTop: 16 }}>No active deliveries to track</div>
          )}
        </div>
      )}
    </div>
  );
}
