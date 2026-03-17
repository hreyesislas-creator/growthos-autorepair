// GrowthOS AutoRepair Dashboard — interactive demo
// 11-screen SaaS dashboard for E&E Tires Automotive Center
import DashboardScripts from './DashboardScripts'

export default function DashboardPage() {
  const html = `<div id="app">

<!-- ═══════════════════════════════════════════
     SIDEBAR
═══════════════════════════════════════════ -->
<nav id="sidebar">
  <div class="sidebar-logo">
    <div class="logo-mark">G</div>
    <div>
      <div class="logo-text">GrowthOS</div>
      <div class="logo-sub">AutoRepair</div>
    </div>
  </div>

  <div class="shop-switcher">
    <div class="shop-dot"></div>
    <div class="shop-name">E&E Tires — Banning</div>
    <div class="shop-caret">▾</div>
  </div>

  <div class="nav-section">
    <div class="nav-label">Overview</div>
    <div class="nav-item active" onclick="showPage('dashboard',this)">
      <span class="nav-icon">⊞</span> Dashboard
    </div>
    <div class="nav-item" onclick="showPage('jobs',this)">
      <span class="nav-icon">⬡</span> Jobs Board
      <span class="nav-badge blue">9</span>
    </div>
  </div>

  <div class="nav-section">
    <div class="nav-label">Customers</div>
    <div class="nav-item" onclick="showPage('customers',this)">
      <span class="nav-icon">◎</span> Customers
    </div>
    <div class="nav-item" onclick="showPage('vehicles',this)">
      <span class="nav-icon">⬜</span> Vehicles
    </div>
    <div class="nav-item" onclick="showPage('reminders',this)">
      <span class="nav-icon">◷</span> Reminders
      <span class="nav-badge amber">14</span>
    </div>
  </div>

  <div class="nav-section">
    <div class="nav-label">Operations</div>
    <div class="nav-item" onclick="showPage('inspections',this)">
      <span class="nav-icon">✓</span> Inspections
    </div>
    <div class="nav-item" onclick="showPage('mobile-insp',this)">
      <span class="nav-icon">📱</span> Mobile View
    </div>
    <div class="nav-item" onclick="showPage('estimates',this)">
      <span class="nav-icon">≡</span> Estimates
      <span class="nav-badge amber">3</span>
    </div>
    <div class="nav-item" onclick="showPage('approval',this)">
      <span class="nav-icon">✅</span> Approvals
    </div>
  </div>

  <div class="nav-section">
    <div class="nav-label">Performance</div>
    <div class="nav-item" onclick="showPage('mechanics',this)">
      <span class="nav-icon">◈</span> Mechanics
    </div>
    <div class="nav-item" onclick="showPage('messages',this)">
      <span class="nav-icon">◉</span> Messages
      <span class="nav-badge">2</span>
    </div>
  </div>

  <div class="sidebar-footer">
    <div class="user-row">
      <div class="avatar">EO</div>
      <div class="user-info">
        <div class="user-name">Eddie Ortiz</div>
        <div class="user-role">Owner / Advisor</div>
      </div>
      <span style="color:var(--text3);font-size:12px;">⚙</span>
    </div>
  </div>
</nav>

<!-- ═══════════════════════════════════════════
     MAIN
═══════════════════════════════════════════ -->
<div id="main">
  <div id="topbar">
    <div id="topbar-content">
      <span class="topbar-title">Dashboard</span>
      <span class="topbar-sub">Monday, Mar 16 · Banning, CA</span>
    </div>
    <div class="topbar-spacer"></div>
    <div class="live-ticker"><div class="live-dot"></div>Live · 11:47 AM</div>
    <div class="search-bar">🔍 Search customers, plates…</div>
    <div class="notif-btn">🔔<div class="notif-dot"></div></div>
    <button class="btn btn-primary" onclick="showPage('inspections',null)">+ New Inspection</button>
  </div>

  <!-- ─────────────────────────────
       PAGE 1: DASHBOARD
  ───────────────────────────────── -->
  <div id="page-dashboard" class="page active">

    <div class="alert-banner mb-16">
      <span>⚠️</span>
      <span><strong>3 missed calls</strong> recovered via auto-text-back today — <span style="color:var(--amber)">2 replied</span>, 1 booked an appointment.</span>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto">View Activity</button>
    </div>

    <!-- KPI ROW -->
    <div class="grid-5 mb-16">
      <div class="kpi-card green">
        <div class="kpi-icon">💰</div>
        <div class="kpi-label">Today's Revenue</div>
        <div class="kpi-value">$3,240</div>
        <div class="kpi-sub"><span class="kpi-trend-up">↑ 18%</span> vs avg Mon</div>
      </div>
      <div class="kpi-card blue">
        <div class="kpi-icon">🚗</div>
        <div class="kpi-label">Cars In Service</div>
        <div class="kpi-value">9</div>
        <div class="kpi-sub"><span class="text-dim">3 awaiting approval</span></div>
      </div>
      <div class="kpi-card amber">
        <div class="kpi-icon">⏳</div>
        <div class="kpi-label">Pending Estimates</div>
        <div class="kpi-value">$4,820</div>
        <div class="kpi-sub"><span class="text-dim">5 estimates sent</span></div>
      </div>
      <div class="kpi-card cyan">
        <div class="kpi-icon">✅</div>
        <div class="kpi-label">Ready for Pickup</div>
        <div class="kpi-value">2</div>
        <div class="kpi-sub"><span class="text-dim">Alerts sent</span></div>
      </div>
      <div class="kpi-card purple">
        <div class="kpi-icon">📆</div>
        <div class="kpi-label">Scheduled Today</div>
        <div class="kpi-value">14</div>
        <div class="kpi-sub"><span class="kpi-trend-up">↑ 2</span> walk-ins</div>
      </div>
    </div>

    <div class="grid-2 mb-16">
      <!-- LEFT: Cars In Service -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">🔧 In Service Now</div>
          <button class="btn btn-ghost btn-sm" onclick="showPage('jobs',null)">View Board →</button>
        </div>

        <div class="job-mini-card">
          <div class="dot dot-amber"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">David Torres</div>
            <div style="font-size:11px;color:var(--text3)">2021 Toyota Tacoma · #8TRK441</div>
          </div>
          <div>
            <div class="tag tag-amber">Estimate Sent</div>
          </div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">$680</div>
        </div>

        <div class="job-mini-card">
          <div class="dot dot-blue"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">Maria Gonzalez</div>
            <div style="font-size:11px;color:var(--text3)">2019 Honda CR-V · #7MNP234</div>
          </div>
          <div><div class="tag tag-blue">In Progress</div></div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">$245</div>
        </div>

        <div class="job-mini-card">
          <div class="dot dot-red"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">Robert Kim</div>
            <div style="font-size:11px;color:var(--text3)">2017 Ford F-150 · #5RKM891</div>
          </div>
          <div><div class="tag tag-red">Urgent</div></div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">$1,200</div>
        </div>

        <div class="job-mini-card">
          <div class="dot dot-green"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">Sofia Reyes</div>
            <div style="font-size:11px;color:var(--text3)">2020 Chevrolet Equinox · #2SRX553</div>
          </div>
          <div><div class="tag tag-green">Ready</div></div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">$320</div>
        </div>

        <div class="job-mini-card">
          <div class="dot dot-blue"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700">James Martinez</div>
            <div style="font-size:11px;color:var(--text3)">2022 Kia Telluride · #9JMZ771</div>
          </div>
          <div><div class="tag tag-blue">Inspection</div></div>
          <div style="font-size:11px;color:var(--text3);font-family:var(--font-mono)">—</div>
        </div>

        <div style="text-align:center;padding:8px;font-size:11px;color:var(--text3)">
          + 4 more jobs in pipeline
        </div>
      </div>

      <!-- RIGHT: Revenue + Activity -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="card">
          <div class="section-header mb-8">
            <div class="section-title">📊 Revenue — This Week</div>
          </div>
          <div style="font-family:var(--font-head);font-size:24px;font-weight:800;margin-bottom:4px;">$12,880</div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:12px;">Goal: $15,000 · <span style="color:var(--amber)">86% reached</span></div>
          <div class="progress-bar mb-12"><div class="progress-fill" style="width:86%;background:var(--amber)"></div></div>
          <div class="mini-chart">
            <div class="mini-bar" style="height:40%"></div>
            <div class="mini-bar" style="height:65%"></div>
            <div class="mini-bar" style="height:55%"></div>
            <div class="mini-bar" style="height:80%"></div>
            <div class="mini-bar" style="height:70%"></div>
            <div class="mini-bar" style="height:86%;background:var(--blue);border-top-color:var(--blue)"></div>
            <div class="mini-bar" style="height:0%;opacity:.3"></div>
          </div>
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--text3);margin-top:4px;font-family:var(--font-mono)">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Today</span><span>Sun</span>
          </div>
        </div>

        <div class="card">
          <div class="section-title mb-12">⚡ Recent Activity</div>
          <div class="timeline-item">
            <div class="timeline-time">11:32</div>
            <div>David Torres <strong>approved $680 estimate</strong> via SMS link</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">11:15</div>
            <div>Auto text-back sent to <strong>(951) 555-0429</strong> — missed call</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">10:48</div>
            <div>Inspection completed — <strong>2021 Toyota Tacoma</strong> · Jose M.</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">10:22</div>
            <div>Reminder sent — <strong>Angela Brooks</strong> · Oil change due</div>
          </div>
          <div class="timeline-item">
            <div class="timeline-time">09:54</div>
            <div>New appointment booked — <strong>Carlos Ruiz</strong> · Wed 2PM</div>
          </div>
        </div>
      </div>
    </div>

    <div class="grid-3">
      <!-- Upcoming Reminders -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">🔔 Upcoming Reminders</div>
          <button class="btn btn-ghost btn-sm" onclick="showPage('reminders',null)">View All</button>
        </div>
        <div class="timeline-item">
          <div class="timeline-time">Today</div>
          <div><strong>Angela Brooks</strong> — Oil change overdue 800mi</div>
        </div>
        <div class="timeline-item">
          <div class="timeline-time">Today</div>
          <div><strong>Marcus Webb</strong> — Tire rotation due</div>
        </div>
        <div class="timeline-item">
          <div class="timeline-time">Tue</div>
          <div><strong>Lisa Tran</strong> — Brake check follow-up</div>
        </div>
        <div class="timeline-item">
          <div class="timeline-time">Wed</div>
          <div><strong>9 customers</strong> — 3-month reactivation batch</div>
        </div>
      </div>

      <!-- Missed Calls -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">📞 Missed Call Recovery</div>
          <div class="tag tag-green">3 recovered today</div>
        </div>
        <div class="job-mini-card">
          <span>📞</span>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600">(951) 555-0429</div>
            <div style="font-size:11px;color:var(--text3)">Texted back 11:15 · Replied ✓</div>
          </div>
          <div class="tag tag-green">Replied</div>
        </div>
        <div class="job-mini-card">
          <span>📞</span>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600">(951) 555-0887</div>
            <div style="font-size:11px;color:var(--text3)">Texted back 09:44 · Booked ✓</div>
          </div>
          <div class="tag tag-blue">Booked</div>
        </div>
        <div class="job-mini-card">
          <span>📞</span>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600">(951) 555-1122</div>
            <div style="font-size:11px;color:var(--text3)">Texted back 08:30 · No reply</div>
          </div>
          <div class="tag tag-gray">No Reply</div>
        </div>
      </div>

      <!-- DVI Upsell Attribution -->
      <div class="card">
        <div class="section-header">
          <div class="section-title">📈 DVI Revenue This Week</div>
        </div>
        <div style="font-family:var(--font-head);font-size:26px;font-weight:800;color:var(--green);margin-bottom:4px;">$1,840</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:14px;">From inspection upsell recommendations</div>
        <div class="stat-row">
          <span class="stat-row-label">Inspections completed</span>
          <span class="stat-row-value">23</span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">Recommendations made</span>
          <span class="stat-row-value">41</span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">Approved by customers</span>
          <span class="stat-row-value" style="color:var(--green)">29</span>
        </div>
        <div class="stat-row">
          <span class="stat-row-label">Approval rate</span>
          <span class="stat-row-value" style="color:var(--green)">71%</span>
        </div>
        <div class="divider"></div>
        <div style="font-size:11px;color:var(--text3)">Top earner: <strong style="color:var(--text)">Jose Martinez</strong> — $680 this week</div>
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 2: JOBS BOARD
  ───────────────────────────────── -->
  <div id="page-jobs" class="page">
    <div class="kanban-toolbar">
      <div style="font-family:var(--font-head);font-size:15px;font-weight:700">Jobs Pipeline</div>
      <div class="tag tag-blue" style="margin-left:4px">9 active</div>
      <div style="flex:1"></div>
      <div class="search-bar" style="width:180px">🔍 Search jobs…</div>
      <select class="btn btn-ghost btn-sm" style="font-size:12px;background:var(--bg3)">
        <option>All Mechanics</option>
        <option>Jose Martinez</option>
        <option>Sofia Reyes</option>
        <option>Carlos Lopez</option>
      </select>
      <button class="btn btn-primary btn-sm">+ New Job</button>
    </div>

    <div class="kanban-board">
      <!-- APPOINTMENT -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--text3)">Appointment</span>
          <span class="kanban-count">3</span>
        </div>
        <div class="kanban-cards">
          <div class="job-card">
            <div class="job-card-name">Angela Brooks</div>
            <div class="job-card-vehicle">2020 Nissan Altima</div>
            <div class="job-card-service">Oil change + tire rotation</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-low">Low</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#3B82F6,#06B6D4)">JM</div>
            </div>
          </div>
          <div class="job-card">
            <div class="job-card-name">Carlos Ruiz</div>
            <div class="job-card-vehicle">2018 Dodge Ram 1500</div>
            <div class="job-card-service">Brake inspection</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-med">Med</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#10B981,#06B6D4)">SR</div>
            </div>
          </div>
          <div class="job-card">
            <div class="job-card-name">Tina Walsh</div>
            <div class="job-card-vehicle">2016 Toyota Camry</div>
            <div class="job-card-service">AC not cooling</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-high">High</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#F59E0B,#EF4444)">CL</div>
            </div>
          </div>
        </div>
      </div>

      <!-- CHECK-IN -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--cyan)">Check-In</span>
          <span class="kanban-count">1</span>
        </div>
        <div class="kanban-cards">
          <div class="job-card" style="border-color:rgba(6,182,212,.3)">
            <div class="job-card-name">James Martinez</div>
            <div class="job-card-vehicle">2022 Kia Telluride</div>
            <div class="job-card-service">Grinding noise · Front brakes</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-high">🚨 Urgent</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#3B82F6,#8B5CF6)">JM</div>
            </div>
          </div>
        </div>
      </div>

      <!-- INSPECTION -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--purple)">Inspection</span>
          <span class="kanban-count">2</span>
        </div>
        <div class="kanban-cards">
          <div class="job-card" style="border-color:rgba(139,92,246,.3)">
            <div class="job-card-name">David Torres</div>
            <div class="job-card-vehicle">2021 Toyota Tacoma</div>
            <div class="job-card-service">50-pt DVI in progress</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-med">Med</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#10B981,#3B82F6)">JM</div>
            </div>
          </div>
          <div class="job-card" style="border-color:rgba(139,92,246,.3)">
            <div class="job-card-name">Robert Kim</div>
            <div class="job-card-vehicle">2017 Ford F-150</div>
            <div class="job-card-service">Full inspection · Check engine</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-high">🚨 High</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#F59E0B,#EF4444)">CL</div>
            </div>
          </div>
        </div>
      </div>

      <!-- ESTIMATE SENT -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--amber)">Estimate Sent</span>
          <span class="kanban-count">2</span>
        </div>
        <div class="kanban-cards">
          <div class="job-card" style="border-color:rgba(245,158,11,.3)">
            <div class="job-card-name">Maria Gonzalez</div>
            <div class="job-card-vehicle">2019 Honda CR-V</div>
            <div class="job-card-service">Brake pads + rotors</div>
            <div style="font-size:11px;color:var(--amber);margin:4px 0;">⏳ Awaiting approval — $485</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-med">Med</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#10B981,#06B6D4)">SR</div>
            </div>
          </div>
          <div class="job-card" style="border-color:rgba(245,158,11,.3)">
            <div class="job-card-name">Linda Park</div>
            <div class="job-card-vehicle">2015 Hyundai Sonata</div>
            <div class="job-card-service">Suspension + alignment</div>
            <div style="font-size:11px;color:var(--amber);margin:4px 0;">⏳ Awaiting approval — $920</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-med">Med</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#8B5CF6,#3B82F6)">JM</div>
            </div>
          </div>
        </div>
      </div>

      <!-- APPROVED -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--green)">Approved</span>
          <span class="kanban-count">1</span>
        </div>
        <div class="kanban-cards">
          <div class="job-card" style="border-color:rgba(16,185,129,.3)">
            <div class="job-card-name">David Torres</div>
            <div class="job-card-vehicle">2021 Toyota Tacoma</div>
            <div class="job-card-service">Brake flush + tire rotation</div>
            <div style="font-size:11px;color:var(--green);margin:4px 0">✓ Approved $680 via SMS — 11:32</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-low">Normal</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#10B981,#3B82F6)">JM</div>
            </div>
          </div>
        </div>
      </div>

      <!-- IN PROGRESS -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--blue)">In Progress</span>
          <span class="kanban-count">2</span>
        </div>
        <div class="kanban-cards">
          <div class="job-card" style="border-color:rgba(59,130,246,.3)">
            <div class="job-card-name">Maria Gonzalez</div>
            <div class="job-card-vehicle">2019 Honda CR-V</div>
            <div class="job-card-service">Brake pads + rotors</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-low">Normal</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#10B981,#06B6D4)">SR</div>
            </div>
          </div>
          <div class="job-card" style="border-color:rgba(59,130,246,.3)">
            <div class="job-card-name">Robert Kim</div>
            <div class="job-card-vehicle">2017 Ford F-150</div>
            <div class="job-card-service">Catalytic converter · Exhaust</div>
            <div class="job-card-footer">
              <div class="urgency-flag urgency-high">High</div>
              <div class="avatar-sm" style="background:linear-gradient(135deg,#F59E0B,#EF4444)">CL</div>
            </div>
          </div>
        </div>
      </div>

      <!-- READY FOR PICKUP -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--green)">Ready for Pickup</span>
          <span class="kanban-count">2</span>
        </div>
        <div class="kanban-cards">
          <div class="job-card" style="background:rgba(16,185,129,.05);border-color:rgba(16,185,129,.2)">
            <div class="job-card-name">Sofia Reyes</div>
            <div class="job-card-vehicle">2020 Chevrolet Equinox</div>
            <div class="job-card-service">Full synthetic oil change</div>
            <div style="font-size:11px;color:var(--green);margin:4px 0">📱 Pickup text sent 10:58</div>
            <div class="job-card-footer">
              <div class="tag tag-green">Ready ✓</div>
              <div style="font-family:var(--font-mono);font-size:12px;font-weight:700">$89</div>
            </div>
          </div>
          <div class="job-card" style="background:rgba(16,185,129,.05);border-color:rgba(16,185,129,.2)">
            <div class="job-card-name">Tom Bradley</div>
            <div class="job-card-vehicle">2018 GMC Sierra</div>
            <div class="job-card-service">Coolant flush + belt</div>
            <div style="font-size:11px;color:var(--green);margin:4px 0">📱 Pickup text sent 09:30</div>
            <div class="job-card-footer">
              <div class="tag tag-green">Ready ✓</div>
              <div style="font-family:var(--font-mono);font-size:12px;font-weight:700">$340</div>
            </div>
          </div>
        </div>
      </div>

      <!-- COMPLETED -->
      <div class="kanban-col">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:var(--text3)">Completed</span>
          <span class="kanban-count">8</span>
        </div>
        <div class="kanban-cards" style="opacity:.7">
          <div class="job-card">
            <div class="job-card-name">Patricia Lee</div>
            <div class="job-card-vehicle">2020 Toyota RAV4</div>
            <div class="job-card-service">Oil change + rotate</div>
            <div class="job-card-footer">
              <div class="tag tag-gray">Done ✓</div>
              <div style="font-family:var(--font-mono);font-size:12px">$120</div>
            </div>
          </div>
          <div class="job-card">
            <div class="job-card-name">Frank Moreno</div>
            <div class="job-card-vehicle">2016 Chevy Malibu</div>
            <div class="job-card-service">Battery replacement</div>
            <div class="job-card-footer">
              <div class="tag tag-gray">Done ✓</div>
              <div style="font-family:var(--font-mono);font-size:12px">$185</div>
            </div>
          </div>
          <div style="text-align:center;font-size:11px;color:var(--text3);padding:6px">+ 6 more today</div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 3: CUSTOMERS CRM
  ───────────────────────────────── -->
  <div id="page-customers" class="page">

    <div class="grid-4 mb-16">
      <div class="kpi-card blue"><div class="kpi-label">Total Customers</div><div class="kpi-value">1,247</div><div class="kpi-sub">+12 this month</div></div>
      <div class="kpi-card green"><div class="kpi-label">Active (90d)</div><div class="kpi-value">486</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Due for Service</div><div class="kpi-value">138</div></div>
      <div class="kpi-card red"><div class="kpi-label">Lost (180d+)</div><div class="kpi-value">203</div></div>
    </div>

    <div class="card">
      <div class="section-header mb-16">
        <div class="section-title">All Customers</div>
        <div class="flex-center gap-8">
          <div class="search-bar" style="width:220px">🔍 Name, phone, plate…</div>
          <button class="btn btn-ghost btn-sm">Filter ▾</button>
          <button class="btn btn-primary btn-sm">+ Add Customer</button>
        </div>
      </div>

      <!-- Tabs -->
      <div class="flex-center gap-8 mb-16">
        <button class="btn btn-primary btn-sm">All 1,247</button>
        <button class="btn btn-ghost btn-sm">Active 486</button>
        <button class="btn btn-ghost btn-sm">Due Soon 138</button>
        <button class="btn btn-ghost btn-sm">VIP 24</button>
        <button class="btn btn-ghost btn-sm">Inactive 203</button>
      </div>

      <div class="customer-row">
        <div class="customer-avatar" style="background:linear-gradient(135deg,#3B82F6,#8B5CF6)">DT</div>
        <div class="customer-info">
          <div class="customer-name">David Torres</div>
          <div class="customer-phone">(951) 555-0284</div>
          <div class="customer-vehicles">🚗 2021 Toyota Tacoma · 2018 Honda Civic</div>
        </div>
        <div class="crm-stats">
          <div class="tag tag-green">VIP</div>
          <div class="tag tag-blue">Active</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Last visit</div>
          <div style="font-size:12px;font-weight:600">Today</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Lifetime</div>
          <div style="font-size:13px;font-weight:700;color:var(--green)">$4,280</div>
        </div>
        <button class="btn btn-ghost btn-sm">View →</button>
      </div>

      <div class="customer-row">
        <div class="customer-avatar" style="background:linear-gradient(135deg,#10B981,#06B6D4)">MG</div>
        <div class="customer-info">
          <div class="customer-name">Maria Gonzalez</div>
          <div class="customer-phone">(951) 555-0718</div>
          <div class="customer-vehicles">🚗 2019 Honda CR-V</div>
        </div>
        <div class="crm-stats">
          <div class="tag tag-amber">Due: Tires</div>
          <div class="tag tag-blue">Active</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Last visit</div>
          <div style="font-size:12px;font-weight:600">Today</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Lifetime</div>
          <div style="font-size:13px;font-weight:700;color:var(--green)">$1,820</div>
        </div>
        <button class="btn btn-ghost btn-sm">View →</button>
      </div>

      <div class="customer-row">
        <div class="customer-avatar" style="background:linear-gradient(135deg,#F59E0B,#EF4444)">AB</div>
        <div class="customer-info">
          <div class="customer-name">Angela Brooks</div>
          <div class="customer-phone">(951) 555-0335</div>
          <div class="customer-vehicles">🚗 2018 Nissan Rogue</div>
        </div>
        <div class="crm-stats">
          <div class="tag tag-red">Oil Overdue</div>
          <div class="tag tag-amber">Due Soon</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Last visit</div>
          <div style="font-size:12px;font-weight:600;color:var(--amber)">48 days ago</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Lifetime</div>
          <div style="font-size:13px;font-weight:700;color:var(--green)">$890</div>
        </div>
        <button class="btn btn-amber btn-sm">Send Reminder</button>
      </div>

      <div class="customer-row">
        <div class="customer-avatar" style="background:linear-gradient(135deg,#8B5CF6,#3B82F6)">RK</div>
        <div class="customer-info">
          <div class="customer-name">Robert Kim</div>
          <div class="customer-phone">(951) 555-0921</div>
          <div class="customer-vehicles">🚗 2017 Ford F-150</div>
        </div>
        <div class="crm-stats">
          <div class="tag tag-red">In Shop</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Last visit</div>
          <div style="font-size:12px;font-weight:600">Today</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Lifetime</div>
          <div style="font-size:13px;font-weight:700;color:var(--green)">$3,120</div>
        </div>
        <button class="btn btn-ghost btn-sm">View →</button>
      </div>

      <div class="customer-row">
        <div class="customer-avatar" style="background:linear-gradient(135deg,#06B6D4,#10B981)">LT</div>
        <div class="customer-info">
          <div class="customer-name">Lisa Tran</div>
          <div class="customer-phone">(951) 555-0642</div>
          <div class="customer-vehicles">🚗 2020 Toyota Corolla</div>
        </div>
        <div class="crm-stats">
          <div class="tag tag-gray">Inactive</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Last visit</div>
          <div style="font-size:12px;font-weight:600;color:var(--red)">7 months ago</div>
        </div>
        <div style="text-align:right;min-width:80px">
          <div style="font-size:11px;color:var(--text3)">Lifetime</div>
          <div style="font-size:13px;font-weight:700;color:var(--green)">$560</div>
        </div>
        <button class="btn btn-red btn-sm">Reactivate</button>
      </div>

      <div style="padding:14px;text-align:center;font-size:12px;color:var(--text3)">
        Showing 5 of 1,247 customers
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 4: VEHICLE DETAIL
  ───────────────────────────────── -->
  <div id="page-vehicles" class="page">

    <!-- Breadcrumb -->
    <div class="flex-center gap-8 mb-16" style="font-size:12px;color:var(--text3)">
      <span>Customers</span><span>›</span><span>David Torres</span><span>›</span><span style="color:var(--text)">2021 Toyota Tacoma</span>
    </div>

    <div class="vehicle-header mb-20">
      <div class="flex-center gap-20">
        <div class="health-ring">
          <svg width="90" height="90" viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="38" fill="none" stroke="var(--bg4)" stroke-width="7"/>
            <circle cx="45" cy="45" r="38" fill="none" stroke="var(--green)" stroke-width="7"
              stroke-dasharray="238.76" stroke-dashoffset="57.4" stroke-linecap="round"/>
          </svg>
          <div class="health-score">
            <div class="health-score-num" style="color:var(--green)">76</div>
            <div class="health-score-label">Health</div>
          </div>
        </div>
        <div>
          <div style="font-family:var(--font-head);font-size:24px;font-weight:800;margin-bottom:4px">2021 Toyota Tacoma SR5</div>
          <div style="font-size:13px;color:var(--text2);margin-bottom:10px">Double Cab · 4WD · 3.5L V6</div>
          <div class="flex-center gap-12" style="flex-wrap:wrap">
            <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">VIN</div><div style="font-family:var(--font-mono);font-size:12px;margin-top:2px">3TMCZ5ANXMM000429</div></div>
            <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Plate</div><div style="font-family:var(--font-mono);font-size:12px;font-weight:700;margin-top:2px;color:var(--text)">8TRK441</div></div>
            <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Mileage</div><div style="font-family:var(--font-mono);font-size:12px;margin-top:2px">48,320 mi</div></div>
            <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Owner</div><div style="font-size:12px;font-weight:600;margin-top:2px">David Torres</div></div>
            <div><div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:.06em">Color</div><div style="font-size:12px;margin-top:2px">Midnight Black</div></div>
          </div>
        </div>
        <div style="margin-left:auto;display:flex;flex-direction:column;gap:8px;align-items:flex-end">
          <button class="btn btn-primary btn-sm">+ New Inspection</button>
          <button class="btn btn-ghost btn-sm">Send Reminder</button>
          <button class="btn btn-ghost btn-sm">View Estimates</button>
        </div>
      </div>
    </div>

    <!-- Quick alerts -->
    <div class="grid-3 mb-20">
      <div class="card card-sm" style="border-color:rgba(239,68,68,.3);background:var(--red-dim)">
        <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:4px">⚠ Brake Pads — Urgent</div>
        <div style="font-size:12px;color:var(--text2)">Front pads at 18% — replace within 1,500 mi</div>
      </div>
      <div class="card card-sm" style="border-color:rgba(245,158,11,.3);background:var(--amber-dim)">
        <div style="font-size:11px;font-weight:700;color:var(--amber);margin-bottom:4px">⚡ Battery — Weak</div>
        <div style="font-size:12px;color:var(--text2)">CCA at 68% — recommend test before winter</div>
      </div>
      <div class="card card-sm" style="border-color:rgba(16,185,129,.3);background:var(--green-dim)">
        <div style="font-size:11px;font-weight:700;color:var(--green);margin-bottom:4px">✓ Oil — Good</div>
        <div style="font-size:12px;color:var(--text2)">Changed Mar 3 · Due at 51,000 mi</div>
      </div>
    </div>

    <div class="grid-2">
      <!-- Service History -->
      <div class="card">
        <div class="section-header mb-16">
          <div class="section-title">📋 Service History</div>
          <div style="font-size:11px;color:var(--text3)">6 visits · $2,840 lifetime</div>
        </div>
        <div class="timeline-service">
          <div class="timeline-entry"><div class="timeline-dot"></div><div class="timeline-entry-date">Mar 16, 2025 · Today</div><div class="timeline-entry-title">DVI Inspection + Brake Estimate Sent</div><div class="timeline-entry-detail">50-point inspection · Jose M. · $680 estimate pending</div></div>
          <div class="timeline-entry"><div class="timeline-dot" style="background:var(--text3)"></div><div class="timeline-entry-date">Mar 3, 2025</div><div class="timeline-entry-title">Full Synthetic Oil Change + Tire Rotation</div><div class="timeline-entry-detail">5W-30 Mobil 1 · 48,100 mi · $120</div></div>
          <div class="timeline-entry"><div class="timeline-dot" style="background:var(--text3)"></div><div class="timeline-entry-date">Dec 12, 2024</div><div class="timeline-entry-title">New Tires — Set of 4 (Bridgestone)</div><div class="timeline-entry-detail">265/70R17 · Installed & balanced · $820</div></div>
          <div class="timeline-entry"><div class="timeline-dot" style="background:var(--text3)"></div><div class="timeline-entry-date">Oct 5, 2024</div><div class="timeline-entry-title">Brake Service — Rear</div><div class="timeline-entry-detail">Pads + rotors · Carlos L. · $380</div></div>
          <div class="timeline-entry"><div class="timeline-dot" style="background:var(--text3)"></div><div class="timeline-entry-date">Aug 20, 2024</div><div class="timeline-entry-title">Oil Change + Air Filter</div><div class="timeline-entry-detail">Full synthetic · $145</div></div>
        </div>
      </div>

      <!-- Right column -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <!-- Upcoming Reminders -->
        <div class="card">
          <div class="section-title mb-12">🔔 Scheduled Reminders</div>
          <div class="reminder-card" style="padding:10px 12px">
            <div class="reminder-icon" style="font-size:18px">🛞</div>
            <div class="reminder-info">
              <div class="reminder-name" style="font-size:12px">Tire Rotation</div>
              <div class="reminder-detail">Due at 49,500 mi · 1,180 mi away</div>
            </div>
            <div class="tag tag-amber">Soon</div>
          </div>
          <div class="reminder-card" style="padding:10px 12px">
            <div class="reminder-icon" style="font-size:18px">🛑</div>
            <div class="reminder-info">
              <div class="reminder-name" style="font-size:12px">Front Brake Pads</div>
              <div class="reminder-detail">Critical · Replace immediately</div>
            </div>
            <div class="tag tag-red">Urgent</div>
          </div>
        </div>

        <!-- Plate Lookup API Note -->
        <div class="highlight-box">
          <div style="font-size:11px;font-weight:700;color:var(--accent2);margin-bottom:6px">🔌 Plate Lookup Provider</div>
          <div style="font-size:11px;color:var(--text2);line-height:1.6">Adapter-ready for:<br>
            <strong style="color:var(--text)">CARFAX · AutoCheck · NHTSA · PlateRecognizer</strong><br>
            <span style="color:var(--text3)">Plug-in provider config · Fallback chains supported</span>
          </div>
        </div>
        <div class="highlight-box" style="background:rgba(139,92,246,.05);border-color:rgba(139,92,246,.2)">
          <div style="font-size:11px;font-weight:700;color:var(--purple);margin-bottom:6px">🔌 Labor Guide Integration</div>
          <div style="font-size:11px;color:var(--text2);line-height:1.6">Roadmap: <strong style="color:var(--text)">Mitchell 1 · ALLDATA · Epicor</strong><br><span style="color:var(--text3)">Auto-populate labor hours on estimates</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 5: INSPECTIONS
  ───────────────────────────────── -->
  <div id="page-inspections" class="page">

    <div class="grid-4 mb-16">
      <div class="kpi-card blue"><div class="kpi-label">Inspections Today</div><div class="kpi-value">7</div><div class="kpi-sub">3 completed · 4 in progress</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Attention Items</div><div class="kpi-value">14</div></div>
      <div class="kpi-card red"><div class="kpi-label">Urgent Items</div><div class="kpi-value">4</div></div>
      <div class="kpi-card green"><div class="kpi-label">Approval Rate</div><div class="kpi-value">71%</div></div>
    </div>

    <div class="grid-2 mb-16">
      <div class="card">
        <div class="section-header">
          <div class="section-title">🚗 Current Inspection — David Torres</div>
          <div class="flex-center gap-8">
            <div class="tag tag-blue">In Progress</div>
            <button class="btn btn-primary btn-sm">Send to Customer</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text3);margin-bottom:14px">2021 Toyota Tacoma · Jose Martinez · Started 10:22 AM</div>

        <!-- Inspection Categories -->
        <div class="inspection-category">
          <div class="insp-cat-header">
            <span class="nav-icon">🛞</span>
            <span class="insp-cat-title">Tires & Wheels</span>
            <div class="insp-cat-status">
              <span class="insp-status-chip insp-good">2 Good</span>
              <span class="insp-status-chip insp-attention">2 Attention</span>
            </div>
          </div>
          <div class="insp-item"><span class="insp-item-name">Front Left Tire Tread</span><div class="insp-item-status"><button class="status-btn good">Good</button><button class="status-btn inactive">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Front Right Tire Tread</span><div class="insp-item-status"><button class="status-btn inactive">Good</button><button class="status-btn attention">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Rear Tires (both)</span><div class="insp-item-status"><button class="status-btn good">Good</button><button class="status-btn inactive">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Tire Pressure (all 4)</span><div class="insp-item-status"><button class="status-btn inactive">Good</button><button class="status-btn attention">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
        </div>

        <div class="inspection-category">
          <div class="insp-cat-header">
            <span class="nav-icon">🛑</span>
            <span class="insp-cat-title">Brakes</span>
            <div class="insp-cat-status">
              <span class="insp-status-chip insp-urgent">2 Urgent</span>
              <span class="insp-status-chip insp-good">2 Good</span>
            </div>
          </div>
          <div class="insp-item"><span class="insp-item-name">Front Brake Pads (L/R)</span><div class="insp-item-status"><button class="status-btn inactive">Good</button><button class="status-btn inactive">Attn</button><button class="status-btn urgent">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Rear Brake Pads</span><div class="insp-item-status"><button class="status-btn inactive">Good</button><button class="status-btn inactive">Attn</button><button class="status-btn urgent">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Rotors</span><div class="insp-item-status"><button class="status-btn inactive">Good</button><button class="status-btn attention">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Brake Fluid</span><div class="insp-item-status"><button class="status-btn good">Good</button><button class="status-btn inactive">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
        </div>

        <div class="inspection-category">
          <div class="insp-cat-header">
            <span class="nav-icon">⚡</span>
            <span class="insp-cat-title">Battery & Electrical</span>
            <div class="insp-cat-status">
              <span class="insp-status-chip insp-attention">1 Attention</span>
            </div>
          </div>
          <div class="insp-item"><span class="insp-item-name">Battery CCA Test</span><div class="insp-item-status"><button class="status-btn inactive">Good</button><button class="status-btn attention">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Terminals & Cables</span><div class="insp-item-status"><button class="status-btn good">Good</button><button class="status-btn inactive">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
          <div class="insp-item"><span class="insp-item-name">Charging System</span><div class="insp-item-status"><button class="status-btn good">Good</button><button class="status-btn inactive">Attn</button><button class="status-btn inactive">Urgent</button></div></div>
        </div>

        <button class="btn btn-ghost btn-sm mt-16" style="width:100%">+ Show All 15 Categories</button>
      </div>

      <!-- Risk Library -->
      <div class="card">
        <div class="section-title mb-12">⚠ Risk Library</div>
        <div style="font-size:11px;color:var(--text3);margin-bottom:12px">Auto-populated explanations for customer-facing inspection reports</div>

        <div class="risk-item">
          <div class="risk-severity" style="background:var(--red)"></div>
          <div><div style="font-size:12px;font-weight:700;margin-bottom:3px;color:var(--red)">Worn Brake Pads</div><div style="font-size:11px;color:var(--text2);line-height:1.6">Risk of brake failure, extended stopping distances, and rotor damage. At critical levels, metal-on-metal contact causes rotor scoring — turning a $250 job into $600+. Safety risk for driver and passengers.</div></div>
        </div>
        <div class="risk-item">
          <div class="risk-severity" style="background:var(--amber)"></div>
          <div><div style="font-size:12px;font-weight:700;margin-bottom:3px;color:var(--amber)">Weak Battery</div><div style="font-size:11px;color:var(--text2);line-height:1.6">Risk of unexpected failure to start, especially in cold weather. Can damage alternator if ignored. Typically fails with no warning. Average replacement cost climbs if towed to dealer.</div></div>
        </div>
        <div class="risk-item">
          <div class="risk-severity" style="background:var(--red)"></div>
          <div><div style="font-size:12px;font-weight:700;margin-bottom:3px;color:var(--red)">Oil Leak</div><div style="font-size:11px;color:var(--text2);line-height:1.6">Risk of engine damage if oil level drops critically. Continued driving risks catastrophic engine failure — a $500 seal repair can prevent a $6,000+ engine replacement.</div></div>
        </div>
        <div class="risk-item">
          <div class="risk-severity" style="background:var(--amber)"></div>
          <div><div style="font-size:12px;font-weight:700;margin-bottom:3px;color:var(--amber)">Worn Tires</div><div style="font-size:11px;color:var(--text2);line-height:1.6">Below 2/32" tread is illegal in CA. Increases stopping distance by up to 40% in wet conditions. Risk of blowout at highway speeds.</div></div>
        </div>
        <div class="risk-item">
          <div class="risk-severity" style="background:var(--amber)"></div>
          <div><div style="font-size:12px;font-weight:700;margin-bottom:3px;color:var(--amber)">Serpentine Belt Wear</div><div style="font-size:11px;color:var(--text2);line-height:1.6">Powers AC, alternator, and power steering. Failure leaves driver stranded. $120 preventive replacement vs $400+ emergency.</div></div>
        </div>
        <div class="risk-item">
          <div class="risk-severity" style="background:var(--amber)"></div>
          <div><div style="font-size:12px;font-weight:700;margin-bottom:3px;color:var(--amber)">Dirty Air Filter</div><div style="font-size:11px;color:var(--text2);line-height:1.6">Reduces fuel economy by 10–15%. Accelerates engine wear. Easy preventive maintenance often skipped by customers.</div></div>
        </div>
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 6: MOBILE INSPECTION
  ───────────────────────────────── -->
  <div id="page-mobile-insp" class="page" style="padding:0;background:var(--bg)">
    <div style="text-align:center;padding:12px 24px 0;font-size:12px;color:var(--text3)">
      📱 Mobile mechanic view — simulated at phone width
    </div>
    <div class="mobile-frame">
      <div class="mobile-progress-bar"><div class="mobile-progress-fill" style="width:42%"></div></div>

      <div class="mobile-header">
        <div class="mobile-back">←</div>
        <div class="mobile-title">DVI — Tacoma</div>
        <div style="font-size:11px;color:var(--text3)">42%</div>
        <button class="mobile-save">Save</button>
      </div>

      <div class="mobile-vehicle-banner">
        <div style="font-size:13px;font-weight:700;margin-bottom:3px">David Torres · 2021 Toyota Tacoma</div>
        <div style="font-size:11px;color:var(--text3)">Plate 8TRK441 · 48,320 mi · Bay 3</div>
        <div style="display:flex;gap:6px;margin-top:8px">
          <div class="tag tag-red" style="font-size:10px">2 Urgent</div>
          <div class="tag tag-amber" style="font-size:10px">3 Attention</div>
          <div class="tag tag-green" style="font-size:10px">5 Good</div>
        </div>
      </div>

      <div class="mobile-section">
        <div class="mobile-section-title">
          <span>🛑 BRAKES</span>
          <span style="font-size:10px;color:var(--red)">2 issues</span>
        </div>

        <div class="mobile-insp-item" style="border-color:rgba(239,68,68,.3)">
          <div class="mobile-item-name">Front Brake Pads (L/R)</div>
          <div class="mobile-status-row">
            <div class="mobile-status-btn msb-inactive">Good</div>
            <div class="mobile-status-btn msb-inactive">Attn</div>
            <div class="mobile-status-btn msb-urgent">🚨 Urgent</div>
          </div>
          <input class="input" placeholder="Add note… e.g. '18% remaining, metal visible'" style="font-size:12px;padding:7px 10px;margin-bottom:6px">
          <div class="photo-add-btn">📷 Add Photo</div>
        </div>

        <div class="mobile-insp-item" style="border-color:rgba(239,68,68,.3)">
          <div class="mobile-item-name">Rear Brake Pads</div>
          <div class="mobile-status-row">
            <div class="mobile-status-btn msb-inactive">Good</div>
            <div class="mobile-status-btn msb-inactive">Attn</div>
            <div class="mobile-status-btn msb-urgent">🚨 Urgent</div>
          </div>
          <input class="input" placeholder="Add note…" style="font-size:12px;padding:7px 10px;margin-bottom:6px">
          <div class="photo-add-btn">📷 Add Photo</div>
        </div>

        <div class="mobile-insp-item">
          <div class="mobile-item-name">Rotors — Front</div>
          <div class="mobile-status-row">
            <div class="mobile-status-btn msb-inactive">Good</div>
            <div class="mobile-status-btn msb-attention">⚠ Attn</div>
            <div class="mobile-status-btn msb-inactive">Urgent</div>
          </div>
        </div>

        <div class="mobile-insp-item">
          <div class="mobile-item-name">Brake Fluid</div>
          <div class="mobile-status-row">
            <div class="mobile-status-btn msb-good">✓ Good</div>
            <div class="mobile-status-btn msb-inactive">Attn</div>
            <div class="mobile-status-btn msb-inactive">Urgent</div>
          </div>
        </div>
      </div>

      <div class="mobile-section">
        <div class="mobile-section-title">
          <span>🛞 TIRES</span>
          <span style="font-size:10px;color:var(--amber)">1 issue</span>
        </div>

        <div class="mobile-insp-item">
          <div class="mobile-item-name">Front Left Tire</div>
          <div class="mobile-status-row">
            <div class="mobile-status-btn msb-good">✓ Good</div>
            <div class="mobile-status-btn msb-inactive">Attn</div>
            <div class="mobile-status-btn msb-inactive">Urgent</div>
          </div>
        </div>

        <div class="mobile-insp-item" style="border-color:rgba(245,158,11,.3)">
          <div class="mobile-item-name">Front Right Tire</div>
          <div class="mobile-status-row">
            <div class="mobile-status-btn msb-inactive">Good</div>
            <div class="mobile-status-btn msb-attention">⚠ Attn</div>
            <div class="mobile-status-btn msb-inactive">Urgent</div>
          </div>
          <input class="input" placeholder="Note: wear pattern outside edge" style="font-size:12px;padding:7px 10px;margin-bottom:6px">
          <div class="photo-add-btn">📷 Add Photo</div>
        </div>
      </div>

      <div class="mobile-section" style="padding-bottom:80px">
        <div class="mobile-section-title"><span>⚡ BATTERY</span></div>
        <div class="mobile-insp-item" style="border-color:rgba(245,158,11,.3)">
          <div class="mobile-item-name">Battery CCA Test</div>
          <div class="mobile-status-row">
            <div class="mobile-status-btn msb-inactive">Good</div>
            <div class="mobile-status-btn msb-attention">⚠ Attn</div>
            <div class="mobile-status-btn msb-inactive">Urgent</div>
          </div>
          <input class="input" placeholder="CCA reading: 420 / 610 rated" style="font-size:12px;padding:7px 10px">
        </div>
      </div>

      <!-- Fixed bottom bar -->
      <div style="position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:390px;background:var(--bg2);border-top:1px solid var(--border);padding:12px 16px;display:flex;gap:10px;z-index:20">
        <button class="btn btn-ghost" style="flex:1">Save Draft</button>
        <button class="btn btn-primary" style="flex:2">Complete & Send to Advisor →</button>
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 7: CUSTOMER APPROVAL
  ───────────────────────────────── -->
  <div id="page-approval" class="page" style="background:var(--bg)">
    <div class="approval-frame">

      <div class="approval-hero">
        <div class="approval-shop-badge">
          <div class="approval-shop-logo">EE</div>
          <div>
            <div style="font-size:13px;font-weight:700">E&E Tires Automotive Center</div>
            <div style="font-size:11px;color:var(--text3)">Banning, CA · 951-797-0013</div>
          </div>
          <div class="tag tag-green" style="margin-left:auto">⭐ 4.9 · Trusted Shop</div>
        </div>

        <div style="font-family:var(--font-head);font-size:20px;font-weight:800;margin-bottom:6px">
          Hi David! Your vehicle inspection is ready.
        </div>
        <div style="font-size:13px;color:var(--text2);margin-bottom:14px">
          We completed your 50-point inspection on your <strong style="color:var(--text)">2021 Toyota Tacoma</strong>. We found a few items that need attention.
        </div>
        <div class="flex-center gap-12" style="flex-wrap:wrap">
          <div class="tag tag-red">🚨 2 Urgent</div>
          <div class="tag tag-amber">⚠ 2 Attention</div>
          <div class="tag tag-green">✓ 8 Good</div>
          <div style="font-family:var(--font-mono);font-size:12px;color:var(--text3);margin-left:auto">Sent Mon, Mar 16 · 11:40 AM</div>
        </div>
      </div>

      <!-- Estimate Items -->
      <div class="card mb-16">
        <div class="section-header mb-16">
          <div class="section-title">📋 Recommended Services</div>
          <div style="font-family:var(--font-head);font-size:18px;font-weight:800;color:var(--text)">Total: $680</div>
        </div>

        <div class="estimate-item">
          <div class="estimate-icon">🛑</div>
          <div style="flex:1">
            <div class="estimate-name">Front & Rear Brake Pads + Rotor Resurface</div>
            <div class="estimate-desc">Pads at 18% front / 22% rear. Metal-on-metal contact beginning. Labor + OEM parts.</div>
            <div class="estimate-risk">⚠ Risk: Failure to repair risks rotor scoring ($250 → $600+) and brake failure. CA minimum tread law applies.</div>
          </div>
          <div class="estimate-price" style="color:var(--red)">$420</div>
        </div>

        <div class="estimate-item">
          <div class="estimate-icon">🔄</div>
          <div style="flex:1">
            <div class="estimate-name">Brake Fluid Flush</div>
            <div class="estimate-desc">Moisture content elevated at 3.2%. Reduces boiling point and braking performance.</div>
            <div class="estimate-risk">⚠ Risk: Contaminated fluid can cause spongy pedal and brake fade under heavy use.</div>
          </div>
          <div class="estimate-price">$120</div>
        </div>

        <div class="estimate-item">
          <div class="estimate-icon">🛞</div>
          <div style="flex:1">
            <div class="estimate-name">Tire Rotation & Balance</div>
            <div class="estimate-desc">Uneven wear pattern detected on front right. Rotation will extend tire life.</div>
          </div>
          <div class="estimate-price">$39</div>
        </div>

        <div class="estimate-item">
          <div class="estimate-icon">🔋</div>
          <div style="flex:1">
            <div class="estimate-name">Battery Load Test (Complimentary)</div>
            <div class="estimate-desc">CCA at 68% — monitoring recommended. No charge today.</div>
          </div>
          <div class="estimate-price" style="color:var(--green)">Free</div>
        </div>

        <div style="border-top:1px solid var(--border);padding-top:14px;margin-top:4px;display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:11px;color:var(--text3)">Tekmetric Estimate #10482 · PDF attached</div>
          <button class="btn btn-ghost btn-sm">📄 View Full Estimate PDF</button>
        </div>
      </div>

      <!-- Photo Evidence -->
      <div class="card mb-16">
        <div class="section-title mb-12">📸 Inspection Photos</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;gap:4px"><span>🛑</span><span style="font-size:9px;color:var(--text3)">Front Pads</span></div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;gap:4px"><span>🛑</span><span style="font-size:9px;color:var(--text3)">Rear Pads</span></div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;gap:4px"><span>🛞</span><span style="font-size:9px;color:var(--text3)">FR Tire</span></div>
          <div style="background:var(--bg3);border:1px solid var(--border);border-radius:var(--r-sm);aspect-ratio:1;display:flex;flex-direction:column;align-items:center;justify-content:center;font-size:20px;gap:4px"><span>⚡</span><span style="font-size:9px;color:var(--text3)">Battery</span></div>
        </div>
      </div>

      <!-- Approval Actions -->
      <div class="approval-actions mb-16">
        <button class="approve-btn yes" onclick="alert('✅ Approved! Logged with timestamp, IP, and phone number.')">
          ✅ Approve All Work<br><span style="font-size:11px;font-weight:400;opacity:.8">Authorize $680</span>
        </button>
        <button class="approve-btn no">
          ✗ Decline<br><span style="font-size:11px;font-weight:400;opacity:.7">We'll note it in your file</span>
        </button>
      </div>

      <div class="card mb-16">
        <div style="font-size:12px;font-weight:700;margin-bottom:8px">💬 Have a question?</div>
        <textarea class="input" placeholder="Type your question for the service advisor…" style="min-height:60px;resize:none;margin-bottom:8px"></textarea>
        <button class="btn btn-ghost btn-sm">Send Question → We'll text you back</button>
      </div>

      <!-- Evidence Log -->
      <div class="card">
        <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em">🔒 Audit Trail</div>
        <div class="evidence-log">
          Approval page opened — Mon Mar 16 2025 11:40:12 PST<br>
          Customer: David Torres · (951) 555-0284<br>
          IP: 172.18.xx.xx · Device: iPhone iOS 17.3<br>
          Token: appr_tk_8f3a92bc1d4e<br>
          Inspection: insp_8TRK441_20250316<br>
          Estimate: #10482 · $680.00<br>
          ─────────────────────────────────<br>
          STATUS: <span style="color:var(--green)">AWAITING RESPONSE</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 8: MECHANICS
  ───────────────────────────────── -->
  <div id="page-mechanics" class="page">

    <div class="grid-4 mb-16">
      <div class="kpi-card green"><div class="kpi-label">Total Revenue — Mechanics</div><div class="kpi-value">$12,880</div><div class="kpi-sub">This week · 3 technicians</div></div>
      <div class="kpi-card blue"><div class="kpi-label">Inspections Done</div><div class="kpi-value">23</div></div>
      <div class="kpi-card amber"><div class="kpi-label">Recommendations Made</div><div class="kpi-value">41</div></div>
      <div class="kpi-card purple"><div class="kpi-label">Avg Approval Rate</div><div class="kpi-value">71%</div></div>
    </div>

    <div class="grid-3 mb-16">
      <!-- Mechanic 1 — Top Performer -->
      <div class="mechanic-card" style="border-color:rgba(16,185,129,.2)">
        <div class="mechanic-rank">#1</div>
        <div class="mechanic-avatar" style="background:linear-gradient(135deg,#10B981,#3B82F6)">JM</div>
        <div class="mechanic-name">Jose Martinez</div>
        <div class="mechanic-role">Lead Technician · ASE Certified</div>
        <div class="stat-row"><span class="stat-row-label">Inspections</span><span class="stat-row-value">10</span></div>
        <div class="stat-row"><span class="stat-row-label">Recommendations</span><span class="stat-row-value">18</span></div>
        <div class="stat-row"><span class="stat-row-label">Approved</span><span class="stat-row-value" style="color:var(--green)">15</span></div>
        <div class="stat-row"><span class="stat-row-label">Revenue Generated</span><span class="stat-row-value" style="color:var(--green)">$5,840</span></div>
        <div class="stat-row"><span class="stat-row-label">Avg per Inspection</span><span class="stat-row-value">$584</span></div>
        <div class="approval-rate-bar">
          <div class="approval-rate-label"><span>Approval Rate</span><span style="color:var(--green);font-weight:700">83%</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:83%;background:var(--green)"></div></div>
        </div>
        <div class="tag tag-green" style="margin-top:10px">⭐ Top Performer This Week</div>
      </div>

      <!-- Mechanic 2 -->
      <div class="mechanic-card">
        <div class="mechanic-rank">#2</div>
        <div class="mechanic-avatar" style="background:linear-gradient(135deg,#06B6D4,#10B981)">SR</div>
        <div class="mechanic-name">Sofia Reyes</div>
        <div class="mechanic-role">Technician · 3 yrs</div>
        <div class="stat-row"><span class="stat-row-label">Inspections</span><span class="stat-row-value">8</span></div>
        <div class="stat-row"><span class="stat-row-label">Recommendations</span><span class="stat-row-value">14</span></div>
        <div class="stat-row"><span class="stat-row-label">Approved</span><span class="stat-row-value" style="color:var(--green)">10</span></div>
        <div class="stat-row"><span class="stat-row-label">Revenue Generated</span><span class="stat-row-value" style="color:var(--green)">$4,420</span></div>
        <div class="stat-row"><span class="stat-row-label">Avg per Inspection</span><span class="stat-row-value">$553</span></div>
        <div class="approval-rate-bar">
          <div class="approval-rate-label"><span>Approval Rate</span><span style="color:var(--amber);font-weight:700">71%</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:71%;background:var(--amber)"></div></div>
        </div>
        <div class="tag tag-blue" style="margin-top:10px">Trending Up ↑</div>
      </div>

      <!-- Mechanic 3 — Needs Coaching -->
      <div class="mechanic-card" style="border-color:rgba(239,68,68,.15)">
        <div class="mechanic-rank">#3</div>
        <div class="mechanic-avatar" style="background:linear-gradient(135deg,#F59E0B,#EF4444)">CL</div>
        <div class="mechanic-name">Carlos Lopez</div>
        <div class="mechanic-role">Junior Technician · 8 mo</div>
        <div class="stat-row"><span class="stat-row-label">Inspections</span><span class="stat-row-value">5</span></div>
        <div class="stat-row"><span class="stat-row-label">Recommendations</span><span class="stat-row-value">9</span></div>
        <div class="stat-row"><span class="stat-row-label">Approved</span><span class="stat-row-value" style="color:var(--amber)">4</span></div>
        <div class="stat-row"><span class="stat-row-label">Revenue Generated</span><span class="stat-row-value" style="color:var(--text2)">$2,620</span></div>
        <div class="stat-row"><span class="stat-row-label">Avg per Inspection</span><span class="stat-row-value">$524</span></div>
        <div class="approval-rate-bar">
          <div class="approval-rate-label"><span>Approval Rate</span><span style="color:var(--red);font-weight:700">44%</span></div>
          <div class="progress-bar"><div class="progress-fill" style="width:44%;background:var(--red)"></div></div>
        </div>
        <div class="tag tag-red" style="margin-top:10px">⚠ Coaching Opportunity</div>
      </div>
    </div>

    <div class="card">
      <div class="section-title mb-12">📊 Weekly Comparison</div>
      <table class="table">
        <thead>
          <tr>
            <th>Mechanic</th>
            <th>Inspections</th>
            <th>Recommendations</th>
            <th>Approvals</th>
            <th>Approval Rate</th>
            <th>Revenue</th>
            <th>Avg / Job</th>
            <th>Trend</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><div class="flex-center gap-8"><div class="avatar-sm" style="background:linear-gradient(135deg,#10B981,#3B82F6)">JM</div><strong>Jose Martinez</strong></div></td>
            <td>10</td><td>18</td><td><span style="color:var(--green);font-weight:700">15</span></td>
            <td><span class="tag tag-green">83%</span></td>
            <td><strong style="color:var(--green)">$5,840</strong></td>
            <td>$584</td>
            <td><span style="color:var(--green)">↑ +12%</span></td>
          </tr>
          <tr>
            <td><div class="flex-center gap-8"><div class="avatar-sm" style="background:linear-gradient(135deg,#06B6D4,#10B981)">SR</div><strong>Sofia Reyes</strong></div></td>
            <td>8</td><td>14</td><td><span style="color:var(--green);font-weight:700">10</span></td>
            <td><span class="tag tag-amber">71%</span></td>
            <td><strong style="color:var(--green)">$4,420</strong></td>
            <td>$553</td>
            <td><span style="color:var(--green)">↑ +5%</span></td>
          </tr>
          <tr>
            <td><div class="flex-center gap-8"><div class="avatar-sm" style="background:linear-gradient(135deg,#F59E0B,#EF4444)">CL</div><strong>Carlos Lopez</strong></div></td>
            <td>5</td><td>9</td><td><span style="color:var(--amber);font-weight:700">4</span></td>
            <td><span class="tag tag-red">44%</span></td>
            <td><strong style="color:var(--text2)">$2,620</strong></td>
            <td>$524</td>
            <td><span style="color:var(--red)">↓ -8%</span></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 9: MESSAGES
  ───────────────────────────────── -->
  <div id="page-messages" class="page" style="padding-bottom:0">
    <div class="messages-layout">
      <div class="msg-sidebar">
        <div class="msg-sidebar-header">
          <div class="section-title mb-8">Messages</div>
          <div class="search-bar" style="width:100%">🔍 Search…</div>
        </div>

        <!-- Filter tabs -->
        <div class="flex-center gap-4" style="padding:8px 14px;border-bottom:1px solid var(--border)">
          <button class="btn btn-primary btn-sm">All</button>
          <button class="btn btn-ghost btn-sm">SMS</button>
          <button class="btn btn-ghost btn-sm">Auto</button>
        </div>

        <div class="msg-thread active">
          <div class="flex-between mb-4">
            <span class="msg-thread-name">David Torres</span>
            <span class="msg-thread-time">11:32</span>
          </div>
          <div class="msg-thread-preview">✓ Approved $680 estimate — thanks!</div>
        </div>

        <div class="msg-thread">
          <div class="flex-between mb-4">
            <span class="msg-thread-name">(951) 555-0429</span>
            <div class="flex-center gap-6"><span class="msg-thread-time">11:15</span><div class="msg-unread"></div></div>
          </div>
          <div class="msg-thread-preview">Hey, I called earlier about my brakes</div>
        </div>

        <div class="msg-thread">
          <div class="flex-between mb-4">
            <span class="msg-thread-name">Sofia Reyes pickup</span>
            <span class="msg-thread-time">10:58</span>
          </div>
          <div class="msg-thread-preview">🤖 AUTO: Your car is ready for pickup!</div>
        </div>

        <div class="msg-thread">
          <div class="flex-between mb-4">
            <span class="msg-thread-name">Angela Brooks</span>
            <span class="msg-thread-time">10:22</span>
          </div>
          <div class="msg-thread-preview">🤖 REMINDER: Oil change overdue — 800mi past…</div>
        </div>

        <div class="msg-thread">
          <div class="flex-between mb-4">
            <span class="msg-thread-name">Maria Gonzalez</span>
            <span class="msg-thread-time">09:50</span>
          </div>
          <div class="msg-thread-preview">🔗 Approval link sent — $485 estimate</div>
        </div>

        <div style="padding:8px 14px;font-size:11px;color:var(--text3);border-top:1px solid var(--border);margin-top:auto">
          📊 Today: 14 messages sent · 8 auto-sent · 3 missed-call recoveries
        </div>
      </div>

      <div class="msg-main">
        <div class="msg-main-header">
          <div class="avatar-sm" style="background:linear-gradient(135deg,#3B82F6,#8B5CF6);width:34px;height:34px">DT</div>
          <div>
            <div style="font-size:13px;font-weight:700">David Torres</div>
            <div style="font-size:11px;color:var(--text3)">(951) 555-0284 · 2021 Toyota Tacoma · In Shop</div>
          </div>
          <div style="margin-left:auto;display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm">📋 View Job</button>
            <button class="btn btn-ghost btn-sm">🔗 Send Approval Link</button>
            <button class="btn btn-primary btn-sm">📞 Call</button>
          </div>
        </div>

        <div class="msg-body">
          <div class="msg-bubble system">🤖 Auto: Appointment confirmed — Mon Mar 16 @ 9:00 AM · Mon, 8:54 AM</div>

          <div>
            <div class="msg-bubble inbound">Hey, I'm here for my 9 o'clock. 2021 Tacoma.</div>
            <div class="msg-timestamp">9:02 AM</div>
          </div>

          <div>
            <div class="msg-bubble outbound">Welcome David! We've got you checked in. Jose will start the inspection shortly. We'll text you updates!</div>
            <div class="msg-timestamp" style="text-align:right">9:05 AM · Sent by Jose M.</div>
          </div>

          <div class="msg-bubble system">🔍 Inspection started — Jose M. · 10:22 AM</div>

          <div>
            <div class="msg-bubble outbound">David, your inspection is complete. We found a couple of items that need attention. Here's your report + estimate: [link] — Total: $680</div>
            <div class="msg-timestamp" style="text-align:right">11:38 AM · Sent by Eddie O.</div>
          </div>

          <div class="msg-bubble system">📄 Approval link opened by customer — 11:40 AM · iPhone</div>

          <div>
            <div class="msg-bubble inbound">Thanks for the detailed report with photos! Much better than just getting a call. Approving it all.</div>
            <div class="msg-timestamp">11:42 AM</div>
          </div>

          <div>
            <div class="msg-bubble inbound">✅ Approved all work — $680 authorized</div>
            <div class="msg-timestamp">11:42 AM</div>
          </div>

          <div class="msg-bubble system">✅ Customer approved estimate #10482 · $680 · Logged 11:42:07 PST</div>
        </div>

        <div class="msg-input-area">
          <textarea class="msg-input" placeholder="Type a message to David…" rows="1"></textarea>
          <button class="btn btn-ghost btn-sm">Templates ▾</button>
          <button class="btn btn-primary">Send ➤</button>
        </div>
      </div>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 10: REMINDERS
  ───────────────────────────────── -->
  <div id="page-reminders" class="page">

    <div class="grid-4 mb-16">
      <div class="kpi-card amber"><div class="kpi-label">Due This Week</div><div class="kpi-value">38</div><div class="kpi-sub">Est. revenue $4,200</div></div>
      <div class="kpi-card green"><div class="kpi-label">Reminders Sent (30d)</div><div class="kpi-value">142</div></div>
      <div class="kpi-card blue"><div class="kpi-label">Conversions</div><div class="kpi-value">34</div><div class="kpi-sub kpi-trend-up">24% conversion rate</div></div>
      <div class="kpi-card purple"><div class="kpi-label">Revenue Attributed</div><div class="kpi-value">$8,240</div></div>
    </div>

    <div class="grid-2 mb-16">
      <div class="card">
        <div class="section-header mb-12">
          <div class="section-title">🔥 Urgent — Send Today</div>
          <button class="btn btn-amber btn-sm">Send All 14 →</button>
        </div>

        <div class="reminder-card" style="border-color:rgba(239,68,68,.2)">
          <div class="reminder-icon">🛢️</div>
          <div class="reminder-info">
            <div class="reminder-name">Angela Brooks · 2018 Nissan Rogue</div>
            <div class="reminder-detail">Oil change — 800 miles overdue · Last visit 48 days ago</div>
          </div>
          <div style="text-align:right">
            <div class="reminder-revenue">$89</div>
            <button class="btn btn-red btn-sm" style="margin-top:4px">Send Now</button>
          </div>
        </div>

        <div class="reminder-card">
          <div class="reminder-icon">🛞</div>
          <div class="reminder-info">
            <div class="reminder-name">Marcus Webb · 2019 Hyundai Santa Fe</div>
            <div class="reminder-detail">Tire rotation — due at 45,000 mi · Currently 44,820</div>
          </div>
          <div style="text-align:right">
            <div class="reminder-revenue">$39</div>
            <button class="btn btn-amber btn-sm" style="margin-top:4px">Send Now</button>
          </div>
        </div>

        <div class="reminder-card">
          <div class="reminder-icon">🛑</div>
          <div class="reminder-info">
            <div class="reminder-name">Lisa Tran · 2020 Toyota Corolla</div>
            <div class="reminder-detail">Brake check — recommended at last visit 7 months ago</div>
          </div>
          <div style="text-align:right">
            <div class="reminder-revenue">$49</div>
            <button class="btn btn-amber btn-sm" style="margin-top:4px">Send Now</button>
          </div>
        </div>

        <div class="reminder-card">
          <div class="reminder-icon">💤</div>
          <div class="reminder-info">
            <div class="reminder-name">Patricia Lee · 2020 Toyota RAV4</div>
            <div class="reminder-detail">6-month reactivation — no visit since Oct 2024</div>
          </div>
          <div style="text-align:right">
            <div class="reminder-revenue">?</div>
            <button class="btn btn-ghost btn-sm" style="margin-top:4px">Reactivate</button>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="section-header mb-12">
          <div class="section-title">📊 Reminder Performance</div>
        </div>
        <div class="stat-row mb-8"><span class="stat-row-label">Oil Change Reminders</span><span class="stat-row-value">62 sent · <span style="color:var(--green)">18 converted</span></span></div>
        <div class="progress-bar mb-12"><div class="progress-fill" style="width:29%;background:var(--green)"></div></div>
        <div class="stat-row mb-8"><span class="stat-row-label">Tire Rotation Reminders</span><span class="stat-row-value">28 sent · <span style="color:var(--green)">7 converted</span></span></div>
        <div class="progress-bar mb-12"><div class="progress-fill" style="width:25%;background:var(--blue)"></div></div>
        <div class="stat-row mb-8"><span class="stat-row-label">Brake Check Reminders</span><span class="stat-row-value">22 sent · <span style="color:var(--green)">6 converted</span></span></div>
        <div class="progress-bar mb-12"><div class="progress-fill" style="width:27%;background:var(--amber)"></div></div>
        <div class="stat-row mb-8"><span class="stat-row-label">Reactivation Campaign</span><span class="stat-row-value">30 sent · <span style="color:var(--amber)">3 converted</span></span></div>
        <div class="progress-bar mb-16"><div class="progress-fill" style="width:10%;background:var(--purple)"></div></div>

        <div class="divider"></div>
        <div style="font-family:var(--font-head);font-size:22px;font-weight:800;color:var(--green);margin-bottom:4px">$8,240</div>
        <div style="font-size:12px;color:var(--text3)">Revenue attributed to reminders this month<br><span style="color:var(--green)">↑ +$2,100</span> vs last month</div>
      </div>
    </div>

    <div class="card">
      <div class="section-header mb-12">
        <div class="section-title">🔮 AI-Predicted Service Needs</div>
        <div class="tag tag-blue">Predictive Engine v1</div>
      </div>
      <table class="table">
        <thead>
          <tr><th>Customer</th><th>Vehicle</th><th>Predicted Service</th><th>Confidence</th><th>Est. Value</th><th>Send Reminder</th></tr>
        </thead>
        <tbody>
          <tr><td><strong>David Torres</strong></td><td>2021 Toyota Tacoma</td><td>Tire rotation · Due in 1,180 mi</td><td><span class="tag tag-green">High 94%</span></td><td>$39</td><td><button class="btn btn-ghost btn-sm">Schedule</button></td></tr>
          <tr><td><strong>Carlos Ruiz</strong></td><td>2018 Dodge Ram</td><td>Oil change · Due in 3 weeks</td><td><span class="tag tag-green">High 89%</span></td><td>$89</td><td><button class="btn btn-amber btn-sm">Send Now</button></td></tr>
          <tr><td><strong>Frank Moreno</strong></td><td>2016 Chevy Malibu</td><td>Brake inspection · 14 months since last</td><td><span class="tag tag-amber">Med 72%</span></td><td>$49</td><td><button class="btn btn-ghost btn-sm">Schedule</button></td></tr>
          <tr><td><strong>Tom Bradley</strong></td><td>2018 GMC Sierra</td><td>Air filter · 18K miles since change</td><td><span class="tag tag-amber">Med 68%</span></td><td>$35</td><td><button class="btn btn-ghost btn-sm">Schedule</button></td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- ─────────────────────────────
       PAGE 11: ESTIMATES
  ───────────────────────────────── -->
  <div id="page-estimates" class="page">

    <div class="grid-4 mb-16">
      <div class="kpi-card amber"><div class="kpi-label">Pending Approval</div><div class="kpi-value">$4,820</div><div class="kpi-sub">5 estimates open</div></div>
      <div class="kpi-card green"><div class="kpi-label">Approved Today</div><div class="kpi-value">$1,220</div></div>
      <div class="kpi-card red"><div class="kpi-label">Declined</div><div class="kpi-value">$380</div></div>
      <div class="kpi-card blue"><div class="kpi-label">Approval Rate</div><div class="kpi-value">76%</div></div>
    </div>

    <!-- New Estimate -->
    <div class="card mb-16">
      <div class="section-title mb-12">📤 Upload & Send New Estimate</div>
      <div class="grid-2">
        <div>
          <div class="pdf-upload-zone">
            <div style="font-size:32px;margin-bottom:8px">📄</div>
            <div style="font-size:13px;font-weight:600;margin-bottom:4px">Drop Tekmetric Estimate PDF</div>
            <div style="font-size:11px;color:var(--text3)">or click to browse · PDF or image</div>
          </div>
          <div class="flex-center gap-8">
            <select class="input" style="flex:1">
              <option>Link to Customer — Search name or plate…</option>
              <option>David Torres · 2021 Toyota Tacoma</option>
              <option>Maria Gonzalez · 2019 Honda CR-V</option>
            </select>
          </div>
        </div>
        <div>
          <div style="font-size:11px;color:var(--text3);margin-bottom:8px;text-transform:uppercase;letter-spacing:.06em;font-weight:700">Select Linked Inspection</div>
          <div class="approval-status-row" style="cursor:pointer;border:1px solid var(--blue);background:var(--blue-dim)">
            <span>✓</span><span style="flex:1"><strong>2021 Toyota Tacoma</strong> · DVI Mar 16 · Jose M.</span><span class="tag tag-blue">Current</span>
          </div>
          <div class="approval-status-row" style="cursor:pointer">
            <span>○</span><span style="flex:1">2019 Honda CR-V · DVI Mar 15 · Sofia R.</span><span class="tag tag-gray">Select</span>
          </div>
          <div style="margin-top:12px;display:flex;gap:8px">
            <button class="btn btn-ghost btn-sm" style="flex:1">Preview</button>
            <button class="btn btn-primary" style="flex:2">📱 Send Approval Link via SMS</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Active Estimates -->
    <div class="card">
      <div class="section-header mb-16">
        <div class="section-title">📋 Active Estimates</div>
        <div class="flex-center gap-8">
          <button class="btn btn-ghost btn-sm">Filter ▾</button>
          <div class="search-bar" style="width:180px">🔍 Search…</div>
        </div>
      </div>

      <div class="estimate-card">
        <div class="estimate-card-header">
          <div>
            <div style="font-size:14px;font-weight:700;margin-bottom:3px">David Torres — Est. #10482</div>
            <div style="font-size:11px;color:var(--text3)">2021 Toyota Tacoma · Mar 16, 2025 · Jose M.</div>
          </div>
          <div style="text-align:right">
            <div class="tag tag-amber mb-4">⏳ Awaiting Approval</div>
            <div style="font-family:var(--font-head);font-size:20px;font-weight:800">$680</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">
          Brake pads + rotors + fluid flush + tire rotation · PDF uploaded · Approval link sent 11:38 AM
        </div>
        <div class="flex-center gap-8">
          <div class="tag tag-blue">DVI Linked</div>
          <div class="tag tag-blue">PDF Uploaded</div>
          <div class="tag tag-amber">Link Opened ✓</div>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto">View →</button>
          <button class="btn btn-ghost btn-sm">Resend Link</button>
          <button class="btn btn-primary btn-sm">View Approval Page</button>
        </div>
      </div>

      <div class="estimate-card">
        <div class="estimate-card-header">
          <div>
            <div style="font-size:14px;font-weight:700;margin-bottom:3px">Linda Park — Est. #10479</div>
            <div style="font-size:11px;color:var(--text3)">2015 Hyundai Sonata · Mar 15, 2025 · Sofia R.</div>
          </div>
          <div style="text-align:right">
            <div class="tag tag-amber mb-4">⏳ Awaiting — 1 day</div>
            <div style="font-family:var(--font-head);font-size:20px;font-weight:800">$920</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px">
          Suspension + alignment · Approval link sent yesterday — no response
        </div>
        <div class="flex-center gap-8">
          <div class="tag tag-blue">DVI Linked</div>
          <div class="tag tag-gray">Link Not Opened</div>
          <button class="btn btn-ghost btn-sm" style="margin-left:auto">View →</button>
          <button class="btn btn-amber btn-sm">Follow-Up SMS</button>
        </div>
      </div>

      <div class="estimate-card" style="opacity:.7">
        <div class="estimate-card-header">
          <div>
            <div style="font-size:14px;font-weight:700;margin-bottom:3px">Sofia Reyes — Est. #10474</div>
            <div style="font-size:11px;color:var(--text3)">2020 Chevrolet Equinox · Mar 14, 2025</div>
          </div>
          <div style="text-align:right">
            <div class="tag tag-green mb-4">✅ Approved</div>
            <div style="font-family:var(--font-head);font-size:20px;font-weight:800;color:var(--green)">$320</div>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text2)">
          Oil change + air filter · Approved via SMS · Mar 14 at 2:38 PM · Evidence logged
        </div>
      </div>
    </div>
  </div>

</div><!-- /#main -->
</div><!-- /#app -->`
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <DashboardScripts />
    </>
  )
}
