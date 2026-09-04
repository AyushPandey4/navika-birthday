/**
 * CHATPATI — Birthday Website for Navika
 * script.js  |  Complete — All sections
 */

'use strict';

/* ─────────────────────────────────────────────────────────────
   UTILS
   ───────────────────────────────────────────────────────────── */
const $ = (sel, ctx = document) => ctx.querySelector(sel);
const el = (id) => document.getElementById(id);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ─────────────────────────────────────────────────────────────
   AUDIO PLAYER
   Mobile-optimized autoplay:
     1. Tries immediate unmuted autoplay on load.
     2. Captures ANY touch, tap, swipe, or key anywhere on the screen
        to immediately unlock and play with sound without needing to
        click the music icon.
     3. Syncs seamlessly with the gift box opening tap.
     4. Music button toggles pause / resume.
   ───────────────────────────────────────────────────────────── */
class AudioPlayer {
  constructor(audioId, toggleId) {
    this.audio     = el(audioId);
    this.toggle    = el(toggleId);
    this.isPlaying = false;
    this._unlocked = false;
    if (!this.audio || !this.toggle) return;

    this.audio.volume = 0.45;
    this.audio.muted  = false;

    // 1. Try immediate unmuted autoplay
    this._tryAutoplay();

    // 2. Attach capture listeners for ANY touch/tap/click on mobile screen
    this._bindMobileGestures();

    // 3. Bind toggle button
    this._bindToggle();
  }

  _tryAutoplay() {
    this.audio.muted = false;
    const p = this.audio.play();
    if (p !== undefined) {
      p.then(() => {
        this.isPlaying = true;
        this._unlocked = true;
        this._setPlaying(true);
      }).catch(() => {
        // Mobile policy prevented unmuted autoplay without gesture;
        // it will start on the very first touch/tap on the screen.
        this._setPlaying(false);
      });
    }
  }

  unmuteAndPlay() {
    if (!this.audio) return;
    this.audio.muted = false;
    const p = this.audio.play();
    if (p !== undefined) {
      p.then(() => {
        this.isPlaying = true;
        this._unlocked = true;
        this._setPlaying(true);
      }).catch(() => {});
    }
  }

  _bindMobileGestures() {
    const unlock = () => {
      this.unmuteAndPlay();
      if (this._unlocked) {
        ['pointerdown', 'touchstart', 'touchend', 'click', 'scroll', 'keydown'].forEach(evt => {
          window.removeEventListener(evt, unlock, true);
          document.removeEventListener(evt, unlock, true);
        });
      }
    };

    // Use capture phase on both window and document so it fires immediately on touch
    ['pointerdown', 'touchstart', 'touchend', 'click', 'scroll', 'keydown'].forEach(evt => {
      window.addEventListener(evt, unlock, { capture: true, passive: true });
      document.addEventListener(evt, unlock, { capture: true, passive: true });
    });
  }

  _bindToggle() {
    this.toggle.addEventListener('click', (e) => {
      e.stopPropagation();

      if (!this.isPlaying) {
        this.unmuteAndPlay();
      } else {
        this.audio.pause();
        this.isPlaying = false;
        this._setPlaying(false);
      }
    });
  }

  _setPlaying(state) {
    this.isPlaying = state;
    this.toggle.classList.toggle('is-playing', state);
    this.toggle.setAttribute(
      'aria-label',
      state ? 'Pause music' : 'Play music'
    );
    this.toggle.title = state ? 'Pause music' : 'Play music';
  }
}


/* ─────────────────────────────────────────────────────────────
   PARTICLE SYSTEM
   Canvas-based ambient star-field in the background.
   ───────────────────────────────────────────────────────────── */
class ParticleSystem {
  constructor(id) {
    this.canvas = el(id);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.raf = null;
    this._resize();
    window.addEventListener('resize', () => this._resize(), { passive: true });
  }

  _resize() {
    if (!this.canvas) return;
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this._populate();
  }

  _populate() {
    const n = Math.max(20, Math.floor((this.canvas.width * this.canvas.height) / 12000));
    this.particles = Array.from({ length: n }, () => this._make(true));
  }

  _make(randomY = false) {
    return {
      x:     Math.random() * this.canvas.width,
      y:     randomY ? Math.random() * this.canvas.height : this.canvas.height + 5,
      r:     Math.random() * 1.3 + 0.25,
      alpha: Math.random() * 0.45 + 0.08,
      speed: Math.random() * 0.22 + 0.04,
      drift: (Math.random() - 0.5) * 0.12,
      phase: Math.random() * Math.PI * 2,
    };
  }

  _tick() {
    const { ctx, canvas, particles } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const now = performance.now() * 0.001;
    for (const p of particles) {
      p.phase += 0.011;
      const bright = p.alpha * (0.65 + 0.35 * Math.sin(p.phase));
      if (!reduced()) { p.y -= p.speed; p.x += p.drift; }
      if (p.y < -5) { Object.assign(p, this._make(false)); }
      if (p.x < -5)                  p.x = canvas.width + 5;
      if (p.x > canvas.width + 5)    p.x = -5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(201,169,110,${bright.toFixed(3)})`;
      ctx.fill();
    }
    this.raf = requestAnimationFrame(() => this._tick());
  }

  start() { if (!this.raf) this.raf = requestAnimationFrame(() => this._tick()); }
  stop()  { if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; } }
}

/* ─────────────────────────────────────────────────────────────
   CONFETTI BURST
   Lightweight DOM confetti.
   ───────────────────────────────────────────────────────────── */
class ConfettiBurst {
  constructor(id) { this.wrap = el(id); }

  fire(ox, oy, count = 45) {
    if (!this.wrap || reduced()) return;
    for (let i = 0; i < count; i++) this._spawn(ox, oy, i);
  }

  _spawn(ox, oy, i) {
    const div   = document.createElement('div');
    const angle = Math.random() * Math.PI * 2;
    const spd   = Math.random() * 150 + 60;
    const dx    = Math.cos(angle) * spd;
    const dy    = Math.sin(angle) * spd - 85;
    const size  = Math.random() * 5 + 3;
    const delay = i * 10;
    const dur   = Math.random() * 600 + 700;
    const clrs  = ['#e05c2a','#c9a96e','#f0ece4','#a8341a','#ffffff','#ffd580'];
    const clr   = clrs[i % clrs.length];
    const br    = ['50%','0%','2px'][Math.floor(Math.random()*3)];

    div.style.cssText = `
      position:fixed; left:${ox}px; top:${oy}px;
      width:${size}px; height:${size}px;
      background:${clr}; border-radius:${br};
      pointer-events:none; z-index:9999; opacity:1;
      transform:translate(0,0) rotate(0deg);
      transition:transform ${dur}ms cubic-bezier(0.2,0.8,0.4,1) ${delay}ms,
                 opacity ${dur*0.55}ms ease ${delay+dur*0.45}ms;
    `;
    this.wrap.appendChild(div);
    requestAnimationFrame(() => {
      div.style.transform = `translate(${dx}px,${dy + 110}px) rotate(${Math.random()*720}deg)`;
      div.style.opacity   = '0';
    });
    setTimeout(() => div.remove(), dur + delay + 200);
  }
}

/* ─────────────────────────────────────────────────────────────
   SCROLL REVEAL
   IntersectionObserver that adds .in-view to .scroll-reveal
   elements as they enter the viewport.
   ───────────────────────────────────────────────────────────── */
class ScrollReveal {
  constructor() {
    if (reduced()) {
      document.querySelectorAll('.scroll-reveal').forEach(el => el.classList.add('in-view'));
      return;
    }
    this.io = new IntersectionObserver(
      (entries) => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); this.io.unobserve(e.target); } }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
  }

  observe(root = document) {
    if (!this.io) return;
    root.querySelectorAll('.scroll-reveal').forEach(el => this.io.observe(el));
  }
}

/* ─────────────────────────────────────────────────────────────
   GIFT BOX
   Manages the opening sequence on the landing screen.
   ───────────────────────────────────────────────────────────── */
class GiftBox {
  constructor(giftId, ctaId) {
    this.box    = el(giftId);
    this.cta    = el(ctaId);
    this.opened = false;
    if (!this.box || !this.cta) return;
    this.box.addEventListener('click',   () => this._trigger());
    this.cta.addEventListener('click',   () => this._trigger());
    this.box.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); this._trigger(); } });
  }

  _trigger() {
    if (this.opened) return;
    this.opened = true;
    this.cta?.classList.add('is-pressed');

    // Ensure music starts playing immediately on gift opening tap on mobile
    if (App.audioPlayer) {
      App.audioPlayer.unmuteAndPlay();
    }

    // Track gift opened event
    if (window.trackEvent) {
      window.trackEvent('gift_opened', { buttonId: 'open-gift' });
    }

    // Shake
    this.box.classList.add('is-shaking');
    setTimeout(() => {
      this.box.classList.remove('is-shaking');
      this.box.classList.add('is-opening');
      // Confetti from box centre
      const r = this.box.getBoundingClientRect();
      App.confetti.fire(r.left + r.width/2, r.top + r.height/2, 55);
      setTimeout(() => { if (this.onOpen) this.onOpen(); }, 520);
    }, 530);
  }
}

/* ─────────────────────────────────────────────────────────────
   PHOTO GALLERY + LIGHTBOX
   ───────────────────────────────────────────────────────────── */
class Gallery {
  constructor() {
    this.items  = [];   // { src, alt, photoId } — built from DOM
    this.current = 0;
    this.lb     = el('lightbox');
    this.lbImg  = el('lb-img');
    this.lbCtr  = el('lb-counter');
    this.lbBd   = el('lb-backdrop');
    if (!this.lb) return;
    this._collectItems();
    this._bindEvents();
  }

  _collectItems() {
    document.querySelectorAll('.gallery-btn').forEach((btn, i) => {
      const imgEl = btn.querySelector('img');
      const src = imgEl?.src || btn.dataset.src || '';
      const alt = btn.querySelector('img')?.alt || `Photo ${i+1}`;
      const photoId = btn.dataset.photoId || imgEl?.dataset.photoId || `navika-0${i+1}`;
      this.items.push({ src, alt, photoId });
      btn.addEventListener('click', () => this.open(i));
    });
  }

  open(index) {
    if (!this.lb || this.items.length === 0) return;
    this.current = index;
    this._load();
    this.lb.classList.add('is-open');
    this.lb.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
    el('lb-close')?.focus();

    // Track photo opened
    const item = this.items[index];
    if (window.trackEvent && item) {
      window.trackEvent('photo_opened', { photoId: item.photoId });
    }
  }

  close() {
    if (!this.lb) return;
    const item = this.items[this.current];
    if (window.trackEvent && item) {
      window.trackEvent('photo_closed', { photoId: item.photoId });
    }
    this.lb.classList.remove('is-open');
    this.lb.setAttribute('aria-hidden','true');
    document.body.style.overflow = '';
  }

  prev() {
    const fromPhoto = this.items[this.current]?.photoId;
    this.current = (this.current - 1 + this.items.length) % this.items.length;
    const toPhoto = this.items[this.current]?.photoId;
    if (window.trackEvent) {
      window.trackEvent('photo_previous', { fromPhoto, toPhoto });
      window.trackEvent('photo_opened', { photoId: toPhoto });
    }
    this._load();
  }

  next() {
    const fromPhoto = this.items[this.current]?.photoId;
    this.current = (this.current + 1) % this.items.length;
    const toPhoto = this.items[this.current]?.photoId;
    if (window.trackEvent) {
      window.trackEvent('photo_next', { fromPhoto, toPhoto });
      window.trackEvent('photo_opened', { photoId: toPhoto });
    }
    this._load();
  }

  _load() {
    const item = this.items[this.current];
    if (!this.lbImg || !item) return;

    this.lbImg.style.opacity = '0';

    // Clear src first so the browser doesn't reuse the scaled thumbnail
    // from its cache — forces a fresh decode at native resolution.
    this.lbImg.removeAttribute('src');
    this.lbImg.removeAttribute('width');
    this.lbImg.removeAttribute('height');
    this.lbImg.alt = item.alt;

    this.lbImg.onload  = () => { this.lbImg.style.opacity = '1'; };
    this.lbImg.onerror = () => { this.lbImg.style.opacity = '1'; };

    // Small timeout so the cleared state is painted before the new src is set
    setTimeout(() => { this.lbImg.src = item.src; }, 16);

    if (this.lbCtr) this.lbCtr.textContent = `${this.current + 1} / ${this.items.length}`;
  }


  _bindEvents() {
    el('lb-close')?.addEventListener('click',   () => this.close());
    el('lb-prev')?.addEventListener('click',    () => this.prev());
    el('lb-next')?.addEventListener('click',    () => this.next());
    this.lbBd?.addEventListener('click',        () => this.close());
    document.addEventListener('keydown', e => {
      if (!this.lb?.classList.contains('is-open')) return;
      if (e.key === 'Escape')       this.close();
      if (e.key === 'ArrowLeft')    this.prev();
      if (e.key === 'ArrowRight')   this.next();
    });

    // Touch swipe support for lightbox
    let touchStartX = 0;
    this.lb?.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
    this.lb?.addEventListener('touchend',   e => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      if (Math.abs(dx) > 50) { dx < 0 ? this.next() : this.prev(); }
    }, { passive: true });
  }
}

/* ─────────────────────────────────────────────────────────────
   NICKNAME CARDS
   Toggle .is-active on the two nickname cards.
   ───────────────────────────────────────────────────────────── */
function initNicknames() {
  document.querySelectorAll('.nickname-card').forEach(card => {
    const activate = () => {
      const wasActive = card.classList.contains('is-active');
      document.querySelectorAll('.nickname-card').forEach(c => c.classList.remove('is-active'));
      if (!wasActive) card.classList.add('is-active');
    };
    card.addEventListener('click', activate);
    card.addEventListener('keydown', e => { if (e.key==='Enter'||e.key===' ') { e.preventDefault(); activate(); } });
  });
}

/* ─────────────────────────────────────────────────────────────
   EASTER EGG
   ───────────────────────────────────────────────────────────── */
function initEasterEgg() {
  const btn  = el('easter-btn');
  const resp = el('easter-response');
  if (!btn || !resp) return;

  btn.addEventListener('click', () => {
    btn.disabled = true;
    btn.style.opacity = '0.4';
    btn.style.pointerEvents = 'none';
    resp.setAttribute('aria-hidden','false');
    resp.classList.add('is-visible');
  });
}

/* ─────────────────────────────────────────────────────────────
   TRANSITION: Opening → Birthday Reveal → Main Content
   ───────────────────────────────────────────────────────────── */
async function runOpeningTransition() {
  const openingEl = el('opening-screen');
  const revealEl  = el('birthday-reveal');
  const mainEl    = el('main-content');

  // Fade out opening screen
  if (openingEl) {
    openingEl.style.transition = 'opacity 0.75s ease';
    openingEl.style.opacity    = '0';
    await wait(750);
    openingEl.classList.add('reveal-hidden');
    openingEl.removeAttribute('aria-label');
  }

  // Unlock scroll now that the opening screen is gone
  document.documentElement.classList.remove('scroll-locked');
  document.body.classList.remove('scroll-locked');

  // Show birthday reveal
  if (revealEl) {
    revealEl.classList.remove('reveal-hidden');
    revealEl.setAttribute('aria-hidden','false');
    // Short rAF pause so display:flex is painted before transition starts
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    revealEl.classList.add('is-active');
  }

  // Show main content after a longer pause (let user see reveal)
  await wait(reduced() ? 200 : 2200);
  if (mainEl) {
    mainEl.classList.remove('reveal-hidden');
    // Trigger scroll reveal for newly visible elements
    App.scrollReveal.observe(mainEl);
  }
}

/* ─────────────────────────────────────────────────────────────
   APP — TOP-LEVEL COORDINATOR
   ───────────────────────────────────────────────────────────── */
const App = {
  particles:   null,
  confetti:    null,
  gift:        null,
  gallery:     null,
  scrollReveal:null,
  audioPlayer: null,

  init() {
    // Lock scroll on both html + body (covers all mobile browsers)
    document.documentElement.classList.add('scroll-locked');
    document.body.classList.add('scroll-locked');

    // Initialize audio player immediately so gesture capture is active on page load
    this.audioPlayer = new AudioPlayer('bg-audio', 'music-toggle');

    this.particles    = new ParticleSystem('particle-canvas');
    this.particles.start();

    this.confetti     = new ConfettiBurst('confetti-container');

    this.scrollReveal = new ScrollReveal();

    this.gift         = new GiftBox('gift-box', 'cta-open');
    this.gift.onOpen  = () => runOpeningTransition();

    this.gallery      = new Gallery();

    initNicknames();
    initEasterEgg();

    // If #main-content is visible (no reveal-hidden class), observe it immediately
    const mainEl = el('main-content');
    if (mainEl && !mainEl.classList.contains('reveal-hidden')) {
      this.scrollReveal.observe(mainEl);
    }
  },
};

/* ─── BOOT ──────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => App.init());
