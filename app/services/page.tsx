import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Auto Repair Services | E&E Tires Automotive Center',
  description: 'Full-service tire and auto repair in Banning, CA. Oil changes, brakes, AC, engine repair, and more.',
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
        <a class="nav-lnk cur" class="nav-lnk cur" href="/services">Services</a>
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


<!-- PAGE HERO -->
<section style="background:var(--dark-navy);padding:64px 0 48px;color:var(--white);text-align:center">
  <div class="container">
    <div class="eyebrow" style="color:var(--blue)">E&amp;E Tires Banning, CA</div>
    <h1 class="h1" style="color:var(--white);margin-top:8px">Auto Repair Services</h1>
    <p style="color:rgba(255,255,255,.7);font-size:1.05rem;max-width:560px;margin:16px auto 28px;line-height:1.7">
      Full-service tire and auto repair shop serving Banning and the Inland Empire. ASE-certified technicians. 2-year / 24,000-mile warranty on all repairs.
    </p>
    <a href="https://eetirez.com/appointments" class="btn">Book an Appointment</a>
  </div>
</section>

<!-- FULL SERVICE LIST -->
<!-- ══════════════════════════════════════════════
  SERVICES — exact headings from eetirez.com homepage
  "Auto Repair Services" / "WHAT WE DO"
══════════════════════════════════════════════ -->
<section class="section" id="services" aria-labelledby="svc-h2">
  <div class="wrap">
    <div class="services-header">
      <div>
        <div class="eyebrow">Auto Repair Services</div>
        <h2 class="h2" id="svc-h2">What We Do</h2>
      </div>
      <a class="btn btn-blue btn-md" href="/services" target="_blank" rel="noopener">View All Services</a>
    </div>

    <!-- TABS -->
    <div class="svc-tabs" role="tablist" aria-label="Service categories">
      <button class="stab on" onclick="switchTab(this,'tires')" role="tab" id="tab-tires">🛞 Tire Services</button>
      <button class="stab" onclick="switchTab(this,'repair')" role="tab" id="tab-repair">🔧 Auto Repair</button>
    </div>


    <!-- TIRE SERVICES PANEL — names match eetirez.com/services/ exactly -->
    <div class="svc-panel on" id="panel-tires" role="tabpanel" aria-labelledby="tab-tires">
      <div class="svc-card reveal">
        <div class="sc-icon">🛞</div>
        <div class="sc-name">New Tires</div>
        <p class="sc-desc">Bridgestone, Goodyear, Dunlop, Michelin, M2, and more. We carry tires for every vehicle, budget, and driving style — same-day installation available.</p>
        <a class="sc-link" href="https://eetirez.com/services/new-tires/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d1">
        <div class="sc-icon">🔄</div>
        <div class="sc-name">Tire Rotations</div>
        <p class="sc-desc">Extend tire life with regular rotations. Proper rotation ensures even tread wear across all four tires, saving you money and improving safety.</p>
        <a class="sc-link" href="https://eetirez.com/services/tire-rotations/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d2">
        <div class="sc-icon">🩹</div>
        <div class="sc-name">Tire Repair &amp; Replacement</div>
        <p class="sc-desc">Flat tire or slow leak? Our technicians perform fast, professional tire repairs. Most repairs completed quickly while you wait.</p>
        <a class="sc-link" href="https://eetirez.com/services/tire-repair-replacement/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal">
        <div class="sc-icon">🔧</div>
        <div class="sc-name">Tire Installation Services</div>
        <p class="sc-desc">Professional mounting and balancing for every set of tires we install. State-of-the-art equipment for a smooth, safe ride every time.</p>
        <a class="sc-link" href="https://eetirez.com/services/tire-installation-services/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d1">
        <div class="sc-icon">📐</div>
        <div class="sc-name">Wheel Alignment</div>
        <p class="sc-desc">Proper alignment protects your tires and keeps your vehicle tracking straight. We adjust camber, caster, and toe to manufacturer specifications.</p>
        <a class="sc-link" href="https://eetirez.com/services/wheel-alignment/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d2">
        <div class="sc-icon">🔍</div>
        <div class="sc-name">Inspections</div>
        <p class="sc-desc">Comprehensive vehicle inspections performed by our experienced mechanics. We take the time to ensure all services are conducted accurately the first time.</p>
        <a class="sc-link" href="https://eetirez.com/services/inspections/" target="_blank" rel="noopener">Read More</a>
      </div>
    </div>

    <!-- AUTO REPAIR PANEL — names match eetirez.com/services/ exactly -->
    <div class="svc-panel" id="panel-repair" role="tabpanel" aria-labelledby="tab-repair">
      <div class="svc-card reveal">
        <div class="sc-icon">🛢️</div>
        <div class="sc-name">Oil Changes</div>
        <p class="sc-desc">Full synthetic $59.99 · Synthetic blend $39.99. Includes filter. Oil disposal and taxes extra. For most cars and light trucks. Cannot be combined with other offers.</p>
        <div class="sc-price">From $39.99</div>
        <a class="sc-link" href="https://eetirez.com/services/oil-changes/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d1">
        <div class="sc-icon">🛑</div>
        <div class="sc-name">Brake Repairs &amp; Replacements</div>
        <p class="sc-desc">From brake pads and rotors to calipers and fluid flushes — we handle all brake services with transparency and expertise. Brake special available from $99/axle (labor only).</p>
        <div class="sc-price">Special: $99/axle labor</div>
        <a class="sc-link" href="https://eetirez.com/services/brake-repair/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d2">
        <div class="sc-icon">❄️</div>
        <div class="sc-name">Air Conditioning Repair</div>
        <p class="sc-desc">A/C performance test available for $49.99 (recovery and discharge extra, Freon not included). Full AC repair services to keep you cool through the CA summers.</p>
        <div class="sc-price">A/C Test: $49.99</div>
        <a class="sc-link" href="https://eetirez.com/services/air-conditioning-repair/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal">
        <div class="sc-icon">⚡</div>
        <div class="sc-name">Electrical Diagnostics</div>
        <p class="sc-desc">Check engine light, battery, alternator, and starter issues diagnosed accurately. Our experienced mechanics are here to help with all electrical problems.</p>
        <a class="sc-link" href="https://eetirez.com/services/electrical-diagnostics/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d1">
        <div class="sc-icon">⚙️</div>
        <div class="sc-name">Engine Repairs &amp; Replacements</div>
        <p class="sc-desc">From tune-ups to complete engine replacements, our skilled mechanics provide reliable engine repair services for all makes and models in Banning, CA.</p>
        <a class="sc-link" href="https://eetirez.com/services/engine-repairs-replacements/" target="_blank" rel="noopener">Read More</a>
      </div>
      <div class="svc-card reveal d2">
        <div class="sc-icon">🚗</div>
        <div class="sc-name">Suspension Repair Services</div>
        <p class="sc-desc">Proper suspension keeps your vehicle stable and comfortable. Our technicians inspect and repair shocks, struts, and all suspension components.</p>
        <a class="sc-link" href="https://eetirez.com/services/suspension-repair-services/" target="_blank" rel="noopener">Read More</a>
      </div>
    </div>

    </div>
  </div>
</section>


<!-- TIRES SECTION -->
<!-- ══════════════════════════════════════════════
  TIRES FEATURE — exact headings from eetirez.com homepage
  H6: "Need new tires? We'll get you rolling"
  H3: "Your One-Stop Shop For Tires & Auto Repair Services In Banning, CA"
  CTA: "Make An Appointment"
══════════════════════════════════════════════ -->
<section style="background:var(--dark-navy);padding:72px 0;position:relative;overflow:hidden;">
  <div style="position:absolute;inset:0;background:repeating-linear-gradient(-45deg,rgba(0,112,201,.03) 0,rgba(0,112,201,.03) 1px,transparent 1px,transparent 28px);pointer-events:none;"></div>
  <div class="wrap" style="position:relative;z-index:1;text-align:center;">
    <div style="font-family:var(--font-display);font-size:20px;font-weight:500;color:var(--blue-light);text-transform:uppercase;letter-spacing:.06em;font-style:italic;margin-bottom:12px;">Need New Tires? We'll Get You Rolling</div>
    <h3 style="font-family:var(--font-body);font-size:clamp(26px,4vw,44px);font-weight:700;text-transform:uppercase;color:var(--white);line-height:1.15;margin-bottom:20px;">Your One-Stop Shop For Tires &amp; Auto Repair<br>Services In Banning, CA</h3>
    <p style="font-size:16px;color:rgba(255,255,255,.60);max-width:600px;margin:0 auto 32px;line-height:1.75;">At E&amp;E Tires Automotive Center in Banning, CA, we specialize in servicing a wide variety of vehicles. Our familiarity with specific repair procedures, honed through repetition, guarantees not only a swift service but also a precise and correct one! Choose E&amp;E Tires Automotive Center – where affordability meets excellence.</p>
    <a class="btn btn-blue btn-xl" href="https://eetirez.com/appointments" target="_blank" rel="noopener">Make An Appointment</a>
  </div>
</section>

<!-- ══════════════════════════════════════════════
  TIRE BRAND LOGOS — above specials strip (Fix 4)
  Clean horizontal row, low visual weight
══════════════════════════════════════════════ -->

<!-- BRANDS (full) -->
<div id="tires" class="brands-row-standalone" role="region" aria-label="Tire brands we carry">
  <div class="br-label">Tire Brands We Carry</div>
  <div class="brand-logos-row">
    <span class="brand-name">Bridgestone</span>
    <span class="brand-sep">·</span>
    <span class="brand-name">Goodyear</span>
    <span class="brand-sep">·</span>
    <span class="brand-name">Dunlop</span>
    <span class="brand-sep">·</span>
    <span class="brand-name">Michelin</span>
    <span class="brand-sep">·</span>
    <span class="brand-name">M2 Tires</span>
  </div>
</div>

<!-- ══════════════════════════════════════════════
  SPECIALS STRIP — exact prices, fine print, expiry from eetirez.com/specials/
  All prices confirmed from screenshot. EXP 3-31-2026.
══════════════════════════════════════════════ -->
<div class="specials-strip" role="region" aria-label="Current specials">
  <div class="specials-scroll">
    <div class="specials-scroll-inner">
    <div class="special-tile" onclick="window.open('https://eetirez.com/specials/','_blank')">
      <div class="sp-save">$59.99</div>
      <div class="sp-service">Full Synthetic Oil Change</div>
      <div class="sp-action">Includes 5 qts oil &amp; filter. Oil disposal &amp; taxes extra. Most cars &amp; light trucks. EXP 3-31-2026 →</div>
    </div>
    <div class="sp-divider"></div>
    <div class="special-tile" onclick="window.open('https://eetirez.com/specials/','_blank')">
      <div class="sp-save">$39.99</div>
      <div class="sp-service">Synthetic Blend Oil Change</div>
      <div class="sp-action">Includes 5 qts synthetic blend &amp; filter. Oil disposal &amp; taxes extra. EXP 3-31-2026 →</div>
    </div>
    <div class="sp-divider"></div>
    <div class="special-tile" onclick="window.open('https://eetirez.com/specials/','_blank')">
      <div class="sp-save">$99</div>
      <div class="sp-service">Brake Special — Per Axle</div>
      <div class="sp-action">Labor only. Must purchase parts with us. Pads &amp; rotor resurfacing extra. EXP 3-31-2026 →</div>
    </div>
    <div class="sp-divider"></div>
    <div class="special-tile" onclick="window.open('https://eetirez.com/specials/','_blank')">
      <div class="sp-save">$49.99</div>
      <div class="sp-service">A/C Performance Test</div>
      <div class="sp-action">Recovery &amp; discharge extra. Freon not included. EXP 3-31-2026 →</div>
    </div>
    <div class="sp-divider"></div>
    <div class="special-tile" onclick="window.open('https://eetirez.com/specials/','_blank')">
      <div class="sp-save">10% OFF</div>
      <div class="sp-service">Repair Service</div>
      <div class="sp-action">Max $100 per customer per visit. Cannot be combined. EXP 3-31-2026 →</div>
    </div>
    <div class="sp-divider"></div>
    <div class="special-tile" onclick="document.getElementById('financing').scrollIntoView({behavior:'smooth'})">
      <div class="sp-save">Financing</div>
      <div class="sp-service">Acima &amp; Snap Finance</div>
      <div class="sp-action">Lease-to-own. No credit needed. Apply today →</div>
    </div>
    </div><!-- /specials-scroll-inner -->
  </div><!-- /specials-scroll -->
</div><!-- /specials-strip -->

<!-- ══════════════════════════════════════════════
  VEHICLES WE SERVICE — from eetirez.com/vehicles/
  BMW, Chevrolet, Ford, Hyundai, Kia, Toyota
══════════════════════════════════════════════ -->

<!-- CONTACT CTA -->
<section class="section section-alt">
  <div class="container" style="text-align:center">
    <h2 class="h2">Not Sure What Your Car Needs?</h2>
    <p style="color:var(--text-muted);max-width:480px;margin:14px auto 28px;line-height:1.7">Bring it in and we'll diagnose it — honestly and transparently. No unnecessary upsells.</p>
    <a href="https://eetirez.com/appointments" class="btn">Schedule a Free Diagnostic</a>
      <a href="/specials" class="btn btn-outline-blue" style="margin-left:12px">View Current Specials</a>
  </div>
</section>

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
      <SiteScripts page="services" />
    </>
  )
}
