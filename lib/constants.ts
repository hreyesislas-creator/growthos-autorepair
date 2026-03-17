// ============================================================
// E&E Tires Automotive Center — Site Constants
// ============================================================

export const SITE = {
  name: 'E&E Tires Automotive Center',
  phone: '951-797-0013',
  phoneHref: 'tel:9517970013',
  email: 'info@eetirez.com',
  address: {
    street: '1550 E Ramsey St',
    city: 'Banning',
    state: 'CA',
    zip: '92220',
    full: '1550 E Ramsey St, Banning, CA 92220',
    mapsUrl: 'https://maps.google.com/?q=1550+E+Ramsey+St+Banning+CA+92220',
  },
  hours: {
    weekdays: 'Mon – Sat: 8:00 AM – 5:00 PM',
    weekend: 'Sunday: Closed',
  },
  social: {
    google: 'https://g.page/r/eetirez',
    facebook: 'https://facebook.com/eetiresautomotive',
  },
  rating: { score: 4.9, count: 240 },
  appointments: 'https://eetirez.com/appointments',
  warranty: '2-Year / 24,000 Mile Nationwide Warranty',
} as const

export const CDN = 'https://eetirez.com/wp-content/uploads'

export const IMAGES = {
  logo: `${CDN}/2025/02/logo-e-e-tires-banning-ca-92220-auto-repair.png`,
  // Tire brand logos
  bridgestone: `${CDN}/2024/04/bridgestone-logo-5500x1200-1-1024x223.png`,
  goodyear: `${CDN}/2024/04/Goodyear-logo-black-5500x1200-1-1024x223.png`,
  dunlop: `${CDN}/2024/04/dunlop-logo-2200x500-1-1024x256.png`,
  michelin: `${CDN}/2024/04/michelin-logo-1900x450-1-1024x243.png`,
  // Vehicle make logos
  bmw: `${CDN}/2024/01/bmw-logo.png`,
  chevrolet: `${CDN}/2024/01/chevrolet-logo.webp`,
  ford: `${CDN}/2024/01/ford-logo.webp`,
  hyundai: `${CDN}/2024/01/hyundai-logo.webp`,
  kia: `${CDN}/2024/01/kia-logo.webp`,
  toyota: `${CDN}/2024/01/toyota-logo.webp`,
  vehicleLineup: `${CDN}/2024/12/toyota-vehicle-lineup-xwr381jpzg0zutl0.png`,
  // Shop photos (carousel)
  shop1: `${CDN}/2025/02/inside-pic-5-scaled.jpg`,
  shop2: `${CDN}/2025/02/2025-02-05.jpg`,
  shop3: `${CDN}/2025/02/305770820_449721620543452_8513508122414029399_n.jpg`,
  shop4: `${CDN}/2025/02/2022-09-23-scaled.jpg`,
  shop5: `${CDN}/2025/02/20240328_143637-scaled.jpg`,
  shop6: `${CDN}/2025/02/2025-02-06-scaled.jpg`,
} as const

export const NAV_LINKS = [
  { label: 'Services',  href: '/services' },
  { label: 'Vehicles',  href: '/services#vehicles' },
  { label: 'Specials',  href: '/specials' },
  { label: 'Tires',     href: '/tires' },
  { label: 'Financing', href: '/financing' },
  { label: 'Warranty',  href: '/about#warranty' },
  { label: 'Reviews',   href: '/about#reviews' },
  { label: 'About Us',  href: '/about' },
] as const

export const SERVICES = [
  { icon: '🛞', name: 'Tires',                desc: 'New · Installation · Rotation · Repair',        href: '/services' },
  { icon: '🛑', name: 'Brakes',               desc: 'Pads · Rotors · Fluid · Inspection',             href: '/services' },
  { icon: '🔧', name: 'Engine & Diagnostics', desc: 'Repair · Check Engine · Electrical',             href: '/services' },
  { icon: '🛢️', name: 'Oil Changes',          desc: 'Full Synthetic · Blend · Conventional',          href: '/services' },
  { icon: '❄️', name: 'AC & Heating',         desc: 'Performance Test · Recharge · Repair',           href: '/services' },
  { icon: '🔄', name: 'Suspension',           desc: 'Alignment · Steering · Shocks · Struts',         href: '/services' },
] as const

export const SPECIALS = [
  {
    price: '$59.99',
    title: 'Full Synthetic Oil Change',
    desc: 'Includes 5 qts oil & filter. Oil disposal & taxes extra. Most cars & light trucks.',
    exp: 'Expires March 31, 2026',
  },
  {
    price: '$99',
    title: 'Brake Special — Per Axle',
    desc: 'Labor only. Must purchase parts with us. Pads & rotor resurfacing extra.',
    exp: 'Expires March 31, 2026',
  },
  {
    price: '10% OFF',
    title: 'Any Repair Service',
    desc: 'Max $100 discount per customer per visit. Cannot be combined with other offers.',
    exp: 'Expires March 31, 2026',
  },
] as const
