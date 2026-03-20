import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'E&E Tires Automotive Center | Banning, CA | Tires & Auto Repair',
    template: '%s | E&E Tires Automotive Center',
  },
  description:
    'E&E Tires Automotive Center — Banning, CA. Trusted tire shop & auto repair. Oil changes, brakes, AC, engine repair. 2-Year/24,000 Mile Warranty. Call 951-797-0013.',
  keywords: [
    'auto repair Banning CA',
    'tire shop Banning',
    'oil change Banning',
    'brake repair Banning',
    'E&E Tires',
    '951-797-0013',
  ],
  openGraph: {
    title: 'E&E Tires Automotive Center | Banning, CA',
    description:
      'Trusted tire shop & auto repair in Banning, CA. 2-Year/24,000 Mile Warranty. 4.9★ Google Rating.',
    url: 'https://eetirez.com',
    siteName: 'E&E Tires Automotive Center',
    locale: 'en_US',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        {/* Marketing site fonts — Teko, Barlow, Rajdhani, JetBrains Mono */}
        <link
          href="https://fonts.googleapis.com/css2?family=Teko:wght@400;500;600;700&family=Barlow:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400;1,600&family=Rajdhani:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap"
          rel="stylesheet"
        />
        {/* Dashboard fonts — Syne, DM Sans, DM Mono */}
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
