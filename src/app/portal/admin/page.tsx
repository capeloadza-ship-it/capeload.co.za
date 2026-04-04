'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { PRICING_TABLE } from '@/lib/pricing';
import styles from './page.module.css';

type Panel = 'bookings' | 'fleet' | 'drivers' | 'clients' | 'notifications';

interface Booking {
  id: string;
  ref: string;
  client_name: string;
  job_type: string;
  pickup: string;
  dropoff: string;
  vehicle_type: string;
  status: string;
  total: number;
  created_at: string;
}

interface Vehicle {
  id: string;
  make: string;
  model: string;
  vehicle_type: string;
  reg_plate: string;
  status: string;
  available: boolean;
  driver_name: string;
}

interface Driver {
  id: string;
  full_name: string;
  phone: string;
  vehicle_count: number;
  jobs_done: number;
  rating: number | null;
  status: string;
}

interface Client {
  id: string;
  full_name: string;
  client_type: string;
  jobs: number;
  total_spent: number;
  status: string;
}

const NAV_ITEMS: { key: Panel; label: string; section?: string }[] = [
  { key: 'bookings', label: 'Bookings', section: 'Overview' },
  { key: 'fleet', label: 'Fleet' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'clients', label: 'Clients' },
  { key: 'notifications', label: 'Notifications', section: 'Operations' },
];

const vehicleLabel = (type: string) =>
  PRICING_TABLE[type as keyof typeof PRICING_TABLE]?.label || type;

const statusBadge = (status: string) => {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: styles.badgeOrange, label: 'Pending' },
    active: { cls: styles.badgeBlue, label: 'In Progress' },
    completed: { cls: styles.badgeGreen, label: 'Completed' },
    cancelled: { cls: styles.badgeRed, label: 'Cancelled' },
    unassigned: { cls: styles.badgeYellow, label: 'Unassigned' },
    approved: { cls: styles.badgeGreen, label: 'Approved' },
  };
  const entry = map[status] || { cls: styles.badgeOrange, label: status };
  return <span className={`${styles.badge} ${entry.cls}`}>{entry.label}</span>;
};

export default function AdminPortal() {
  const [activePanel, setActivePanel] = useState<Panel>('bookings');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({ todayBookings: 0, activeVehicles: 0, pendingApprovals: 0, weeklyRevenue: 0 });

  const [notifRecipient, setNotifRecipient] = useState('');
  const [notifChannel, setNotifChannel] = useState('whatsapp');
  const [notifMessage, setNotifMessage] = useState('');

  const supabase = createClient();

  const loadBookings = useCallback(async () => {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setBookings(data as Booking[]);
  }, []);

  const loadFleet = useCallback(async () => {
    const { data } = await supabase
      .from('vehicles')
      .select('*, drivers(full_name)')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) {
      setVehicles(
        data.map((v: Record<string, unknown>) => ({
          ...v,
          driver_name: (v.drivers as Record<string, string> | null)?.full_name || 'Unknown',
        })) as Vehicle[]
      );
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    const { data } = await supabase
      .from('drivers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setDrivers(data as Driver[]);
  }, []);

  const loadClients = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .in('role', ['client', 'guest'])
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setClients(data as Client[]);
  }, []);

  const loadStats = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const [todayRes, vehicleRes, pendingRes, revenueRes] = await Promise.all([
      supabase.from('bookings').select('id', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('available', true),
      supabase.from('drivers').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('bookings').select('total').gte('created_at', weekAgo),
    ]);

    setStats({
      todayBookings: todayRes.count || 0,
      activeVehicles: vehicleRes.count || 0,
      pendingApprovals: pendingRes.count || 0,
      weeklyRevenue: (revenueRes.data || []).reduce((s: number, b: { total: number }) => s + (b.total || 0), 0),
    });
  }, []);

  useEffect(() => {
    loadStats();
    loadBookings();
  }, [loadStats, loadBookings]);

  useEffect(() => {
    if (activePanel === 'fleet') loadFleet();
    if (activePanel === 'drivers') loadDrivers();
    if (activePanel === 'clients') loadClients();
  }, [activePanel, loadFleet, loadDrivers, loadClients]);

  const panelTitle: Record<Panel, string> = {
    bookings: 'Bookings',
    fleet: 'Fleet',
    drivers: 'Drivers',
    clients: 'Clients',
    notifications: 'Notifications',
  };

  return (
    <div className={styles.adminLayout}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.sidebarLogo}>
          <a href="/">
            <Image src="/images/logo-light.png" alt="CapeLoad" width={160} height={48} style={{ height: 48, width: 'auto' }} />
          </a>
        </div>
        <nav>
          {NAV_ITEMS.map((item) => (
            <div key={item.key}>
              {item.section && <div className={styles.sidebarSection}>{item.section}</div>}
              <button
                className={activePanel === item.key ? styles.sidebarLinkActive : styles.sidebarLink}
                onClick={() => setActivePanel(item.key)}
              >
                {item.label}
              </button>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className={styles.main}>
        <div className={styles.topbar}>
          <div className={styles.topbarTitle}>{panelTitle[activePanel]}</div>
        </div>

        <div className={styles.content}>
          {/* Stats */}
          <div className={styles.statsRow}>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Today&apos;s bookings</div>
              <div className={`${styles.statValue} ${styles.orange}`}>{stats.todayBookings}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Active vehicles</div>
              <div className={`${styles.statValue} ${styles.blue}`}>{stats.activeVehicles}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Pending approvals</div>
              <div className={`${styles.statValue} ${styles.yellow}`}>{stats.pendingApprovals}</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statLabel}>Weekly revenue</div>
              <div className={`${styles.statValue} ${styles.green}`}>R{stats.weeklyRevenue.toLocaleString()}</div>
            </div>
          </div>

          {/* Bookings Panel */}
          {activePanel === 'bookings' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>All Bookings</div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Route</th>
                      <th>Vehicle</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>{b.ref}</td>
                        <td>{b.client_name || 'Guest'}</td>
                        <td>{b.job_type}</td>
                        <td>{(b.pickup || '').split(',')[0]} &rarr; {(b.dropoff || '').split(',')[0]}</td>
                        <td>{vehicleLabel(b.vehicle_type)}</td>
                        <td>{statusBadge(b.status)}</td>
                        <td><button className={styles.btnOutline}>View</button></td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No bookings found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Fleet Panel */}
          {activePanel === 'fleet' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Fleet Overview</div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Vehicle</th>
                      <th>Owner</th>
                      <th>Type</th>
                      <th>Plate</th>
                      <th>Status</th>
                      <th>Available</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => (
                      <tr key={v.id}>
                        <td>{v.make} {v.model}</td>
                        <td>{v.driver_name}</td>
                        <td>{vehicleLabel(v.vehicle_type)}</td>
                        <td>{v.reg_plate}</td>
                        <td>{statusBadge(v.status)}</td>
                        <td>
                          <span className={`${styles.badge} ${v.available ? styles.badgeGreen : styles.badgeRed}`}>
                            {v.available ? 'Yes' : 'No'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {vehicles.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No vehicles found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Drivers Panel */}
          {activePanel === 'drivers' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Driver Management</div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Driver</th>
                      <th>Vehicles</th>
                      <th>Jobs Done</th>
                      <th>Rating</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => {
                      const initials = d.full_name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)
                        .toUpperCase();
                      return (
                        <tr key={d.id}>
                          <td>
                            <div className={styles.driverRow}>
                              <div className={styles.driverAvatar}>{initials}</div>
                              <div>
                                <div className={styles.driverName}>{d.full_name}</div>
                                <div className={styles.driverPhone}>{d.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td>{d.vehicle_count}</td>
                          <td>{d.jobs_done}</td>
                          <td>{d.rating ?? '—'}</td>
                          <td>{statusBadge(d.status)}</td>
                          <td>
                            {d.status === 'pending' ? (
                              <>
                                <button className={styles.btnGreen}>Approve</button>{' '}
                                <button className={styles.btnRed}>Reject</button>
                              </>
                            ) : (
                              <button className={styles.btnOutline}>View</button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {drivers.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No drivers found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Clients Panel */}
          {activePanel === 'clients' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Client Accounts</div>
              </div>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Type</th>
                      <th>Jobs</th>
                      <th>Total Spent</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clients.map((c) => (
                      <tr key={c.id}>
                        <td>{c.full_name}</td>
                        <td>
                          <span className={`${styles.badge} ${c.client_type === 'guest' ? styles.badgeOrange : styles.badgeBlue}`}>
                            {c.client_type === 'guest' ? 'Guest' : 'Long-term'}
                          </span>
                        </td>
                        <td>{c.jobs}</td>
                        <td>R{(c.total_spent || 0).toLocaleString()}</td>
                        <td>{statusBadge(c.status || 'active')}</td>
                      </tr>
                    ))}
                    {clients.length === 0 && (
                      <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No clients found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Notifications Panel */}
          {activePanel === 'notifications' && (
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitle}>Send Notification</div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Recipient</label>
                <select
                  className={styles.formSelect}
                  value={notifRecipient}
                  onChange={(e) => setNotifRecipient(e.target.value)}
                >
                  <option value="">Select recipient</option>
                  <option value="all_drivers">All active drivers</option>
                  <option value="all_clients">All clients</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Channel</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="channel" value="whatsapp" checked={notifChannel === 'whatsapp'} onChange={() => setNotifChannel('whatsapp')} />
                    WhatsApp
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="channel" value="sms" checked={notifChannel === 'sms'} onChange={() => setNotifChannel('sms')} />
                    SMS
                  </label>
                </div>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Message</label>
                <textarea
                  className={styles.formTextarea}
                  placeholder="Type your message..."
                  value={notifMessage}
                  onChange={(e) => setNotifMessage(e.target.value)}
                />
              </div>
              <button className={styles.btnPrimary} style={{ padding: '12px 24px' }}>
                Send notification
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
