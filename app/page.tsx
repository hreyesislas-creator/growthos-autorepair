import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'E&E Tires Automotive Center | Banning, CA | Tires & Auto Repair',
  
}

// This page renders the full HTML from the static site build.
// All interactivity (nav toggle, carousel, form) is driven by
// the inline scripts loaded via the SiteScripts component.
import SiteScripts from '@/components/SiteScripts'

export default function Page() {
  const html = `

<!-- ── MOBILE STICKY BAR ── -->
<div class="mob-bar">
  <a class="mob-bar-call" href="tel:9517970013">📞 Call Now</a>
  <a class="mob-bar-book" href="#book">📅 Book Online</a>
</div>


<!-- ══════════════════════════════════════════════
     OPTIMIZED HOMEPAGE — E&E Tires Automotive Center
     Structure: Hero → Services → Trust → Brands → Specials → Vehicles → Location
══════════════════════════════════════════════ -->

<!-- ══════════════════════════════════════════════
  UTILITY BAR — matches eetirez.com info row style:
  light background, shop hours · address · phone
══════════════════════════════════════════════ -->
<div class="ubar" role="banner" aria-label="Shop information">
  <div class="wrap">
    <div class="ubar-inner">
      <div class="ubar-left">
        <div class="ubar-item">
          <span class="ubar-dot" aria-hidden="true"></span>
          <strong>Shop Hours:</strong>&nbsp;Mon–Sat: 8:00 AM – 5:00 PM
        </div>
        <div class="ubar-item">
          <svg width="13" height="15" viewBox="0 0 13 15" fill="none" aria-hidden="true"><path d="M6.5 0C4.015 0 2 2.015 2 4.5c0 3.375 4.5 9 4.5 9s4.5-5.625 4.5-9C11 2.015 8.985 0 6.5 0zm0 6.5a2 2 0 110-4 2 2 0 010 4z" fill="currentColor" opacity=".6"/></svg>
          <a href="https://maps.app.goo.gl/BammB54H9rfvozu36" target="_blank" rel="noopener" class="ubar-link" style="padding:0">1550 E Ramsey St, Banning, CA 92220</a>
        </div>
        <div class="ubar-item">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M13.923 10.71l-3-3a.5.5 0 00-.707 0l-1.5 1.5a7.51 7.51 0 01-3.926-3.926l1.5-1.5a.5.5 0 000-.707l-3-3a.5.5 0 00-.707 0l-2 2A.5.5 0 000 2.5C0 8.851 5.149 14 11.5 14a.5.5 0 00.354-.146l2-2a.5.5 0 000-.707l.069.063z" fill="currentColor" opacity=".6"/></svg>
          <a href="tel:9517970013" class="ubar-link" style="padding:0"><strong>951-797-0013</strong></a>
        </div>
      </div>
      <div class="ubar-right">
        <a class="ubar-link" href="/about#reviews">Reviews</a>
        <a class="ubar-link" href="/financing">Specials</a>
        <a class="ubar-link" href="/#location">Contact Us</a>
      </div>
    </div>
  </div>
</div>


<!-- ══════════════════════════════════════════════
  NAVIGATION
══════════════════════════════════════════════ -->
<nav class="nav" aria-label="Main navigation">
  <div class="wrap">
    <div class="nav-inner">

      <!-- LOGO: loads real image from eetirez.com; falls back to brand-accurate SVG -->
      <a href="/" class="nav-logo" aria-label="E&E Tires Automotive Center home">
        <img
          class="logo-img"
          src="https://eetirez.com/wp-content/uploads/2025/02/logo-e-e-tires-banning-ca-92220-auto-repair.png"
          alt="E&E Tires Automotive Center"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
        >
        <!-- Fallback: matches real E&E brand — tire graphic + wordmark, blue palette, Teko font -->
        <div class="logo-svg-wrap" style="display:none;align-items:center;gap:12px;">
          <!-- Tire icon matching brand -->
          <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <circle cx="27" cy="27" r="26" fill="#0070C9"/>
            <circle cx="27" cy="27" r="20" fill="none" stroke="rgba(255,255,255,.20)" stroke-width="1.5"/>
            <circle cx="27" cy="27" r="10" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.30)" stroke-width="1.5"/>
            <!-- Tire tread lines -->
            <line x1="27" y1="1" x2="27" y2="9"  stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="27" y1="45" x2="27" y2="53" stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="1" y1="27" x2="9" y2="27"  stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round"/>
            <line x1="45" y1="27" x2="53" y2="27" stroke="rgba(255,255,255,.25)" stroke-width="2.5" stroke-linecap="round"/>
            <!-- E&E text -->
            <text x="27" y="24" text-anchor="middle" font-family="Teko,sans-serif" font-size="14" font-weight="600" fill="white" letter-spacing="1">E&amp;E</text>
            <text x="27" y="33" text-anchor="middle" font-family="Teko,sans-serif" font-size="7"  font-weight="500" fill="rgba(255,255,255,.80)" letter-spacing="1.5">TIRES</text>
          </svg>
          <div>
            <div style="font-family:Teko,sans-serif;font-size:19px;font-weight:600;color:#171C1E;text-transform:uppercase;letter-spacing:.06em;line-height:1.1;">E&amp;E Tires Automotive Center</div>
            <div style="font-family:Barlow,sans-serif;font-size:11px;color:#666666;letter-spacing:.06em;margin-top:1px;">Banning, CA · 951-797-0013</div>
          </div>
        </div>
      </a>

      <div class="nav-links">
        <a class="nav-lnk" href="/services">Services</a>
        <a class="nav-lnk" href="/services#vehicles">Vehicles</a>
        <a class="nav-lnk" href="/specials">Specials</a>
        <a class="nav-lnk" href="/tires">Tires</a>
        <a class="nav-lnk" href="/financing">Financing</a>
        <a class="nav-lnk" href="/about#warranty">Warranty</a>
        <a class="nav-lnk" href="/about#reviews">Reviews</a>
        <a class="nav-lnk" href="/about">About Us</a>
      </div>

      <div class="nav-right">
        <div class="nav-phone-block">
          <div class="nav-phone-status"><span class="ubar-dot"></span> Open Now</div>
          <a class="nav-phone-num" href="tel:9517970013">951-797-0013</a>
          <div class="nav-phone-hours">Mon–Sat · 8AM–5PM</div>
        </div>
        <a class="nav-cta" href="#book">Schedule Appointment</a>
        <button class="hamburger" aria-label="Menu" onclick="toggleNav()">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </div>
  <nav class="mobile-nav" id="mobnav" aria-label="Mobile navigation">
    <a class="mobile-nav-lnk" href="/services" onclick="toggleNav()">Services</a>
    <a class="mobile-nav-lnk" href="/services#vehicles" onclick="toggleNav()">Vehicles</a>
    <a class="mobile-nav-lnk" href="/specials" onclick="toggleNav()">Specials</a>
        <a class="mobile-nav-lnk" href="/tires" onclick="toggleNav()">Tires</a>
    <a class="mobile-nav-lnk" href="/financing" onclick="toggleNav()">Financing</a>
    <a class="mobile-nav-lnk" href="/about#warranty" onclick="toggleNav()">Warranty</a>
    <a class="mobile-nav-lnk" href="/about#reviews" onclick="toggleNav()">Reviews</a>
    <a class="mobile-nav-lnk" href="/#location" onclick="toggleNav()">Contact Us</a>
    <div class="mobile-nav-ctas">
      <a class="btn btn-blue btn-md" href="tel:9517970013" style="text-align:center">📞 Call Now</a>
      <a class="btn btn-outline-white btn-md" href="#book" onclick="toggleNav()" style="text-align:center">📅 Book</a>
    </div>
  </nav>
</nav>

<!-- ══════════════════════════════════════════════
  PROMO BAR
══════════════════════════════════════════════ -->
<div class="promo-bar" role="banner">
  <div class="wrap">
    <div class="promo-bar-inner">
      <span class="promo-tag">Current Specials</span>
      <span class="promo-text">Full Synthetic $59.99 &nbsp;·&nbsp; Synthetic Blend $39.99 &nbsp;·&nbsp; Brake Special $99/axle &nbsp;·&nbsp; A/C Test $49.99 &nbsp;·&nbsp; 10% OFF Repairs — <em>Exp 3-31-2026</em></span>
      <a class="promo-cta" href="https://eetirez.com/specials/" target="_blank" rel="noopener">View All Specials →</a>
    </div>
  </div>
</div>


<!-- 1. HERO ─────────────────────────────────── -->
<!-- ══════════════════════════════════════════════
  HERO — SECTION 1
  Purpose: First impression, dual CTA, booking form
  Layout: 2-col headline + booking card
══════════════════════════════════════════════ -->
<section class="hero" aria-labelledby="hero-h1" id="home">
  <div class="wrap">
    <div class="hero-grid">

      <div class="hero-left">
        <div class="hero-badge">
          <span class="hero-badge-dot"></span>
          <span class="hero-badge-text">Committed to Transparency and Customer Satisfaction</span>
        </div>

        <h1 class="hero-h1" id="hero-h1">
          Your Trusted<br>
          Tire &amp; <span>Auto Repair</span><br>
          — Banning, CA
        </h1>

        <p class="hero-desc">
          E&amp;E Tires Automotive Center is your trusted auto repair and tire shop serving Banning, CA. Quality service, honest pricing, and a 2-Year/24,000 Mile Warranty on every job.
        </p>

        <div class="hero-ctas">
          <a class="btn btn-blue btn-xl" href="#book">📅 Schedule Appointment</a>
          <a class="btn btn-outline-white btn-xl" href="tel:9517970013">📞 951-797-0013</a>
        </div>

        <div class="hero-trust">
          <div class="ht-item">
            <span class="ht-icon">⭐</span>
            <span class="ht-text"><strong>4.9 / 5</strong> Google</span>
          </div>
          <div class="ht-sep"></div>
          <div class="ht-item">
            <span class="ht-icon">🏅</span>
            <span class="ht-text"><strong>ASE</strong> Certified</span>
          </div>
          <div class="ht-sep"></div>
          <div class="ht-item">
            <span class="ht-icon">🛡️</span>
            <span class="ht-text"><strong>2-Yr</strong> Warranty</span>
          </div>
          <div class="ht-sep"></div>
          <div class="ht-item">
            <span class="ht-icon">⏱️</span>
            <span class="ht-text"><strong>Same-Day</strong> Service</span>
          </div>
        </div>
      </div>

      <!-- BOOKING CARD + PLATE LOOKUP -->
      <div class="booking-card" id="book">
        <div class="bc-title">Book Your Service</div>
        <div class="bc-sub">Online scheduling · Confirmation within 30 min · No credit card needed</div>

        <form class="bc-form" onsubmit="submitBooking(event)" novalidate>
          <div class="bc-row">
            <div class="fld-group">
              <label class="fld-label" for="bc-name">Your Name *</label>
              <input class="fld" type="text" id="bc-name" placeholder="Maria Rodriguez" required>
            </div>
            <div class="fld-group">
              <label class="fld-label" for="bc-phone">Phone Number *</label>
              <input class="fld" type="tel" id="bc-phone" placeholder="(951) 555-0000" required>
            </div>
          </div>
          <div class="fld-group">
            <label class="fld-label" for="bc-vehicle">Your Vehicle</label>
            <div class="veh-input-wrap">
              <input
                class="fld"
                type="text"
                id="bc-vehicle"
                placeholder="Enter vehicle or CA license plate"
                oninput="detectPlateInput(this)"
              >
              <button
                class="veh-lookup-btn"
                type="button"
                id="vehLookupBtn"
                onclick="runPlateLookup()"
                aria-label="Look up California license plate"
              >Lookup Plate</button>
            </div>
          </div>
          <div class="bc-row">
            <div class="fld-group">
              <label class="fld-label" for="bc-service">Service Needed</label>
              <select class="fld-select" id="bc-service">
                <option value="">Select service…</option>
                <option>Oil Change</option>
                <option>New Tires</option>
                <option>Tire Rotation</option>
                <option>Brake Service</option>
                <option>AC Repair</option>
                <option>Wheel Alignment</option>
                <option>Full Inspection</option>
                <option>Engine / Transmission</option>
                <option>Electrical Diagnostic</option>
                <option>Suspension Repair</option>
                <option>Other / Not Sure</option>
              </select>
            </div>
            <div class="fld-group">
              <label class="fld-label" for="bc-date">Preferred Date</label>
              <input class="fld" type="date" id="bc-date">
            </div>
          </div>

          <!-- Smart suggestion — appears after plate lookup -->
          <div class="smart-suggest" id="smartSuggest">
            <div class="ss-title">💡 We noticed something on your last visit</div>
            <div class="ss-text">Your front brake pads were at 3mm in February — below the safe minimum. We recommend adding a free brake inspection.</div>
            <span class="ss-add" onclick="addBrakeCheck()">+ Add Free Brake Check →</span>
          </div>

          <button class="bc-submit" type="submit">📅 Request My Appointment</button>
          <div class="bc-microtrust">🔒 No spam · Confirmation text within 30 min · Free cancellation</div>
        </form>
      </div>
    </div>
  </div>
</section>


<!-- 2. STATS BAR ───────────────────────────── -->
<!-- ══════════════════════════════════════════════
  STATS BAR — SECTION 2
  Purpose: Immediate credibility in numbers
══════════════════════════════════════════════ -->
<div class="stats-bar" role="region" aria-label="Shop statistics">
  <div class="wrap">
    <div class="stats-inner">
      <div class="stat-item"><div class="stat-num">15+</div><div class="stat-label">Years in Banning, CA</div></div>
      <div class="stat-sep"></div>
      <div class="stat-item"><div class="stat-num">4.9★</div><div class="stat-label">Google Rating</div></div>
      <div class="stat-sep"></div>
      <div class="stat-item"><div class="stat-num">240</div><div class="stat-label">Google Reviews</div></div>
      <div class="stat-sep"></div>
      <div class="stat-item"><div class="stat-num">2yr</div><div class="stat-label">24,000 Mi Warranty</div></div>
      <div class="stat-sep"></div>
      <div class="stat-item"><div class="stat-num">ASE</div><div class="stat-label">Certified Techs</div></div>
    </div>
  </div>
</div>

<!-- 3. TRUST STRIP ─────────────────────────── -->
<div class="trust-strip">
  <div class="wrap">
    <div class="trust-strip-inner">
      <div class="ts-item"><span class="ts-icon">🏅</span><span class="ts-text">ASE Certified Technicians</span></div>
      <div class="ts-sep"></div>
      <div class="ts-item"><span class="ts-icon">🛡️</span><span class="ts-text">2-Year/24,000 Mile Warranty</span></div>
      <div class="ts-sep"></div>
      <div class="ts-item"><span class="ts-icon">📸</span><span class="ts-text">Digital Photo Inspections</span></div>
      <div class="ts-sep"></div>
      <div class="ts-item"><span class="ts-icon">💳</span><span class="ts-text">Financing Available</span></div>
      <div class="ts-sep"></div>
      <div class="ts-item"><span class="ts-icon">🚗</span><span class="ts-text">All Makes &amp; Models</span></div>
    </div>
  </div>
</div>

<!-- ══════════════════════════════════════════════
  VEHICLE LOOKUP SECTION — SECTION 3
  Purpose: Capture vehicle data + show value
  Layout: 2-col value prop + lookup card
══════════════════════════════════════════════ -->

<!-- 4. SERVICES OVERVIEW ────────────────────── -->

<section class="section section-alt" id="services" aria-labelledby="svc-hp-h2">
  <div class="container">
    <div style="text-align:center;margin-bottom:40px">
      <div class="eyebrow">Auto Repair Services</div>
      <h2 class="h2" id="svc-hp-h2">Everything Your Vehicle Needs</h2>
      <p style="color:var(--text-muted);max-width:540px;margin:14px auto 0;font-size:1rem;line-height:1.7">
        From tire installation to engine repair — one trusted shop in Banning, CA.
      </p>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;max-width:900px;margin:0 auto 36px">
      <a href="/services" style="text-decoration:none">
        <div class="svc-card" style="background:var(--white);border:1px solid var(--border);border-radius:var(--r6);padding:24px 20px;text-align:center;transition:box-shadow .2s;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:10px">🛞</div>
          <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;color:var(--dark);margin-bottom:6px">Tires</div>
          <div style="font-size:.85rem;color:var(--text-muted);line-height:1.5">New tires · Installation · Rotation · Repair</div>
        </div>
      </a>
      <a href="/services" style="text-decoration:none">
        <div class="svc-card" style="background:var(--white);border:1px solid var(--border);border-radius:var(--r6);padding:24px 20px;text-align:center;transition:box-shadow .2s;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:10px">🛑</div>
          <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;color:var(--dark);margin-bottom:6px">Brakes</div>
          <div style="font-size:.85rem;color:var(--text-muted);line-height:1.5">Pads · Rotors · Brake fluid · Inspection</div>
        </div>
      </a>
      <a href="/services" style="text-decoration:none">
        <div class="svc-card" style="background:var(--white);border:1px solid var(--border);border-radius:var(--r6);padding:24px 20px;text-align:center;transition:box-shadow .2s;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:10px">🔧</div>
          <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;color:var(--dark);margin-bottom:6px">Engine & Diagnostics</div>
          <div style="font-size:.85rem;color:var(--text-muted);line-height:1.5">Engine repair · Check engine · Electrical</div>
        </div>
      </a>
      <a href="/services" style="text-decoration:none">
        <div class="svc-card" style="background:var(--white);border:1px solid var(--border);border-radius:var(--r6);padding:24px 20px;text-align:center;transition:box-shadow .2s;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:10px">🛢️</div>
          <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;color:var(--dark);margin-bottom:6px">Oil Changes</div>
          <div style="font-size:.85rem;color:var(--text-muted);line-height:1.5">Full synthetic · Synthetic blend · Conventional</div>
        </div>
      </a>
      <a href="/services" style="text-decoration:none">
        <div class="svc-card" style="background:var(--white);border:1px solid var(--border);border-radius:var(--r6);padding:24px 20px;text-align:center;transition:box-shadow .2s;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:10px">❄️</div>
          <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;color:var(--dark);margin-bottom:6px">AC & Heating</div>
          <div style="font-size:.85rem;color:var(--text-muted);line-height:1.5">AC performance test · Recharge · Repair</div>
        </div>
      </a>
      <a href="/services" style="text-decoration:none">
        <div class="svc-card" style="background:var(--white);border:1px solid var(--border);border-radius:var(--r6);padding:24px 20px;text-align:center;transition:box-shadow .2s;cursor:pointer;">
          <div style="font-size:2rem;margin-bottom:10px">🔄</div>
          <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;color:var(--dark);margin-bottom:6px">Suspension & Alignment</div>
          <div style="font-size:.85rem;color:var(--text-muted);line-height:1.5">Alignment · Steering · Shocks · Struts</div>
        </div>
      </a>
    </div>
    <div style="text-align:center">
      <a href="/services" class="btn" style="display:inline-flex;align-items:center;gap:8px">View All 13 Services →</a>
    </div>
  </div>
</section>


<!-- 5. TRUST / CREDIBILITY ──────────────────── -->

<section class="section" style="background:var(--charcoal);color:var(--white)" id="trust" aria-labelledby="trust-h2">
  <div class="container">
    <div style="text-align:center;margin-bottom:44px">
      <div class="eyebrow" style="color:var(--blue)">Why Choose E&amp;E Tires</div>
      <h2 class="h2 h2-light" id="trust-h2">Committed to Transparency<br>and Customer Satisfaction</h2>
    </div>

    <!-- Rating Row -->
    <div style="display:flex;align-items:center;justify-content:center;gap:20px;margin-bottom:44px;flex-wrap:wrap">
      <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:20px 32px;text-align:center">
        <div style="font-family:'Teko',sans-serif;font-size:3rem;font-weight:600;color:#F59E0B;line-height:1">4.9</div>
        <div style="font-size:.85rem;color:rgba(255,255,255,.6);margin-top:4px">240 Google Reviews</div>
        <div style="font-size:1.2rem;margin-top:6px">★★★★★</div>
      </div>
      <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:20px 32px;text-align:center">
        <div style="font-family:'Teko',sans-serif;font-size:3rem;font-weight:600;color:var(--blue);line-height:1">2 Yr</div>
        <div style="font-size:.85rem;color:rgba(255,255,255,.6);margin-top:4px">24,000 Mile Warranty</div>
        <a href="/about#warranty" style="font-size:.8rem;color:var(--blue);text-decoration:none;display:block;margin-top:6px">Learn more →</a>
      </div>
      <div style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:20px 32px;text-align:center">
        <div style="font-family:'Teko',sans-serif;font-size:3rem;font-weight:600;color:var(--blue);line-height:1">ASE</div>
        <div style="font-size:.85rem;color:rgba(255,255,255,.6);margin-top:4px">Certified Technicians</div>
        <div style="font-size:1rem;margin-top:6px">✅</div>
      </div>
    </div>

    <!-- 3 Pillars -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:820px;margin:0 auto 40px">
      <div style="text-align:center">
        <div style="font-size:2rem;margin-bottom:12px">🏆</div>
        <div style="font-family:'Teko',sans-serif;font-size:1.3rem;font-weight:600;margin-bottom:8px">Top-Quality Parts</div>
        <div style="font-size:.88rem;color:rgba(255,255,255,.65);line-height:1.6">We use premium parts and perform every repair with precision, so fixes last.</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:2rem;margin-bottom:12px">👁️</div>
        <div style="font-family:'Teko',sans-serif;font-size:1.3rem;font-weight:600;margin-bottom:8px">Transparent Pricing</div>
        <div style="font-size:.88rem;color:rgba(255,255,255,.65);line-height:1.6">No surprises. We explain every service and confirm costs before any work begins.</div>
      </div>
      <div style="text-align:center">
        <div style="font-size:2rem;margin-bottom:12px">❤️</div>
        <div style="font-family:'Teko',sans-serif;font-size:1.3rem;font-weight:600;margin-bottom:8px">Customer-Centric</div>
        <div style="font-size:.88rem;color:rgba(255,255,255,.65);line-height:1.6">Your satisfaction drives everything we do. Banning's most trusted auto shop.</div>
      </div>
    </div>

    <!-- Single review quote -->
    <div style="max-width:600px;margin:0 auto;text-align:center;padding:28px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px">
      <div style="font-size:1.1rem;font-style:italic;color:rgba(255,255,255,.85);line-height:1.7;margin-bottom:14px">"Much better than going to the dealership! They were honest, quick, and the price was fair. Will definitely be back."</div>
      <div style="font-size:.85rem;color:rgba(255,255,255,.5)">— Mercedes M. · Google Review ★★★★★</div>
    </div>
  </div>
</section>


<!-- 6. TIRE BRANDS ──────────────────────────── -->
<div id="tires" class="brands-row-standalone" role="region" aria-label="Tire brands we carry">
  <div class="br-label">Tire Brands We Carry</div>
  <div class="brand-logos-row">
    <img class="brand-logo-img"
         src="https://eetirez.com/wp-content/uploads/2024/04/bridgestone-logo-5500x1200-1-1024x223.png"
         alt="Bridgestone" loading="lazy">
    <img class="brand-logo-img"
         src="https://eetirez.com/wp-content/uploads/2024/04/Goodyear-logo-black-5500x1200-1-1024x223.png"
         alt="Goodyear" loading="lazy">
    <img class="brand-logo-img"
         src="https://eetirez.com/wp-content/uploads/2024/04/dunlop-logo-2200x500-1-1024x256.png"
         alt="Dunlop" loading="lazy">
    <img class="brand-logo-img"
         src="https://eetirez.com/wp-content/uploads/2024/04/michelin-logo-1900x450-1-1024x243.png"
         alt="Michelin" loading="lazy">
    <span class="brand-name-text">M2 Tires</span>
  </div>
</div>

<!-- ══════════════════════════════════════════════
  SPECIALS — 3-card promotional grid
  Content verified from eetirez.com/specials/ · EXP 3-31-2026
══════════════════════════════════════════════ -->
<div class="specials-strip" id="specials" role="region" aria-labelledby="specials-h2">
  <div class="wrap">

    <!-- Section header -->
    <div class="specials-header">
      <div class="eyebrow">Current Promotions</div>
      <h2 class="h2" id="specials-h2">Special Offers &amp; Savings</h2>
    </div>

    <!-- 3-card grid -->
    <div class="specials-grid">

      <!-- Card 1: Full Synthetic Oil Change -->
      <div class="special-card">
        <div class="sp-badge">Limited Time Offer</div>
        <div class="sp-price"><sup>$</sup>59<sup>.99</sup></div>
        <div class="sp-service">Full Synthetic Oil Change</div>
        <div class="sp-action">Includes 5 qts oil &amp; filter. Oil disposal &amp; taxes extra. Most cars &amp; light trucks. Cannot be combined.</div>
        <div class="sp-exp">Expires March 31, 2026</div>
        <a class="sp-cta" href="https://eetirez.com/appointments" target="_blank" rel="noopener">Book This Deal</a>
      </div>

      <!-- Card 2: Brake Special -->
      <div class="special-card">
        <div class="sp-badge">Limited Time Offer</div>
        <div class="sp-price"><sup>$</sup>99</div>
        <div class="sp-service">Brake Special — Per Axle</div>
        <div class="sp-action">Labor only. Must purchase parts with us. Pads &amp; rotor resurfacing extra. Cannot be combined.</div>
        <div class="sp-exp">Expires March 31, 2026</div>
        <a class="sp-cta" href="https://eetirez.com/appointments" target="_blank" rel="noopener">Book This Deal</a>
      </div>

      <!-- Card 3: Repair Service Discount -->
      <div class="special-card">
        <div class="sp-badge">Limited Time Offer</div>
        <div class="sp-price sp-pct">10% OFF</div>
        <div class="sp-service">Any Repair Service</div>
        <div class="sp-action">Max $100 discount per customer per visit. Cannot be combined with other offers.</div>
        <div class="sp-exp">Expires March 31, 2026</div>
        <a class="sp-cta" href="https://eetirez.com/appointments" target="_blank" rel="noopener">Book This Deal</a>
      </div>

    </div><!-- /.specials-grid -->

    <p class="specials-footnote">
      More deals available — &nbsp;<a href="https://eetirez.com/specials/" target="_blank" rel="noopener">View All Current Specials →</a>
    </p>

  </div><!-- /.wrap -->
</div><!-- /.specials-strip -->

<!-- ══════════════════════════════════════════════
  VEHICLES WE SERVICE — from eetirez.com/vehicles/
  BMW, Chevrolet, Ford, Hyundai, Kia, Toyota
══════════════════════════════════════════════ -->

<!-- 8. VEHICLES ─────────────────────────────── -->
<section class="section" id="vehicles" aria-labelledby="vehicles-h2">
  <div class="wrap">

    <!-- Section header -->
    <div style="text-align:center;margin-bottom:36px;">
      <div class="eyebrow">Vehicles We Service</div>
      <h2 class="h2" id="vehicles-h2">We Specialize In All Makes &amp; Models</h2>
      <p style="font-size:16px;color:var(--muted-text);margin-top:12px;max-width:600px;margin-left:auto;margin-right:auto;">At E&amp;E Tires Automotive Center in Banning, CA, we specialize in servicing a wide variety of vehicles. Our familiarity with specific repair procedures guarantees swift, precise, and correct service every time.</p>
    </div>

    <!-- 3×2 horizontal card grid -->
    <div class="vehicles-grid">

      <a href="https://eetirez.com/vehicles/bmw-service-repair/" target="_blank" rel="noopener" class="vehicle-card">
        <div class="vehicle-logo">
          <img src="https://eetirez.com/wp-content/uploads/2024/01/bmw-logo.png"
               alt="BMW" loading="lazy">
        </div>
        <div class="vehicle-text">
          <span class="vehicle-make">BMW</span>
          <span class="vehicle-sub">Service &amp; Repair</span>
        </div>
      </a>

      <a href="https://eetirez.com/vehicles/chevrolet-service-repair/" target="_blank" rel="noopener" class="vehicle-card">
        <div class="vehicle-logo">
          <img src="https://eetirez.com/wp-content/uploads/2024/01/chevrolet-logo.webp"
               alt="Chevrolet" loading="lazy">
        </div>
        <div class="vehicle-text">
          <span class="vehicle-make">Chevrolet</span>
          <span class="vehicle-sub">Service &amp; Repair</span>
        </div>
      </a>

      <a href="https://eetirez.com/vehicles/ford-service-repair/" target="_blank" rel="noopener" class="vehicle-card">
        <div class="vehicle-logo">
          <img src="https://eetirez.com/wp-content/uploads/2024/01/ford-logo.webp"
               alt="Ford" loading="lazy">
        </div>
        <div class="vehicle-text">
          <span class="vehicle-make">Ford</span>
          <span class="vehicle-sub">Service &amp; Repair</span>
        </div>
      </a>

      <a href="https://eetirez.com/vehicles/hyundai-service-repair/" target="_blank" rel="noopener" class="vehicle-card">
        <div class="vehicle-logo">
          <img src="https://eetirez.com/wp-content/uploads/2024/01/hyundai-logo.webp"
               alt="Hyundai" loading="lazy">
        </div>
        <div class="vehicle-text">
          <span class="vehicle-make">Hyundai</span>
          <span class="vehicle-sub">Service &amp; Repair</span>
        </div>
      </a>

      <a href="https://eetirez.com/vehicles/kia-service-repair/" target="_blank" rel="noopener" class="vehicle-card">
        <div class="vehicle-logo">
          <img src="https://eetirez.com/wp-content/uploads/2024/01/kia-logo.webp"
               alt="Kia" loading="lazy">
        </div>
        <div class="vehicle-text">
          <span class="vehicle-make">Kia</span>
          <span class="vehicle-sub">Service &amp; Repair</span>
        </div>
      </a>

      <a href="https://eetirez.com/vehicles/toyota-service-repair/" target="_blank" rel="noopener" class="vehicle-card">
        <div class="vehicle-logo">
          <img src="https://eetirez.com/wp-content/uploads/2024/01/toyota-logo.webp"
               alt="Toyota" loading="lazy">
        </div>
        <div class="vehicle-text">
          <span class="vehicle-make">Toyota</span>
          <span class="vehicle-sub">Service &amp; Repair</span>
        </div>
      </a>

    </div><!-- /.vehicles-grid -->

    <!-- CTA button -->
    <div style="text-align:center;">
      <a class="btn btn-blue btn-md" href="/services#vehicles">View Vehicles We Service</a>
    </div>

    <!-- Vehicle lineup image — centered, full width, overlaps next section -->
    <div class="vehicle-lineup-wrap">
      <img class="vehicle-lineup-img"
           src="https://eetirez.com/wp-content/uploads/2024/12/toyota-vehicle-lineup-xwr381jpzg0zutl0.png"
           alt="Vehicle lineup — BMW, Chevrolet, Ford, Hyundai, Kia, Toyota"
           loading="lazy">
    </div>

  </div>
</section>



<!-- ══════════════════════════════════════════════
  WARRANTY + SHOP PHOTOS + REVIEWS
  Moved from about.html to homepage
══════════════════════════════════════════════ -->

<!-- WARRANTY -->
<!-- ══════════════════════════════════════════════
  WARRANTY — Premium redesign
  Left: headline + trust bullets + CTA
  Right: TechNet badge + credibility
══════════════════════════════════════════════ -->
<section id="warranty" aria-labelledby="warranty-h2" style="
  position:relative;
  overflow:hidden;
  background:var(--dark-navy);
  padding:88px 0 80px;
">

  <!-- dark textured background layer -->
  <div aria-hidden="true" style="
    position:absolute;inset:0;pointer-events:none;
    background:
      repeating-linear-gradient(
        0deg,
        rgba(255,255,255,.012) 0px,
        rgba(255,255,255,.012) 1px,
        transparent 1px,
        transparent 56px
      ),
      repeating-linear-gradient(
        90deg,
        rgba(255,255,255,.012) 0px,
        rgba(255,255,255,.012) 1px,
        transparent 1px,
        transparent 56px
      );
  "></div>

  <!-- blue radial glow top-left -->
  <div aria-hidden="true" style="
    position:absolute;top:-160px;left:-160px;
    width:640px;height:640px;border-radius:50%;
    background:radial-gradient(circle,rgba(0,112,201,.22) 0%,transparent 65%);
    pointer-events:none;
  "></div>

  <!-- blue radial glow bottom-right -->
  <div aria-hidden="true" style="
    position:absolute;bottom:-120px;right:-80px;
    width:480px;height:480px;border-radius:50%;
    background:radial-gradient(circle,rgba(0,112,201,.14) 0%,transparent 65%);
    pointer-events:none;
  "></div>

  <div class="wrap" style="position:relative;z-index:2;">

    <!-- ── TWO-COLUMN LAYOUT ── -->
    <div style="
      display:grid;
      grid-template-columns:1fr 440px;
      gap:72px;
      align-items:center;
    ">

      <!-- ══════════════
           LEFT COLUMN
      ══════════════ -->
      <div>

        <!-- Eyebrow -->
        <div style="
          display:inline-flex;align-items:center;gap:10px;
          background:rgba(0,112,201,.15);
          border:1px solid rgba(0,112,201,.30);
          border-radius:3px;
          padding:6px 14px;
          margin-bottom:24px;
        ">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 1L8.8 5.1L13.3 5.6L10.1 8.5L11 13L7 10.7L3 13L3.9 8.5L0.7 5.6L5.2 5.1Z"
                  fill="#0070C9" stroke="#0070C9" stroke-width=".5"/>
          </svg>
          <span style="
            font-family:var(--font-display);font-size:13px;font-weight:700;
            letter-spacing:.16em;text-transform:uppercase;
            color:var(--blue-light);
          ">Nationwide Protection</span>
        </div>

        <!-- Main headline -->
        <h2 id="warranty-h2" style="
          font-family:var(--font-display);
          font-size:clamp(36px,5vw,60px);
          font-weight:700;
          text-transform:uppercase;
          line-height:1.0;
          color:var(--white);
          margin-bottom:8px;
          letter-spacing:-.01em;
        ">24 Month /</h2>
        <h2 aria-hidden="true" style="
          font-family:var(--font-display);
          font-size:clamp(36px,5vw,60px);
          font-weight:700;
          text-transform:uppercase;
          line-height:1.0;
          color:var(--blue);
          margin-bottom:24px;
          letter-spacing:-.01em;
        ">24,000 Mile<br>Nationwide Warranty</h2>

        <!-- Trust paragraph -->
        <p style="
          font-size:17px;
          color:rgba(255,255,255,.62);
          line-height:1.75;
          max-width:520px;
          margin-bottom:36px;
        ">When you leave our shop, you leave protected. Every repair we perform is backed by our industry-leading nationwide warranty — giving you total peace of mind whether you're driving in Banning or across the country.</p>

        <!-- Trust bullet points -->
        <div style="
          display:flex;flex-direction:column;gap:16px;
          margin-bottom:44px;
        ">

          <!-- Bullet 1 -->
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="
              width:44px;height:44px;flex-shrink:0;
              background:rgba(0,112,201,.18);
              border:1px solid rgba(0,112,201,.35);
              border-radius:var(--r8);
              display:flex;align-items:center;justify-content:center;
            ">
              <!-- globe / nationwide icon -->
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0070C9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="10"/>
                <line x1="2" y1="12" x2="22" y2="12"/>
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </div>
            <div>
              <div style="
                font-family:var(--font-display);font-size:18px;font-weight:700;
                text-transform:uppercase;letter-spacing:.04em;
                color:var(--white);margin-bottom:3px;
              ">Nationwide Coverage</div>
              <div style="font-size:14px;color:rgba(255,255,255,.50);line-height:1.6;">
                Honored at thousands of TechNet-affiliated shops across the country — not just here in Banning.
              </div>
            </div>
          </div>

          <!-- Bullet 2 -->
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="
              width:44px;height:44px;flex-shrink:0;
              background:rgba(0,112,201,.18);
              border:1px solid rgba(0,112,201,.35);
              border-radius:var(--r8);
              display:flex;align-items:center;justify-content:center;
            ">
              <!-- shield-check / certified icon -->
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0070C9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div>
              <div style="
                font-family:var(--font-display);font-size:18px;font-weight:700;
                text-transform:uppercase;letter-spacing:.04em;
                color:var(--white);margin-bottom:3px;
              ">Certified Technicians</div>
              <div style="font-size:14px;color:rgba(255,255,255,.50);line-height:1.6;">
                Every repair performed by trained, certified professionals who stand behind their work.
              </div>
            </div>
          </div>

          <!-- Bullet 3 -->
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="
              width:44px;height:44px;flex-shrink:0;
              background:rgba(0,112,201,.18);
              border:1px solid rgba(0,112,201,.35);
              border-radius:var(--r8);
              display:flex;align-items:center;justify-content:center;
            ">
              <!-- award / quality icon -->
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0070C9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="6"/>
                <path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
              </svg>
            </div>
            <div>
              <div style="
                font-family:var(--font-display);font-size:18px;font-weight:700;
                text-transform:uppercase;letter-spacing:.04em;
                color:var(--white);margin-bottom:3px;
              ">Quality Parts &amp; Workmanship</div>
              <div style="font-size:14px;color:rgba(255,255,255,.50);line-height:1.6;">
                We use premium OEM-grade parts — because your warranty is only as good as what's under the hood.
              </div>
            </div>
          </div>

          <!-- Bullet 4 -->
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="
              width:44px;height:44px;flex-shrink:0;
              background:rgba(0,112,201,.18);
              border:1px solid rgba(0,112,201,.35);
              border-radius:var(--r8);
              display:flex;align-items:center;justify-content:center;
            ">
              <!-- heart / peace-of-mind icon -->
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0070C9" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
              </svg>
            </div>
            <div>
              <div style="
                font-family:var(--font-display);font-size:18px;font-weight:700;
                text-transform:uppercase;letter-spacing:.04em;
                color:var(--white);margin-bottom:3px;
              ">Peace of Mind on Every Repair</div>
              <div style="font-size:14px;color:rgba(255,255,255,.50);line-height:1.6;">
                Drive away knowing your vehicle — and your investment — is fully protected.
              </div>
            </div>
          </div>

        </div><!-- /.bullets -->

        <!-- CTA button -->
        <div style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <a class="btn btn-blue btn-lg"
             href="https://eetirez.com/appointments"
             target="_blank" rel="noopener"
             style="font-size:18px;padding:16px 32px;letter-spacing:1.4px;">
            Schedule Your Appointment
          </a>
          <a href="tel:9517970013"
             style="
               font-family:var(--font-display);font-size:17px;font-weight:500;
               letter-spacing:.06em;color:rgba(255,255,255,.55);
               text-decoration:none;display:flex;align-items:center;gap:8px;
               transition:color .15s;
             "
             onmouseover="this.style.color='rgba(255,255,255,.9)'"
             onmouseout="this.style.color='rgba(255,255,255,.55)'">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.6a16 16 0 0 0 6 6l.96-.96a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 18z"/></svg>
            951-797-0013
          </a>
        </div>

      </div><!-- /left col -->


      <!-- ══════════════
           RIGHT COLUMN
      ══════════════ -->
      <div style="
        display:flex;flex-direction:column;align-items:center;gap:28px;
      ">

        <!-- TechNet Badge — premium SVG recreation of the actual badge -->
        <div style="
          position:relative;
          width:100%;max-width:380px;
        ">
          <!-- outer glow ring -->
          <div aria-hidden="true" style="
            position:absolute;inset:-20px;border-radius:24px;
            background:radial-gradient(circle,rgba(0,112,201,.30) 0%,transparent 70%);
            pointer-events:none;
          "></div>

          <!-- Badge card -->
          <div style="
            position:relative;
            background:linear-gradient(160deg,#0a1a2e 0%,#071220 100%);
            border:1px solid rgba(0,112,201,.25);
            border-radius:20px;
            padding:36px 32px 28px;
            box-shadow:
              0 0 0 1px rgba(255,255,255,.04),
              0 20px 60px rgba(0,0,0,.55),
              0 0 40px rgba(0,112,201,.15);
            text-align:center;
          ">

            <!-- TechNet wordmark SVG badge -->
            <div style="margin-bottom:20px;">
              <svg viewBox="0 0 280 120" width="240" height="103"
                   xmlns="http://www.w3.org/2000/svg"
                   role="img" aria-label="TechNet Nationwide Warranty">

                <!-- Badge background shape -->
                <rect x="4" y="4" width="272" height="112" rx="12" ry="12"
                      fill="#0a1f3c" stroke="rgba(0,112,201,.5)" stroke-width="1.5"/>

                <!-- Top blue accent bar -->
                <rect x="4" y="4" width="272" height="32" rx="12" ry="12" fill="#0070C9"/>
                <rect x="4" y="24" width="272" height="12" fill="#0070C9"/>

                <!-- "TECHNET" in bold white on blue bar -->
                <text x="140" y="26"
                      text-anchor="middle"
                      font-family="Arial Black, Arial, sans-serif"
                      font-size="18"
                      font-weight="900"
                      fill="#ffffff"
                      letter-spacing="5">TECHNET</text>

                <!-- Star cluster (5 stars) -->
                <g fill="#FFB800" transform="translate(90,48)">
                  <!-- Star 1 -->
                  <polygon points="10,2 12.2,7.8 18.5,7.8 13.4,11.5 15.3,17.5 10,13.8 4.7,17.5 6.6,11.5 1.5,7.8 7.8,7.8" transform="translate(0,0)" opacity="0.95"/>
                  <!-- Star 2 -->
                  <polygon points="10,2 12.2,7.8 18.5,7.8 13.4,11.5 15.3,17.5 10,13.8 4.7,17.5 6.6,11.5 1.5,7.8 7.8,7.8" transform="translate(25,0)" opacity="0.95"/>
                  <!-- Star 3 -->
                  <polygon points="10,2 12.2,7.8 18.5,7.8 13.4,11.5 15.3,17.5 10,13.8 4.7,17.5 6.6,11.5 1.5,7.8 7.8,7.8" transform="translate(50,0)" opacity="0.95"/>
                  <!-- Star 4 -->
                  <polygon points="10,2 12.2,7.8 18.5,7.8 13.4,11.5 15.3,17.5 10,13.8 4.7,17.5 6.6,11.5 1.5,7.8 7.8,7.8" transform="translate(75,0)" opacity="0.95"/>
                  <!-- Star 5 -->
                  <polygon points="10,2 12.2,7.8 18.5,7.8 13.4,11.5 15.3,17.5 10,13.8 4.7,17.5 6.6,11.5 1.5,7.8 7.8,7.8" transform="translate(100,0)" opacity="0.95"/>
                </g>

                <!-- "NATIONWIDE WARRANTY" large text -->
                <text x="140" y="86"
                      text-anchor="middle"
                      font-family="Arial, sans-serif"
                      font-size="13"
                      font-weight="700"
                      fill="#ffffff"
                      letter-spacing="2.5">NATIONWIDE WARRANTY</text>

                <!-- Bottom subline -->
                <text x="140" y="104"
                      text-anchor="middle"
                      font-family="Arial, sans-serif"
                      font-size="9"
                      font-weight="400"
                      fill="rgba(255,255,255,.45)"
                      letter-spacing="1.5">24 MONTHS / 24,000 MILES</text>

              </svg>
            </div>

            <!-- Divider -->
            <div style="height:1px;background:rgba(255,255,255,.08);margin:0 -4px 20px;"></div>

            <!-- Stats row below badge -->
            <div style="
              display:grid;grid-template-columns:1fr 1px 1fr 1px 1fr;
              gap:0;align-items:center;
            ">
              <div style="text-align:center;padding:4px 8px;">
                <div style="
                  font-family:var(--font-display);font-size:26px;font-weight:700;
                  color:var(--blue);line-height:1;
                ">24</div>
                <div style="font-family:var(--font-display);font-size:10px;font-weight:600;
                  letter-spacing:.1em;text-transform:uppercase;
                  color:rgba(255,255,255,.35);margin-top:3px;">Months</div>
              </div>
              <div style="height:32px;background:rgba(255,255,255,.08);"></div>
              <div style="text-align:center;padding:4px 8px;">
                <div style="
                  font-family:var(--font-display);font-size:26px;font-weight:700;
                  color:var(--blue);line-height:1;
                ">24K</div>
                <div style="font-family:var(--font-display);font-size:10px;font-weight:600;
                  letter-spacing:.1em;text-transform:uppercase;
                  color:rgba(255,255,255,.35);margin-top:3px;">Miles</div>
              </div>
              <div style="height:32px;background:rgba(255,255,255,.08);"></div>
              <div style="text-align:center;padding:4px 8px;">
                <div style="
                  font-family:var(--font-display);font-size:26px;font-weight:700;
                  color:var(--blue);line-height:1;
                ">🌎</div>
                <div style="font-family:var(--font-display);font-size:10px;font-weight:600;
                  letter-spacing:.1em;text-transform:uppercase;
                  color:rgba(255,255,255,.35);margin-top:3px;">Nationwide</div>
              </div>
            </div>

          </div><!-- /badge card -->
        </div><!-- /badge wrap -->

        <!-- Trust micro-statement below badge -->
        <div style="
          background:rgba(0,112,201,.10);
          border:1px solid rgba(0,112,201,.20);
          border-radius:var(--r8);
          padding:16px 20px;
          width:100%;max-width:380px;
          display:flex;align-items:flex-start;gap:12px;
        ">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
               stroke="#0070C9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
               style="flex-shrink:0;margin-top:2px;" aria-hidden="true">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          <p style="font-size:13px;color:rgba(255,255,255,.55);line-height:1.65;margin:0;">
            <strong style="color:rgba(255,255,255,.85);font-weight:600;">Every repair is covered.</strong>
            If an issue arises, contact us — we'll make it right, no hassle, no runaround.
          </p>
        </div>

        <!-- Learn more link -->
        <a href="https://eetirez.com/warranty/" target="_blank" rel="noopener"
           style="
             font-family:var(--font-accent);font-size:15px;font-weight:600;
             color:var(--blue-light);letter-spacing:.06em;text-decoration:none;
             display:flex;align-items:center;gap:6px;
             transition:gap .15s;
           "
           onmouseover="this.style.gap='10px'"
           onmouseout="this.style.gap='6px'">
          Learn More About Our Warranty
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
               stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
               aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
        </a>

      </div><!-- /right col -->

    </div><!-- /two-col grid -->

  </div><!-- /wrap -->
</section>

<!-- responsive styles for warranty section -->
<!-- ══════════════════════════════════════════════
  SHOP PHOTOS — real shop images from eetirez.com
══════════════════════════════════════════════ -->
<section id="shop-photos" aria-label="Shop photos" style="
  background:var(--charcoal);
  padding:0;
  overflow:hidden;
  position:relative;
">
  <!-- Section label -->
  <div style="
    text-align:center;
    padding:52px 24px 32px;
  ">
    <div class="eyebrow eyebrow-light">Our Shop</div>
    <h2 class="h2 h2-light">See Us in Action</h2>
    <p style="font-size:15px;color:rgba(255,255,255,.50);margin-top:10px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.7;">
      A clean, fully-equipped facility staffed by ASE-certified technicians — Banning, CA's most trusted auto repair shop.
    </p>
  </div>

  <!-- ── Sliding Carousel ── -->
  
  <div class="sp-outer">
    <!-- Prev arrow -->
    <button class="sp-arrow sp-prev" onclick="spMove(-1)" aria-label="Previous photo">
      <svg viewBox="0 0 24 24" width="20" height="20"><polyline points="15 18 9 12 15 6"/></svg>
    </button>

    <!-- Carousel viewport -->
    <div class="sp-carousel-wrap">
      <div class="sp-track" id="spTrack">
        <div class="sp-slide">
          <img src="https://eetirez.com/wp-content/uploads/2025/02/inside-pic-5-scaled.jpg"
               alt="Inside E&E Tires Automotive Center — Banning, CA shop interior" loading="lazy">
        </div>
        <div class="sp-slide">
          <img src="https://eetirez.com/wp-content/uploads/2025/02/2025-02-05.jpg"
               alt="E&E Tires service bay — tire and auto repair in Banning, CA" loading="lazy">
        </div>
        <div class="sp-slide">
          <img src="https://eetirez.com/wp-content/uploads/2025/02/305770820_449721620543452_8513508122414029399_n.jpg"
               alt="E&E Tires Automotive Center team — certified technicians in Banning, CA" loading="lazy">
        </div>
        <div class="sp-slide">
          <img src="https://eetirez.com/wp-content/uploads/2025/02/2022-09-23-scaled.jpg"
               alt="Auto repair in progress at E&E Tires — quality workmanship in Banning, CA" loading="lazy">
        </div>
        <div class="sp-slide">
          <img src="https://eetirez.com/wp-content/uploads/2025/02/20240328_143637-scaled.jpg"
               alt="Vehicle on lift at E&E Tires Automotive Center — Banning, CA" loading="lazy">
        </div>
        <div class="sp-slide">
          <img src="https://eetirez.com/wp-content/uploads/2025/02/2025-02-06-scaled.jpg"
               alt="E&E Tires Automotive Center — professional tire and auto service in Banning, CA" loading="lazy">
        </div>
      </div>
    </div>

    <!-- Next arrow -->
    <button class="sp-arrow sp-next" onclick="spMove(1)" aria-label="Next photo">
      <svg viewBox="0 0 24 24" width="20" height="20"><polyline points="9 18 15 12 9 6"/></svg>
    </button>
  </div>

  <!-- Dot indicators -->
  <div class="sp-dots" id="spDots" role="tablist" aria-label="Photo navigation"></div>

  <!-- Carousel JS -->
  
  <!-- Bottom stats bar -->
  <div style="
    background:rgba(0,0,0,.4);
    padding:20px 24px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:48px;
    flex-wrap:wrap;
    border-top:1px solid rgba(255,255,255,.06);
    margin-top:4px;
  ">
    <div style="text-align:center;">
      <div style="font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--white);line-height:1;">25+</div>
      <div style="font-family:var(--font-display);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:3px;">Cars Served Daily</div>
    </div>
    <div style="width:1px;height:36px;background:rgba(255,255,255,.12);"></div>
    <div style="text-align:center;">
      <div style="font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--white);line-height:1;">ASE</div>
      <div style="font-family:var(--font-display);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:3px;">Certified Technicians</div>
    </div>
    <div style="width:1px;height:36px;background:rgba(255,255,255,.12);"></div>
    <div style="text-align:center;">
      <div style="font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--white);line-height:1;">2-Yr</div>
      <div style="font-family:var(--font-display);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:3px;">Warranty on All Repairs</div>
    </div>
    <div style="width:1px;height:36px;background:rgba(255,255,255,.12);"></div>
    <div style="text-align:center;">
      <div style="font-family:var(--font-display);font-size:28px;font-weight:700;color:var(--white);line-height:1;">4.9★</div>
      <div style="font-family:var(--font-display);font-size:11px;font-weight:600;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-top:3px;">Google Rating</div>
    </div>
  </div>
</section>

<!-- REVIEWS -->
<!-- ══════════════════════════════════════════════
  REVIEWS — real Google reviews from eetirez.com/reviews/
  240 verified Google reviews
══════════════════════════════════════════════ -->
<section class="section" id="reviews" aria-labelledby="rev-h2">
  <div class="wrap">
    <div class="eyebrow">Testimonials</div>
    <h2 class="h2" id="rev-h2">We Make Our Customers Happy</h2>
    <div class="reviews-rating">
      <div class="rr-stars">★★★★★</div>
      <div class="rr-score">4.9 / 5</div>
      <div class="rr-count">240 reviews on Google</div>
      <a class="rr-google" href="https://maps.app.goo.gl/BammB54H9rfvozu36" target="_blank" rel="noopener" style="text-decoration:none;color:inherit;"><div class="rr-g-dot"></div> Review us on Google</a>
    </div>

    <div class="reviews-grid">
      <!-- Real review: Mercedes M — Google, 2 months ago -->
      <div class="rc reveal">
        <div class="rc-badge"><div class="rc-g"></div> Google</div>
        <div class="rc-stars">★★★★★</div>
        <p class="rc-text">"Was at the beginning of an hours long drive when I found a nail in my tire. Luckily I was only a few minutes away from this shop. They were able to get me out of there quickly. Staff was incredibly friendly, kept me updated, reassured me of the safety of my patched tire, and charged me incredibly reasonably."</p>
        <div class="rc-author">
          <div class="rc-avatar" style="background:#0070C9">MM</div>
          <div><div class="rc-name">Mercedes M.</div><div class="rc-source">Google · 2 months ago</div></div>
        </div>
      </div>
      <!-- Real review: Kari Cramp — Google, 9 months ago -->
      <div class="rc reveal d1">
        <div class="rc-badge"><div class="rc-g"></div> Google</div>
        <div class="rc-stars">★★★★★</div>
        <p class="rc-text">"Needed our tire fixed asap we called and they said bring it by they will look asap. We got there and they looked and fixed our tire within 15 min. Great customer service, very friendly and did a really good job and very honest about what was needed."</p>
        <div class="rc-author">
          <div class="rc-avatar" style="background:#1B6B3A">KC</div>
          <div><div class="rc-name">Kari Cramp</div><div class="rc-source">Google · 9 months ago</div></div>
        </div>
      </div>
      <!-- Real review: Adam Barrier — Google, 6 months ago -->
      <div class="rc reveal d2">
        <div class="rc-badge"><div class="rc-g"></div> Google</div>
        <div class="rc-stars">★★★★★</div>
        <p class="rc-text">"On vacation and in a rental. Had an issue with a tire. Got wonderful service, checked the car immediately, and had us out quickly. Friendly staff and great service!!"</p>
        <div class="rc-author">
          <div class="rc-avatar" style="background:#1a4a8a">AB</div>
          <div><div class="rc-name">Adam Barrier</div><div class="rc-source">Google · 6 months ago</div></div>
        </div>
      </div>
      <!-- Real review: Alex Mayfield — Google, 9 months ago -->
      <div class="rc reveal">
        <div class="rc-badge"><div class="rc-g"></div> Google</div>
        <div class="rc-stars">★★★★★</div>
        <p class="rc-text">"They did a great job on two of my cars — I had brake issues. They fixed them with reasonable pricing. And they do an inspection on your vehicle and let you know any other issues if they find any. I'm pretty pleased with the work they do and I will be back."</p>
        <div class="rc-author">
          <div class="rc-avatar" style="background:#7a3a00">AM</div>
          <div><div class="rc-name">Alex Mayfield</div><div class="rc-source">Google · 9 months ago</div></div>
        </div>
      </div>
      <!-- Real review: Dawn Peterson — Google, 4 months ago -->
      <div class="rc reveal d1">
        <div class="rc-badge"><div class="rc-g"></div> Google</div>
        <div class="rc-stars">★★★★★</div>
        <p class="rc-text">"My partner and I are on a road trip from Washington and heard a squealing noise on the freeway. Stopped here to check everything out — the guy who helped us was very friendly and helpful. Thank you guys."</p>
        <div class="rc-author">
          <div class="rc-avatar" style="background:#5a1a7a">DP</div>
          <div><div class="rc-name">Dawn Peterson</div><div class="rc-source">Google · 4 months ago</div></div>
        </div>
      </div>
      <!-- Real review: Viridiana Ortiz — Google, 6 months ago -->
      <div class="rc reveal d2">
        <div class="rc-badge"><div class="rc-g"></div> Google</div>
        <div class="rc-stars">★★★★★</div>
        <p class="rc-text">"Honest and reliable service. Thank you E &amp; E Tires!"</p>
        <div class="rc-author">
          <div class="rc-avatar" style="background:#171C1E">VO</div>
          <div><div class="rc-name">Viridiana Ortiz</div><div class="rc-source">Google · 6 months ago</div></div>
        </div>
      </div>
    </div>

    <!-- TRUST BADGES -->
    <div class="trust-badges" role="list">
      <div class="tb" role="listitem">
        <span class="tb-icon">🛡️</span>
        <div><div class="tb-title">2-Yr / 24K Mile Warranty</div><div class="tb-sub">On every repair</div></div>
      </div>
      <div class="tb" role="listitem">
        <span class="tb-icon">💳</span>
        <div><div class="tb-title">Financing Available</div><div class="tb-sub">Acima &amp; Snap Finance</div></div>
      </div>
      <div class="tb" role="listitem">
        <span class="tb-icon">🚗</span>
        <div><div class="tb-title">All Makes &amp; Models</div><div class="tb-sub">Foreign and domestic</div></div>
      </div>
      <div class="tb" role="listitem">
        <span class="tb-icon">📍</span>
        <div><div class="tb-title">Banning, CA</div><div class="tb-sub">1550 E Ramsey St</div></div>
      </div>
      <div class="tb" role="listitem">
        <span class="tb-icon">⭐</span>
        <div><div class="tb-title">240 Google Reviews</div><div class="tb-sub">4.9/5 rating</div></div>
      </div>
    </div>
  </div>
</section>

<!-- 9. LOCATION + CONTACT ───────────────────── -->
<!-- ══════════════════════════════════════════════
  LOCATION — SECTION 8
  Purpose: In-person visit conversion
  Layout: 2-col — details/hours + map
══════════════════════════════════════════════ -->
<section class="section section-dark" id="location" aria-labelledby="loc-h2" style="padding-top:104px;">
  <div class="wrap">
    <div style="text-align:center;margin-bottom:44px;">
      <div class="eyebrow eyebrow-light">Find Us</div>
      <h2 class="h2 h2-light" id="loc-h2">Located in Banning, CA</h2>
    </div>
    <div class="loc-inner">
      <div class="loc-details reveal">
        <div class="ld">
          <div class="ld-icon">📍</div>
          <div>
            <div class="ld-label">Address</div>
            <div class="ld-val">
              <strong>1550 E Ramsey St</strong><br>
              Banning, CA 92220<br>
              <a href="https://maps.app.goo.gl/BammB54H9rfvozu36" target="_blank" rel="noopener">Get Directions →</a>
            </div>
          </div>
        </div>
        <div class="ld">
          <div class="ld-icon">📞</div>
          <div>
            <div class="ld-label">Phone</div>
            <div class="ld-val">
              <a href="tel:9517970013" style="font-family:var(--font-display);font-size:26px;font-weight:700;color:var(--white);">951-797-0013</a><br>
              <span style="font-size:13px;color:rgba(255,255,255,.3);">Call or text during business hours</span>
            </div>
          </div>
        </div>
        <div class="ld">
          <div class="ld-icon">🕐</div>
          <div>
            <div class="ld-label">Hours of Operation</div>
            <div class="hours-list" role="list">
              <div class="hr-row today" role="listitem"><span class="hr-day">Monday</span><span>8:00 AM – 5:00 PM</span></div>
              <div class="hr-row" role="listitem"><span class="hr-day">Tuesday</span><span>8:00 AM – 5:00 PM</span></div>
              <div class="hr-row" role="listitem"><span class="hr-day">Wednesday</span><span>8:00 AM – 5:00 PM</span></div>
              <div class="hr-row" role="listitem"><span class="hr-day">Thursday</span><span>8:00 AM – 5:00 PM</span></div>
              <div class="hr-row" role="listitem"><span class="hr-day">Friday</span><span>8:00 AM – 5:00 PM</span></div>
              <div class="hr-row" role="listitem"><span class="hr-day">Saturday</span><span>8:00 AM – 5:00 PM</span></div>
              <div class="hr-row" role="listitem"><span class="hr-day">Sunday</span><span class="hr-closed">Closed</span></div>
            </div>
          </div>
        </div>
        <div class="loc-ctas">
          <a class="btn btn-blue btn-md" href="tel:9517970013">📞 Call Now</a>
          <a class="btn btn-outline-white btn-md" href="https://maps.app.goo.gl/BammB54H9rfvozu36" target="_blank" rel="noopener">🗺️ Directions</a>
          <a class="btn btn-outline-white btn-md" href="#book">📅 Book Online</a>
        </div>
      </div>

      <div class="reveal d1">
        <div class="map-box">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3301.5!2d-116.8760!3d33.9230!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x80db5b3b6b6b6b6b%3A0x0!2s1550+E+Ramsey+St%2C+Banning%2C+CA+92220!5e0!3m2!1sen!2sus!4v1"
            allowfullscreen="" loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
            title="E&E Tires Automotive Center — 1550 E Ramsey St, Banning, CA 92220"
          ></iframe>
        </div>
      </div>
    </div>
  </div>
</section>


<!-- 10. FOOTER ──────────────────────────────── -->
<footer class="footer" role="contentinfo">
  <div class="wrap">
    <div class="footer-grid">
      <div>
        <!-- Real logo in footer -->
        <div class="footer-logo">
          <img class="footer-logo-img"
            src="https://eetirez.com/wp-content/uploads/2025/02/logo-e-e-tires-banning-ca-92220-auto-repair.png"
            alt="E&E Tires Automotive Center"
            onerror="this.style.display='none';this.nextElementSibling.style.display='block';"
          >
          <div style="display:none;font-family:var(--font-display);font-size:20px;font-weight:700;color:var(--white);text-transform:uppercase;">E&amp;E Tires Automotive Center</div>
        </div>
        <p class="footer-desc">E&amp;E Tires Automotive Center is a dedicated auto repair and tire shop serving Banning, CA, and the surrounding areas. Committed to transparency and customer satisfaction.</p>
        <!-- FIND US ON — exact label from eetirez.com footer -->
        <div style="font-family:var(--font-display);font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.35);margin:16px 0 8px;">Find Us On</div>
        <div class="footer-social" aria-label="Social links">
          <a class="fsoc" href="https://www.facebook.com/eetires/" target="_blank" rel="noopener" aria-label="Facebook" title="Facebook">f</a>
          <a class="fsoc" href="#" aria-label="Instagram" title="Instagram">in</a>
          <a class="fsoc" href="https://maps.app.goo.gl/BammB54H9rfvozu36" target="_blank" rel="noopener" aria-label="Google" title="Google">G</a>
          <a class="fsoc" href="#" aria-label="YouTube" title="YouTube">▶</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Services</div>
        <div class="footer-links">
          <a class="footer-link" href="https://eetirez.com/services/oil-changes/" target="_blank" rel="noopener">Oil Changes</a>
          <a class="footer-link" href="https://eetirez.com/services/new-tires/" target="_blank" rel="noopener">New Tires</a>
          <a class="footer-link" href="https://eetirez.com/services/tire-rotations/" target="_blank" rel="noopener">Tire Rotations</a>
          <a class="footer-link" href="https://eetirez.com/services/brake-repair/" target="_blank" rel="noopener">Brake Repairs &amp; Replacements</a>
          <a class="footer-link" href="https://eetirez.com/services/air-conditioning-repair/" target="_blank" rel="noopener">Air Conditioning Repair</a>
          <a class="footer-link" href="https://eetirez.com/services/engine-repairs-replacements/" target="_blank" rel="noopener">Engine Repairs &amp; Replacements</a>
          <a class="footer-link" href="https://eetirez.com/services/wheel-alignment/" target="_blank" rel="noopener">Wheel Alignment</a>
          <a class="footer-link" href="https://eetirez.com/services/transmission-repair-replacement/" target="_blank" rel="noopener">Transmission Repair</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Our Shop</div>
        <div class="footer-links">
          <a class="footer-link" href="https://eetirez.com/about-us/" target="_blank" rel="noopener">About Us</a>
          <a class="footer-link" href="https://eetirez.com/specials/" target="_blank" rel="noopener">Specials</a>
          <a class="footer-link" href="https://eetirez.com/financing/" target="_blank" rel="noopener">Financing</a>
          <a class="footer-link" href="https://eetirez.com/warranty/" target="_blank" rel="noopener">Warranty</a>
          <a class="footer-link" href="https://eetirez.com/reviews/" target="_blank" rel="noopener">Reviews</a>
          <a class="footer-link" href="/about#blog" target="_blank" rel="noopener">About Us</a>
          <a class="footer-link" href="/about" target="_blank" rel="noopener">Warranty</a>
          <a class="footer-link" href="/services#vehicles" target="_blank" rel="noopener">Vehicles We Service</a>
        </div>
      </div>
      <div>
        <div class="footer-col-title">Contact</div>
        <div class="footer-links">
          <div style="font-size:14px;color:rgba(255,255,255,.45);line-height:1.8;">1550 E Ramsey St<br>Banning, CA 92220</div>
          <a class="footer-link" href="tel:9517970013" style="font-family:var(--font-display);font-size:20px;font-weight:600;color:rgba(255,255,255,.75);letter-spacing:.04em;">951-797-0013</a>
          <div style="font-size:12.5px;color:rgba(255,255,255,.3);line-height:1.7;">Mon–Sat: 8:00 AM – 5:00 PM<br>Sunday: Closed</div>
          <a class="btn btn-blue btn-sm" href="https://eetirez.com/appointments" target="_blank" rel="noopener" style="margin-top:12px;display:inline-flex;">Make An Appointment</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      <div class="footer-copy">© 2026 E&amp;E Tires Automotive Center · Banning, CA ·
        <a href="https://eetirez.com" target="_blank" rel="noopener" style="color:inherit;">eetirez.com</a>
      </div>
      <div class="footer-powered">
        <div class="fp-dot"></div>
        Powered by <strong>GrowthOS AutoRepair</strong>
      </div>
    </div>
  </div>
</footer>


<!-- ══════════════════════════════════════════════
  JAVASCRIPT
══════════════════════════════════════════════ -->
`
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <SiteScripts page="index" />
    </>
  )
}
