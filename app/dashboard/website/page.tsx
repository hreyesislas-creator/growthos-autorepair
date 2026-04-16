import { getDashboardTenant } from '@/lib/tenant'
import { canEditDashboardModule } from '@/lib/auth/roles'
import {
  getServices, getSpecials, getTireBrands,
  getVehicleServiceBrands, getGalleryItems,
} from '@/lib/queries'
import { createClient } from '@/lib/supabase/server'
import Topbar from '@/components/dashboard/Topbar'
import Link from 'next/link'
import HomepageForm from './HomepageForm'
import SectionVisibilityForm from './SectionVisibilityForm'

export const metadata = { title: 'Website CMS' }

const SUB_SECTIONS = [
  { key: 'general',   label: 'General Settings',      icon: '⚙️' },
  { key: 'homepage',  label: 'Homepage',               icon: '🏠' },
  { key: 'services',  label: 'Services',               icon: '🔧' },
  { key: 'tires',     label: 'Tire Brands',            icon: '🛞' },
  { key: 'vehicles',  label: 'Vehicles We Service',    icon: '🚗' },
  { key: 'specials',  label: 'Specials',               icon: '🏷️' },
  { key: 'financing', label: 'Financing',              icon: '💳' },
  { key: 'warranty',  label: 'Warranty',               icon: '🛡️' },
  { key: 'gallery',   label: 'Gallery',                icon: '📸' },
  { key: 'about',     label: 'About Us',               icon: '📋' },
  { key: 'contact',   label: 'Contact Info',           icon: '📍' },
  { key: 'branding',  label: 'Branding',               icon: '🎨' },
  { key: 'seo',       label: 'SEO Basics',             icon: '🔍' },
] as const

export default async function WebsitePage() {
  const ctx      = await getDashboardTenant()
  const tenantId = ctx?.tenant.id ?? ''
  const settings = ctx?.settings ?? null
  const canEdit = await canEditDashboardModule('website')

  // Load CMS data in parallel
  const [services, specials, tireBrands, vehBrands, gallery] = await Promise.all([
    getServices(tenantId),
    getSpecials(tenantId),
    getTireBrands(tenantId),
    getVehicleServiceBrands(tenantId),
    getGalleryItems(tenantId),
  ])

  // Load homepage content
  const supabase = await createClient()
  const { data: homepageContent } = await supabase
    .from('homepage_content')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  return (
    <>
      <Topbar title="Website" subtitle="Content Management" />
      <div className="dash-content">

        {/* Sub-section nav */}
        <div style={{
          display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '24px',
          borderBottom: '1px solid var(--border)', paddingBottom: '16px',
        }}>
          {SUB_SECTIONS.map(s => (
            <button key={s.key} className="btn-ghost" style={{ fontSize: '12px', padding: '5px 12px' }}>
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        <div className="two-col" style={{ gridTemplateColumns: '1fr 280px' }}>

          {/* Left: CMS panels */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Hero / Homepage — wired client form */}
            <HomepageForm content={homepageContent ?? null} readOnly={!canEdit} />

            {/* Services */}
            <div className="card">
              <div className="section-header">
                <div>
                  <div className="section-title">Services</div>
                  <div className="section-subtitle">{services.length} services configured</div>
                </div>
                {canEdit ? (
                  <Link
                    href="/dashboard/website/services/new"
                    className="btn-ghost"
                    style={{ fontSize: '12px' }}
                  >
                    + Add Service
                  </Link>
                ) : null}
              </div>
              {services.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <div className="empty-state-icon">🔧</div>
                  <div className="empty-state-title">No services added</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  {services.map(s => (
                    <div key={s.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: '1px solid var(--border-2)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '18px' }}>{s.icon ?? '🔧'}</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{s.name}</div>
                          {s.description && <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{s.description.slice(0, 60)}…</div>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? 'Active' : 'Hidden'}</span>
                        {canEdit ? (
                          <button type="button" className="btn-ghost" style={{ padding: '3px 8px', fontSize: '11px' }}>Edit</button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tire Brands */}
            <div className="card">
              <div className="section-header">
                <div>
                  <div className="section-title">Tire Brands We Carry</div>
                  <div className="section-subtitle">{tireBrands.length} brands · independent from Vehicles We Service</div>
                </div>
                <Link
                  href="/dashboard/website/tire-brands/new"
                  className="btn-ghost"
                  style={{ fontSize: '12px' }}
                >
                  + Add Brand
                </Link>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {tireBrands.map(b => (
                  <div key={b.id} style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r6)', padding: '8px 14px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    {b.logo_url && <img src={b.logo_url} alt={b.name} style={{ height: '20px', objectFit: 'contain', filter: 'brightness(0) invert(1)', opacity: .7 }} />}
                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{b.name}</span>
                    <span className={`badge ${b.is_active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '10px' }}>{b.is_active ? 'On' : 'Off'}</span>
                  </div>
                ))}
                {tireBrands.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No brands added yet</div>}
              </div>
            </div>

            {/* Vehicles We Service */}
            <div className="card">
              <div className="section-header">
                <div>
                  <div className="section-title">Vehicles We Service</div>
                  <div className="section-subtitle">{vehBrands.length} makes · supports SEO brand pages</div>
                </div>
                {canEdit ? (
                  <Link
                    href="/dashboard/website/vehicle-makes/new"
                    className="btn-ghost"
                    style={{ fontSize: '12px' }}
                  >
                    + Add Make
                  </Link>
                ) : null}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {vehBrands.map(b => (
                  <div key={b.id} style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r6)', padding: '7px 12px',
                    display: 'flex', alignItems: 'center', gap: '8px',
                  }}>
                    {b.logo_url && <img src={b.logo_url} alt={b.make} style={{ height: '18px', objectFit: 'contain' }} />}
                    <span style={{ fontSize: '13px', color: 'var(--text-2)' }}>{b.make}</span>
                    {b.page_slug && <span style={{ fontSize: '10px', color: 'var(--blue-light)' }}>/{b.page_slug}</span>}
                  </div>
                ))}
                {vehBrands.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-3)' }}>No makes added yet</div>}
              </div>
            </div>

            {/* Specials */}
            <div className="card">
              <div className="section-header">
                <div>
                  <div className="section-title">Specials & Promotions</div>
                  <div className="section-subtitle">{specials.filter(s => s.is_active).length} active</div>
                </div>
                {canEdit ? (
                  <Link
                    href="/dashboard/website/specials/new"
                    className="btn-ghost"
                    style={{ fontSize: '12px' }}
                  >
                    + Add Special
                  </Link>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {specials.map(s => (
                  <div key={s.id} style={{
                    background: 'var(--surface-2)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r8)', padding: '12px 14px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#0070C9' }}>{s.price_display ?? ''}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{s.title}</span>
                      </div>
                      {s.description && <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>{s.description.slice(0, 80)}…</div>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <span className={`badge ${s.is_active ? 'badge-green' : 'badge-gray'}`}>{s.is_active ? 'Active' : 'Off'}</span>
                      {canEdit ? (
                        <button type="button" className="btn-ghost" style={{ padding: '3px 8px', fontSize: '11px' }}>Edit</button>
                      ) : null}
                    </div>
                  </div>
                ))}
                {specials.length === 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--text-3)', padding: '12px 0' }}>No specials added yet</div>
                )}
              </div>
            </div>

            {/* Gallery */}
            <div className="card">
              <div className="section-header">
                <div>
                  <div className="section-title">Gallery</div>
                  <div className="section-subtitle">{gallery.filter(g => g.is_active).length} active photos</div>
                </div>
                {canEdit ? (
                  <Link
                    href="/dashboard/website/gallery/new"
                    className="btn-ghost"
                    style={{ fontSize: '12px' }}
                  >
                    + Add Photo
                  </Link>
                ) : null}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '8px' }}>
                {gallery.map(g => (
                  <div key={g.id} style={{ position: 'relative', borderRadius: 'var(--r6)', overflow: 'hidden', aspectRatio: '1' }}>
                    <img src={g.image_url} alt={g.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', bottom: '4px', right: '4px' }}>
                      <span className={`badge ${g.is_active ? 'badge-green' : 'badge-gray'}`} style={{ fontSize: '9px' }}>
                        {g.is_active ? 'On' : 'Off'}
                      </span>
                    </div>
                  </div>
                ))}
                {gallery.length === 0 && (
                  <div style={{ fontSize: '13px', color: 'var(--text-3)', gridColumn: '1/-1', padding: '12px 0' }}>
                    No gallery photos added yet
                  </div>
                )}
              </div>
            </div>

          </div>{/* end left col */}

          {/* Right: section visibility — wired client form */}
          <div>
            <SectionVisibilityForm settings={settings} readOnly={!canEdit} />
          </div>

        </div>
      </div>
    </>
  )
}
