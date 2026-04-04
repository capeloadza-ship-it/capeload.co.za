'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeBookings } from '@/hooks/useRealtimeBookings';
import { PRICING_TABLE } from '@/lib/pricing';
import styles from './page.module.css';

type Panel = 'bookings' | 'fleet' | 'drivers' | 'clients' | 'notifications';

interface Vehicle {
  id: string;
  make: string;
  model: string;
  vehicle_type: string;
  reg_plate: string;
  status: string;
  available: boolean;
  availability_status: string;
  driver_id: string;
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

interface AvailableVehicle {
  id: string;
  make: string;
  model: string;
  vehicle_type: string;
  reg_plate: string;
}

interface ApprovedDriver {
  id: string;
  full_name: string;
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

const statusBadge = (status: string, module = styles) => {
  const map: Record<string, { cls: string; label: string }> = {
    pending: { cls: module.badgeOrange, label: 'Pending' },
    assigned: { cls: module.badgeBlue, label: 'Assigned' },
    active: { cls: module.badgeBlue, label: 'In Progress' },
    in_progress: { cls: module.badgeBlue, label: 'In Progress' },
    completed: { cls: module.badgeGreen, label: 'Completed' },
    cancelled: { cls: module.badgeRed, label: 'Cancelled' },
    unassigned: { cls: module.badgeYellow, label: 'Unassigned' },
    approved: { cls: module.badgeGreen, label: 'Approved' },
    available: { cls: module.badgeGreen, label: 'Available' },
    unavailable: { cls: module.badgeRed, label: 'Unavailable' },
    maintenance: { cls: module.badgeYellow, label: 'Maintenance' },
  };
  const entry = map[status] || { cls: module.badgeOrange, label: status };
  return <span className={`${module.badge} ${entry.cls}`}>{entry.label}</span>;
};

const driverStatusBadge = (status: string | null) => {
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
};

export default function AdminPortal() {
  const [activePanel, setActivePanel] = useState<Panel>('bookings');
  const { bookings } = useRealtimeBookings({ all: true });
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState({ todayBookings: 0, activeVehicles: 0, pendingApprovals: 0, weeklyRevenue: 0 });

  // Assign modal state
  const [assignBookingId, setAssignBookingId] = useState<string | null>(null);
  const [assignVehicleId, setAssignVehicleId] = useState('');
  const [assignDriverId, setAssignDriverId] = useState('');
  const [availableVehicles, setAvailableVehicles] = useState<AvailableVehicle[]>([]);
  const [approvedDrivers, setApprovedDrivers] = useState<ApprovedDriver[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);

  // Notifications
  const [notifRecipient, setNotifRecipient] = useState('');
  const [notifChannel, setNotifChannel] = useState('in_app');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifSending, setNotifSending] = useState(false);
  const [notifSuccess, setNotifSuccess] = useState('');

  const supabase = createClient();

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
      supabase.from('vehicles').select('id', { count: 'exact', head: true }).eq('availability_status', 'available'),
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
  }, [loadStats]);

  useEffect(() => {
    if (activePanel === 'fleet') loadFleet();
    if (activePanel === 'drivers') loadDrivers();
    if (activePanel === 'clients') loadClients();
  }, [activePanel, loadFleet, loadDrivers, loadClients]);

  // Open assign modal
  async function openAssignModal(bookingId: string) {
    setAssignBookingId(bookingId);
    setAssignVehicleId('');
    setAssignDriverId('');

    try {
      const [vRes, dRes] = await Promise.all([
        fetch('/api/vehicles/available'),
        supabase.from('drivers').select('id, full_name').eq('status', 'approved'),
      ]);
      if (vRes.ok) {
        const vData = await vRes.json();
        setAvailableVehicles(vData.vehicles || []);
      }
      if (dRes.data) {
        setApprovedDrivers(dRes.data as ApprovedDriver[]);
      }
    } catch {
      // silently fail, user can retry
    }
  }

  async function handleAssign() {
    if (!assignBookingId || !assignVehicleId || !assignDriverId) return;
    setAssignLoading(true);
    try {
      const res = await fetch(`/api/bookings/${assignBookingId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicleId: assignVehicleId, driverId: assignDriverId }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Assignment failed');
      } else {
        setAssignBookingId(null);
      }
    } catch {
      alert('Network error. Try again.');
    } finally {
      setAssignLoading(false);
    }
  }

  async function handleCancelBooking(bookingId: string) {
    if (!confirm('Cancel this booking?')) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by admin' }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Cancel failed');
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  async function handleApproveDriver(driverId: string) {
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/approve`, { method: 'POST' });
      if (res.ok) {
        setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, status: 'approved' } : d)));
      } else {
        const err = await res.json();
        alert(err.error || 'Approval failed');
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  async function handleRejectDriver(driverId: string) {
    if (!confirm('Reject this driver?')) return;
    try {
      const res = await fetch(`/api/admin/drivers/${driverId}/reject`, { method: 'POST' });
      if (res.ok) {
        setDrivers((prev) => prev.map((d) => (d.id === driverId ? { ...d, status: 'rejected' } : d)));
      } else {
        const err = await res.json();
        alert(err.error || 'Rejection failed');
      }
    } catch {
      alert('Network error. Try again.');
    }
  }

  async function handleSendNotification() {
    if (!notifRecipient || !notifMessage.trim()) return;
    setNotifSending(true);
    setNotifSuccess('');
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: notifRecipient,
          channel: notifChannel,
          message: notifMessage,
        }),
      });
      if (res.ok) {
        setNotifSuccess('Notification sent successfully');
        setNotifMessage('');
      } else {
        const err = await res.json();
        alert(err.error || 'Send failed');
      }
    } catch {
      alert('Network error. Try again.');
    } finally {
      setNotifSending(false);
    }
  }

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

          {/* ═══ Bookings Panel ═══ */}
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
                      <th>Driver</th>
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
                        <td>{b.driver_name || '—'}</td>
                        <td>
                          <div className={styles.badgeStack}>
                            {statusBadge(b.status)}
                            {driverStatusBadge(b.driver_status)}
                          </div>
                        </td>
                        <td>
                          {b.status === 'pending' && (
                            <>
                              <button className={styles.btnPrimary} onClick={() => openAssignModal(b.id)}>
                                Assign
                              </button>{' '}
                              <button className={styles.btnRed} onClick={() => handleCancelBooking(b.id)}>
                                Cancel
                              </button>
                            </>
                          )}
                          {(b.status === 'assigned' || b.status === 'active') && (
                            <button className={styles.btnRed} onClick={() => handleCancelBooking(b.id)}>
                              Cancel
                            </button>
                          )}
                          {b.status === 'completed' && (
                            <button className={styles.btnOutline} disabled>Done</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {bookings.length === 0 && (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No bookings found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ Fleet Panel ═══ */}
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
                      <th>Availability</th>
                      <th>Active Booking</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => {
                      const activeBooking = bookings.find(
                        (b) =>
                          (b.status === 'active' || b.status === 'assigned') &&
                          b.driver_id === v.driver_id
                      );
                      return (
                        <tr key={v.id}>
                          <td>{v.make} {v.model}</td>
                          <td>{v.driver_name}</td>
                          <td>{vehicleLabel(v.vehicle_type)}</td>
                          <td>{v.reg_plate}</td>
                          <td>{statusBadge(v.availability_status || (v.available ? 'available' : 'unavailable'))}</td>
                          <td>
                            {activeBooking ? (
                              <span style={{ fontSize: 12 }}>
                                {activeBooking.ref} — {(activeBooking.pickup || '').split(',')[0]}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>None</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {vehicles.length === 0 && (
                      <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No vehicles found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ Drivers Panel ═══ */}
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
                                <button className={styles.btnGreen} onClick={() => handleApproveDriver(d.id)}>Approve</button>{' '}
                                <button className={styles.btnRed} onClick={() => handleRejectDriver(d.id)}>Reject</button>
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

          {/* ═══ Clients Panel ═══ */}
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

          {/* ═══ Notifications Panel ═══ */}
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
                    <input type="radio" name="channel" value="in_app" checked={notifChannel === 'in_app'} onChange={() => setNotifChannel('in_app')} />
                    In-App
                  </label>
                  <label className={styles.radioLabel}>
                    <input type="radio" name="channel" value="email" checked={notifChannel === 'email'} onChange={() => setNotifChannel('email')} />
                    Email
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
              {notifSuccess && (
                <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 600, marginBottom: 12 }}>
                  {notifSuccess}
                </div>
              )}
              <button
                className={`${styles.btnPrimary} ${notifSending ? styles.btnLoading : ''}`}
                style={{ padding: '12px 24px' }}
                disabled={notifSending || !notifRecipient || !notifMessage.trim()}
                onClick={handleSendNotification}
              >
                {notifSending ? 'Sending...' : 'Send notification'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ═══ Assign Modal ═══ */}
      {assignBookingId && (
        <div className={styles.modalOverlay} onClick={() => setAssignBookingId(null)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>Assign Driver &amp; Vehicle</div>

            <label className={styles.formLabel}>Vehicle</label>
            <select
              className={styles.formInput}
              value={assignVehicleId}
              onChange={(e) => setAssignVehicleId(e.target.value)}
            >
              <option value="">Select a vehicle</option>
              {availableVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.make} {v.model} — {v.reg_plate} ({vehicleLabel(v.vehicle_type)})
                </option>
              ))}
            </select>

            <label className={styles.formLabel}>Driver</label>
            <select
              className={styles.formInput}
              value={assignDriverId}
              onChange={(e) => setAssignDriverId(e.target.value)}
            >
              <option value="">Select a driver</option>
              {approvedDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.full_name}
                </option>
              ))}
            </select>

            <div className={styles.modalActions}>
              <button
                className={styles.btnPrimary}
                disabled={assignLoading || !assignVehicleId || !assignDriverId}
                onClick={handleAssign}
              >
                {assignLoading ? 'Assigning...' : 'Assign'}
              </button>
              <button className={styles.btnOutline} onClick={() => setAssignBookingId(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
