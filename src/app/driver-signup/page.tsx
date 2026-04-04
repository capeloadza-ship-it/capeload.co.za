'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PRICING_TABLE, VEHICLE_TYPES, type VehicleType } from '@/lib/pricing';
import styles from './page.module.css';

const AREAS = [
  'Cape Town CBD',
  'Southern Suburbs',
  'Northern Suburbs',
  'Atlantic Seaboard',
  'Cape Flats',
  'Helderberg',
  'West Coast',
  'Winelands',
];

export default function DriverSignup() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Personal info
  const [fullName, setFullName] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [licence, setLicence] = useState('');

  // Vehicle info
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>('');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [regPlate, setRegPlate] = useState('');
  const [year, setYear] = useState('');
  const [payload, setPayload] = useState('');

  // Operating areas
  const [areas, setAreas] = useState<string[]>([]);

  function toggleArea(area: string) {
    setAreas((prev) =>
      prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!fullName || !phone || !email || !vehicleType || !make || !model || !regPlate) {
      setError('Please fill in all required fields.');
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      // Insert driver record
      const { data: driver, error: driverErr } = await supabase
        .from('drivers')
        .insert({
          full_name: fullName,
          id_number: idNumber,
          phone,
          email,
          licence_code: licence,
          operating_areas: areas,
          status: 'pending',
        })
        .select('id')
        .single();

      if (driverErr) throw driverErr;

      // Insert vehicle record
      const { error: vehicleErr } = await supabase
        .from('vehicles')
        .insert({
          driver_id: driver.id,
          vehicle_type: vehicleType,
          make,
          model,
          reg_plate: regPlate,
          year: year ? parseInt(year) : null,
          payload_kg: payload ? parseInt(payload) : null,
          status: 'pending',
          available: false,
        });

      if (vehicleErr) throw vehicleErr;

      setSubmitted(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className={styles.page}>
        <nav className={styles.nav}>
          <div className={styles.navInner}>
            <Link href="/">
              <Image src="/images/logo-dark.png" alt="CapeLoad" width={160} height={48} style={{ height: 48, width: 'auto' }} />
            </Link>
          </div>
        </nav>
        <div className={styles.container}>
          <div className={styles.section}>
            <div className={styles.success}>
              <div className={styles.successIcon}>&#10003;</div>
              <h2>Application Submitted</h2>
              <p>
                Thank you for registering as a CapeLoad fleet partner. We will review your application and get back to you within 24-48 hours.
              </p>
              <Link href="/" className={styles.homeLink}>Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/">
            <Image src="/images/logo-dark.png" alt="CapeLoad" width={160} height={48} style={{ height: 48, width: 'auto' }} />
          </Link>
        </div>
      </nav>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Join CapeLoad as a Fleet Partner</h1>
          <p>Register your vehicles and start earning. We connect you with clients across the Western Cape who need reliable logistics.</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Personal Information */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Personal Information</div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Full Name *</label>
                <input className={styles.input} type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Sipho Ndlovu" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>SA ID Number</label>
                <input className={styles.input} type="text" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="13 digit ID number" maxLength={13} />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Phone Number *</label>
                <input className={styles.input} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 071 234 5678" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Email Address *</label>
                <input className={styles.input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="e.g. sipho@email.com" />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Driver&apos;s Licence Code</label>
                <select className={styles.select} value={licence} onChange={(e) => setLicence(e.target.value)}>
                  <option value="">Select licence code</option>
                  <option value="A">Code A (Motorcycle)</option>
                  <option value="B">Code B (Light motor vehicle)</option>
                  <option value="C1">Code C1 (Heavy vehicle up to 16,000 kg)</option>
                  <option value="C">Code C (Extra heavy vehicle)</option>
                  <option value="EC1">Code EC1 (Articulated heavy vehicle)</option>
                  <option value="EC">Code EC (Articulated extra heavy)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Vehicle Details */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Vehicle Details</div>

            <div className={`${styles.field} ${styles.fieldFull}`} style={{ marginBottom: 16 }}>
              <label className={styles.label}>Vehicle Type *</label>
              <div className={styles.vehicleTypeGrid}>
                {VEHICLE_TYPES.map((type) => {
                  const info = PRICING_TABLE[type];
                  return (
                    <button
                      key={type}
                      type="button"
                      className={vehicleType === type ? styles.vehicleTypeOptionActive : styles.vehicleTypeOption}
                      onClick={() => setVehicleType(type)}
                    >
                      <div className={styles.vehicleTypeLabel}>{info.label}</div>
                      <div className={styles.vehicleTypeCapacity}>{info.capacity}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Make *</label>
                <input className={styles.input} type="text" value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Toyota" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Model *</label>
                <input className={styles.input} type="text" value={model} onChange={(e) => setModel(e.target.value)} placeholder="e.g. Hilux 2.4" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Registration Plate *</label>
                <input className={styles.input} type="text" value={regPlate} onChange={(e) => setRegPlate(e.target.value)} placeholder="e.g. CA 123 456" />
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Year</label>
                <input className={styles.input} type="number" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2022" min={2000} max={2030} />
              </div>
              <div className={`${styles.field} ${styles.fieldFull}`}>
                <label className={styles.label}>Max Payload (kg)</label>
                <input className={styles.input} type="number" value={payload} onChange={(e) => setPayload(e.target.value)} placeholder="e.g. 1000" />
              </div>
            </div>
          </div>

          {/* Document Uploads */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Documents</div>
            <div className={styles.fieldGrid}>
              <div className={styles.field}>
                <label className={styles.label}>Driver&apos;s Licence (front &amp; back)</label>
                <div className={styles.uploadArea}>
                  <div className={styles.uploadLabel}>Click to upload</div>
                  <div>PDF, JPG or PNG &middot; Max 5MB</div>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Vehicle Registration (Natis)</label>
                <div className={styles.uploadArea}>
                  <div className={styles.uploadLabel}>Click to upload</div>
                  <div>PDF, JPG or PNG &middot; Max 5MB</div>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Proof of Insurance</label>
                <div className={styles.uploadArea}>
                  <div className={styles.uploadLabel}>Click to upload</div>
                  <div>PDF, JPG or PNG &middot; Max 5MB</div>
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Roadworthy Certificate</label>
                <div className={styles.uploadArea}>
                  <div className={styles.uploadLabel}>Click to upload</div>
                  <div>PDF, JPG or PNG &middot; Max 5MB</div>
                </div>
              </div>
            </div>
          </div>

          {/* Operating Area */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Operating Area</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
              Select the areas where you are willing to operate:
            </p>
            <div className={styles.checkboxGroup}>
              {AREAS.map((area) => (
                <label key={area} className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={areas.includes(area)}
                    onChange={() => toggleArea(area)}
                  />
                  {area}
                </label>
              ))}
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  );
}
