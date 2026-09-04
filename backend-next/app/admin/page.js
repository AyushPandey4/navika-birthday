'use client';

import { useState, useEffect, useCallback } from 'react';

export default function AdminDashboardPage() {
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginUsername, setLoginUsername] = useState('admin');
  const [loginPassword, setLoginPassword] = useState('');

  // Data states
  const [overview, setOverview] = useState(null);
  const [photosData, setPhotosData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [buttons, setButtons] = useState([]);
  const [sections, setSections] = useState([]);
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState('all');
  const [autoRefreshMs, setAutoRefreshMs] = useState(30000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal inspection
  const [activeSessionDetail, setActiveSessionDetail] = useState(null);
  const [modalLoading, setModalLoading] = useState(false);

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatTimeOnly = (isoStr) => {
    if (!isoStr) return '—';
    return new Date(isoStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // 1. Auth check
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/me');
      const data = await res.json();
      if (data.authenticated) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  // 2. Load all dashboard metrics
  const fetchDashboardData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [ovRes, phRes, sesRes, btnRes, secRes, evRes] = await Promise.all([
        fetch('/api/admin/overview'),
        fetch('/api/admin/photos'),
        fetch('/api/admin/sessions'),
        fetch('/api/admin/buttons'),
        fetch('/api/admin/sections'),
        fetch(`/api/admin/events?filter=${filter}`)
      ]);

      if (ovRes.status === 401) {
        setIsAuthenticated(false);
        return;
      }

      const [ov, ph, ses, btn, sec, ev] = await Promise.all([
        ovRes.json(),
        phRes.json(),
        sesRes.json(),
        btnRes.json(),
        secRes.json(),
        evRes.json()
      ]);

      if (ov.success) setOverview(ov);
      if (ph.success) setPhotosData(ph);
      if (ses.success) setSessions(ses.sessions || []);
      if (btn.success) setButtons(btn.buttons || []);
      if (sec.success) setSections(sec.sections || []);
      if (ev.success) setEvents(ev.events || []);
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDashboardData();
    }
  }, [isAuthenticated, fetchDashboardData]);

  // Auto-refresh timer
  useEffect(() => {
    if (!isAuthenticated || autoRefreshMs <= 0) return;
    const interval = setInterval(() => {
      fetchDashboardData();
    }, autoRefreshMs);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoRefreshMs, fetchDashboardData]);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch {
      setLoginError('Server connection failed');
    }
  };

  // Logout handler
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setIsAuthenticated(false);
  };

  // Session Inspect modal
  const inspectSession = async (sessionId) => {
    setModalLoading(true);
    setActiveSessionDetail({ sessionId, loading: true });
    try {
      const res = await fetch(`/api/admin/sessions/${sessionId}`);
      const data = await res.json();
      if (data.success) {
        setActiveSessionDetail(data);
      }
    } catch (e) {
      console.error('Error inspecting session:', e);
    } finally {
      setModalLoading(false);
    }
  };

  if (authChecking) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#9ca3af' }}>
        Loading tracker...
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: LOGIN FORM
  // ─────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem', background: '#0c0d10' }}>
        <div style={{ width: '100%', maxWidth: 390, background: '#15171e', border: '1px solid #242834', borderRadius: 12, padding: '2.5rem 2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#e05c2a', background: 'rgba(224,92,42,0.18)', padding: '0.25rem 0.65rem', borderRadius: 999 }}>
            Next.js Private Backend
          </span>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: '0.85rem 0 0.25rem' }}>Navika Tracker</h1>
          <p style={{ fontSize: '0.85rem', color: '#9ca3af', marginBottom: '1.75rem' }}>
            Sign in with admin credentials from your <code>.env</code> file.
          </p>

          {loginError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fca5a5', padding: '0.65rem', borderRadius: 6, fontSize: '0.82rem', marginBottom: '1rem' }}>
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: '1.15rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.4rem' }}>Username</label>
              <input
                type="text"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                required
                style={{ width: '100%', background: '#101217', border: '1px solid #242834', borderRadius: 6, padding: '0.65rem 0.85rem', color: '#f3f4f6', fontSize: '0.92rem', outline: 'none' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#9ca3af', marginBottom: '0.4rem' }}>Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                placeholder="••••••••"
                style={{ width: '100%', background: '#101217', border: '1px solid #242834', borderRadius: 6, padding: '0.65rem 0.85rem', color: '#f3f4f6', fontSize: '0.92rem', outline: 'none' }}
              />
            </div>
            <button
              type="submit"
              style={{ width: '100%', background: '#e05c2a', color: '#fff', border: 'none', borderRadius: 6, padding: '0.75rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer' }}
            >
              Sign In to Dashboard &rarr;
            </button>
          </form>
        </div>
      </div>
    );
  }

  const status = overview?.status;
  const stats = overview?.stats;
  const journey = overview?.journey || [];

  // ─────────────────────────────────────────────────────────────
  // RENDER: DASHBOARD VIEW
  // ─────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0c0d10' }}>
      
      {/* Top Header */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 1.75rem', borderBottom: '1px solid #242834', background: '#0f1117', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>🎁 Navika Birthday Tracker</h1>
          <span style={{ fontSize: '0.68rem', background: '#242834', color: '#9ca3af', padding: '0.2rem 0.5rem', borderRadius: 4, fontFamily: 'monospace' }}>
            Next.js App Router
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <select
            value={autoRefreshMs}
            onChange={(e) => setAutoRefreshMs(Number(e.target.value))}
            style={{ background: '#15171e', border: '1px solid #242834', color: '#9ca3af', fontSize: '0.8rem', padding: '0.45rem 0.6rem', borderRadius: 6, outline: 'none' }}
          >
            <option value={0}>Auto-refresh: Off</option>
            <option value={15000}>Auto-refresh: 15s</option>
            <option value={30000}>Auto-refresh: 30s</option>
            <option value={60000}>Auto-refresh: 1m</option>
          </select>

          <button
            onClick={() => fetchDashboardData()}
            disabled={isRefreshing}
            style={{ background: '#15171e', border: '1px solid #242834', color: '#f3f4f6', padding: '0.45rem 0.85rem', borderRadius: 6, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>{isRefreshing ? '⏳' : '🔄'}</span> Refresh
          </button>

          <button
            onClick={handleLogout}
            style={{ background: '#15171e', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#f87171', padding: '0.45rem 0.85rem', borderRadius: 6, fontSize: '0.82rem', fontWeight: 500, cursor: 'pointer' }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Body */}
      <main style={{ maxWidth: 1260, margin: '0 auto', width: '100%', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        
        {/* 1. The Big Verdict Banner */}
        <section
          style={{
            background: status?.code === 'gift_opened'
              ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, #15171e 60%)'
              : status?.code === 'visited'
              ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, #15171e 60%)'
              : '#15171e',
            border: `1px solid ${status?.code === 'gift_opened' ? 'rgba(16, 185, 129, 0.4)' : status?.code === 'visited' ? 'rgba(245, 158, 11, 0.4)' : '#242834'}`,
            borderRadius: 12,
            padding: '1.5rem 1.75rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: status?.code === 'gift_opened' ? '#10b981' : '#f3f4f6' }}>
              {status?.heading || '⏳ WAITING FOR VISIT'}
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#9ca3af', marginTop: '0.25rem' }}>
              {status?.subtext || 'The website has not recorded any activity yet.'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1.75rem', fontSize: '0.82rem' }}>
            <div>
              <div style={{ color: '#6b7280', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em' }}>First Visit</div>
              <div style={{ color: '#f3f4f6', fontWeight: 600, fontFamily: 'monospace', marginTop: '0.15rem' }}>{formatDate(status?.firstVisit)}</div>
            </div>
            <div>
              <div style={{ color: '#6b7280', textTransform: 'uppercase', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em' }}>Last Activity</div>
              <div style={{ color: '#f3f4f6', fontWeight: 600, fontFamily: 'monospace', marginTop: '0.15rem' }}>{formatDate(status?.lastActivity)}</div>
            </div>
          </div>
        </section>

        {/* 2. Key Metrics Grid */}
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              <span>Website Visits</span>
              <span>👀</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: '#38bdf8' }}>{stats?.pageViews || 0}</div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.4rem' }}>{stats?.uniqueSessions || 0} unique visitor sessions</p>
          </div>

          <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              <span>Gift Status</span>
              <span>🎁</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: status?.giftOpened ? '#10b981' : '#6b7280' }}>
              {status?.giftOpened ? 'YES' : 'NO'}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.4rem' }}>
              {status?.giftOpened ? `Opened: ${formatDate(status.giftOpenedAt)}` : 'Waiting for opening'}
            </p>
          </div>

          <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              <span>Interactions</span>
              <span>⚡</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: '#e05c2a' }}>{stats?.buttonsClicked || 0}</div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.4rem' }}>{stats?.sectionsViewed || 0} sections reached</p>
          </div>

          <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#9ca3af', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.65rem' }}>
              <span>Photos Explored</span>
              <span>📸</span>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 800, fontFamily: 'monospace', color: '#ec4899' }}>{stats?.photoEngagementRate || 0}%</div>
            <p style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '0.4rem' }}>{stats?.photosOpened || 0} of {stats?.totalPhotos || 9} photos opened</p>
          </div>
        </section>

        {/* 3. Visitor Journey Funnel */}
        <section>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>🚶‍♀️</span> Visitor Journey &amp; Milestones
          </h3>
          <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {journey.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 6,
                  background: m.completed ? 'rgba(16, 185, 129, 0.05)' : '#101217',
                  border: `1px solid ${m.completed ? 'rgba(16, 185, 129, 0.25)' : 'transparent'}`
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.88rem', fontWeight: 500 }}>
                  <span style={{ width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', background: m.completed ? '#10b981' : '#242834', color: m.completed ? '#fff' : '#6b7280', fontWeight: 'bold' }}>
                    {m.completed ? '✓' : idx + 1}
                  </span>
                  <span>{m.label}</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#6b7280', fontFamily: 'monospace' }}>
                  {m.completed ? formatDate(m.firstCompletedAt) : 'Pending'}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Photo Engagement Matrix */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🖼️</span> Photo Engagement Matrix
            </h3>
            <span style={{ fontSize: '0.72rem', fontWeight: 600, padding: '0.2rem 0.5rem', borderRadius: 4, fontFamily: 'monospace', background: (photosData?.summary?.photosOpened || 0) > 0 ? 'rgba(16, 185, 129, 0.16)' : '#242834', color: (photosData?.summary?.photosOpened || 0) > 0 ? '#10b981' : '#6b7280' }}>
              {photosData?.summary?.photosOpened || 0} / {photosData?.summary?.totalPhotos || 9} Opened ({photosData?.summary?.engagementRate || 0}%)
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {(photosData?.photos || []).map((p) => (
              <div
                key={p.id}
                style={{
                  background: '#15171e',
                  border: `1px solid ${p.opened ? 'rgba(16, 185, 129, 0.45)' : '#242834'}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column'
                }}
              >
                <div style={{ position: 'relative', width: '100%', height: 140, background: '#111' }}>
                  {/* Thumbnail */}
                  <img
                    src={`/${p.thumb}`}
                    alt={p.label}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={(e) => { e.currentTarget.src = '/assets/images/nav1.jpeg'; }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: 4,
                      background: p.opened ? '#10b981' : 'rgba(0, 0, 0, 0.75)',
                      color: p.opened ? '#fff' : '#9ca3af'
                    }}
                  >
                    {p.opened ? '✓ OPENED' : '✕ NOT OPENED'}
                  </span>
                </div>

                <div style={{ padding: '0.85rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700 }}>{p.label}</div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.35rem', fontFamily: 'monospace' }}>
                      Opened {p.openCount} times ({p.uniqueSessionsOpened} sessions)
                    </div>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                    {p.opened ? `First: ${formatTimeOnly(p.firstOpenedAt)}` : 'Never opened'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 5. Sessions Table */}
        <section>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>👥</span> Visitor Sessions
          </h3>
          <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#101217', color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.76rem', letterSpacing: '0.05em', borderBottom: '1px solid #242834' }}>
                  <th style={{ padding: '0.85rem 1rem' }}>Session ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Token</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Gift Opened</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Photos</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Events</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Started</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Last Active</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                      No visitor sessions recorded yet.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.sessionId} style={{ borderBottom: '1px solid #242834' }}>
                      <td style={{ padding: '0.85rem 1rem' }}><code style={{ color: '#38bdf8' }}>{s.sessionId}</code></td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {s.recipientToken ? <span style={{ background: 'rgba(16,185,129,0.16)', color: '#10b981', padding: '0.2rem 0.4rem', borderRadius: 4, fontSize: '0.72rem', fontFamily: 'monospace' }}>{s.recipientToken}</span> : <span style={{ color: '#6b7280' }}>None</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {s.giftOpened ? <span style={{ color: '#10b981', fontWeight: 700 }}>YES 🎁</span> : <span style={{ color: '#6b7280' }}>NO</span>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>{s.photosOpenedCount} / 9</td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{s.totalEvents}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#9ca3af' }}>{formatDate(s.startedAt)}</td>
                      <td style={{ padding: '0.85rem 1rem', color: '#9ca3af' }}>{formatDate(s.lastActiveAt)}</td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <button
                          onClick={() => inspectSession(s.sessionId)}
                          style={{ background: '#1c1f29', border: '1px solid #242834', color: '#f3f4f6', padding: '0.3rem 0.65rem', borderRadius: 5, fontSize: '0.76rem', cursor: 'pointer' }}
                        >
                          Inspect &rarr;
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 6. Buttons & Sections Activity */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          {/* Buttons */}
          <section>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🖱️</span> Button Activity
            </h3>
            <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#101217', color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.76rem', borderBottom: '1px solid #242834' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Button ID</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Clicks</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Last Clicked</th>
                  </tr>
                </thead>
                <tbody>
                  {buttons.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No button clicks recorded.</td></tr>
                  ) : (
                    buttons.map((b) => (
                      <tr key={b.buttonId} style={{ borderBottom: '1px solid #242834' }}>
                        <td style={{ padding: '0.75rem 1rem' }}><code style={{ color: '#e05c2a' }}>{b.buttonId}</code></td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{b.count}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>{formatDate(b.lastClickedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Sections */}
          <section>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📍</span> Sections Reached
            </h3>
            <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#101217', color: '#9ca3af', textTransform: 'uppercase', fontSize: '0.76rem', borderBottom: '1px solid #242834' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Section</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Views</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Last Viewed</th>
                  </tr>
                </thead>
                <tbody>
                  {sections.length === 0 ? (
                    <tr><td colSpan={3} style={{ padding: '1rem', textAlign: 'center', color: '#6b7280' }}>No section views recorded.</td></tr>
                  ) : (
                    sections.map((sec) => (
                      <tr key={sec.sectionId} style={{ borderBottom: '1px solid #242834' }}>
                        <td style={{ padding: '0.75rem 1rem' }}><code style={{ color: '#c084fc' }}>{sec.sectionId}</code></td>
                        <td style={{ padding: '0.75rem 1rem', fontWeight: 700 }}>{sec.count}</td>
                        <td style={{ padding: '0.75rem 1rem', color: '#9ca3af' }}>{formatDate(sec.lastViewedAt)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* 7. Chronological Event Feed */}
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>📜</span> Chronological Event Log
            </h3>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['all', 'page_views', 'gift', 'buttons', 'sections', 'photos'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setFilter(tab)}
                  style={{
                    background: filter === tab ? '#e05c2a' : '#15171e',
                    border: `1px solid ${filter === tab ? '#e05c2a' : '#242834'}`,
                    color: filter === tab ? '#fff' : '#9ca3af',
                    padding: '0.35rem 0.75rem',
                    borderRadius: 6,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    fontWeight: 500,
                    textTransform: 'capitalize'
                  }}
                >
                  {tab.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 10, maxHeight: 480, overflowY: 'auto' }}>
            {events.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: '#6b7280' }}>
                No events recorded for this filter.
              </div>
            ) : (
              events.map((e) => (
                <div key={e._id} style={{ display: 'flex', alignItems: 'flex-start', padding: '0.75rem 1rem', borderBottom: '1px solid #242834', fontSize: '0.82rem', gap: '1rem' }}>
                  <span style={{ fontFamily: 'monospace', color: '#6b7280', fontSize: '0.76rem', minWidth: 75 }}>
                    {formatTimeOnly(e.timestamp)}
                  </span>
                  <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', padding: '0.15rem 0.5rem', borderRadius: 4, fontFamily: 'monospace', background: 'rgba(255,255,255,0.08)', color: '#f3f4f6' }}>
                    {e.eventType.replace('_', ' ')}
                  </span>
                  <div style={{ flex: 1, color: '#9ca3af' }}>
                    <div>{JSON.stringify(e.metadata || {})}</div>
                    <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: '#6b7280', marginTop: '0.15rem' }}>
                      Session: {e.sessionId} {e.recipientToken ? `· Token: ${e.recipientToken}` : ''}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </main>

      {/* 8. Inspect Session Modal */}
      {activeSessionDetail && (
        <div
          onClick={() => setActiveSessionDetail(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1.5rem' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#15171e', border: '1px solid #242834', borderRadius: 12, width: '100%', maxWidth: 650, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.8)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #242834' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>Session: {activeSessionDetail.sessionId}</h3>
              <button
                onClick={() => setActiveSessionDetail(null)}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {modalLoading ? (
                <div style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>Loading session details...</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', background: '#101217', padding: '0.85rem', borderRadius: 6, marginBottom: '1.25rem', fontSize: '0.82rem' }}>
                    <div><span style={{ color: '#6b7280' }}>Started:</span><br /><strong>{formatTimeOnly(activeSessionDetail.startedAt)}</strong></div>
                    <div><span style={{ color: '#6b7280' }}>Last Active:</span><br /><strong>{formatTimeOnly(activeSessionDetail.lastActiveAt)}</strong></div>
                    <div><span style={{ color: '#6b7280' }}>Duration:</span><br /><strong>{Math.floor((activeSessionDetail.durationSeconds || 0) / 60)}m {(activeSessionDetail.durationSeconds || 0) % 60}s</strong></div>
                    <div><span style={{ color: '#6b7280' }}>Events:</span><br /><strong>{activeSessionDetail.totalEvents}</strong></div>
                  </div>

                  <h4 style={{ fontSize: '0.92rem', marginBottom: '0.65rem', color: '#9ca3af' }}>Journey in this Session:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    {(activeSessionDetail.journeyChecklist || []).map((m, i) => (
                      <div
                        key={m.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '0.5rem 0.75rem',
                          borderRadius: 6,
                          background: m.completed ? 'rgba(16, 185, 129, 0.08)' : '#101217',
                          border: `1px solid ${m.completed ? 'rgba(16, 185, 129, 0.25)' : 'transparent'}`
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontSize: '0.84rem' }}>
                          <span style={{ width: 20, height: 20, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', background: m.completed ? '#10b981' : '#242834', color: m.completed ? '#fff' : '#6b7280', fontWeight: 'bold' }}>
                            {m.completed ? '✓' : i + 1}
                          </span>
                          <span>{m.label}</span>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                          {m.completed ? formatTimeOnly(m.timestamp) : 'Not reached'}
                        </span>
                      </div>
                    ))}
                  </div>

                  <h4 style={{ fontSize: '0.92rem', marginBottom: '0.65rem', color: '#9ca3af' }}>Session Event Stream:</h4>
                  <div style={{ background: '#101217', border: '1px solid #242834', borderRadius: 8, maxHeight: 250, overflowY: 'auto' }}>
                    {(activeSessionDetail.events || []).map((ev) => (
                      <div key={ev._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.85rem', borderBottom: '1px solid #1c1f29', fontSize: '0.78rem' }}>
                        <span style={{ color: '#6b7280', fontFamily: 'monospace', minWidth: 65 }}>{formatTimeOnly(ev.timestamp)}</span>
                        <span style={{ fontWeight: 600, color: '#f3f4f6' }}>{ev.eventType}</span>
                        <span style={{ color: '#9ca3af', fontFamily: 'monospace', fontSize: '0.72rem' }}>{JSON.stringify(ev.metadata)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
