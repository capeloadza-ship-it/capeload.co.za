'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { useRealtimeBookings, type Booking } from '@/hooks/useRealtimeBookings';
import { useRealtimeNotifications } from '@/hooks/useRealtimeNotifications';
import { PRICING_TABLE } from '@/lib/pricing';
import styles from './page.module.css';

type Tab = 'vehicles' | 'jobs' | 'active' | 'earnings';
type AvailabilityStatus = 'available' | 'unavailable' | 'maintenance';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  vehicle_type: string;
  reg_plate: string;
  status: string;
  available: boolean;
  availability_status: AvailabilityStatus;
}

const vehicleLabel = (type: string) =>
  PRICING_TABLE[type as keyof typeof PRICING_TABLE]?.label || type;

export default function DriverPortal() {
  const { user, profile } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const { bookings } = useRealtimeBookings({ driverId: user?.id });
  const { notifications, unreadCount, markAsRead } = useRealtimeNotifications(user?.id);
  const [showNotifs, setShowNotifs] = useState(false);
  const [stats, setStats] = useState({ activeVehicles: 0, jobsWeek: 0, earningsWeek: 0, rating: 0 });

  // Pending jobs for job board (all pending bookings)
  const [pendingJobs, setPendingJobs] = useState<Booking[]>([]);

  // Proof of delivery upload state
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const loadVehicles = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('vehicles')
      .select('*')
      .eq('driver_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setVehicles(data as Vehicle[]);
  }, [user]);

  const loadPendingJobs = useCallback(async () => {
    if (!user) return;
    // Get driver's vehicle types
    const { data: driverVehicles } = await supabase
      .from('vehicles')
      .select('vehicle_type')
      .eq('driver_id', user.id)
      .eq('availability_status', 'available');

    const vehicleTypes = (driverVehicles || []).map((v: { vehicle_type: string }) => v.vehicle_type);

    if (vehicleTypes.length === 0) {
      setPendingJobs([]);
      return;
    }

    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('status', 'pending')
      .in('vehicle_type', vehicleTypes)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setPendingJobs(data as Booking[]);
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [vehicleRes, jobsRes, earningsRes, driverRes] = await Promise.all([
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('driver_id', user.id).eq('availability_status', 'available'),
      supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('driver_id', user.id).gte('created_at', weekAgo),
      supabase.from('bookings').select('driver_payout').eq('driver_id', user.id).eq('status', 'completed').gte('created_at', weekAgo),
      supabase.from('drivers').select('rating').eq('id', user.id).single(),
    ]);

    setStats({
      activeVehicles: vehicleRes.count || 0,
      jobsWeek: jobsRes.count || 0,
      earningsWeek: (earningsRes.data || []).reduce((s: number, b: { driver_payout: number }) => s + (b.driver_payout || 0), 0),
      rating: driverRes.data?.rating || 0,
    });
  }, [user]);

  useEffect(() => {
    loadVehicles();
    loadPendingJobs();
    loadStats();
  }, [loadVehicles, loadPendingJobs, loadStats]);

  // Reload pending jobs when tab changes to jobs
  useEffect(() => {
    if (activeTab === 'jobs') loadPendingJobs();
  }, [activeTab, loadPendingJobs]);

  // 3-state availability
  async function setAvailability(vehicleId: string, status: AvailabilityStatus) {
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setVehicles((prev) =>
          prev.map((v) =>
            v.id === vehicleId
              ? { ...v, availability_status: status, available: status === 'available' }
              : v
          )
        );
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to update availability');
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  // Accept job
  async function handleAcceptJob(jobId: string) {
    try {
      const res = await fetch(`/api/bookings/${jobId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverStatus: 'accepted' }),
      });
      if (res.ok) {
        setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
        loadStats();
      } else {
        const err = await res.json();
        alert(err.error || 'Accept failed');
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  // Decline job
  async function handleDeclineJob(jobId: string) {
    try {
      const res = await fetch(`/api/bookings/${jobId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverStatus: 'declined' }),
      });
      if (res.ok) {
        setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
      } else {
        const err = await res.json();
        alert(err.error || 'Decline failed');
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  // Update driver status (on_the_way, picked_up, delivered)
  async function updateDriverStatus(jobId: string, driverStatus: string) {
    try {
      const res = await fetch(`/api/bookings/${jobId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ driverStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Status update failed');
      } else {
        if (driverStatus === 'delivered') loadStats();
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  // Proof of delivery upload
  async function handleProofUpload(jobId: string, file: File) {
    setUploadingProof(jobId);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`/api/bookings/${jobId}/proof`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Upload failed');
      }
    } catch {
      alert('Network error. Try again.');
    } finally {
      setUploadingProof(null);
    }
  }

  const activeJobs = bookings.filter(
    (b) => (b.status === 'active' || b.status === 'assigned') && b.driver_status !== 'delivered'
  );
  const completedJobs = bookings.filter((b) => b.status === 'completed');

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'vehicles', label: 'My Vehicles' },
    { key: 'jobs', label: 'Job Board' },
    { key: 'active', label: 'Active Jobs' },
    { key: 'earnings', label: 'Earnings' },
  ];

  // Status badge helper
  function driverStatusBadge(status: string | null) {
    if (!status) return null;
    const map: Record<string, { cls: string; label: string }> = {
      pending: { cls: styles.badgeOrange, label: 'Pending' },
      accepted: { cls: styles.badgeBlue, label: 'Accepted' },
      on_the_way: { cls: styles.badgeBlue, label: 'On the Way' },
      picked_up: { cls: styles.badgeOrange, label: 'Picked Up' },
      delivered: { cls: styles.badgeGreen, label: 'Delivered' },
      declined: { cls: styles.badgeRed, label: 'Declined' },
    };
    const entry = map[status] || { cls: styles.badgeOrange, label: status };
    return <span className={`${styles.badge} ${entry.cls}`}>{entry.label}</span>;
  }

  // Next status action buttons for active jobs
  function renderStatusActions(job: Booking) {
    const ds = job.driver_status;
    const buttons: { label: string; status: string; cls: string }[] = [];

    if (ds === 'accepted') {
      buttons.push({ label: 'On the Way', status: 'on_the_way', cls: styles.btnBlue });
    }
    if (ds === 'on_the_way') {
      buttons.push({ label: 'Picked Up', status: 'picked_up', cls: styles.btnPrimary });
    }
    if (ds === 'picked_up') {
      buttons.push({ label: 'Delivered', status: 'delivered', cls: styles.btnGreen });
    }

    return (
      <div className={styles.statusActions}>
        {buttons.map((btn) => (
          <button
            key={btn.status}
            className={`${btn.cls} ${styles.btnSm}`}
            onClick={() => updateDriverStatus(job.id, btn.status)}
          >
            {btn.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={styles.portalLayout}>
      <div className={styles.portalHeader}>
        <div>
          <h1>Welcome back, {firstName}</h1>
          <p>Manage your vehicles, availability, and jobs</p>
        </div>
        <button className={styles.notifBell} onClick={() => setShowNotifs(!showNotifs)}>
          🔔
          {unreadCount > 0 && <span className={styles.notifCount}>{unreadCount}</span>}
        </button>
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
          <div className={styles.statLabel}>Active vehicles</div>
          <div className={`${styles.statValue} ${styles.orange}`}>{stats.activeVehicles}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Jobs this week</div>
          <div className={`${styles.statValue} ${styles.blue}`}>{stats.jobsWeek}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Earnings this week</div>
          <div className={`${styles.statValue} ${styles.green}`}>R{stats.earningsWeek.toLocaleString()}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Rating</div>
          <div className={styles.statValue}>{stats.rating > 0 ? stats.rating.toFixed(1) : '—'}</div>
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

      {/* ═══ Vehicles Tab ═══ */}
      {activeTab === 'vehicles' && (
        <>
          {vehicles.length === 0 && (
            <div className={styles.empty}>No vehicles registered yet.</div>
          )}
          {vehicles.map((v) => {
            const currentStatus = v.availability_status || (v.available ? 'available' : 'unavailable');
            return (
              <div key={v.id} className={styles.vehicleCard}>
                <div className={styles.vehicleInfo}>
                  <div className={styles.vehicleInfoIcon}>🚚</div>
                  <div>
                    <div className={styles.vehicleName}>
                      {v.make} {v.model} — <span className={`${styles.badge} ${v.status === 'approved' ? styles.badgeGreen : styles.badgeYellow}`}>
                        {v.status === 'approved' ? 'Approved' : 'Pending'}
                      </span>
                    </div>
                    <div className={styles.vehiclePlate}>{v.reg_plate} &middot; {vehicleLabel(v.vehicle_type)}</div>
                  </div>
                </div>
                <div className={styles.availSelector}>
                  <button
                    className={currentStatus === 'available' ? styles.availOptionActive : styles.availOption}
                    onClick={() => setAvailability(v.id, 'available')}
                  >
                    Available
                  </button>
                  <button
                    className={currentStatus === 'unavailable' ? styles.availOptionOff : styles.availOption}
                    onClick={() => setAvailability(v.id, 'unavailable')}
                  >
                    Unavailable
                  </button>
                  <button
                    className={currentStatus === 'maintenance' ? styles.availOptionMaint : styles.availOption}
                    onClick={() => setAvailability(v.id, 'maintenance')}
                  >
                    Maintenance
                  </button>
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* ═══ Job Board Tab ═══ */}
      {activeTab === 'jobs' && (
        <>
          {pendingJobs.length === 0 && (
            <div className={styles.empty}>No pending jobs matching your vehicles right now.</div>
          )}
          {pendingJobs.map((j) => (
            <div key={j.id} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                <span className={styles.jobType}>
                  {j.job_type.charAt(0).toUpperCase() + j.job_type.slice(1)} — {vehicleLabel(j.vehicle_type)}
                </span>
                <span className={`${styles.badge} ${styles.badgeOrange}`}>New</span>
              </div>
              <div className={styles.jobDetails}>
                <div className={styles.jobDetail}>📍 {(j.pickup || '').split(',')[0]} &rarr; {(j.dropoff || '').split(',')[0]}</div>
                <div className={styles.jobDetail}>📅 {j.date || 'Flexible'} at {j.time || 'Flexible'}</div>
                <div className={styles.jobDetail}>💰 You earn: R{(j.driver_payout || Math.round(j.total * 0.82)).toLocaleString()}</div>
                <div className={styles.jobDetail}>👤 {j.client_name || 'Guest'}</div>
              </div>
              <div className={styles.jobActions}>
                <button className={`${styles.btnGreen} ${styles.btnSm}`} onClick={() => handleAcceptJob(j.id)}>Accept</button>
                <button className={`${styles.btnRed} ${styles.btnSm}`} onClick={() => handleDeclineJob(j.id)}>Decline</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* ═══ Active Jobs Tab ═══ */}
      {activeTab === 'active' && (
        <>
          {activeJobs.length === 0 && (
            <div className={styles.empty}>No active jobs right now.</div>
          )}
          {activeJobs.map((j) => (
            <div key={j.id} className={styles.jobCard}>
              <div className={styles.jobHeader}>
                <span className={styles.jobType}>
                  {j.job_type.charAt(0).toUpperCase() + j.job_type.slice(1)} — {vehicleLabel(j.vehicle_type)}
                </span>
                {driverStatusBadge(j.driver_status)}
              </div>
              <div className={styles.jobDetails}>
                <div className={styles.jobDetail}>📍 {(j.pickup || '').split(',')[0]} &rarr; {(j.dropoff || '').split(',')[0]}</div>
                <div className={styles.jobDetail}>💰 R{(j.driver_payout || 0).toLocaleString()}</div>
                <div className={styles.jobDetail}>👤 {j.client_name || 'Client'}</div>
                <div className={styles.jobDetail}>📋 {j.ref}</div>
              </div>

              {/* Status progression buttons */}
              {renderStatusActions(j)}

              {/* Proof of delivery upload (only show when picked_up) */}
              {j.driver_status === 'picked_up' && (
                <div className={styles.proofSection}>
                  <div className={styles.proofLabel}>Proof of Delivery</div>
                  {j.proof_of_delivery_url ? (
                    <div className={styles.proofUploaded}>Uploaded</div>
                  ) : (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className={styles.proofInput}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleProofUpload(j.id, file);
                        }}
                        disabled={uploadingProof === j.id}
                      />
                      {uploadingProof === j.id && (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Uploading...</div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Show proof if already uploaded at delivered stage */}
              {j.driver_status === 'delivered' && j.proof_of_delivery_url && (
                <div className={styles.proofSection}>
                  <div className={styles.proofUploaded}>Proof uploaded</div>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {/* ═══ Earnings Tab ═══ */}
      {activeTab === 'earnings' && (
        <>
          <div className={styles.card}>
            <div className={styles.cardTitle}>Recent earnings</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Job</th>
                    <th>Route</th>
                    <th>Vehicle</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {completedJobs.map((j) => (
                    <tr key={j.id}>
                      <td>{j.date || new Date(j.created_at).toLocaleDateString()}</td>
                      <td>{j.job_type.charAt(0).toUpperCase() + j.job_type.slice(1)}</td>
                      <td>{(j.pickup || '').split(',')[0]} &rarr; {(j.dropoff || '').split(',')[0]}</td>
                      <td>{vehicleLabel(j.vehicle_type)}</td>
                      <td className={styles.amountCell}>R{(j.driver_payout || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                  {completedJobs.length === 0 && (
                    <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No completed jobs yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className={styles.card}>
            <div className={styles.payoutCard}>
              <div>
                <div className={styles.payoutLabel}>Total this week</div>
                <div className={styles.payoutAmount}>R{stats.earningsWeek.toLocaleString()}</div>
              </div>
              <span className={`${styles.badge} ${styles.badgeGreen}`}>Scheduled</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
