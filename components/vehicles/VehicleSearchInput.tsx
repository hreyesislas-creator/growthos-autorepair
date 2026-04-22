'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VehicleSearchHit } from '@/lib/queries'

const DEBOUNCE_MS = 280

function vehicleTitleLine(v: VehicleSearchHit): string {
  return [v.year, v.make, v.model].filter(Boolean).join(' ') || 'Vehicle'
}

function vinOrPlate(v: VehicleSearchHit): string | null {
  if (v.vin) return v.vin
  if (v.license_plate) return v.license_plate
  return null
}

export default function VehicleSearchInput() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<VehicleSearchHit[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const wrapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  useEffect(() => {
    if (!debounced) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    ;(async () => {
      try {
        const res = await fetch(
          `/api/vehicles/search?q=${encodeURIComponent(debounced)}`,
          { cache: 'no-store' },
        )
        if (!res.ok) {
          if (!cancelled) setResults([])
          return
        }
        const data = (await res.json()) as VehicleSearchHit[]
        if (!cancelled) setResults(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setResults([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [debounced])

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const selectVehicle = useCallback(
    (id: string) => {
      setOpen(false)
      setQuery('')
      setDebounced('')
      setResults([])
      setActiveIndex(-1)
      router.push(`/dashboard/vehicles/${id}`)
    },
    [router],
  )

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex(i => (i + 1) % results.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex(i => (i <= 0 ? results.length - 1 : i - 1))
      return
    }
    if (e.key === 'Enter' && activeIndex >= 0 && activeIndex < results.length) {
      e.preventDefault()
      selectVehicle(results[activeIndex].id)
    }
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={wrapRef} className="vehicle-search" style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        type="search"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search VIN, plate, customer or phone…"
        value={query}
        onChange={e => {
          setQuery(e.target.value)
          setOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => query.trim() && setOpen(true)}
        onKeyDown={onKeyDown}
        className="vehicle-search-input"
        aria-autocomplete="list"
        aria-expanded={showDropdown}
        aria-controls="vehicle-search-listbox"
      />
      {showDropdown && (
        <div
          id="vehicle-search-listbox"
          role="listbox"
          className="vehicle-search-dropdown"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '100%',
            marginTop: 4,
            maxHeight: 320,
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r8)',
            boxShadow: 'var(--shadow)',
            zIndex: 200,
          }}
        >
          {loading && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-3)' }}>
              Searching…
            </div>
          )}
          {!loading && results.length === 0 && (
            <div style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-3)' }}>
              No vehicles found
            </div>
          )}
          {!loading &&
            results.map((v, idx) => (
              <button
                key={v.id}
                type="button"
                role="option"
                aria-selected={idx === activeIndex}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => selectVehicle(v.id)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  border: 'none',
                  borderBottom:
                    idx < results.length - 1 ? '1px solid var(--border-2)' : 'none',
                  background: idx === activeIndex ? 'var(--surface-3)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  color: 'var(--text)',
                }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>
                  {vehicleTitleLine(v)}
                </div>
                {vinOrPlate(v) && (
                  <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>
                    {vinOrPlate(v)}
                  </div>
                )}
                {(v.customer_name || v.customer_phone) && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                    {[v.customer_name, v.customer_phone].filter(Boolean).join(' · ')}
                  </div>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
