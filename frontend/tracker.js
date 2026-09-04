/**
 * CHATPATI — Private Analytics & Interaction Tracker
 * Minimal, non-invasive, privacy-respecting client analytics
 */

(function () {
  'use strict';

  // Storage keys
  const KEY_SESSION = 'chatpati_sess_id';
  const KEY_TOKEN = 'chatpati_gift_token';
  const KEY_GIFT_OPENED = 'chatpati_gift_opened';
  const KEY_SECTIONS = 'chatpati_sections_viewed';
  const KEY_PHOTOS = 'chatpati_photos_opened';

  /**
   * Generates or retrieves an anonymous, random session ID for the current browser session.
   */
  function getSessionId() {
    let sid = sessionStorage.getItem(KEY_SESSION);
    if (!sid) {
      sid = 'sess_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      sessionStorage.setItem(KEY_SESSION, sid);
    }
    return sid;
  }

  /**
   * Retrieves or captures an optional private recipient token from the URL (e.g. ?gift=xxxxx)
   */
  function getRecipientToken() {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const giftParam = urlParams.get('gift');
      if (giftParam) {
        sessionStorage.setItem(KEY_TOKEN, giftParam);
        return giftParam;
      }
    } catch (e) {
      // ignore
    }
    return sessionStorage.getItem(KEY_TOKEN) || null;
  }

  // Client-side deduplication sets
  let recordedSections = new Set();
  try {
    const savedSecs = JSON.parse(sessionStorage.getItem(KEY_SECTIONS) || '[]');
    recordedSections = new Set(savedSecs);
  } catch (e) {
    recordedSections = new Set();
  }

  let recordedPhotos = new Set();
  try {
    const savedPhotos = JSON.parse(sessionStorage.getItem(KEY_PHOTOS) || '[]');
    recordedPhotos = new Set(savedPhotos);
  } catch (e) {
    recordedPhotos = new Set();
  }

  let giftOpenedRecorded = sessionStorage.getItem(KEY_GIFT_OPENED) === 'true';

  /**
   * Core tracking function.
   * Dispatches event to /api/events with graceful error fallback.
   *
   * @param {string} eventType - One of allowed event types
   * @param {object} metadata - Custom metadata for event
   */
  function trackEvent(eventType, metadata = {}) {
    if (!eventType || typeof eventType !== 'string') return;

    // 1. Client-side Deduplication
    if (eventType === 'gift_opened') {
      if (giftOpenedRecorded) return;
      giftOpenedRecorded = true;
      try { sessionStorage.setItem(KEY_GIFT_OPENED, 'true'); } catch (e) {}
    }

    if (eventType === 'section_viewed' && metadata.sectionId) {
      if (recordedSections.has(metadata.sectionId)) return;
      recordedSections.add(metadata.sectionId);
      try {
        sessionStorage.setItem(KEY_SECTIONS, JSON.stringify([...recordedSections]));
      } catch (e) {}
    }

    if (eventType === 'photo_opened' && metadata.photoId) {
      if (recordedPhotos.has(metadata.photoId)) return;
      recordedPhotos.add(metadata.photoId);
      try {
        sessionStorage.setItem(KEY_PHOTOS, JSON.stringify([...recordedPhotos]));
      } catch (e) {}
    }

    const payload = {
      eventType,
      sessionId: getSessionId(),
      recipientToken: getRecipientToken(),
      metadata: metadata || {},
      timestamp: new Date().toISOString()
    };

    // 2. Safe, non-blocking network delivery
    try {
      const isLocalDiffPort = typeof window !== 'undefined' && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
        window.location.port && 
        window.location.port !== '5000';
      const endpoint = isLocalDiffPort ? 'http://localhost:5000/api/events' : '/api/events';

      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {
        // Silently handle offline / network issue without disrupting user experience
      });
    } catch (err) {
      // Silently handle any browser fetch exception
    }
  }

  // Expose globally for application scripts
  window.trackEvent = trackEvent;
  window.getTrackingSessionId = getSessionId;

  /**
   * Initialize delegated button clicks for elements with data-track
   */
  function initButtonTracking() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-track]');
      if (!btn) return;
      const buttonId = btn.getAttribute('data-track');
      if (buttonId) {
        trackEvent('button_clicked', { buttonId });
      }
    }, true);
  }

  /**
   * Initialize IntersectionObserver to track visible sections
   */
  function initSectionTracking() {
    if (!('IntersectionObserver' in window)) return;

    const sections = document.querySelectorAll('[data-section]');
    if (!sections.length) return;

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const sectionId = entry.target.getAttribute('data-section');
            if (sectionId) {
              trackEvent('section_viewed', { sectionId });
            }
          }
        });
      },
      {
        threshold: 0.35,
        rootMargin: '0px 0px -40px 0px'
      }
    );

    sections.forEach((sec) => sectionObserver.observe(sec));
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      trackEvent('page_view', { page: 'birthday-home' });
      initButtonTracking();
      initSectionTracking();
    });
  } else {
    trackEvent('page_view', { page: 'birthday-home' });
    initButtonTracking();
    initSectionTracking();
  }
})();
