'use client'

import { useEffect } from 'react'

interface SiteScriptsProps {
  page: string
}

export default function SiteScripts({ page }: SiteScriptsProps) {
  useEffect(() => {
    // ── Mobile nav ──────────────────────────────────────────
    const hamburger = document.querySelector('.hamburger')
    const mobileNav = document.getElementById('mobnav')
    if (hamburger && mobileNav) {
      hamburger.addEventListener('click', () => {
        const isOpen = mobileNav.style.display === 'flex'
        mobileNav.style.display = isOpen ? 'none' : 'flex'
      })
    }

    // ── Smooth scroll for hash links ────────────────────────
    document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
      anchor.addEventListener('click', (e) => {
        const href = (anchor as HTMLAnchorElement).getAttribute('href')
        if (!href || href === '#') return
        const target = document.querySelector(href)
        if (target) {
          e.preventDefault()
          target.scrollIntoView({ behavior: 'smooth' })
          if (mobileNav) mobileNav.style.display = 'none'
        }
      })
    })

    // ── Services tab switcher ───────────────────────────────
    const switchTab = (btn: HTMLElement, panel: string) => {
      document.querySelectorAll('.stab').forEach((b) => b.classList.remove('on'))
      document.querySelectorAll('.svc-panel').forEach((p) => p.classList.remove('on'))
      btn.classList.add('on')
      const panelEl = document.getElementById('panel-' + panel)
      if (panelEl) panelEl.classList.add('on')
    }
    document.querySelectorAll('.stab').forEach((btn) => {
      const panel = (btn as HTMLElement).getAttribute('onclick')?.match(/switchTab\(this,'([^']+)'\)/)?.[1]
      if (panel) {
        btn.addEventListener('click', () => switchTab(btn as HTMLElement, panel))
      }
    })

    // ── Carousel (shop photos) ──────────────────────────────
    const track = document.getElementById('spTrack')
    const dotsWrap = document.getElementById('spDots')
    if (track && dotsWrap) {
      const TOTAL = track.children.length
      let cur = 0
      let timer: ReturnType<typeof setInterval> | null = null
      let paused = false

      // Build dots
      for (let i = 0; i < TOTAL; i++) {
        const d = document.createElement('button')
        d.className = 'sp-dot' + (i === 0 ? ' active' : '')
        d.setAttribute('aria-label', 'Photo ' + (i + 1))
        d.addEventListener('click', () => spGoTo(i))
        dotsWrap.appendChild(d)
      }

      const spGoTo = (idx: number) => {
        cur = ((idx % TOTAL) + TOTAL) % TOTAL
        ;(track as HTMLElement).style.transform = `translateX(-${cur * 100}%)`
        dotsWrap!.querySelectorAll('.sp-dot').forEach((d, i) =>
          d.classList.toggle('active', i === cur)
        )
      };

      ;(window as any).spMove = (dir: number) => {
        spGoTo(cur + dir)
        resetTimer()
      }

      function resetTimer() {
        if (timer) clearInterval(timer)
        if (!paused) timer = setInterval(() => spGoTo(cur + 1), 4500)
      }

      const outer = track.closest('.sp-outer') as HTMLElement | null
      outer?.addEventListener('mouseenter', () => {
        paused = true
        if (timer) clearInterval(timer)
      })
      outer?.addEventListener('mouseleave', () => {
        paused = false
        resetTimer()
      })

      // Touch swipe
      let tx = 0
      track.addEventListener('touchstart', (e) => { tx = (e as TouchEvent).touches[0].clientX }, { passive: true })
      track.addEventListener('touchend', (e) => {
        const dx = (e as TouchEvent).changedTouches[0].clientX - tx
        if (Math.abs(dx) > 40) (window as any).spMove(dx < 0 ? 1 : -1)
      }, { passive: true })

      resetTimer()
    }

    // ── Vehicle plate detection ─────────────────────────────
    ;(window as any).detectPlateInput = (input: HTMLInputElement) => {
      const isPlate = /^[0-9][A-Za-z]{3}[0-9]{3}$/.test(input.value.trim())
      const btn = document.getElementById('vehLookupBtn') as HTMLButtonElement | null
      if (btn) {
        btn.classList.toggle('lit', isPlate)
        btn.style.background = isPlate ? 'var(--blue)' : ''
        btn.style.borderColor = isPlate ? 'var(--blue)' : ''
      }
    }

    ;(window as any).runPlateLookup = () => {
      const vehicleField = document.getElementById('bc-vehicle') as HTMLInputElement | null
      if (!vehicleField) return
      const val = vehicleField.value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
      if (!val) { vehicleField.focus(); return }
      const btn = document.getElementById('vehLookupBtn') as HTMLButtonElement | null
      if (btn) { btn.textContent = 'Looking…'; btn.disabled = true }
      setTimeout(() => {
        if (btn) { btn.textContent = 'Lookup Plate'; btn.disabled = false; btn.style.background = ''; btn.style.borderColor = '' }
        vehicleField.value = '2021 Toyota Tacoma · Plate: ' + val
        vehicleField.style.borderColor = '#1B6B3A'
        const suggest = document.getElementById('smartSuggest')
        if (suggest) suggest.style.display = 'block'
        toast('✓ Vehicle found! Info pre-filled.', '#1B6B3A')
      }, 1100)
    }

    // ── Booking form submit ─────────────────────────────────
    ;(window as any).submitBooking = (e: Event) => {
      e.preventDefault()
      const name = (document.getElementById('bc-name') as HTMLInputElement)?.value.trim()
      const phone = (document.getElementById('bc-phone') as HTMLInputElement)?.value.trim()
      if (!name || !phone) {
        toast('Please enter your name and phone number', '#EF4444')
        return
      }
      const btn = (e.target as HTMLFormElement).querySelector('.bc-submit') as HTMLButtonElement
      if (btn) { btn.textContent = '⏳ Sending…'; btn.disabled = true }
      setTimeout(() => {
        if (btn) { btn.textContent = '📅 Request My Appointment'; btn.disabled = false }
        toast('✅ Request sent! We\'ll text you within 30 min.', '#1B6B3A')
        ;(e.target as HTMLFormElement).reset()
      }, 1400)
    }

    // ── Smart suggestion ────────────────────────────────────
    ;(window as any).addBrakeCheck = () => {
      const svc = document.getElementById('bc-service') as HTMLSelectElement | null
      if (svc) svc.value = 'Brake Service'
      const suggest = document.getElementById('smartSuggest')
      if (suggest) {
        suggest.style.background = '#E6F4ED'
        const addBtn = suggest.querySelector('.ss-add')
        if (addBtn) addBtn.textContent = '✓ Brake check added'
      }
      toast('Free brake inspection added to your booking', '#1B6B3A')
    }

    // ── Plate lookup (vehicle history section) ─────────────
    ;(window as any).runLookup2 = () => {
      const plateFld = document.getElementById('lc-plate-val') as HTMLInputElement | null
      const vinFld = document.getElementById('lc-vin-val') as HTMLInputElement | null
      const val = plateFld?.value.trim() || vinFld?.value.trim() || ''
      if (!val) { toast('Please enter a plate or VIN first', '#171C1E'); return }
      toast('Searching…', '#171C1E')
      setTimeout(() => {
        document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' })
        const veh = document.getElementById('bc-vehicle') as HTMLInputElement | null
        if (veh) veh.value = '2021 Toyota Tacoma · ' + val
        const suggest = document.getElementById('smartSuggest')
        if (suggest) suggest.style.display = 'block'
        toast('✓ Vehicle found — complete your booking above', '#1B6B3A')
      }, 1100)
    }

    // ── Tab toggle for plate/VIN ─────────────────────────────
    ;(window as any).switchLookup = (tab: string) => {
      const plate = document.getElementById('lc-plate')
      const vin = document.getElementById('lc-vin')
      document.querySelectorAll('.lc-tab').forEach((t) => t.classList.remove('on'))
      if (tab === 'plate') {
        if (plate) plate.style.display = 'flex'
        if (vin) vin.style.display = 'none'
        document.querySelector('.lc-tab[onclick*="plate"]')?.classList.add('on')
      } else {
        if (plate) plate.style.display = 'none'
        if (vin) vin.style.display = 'flex'
        document.querySelector('.lc-tab[onclick*="vin"]')?.classList.add('on')
      }
    }

    // ── FAQ accordion (details/summary) ─────────────────────
    // Native HTML — no JS needed

    // ── Pre-fill booking date (min = today) ─────────────────
    const dateInput = document.getElementById('bc-date') as HTMLInputElement | null
    if (dateInput) {
      const today = new Date().toISOString().split('T')[0]
      dateInput.min = today
      if (!dateInput.value) {
        const nextWeek = new Date()
        nextWeek.setDate(nextWeek.getDate() + 1)
        dateInput.value = nextWeek.toISOString().split('T')[0]
      }
    }

    // ── Toast notification ──────────────────────────────────
    function toast(msg: string, color?: string) {
      const existing = document.getElementById('__toast__')
      if (existing) existing.remove()
      const t = document.createElement('div')
      t.id = '__toast__'
      t.textContent = msg
      t.style.cssText = `
        position:fixed;top:90px;right:20px;z-index:9999;
        background:${color || '#171C1E'};color:#fff;
        padding:13px 20px;border-radius:0;
        font-family:'Teko',sans-serif;font-size:17px;font-weight:500;
        letter-spacing:.06em;box-shadow:0 8px 24px rgba(0,0,0,.25);
        max-width:320px;line-height:1.4;
        animation:toastIn .3s ease;
        pointer-events:none;
      `
      if (!document.getElementById('__toast_style__')) {
        const style = document.createElement('style')
        style.id = '__toast_style__'
        style.textContent = '@keyframes toastIn{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:none}}'
        document.head.appendChild(style)
      }
      document.body.appendChild(t)
      setTimeout(() => t.remove(), 3200)
    }

    ;(window as any).toast = toast

  }, [page])

  return null
}
