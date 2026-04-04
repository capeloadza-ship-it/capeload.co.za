'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useUser } from '@/hooks/useUser';
import { createClient } from '@/lib/supabase/client';
import styles from './layout.module.css';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading } = useUser();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <nav className={styles.portalNav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.logo}>
            <Image src="/images/logo-dark.png" alt="CapeLoad Logistics" width={160} height={48} style={{ height: 48, width: 'auto' }} />
          </a>
          <div className={styles.navRight}>
            <span className={styles.navUser}>{profile?.full_name || 'User'}</span>
            <button className={styles.navLogout} onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </nav>
      {children}
    </>
  );
}
