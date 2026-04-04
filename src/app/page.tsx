import Image from 'next/image';
import Link from 'next/link';
import styles from './page.module.css';
import MarketingNav from '@/components/layout/MarketingNav';
import ScrollReveal from '@/components/layout/ScrollReveal';

export default function Home() {
  return (
    <div data-theme="dark">
      <MarketingNav />

      {/* ═══════════ HERO ═══════════ */}
      <section className={styles.hero}>
        <div className={`container ${styles.heroInner}`}>
          <ScrollReveal className={styles.heroContent} direction="left">
            <div className={styles.heroBadge}>
              <span className={styles.dot} />
              Now serving the Western Cape
            </div>
            <h1>Your load, <span className={styles.highlight}>our road.</span></h1>
            <p>From a single parcel to a full house move — CapeLoad connects you with verified drivers and the right vehicle for every job. Get an instant quote in under 60 seconds.</p>
            <div className={styles.heroButtons}>
              <Link href="/booking" className={`${styles.btn} ${styles.btnPrimary}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Book a Load
              </Link>
              <Link href="/driver-signup" className={`${styles.btn} ${styles.btnSecondary}`}>Register Your Vehicle</Link>
            </div>
            <div className={styles.heroStats}>
              <div>
                <div className={styles.heroStatValue}>6+</div>
                <div className={styles.heroStatLabel}>Vehicle types</div>
              </div>
              <div>
                <div className={styles.heroStatValue}>60s</div>
                <div className={styles.heroStatLabel}>Instant quotes</div>
              </div>
              <div>
                <div className={styles.heroStatValue}>24/7</div>
                <div className={styles.heroStatLabel}>WhatsApp support</div>
              </div>
            </div>
          </ScrollReveal>
          <ScrollReveal className={styles.heroVisual} direction="right">
            <div className={styles.heroImageGrid}>
              <Image
                src="/images/4-ton.png"
                alt="4-Ton delivery truck"
                width={600}
                height={800}
              />
              <Image
                src="/images/bakkie.png"
                alt="Bakkie for small loads"
                width={400}
                height={380}
              />
              <Image
                src="/images/panel-van.png"
                alt="Panel van for furniture"
                width={400}
                height={380}
              />
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ VEHICLES ═══════════ */}
      <section className={styles.vehicles} id="vehicles">
        <div className="container">
          <ScrollReveal className={styles.vehiclesHeader}>
            <div className={styles.sectionLabel}>Our Fleet</div>
            <h2 className={styles.sectionTitle}>The right vehicle for every load</h2>
            <p className={styles.sectionSubtitle}>Whether it&apos;s a small courier run or a full industrial haul, we&apos;ve got you covered with owner-registered, verified vehicles.</p>
          </ScrollReveal>
          <div className={styles.vehiclesGrid}>
            {/* Motorbike */}
            <ScrollReveal className={styles.vehicleCard} delay={0.1}>
              <Image
                className={styles.vehicleImg}
                src="/images/bakkie.png"
                alt="Motorbike courier"
                width={400}
                height={240}
                loading="lazy"
              />
              <h3>Motorbike</h3>
              <p>Courier runs &amp; small parcels</p>
              <span className={styles.capacity}>Up to 30 kg</span>
            </ScrollReveal>
            {/* Bakkie / LDV */}
            <ScrollReveal className={styles.vehicleCard} delay={0.2}>
              <Image
                className={styles.vehicleImg}
                src="/images/bakkie.png"
                alt="Bakkie pickup truck"
                width={400}
                height={240}
              />
              <h3>Bakkie / LDV</h3>
              <p>Small loads &amp; quick trips</p>
              <span className={styles.capacity}>Up to 1 ton</span>
            </ScrollReveal>
            {/* Panel Van */}
            <ScrollReveal className={styles.vehicleCard} delay={0.3}>
              <Image
                className={styles.vehicleImg}
                src="/images/panel-van.png"
                alt="Panel van delivery"
                width={400}
                height={240}
              />
              <h3>Panel Van</h3>
              <p>Furniture, boxes &amp; goods</p>
              <span className={styles.capacity}>Up to 2 tons</span>
            </ScrollReveal>
            {/* 4-Ton Truck */}
            <ScrollReveal className={styles.vehicleCard} delay={0.4}>
              <Image
                className={styles.vehicleImg}
                src="/images/4-ton.png"
                alt="4-Ton truck"
                width={400}
                height={240}
              />
              <h3>4-Ton Truck</h3>
              <p>Medium hauls &amp; moves</p>
              <span className={styles.capacity}>Up to 4 tons</span>
            </ScrollReveal>
            {/* 8-Ton Truck */}
            <ScrollReveal className={styles.vehicleCard} delay={0.5}>
              <Image
                className={styles.vehicleImg}
                src="/images/8-ton.png"
                alt="8-Ton truck"
                width={400}
                height={240}
              />
              <h3>8-Ton Truck</h3>
              <p>Large hauls &amp; bulk loads</p>
              <span className={styles.capacity}>Up to 8 tons</span>
            </ScrollReveal>
            {/* Flatbed / Super */}
            <ScrollReveal className={styles.vehicleCard} delay={0.5}>
              <Image
                className={styles.vehicleImg}
                src="/images/8-ton.png"
                alt="Flatbed truck"
                width={400}
                height={240}
                loading="lazy"
              />
              <h3>Flatbed / Super</h3>
              <p>Industrial &amp; oversize loads</p>
              <span className={styles.capacity}>8+ tons</span>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className="container">
          <ScrollReveal className={styles.howHeader}>
            <div className={styles.sectionLabel}>How It Works</div>
            <h2 className={styles.sectionTitle}>Three steps to move your load</h2>
            <p className={styles.sectionSubtitle}>No call centres, no waiting around. Tell us what you need, get a quote, and we handle the rest.</p>
          </ScrollReveal>
          <div className={styles.steps}>
            <ScrollReveal className={styles.step} delay={0.1}>
              <div className={`${styles.stepNumber} ${styles.stepNumberOrange}`}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
              </div>
              <h3>Tell us your load</h3>
              <p>Choose your job type, select the right vehicle, and enter your pickup and drop-off locations.</p>
            </ScrollReveal>
            <ScrollReveal className={styles.step} delay={0.2}>
              <div className={`${styles.stepNumber} ${styles.stepNumberBlue}`}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
              </div>
              <h3>Get an instant quote</h3>
              <p>We calculate your price upfront in Rands. No hidden fees, no surprises. Pay via EFT, card, or Ozow.</p>
            </ScrollReveal>
            <ScrollReveal className={styles.step} delay={0.3}>
              <div className={`${styles.stepNumber} ${styles.stepNumberOrange}`}>
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
              </div>
              <h3>We dispatch &amp; deliver</h3>
              <p>A verified driver is assigned to your job. Track live via WhatsApp and get confirmation on delivery.</p>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ COVERAGE ═══════════ */}
      <section className={styles.coverage} id="coverage">
        <div className={`container ${styles.coverageInner}`}>
          <ScrollReveal className={styles.coverageContent} direction="left">
            <div className={styles.sectionLabel}>Coverage</div>
            <h2 className={styles.sectionTitle}>Western Cape &amp; expanding nationally</h2>
            <p className={styles.sectionSubtitle}>We started in Cape Town and are growing fast. Our network of owner-operators covers the entire Western Cape with national routes coming soon.</p>
            <div className={styles.coverageList}>
              <div className={styles.coverageItem}>
                <div className={styles.check}><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className={styles.coverageItemText}>
                  <h4>Cape Town Metro</h4>
                  <p>CBD, Northern &amp; Southern suburbs, Cape Flats, Helderberg</p>
                </div>
              </div>
              <div className={styles.coverageItem}>
                <div className={styles.check}><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className={styles.coverageItemText}>
                  <h4>Greater Western Cape</h4>
                  <p>Stellenbosch, Paarl, Worcester, Saldanha, Hermanus</p>
                </div>
              </div>
              <div className={styles.coverageItem}>
                <div className={styles.check}><svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg></div>
                <div className={styles.coverageItemText}>
                  <h4>National Routes</h4>
                  <p>Cape Town to JHB, Durban, PE &amp; Bloemfontein (coming soon)</p>
                </div>
              </div>
            </div>
            <Link href="/booking" className={`${styles.btn} ${styles.btnPrimary}`}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              Check Your Route
            </Link>
          </ScrollReveal>
          <ScrollReveal className={styles.coverageMap} direction="right">
            <Image
              src="/images/4-ton.png"
              alt="Cape Town aerial view"
              width={600}
              height={600}
              loading="lazy"
              style={{width:'100%',height:'100%',objectFit:'cover'}}
            />
            <div className={styles.coverageMapOverlay}>
              <div className={styles.mapLabel}>Western Cape</div>
              <div className={styles.mapSublabel}>Cape Town HQ</div>
              <div className={styles.mapRegions}>
                <span className={styles.mapRegionActive}>WC Live</span>
                <span className={styles.mapRegionSoon}>Gauteng Soon</span>
                <span className={styles.mapRegionSoon}>KZN Soon</span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══════════ CTA SPLIT ═══════════ */}
      <section className={styles.ctaSplit} id="get-started">
        <div className="container">
          <ScrollReveal className={styles.ctaHeader}>
            <div className={styles.sectionLabel}>Get Started</div>
            <h2 className={styles.sectionTitle}>Ready to move?</h2>
            <p className={styles.sectionSubtitle}>Whether you need a load moved or have a vehicle to put to work, CapeLoad is your platform.</p>
          </ScrollReveal>
          <div className={styles.ctaCards}>
            {/* Client CTA */}
            <ScrollReveal className={`${styles.ctaCard} ${styles.clientCta}`} delay={0.1}>
              <Image
                src="/images/panel-van.png"
                alt="Delivery in progress"
                width={600}
                height={200}
                loading="lazy"
                className={styles.ctaCardImg}
              />
              <h3>Book a Load</h3>
              <p>Need something moved? Get an instant quote and have a verified driver at your door — same day or scheduled.</p>
              <ul>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Instant upfront pricing in Rands
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Verified drivers with rated vehicles
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Live WhatsApp tracking updates
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Pay via EFT, card, or Ozow
                </li>
              </ul>
              <Link href="/booking" className={`${styles.btn} ${styles.btnBlue}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Get a Quote Now
              </Link>
            </ScrollReveal>
            {/* Driver CTA */}
            <ScrollReveal className={`${styles.ctaCard} ${styles.driverCta}`} delay={0.2}>
              <Image
                src="/images/8-ton.png"
                alt="Truck fleet"
                width={600}
                height={200}
                loading="lazy"
                className={styles.ctaCardImg}
              />
              <h3>Register Your Vehicle</h3>
              <p>Own a bakkie, van, or truck? Put it to work and earn. Join our fleet of verified owner-operators.</p>
              <ul>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Set your own availability
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Get job alerts via WhatsApp
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Weekly payouts to your account
                </li>
                <li>
                  <svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                  Free to register — earn per job
                </li>
              </ul>
              <Link href="/driver-signup" className={`${styles.btn} ${styles.btnPrimary}`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                Join the Fleet
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══════════ FOOTER ═══════════ */}
      <footer className={styles.footer}>
        <div className="container">
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <div className={styles.footerBrandLogo}>
                <Image
                  src="/images/logo-light.png"
                  alt="CapeLoad Logistics"
                  width={160}
                  height={48}
                  style={{height:48,width:'auto'}}
                />
              </div>
              <p>Your load, our road. From bikes to trucks, we move across the Western Cape and beyond. Built by Axious Creative.</p>
            </div>
            <div className={styles.footerCol}>
              <h4>Platform</h4>
              <Link href="/booking">Book a Load</Link>
              <Link href="/driver-signup">Register Vehicle</Link>
              <Link href="/auth/login?redirect=/portal/client">Client Login</Link>
              <Link href="/auth/login?redirect=/portal/driver">Driver Login</Link>
              <Link href="/auth/login?redirect=/portal/admin">Admin</Link>
            </div>
            <div className={styles.footerCol}>
              <h4>Company</h4>
              <a href="#how-it-works">How it Works</a>
              <a href="#vehicles">Our Fleet</a>
              <a href="#coverage">Coverage Areas</a>
              <a href="#">About Us</a>
            </div>
            <div className={styles.footerCol}>
              <h4>Support</h4>
              <a href="#">WhatsApp Us</a>
              <a href="mailto:hello@capeload.co.za">hello@capeload.co.za</a>
              <a href="#">Terms of Service</a>
              <a href="#">Privacy Policy</a>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>&copy; 2026 CapeLoad Logistics. Cape Town, Western Cape.</span>
            <div className={styles.footerSocials}>
              {/* Facebook */}
              <a href="#" aria-label="Facebook">
                <svg viewBox="0 0 24 24"><path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/></svg>
              </a>
              {/* Instagram */}
              <a href="#" aria-label="Instagram">
                <svg viewBox="0 0 24 24"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5"/></svg>
              </a>
              {/* WhatsApp */}
              <a href="#" aria-label="WhatsApp">
                <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.477 2 2 6.477 2 12c0 1.89.525 3.66 1.438 5.168L2 22l4.832-1.438A9.955 9.955 0 0012 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/></svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
