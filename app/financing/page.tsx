import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Financing | E&E Tires Automotive Center',
  description: 'No-credit-needed financing for auto repair in Banning, CA. Apply with Acima or Snap Finance today.',
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
        <a class="nav-lnk cur" class="nav-lnk cur" href="/financing">Financing</a>
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
    <div class="eyebrow" style="color:var(--blue)">No Credit Required Options</div>
    <h1 class="h1" style="color:var(--white);margin-top:8px">Financing Available</h1>
    <p style="color:rgba(255,255,255,.7);font-size:1.05rem;max-width:540px;margin:16px auto 0;line-height:1.7">
      Don't let finances delay critical repairs. We offer flexible payment options through Acima and Snap Finance.
    </p>
  </div>
</section>

<!-- ══════════════════════════════════════════════
  FINANCING — exact content from eetirez.com/financing/
══════════════════════════════════════════════ -->
<section class="section section-alt" id="financing" aria-labelledby="fin-h2">
  <div class="wrap">
    <div style="text-align:center;margin-bottom:44px;">
      <div class="eyebrow">Financing</div>
      <h2 class="h2" id="fin-h2">We Have Financing Available!</h2>
    </div>
    <!-- Financing features row — exact from eetirez.com/financing/ -->
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:48px;">
      <div style="text-align:center;padding:28px 20px;background:var(--white);border:1px solid var(--border);">
        <div style="font-size:32px;margin-bottom:12px;">⚡</div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:600;text-transform:uppercase;color:var(--dark-text);margin-bottom:6px;">Quick Application</div>
        <p style="font-size:14px;color:var(--muted-text);">Apply quickly online or in-store — no lengthy paperwork required.</p>
      </div>
      <div style="text-align:center;padding:28px 20px;background:var(--white);border:1px solid var(--border);">
        <div style="font-size:32px;margin-bottom:12px;">✅</div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:600;text-transform:uppercase;color:var(--dark-text);margin-bottom:6px;">Use Instantly</div>
        <p style="font-size:14px;color:var(--muted-text);">Get approved and use your financing right away for the service you need.</p>
      </div>
      <div style="text-align:center;padding:28px 20px;background:var(--white);border:1px solid var(--border);">
        <div style="font-size:32px;margin-bottom:12px;">📅</div>
        <div style="font-family:var(--font-display);font-size:20px;font-weight:600;text-transform:uppercase;color:var(--dark-text);margin-bottom:6px;">Pay Over Time</div>
        <p style="font-size:14px;color:var(--muted-text);">Payment plans designed to align with your payday schedule. Early payoff options available.</p>
      </div>
    </div>
    <div class="fin-inner">
      <div>
        <!-- ACIMA FINANCING -->
        <div style="background:var(--white);border:1px solid var(--border);padding:28px;margin-bottom:20px;">
          <div style="font-family:var(--font-display);font-size:22px;font-weight:600;text-transform:uppercase;color:var(--dark-text);margin-bottom:12px;">Acima Financing</div>
          <p style="font-size:15px;color:var(--muted-text);line-height:1.7;margin-bottom:12px;">Our lease-to-own solutions allow you to get key items like automotive repairs, and more—all without credit. Choose a store and apply on Acima.com or the mobile app. You can also find a retail location and shop in person.</p>
          <p style="font-size:15px;color:var(--muted-text);line-height:1.7;margin-bottom:16px;">Lease it until you own it or purchase early at a discount. Either way, it's yours to keep. The sooner you do so, the more you'll save. Of course, if you no longer want the merchandise, you can return it in good condition at any time without penalty.</p>
          <a class="btn btn-blue btn-md" href="https://eetirez.com/financing/" target="_blank" rel="noopener">Apply Now</a>
        </div>
        <!-- SNAP FINANCING -->
        <div style="background:var(--white);border:1px solid var(--border);padding:28px;">
          <div style="font-family:var(--font-display);font-size:22px;font-weight:600;text-transform:uppercase;color:var(--dark-text);margin-bottom:12px;">SNAP Financing</div>
          <p style="font-size:15px;color:var(--muted-text);line-height:1.7;margin-bottom:12px;">Are you someone with a good credit score, a poor credit score, or no credit history at all? If so, Snap Finance can help you with our easy lease-to-own financing process. Our aim is to make the entire process hassle-free and straightforward, ensuring you get what you need as quickly as possible.</p>
          <p style="font-size:15px;color:var(--muted-text);line-height:1.7;margin-bottom:16px;">Even if you have gone through bankruptcy or have a poor or non-existent credit history, we can still provide you with the best chance of approval. Our payment plans are designed to align with your payday schedule, and we also offer early payoff options to help you lower the overall cost of ownership.</p>
          <a class="btn btn-blue btn-md" href="https://eetirez.com/financing/" target="_blank" rel="noopener">Apply Now</a>
        </div>
      </div>
      <div class="promo-panel reveal d1">
        <div class="pp-eyebrow">Current Specials — Exp 3-31-2026</div>
        <div class="pp-headline">Full<br>Synthetic<br><span>$59.99</span></div>
        <p class="pp-sub">Includes 5 quarts of full synthetic oil and filter. Oil disposal and taxes are extra. For most cars and light trucks. Can not be combined with any other offer.</p>
        <a class="btn btn-blue btn-lg" href="https://eetirez.com/appointments" target="_blank" rel="noopener" style="display:inline-flex;">Make An Appointment</a>
        <div class="pp-exp">Synthetic Blend $39.99 · Brake Special $99/axle · A/C Test $49.99 · 10% OFF repairs (max $100). All exp. 3-31-2026.</div>
      </div>
    </div>
  </div>
</section>


<!-- CONTACT CTA -->
<!-- ══════════════════════════════════════════════
  CONTACT — exact heading + copy from eetirez.com
  H2: "Contact Us for Auto Repair in Banning, CA"
══════════════════════════════════════════════ -->
<section class="section section-alt" id="contact" aria-labelledby="contact-h2">
  <div class="wrap">
    <div class="contact-inner">
      <div class="reveal">
        <div class="eyebrow">Get In Touch</div>
        <h2 class="h2" id="contact-h2">Contact Us for Auto Repair in Banning, CA</h2>
        <p class="lead" style="margin-top:12px;">If you're looking for auto repair in Banning, CA, E&amp;E Tires Automotive Center is the company you can trust. Our shop is committed to providing quality automotive services with honesty and professionalism. Give us a phone call today to schedule an appointment, or stop by our location to speak with our owner and crew. Whether you need repairs, new tires, or routine maintenance, we have you covered!</p>
        <div class="contact-channels">
          <a class="cc" href="tel:9517970013" aria-label="Call us">
            <span class="cc-icon">📞</span>
            <div><div class="cc-label">Call Us</div><div class="cc-val">(951) 797-0013</div></div>
            <span class="btn btn-blue btn-sm" style="margin-left:auto">Call</span>
          </a>
          <a class="cc" href="sms:9517970013" aria-label="Text us">
            <span class="cc-icon">💬</span>
            <div><div class="cc-label">Text Us</div><div class="cc-val">951-797-0013</div></div>
            <span class="btn btn-dark btn-sm" style="margin-left:auto">Text</span>
          </a>
          <a class="cc" href="#book" aria-label="Book online">
            <span class="cc-icon">📅</span>
            <div><div class="cc-label">Book Online</div><div class="cc-val">24/7 Scheduling</div></div>
            <span class="btn btn-dark btn-sm" style="margin-left:auto">Book →</span>
          </a>
          <div class="cc">
            <span class="cc-icon">📍</span>
            <div><div class="cc-label">Visit Us</div><div class="cc-val" style="font-size:14px;font-weight:400;font-family:var(--font-body);">1550 E Ramsey St, Banning, CA 92220</div></div>
          </div>
        </div>
      </div>

      <div class="cf reveal d1">
        <div class="cf-title">Send Us a Message</div>
        <div class="cf-sub">We'll call or text you back within 30 minutes during business hours</div>
        <form class="cf-form" onsubmit="submitContact(event)" novalidate>
          <div class="cf-row">
            <div class="fld-group">
              <label class="fld-label" for="cf-name">Your Name *</label>
              <input class="fld" type="text" id="cf-name" placeholder="Maria Rodriguez" required>
            </div>
            <div class="fld-group">
              <label class="fld-label" for="cf-phone">Phone *</label>
              <input class="fld" type="tel" id="cf-phone" placeholder="(951) 555-0000" required>
            </div>
          </div>
          <div class="fld-group">
            <label class="fld-label" for="cf-email">Email (optional)</label>
            <input class="fld" type="email" id="cf-email" placeholder="maria@email.com">
          </div>
          <div class="fld-group">
            <label class="fld-label" for="cf-veh">Vehicle or License Plate</label>
            <input class="fld" type="text" id="cf-veh" placeholder="2021 Toyota Camry or plate 8ABC123">
          </div>
          <div class="fld-group">
            <label class="fld-label" for="cf-svc">Service Needed</label>
            <select class="fld-select" id="cf-svc">
              <option value="">Select service…</option>
              <option>Oil Change</option>
              <option>Tires</option>
              <option>Brake Repair</option>
              <option>AC / Heating</option>
              <option>Engine / Transmission</option>
              <option>Electrical / Diagnostics</option>
              <option>Wheel Alignment</option>
              <option>Inspection</option>
              <option>Financing Question</option>
              <option>Other</option>
            </select>
          </div>
          <div class="fld-group">
            <label class="fld-label" for="cf-msg">Message</label>
            <textarea class="fld" id="cf-msg" rows="3" placeholder="Tell us more about what's happening with your vehicle…" style="resize:vertical;"></textarea>
          </div>
          <button class="cf-submit" type="submit">Send Message →</button>
          <div style="font-size:11.5px;color:var(--muted-text);text-align:center;margin-top:8px;">🔒 Your info is never sold or shared</div>
        </form>
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
      <SiteScripts page="financing" />
    </>
  )
}
