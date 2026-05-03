import type { Metadata } from 'next'
import Link from 'next/link'
import SiteScripts from '@/components/SiteScripts'

const UPDATED = 'May 3, 2026'

export const metadata: Metadata = {
  title: 'Privacy Policy | E&E Tires',
  description:
    'Privacy Policy for E&E Tires, including how we collect, use, and protect information and SMS-related data.',
}

const telHref = 'tel:+19515241010'
const phoneDisplay = '+1 (951) 524-1010'

export default function PrivacyPage() {
  return (
    <>
      <div className="mob-bar">
        <a className="mob-bar-call" href={telHref}>
          📞 Call Now
        </a>
        <a className="mob-bar-book" href="https://eetires.com">
          🌐 Website
        </a>
      </div>

      <div className="ubar" role="banner" aria-label="Shop information">
        <div className="wrap">
          <div className="ubar-inner">
            <div className="ubar-left">
              <div className="ubar-item">
                <span className="ubar-dot" aria-hidden="true" />
                <strong>Shop Hours:</strong>&nbsp;Mon–Sat: 8:00 AM – 5:00 PM
              </div>
              <div className="ubar-item">
                <svg width="13" height="15" viewBox="0 0 13 15" fill="none" aria-hidden="true">
                  <path
                    d="M6.5 0C4.015 0 2 2.015 2 4.5c0 3.375 4.5 9 4.5 9s4.5-5.625 4.5-9C11 2.015 8.985 0 6.5 0zm0 6.5a2 2 0 110-4 2 2 0 010 4z"
                    fill="currentColor"
                    opacity=".6"
                  />
                </svg>
                <a
                  href="https://maps.app.goo.gl/BammB54H9rfvozu36"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ubar-link"
                  style={{ padding: 0 }}
                >
                  1550 E Ramsey St, Banning, CA 92220
                </a>
              </div>
              <div className="ubar-item">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path
                    d="M13.923 10.71l-3-3a.5.5 0 00-.707 0l-1.5 1.5a7.51 7.51 0 01-3.926-3.926l1.5-1.5a.5.5 0 000-.707l-3-3a.5.5 0 00-.707 0l-2 2A.5.5 0 000 2.5C0 8.851 5.149 14 11.5 14a.5.5 0 00.354-.146l2-2a.5.5 0 000-.707l.069.063z"
                    fill="currentColor"
                    opacity=".6"
                  />
                </svg>
                <a href={telHref} className="ubar-link" style={{ padding: 0 }}>
                  <strong>{phoneDisplay}</strong>
                </a>
              </div>
            </div>
            <div className="ubar-right">
              <Link className="ubar-link" href="/terms">
                Terms
              </Link>
              <Link className="ubar-link" href="/privacy">
                Privacy
              </Link>
              <a className="ubar-link" href="https://eetires.com" target="_blank" rel="noopener noreferrer">
                eetires.com
              </a>
            </div>
          </div>
        </div>
      </div>

      <nav className="nav" aria-label="Main navigation">
        <div className="wrap">
          <div className="nav-inner">
            <Link href="/" className="nav-logo" aria-label="E&E Tires home">
              <img
                className="logo-img"
                src="https://eetirez.com/wp-content/uploads/2025/02/logo-e-e-tires-banning-ca-92220-auto-repair.png"
                alt="E&E Tires"
              />
              <div className="logo-svg-wrap" style={{ display: 'none', alignItems: 'center', gap: 12 }}>
                <svg width="54" height="54" viewBox="0 0 54 54" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <circle cx="27" cy="27" r="26" fill="#0070C9" />
                  <circle cx="27" cy="27" r="20" fill="none" stroke="rgba(255,255,255,.20)" strokeWidth="1.5" />
                  <circle cx="27" cy="27" r="10" fill="rgba(255,255,255,.10)" stroke="rgba(255,255,255,.30)" strokeWidth="1.5" />
                  <line x1="27" y1="1" x2="27" y2="9" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="27" y1="45" x2="27" y2="53" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="1" y1="27" x2="9" y2="27" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="45" y1="27" x2="53" y2="27" stroke="rgba(255,255,255,.25)" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
                <div>
                  <div
                    style={{
                      fontFamily: 'Teko, sans-serif',
                      fontSize: 19,
                      fontWeight: 600,
                      color: '#171C1E',
                      textTransform: 'uppercase',
                      letterSpacing: '.06em',
                      lineHeight: 1.1,
                    }}
                  >
                    E&amp;E Tires
                  </div>
                  <div
                    style={{
                      fontFamily: 'Barlow, sans-serif',
                      fontSize: 11,
                      color: '#666666',
                      letterSpacing: '.06em',
                      marginTop: 1,
                    }}
                  >
                    Banning, CA
                  </div>
                </div>
              </div>
            </Link>

            <div className="nav-links">
              <Link className="nav-lnk" href="/services">
                Services
              </Link>
              <Link className="nav-lnk" href="/about">
                About
              </Link>
              <Link className="nav-lnk" href="/terms">
                Terms
              </Link>
              <Link className="nav-lnk cur" href="/privacy">
                Privacy
              </Link>
            </div>

            <div className="nav-right">
              <div className="nav-phone-block">
                <div className="nav-phone-status">
                  <span className="ubar-dot" />
                  Open Now
                </div>
                <a className="nav-phone-num" href={telHref}>
                  {phoneDisplay}
                </a>
                <div className="nav-phone-hours">Mon–Sat · 8AM–5PM</div>
              </div>
              <a className="nav-cta" href="https://eetires.com" target="_blank" rel="noopener noreferrer">
                Visit Site
              </a>
              <button type="button" className="hamburger" aria-label="Menu">
                <span />
                <span />
                <span />
              </button>
            </div>
          </div>
        </div>
        <nav className="mobile-nav" id="mobnav" aria-label="Mobile navigation" style={{ display: 'none' }}>
          <Link className="mobile-nav-lnk" href="/">
            Home
          </Link>
          <Link className="mobile-nav-lnk" href="/services">
            Services
          </Link>
          <Link className="mobile-nav-lnk" href="/about">
            About
          </Link>
          <Link className="mobile-nav-lnk" href="/terms">
            Terms
          </Link>
          <Link className="mobile-nav-lnk" href="/privacy">
            Privacy
          </Link>
          <div className="mobile-nav-ctas">
            <a className="btn btn-blue btn-md" href={telHref} style={{ textAlign: 'center' }}>
              📞 Call Now
            </a>
            <a
              className="btn btn-outline-white btn-md"
              href="https://eetires.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textAlign: 'center' }}
            >
              🌐 Website
            </a>
          </div>
        </nav>
      </nav>

      <main
        className="section section-alt"
        style={{ paddingTop: 'var(--section-v)', paddingBottom: 'calc(var(--section-v) * 1.25)' }}
      >
        <div className="wrap" style={{ maxWidth: 760 }}>
          <p style={{ marginBottom: 20 }}>
            <Link
              href="/"
              style={{
                fontFamily: 'var(--font-accent)',
                fontWeight: 600,
                color: 'var(--blue)',
                letterSpacing: '.04em',
              }}
            >
              ← Back to home
            </Link>
          </p>
          <article
            style={{
              background: 'var(--white)',
              border: '1px solid var(--border)',
              padding: 'clamp(24px, 4vw, 40px)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <p className="eyebrow" style={{ marginBottom: 8 }}>
              Legal
            </p>
            <h1 className="h1" style={{ color: 'var(--dark-text)', marginBottom: 12 }}>
              Privacy Policy
            </h1>
            <p style={{ color: 'var(--muted-text)', fontSize: '0.95rem', marginBottom: 32 }}>Last updated: {UPDATED}</p>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                Information We Collect
              </h2>
              <p style={{ marginBottom: 12 }}>
                We may collect information you provide directly—for example, name, phone number, email address, vehicle details, appointment
                preferences, and messages you send us. We may also collect limited technical data when you use our website (such as device
                or browser type) as described in our general web practices and any applicable cookie notices.
              </p>
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                How We Use Information
              </h2>
              <p style={{ marginBottom: 12 }}>
                We use information to schedule and perform services, communicate about appointments and repairs, respond to support requests,
                send service updates (including by SMS when you have provided a mobile number for that purpose), maintain records, and
                comply with law. We do not send marketing or promotional SMS.
              </p>
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                SMS Communications
              </h2>
              <p style={{ marginBottom: 12 }}>
                Where you have provided a mobile number, we may send SMS messages only for customer support conversations, appointment
                confirmations, service updates, repair status notifications, missed-call follow-ups, and estimate-related communications.
              </p>
              <p
                style={{
                  marginBottom: 12,
                  padding: '16px 18px',
                  background: 'var(--off-white)',
                  borderLeft: '4px solid var(--blue)',
                  fontSize: '0.98rem',
                  lineHeight: 1.65,
                }}
              >
                Phone numbers are used only for service-related communication. SMS consent is not shared with third parties or affiliates
                for marketing purposes. Customers may reply STOP to opt out or HELP for help. Message frequency varies. Message and data
                rates may apply.
              </p>
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                Sharing of Information
              </h2>
              <p style={{ marginBottom: 12 }}>
                We may share information with service providers who assist our operations (for example, messaging or shop management tools)
                under confidentiality and data-processing terms appropriate to their role. We may disclose information when required by law
                or to protect rights, safety, or property. We do not sell your personal information and we do not share phone numbers or SMS
                consent with third parties or affiliates for their marketing.
              </p>
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                Data Security
              </h2>
              <p style={{ marginBottom: 12 }}>
                We use reasonable administrative, technical, and organizational measures designed to protect information against unauthorized
                access, loss, or misuse. No method of transmission or storage is completely secure; we encourage you to use strong contact
                information and to notify us of any suspected unauthorized use.
              </p>
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                Your Choices
              </h2>
              <p style={{ marginBottom: 12 }}>
                You may update or correct certain information by contacting us. You may opt out of SMS by replying STOP. You may have
                additional rights under your state of residence (for example, access or deletion requests); contact us to exercise those
                rights where applicable.
              </p>
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                Children&apos;s Privacy
              </h2>
              <p style={{ marginBottom: 12 }}>
                Our services are not directed to children under 13, and we do not knowingly collect personal information from children
                under 13. If you believe we have collected such information, please contact us so we can delete it.
              </p>
            </section>

            <section style={{ marginBottom: 28 }}>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                Changes to This Policy
              </h2>
              <p style={{ marginBottom: 12 }}>
                We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date reflects the latest revision. We
                encourage you to review this page periodically.
              </p>
            </section>

            <section>
              <h2 className="h2" style={{ fontSize: '1.35rem', marginBottom: 12 }}>
                Contact Information
              </h2>
              <p style={{ marginBottom: 8 }}>
                <strong>E&amp;E Tires</strong>
              </p>
              <p style={{ marginBottom: 8 }}>
                Website:{' '}
                <a href="https://eetires.com" target="_blank" rel="noopener noreferrer">
                  https://eetires.com
                </a>
              </p>
              <p style={{ marginBottom: 8 }}>
                Phone / SMS:{' '}
                <a href={telHref}>{phoneDisplay}</a>
              </p>
              <p style={{ marginBottom: 0 }}>
                1550 E Ramsey St, Banning, CA 92220
              </p>
            </section>
          </article>
        </div>
      </main>

      <SiteScripts page="privacy" />
    </>
  )
}
