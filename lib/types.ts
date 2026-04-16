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
  role:
    | 'owner'
    | 'manager'
    | 'staff'
    | 'admin'
    | 'service_advisor'
    | 'advisor'
    | 'technician'
    | 'viewer'
  /** Present only if the DB column exists / is populated */
  full_name?: string | null
  email: string
  phone: string | null
  /** Present only if the DB column exists / is populated */
  language_pref?: 'en' | 'es' | null
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
  business_name: string | null
  tagline: string | null
  description: string | null
  phone: string | null
  email: string | null
  website: string | null
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
  bar_license: string | null
  seller_permit: string | null
  tax_rate: number | null
  labor_rate: number | null
  warranty_text: string | null
  invoice_terms: string | null
  invoice_footer: string | null
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
  /** Aggregate counts written by saveInspectionResults */
  total_items: number | null
  critical_count: number | null
  warning_count: number | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

/** Inspection with related customer and vehicle data for list views */
export interface InspectionRow extends Inspection {
  customer?: Pick<Customer, 'first_name' | 'last_name'> | null
  vehicle?: Pick<Vehicle, 'year' | 'make' | 'model'> | null
}

/** Matches the real inspection_items DB table created for DVI persistence */
export interface InspectionItem {
  id: string
  tenant_id: string
  inspection_id: string
  template_item_id: string | null
  /** Result value — 'pass' | 'attention' | 'urgent' | 'not_checked' */
  result: 'pass' | 'attention' | 'urgent' | 'not_checked'
  note: string | null
  created_at: string
  updated_at: string
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

/** Matches production `message_logs` table (not legacy body/to_address/status). */
export type MessageDeliveryStatus = 'pending' | 'sent' | 'delivered' | 'failed'

export interface MessageLog {
  id:                   string
  tenant_id:            string
  customer_id:          string | null
  channel:              'sms' | 'email' | string
  message_body:         string
  to_phone:             string
  from_phone:           string | null
  delivery_status:      MessageDeliveryStatus | string
  created_at:           string
  provider_message_id:  string | null
  direction:            string | null
  sent_by_user_id:      string | null
  appointment_id:       string | null
  template_id:          string | null
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
  /** Nullable — inspection-generated recs may not have a vehicle yet */
  vehicle_id: string | null
  customer_id: string | null
  inspection_id: string | null
  /** FK to inspection_items.id — set when auto-generated from DVI results */
  inspection_item_id: string | null
  /** FK to inspection_template_items.id */
  template_item_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  /** 'pending' is the initial state for auto-generated recommendations */
  status: 'pending' | 'accepted' | 'rejected' | 'open' | 'approved' | 'declined' | 'completed'
  estimated_price: number | null
  /** The checklist item label (e.g. "Brake Pads") — source of the recommendation */
  item_name: string | null
  /** DB status of the inspection_item that triggered this recommendation */
  source_status: 'attention' | 'urgent' | null
  /** Technician note copied from inspection_items.notes at generation time */
  technician_notes: string | null
  /** Section the item belongs to (e.g. "Brakes", "Suspension") */
  section_name: string | null
  created_at: string
  updated_at: string | null
}

// ── Service jobs catalog ──────────────────────────────────────
//
// Global (no tenant_id) — shared across all tenants.
// Used to drive the service job dropdown in the estimate editor.
//

export interface ServiceCategory {
  id:         string
  name:       string
  sort_order: number
  created_at: string
}

export interface ServiceJob {
  id:                  string
  category_id:         string
  name:                string
  description:         string | null
  /** Typical book time in hours (e.g. 1.5 = 1 hr 30 min). */
  default_labor_hours: number | null
  is_active:           boolean
  created_at:          string
  updated_at:          string
}

/** ServiceJob with its parent category joined in. */
export interface ServiceJobWithCategory extends ServiceJob {
  category: ServiceCategory
}

// ── Estimate types ────────────────────────────────────────────
//
// One estimate system, three creation modes.
// All three modes produce the same Estimate + EstimateItem records.
// The creation_mode field is metadata, not a branch in the data model.
//

/**
 * How the estimate was originally populated.
 *
 * manual_entry     — advisor/tech fills out the form directly
 * pdf_import       — uploaded from Tekmetric / Mitchell / similar; parser extracts items
 * system_generated — future: auto-built from inspection findings + labor API + pricing rules
 */
export type EstimateCreationMode =
  | 'manual_entry'
  | 'pdf_import'
  | 'system_generated'

export type EstimateStatus =
  | 'draft'
  | 'presented'
  | 'authorized'
  | 'approved'
  | 'declined'
  | 'reopened'

/**
 * How a specific line item was produced within an estimate.
 *
 * manual         — typed in directly by the advisor
 * pdf_import     — extracted from an imported PDF
 * generated      — created by the system_generated flow
 * recommendation — converted from a service_recommendations row
 */
export type EstimateItemSourceType =
  | 'manual'
  | 'pdf_import'
  | 'generated'
  | 'recommendation'

export type EstimateItemCategory =
  | 'labor'
  | 'part'
  | 'fee'
  | 'tax'
  | 'misc'

export interface Estimate {
  id:               string
  tenant_id:        string
  inspection_id:    string | null
  customer_id:      string | null
  vehicle_id:       string | null

  /** Human-readable sequential ID, e.g. "EST-2024-0042". Unique per tenant. */
  estimate_number:  string
  creation_mode:    EstimateCreationMode
  status:           EstimateStatus

  /** Optional per-category subtotals — enables breakdowns in the invoice UI. */
  subtotal_labor:   number | null
  subtotal_parts:   number | null
  subtotal_other:   number | null
  subtotal:         number

  /**
   * Tax snapshot design:
   *   tax_rate   — the rate applied (fraction, e.g. 0.0875 = 8.75%).
   *                NULL when tax was entered manually without specifying a rate.
   *   tax_amount — the authoritative dollar amount.
   *                When tax_rate is set: tax_amount = subtotal * tax_rate (calculated then frozen).
   *                When tax_rate is null: tax_amount = whatever the advisor typed.
   * Storing both fields allows the estimate to be reprinted correctly even
   * after future tax-rule changes.
   */
  tax_rate:         number | null
  tax_amount:       number
  total:            number

  notes:            string | null   // customer-facing
  internal_notes:   string | null   // shop-internal only

  /** PDF import: Supabase Storage URL of the uploaded file. */
  source_file_url:  string | null
  /** PDF import: parser confidence score 0–100. */
  parse_confidence: number | null
  /** True when any item needs advisor review before the estimate can be sent. */
  requires_review:  boolean

  /**
   * Markup % applied to all part costs on this estimate.
   * Formula: unit_sell_price = unit_cost × (1 + parts_markup_percent / 100)
   * Tax applies to parts only — labor is never taxed.
   * Stored as a percent value (e.g. 30.00 = 30%).
   */
  parts_markup_percent: number | null

  created_by:       string | null   // auth.users.id
  created_at:       string
  updated_at:       string
}

export interface EstimateItem {
  id:          string
  tenant_id:   string
  estimate_id: string

  /** Set when this item was converted from a recommendation. */
  service_recommendation_id: string | null
  /** Set when this item traces back to a specific inspection item. */
  inspection_item_id:        string | null
  /**
   * Set when selected from the service jobs catalog.
   * When present, the item uses the labor/parts pricing model instead of
   * the legacy quantity × unit_price model.
   */
  service_job_id:            string | null

  source_type:   EstimateItemSourceType
  category:      EstimateItemCategory

  title:         string
  description:   string | null

  // ── Legacy pricing model (service_job_id IS NULL) ──────────
  quantity:      number
  unit_price:    number

  // ── Job-based pricing model (service_job_id IS NOT NULL) ───
  /** Hours of labor for this job. */
  labor_hours:   number | null
  /** Labor rate in USD/hr at the time the estimate was built. */
  labor_rate:    number | null
  /** = round(labor_hours * labor_rate, 2) */
  labor_total:   number
  /** Parts and materials cost for this line item. */
  parts_total:   number

  // ── Shared ─────────────────────────────────────────────────
  /**
   * For job-based items: labor_total + parts_total.
   * For legacy items:    round(quantity * unit_price, 2).
   */
  line_total:    number
  display_order: number

  /**
   * For PDF-imported items: where in the source document this line was found.
   * E.g. "page 2 row 7" or the raw extracted string before normalisation.
   */
  source_reference: string | null
  /** True when the parser is uncertain and the advisor must confirm before sending. */
  needs_review:     boolean
  /** Per-line tech/advisor note (distinct from estimate-level notes). */
  notes:            string | null

  /** Populated when loaded via getEstimateWithItems. */
  parts?: EstimateItemPart[]

  created_at: string
  updated_at: string
}

export interface EstimateItemPart {
  id:               string
  tenant_id:        string
  estimate_id:      string
  estimate_item_id: string
  name:             string
  quantity:         number
  unit_cost:        number
  profit_amount:    number
  /** unit_cost + profit_amount — kept in sync by the app */
  unit_sell_price:  number
  /** quantity × unit_sell_price — kept in sync by the app */
  line_total:       number
  display_order:    number
  created_at:       string
  updated_at:       string
}

/** Convenience type — estimate header + all its line items in one object. */
export interface EstimateWithItems extends Estimate {
  items: EstimateItem[]
}

/**
 * Persisted per-job advisor decision for a single estimate line item.
 *
 * Design: absence of a row means the item is still pending.
 * Only 'approved' and 'declined' are written to the DB.
 * Undoing a decision deletes the row.
 */
export type ItemDecision = 'approved' | 'declined'

export interface EstimateItemDecision {
  id:               string
  tenant_id:        string
  estimate_id:      string
  estimate_item_id: string
  decision:         ItemDecision
  decided_by:       string | null   // auth.users.id of the advisor; nullable for Phase 1
  decided_at:       string          // ISO timestamp of the most-recent decision
  created_at:       string
  updated_at:       string
}

/**
 * Tracks the source PDF file for pdf_import estimates.
 * One record per uploaded file; linked to estimates.source_file_url.
 */
export interface EstimateSourceFile {
  id:              string
  tenant_id:       string
  estimate_id:     string | null
  file_name:       string
  file_url:        string
  file_size_bytes: number | null
  mime_type:       string | null
  parse_status:    'pending' | 'processing' | 'completed' | 'failed'
  /** Raw JSON extraction output — kept for debugging / re-processing. */
  parse_result:    Record<string, unknown> | null
  parse_error:     string | null
  created_at:      string
}

// ── Work order types ──────────────────────────────────────────
//
// Work orders are derived from approved estimate items.
// They maintain soft links to estimates and items for audit trails.
//
export type WorkOrderCreationMode =
  | 'from_estimate'
  | 'manual_entry'

export type WorkOrderStatus =
  | 'draft'
  | 'ready'
  | 'in_progress'
  | 'completed'
  | 'invoiced'

export interface WorkOrder {
  id:                   string
  tenant_id:            string
  estimate_id:          string              // soft FK to source estimate
  inspection_id:        string | null
  customer_id:          string | null
  vehicle_id:           string | null
  invoice_id:           string | null       // soft FK to generated invoice

  /** Human-readable sequential ID, e.g. "WO-2024-0042". Unique per tenant. */
  work_order_number:    string | null
  creation_mode:        WorkOrderCreationMode
  status:               WorkOrderStatus

  /** Pricing snapshot from the source estimate. */
  subtotal:             number
  tax_rate:             number | null
  tax_amount:           number
  total:                number

  notes:                string | null       // customer-facing
  internal_notes:       string | null       // shop-internal only

  /** Markup % applied to all parts on this work order. */
  parts_markup_percent: number | null

  /** Soft copy of source estimate number for traceability. */
  estimate_number:      string | null

  /** tenant_users.id of assigned technician — same semantics as inspections.technician_id */
  technician_id:        string | null

  /** Set when status transitions to in_progress. NULL until work begins. */
  started_at:           string | null

  /** Set when status transitions to completed. NULL until work finishes. */
  completed_at:         string | null

  /**
   * Elapsed hours between started_at and completed_at, rounded to 2 decimal places.
   * Computed server-side at completion time. NULL if work has not been completed.
   */
  actual_hours:         number | null

  created_by:           string | null       // auth.users.id
  created_at:           string
  updated_at:           string
}

export interface WorkOrderItem {
  id:                      string
  tenant_id:               string
  work_order_id:           string

  /** Soft link to the source estimate item (no FK constraint). */
  estimate_item_id:        string | null

  service_job_id:          string | null
  title:                   string
  description:             string | null

  category:                EstimateItemCategory

  // ── Labor pricing ───────────────────────────────────────────
  labor_hours:             number | null
  labor_rate:              number | null
  labor_total:             number

  // ── Parts pricing ───────────────────────────────────────────
  parts_total:             number

  // ── Total ───────────────────────────────────────────────────
  line_total:              number

  // ── Traceability ────────────────────────────────────────────
  inspection_item_id:      string | null
  service_recommendation_id: string | null

  // ── Future use ──────────────────────────────────────────────
  status:                  string | null       // Item-level status tracking
  assigned_to:             string | null       // Technician assignment

  display_order:           number
  created_at:              string
  updated_at:              string

  // ── Parts breakdown from source estimate (populated by getWorkOrderById) ────
  parts?:                  EstimateItemPart[]
}

/** Convenience type — work order header + all its line items in one object. */
export interface WorkOrderWithItems extends WorkOrder {
  items: WorkOrderItem[]
}

// ── Invoices ───────────────────────────────────────────────────

export type InvoiceStatus  = 'draft' | 'sent' | 'paid' | 'void'
export type PaymentStatus  = 'unpaid' | 'partially_paid' | 'paid'
export type PaymentMethod  = 'card' | 'cash' | 'zelle' | 'check' | 'financing' | 'other'

export interface Invoice {
  id:                 string
  tenant_id:          string
  customer_id:        string | null
  vehicle_id:         string | null
  work_order_id:      string        // soft FK to source work order
  invoice_number:     string | null // unique per tenant: "INV-2024-0001"
  status:             InvoiceStatus
  subtotal_labor:     number
  subtotal_parts:     number
  subtotal_other:     number
  subtotal:           number
  tax_rate:           number | null
  tax_amount:         number
  total:              number
  notes:              string | null // customer-facing notes
  internal_notes:     string | null // shop-internal only
  // ── Payment tracking (added in migration 20240015) ─────────────────────────
  payment_status:     PaymentStatus // 'unpaid' | 'partially_paid' | 'paid'
  amount_paid:        number        // sum of all recorded payments
  balance_due:        number        // total - amount_paid
  created_at:         string
  updated_at:         string
}

export type CardType = 'debit' | 'visa' | 'mastercard' | 'amex' | 'other'

/** A single payment recorded against an invoice. */
export interface InvoicePayment {
  id:                   string
  tenant_id:            string
  invoice_id:           string
  customer_id:          string | null
  amount:               number
  payment_method:       PaymentMethod
  paid_at:              string       // ISO datetime
  note:                 string | null
  // ── Payment metadata (added in migration 20240016) ─────────────────────────
  card_type:            CardType | null   // card only
  last4_digits:         string | null     // card only
  authorization_number: string | null     // card only
  reference_number:     string | null     // zelle | check | financing | other
  created_at:           string
}

export interface InvoiceItem {
  id:                      string
  tenant_id:               string
  invoice_id:              string
  work_order_item_id:      string | null // soft link to source WO item
  title:                   string
  description:             string | null
  category:                EstimateItemCategory
  labor_hours:             number | null
  labor_rate:              number | null
  labor_total:             number
  parts_total:             number
  line_total:              number
  display_order:           number
  created_at:              string
  updated_at:              string
}

/** Convenience type — invoice header + all its line items in one object. */
export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[]
}

// ── Call logs (Twilio) ────────────────────────────────────────
//
// Records inbound calls from Twilio and tracks missed-call SMS follow-ups.
// Phase 1: Single-tenant, basic logging. Multi-tenant lookup deferred to Phase 2.
//
export interface CallLog {
  id: string
  tenant_id: string

  // Twilio identifiers
  twilio_call_sid: string          // unique per call
  twilio_account_sid: string | null

  // Phone numbers (E.164 format)
  from_number: string              // caller's number
  to_number: string                // shop's number

  // Call state
  call_status: string | null       // queued | ringing | in-progress | completed
  disposition: string | null       // null | answered | missed | failed
  call_duration_seconds: number | null

  // Timestamps
  initiated_at: string             // when call arrived
  connected_at: string | null      // when answered
  ended_at: string | null          // when call ended

  // SMS tracking
  missed_call_sms_sent: boolean
  missed_call_sms_sent_at: string | null

  // System
  created_at: string
  updated_at: string
}

// ── Tenant pricing config ─────────────────────────────────────
//
// One row per tenant in `tenant_pricing_configs`.
// Used to pre-fill tax_rate and (future) labor / parts defaults on new estimates.
//
export interface TenantPricingConfig {
  id:                  string
  tenant_id:           string
  /**
   * Default tax rate as a decimal fraction (e.g. 0.0875 = 8.75%).
   * NULL means no default — estimates start without a rate pre-filled.
   */
  default_tax_rate:    number | null
  /** Default labor rate in USD per hour. Reserved for future use. */
  default_labor_rate:  number | null
  /** Parts markup as a percentage (e.g. 30.00 = 30%). Reserved for future use. */
  parts_markup_percent: number | null
  created_at:          string
  updated_at:          string
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
