import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';

export async function GET() {
  const session = await verifyAdminSession();
  if (session) {
    return NextResponse.json({ authenticated: true, username: session.username });
  }
  return NextResponse.json({ authenticated: false });
}
