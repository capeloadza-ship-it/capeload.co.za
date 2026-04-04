export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get('code');
  const redirect = searchParams.get('redirect') || '/';

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/login?error=no_code`);
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('Auth callback error:', error);
    return NextResponse.redirect(`${origin}/auth/login?error=auth_failed`);
  }

  /* Check user role to determine redirect */
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    // Smart redirect based on role
    if (profile?.role === 'super_admin' || profile?.role === 'admin') {
      return NextResponse.redirect(`${origin}/portal/admin`);
    }
    if (profile?.role === 'driver') {
      return NextResponse.redirect(`${origin}/portal/driver`);
    }
    // All other authenticated users (client, guest) go to client portal
    if (redirect === '/' || redirect === '') {
      return NextResponse.redirect(`${origin}/portal/client`);
    }
  }

  /* Redirect to the requested page */
  const target = redirect.startsWith('/') ? `${origin}${redirect}` : redirect;
  return NextResponse.redirect(target);
}
