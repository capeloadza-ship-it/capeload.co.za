'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { PRICING_TABLE } from '@/lib/pricing';
import styles from './page.module.css';

type Tab = 'active' | 'recurring' | 'history' | 'tracking';

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

const DRIVER_STATUS_STEPS = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'on_the_way', label: 'On the Way' },
  { key: 'picked_up', label: 'Picked Up' },
  { key: 'delivered', label: 'Delivered' },
];

function DriverStatusBar({ driverStatus }: { driverStatus: string | null }) {
  if (!driverStatus) return null;

  const currentIdx = DRIVER_STATUS_STEPS.findIndex((s) => s.key === driverStatus);

  return (
    <div className={styles.progressionBar}>
      {DRIVER_STATUS_STEPS.map((step, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        return (
          <div key={step.key} className={styles.progressStep}>
            {idx < DRIVER_STATUS_STEPS.length - 1 && (
              <div className={`${styles.progressLine} ${isDone ? styles.progressLineDone : ''}`} />
            )}
            <div
              className={`${styles.progressDot} ${isDone ? styles.progressDotDone : ''} ${isCurrent ? styles.progressDotActive : ''}`}
            >
              {isDone ? '✓' : ''}
            </div>
            <div className={`${styles.progressLabel} ${isCurrent ? styles.progressLabelActive : ''}`}>
              {step.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ClientPortal() {
  const { user, profile } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('active');
  const { bookings } = useRealtimeBookings({ clientId: user?.id });
  const { notifications, unreadCount, markAsRead } = useRealtimeNotifications(user?.id);
  const [stats, setStats] = useState({ active: 0, completedMonth: 0, totalSpent: 0 });
  const [showNotifs, setShowNotifs] = useState(false);

  const supabase = createClient();

  const loadStats = useCallback(async () => {
    if (!user) return;
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

    const [activeRes, completedRes, spentRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('user_id', user.id).in('status', ['pending', 'active', 'assigned']),
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
    loadStats();
  }, [loadStats]);

  async function handleCancelBooking(bookingId: string) {
    if (!confirm('Cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by client' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Cancel failed');
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  const activeBookings = bookings.filter((b) => b.status === 'pending' || b.status === 'active' || b.status === 'assigned');
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const inProgressBookings = bookings.filter((b) => b.status === 'active' || b.status === 'assigned');

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Notification bell */}
          <button className={styles.notifBell} onClick={() => setShowNotifs(!showNotifs)}>
            🔔
            {unreadCount > 0 && <span className={styles.notifCount}>{unreadCount}</span>}
          </button>
          <Link href="/booking" className={styles.btnPrimary}>
            + New Booking
          </Link>
        </div>
      </div>

      {/* Notifications dropdown */}
      {showNotifs && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <div className={styles.cardTitle}>Notifications</div>
          {notifications.length === 0 && (
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>No notifications</div>
          )}
          {notifications.slice(0, 10).map((n) => (
            <div
              key={n.id}
              style={{
                padding: '8px 0',
                borderBottom: '1px solid #f0f0ee',
                opacity: n.read ? 0.6 : 1,
                cursor: n.read ? 'default' : 'pointer',
              }}
              onClick={() => !n.read && markAsRead(n.id)}
            >
              <div style={{ fontSize: 13, fontWeight: n.read ? 400 : 600 }}>{n.message}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {new Date(n.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

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
            const badgeCls =
              b.status === 'active' || b.status === 'assigned'
                ? styles.badgeBlue
                : styles.badgeOrange;
            const badgeLabel =
              b.status === 'active' || b.status === 'assigned'
                ? 'In Progress'
                : 'Pending';
            return (
              <div key={b.id} className={styles.jobItem}>
                <div className={styles.jobItemLeft}>
                  <div className={`${styles.jobIcon} ${icon.cls}`}>{icon.emoji}</div>
                  <div className={styles.jobMeta}>
                    <h4>{b.job_type.charAt(0).toUpperCase() + b.job_type.slice(1)} — {vehicleLabel(b.vehicle_type)}</h4>
                    <p>{(b.pickup || '').split(',')[0]} &rarr; {(b.dropoff || '').split(',')[0]} &middot; {b.driver_name || 'Pending driver'}</p>
                    {/* Driver status progression bar */}
                    {b.driver_status && b.driver_status !== 'pending' && b.driver_status !== 'declined' && (
                      <DriverStatusBar driverStatus={b.driver_status} />
                    )}
                    {/* Proof of delivery */}
                    {b.proof_of_delivery_url && (
                      <div style={{ marginTop: 8 }}>
                        <img
                          src={b.proof_of_delivery_url}
                          alt="Proof of delivery"
                          className={styles.proofImage}
                        />
                      </div>
                    )}
                  </div>
                </div>
                <div className={styles.jobItemRight}>
                  <span className={`${styles.badge} ${badgeCls}`}>{badgeLabel}</span>
                  <div className={styles.jobDate}>{b.date || 'Flexible'}{b.time ? `, ${b.time}` : ''}</div>
                  {b.status === 'pending' && (
                    <button className={styles.btnCancel} onClick={() => handleCancelBooking(b.id)} style={{ marginTop: 6 }}>
                      Cancel
                    </button>
                  )}
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
                  <th>Proof</th>
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
                    <td>
                      {b.proof_of_delivery_url ? (
                        <a href={b.proof_of_delivery_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--blue)', fontSize: 12 }}>
                          View proof
                        </a>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
                {completedBookings.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No completed bookings yet</td></tr>
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
                      {b.driver_status && b.driver_status !== 'pending' && (
                        <DriverStatusBar driverStatus={b.driver_status} />
                      )}
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
