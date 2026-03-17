# E&E Tires Automotive Center — Next.js Website

Production-ready Next.js 14 website for E&E Tires Automotive Center (Banning, CA), deployable to Vercel via GitHub.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: CSS (inline global stylesheet — no Tailwind dependency)
- **Deployment**: Vercel
- **Images**: Served directly from eetirez.com CDN (no local copies needed)

## Quick Start

```bash
# Install dependencies
npm install

# Run dev server
npm run dev
# → http://localhost:3000

# Production build
npm run build
npm start
```

## Deploy to Vercel

### Option A — GitHub + Vercel (recommended)

1. Push this repository to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project
3. Import the GitHub repo
4. Framework: **Next.js** (auto-detected)
5. Click **Deploy** — no environment variables needed

### Option B — Vercel CLI

```bash
npm i -g vercel
vercel
```

## Project Structure

```
eetirez-nextjs/
├── app/
│   ├── layout.tsx          # Root HTML shell + metadata
│   ├── globals.css         # Full brand design system (44KB)
│   ├── page.tsx            # Homepage (/)
│   ├── services/
│   │   └── page.tsx        # /services — full 13-service list
│   ├── specials/
│   │   └── page.tsx        # /specials — all 5 current deals
│   ├── tires/
│   │   └── page.tsx        # /tires — brands + plate lookup
│   ├── about/
│   │   └── page.tsx        # /about — warranty + reviews + FAQ
│   ├── financing/
│   │   └── page.tsx        # /financing — Acima + Snap Finance
│   └── dashboard/
│       ├── layout.tsx      # Dashboard HTML shell
│       ├── dashboard.css   # GrowthOS dark theme CSS
│       ├── page.tsx        # /dashboard — GrowthOS 11-screen demo
│       └── DashboardScripts.tsx  # Dashboard client JS
├── components/
│   └── SiteScripts.tsx     # Client-side interactivity (nav, carousel, form)
├── lib/
│   └── constants.ts        # Site constants, image URLs, nav links
├── public/
│   └── images/             # (empty — all images served from eetirez CDN)
├── next.config.js          # Image domains, trailing slash config
├── tsconfig.json           # TypeScript config with @/* path alias
└── package.json            # Next.js 14 + React 18
```

## Routes

| Route | Page |
|-------|------|
| `/` | Homepage — 13 sections including hero, services, warranty, carousel, reviews |
| `/services` | Full auto repair services + tire brands |
| `/specials` | Current promotions & coupons |
| `/tires` | Tire brands + plate/VIN lookup + services detail |
| `/about` | About us + FAQ + 2-Yr Warranty detail |
| `/financing` | Acima + Snap Finance options |
| `/dashboard` | GrowthOS AutoRepair — 11-screen SaaS dashboard demo |

## Homepage Sections (in order)

1. Hero + Booking Form (inline CA plate lookup)
2. Stats Bar (240 reviews · 4.9★ · 2-Yr Warranty · ASE)
3. Trust Strip (5 trust badges)
4. Services Overview (6 cards → /services)
5. Trust / Credibility (pillars + review quote)
6. Tire Brands (Bridgestone · Goodyear · Dunlop · Michelin · M2)
7. Special Offers — 3 promotion cards
8. Vehicles We Service (6 brand logos + lineup image)
9. Warranty (24 Month / 24,000 Mile · TechNet badge)
10. Shop Photo Carousel (6 real shop photos · arrows · dots · autoplay)
11. Google Reviews (4.9★ · 240 reviews)
12. Location / Contact (address · hours · map)
13. Footer

## Brand Design System

All design tokens are in `app/globals.css` as CSS custom properties:

```css
:root {
  --blue:         #0070C9;   /* primary CTAs */
  --charcoal:     #171C1E;   /* dark sections */
  --dark-navy:    #052543;   /* hero / warranty bg */
  --font-display: 'Teko', sans-serif;
  --font-body:    'Barlow', sans-serif;
  /* ...34 variables total */
}
```

## How Interactivity Works

The site uses a **hybrid rendering** approach:

- **Server Components** render all HTML (fast initial load, SEO-friendly)
- **`SiteScripts.tsx`** (client component) attaches all JS after hydration:
  - Mobile nav toggle
  - Shop photo carousel (auto-advance, arrows, dots, swipe)
  - Booking form validation + plate lookup + smart suggestions
  - Services tab switcher
  - Smooth scroll
  - Toast notifications

## Image Notes

All 18 images are served directly from the existing `eetirez.com` CDN:
- 4 tire brand logos
- 6 vehicle make logos  
- 6 shop photos (carousel)
- 1 vehicle lineup image
- 1 E&E Tires logo

No images need to be uploaded or hosted separately.

## Updating Content

- **Specials/prices**: Edit `lib/constants.ts` → `SPECIALS` array
- **Nav links**: Edit `lib/constants.ts` → `NAV_LINKS` array  
- **Phone/address**: Edit `lib/constants.ts` → `SITE` object
- **Page HTML**: Edit the corresponding `app/[page]/page.tsx`
- **Styles**: Edit `app/globals.css`

## License

© 2026 E&E Tires Automotive Center. All rights reserved.
