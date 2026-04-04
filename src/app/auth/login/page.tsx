'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import s from './page.module.css';

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09A6.97 6.97 0 015.48 12c0-.72.13-1.43.36-2.09V7.07H2.18A11.97 11.97 0 001 12c0 1.94.46 3.77 1.18 5.07l3.66-2.98z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const redirect = searchParams.get('redirect') || '/';
  const isDriver = redirect.includes('driver');
  const isAdmin = redirect.includes('admin');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-redirect if already logged in
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        supabase.from('users').select('role').eq('id', user.id).single().then(({ data: profile }) => {
          if (profile?.role === 'super_admin' || profile?.role === 'admin' || user.email === 'capeload.za@gmail.com') {
            router.push('/portal/admin');
          } else if (profile?.role === 'driver') {
            router.push('/portal/driver');
          } else {
            router.push('/portal/client');
          }
        });
      }
    });
  }, [router]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function handleGoogleSignIn() {
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (authError) throw authError;
    } catch {
      setError('Failed to sign in with Google. Please try again.');
      setLoading(false);
    }
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const supabase = createClient();

      if (mode === 'signup') {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        // Email confirmation disabled — user is logged in immediately
        if (signUpData.user) {
          await new Promise(r => setTimeout(r, 500));
          router.push(redirect.startsWith('/portal') ? redirect : '/portal/client');
          return;
        }
        setSuccess('Account created! Redirecting...');
        setLoading(false);
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;

        // Always do role-based redirect
        await new Promise(r => setTimeout(r, 300));

        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', signInData.user.id)
          .single();

        if (profile?.role === 'super_admin' || profile?.role === 'admin' || signInData.user.email === 'capeload.za@gmail.com') {
          router.push('/portal/admin');
        } else if (profile?.role === 'driver') {
          router.push('/portal/driver');
        } else if (redirect && redirect !== '/' && redirect.startsWith('/portal')) {
          router.push(redirect);
        } else {
          router.push('/portal/client');
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
      setLoading(false);
    }
  }

  return (
    <div className={s.card}>
      <Link href="/" className={s.logo}>
        <Image src="/images/logo-dark.png" alt="CapeLoad" width={140} height={48} style={{ height: 48, width: 'auto' }} />
      </Link>

      <h1>{mode === 'signin'
        ? redirect.includes('driver') ? 'Driver Login' : redirect.includes('admin') ? 'Admin Login' : 'Client Login'
        : 'Create your account'
      }</h1>
      <p>{mode === 'signin'
        ? redirect.includes('driver') ? 'Access your fleet dashboard, jobs, and earnings.' : redirect.includes('admin') ? 'Admin access only.' : 'Track your bookings and manage deliveries.'
        : 'Get started with CapeLoad today.'
      }</p>

      <button
        className={s.googleBtn}
        onClick={handleGoogleSignIn}
        disabled={loading}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div className={s.divider}>or</div>

      {/* Only show Sign Up tab for client login — drivers register via /driver-signup, admins don't sign up */}
      {!isDriver && !isAdmin && (
        <div className={s.tabs}>
          <button className={`${s.tab} ${mode === 'signin' ? s.tabActive : ''}`} onClick={() => { setMode('signin'); setError(''); setSuccess(''); }}>Sign In</button>
          <button className={`${s.tab} ${mode === 'signup' ? s.tabActive : ''}`} onClick={() => { setMode('signup'); setError(''); setSuccess(''); }}>Sign Up</button>
        </div>
      )}

      <form onSubmit={handleEmailAuth}>
        <div className={s.formGroup}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required />
        </div>
        <div className={s.formGroup}>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required minLength={6} />
        </div>
        <button type="submit" className={s.submitBtn} disabled={loading}>
          {loading ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
        </button>
      </form>

      {error && <div className={s.error}>{error}</div>}
      {success && <div className={s.success}>{success}</div>}

      <div className={s.footer}>
        {isDriver ? (
          <>
            <Link href="/driver-signup" style={{ display: 'block', marginBottom: 8 }}>Register Your Vehicle</Link>
            <Link href="/">Back to home</Link>
          </>
        ) : (
          <Link href="/">Back to home</Link>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className={s.wrapper}>
      <Suspense fallback={<div className={s.card}><p>Loading...</p></div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
