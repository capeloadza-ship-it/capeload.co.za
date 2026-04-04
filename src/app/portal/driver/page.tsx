'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useUser } from '@/hooks/useUser';
import { PRICING_TABLE } from '@/lib/pricing';
import styles from './page.module.css';

type Tab = 'vehicles' | 'jobs' | 'active' | 'earnings';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  vehicle_type: string;
  reg_plate: string;
  status: string;
  available: boolean;
}

interface Job {
  id: string;
  ref: string;
  job_type: string;
  pickup: string;
  dropoff: string;
  vehicle_type: string;
  status: string;
  total: number;
  driver_payout: number;
  date: string;
  time: string;
  client_name: string;
  created_at: string;
}

const vehicleLabel = (type: string) =>
  PRICING_TABLE[type as keyof typeof PRICING_TABLE]?.label || type;

export default function DriverPortal() {
  const { user, profile } = useUser();
  const [activeTab, setActiveTab] = useState<Tab>('vehicles');
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [activeJobs, setActiveJobs] = useState<Job[]>([]);
  const [completedJobs, setCompletedJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState({ activeVehicles: 0, jobsWeek: 0, earningsWeek: 0, rating: 0 });

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

  const loadJobs = useCallback(async () => {
    if (!user) return;

    const [pendingRes, activeRes, completedRes] = await Promise.all([
      supabase.from('bookings').select('*').eq('status', 'pending').order('created_at', { ascending: false }).limit(20),
      supabase.from('bookings').select('*').eq('driver_id', user.id).eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('bookings').select('*').eq('driver_id', user.id).eq('status', 'completed').order('created_at', { ascending: false }).limit(20),
    ]);

    if (pendingRes.data) setPendingJobs(pendingRes.data as Job[]);
    if (activeRes.data) setActiveJobs(activeRes.data as Job[]);
    if (completedRes.data) setCompletedJobs(completedRes.data as Job[]);
  }, [user]);

  const loadStats = useCallback(async () => {
    if (!user) return;
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [vehicleRes, jobsRes, earningsRes, driverRes] = await Promise.all([
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('driver_id', user.id).eq('available', true),
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
    loadJobs();
    loadStats();
  }, [loadVehicles, loadJobs, loadStats]);

  async function toggleAvailability(vehicleId: string, available: boolean) {
    await supabase.from('vehicles').update({ available }).eq('id', vehicleId);
    setVehicles((prev) => prev.map((v) => (v.id === vehicleId ? { ...v, available } : v)));
  }

  async function acceptJob(jobId: string) {
    if (!user) return;
    await supabase.from('bookings').update({ status: 'active', driver_id: user.id, driver_name: profile?.full_name }).eq('id', jobId);
    setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
    loadJobs();
    loadStats();
  }

  async function completeJob(jobId: string) {
    await supabase.from('bookings').update({ status: 'completed' }).eq('id', jobId);
    loadJobs();
    loadStats();
  }

  const firstName = profile?.full_name?.split(' ')[0] || 'there';

  const tabs: { key: Tab; label: string }[] = [
    { key: 'vehicles', label: 'My Vehicles' },
    { key: 'jobs', label: 'Job Board' },
    { key: 'active', label: 'Active Jobs' },
    { key: 'earnings', label: 'Earnings' },
  ];

  return (
    <div className={styles.portalLayout}>
      <div className={styles.portalHeader}>
        <h1>Welcome back, {firstName}</h1>
        <p>Manage your vehicles, availability, and jobs</p>
      </div>

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

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <>
          {vehicles.length === 0 && (
            <div className={styles.empty}>No vehicles registered yet.</div>
          )}
          {vehicles.map((v) => (
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
              <div className={styles.vehicleActions}>
                <span className={styles.availLabel}>Available</span>
                <label className={styles.toggle}>
                  <input
                    type="checkbox"
                    className={styles.toggleInput}
                    checked={v.available}
                    onChange={(e) => toggleAvailability(v.id, e.target.checked)}
                  />
                  <div className={styles.toggleTrack} />
                  <div className={styles.toggleThumb} />
                </label>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Job Board Tab */}
      {activeTab === 'jobs' && (
        <>
          {pendingJobs.length === 0 && (
            <div className={styles.empty}>No pending jobs available right now.</div>
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
                <button className={`${styles.btnGreen} ${styles.btnSm}`} onClick={() => acceptJob(j.id)}>Accept</button>
                <button className={`${styles.btnOutline} ${styles.btnSm}`}>Decline</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Active Jobs Tab */}
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
                <span className={`${styles.badge} ${styles.badgeBlue}`}>In Progress</span>
              </div>
              <div className={styles.jobDetails}>
                <div className={styles.jobDetail}>📍 {(j.pickup || '').split(',')[0]} &rarr; {(j.dropoff || '').split(',')[0]}</div>
                <div className={styles.jobDetail}>💰 R{(j.driver_payout || 0).toLocaleString()}</div>
                <div className={styles.jobDetail}>👤 {j.client_name || 'Client'}</div>
              </div>
              <div className={styles.jobActions}>
                <button className={`${styles.btnPrimary} ${styles.btnSm}`} onClick={() => completeJob(j.id)}>Mark Delivered</button>
                <button className={`${styles.btnOutline} ${styles.btnSm}`}>Contact Client</button>
              </div>
            </div>
          ))}
        </>
      )}

      {/* Earnings Tab */}
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
