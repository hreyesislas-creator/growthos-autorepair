import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About Us | E&E Tires Automotive Center',
  description: 'Learn about E&E Tires in Banning, CA — our warranty, customer reviews, and what sets us apart.',
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
        <a class="nav-lnk" href="/tires">Tires</a>
        <a class="nav-lnk" href="/financing">Financing</a>
        <a class="nav-lnk" href="/about#warranty">Warranty</a>
        <a class="nav-lnk" href="/about#reviews">Reviews</a>
        <a class="nav-lnk cur" class="nav-lnk cur" href="/about">About Us</a>
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
    <div class="eyebrow" style="color:var(--blue)">Banning's Trusted Auto Shop</div>
    <h1 class="h1" style="color:var(--white);margin-top:8px">About E&amp;E Tires<br>Automotive Center</h1>
    <p style="color:rgba(255,255,255,.7);font-size:1.05rem;max-width:560px;margin:16px auto 0;line-height:1.7">
      Locally owned and operated in Banning, CA — built on transparency, quality, and customer trust.
    </p>
  </div>
</section>

<!-- ABOUT COPY -->
<!-- ══════════════════════════════════════════════
  A BIT ABOUT US — from eetirez.com homepage
  Exact headings: "A BIT ABOUT US" / "WELCOME TO E&E Tires"
  Exact paragraphs scraped from live DOM
══════════════════════════════════════════════ -->
<section class="section section-alt">
  <div class="wrap">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:64px;align-items:center;">
      <div>
        <div class="eyebrow">A Bit About Us</div>
        <h2 class="h2" id="about-h2">Welcome to E&amp;E Tires</h2>
        <p style="font-size:16px;color:var(--muted-text);line-height:1.75;margin-top:16px;margin-bottom:16px;">E&amp;E Tires Automotive Center is a dedicated auto repair and tire shop serving Banning, CA, and the surrounding areas. As a local business, we take pride in offering quality service and automotive expertise to every customer who walks through our doors. Our commitment to customer satisfaction and professionalism makes us the go-to company for all your automotive needs. Whether you need new tires, routine maintenance, or repair services, our experienced mechanics are here to help.</p>
        <p style="font-size:16px;color:var(--muted-text);line-height:1.75;margin-bottom:16px;">At E&amp;E Tires Automotive Center, we understand that trust is paramount when it comes to servicing your vehicle. We are committed to ensuring complete transparency, treating every customer with integrity and honesty.</p>
        <p style="font-size:16px;color:var(--muted-text);line-height:1.75;margin-bottom:24px;">Every vehicle we handle is treated with utmost care, and we take the time to ensure all services are conducted meticulously and accurately the first time around. Choose E&amp;E Tires Automotive Center for reliable, transparent, and prompt automotive services!</p>
        <div style="display:flex;gap:12px;flex-wrap:wrap;">
          <a class="btn btn-blue btn-md" href="https://eetirez.com/appointments" target="_blank" rel="noopener">Make An Appointment</a>
          <a class="btn btn-dark btn-md" href="/services" target="_blank" rel="noopener">View All Services</a>
        </div>
      </div>
      <div style="background:var(--charcoal);padding:36px;">
        <div style="display:flex;flex-direction:column;gap:20px;">
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="width:44px;height:44px;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">🛡️</div>
            <div><strong style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--white);display:block;margin-bottom:4px;letter-spacing:.04em;">2 Year/24,000 Mile Warranty</strong><span style="font-size:14px;color:rgba(255,255,255,.55);line-height:1.6;">Every repair backed by our industry-leading warranty.</span></div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="width:44px;height:44px;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">📍</div>
            <div><strong style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--white);display:block;margin-bottom:4px;letter-spacing:.04em;">Serving Banning, CA</strong><span style="font-size:14px;color:rgba(255,255,255,.55);line-height:1.6;">1550 E Ramsey St · Mon–Sat 8:00 AM – 5:00 PM</span></div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="width:44px;height:44px;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">⭐</div>
            <div><strong style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--white);display:block;margin-bottom:4px;letter-spacing:.04em;">240 Google Reviews</strong><span style="font-size:14px;color:rgba(255,255,255,.55);line-height:1.6;">4.9/5 stars from real customers in Banning and surrounding areas.</span></div>
          </div>
          <div style="display:flex;align-items:flex-start;gap:16px;">
            <div style="width:44px;height:44px;background:var(--blue);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0;">💳</div>
            <div><strong style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--white);display:block;margin-bottom:4px;letter-spacing:.04em;">Financing Available</strong><span style="font-size:14px;color:rgba(255,255,255,.55);line-height:1.6;">Acima &amp; Snap Finance — lease-to-own with no credit required.</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>






<!-- FAQ -->
<!-- ══════════════════════════════════════════════
  FAQ — "Frequently Asked" / "General Questions"
  All 8 questions + answers from eetirez.com homepage
══════════════════════════════════════════════ -->
<section class="section section-alt" id="faq" aria-labelledby="faq-h2">
  <div class="wrap">
    <div style="text-align:center;margin-bottom:40px;">
      <div class="eyebrow">Frequently Asked</div>
      <h2 class="h2" id="faq-h2">General Questions</h2>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;max-width:960px;margin:0 auto;">

      <!-- Q1 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;" open>
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          What are your business hours?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          E&amp;E Tires Automotive Center operates from Monday to Saturday, starting at 8:00 AM and closing at 5:00 PM.
        </div>
      </details>

      <!-- Q2 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;">
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          Where are you located?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          We are located at <strong>1550 E Ramsey St, Banning, CA 92220</strong>. Give us a call at <a href="tel:9517970013" style="color:var(--blue);">951-797-0013</a> if you need directions. You can also <a href="https://maps.app.goo.gl/BammB54H9rfvozu36" target="_blank" rel="noopener" style="color:var(--blue);">get directions on Google Maps</a>.
        </div>
      </details>

      <!-- Q3 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;">
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          What types of vehicles do you work on?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          We specialize in all makes and models — foreign and domestic. This includes BMW, Chevrolet, Ford, Hyundai, Kia, Toyota, and many more. <a href="/services#vehicles" target="_blank" rel="noopener" style="color:var(--blue);">View all vehicles we service →</a>
        </div>
      </details>

      <!-- Q4 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;">
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          Can I book an appointment online?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          Yes! You can <a href="https://eetirez.com/appointments" target="_blank" rel="noopener" style="color:var(--blue);">schedule an appointment online</a> at any time. You can also call us at <a href="tel:9517970013" style="color:var(--blue);">951-797-0013</a> during business hours.
        </div>
      </details>

      <!-- Q5 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;">
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          Is this a more reasonable alternative to the dealership?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          Absolutely. E&amp;E Tires Automotive Center offers dealership-quality service at fair, transparent prices — without the dealership markup. Our experienced technicians are trained to work on all makes and models with the same expertise, backed by our 2-Year/24,000 Mile Warranty.
        </div>
      </details>

      <!-- Q6 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;">
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          Do you offer any discounts?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          Yes! Check out our <a href="https://eetirez.com/specials/" target="_blank" rel="noopener" style="color:var(--blue);">Coupons page</a> for a look at the current deals and offers we have available!
        </div>
      </details>

      <!-- Q7 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;">
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          Can I check on the status of my car at the shop?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          Of course! Call us at <a href="tel:9517970013" style="color:var(--blue);">951-797-0013</a> during business hours and we'll give you a full update on your vehicle's status. We're committed to keeping you informed every step of the way.
        </div>
      </details>

      <!-- Q8 -->
      <details style="background:var(--white);border:1px solid var(--border);padding:0;cursor:pointer;">
        <summary style="font-family:var(--font-display);font-size:18px;font-weight:600;text-transform:uppercase;color:var(--dark-text);letter-spacing:.04em;padding:18px 20px;list-style:none;display:flex;justify-content:space-between;align-items:center;gap:12px;user-select:none;">
          Are you hiring?
          <span style="font-size:20px;flex-shrink:0;color:var(--blue);">+</span>
        </summary>
        <div style="padding:0 20px 18px;font-size:15px;color:var(--muted-text);line-height:1.7;border-top:1px solid var(--border);">
          We're always looking for talented people to join our team! Visit our <a href="/about" target="_blank" rel="noopener" style="color:var(--blue);">Careers page</a> to see current openings and apply.
        </div>
      </details>

    </div>
    <div style="text-align:center;margin-top:32px;">
      <a class="btn btn-blue btn-md" href="https://eetirez.com/appointments" target="_blank" rel="noopener">Make An Appointment</a>
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
      <SiteScripts page="about" />
    </>
  )
}
