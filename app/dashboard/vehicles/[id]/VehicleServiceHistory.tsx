'use client'

import { format } from 'date-fns'
import type { Vehicle } from '@/lib/types'
import Link from 'next/link'

type TimelineEntry = {
  id: string
  recordType: 'appointment' | 'inspection' | 'estimate' | 'work_order' | 'invoice'
  date: Date
  dateString: string
  status: string
  title: string
  summary?: string
  detailUrl: string
  recordNumber?: string
}

interface VehicleServiceHistoryProps {
  vehicle: Vehicle
  entries: TimelineEntry[]
}

const recordTypeLabels: Record<TimelineEntry['recordType'], string> = {
  appointment: '📅 Appointment',
  inspection: '🔍 Inspection',
  estimate: '📋 Estimate',
  work_order: '⚙️ Work Order',
  invoice: '📄 Invoice',
}

const statusColors: Record<string, { bg: string; text: string }> = {
  // Appointments
  pending: { bg: '#fef9c3', text: '#854d0e' },
  confirmed: { bg: '#dbeafe', text: '#1e40af' },
  in_progress: { bg: '#fef9c3', text: '#854d0e' },
  completed: { bg: '#dcfce7', text: '#14532d' },
  cancelled: { bg: '#fee2e2', text: '#7f1d1d' },
  no_show: { bg: '#fee2e2', text: '#7f1d1d' },

  // Inspections
  draft: { bg: '#e2e8f0', text: '#1e293b' },
  sent: { bg: '#dbeafe', text: '#1e40af' },

  // Estimates
  presented: { bg: '#dbeafe', text: '#1e40af' },
  authorized: { bg: '#fef9c3', text: '#854d0e' },
  approved: { bg: '#dcfce7', text: '#14532d' },
  declined: { bg: '#fee2e2', text: '#7f1d1d' },
  reopened: { bg: '#fef9c3', text: '#854d0e' },

  // Work Orders
  ready: { bg: '#dbeafe', text: '#1e40af' },
  invoiced: { bg: '#ede9fe', text: '#4c1d95' },

  // Invoices
  paid: { bg: '#dcfce7', text: '#14532d' },
  void: { bg: '#fee2e2', text: '#7f1d1d' },
}

function getStatusColor(status: string) {
  return statusColors[status] || { bg: '#e2e8f0', text: '#1e293b' }
}

function formatRecordDate(entry: TimelineEntry): string {
  try {
    return format(entry.date, 'MMM d, yyyy')
  } catch {
    return 'Unknown date'
  }
}

function formatRecordTime(entry: TimelineEntry): string | null {
  if (entry.recordType === 'appointment' && entry.dateString.includes('T')) {
    try {
      const time = format(entry.date, 'h:mm a')
      return time
    } catch {
      return null
    }
  }
  return null
}

export default function VehicleServiceHistory({ vehicle, entries }: VehicleServiceHistoryProps) {
  const vehicleLabel = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Vehicle'
  const mileage = vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : null

  return (
    <div className="dash-content">
      {/* Vehicle header */}
      <div style={{
        marginBottom: 32,
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r8)',
      }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
            {vehicleLabel}
          </h2>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-3)', flexWrap: 'wrap' }}>
          {vehicle.vin && (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>VIN:</span>
              {' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{vehicle.vin.slice(-8)}</span>
            </div>
          )}
          {vehicle.license_plate && (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Plate:</span>
              {' '}
              <span style={{ fontFamily: 'var(--font-mono)' }}>{vehicle.license_plate}</span>
            </div>
          )}
          {mileage && (
            <div>
              <span style={{ fontWeight: 600, color: 'var(--text-2)' }}>Mileage:</span>
              {' '}
              {mileage}
            </div>
          )}
        </div>
      </div>

      {/* Service History Timeline */}
      <div style={{
        padding: '16px',
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r8)',
      }}>
        <h3 style={{
          fontSize: 16,
          fontWeight: 700,
          color: 'var(--text)',
          marginBottom: 16,
          marginTop: 0,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}>
          Service History
        </h3>

        {entries.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '32px 16px',
          }}>
            <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.4 }}>📜</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
              No service history yet
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', maxWidth: 320, margin: '0 auto' }}>
              Once this vehicle has appointments, inspections, estimates, work orders, or invoices, they&apos;ll appear here.
            </div>
          </div>
        ) : (
          <div style={{ borderTop: '1px solid var(--border)' }}>
            {entries.map((entry, idx) => {
              const statusColor = getStatusColor(entry.status)
              const recordDate = formatRecordDate(entry)
              const recordTime = formatRecordTime(entry)
              const timeDisplay = recordTime ? ` · ${recordTime}` : ''

              return (
                <div
                  key={entry.id}
                  style={{
                    padding: '16px 0',
                    borderBottom: idx < entries.length - 1 ? '1px solid var(--border)' : 'none',
                    display: 'flex',
                    gap: 16,
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Date column */}
                  <div style={{
                    flex: '0 0 100px',
                    fontSize: 12,
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
                  }}>
                    {recordDate}
                  </div>

                  {/* Content column */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Title + Status */}
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                        {entry.title}
                      </div>
                      <span style={{
                        display: 'inline-block',
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: statusColor.bg,
                        color: statusColor.text,
                        textTransform: 'capitalize',
                      }}>
                        {entry.status}
                      </span>
                    </div>

                    {/* Summary + Type */}
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>
                      {entry.summary && (
                        <>
                          <span>{entry.summary}</span>
                          <span style={{ margin: '0 8px' }}>•</span>
                        </>
                      )}
                      <span>{recordTypeLabels[entry.recordType]}</span>
                    </div>

                    {/* Link */}
                    <Link
                      href={entry.detailUrl}
                      style={{
                        fontSize: 12,
                        color: '#16a34a',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
                    >
                      {entry.recordType === 'appointment' ? 'Open Appointment' : 'View'}
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
