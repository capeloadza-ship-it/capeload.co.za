'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  PRICING_TABLE,
  VEHICLE_TYPES,
  JOB_NAMES,
  calculateQuote,
  type JobType,
  type VehicleType,
} from '@/lib/pricing';
import AddressAutocomplete from '@/components/booking/AddressAutocomplete';
import BookingMap from '@/components/maps/BookingMap';
import s from './page.module.css';

/* ── Inline SVG helpers ── */
const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
);
const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);

/* Vehicle SVG icons */
const VEHICLE_ICONS: Record<VehicleType, React.ReactNode> = {
  motorbike: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="18" r="3" /><circle cx="19" cy="18" r="3" /><path d="M12 18V9l-3-3h4l3 6h3M9 6l1 6h6" /></svg>,
  bakkie: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="10" width="12" height="9" rx="1" /><path d="M13 13h5l3 3v3h-8V13z" /><circle cx="5" cy="19.5" r="2" /><circle cx="18.5" cy="19.5" r="2" /><path d="M1 10l3-5h7l2 5" /></svg>,
  'panel-van': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="15" height="13" rx="2" /><path d="M16 10h4l3 4v5h-7V10z" /><circle cx="5.5" cy="19.5" r="2.5" /><circle cx="18.5" cy="19.5" r="2.5" /></svg>,
  '4-ton': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="13" height="14" rx="1" /><path d="M14 9h5l3 4v5h-8V9z" /><circle cx="5" cy="18.5" r="2.5" /><circle cx="19" cy="18.5" r="2.5" /></svg>,
  '8-ton': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="15" rx="1" /><path d="M15 8h4l4 5v5h-8V8z" /><circle cx="5" cy="18.5" r="2.5" /><circle cx="19.5" cy="18.5" r="2.5" /><circle cx="9" cy="18.5" r="2.5" /></svg>,
  flatbed: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="8" width="16" height="3" rx="1" /><path d="M17 8h4l2 3v7h-6V8z" /><line x1="1" y1="11" x2="17" y2="11" /><circle cx="5" cy="18.5" r="2.5" /><circle cx="19.5" cy="18.5" r="2.5" /></svg>,
};

const PAYMENT_METHODS = [
  { value: 'eft' as const, label: 'EFT / Bank', desc: 'Instant EFT' },
  { value: 'card' as const, label: 'Card', desc: 'Visa / MC' },
  { value: 'ozow' as const, label: 'Ozow', desc: 'Instant pay' },
];
type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

const JOB_TYPES: JobType[] = ['move', 'courier', 'haul'];

/* ═══════════════════════════════════════
   BOOKING PAGE — e-hailing style
═══════════════════════════════════════ */
export default function BookingPage() {
  /* Step state: 1=address, 2=vehicle+job, 3=details+payment, 4=confirmation */
  const [step, setStep] = useState(1);

  /* Address */
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropoffCoords, setDropoffCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');

  /* Vehicle + job */
  const [jobType, setJobType] = useState<JobType>('move');
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);

  /* Contact + payment */
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('eft');

  /* Booking state */
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  /* Vehicle availability counts */
  const [availCounts, setAvailCounts] = useState<Record<string, number>>({});
  const [availLoaded, setAvailLoaded] = useState(false);
  const [availWarning, setAvailWarning] = useState('');

  useEffect(() => {
    if (step === 2 && !availLoaded) {
      fetch('/api/vehicles/available')
        .then((res) => res.json())
        .then((data) => {
          if (data.vehicles) {
            const counts: Record<string, number> = {};
            for (const v of data.vehicles as { vehicle_type: string }[]) {
              counts[v.vehicle_type] = (counts[v.vehicle_type] || 0) + 1;
            }
            setAvailCounts(counts);
          }
          setAvailLoaded(true);
        })
        .catch(() => setAvailLoaded(true));
    }
  }, [step, availLoaded]);

  // If selected vehicle type becomes unavailable, show warning
  useEffect(() => {
    if (vehicle && availLoaded && (availCounts[vehicle] || 0) === 0) {
      setAvailWarning(`No ${PRICING_TABLE[vehicle].label} vehicles currently available. Your booking will be queued.`);
    } else {
      setAvailWarning('');
    }
  }, [vehicle, availCounts, availLoaded]);

  /* Distance heuristic */
  function estimateDistance(): number {
    const combined = (pickup + dropoff).length;
    return Math.max(5, Math.min(combined * 0.6, 80));
  }

  /* Live quote */
  const quote = useMemo(() => {
    if (!vehicle) return null;
    return calculateQuote(vehicle, estimateDistance());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicle, pickup, dropoff]);

  /* Validation */
  const canStep2 = pickup.trim() !== '' && dropoff.trim() !== '' && bookingDate !== '' && bookingTime !== '';
  const canStep3 = !!vehicle;
  const canConfirm = fullName.trim() !== '' && phone.trim() !== '';

  /* Navigation */
  function goTo(target: number) {
    setStep(target);
  }

  /* Submit */
  async function handleConfirm() {
    if (!vehicle) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobType,
          vehicle,
          pickup,
          dropoff,
          date: bookingDate,
          time: bookingTime,
          name: fullName,
          phone,
          email,
          paymentMethod,
          distanceKm: estimateDistance(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setBookingRef(data.ref);
      goTo(4);
    } catch {
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={s.page}>
      {/* ── Map background ── */}
      <div className={s.mapLayer}>
        <BookingMap pickupCoords={pickupCoords} dropoffCoords={dropoffCoords} />
      </div>

      {/* ── Floating logo ── */}
      <div className={s.topBar}>
        <Link href="/" className={s.logo}>
          <Image src="/images/logo-dark.png" alt="CapeLoad" width={120} height={40} style={{ height: 36, width: 'auto' }} />
        </Link>
      </div>

      {/* ── Bottom sheet ── */}
      <div className={s.sheet}>
        <div className={s.sheetHandle} />

        {/* ═══ STEP 1: ADDRESS ═══ */}
        {step === 1 && (
          <div className={s.stepPanel}>
            <h2 className={s.sheetTitle}>Where to?</h2>

            <div className={s.routeInputs}>
              {/* Dotted line + dots */}
              <div className={s.routeDots}>
                <span className={s.dotGreen} />
                <span className={s.dotLine} />
                <span className={s.dotOrange} />
              </div>
              <div className={s.routeFields}>
                <AddressAutocomplete
                  className={s.routeInput}
                  placeholder="Pickup location"
                  value={pickup}
                  onChange={setPickup}
                  onPlaceSelect={setPickupCoords}
                />
                <div className={s.routeDivider} />
                <AddressAutocomplete
                  className={s.routeInput}
                  placeholder="Drop-off location"
                  value={dropoff}
                  onChange={setDropoff}
                  onPlaceSelect={setDropoffCoords}
                />
              </div>
            </div>

            <div className={s.dateTimeRow}>
              <div className={s.dtField}>
                <label className={s.dtLabel}>Date</label>
                <input
                  type="date"
                  className={s.dtInput}
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                />
              </div>
              <div className={s.dtField}>
                <label className={s.dtLabel}>Time</label>
                <input
                  type="time"
                  className={s.dtInput}
                  value={bookingTime}
                  onChange={(e) => setBookingTime(e.target.value)}
                />
              </div>
            </div>

            <button
              className={`${s.btnPrimary} ${!canStep2 ? s.btnDisabled : ''}`}
              disabled={!canStep2}
              onClick={() => goTo(2)}
            >
              Next
              <ArrowRight />
            </button>
          </div>
        )}

        {/* ═══ STEP 2: VEHICLE + JOB TYPE ═══ */}
        {step === 2 && (
          <div className={s.stepPanel}>
            <button className={s.backBtn} onClick={() => goTo(1)}>
              <ArrowLeft />
            </button>
            <h2 className={s.sheetTitle}>Choose your ride</h2>

            {/* Job type tabs */}
            <div className={s.jobTabs}>
              {JOB_TYPES.map((jt) => (
                <button
                  key={jt}
                  className={`${s.jobTab} ${jobType === jt ? s.jobTabActive : ''}`}
                  onClick={() => setJobType(jt)}
                >
                  {JOB_NAMES[jt]}
                </button>
              ))}
            </div>

            {/* Availability warning */}
            {availWarning && (
              <div className={s.vehicleWarning}>{availWarning}</div>
            )}

            {/* Horizontal scrollable vehicle cards */}
            <div className={s.vehicleScroll}>
              {VEHICLE_TYPES.map((vt) => {
                const p = PRICING_TABLE[vt];
                const q = calculateQuote(vt, estimateDistance());
                const selected = vehicle === vt;
                const count = availCounts[vt] || 0;
                const isDisabled = availLoaded && count === 0;
                return (
                  <div
                    key={vt}
                    className={`${s.vehicleCard} ${selected ? s.vehicleCardSelected : ''} ${isDisabled ? s.vehicleCardDisabled : ''}`}
                    onClick={() => !isDisabled && setVehicle(vt)}
                  >
                    {selected && (
                      <div className={s.vehicleCheck}><CheckIcon /></div>
                    )}
                    <div className={s.vehicleIcon}>{VEHICLE_ICONS[vt]}</div>
                    <div className={s.vehicleName}>{p.label}</div>
                    <div className={s.vehicleCap}>{p.capacity}</div>
                    <div className={s.vehiclePrice}>R{q.total.toLocaleString()}</div>
                    {availLoaded && (
                      <div className={count > 0 ? s.vehicleAvail : s.vehicleAvailNone}>
                        {count > 0 ? `${count} available` : 'None available'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Live price display */}
            {quote && (
              <div className={s.livePrice}>
                <span className={s.livePriceLabel}>Estimated fare</span>
                <span className={s.livePriceValue}>R{quote.total.toLocaleString()}</span>
              </div>
            )}

            <button
              className={`${s.btnPrimary} ${!canStep3 ? s.btnDisabled : ''}`}
              disabled={!canStep3}
              onClick={() => goTo(3)}
            >
              Next
              <ArrowRight />
            </button>
          </div>
        )}

        {/* ═══ STEP 3: DETAILS + PAYMENT ═══ */}
        {step === 3 && (
          <div className={s.stepPanel}>
            <button className={s.backBtn} onClick={() => goTo(2)}>
              <ArrowLeft />
            </button>
            <h2 className={s.sheetTitle}>Your details</h2>

            <div className={s.formGrid}>
              <input
                type="text"
                className={s.formInput}
                placeholder="Full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
              <input
                type="tel"
                className={s.formInput}
                placeholder="Phone (WhatsApp)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <input
                type="email"
                className={s.formInput}
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className={s.paySection}>
              <h3 className={s.payTitle}>Payment method</h3>
              <div className={s.payOptions}>
                {PAYMENT_METHODS.map((pm) => (
                  <button
                    key={pm.value}
                    className={`${s.payOption} ${paymentMethod === pm.value ? s.payOptionActive : ''}`}
                    onClick={() => setPaymentMethod(pm.value)}
                  >
                    <span className={s.payOptionLabel}>{pm.label}</span>
                    <span className={s.payOptionDesc}>{pm.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quote breakdown */}
            {quote && (
              <div className={s.quoteSummary}>
                <div className={s.quoteRow}>
                  <span>Vehicle</span>
                  <span>{vehicle ? PRICING_TABLE[vehicle].label : ''}</span>
                </div>
                <div className={s.quoteRow}>
                  <span>Base fare</span>
                  <span>R{quote.base}</span>
                </div>
                <div className={s.quoteRow}>
                  <span>Distance est.</span>
                  <span>{Math.round(quote.distanceKm)} km</span>
                </div>
                <div className={`${s.quoteRow} ${s.quoteRowTotal}`}>
                  <span>Total</span>
                  <span>R{quote.total.toLocaleString()}</span>
                </div>
              </div>
            )}

            <button
              className={`${s.btnPrimary} ${!canConfirm ? s.btnDisabled : ''}`}
              disabled={!canConfirm || submitting}
              onClick={handleConfirm}
            >
              {submitting ? (
                <><span className={s.spinner} /> Confirming...</>
              ) : (
                <>Confirm &amp; Book</>
              )}
            </button>
          </div>
        )}

        {/* ═══ STEP 4: CONFIRMATION ═══ */}
        {step === 4 && (
          <div className={s.stepPanel}>
            <div className={s.confirmBlock}>
              <div className={s.confirmCircle}>
                <CheckIcon />
              </div>
              <h2 className={s.confirmTitle}>Booking confirmed!</h2>
              <p className={s.confirmSub}>A driver will be assigned shortly.</p>
              <div className={s.refBadge}>{bookingRef}</div>
              <p className={s.confirmNote}>Updates will be sent to <strong>{phone}</strong></p>
              <div className={s.confirmActions}>
                <a
                  href={`https://wa.me/27600000000?text=${encodeURIComponent(`Hi CapeLoad, my booking ref is ${bookingRef}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={s.btnWa}
                >
                  <WhatsAppIcon />
                  Chat on WhatsApp
                </a>
                <Link href="/" className={s.btnSecondary}>
                  Back to home
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
