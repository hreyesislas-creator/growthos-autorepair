'use client'

import { useEffect } from 'react'

export default function DashboardScripts() {
  useEffect(() => {
    // ── GrowthOS nav function ──────────────────────────────
    
// ═══════════════════════════════════════════
//  GROWTHOS — NAV CONTROLLER
// ═══════════════════════════════════════════

const pageTopbar: Record<string, { title: string; sub: string }> = {
  'dashboard':    { title: 'Dashboard', sub: 'Monday, Mar 16 · Banning, CA' },
  'jobs':         { title: 'Jobs Pipeline', sub: '9 active jobs today' },
  'customers':    { title: 'Customers CRM', sub: '1,247 total customers' },
  'vehicles':     { title: 'Vehicle Detail', sub: 'David Torres · 2021 Toyota Tacoma' },
  'reminders':    { title: 'Reminders', sub: 'Predictive service reminders' },
  'inspections':  { title: 'Inspections', sub: 'Digital vehicle inspections' },
  'mobile-insp':  { title: 'Mobile Mechanic View', sub: 'Phone-optimized inspection UI' },
  'estimates':    { title: 'Estimates', sub: 'Approval management' },
  'approval':     { title: 'Customer Approval Page', sub: 'SMS-sent approval link preview' },
  'mechanics':    { title: 'Mechanic Performance', sub: 'Team analytics dashboard' },
  'messages':     { title: 'Messages', sub: 'Customer communication center' },
};

function showPage(id: string, navEl: HTMLElement) {
  // hide all pages
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  // show target
  const page = document.getElementById('page-' + id);
  if (page) page.classList.add('active');

  // highlight nav
  if (navEl) navEl.classList.add('active');

  // update topbar
  const tb = pageTopbar[id] || { title: id, sub: '' };
  document.getElementById('topbar-content')!.innerHTML = `
  <span class="topbar-title">${tb.title}</span>
  <span class="topbar-sub">&nbsp;${tb.sub}</span>`;

  // scroll to top
  window.scrollTo(0, 0);
}

// Mini interactivity for status buttons
document.querySelectorAll('.status-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const row = this.closest('.insp-item-status');
    row.querySelectorAll('.status-btn').forEach(b => b.className = 'status-btn inactive');
    const type = this.textContent.trim().toLowerCase();
    if (type === 'good') this.className = 'status-btn good';
    else if (type === 'attn') this.className = 'status-btn attention';
    else if (type === 'urgent') this.className = 'status-btn urgent';
  });
});

// Mobile status buttons
document.querySelectorAll('.mobile-status-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    const row = this.closest('.mobile-status-row');
    row.querySelectorAll('.mobile-status-btn').forEach(b => {
      b.className = 'mobile-status-btn msb-inactive';
    });
    const type = this.textContent.trim().toLowerCase();
    if (type.includes('good')) this.className = 'mobile-status-btn msb-good';
    else if (type.includes('attn')) this.className = 'mobile-status-btn msb-attention';
    else if (type.includes('urgent')) this.className = 'mobile-status-btn msb-urgent';
  });
});

// Msg thread click
document.querySelectorAll('.msg-thread').forEach(t => {
  t.addEventListener('click', function() {
    document.querySelectorAll('.msg-thread').forEach(x => x.classList.remove('active'));
    this.classList.add('active');
  });
});

// Animate KPI cards on first load
setTimeout(() => {
  document.querySelectorAll('.kpi-value').forEach((el, i) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    setTimeout(() => {
      el.style.transition = 'all .3s';
      el.style.opacity = '1';
      el.style.transform = 'none';
    }, i * 60);
  });
}, 100);

console.log('GrowthOS AutoRepair Dashboard loaded — 11 screens ready');
console.log('Screens: Dashboard, Jobs, Customers, Vehicle, Inspections, Mobile, Approval, Mechanics, Messages, Reminders, Estimates');

  }, [])

  return null
}
