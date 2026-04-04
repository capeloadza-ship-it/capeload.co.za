export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect');

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  // Always check user role for redirect — don't rely on redirect param for OAuth
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Small delay for RLS to apply after new user creation
    await new Promise(r => setTimeout(r, 300));

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Admin
    if (profile?.role === 'super_admin' || profile?.role === 'admin') {
      return NextResponse.redirect(`${origin}/portal/admin`);
    }
    // Fallback admin check by email
    if (user.email === 'capeload.za@gmail.com') {
      return NextResponse.redirect(`${origin}/portal/admin`);
    }
    // Driver
    if (profile?.role === 'driver') {
      return NextResponse.redirect(`${origin}/portal/driver`);
    }
    // If explicit redirect provided, use it
    if (redirect && redirect !== '/' && redirect !== '') {
      const target = redirect.startsWith('/') ? `${origin}${redirect}` : redirect;
      return NextResponse.redirect(target);
    }
    // Default: client portal
    return NextResponse.redirect(`${origin}/portal/client`);
  }

  // Fallback
  return NextResponse.redirect(`${origin}/portal/client`);
}
