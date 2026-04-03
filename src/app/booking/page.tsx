'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  PRICING_TABLE,
  VEHICLE_TYPES,
  JOB_NAMES,
  JOB_SUGGESTIONS,
  calculateQuote,
  type JobType,
  type VehicleType,
} from '@/lib/pricing';
import s from './page.module.css';

/* ═══════════════════════════════════════
   Solid SVG icon helpers
═══════════════════════════════════════ */
const CheckIcon = () => (
  <svg viewBox="0 0 24 24"><path d="M20 6L9 17l-5-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ArrowRight = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 12h14M12 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const ArrowLeft = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 12H5M12 19l-7-7 7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

/* Solid filled icons */
const MoveIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a4 4 0 00-8 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const CourierIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 3h15a2 2 0 012 2v11H1V3zm15 5h4l3 3v5h-7V8zM5.5 19a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm13 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const HaulIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M1 4h14a1 1 0 011 1v14H1V4zm14 4h4l4 5v5h-8V8zM5 19.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5zm14.5 0a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z" /></svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M19 4h-1V2h-2v2H8V2H6v2H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V6a2 2 0 00-2-2zm0 16H5V10h14v10z" /></svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 11h-2V7h2v4h3v2h-3z" /></svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="var(--text-muted)"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24c1.12.37 2.33.57 3.58.57a1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.46.57 3.58a1 1 0 01-.24 1.01l-2.21 2.2z" /></svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" fill="var(--blue)"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" /></svg>
);

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);

const EftIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3a2 2 0 00-2 2v12a2 2 0 002 2h18a2 2 0 002-2V6a2 2 0 00-2-2zm0 14H3V8h18v10zm-4-4h-4v-2h4v2z" /></svg>
);

const CashIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm1 14.93V18h-2v-1.07A4 4 0 018 13h2a2 2 0 104 0c0 .73-.4 1.4-1.04 1.76l-.24.14A4.01 4.01 0 0011 18.93V17h2v-.07zM13 9h-2V7h2v2z" /></svg>
);

const CardIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V6a2 2 0 00-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" /></svg>
);

const ConfirmCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="#22c55e"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
);

/* Vehicle icon mapping */
const VEHICLE_ICONS: Record<VehicleType, React.ReactNode> = {
  motorbike: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="18" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><circle cx="19" cy="18" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M12 18V9l-3-3h4l3 6h3M9 6l1 6h6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  bakkie: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="10" width="12" height="9" rx="1" /><path d="M13 13h5l3 3v3h-8V13z" /><circle cx="5" cy="19.5" r="2" /><circle cx="18.5" cy="19.5" r="2" /><path d="M1 10l3-5h7l2 5" /></svg>,
  'panel-van': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="6" width="15" height="13" rx="2" /><path d="M16 10h4l3 4v5h-7V10z" /><circle cx="5.5" cy="19.5" r="2.5" /><circle cx="18.5" cy="19.5" r="2.5" /></svg>,
  '4-ton': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="13" height="14" rx="1" /><path d="M14 9h5l3 4v5h-8V9z" /><circle cx="5" cy="18.5" r="2.5" /><circle cx="19" cy="18.5" r="2.5" /></svg>,
  '8-ton': <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="14" height="15" rx="1" /><path d="M15 8h4l4 5v5h-8V8z" /><circle cx="5" cy="18.5" r="2.5" /><circle cx="19.5" cy="18.5" r="2.5" /><circle cx="9" cy="18.5" r="2.5" /></svg>,
  flatbed: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="8" width="16" height="3" rx="1" /><path d="M17 8h4l2 3v7h-6V8z" /><line x1="1" y1="11" x2="17" y2="11" /><circle cx="5" cy="18.5" r="2.5" /><circle cx="19.5" cy="18.5" r="2.5" /></svg>,
};

const JOB_ICONS: Record<JobType, React.ReactNode> = {
  move: <MoveIcon />,
  courier: <CourierIcon />,
  haul: <HaulIcon />,
};

const STEP_LABELS = ['Job type', 'Vehicle', 'Details', 'Quote', 'Done'];

const PAYMENT_METHODS = [
  { value: 'eft', label: 'EFT / Bank', desc: 'Instant EFT', icon: <EftIcon /> },
  { value: 'cash', label: 'Cash', desc: 'Pay driver', icon: <CashIcon /> },
  { value: 'card', label: 'Card', desc: 'Visa / MC', icon: <CardIcon /> },
] as const;

type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

/* ═══════════════════════════════════════
   BOOKING WIZARD
═══════════════════════════════════════ */
export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [jobType, setJobType] = useState<JobType | null>(null);
  const [vehicle, setVehicle] = useState<VehicleType | null>(null);
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('eft');
  const [submitting, setSubmitting] = useState(false);
  const [bookingRef, setBookingRef] = useState('');
  const [quoteTotal, setQuoteTotal] = useState(0);

  /* Estimate distance from addresses (simple heuristic) */
  function estimateDistance(): number {
    const combined = (pickup + dropoff).length;
    return Math.max(5, Math.min(combined * 0.6, 80));
  }

  /* Step navigation */
  function goToStep(target: number) {
    if (target < 1 || target > 5) return;
    setStep(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* Generate quote and go to step 4 */
  function handleGenerateQuote() {
    if (!vehicle) return;
    const dist = estimateDistance();
    const q = calculateQuote(vehicle, dist);
    setQuoteTotal(q.total);
    goToStep(4);
  }

  /* Confirm booking */
  async function handleConfirm() {
    if (!jobType || !vehicle) return;
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
          notes,
          paymentMethod,
          distanceKm: estimateDistance(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Booking failed');
      setBookingRef(data.ref);
      setQuoteTotal(data.quote.total);
      goToStep(5);
    } catch (err) {
      console.error('Booking error:', err);
      alert('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  /* Computed values for step 4 */
  const quote = vehicle ? calculateQuote(vehicle, estimateDistance()) : null;
  const vehicleLabel = vehicle ? PRICING_TABLE[vehicle].label : '';
  const jobLabel = jobType ? JOB_NAMES[jobType] : '';

  /* Validation per step */
  const canGoStep2 = !!jobType;
  const canGoStep3 = !!vehicle;
  const canGoStep4 = pickup.trim() !== '' && dropoff.trim() !== '' && bookingDate !== '' && bookingTime !== '' && fullName.trim() !== '' && phone.trim() !== '';

  /* Step state helpers */
  function stepClass(i: number) {
    const classes = [s.stepperStep];
    if (i === step) classes.push(s.stepperStepActive);
    if (i < step) classes.push(s.stepperStepDone);
    return classes.join(' ');
  }

  function lineClass(i: number) {
    const classes = [s.stepperLine];
    if (i < step) classes.push(s.stepperLineDone);
    return classes.join(' ');
  }

  return (
    <>
      {/* ── Nav ── */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <Link href="/" className={s.logo}>
            <Image src="/images/logo-dark.png" alt="CapeLoad Logistics" width={140} height={48} style={{ height: 48, width: 'auto' }} />
          </Link>
          <Link href="/" className={s.navBack}>
            <ArrowLeft />
            Back to home
          </Link>
        </div>
      </nav>

      {/* ── Main ── */}
      <div className={s.bookingLayout}>
        <div className={s.bookingHeader}>
          <h1>Book your load</h1>
          <p>Tell us what you need moved and get a quote in seconds</p>
        </div>

        {/* ── Stepper ── */}
        <div className={s.stepper}>
          {STEP_LABELS.map((label, i) => (
            <div key={i}>
              {i > 0 && <span className={lineClass(i)} />}
              <div className={stepClass(i + 1)} style={{ display: 'inline-flex' }}>
                <div className={s.stepperNum}>
                  {i + 1 < step ? <CheckIcon /> : i + 1}
                </div>
                <span className={s.stepperLabel}>{label}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ═══ STEP 1: JOB TYPE ═══ */}
        <div className={`${s.stepPanel} ${step === 1 ? s.stepPanelActive : ''}`}>
          <div className={s.card}>
            <div className={s.cardTitle}>What do you need?</div>
            <div className={s.jobTypes}>
              {(['move', 'courier', 'haul'] as JobType[]).map((jt) => (
                <div
                  key={jt}
                  className={`${s.jobType} ${jobType === jt ? s.jobTypeSelected : ''}`}
                  onClick={() => setJobType(jt)}
                >
                  {jobType === jt && (
                    <div className={s.checkMark}><CheckIcon /></div>
                  )}
                  <div className={s.jobTypeIcon}>{JOB_ICONS[jt]}</div>
                  <h3>{JOB_NAMES[jt]}</h3>
                  <p>
                    {jt === 'move' && 'House, office or furniture'}
                    {jt === 'courier' && 'Parcels & packages'}
                    {jt === 'haul' && 'Construction, bulk & industrial'}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className={s.stepNav}>
            <div />
            <button
              className={`${s.btnPrimary} ${!canGoStep2 ? s.btnDisabled : ''}`}
              disabled={!canGoStep2}
              onClick={() => goToStep(2)}
            >
              Next: Choose vehicle
              <ArrowRight />
            </button>
          </div>
        </div>

        {/* ═══ STEP 2: VEHICLE ═══ */}
        <div className={`${s.stepPanel} ${step === 2 ? s.stepPanelActive : ''}`}>
          <div className={s.card}>
            <div className={s.cardTitle}>Choose your vehicle</div>
            {jobType && (
              <div className={s.vehicleSuggest}>
                <InfoIcon />
                <span dangerouslySetInnerHTML={{ __html: JOB_SUGGESTIONS[jobType] }} />
              </div>
            )}
            <div className={s.vehiclesGrid}>
              {VEHICLE_TYPES.map((vt) => {
                const p = PRICING_TABLE[vt];
                return (
                  <div
                    key={vt}
                    className={`${s.vehicleOption} ${vehicle === vt ? s.vehicleOptionSelected : ''}`}
                    onClick={() => setVehicle(vt)}
                  >
                    {vehicle === vt && (
                      <div className={s.vehicleCheckMark}><CheckIcon /></div>
                    )}
                    <div className={s.vehicleOptionIcon}>{VEHICLE_ICONS[vt]}</div>
                    <div className={s.vehicleOptionInfo}>
                      <h4>{p.label}</h4>
                      <p>{p.capacity}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className={s.stepNav}>
            <button className={s.btnSecondary} onClick={() => goToStep(1)}>
              <ArrowLeft />
              Back
            </button>
            <button
              className={`${s.btnPrimary} ${!canGoStep3 ? s.btnDisabled : ''}`}
              disabled={!canGoStep3}
              onClick={() => goToStep(3)}
            >
              Next: Route &amp; time
              <ArrowRight />
            </button>
          </div>
        </div>

        {/* ═══ STEP 3: DETAILS ═══ */}
        <div className={`${s.stepPanel} ${step === 3 ? s.stepPanelActive : ''}`}>
          <div className={s.card}>
            <div className={s.cardTitle}>Pickup &amp; drop-off</div>
            <div className={s.formGroup}>
              <label>Pickup address</label>
              <div className={s.inputWrapper}>
                <MapPinIcon />
                <input
                  type="text"
                  className={`${s.input} ${s.inputWithIcon}`}
                  placeholder="e.g. 12 Main Road, Claremont"
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                />
              </div>
            </div>
            <div className={s.formGroup}>
              <label>Drop-off address</label>
              <div className={s.inputWrapper}>
                <MapPinIcon />
                <input
                  type="text"
                  className={`${s.input} ${s.inputWithIcon}`}
                  placeholder="e.g. 5 Strand Street, CBD"
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                />
              </div>
            </div>
            <div className={s.formRow}>
              <div className={s.formGroup}>
                <label>Date</label>
                <div className={s.inputWrapper}>
                  <CalendarIcon />
                  <input
                    type="date"
                    className={`${s.input} ${s.inputWithIcon}`}
                    value={bookingDate}
                    onChange={(e) => setBookingDate(e.target.value)}
                  />
                </div>
              </div>
              <div className={s.formGroup}>
                <label>Time</label>
                <div className={s.inputWrapper}>
                  <ClockIcon />
                  <input
                    type="time"
                    className={`${s.input} ${s.inputWithIcon}`}
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}>Your details</div>
            <div className={s.formRow}>
              <div className={s.formGroup}>
                <label>Full name</label>
                <input
                  type="text"
                  className={s.input}
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className={s.formGroup}>
                <label>Phone (WhatsApp)</label>
                <div className={s.inputWrapper}>
                  <PhoneIcon />
                  <input
                    type="tel"
                    className={`${s.input} ${s.inputWithIcon}`}
                    placeholder="071 234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className={s.formGroup}>
              <label>Email (optional)</label>
              <input
                type="email"
                className={s.input}
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className={s.formGroup}>
              <label>Additional notes (optional)</label>
              <textarea
                className={s.textarea}
                placeholder="e.g. 3rd floor, no lift, fragile items..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className={s.stepNav}>
            <button className={s.btnSecondary} onClick={() => goToStep(2)}>
              <ArrowLeft />
              Back
            </button>
            <button
              className={`${s.btnPrimary} ${!canGoStep4 ? s.btnDisabled : ''}`}
              disabled={!canGoStep4}
              onClick={handleGenerateQuote}
            >
              Get my quote
              <ArrowRight />
            </button>
          </div>
        </div>

        {/* ═══ STEP 4: QUOTE ═══ */}
        <div className={`${s.stepPanel} ${step === 4 ? s.stepPanelActive : ''}`}>
          <div className={s.quoteBox}>
            <div className={s.quoteLabel}>Your estimated quote</div>
            <div className={s.quotePrice}>
              <span className={s.quotePricePrefix}>R</span>
              {quoteTotal.toLocaleString()}
            </div>
            <div className={s.quoteNote}>All-inclusive, no hidden fees</div>
            {quote && (
              <div className={s.quoteBreakdown}>
                <div className={s.quoteRow}>
                  <span className={s.quoteRowLabel}>Job type</span>
                  <span className={s.quoteRowValue}>{jobLabel}</span>
                </div>
                <div className={s.quoteRow}>
                  <span className={s.quoteRowLabel}>Vehicle</span>
                  <span className={s.quoteRowValue}>{vehicleLabel}</span>
                </div>
                <div className={s.quoteRow}>
                  <span className={s.quoteRowLabel}>Route</span>
                  <span className={s.quoteRowValue}>{pickup} &#8594; {dropoff}</span>
                </div>
                <div className={s.quoteRow}>
                  <span className={s.quoteRowLabel}>Date &amp; time</span>
                  <span className={s.quoteRowValue}>{bookingDate} at {bookingTime}</span>
                </div>
                <div className={s.quoteRow}>
                  <span className={s.quoteRowLabel}>Base fare</span>
                  <span className={s.quoteRowValue}>R{quote.base}</span>
                </div>
                <div className={s.quoteRow}>
                  <span className={s.quoteRowLabel}>Distance est.</span>
                  <span className={s.quoteRowValue}>{Math.round(quote.distanceKm)} km</span>
                </div>
                <div className={`${s.quoteRow} ${s.quoteRowTotal}`}>
                  <span className={s.quoteRowLabel}>Total</span>
                  <span className={s.quoteRowValue}>R{quote.total.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          <div className={s.card}>
            <div className={s.cardTitle}>Payment method</div>
            <div className={s.paymentGrid}>
              {PAYMENT_METHODS.map((pm) => (
                <div
                  key={pm.value}
                  className={`${s.paymentOption} ${paymentMethod === pm.value ? s.paymentOptionSelected : ''}`}
                  onClick={() => setPaymentMethod(pm.value)}
                >
                  <div className={s.paymentIcon}>{pm.icon}</div>
                  <h4>{pm.label}</h4>
                  <p>{pm.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={s.stepNav}>
            <button className={s.btnSecondary} onClick={() => goToStep(3)}>
              <ArrowLeft />
              Back
            </button>
            <button
              className={s.btnPrimary}
              disabled={submitting}
              onClick={handleConfirm}
            >
              {submitting ? <><div className={s.spinner} /> Confirming...</> : <>Confirm booking <ArrowRight /></>}
            </button>
          </div>
        </div>

        {/* ═══ STEP 5: CONFIRMATION ═══ */}
        <div className={`${s.stepPanel} ${step === 5 ? s.stepPanelActive : ''}`}>
          <div className={s.card}>
            <div className={s.confirmation}>
              <div className={s.confirmationIcon}>
                <ConfirmCheckIcon />
              </div>
              <h2>Booking confirmed!</h2>
              <p>Your booking has been received and a driver will be assigned shortly.</p>
              <div className={s.refNum}>{bookingRef}</div>
              <p>We&apos;ll send updates to your WhatsApp at <strong>{phone}</strong></p>
              <div className={s.confirmationActions}>
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
        </div>
      </div>
    </>
  );
}
