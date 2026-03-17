import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Tires | E&E Tires Automotive Center Banning CA',
  description: 'New tires, installation, rotation, and repair in Banning, CA. Bridgestone, Goodyear, Michelin and more.',
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
        <a class="nav-lnk" href="/services">Services</a>
        <a class="nav-lnk" href="/services#vehicles">Vehicles</a>
        <a class="nav-lnk" href="/specials">Specials</a>
        <a class="nav-lnk cur" class="nav-lnk cur" href="/tires">Tires</a>
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


<section style="background:var(--dark-navy);padding:64px 0 48px;color:var(--white);text-align:center">
  <div class="container">
    <div class="eyebrow" style="color:var(--blue)">New Tires in Banning, CA</div>
    <h1 class="h1" style="color:var(--white);margin-top:8px">Your One-Stop Tire Shop</h1>
    <p style="color:rgba(255,255,255,.7);font-size:1.05rem;max-width:540px;margin:16px auto 28px;line-height:1.7">
      We carry top tire brands and offer complete installation, balancing, rotation, and repair services for all makes and models.
    </p>
    <a href="https://eetirez.com/appointments" class="btn">Book a Tire Service</a>
  </div>
</section>

<!-- VEHICLE LOOKUP -->
<section class="lookup-section" aria-labelledby="lookup-h2">
  <div class="wrap">
    <div class="lookup-inner">
      <div class="lookup-left reveal">
        <div class="eyebrow eyebrow-light">Smart Vehicle Lookup</div>
        <h2 class="h2 h2-light" id="lookup-h2">Your Car's Full History<br>In Seconds</h2>
        <p>Enter your California license plate or VIN and we'll instantly pull up your vehicle, service history, and what's due next — no paperwork needed.</p>
        <div class="lookup-bullets">
          <div class="lb-item">
            <div class="lb-check" aria-hidden="true">✓</div>
            <span class="lb-text"><strong>Auto-fill your booking form</strong> — skip the typing</span>
          </div>
          <div class="lb-item">
            <div class="lb-check" aria-hidden="true">✓</div>
            <span class="lb-text"><strong>See past service history</strong> at E&amp;E Tires Automotive Center</span>
          </div>
          <div class="lb-item">
            <div class="lb-check" aria-hidden="true">✓</div>
            <span class="lb-text"><strong>Get personalized reminders</strong> based on your mileage</span>
          </div>
          <div class="lb-item">
            <div class="lb-check" aria-hidden="true">✓</div>
            <span class="lb-text"><strong>Works for all California plates</strong> — powered by GrowthOS</span>
          </div>
        </div>
      </div>

      <div class="lookup-card reveal d2">
        <div class="lc-title">Look Up Your Vehicle</div>
        <div class="lc-sub">California license plate or 17-digit VIN</div>
        <div class="lc-tabs" role="tablist">
          <button class="lct on" onclick="switchLookup(this,'plate')" role="tab">License Plate</button>
          <button class="lct" onclick="switchLookup(this,'vin')" role="tab">VIN Number</button>
        </div>
        <div class="lc-input-wrap" id="lc-plate">
          <span class="lc-state">CA</span>
          <input class="lc-input" type="text" id="lc-plate-val" placeholder="Enter plate (e.g. 8ABC123)" maxlength="8" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9]/g,'')">
        </div>
        <div class="lc-input-wrap" id="lc-vin" style="display:none">
          <input class="lc-input" type="text" id="lc-vin-val" placeholder="17-character VIN" maxlength="17" style="padding-left:14px;letter-spacing:.1em" oninput="this.value=this.value.toUpperCase()">
        </div>
        <button class="lc-submit" onclick="runLookup2()" aria-label="Look up vehicle">🔍 Look Up My Vehicle</button>
        <div class="lc-note">Your data is never sold or shared · <a href="/#location" style="color:rgba(255,255,255,.4);text-decoration:underline;">Questions?</a></div>
      </div>
    </div>
  </div>
</section>


<!-- TIRE BRANDS -->
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

<!-- TIRE SERVICES DETAIL -->
<section class="section section-alt">
  <div class="container">
    <div style="text-align:center;margin-bottom:40px">
      <div class="eyebrow">Complete Tire Services</div>
      <h2 class="h2">Everything Tire-Related, Done Right</h2>
    </div>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:20px;max-width:900px;margin:0 auto">
      <div style="background:var(--white);border:1px solid var(--border);border-radius:8px;padding:22px">
        <div style="font-size:1.8rem;margin-bottom:10px">🛞</div>
        <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;margin-bottom:8px">New Tire Installation</div>
        <p style="color:var(--text-muted);font-size:.88rem;line-height:1.6">Bridgestone, Goodyear, Dunlop, Michelin, M2 Tires — mounted and balanced for your specific vehicle.</p>
      </div>
      <div style="background:var(--white);border:1px solid var(--border);border-radius:8px;padding:22px">
        <div style="font-size:1.8rem;margin-bottom:10px">🔄</div>
        <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;margin-bottom:8px">Tire Rotation</div>
        <p style="color:var(--text-muted);font-size:.88rem;line-height:1.6">Extend the life of your tires with regular rotations — typically every 5,000–7,500 miles.</p>
      </div>
      <div style="background:var(--white);border:1px solid var(--border);border-radius:8px;padding:22px">
        <div style="font-size:1.8rem;margin-bottom:10px">🔧</div>
        <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;margin-bottom:8px">Flat Tire Repair</div>
        <p style="color:var(--text-muted);font-size:.88rem;line-height:1.6">Puncture repair, plug &amp; patch — when the tire can safely be repaired, we'll save you money.</p>
      </div>
      <div style="background:var(--white);border:1px solid var(--border);border-radius:8px;padding:22px">
        <div style="font-size:1.8rem;margin-bottom:10px">⚖️</div>
        <div style="font-family:'Teko',sans-serif;font-size:1.2rem;font-weight:600;margin-bottom:8px">Wheel Alignment</div>
        <p style="color:var(--text-muted);font-size:.88rem;line-height:1.6">Properly aligned wheels prevent uneven wear, improve fuel economy, and keep your vehicle tracking straight.</p>
      </div>
    </div>
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
      <SiteScripts page="tires" />
    </>
  )
}
