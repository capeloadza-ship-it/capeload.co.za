'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './MarketingNav.module.css';

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleScroll = useCallback(() => {
    setScrolled(window.scrollY > 50);
  }, []);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  const closeMobile = () => setMobileOpen(false);

  const navClass = `${styles.nav}${scrolled ? ` ${styles.navScrolled}` : ''}`;

  return (
    <>
      <nav className={navClass}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.logo}>
            <Image
              src="/images/logo-light.png"
              alt="CapeLoad Logistics"
              width={640}
              height={192}
              className={styles.logoImg}
              priority
            />
          </Link>
          <div className={styles.navLinks}>
            <a href="#vehicles" className={styles.navLink}>Vehicles</a>
            <a href="#how-it-works" className={styles.navLink}>How it works</a>
            <a href="#coverage" className={styles.navLink}>Coverage</a>
            <a href="#get-started" className={styles.navLink}>Get started</a>
            <div className={styles.navDivider} />
            <Link href="/booking" className={styles.navCta}>Get a Quote</Link>
          </div>
          <button
            className={styles.mobileToggle}
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
          >
            <span className={styles.mobileToggleBar} />
            <span className={styles.mobileToggleBar} />
            <span className={styles.mobileToggleBar} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div className={`${styles.mobileMenu}${mobileOpen ? ` ${styles.mobileMenuActive}` : ''}`}>
        <a href="#vehicles" className={styles.mobileMenuLink} onClick={closeMobile}>Vehicles</a>
        <a href="#how-it-works" className={styles.mobileMenuLink} onClick={closeMobile}>How it works</a>
        <a href="#coverage" className={styles.mobileMenuLink} onClick={closeMobile}>Coverage</a>
        <a href="#get-started" className={styles.mobileMenuLink} onClick={closeMobile}>Get started</a>
        <Link href="/booking" className={styles.mobileMenuBtn} onClick={closeMobile}>Get a Quote</Link>
      </div>
    </>
  );
}
