import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'navika_chatpati_fallback_secret_2026_xyz'
);

export const COOKIE_NAME = 'admin_session_token';

/**
 * Creates a signed JWT token
 */
export async function signAdminToken(username) {
  return await new SignJWT({ username, role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET_KEY);
}

/**
 * Verifies admin session token from Next.js cookies
 */
export async function verifyAdminSession(req = null) {
  let token = null;

  if (req && req.cookies && typeof req.cookies.get === 'function') {
    token = req.cookies.get(COOKIE_NAME)?.value;
  }

  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch {
      // ignore
    }
  }

  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    return payload;
  } catch (err) {
    return null;
  }
}
