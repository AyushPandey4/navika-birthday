import { NextResponse } from 'next/server';
import { signAdminToken, COOKIE_NAME } from '@/lib/auth';

export async function POST(req) {
  try {
    const { username, password } = await req.json();

    const expectedUser = process.env.ADMIN_USERNAME || 'admin';
    const expectedPass = process.env.ADMIN_PASSWORD;

    if (!expectedPass) {
      return NextResponse.json(
        { success: false, error: 'ADMIN_PASSWORD is not configured' },
        { status: 500 }
      );
    }

    if (username === expectedUser && password === expectedPass) {
      const token = await signAdminToken(username);
      const response = NextResponse.json({ success: true, username });

      response.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: false, // allows localhost HTTP as well as HTTPS
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 // 1 day
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid username or password' },
      { status: 401 }
    );
  } catch (err) {
    console.error('[Admin Login Error]', err);
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}
