// ============================================================
// GrowthOS AutoRepair — Supabase Database Types
// Matches the existing Supabase schema exactly
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

// ── Core tenant types ────────────────────────────────────────

export interface Tenant {
  id: string
  slug: string
  name: string
  plan: 'trial' | 'starter' | 'growth' | 'pro'
  status: 'active' | 'trial' | 'past_due' | 'suspended' | 'cancelled'
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface TenantUser {
  id: string
  tenant_id: string
  /** Supabase auth user UUID — DB column is auth_user_id */
  user_id: string
  /** Alias for the actual DB column name used in queries */
  auth_user_id?: string
  role: 'owner' | 'admin' | 'advisor' | 'technician' | 'viewer'
  full_name: string
  email: string
  phone: string | null
  language_pref: 'en' | 'es'
  is_active: boolean
  created_at: string
}

export interface RolePermission {
  id: string
  tenant_id: string
  role: string
  permission_key: string
  granted: boolean
}

// ── Business profile types ────────────────────────────────────

export interface BusinessProfile {
  id: string
  tenant_id: string
  business_name: string
  tagline: string | null
  description: string | null
  phone: string | null
  email: string | null
  address_street: string | null
  address_city: string | null
  address_state: string | null
  address_zip: string | null
  logo_url: string | null
  favicon_url: string | null
  primary_color: string | null
  secondary_color: string | null
  google_maps_embed: string | null
  google_place_id: string | null
  updated_at: string
}

export interface BusinessHours {
  id: string
  tenant_id: string
  day_of_week: number // 0=Sun, 6=Sat
  open_time: string | null
  close_time: string | null
  is_closed: boolean
}

export interface SocialLink {
  id: string
  tenant_id: string
  platform: string
  url: string
  is_active: boolean
}

// ── Website / CMS types ───────────────────────────────────────

export interface WebsiteSettings {
  id: string
  tenant_id: string
  show_hero: boolean
  show_services: boolean
  show_trust: boolean
  show_tire_brands: boolean
  show_specials: boolean
  show_vehicles_we_service: boolean
  show_warranty: boolean
  show_gallery: boolean
  show_reviews: boolean
  show_financing: boolean
  show_about: boolean
  custom_domain: string | null
  updated_at: string
}

export interface HomepageContent {
  id: string
  tenant_id: string
  hero_headline: string | null
  hero_subheadline: string | null
  hero_cta_text: string | null
  hero_cta_url: string | null
  hero_bg_image_url: string | null
  trust_headline: string | null
  trust_body: string | null
  about_headline: string | null
  about_body: string | null
  updated_at: string
}

export interface Service {
  id: string
  tenant_id: string
  name: string
  description: string | null
  icon: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface Special {
  id: string
  tenant_id: string
  title: string
  price_display: string | null
  description: string | null
  fine_print: string | null
  expires_at: string | null
  is_active: boolean
  display_order: number
  created_at: string
}

export interface FinancingContent {
  id: string
  tenant_id: string
  headline: string | null
  body: string | null
  provider_1_name: string | null
  provider_1_logo_url: string | null
  provider_1_url: string | null
  provider_2_name: string | null
  provider_2_logo_url: string | null
  provider_2_url: string | null
  updated_at: string
}

export interface WarrantyContent {
  id: string
  tenant_id: string
  headline: string | null
  months: number | null
  miles: number | null
  body: string | null
  badge_image_url: string | null
  updated_at: string
}

export interface GalleryItem {
  id: string
  tenant_id: string
  image_url: string
  caption: string | null
  display_order: number
  is_active: boolean
  created_at: string
}

export interface TireBrand {
  id: string
  tenant_id: string
  name: string
  logo_url: string | null
  display_order: number
  is_active: boolean
}

export interface VehicleServiceBrand {
  id: string
  tenant_id: string
  make: string
  logo_url: string | null
  page_slug: string | null
  meta_title: string | null
  meta_description: string | null
  display_order: number
  is_active: boolean
}

export interface ReviewSource {
  id: string
  tenant_id: string
  platform: 'google' | 'yelp' | 'facebook' | 'other'
  place_id: string | null
  review_url: string | null
  is_active: boolean
}

export interface ReviewCache {
  id: string
  tenant_id: string
  platform: string
  reviewer_name: string
  rating: number
  text: string | null
  review_date: string | null
  is_featured: boolean
  fetched_at: string
}

// ── CRM types ─────────────────────────────────────────────────

export interface Customer {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  address: string | null
  notes: string | null
  source: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CustomerTag {
  id: string
  tenant_id: string
  customer_id: string
  tag: string
}

export interface Vehicle {
  id: string
  tenant_id: string
  customer_id: string | null
  year: number | null
  make: string | null
  model: string | null
  trim: string | null
  vin: string | null
  license_plate: string | null
  color: string | null
  mileage: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface VehicleDocument {
  id: string
  vehicle_id: string
  tenant_id: string
  label: string | null
  file_url: string
  file_type: string | null
  uploaded_at: string
}

export interface VinDecodeLog {
  id: string
  tenant_id: string
  vin: string
  source: string | null
  decoded_data: Json | null
  success: boolean
  created_at: string
}

// ── Appointment types ─────────────────────────────────────────

export interface Appointment {
  id: string
  tenant_id: string
  customer_id: string | null
  vehicle_id: string | null
  assigned_user_id: string | null
  requested_service: string | null
  /** Date portion of the appointment (YYYY-MM-DD) — actual DB column name */
  appointment_date: string | null
  /** Time portion of the appointment (HH:MM or HH:MM:SS) — actual DB column name */
  appointment_time: string | null
  duration_minutes: number | null
  status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show'
  source: 'walk_in' | 'phone' | 'online' | 'referral' | 'other'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface AppointmentStatusLog {
  id: string
  appointment_id: string
  tenant_id: string
  old_status: string | null
  new_status: string
  changed_by_user_id: string | null
  note: string | null
  created_at: string
}

// ── Inspection types ──────────────────────────────────────────

export interface InspectionTemplate {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
}

export interface InspectionTemplateItem {
  id: string
  template_id: string
  tenant_id: string
  /** Primary grouping key — the section this item belongs to */
  section_name: string
  /** Alternate section column (may duplicate section_name) */
  section?: string | null
  /** Raw item name from DB — use label for display when available */
  item_name?: string | null
  /** Display label shown to the technician */
  label: string
  /** Optional longer description / instruction shown below the label */
  description?: string | null
  /** Sort position within its section */
  sort_order: number
  /** Legacy alias kept for any older references */
  display_order?: number
  is_required: boolean
  /** Legacy alias — use section_name instead */
  category?: string
}

export interface Inspection {
  id: string
  tenant_id: string
  appointment_id: string | null
  vehicle_id: string | null
  customer_id: string | null
  template_id: string | null
  /** User who opened / is responsible for the record (advisor / service writer) */
  assigned_user_id: string | null
  /** Technician who physically performs the inspection — tenant_users.id */
  technician_id: string | null
  status: 'draft' | 'in_progress' | 'completed' | 'sent'
  notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface InspectionItem {
  id: string
  inspection_id: string
  tenant_id: string
  template_item_id: string | null
  category: string
  label: string
  result: 'pass' | 'attention' | 'urgent' | 'not_checked'
  technician_note: string | null
  display_order: number
}

export interface InspectionItemPhoto {
  id: string
  inspection_item_id: string
  tenant_id: string
  photo_url: string
  caption: string | null
  uploaded_at: string
}

// ── Communications types ──────────────────────────────────────

export interface MessageTemplate {
  id: string
  tenant_id: string
  name: string
  channel: 'sms' | 'email' | 'both'
  trigger_type: string | null
  subject_en: string | null
  body_en: string
  subject_es: string | null
  body_es: string | null
  is_active: boolean
  created_at: string
}

export interface MessageLog {
  id: string
  tenant_id: string
  customer_id: string | null
  channel: 'sms' | 'email'
  to_address: string
  subject: string | null
  body: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  template_id: string | null
  sent_at: string | null
  created_at: string
}

export interface AutomationEvent {
  id: string
  tenant_id: string
  event_type: string
  payload: Json | null
  triggered_at: string
  processed: boolean
}

// ── Service history types ─────────────────────────────────────

export interface ServiceHistory {
  id: string
  tenant_id: string
  vehicle_id: string
  customer_id: string | null
  appointment_id: string | null
  service_name: string
  notes: string | null
  cost: number | null
  serviced_at: string
  created_at: string
}

export interface ServiceRecommendation {
  id: string
  tenant_id: string
  vehicle_id: string
  customer_id: string | null
  inspection_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'approved' | 'declined' | 'completed'
  created_at: string
}

// ── Billing types ─────────────────────────────────────────────

export interface TenantBillingSnapshot {
  id: string
  tenant_id: string
  plan: string
  status: string
  monthly_amount: number | null
  next_billing_date: string | null
  last_payment_date: string | null
  last_payment_amount: number | null
  grace_period_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  updated_at: string
}

export interface BillingEvent {
  id: string
  tenant_id: string
  event_type: string
  amount: number | null
  currency: string | null
  stripe_event_id: string | null
  description: string | null
  created_at: string
}

// ── Support / admin types ─────────────────────────────────────

export interface SupportTicket {
  id: string
  tenant_id: string
  subject: string
  body: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high'
  created_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface TenantNote {
  id: string
  tenant_id: string
  author_user_id: string | null
  note: string
  created_at: string
}

// ── UI helper types ───────────────────────────────────────────

export type Language = 'en' | 'es'

export interface TenantContext {
  tenant: Tenant
  profile: BusinessProfile | null
  settings: WebsiteSettings | null
}

/** Appointment with joined customer + vehicle for list views */
export interface AppointmentRow extends Appointment {
  customer?: Pick<Customer, 'first_name' | 'last_name' | 'phone'> | null
  vehicle?: Pick<Vehicle, 'year' | 'make' | 'model'> | null
}

/** Customer with vehicle count for list views */
export interface CustomerRow extends Customer {
  vehicle_count?: number
}
