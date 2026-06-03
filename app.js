// ==========================================
// RECESS WELLNESS PLANNER - CONTROL CENTER
// ==========================================

// Global App States
let currentUser = null; // null represents guest mode, otherwise contains active user object
let activeView = 'view-landing'; // Active visible view panel ID
let isSidebarOpen = true; // Sidebar collapse toggle state
let selectedDateStr = null; // Current active calendar selection YYYY-MM-DD
let activeTrackers = []; // Trackers list (seeded defaults + custom)
let activeLogs = []; // Daily logged records
let activeNotes = []; // Diary entry notes
let activeCycleLogs = []; // Menstrual histories
let activeGoals = []; // User task goals
let globalChartInstances = {}; // Cache to destroy/re-render Chart.js instances clean

// Constants & Presets
const FEATURE_CARDS = [
  { icon: '🥗', title: 'Nutrition Tracking', desc: 'Log water, protein, fiber intake, and diet patterns daily.' },
  { icon: '💪', title: 'Fitness Tracking', desc: 'Record physical workouts, daily step goals, and weight changes.' },
  { icon: '📝', title: 'Daily Notes', desc: 'Reflect on highlights, write mood journals, and log meals.' },
  { icon: '🌸', title: 'Cycle Tracking', desc: 'Subtly log period start dates, flows, energy metrics, and symptoms.' },
  { icon: '🎯', title: 'Goal Tracking', desc: 'Track daily, weekly, monthly, and yearly milestones cleanly.' },
  { icon: '📊', title: 'Wellness Insights', desc: 'Review habit consistency charts and weekly progress reports.' },
  { icon: '🛠', title: 'Custom Trackers', desc: 'Create custom trackers with personalized colors, emojis, and types.' }
];

const HOW_IT_WORKS = [
  { step: '1', title: 'Create your journal', desc: 'Register a free private account in seconds to secure your logs.' },
  { step: '2', title: 'Choose what to track', desc: 'Enable defaults or build custom trackers matching your lifestyle.' },
  { step: '3', title: 'Record daily progress', desc: 'Click dates on your calendar grid to log stats, notes, and moods.' },
  { step: '4', title: 'Review your journey', desc: 'Access beautiful minimalist charts and weekly summary stats.' }
];

const TESTIMONIALS = [
  { name: 'Sarah M.', role: 'Yoga Teacher', text: '“Recess feels like a physical paper planner! The colors are soft, and it keeps tracking simple without annoying gamification popups.”', emoji: '🧘‍♀️' },
  { name: 'Elena R.', role: 'Designer', text: '“I love the custom trackers. I created one for reading and coding, and they automatically appear on my date logs!”', emoji: '🎨' },
  { name: 'Chloe B.', role: 'Nurse Practitioner', text: '“Hormonal cycle tracking is private and subtle. The estimates show up gently as cute flowers on relevant dates. Absolutely perfect.”', emoji: '🌸' }
];

const PRESET_EMOJIS = ['💧', '😴', '💪', '🚶', '🥗', '🧴', '💊', '📝', '📚', '🧘', '💻', '☕', '🛌', '🍎', '🎨', '🌱', '🌟'];
const PRESET_COLORS = [
  { name: 'pink', class: 'bg-brand-pink border-pink-300' },
  { name: 'blue', class: 'bg-brand-blue border-blue-300' },
  { name: 'green', class: 'bg-brand-green border-emerald-300' },
  { name: 'lavender', class: 'bg-brand-lavender border-purple-300' },
  { name: 'cream', class: 'bg-brand-cream border-amber-300' }
];

// Document Event Init Hook
document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});

// ----------------------------------------------------
// BOOTSTRAP APPLICATION
// ----------------------------------------------------
async function initApp() {
  try {
    // 1. Fetch active session
    currentUser = await window.db.getCurrentUser();

    // 2. Clear page loadings, build nav buttons
    renderNav();
    
    // 3. Determine active portal
    if (currentUser) {
      document.getElementById('public-nav').classList.add('hidden');
      document.getElementById('public-footer').classList.add('hidden');
      document.getElementById('authenticated-portal').classList.remove('hidden');
      
      // Determine if sidebar should be open based on screen width
      isSidebarOpen = window.innerWidth >= 768;
      const sidebar = document.getElementById('sidebar-container');
      const toggleBtnArrow = document.getElementById('sidebar-toggle-arrow');
      if (sidebar && toggleBtnArrow) {
        if (isSidebarOpen) {
          sidebar.className = "bg-brand-cream border-l-4 border-zinc-800 h-screen py-8 flex flex-col justify-between transition-all duration-300 w-64 px-6";
          toggleBtnArrow.textContent = '›';
        } else {
          sidebar.className = "bg-brand-cream border-l-4 border-zinc-800 h-screen py-8 flex flex-col justify-between transition-all duration-300 w-0 px-0 overflow-hidden border-l-0";
          toggleBtnArrow.textContent = '‹';
        }
      }

      // Seed details
      await syncUserStorageData();
      renderSidebar();
      
      // Navigate to Cover Dashboard by default
      navigateTo('view-dashboard');
    } else {
      document.getElementById('public-nav').classList.remove('hidden');
      document.getElementById('public-footer').classList.remove('hidden');
      document.getElementById('authenticated-portal').classList.add('hidden');
      
      // Seeding landing info grids
      initLandingPage();
      navigateTo('view-landing');
    }

    // Bind hash navigations for landing sections
    window.addEventListener('hashchange', handleHashNavigation);
    handleHashNavigation();
  } catch (e) {
    console.error('App initialization crash', e);
  }
}

// Sync global states with db logs
async function syncUserStorageData() {
  if (!currentUser) return;
  try {
    const id = currentUser.id;
    activeTrackers = await window.db.getTrackers(id);
    activeLogs = await window.db.getLogs(id);
    activeNotes = await window.db.getNotes(id);
    activeCycleLogs = await window.db.getCycleLogs(id);
    activeGoals = await window.db.getGoals(id);
  } catch (e) {
    console.error('Error synchronizing database states', e);
  }
}

// ----------------------------------------------------
// SIDEBAR COLLAPSE ENGINE
// ----------------------------------------------------
function toggleSidebar() {
  isSidebarOpen = !isSidebarOpen;
  const sidebar = document.getElementById('sidebar-container');
  const toggleBtnArrow = document.getElementById('sidebar-toggle-arrow');
  
  if (isSidebarOpen) {
    sidebar.className = "bg-brand-cream border-l-4 border-zinc-800 h-screen py-8 flex flex-col justify-between transition-all duration-300 w-64 px-6";
    toggleBtnArrow.textContent = '›';
  } else {
    sidebar.className = "bg-brand-cream border-l-4 border-zinc-800 h-screen py-8 flex flex-col justify-between transition-all duration-300 w-0 px-0 overflow-hidden border-l-0";
    toggleBtnArrow.textContent = '‹';
  }
}

// ----------------------------------------------------
// DYNAMIC VIEW ROUTER
// ----------------------------------------------------
function navigateTo(viewId) {
  // Hide all sub-views
  document.querySelectorAll('.portal-view').forEach(v => {
    v.classList.add('hidden');
  });

  // Show active view
  const target = document.getElementById(viewId);
  if (target) {
    target.classList.remove('hidden');
    activeView = viewId;
  }

  // Hide general landing view if inside portal
  if (viewId !== 'view-landing') {
    document.getElementById('view-landing').classList.add('hidden');
  } else {
    document.getElementById('view-landing').classList.remove('hidden');
  }

  // Trigger page builders reactively
  if (viewId === 'view-dashboard') initDashboard();
  else if (viewId === 'view-calendar') initCalendarPage();
  else if (viewId === 'view-journal') initJournalPage();
  else if (viewId === 'view-trackers') initCustomTrackers();
  else if (viewId === 'view-stats') initStatistics();
  else if (viewId === 'view-cycle') initCycleTracker();
  else if (viewId === 'view-settings') initSettingsPage();
  else if (viewId === 'view-about') initAboutPage();

  // Scroll to top
  window.scrollTo(0, 0);

  // Sync sidebar active styling highlight
  updateSidebarHighlight(viewId);

  // Auto-close sidebar on mobile after navigation
  if (window.innerWidth < 768 && isSidebarOpen) {
    toggleSidebar();
  }
}

function navigateToLanding() {
  document.getElementById('authenticated-portal').classList.add('hidden');
  document.getElementById('public-nav').classList.remove('hidden');
  document.getElementById('public-footer').classList.remove('hidden');
  navigateTo('view-landing');
}

// Handle anchor scrolls in landing page
function handleHashNavigation() {
  if (activeView !== 'view-landing') return;
  const hash = window.location.hash;
  if (hash) {
    const el = document.querySelector(hash);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }
}

// ----------------------------------------------------
// DYNAMIC COMPONENT RENDERERS: NAV & SIDEBAR
// ----------------------------------------------------
function renderNav() {
  const navContainer = document.getElementById('nav-auth-buttons');
  if (!navContainer) return;

  if (currentUser) {
    const initial = currentUser.name ? currentUser.name.charAt(0).toUpperCase() : '🌸';
    navContainer.innerHTML = `
      <button onclick="navigateTo('view-dashboard')" class="px-4 py-2 bg-white hover:bg-zinc-50 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm">
        Dashboard
      </button>
      <div onclick="navigateTo('view-settings')" class="w-10 h-10 border-2 border-zinc-800 rounded-full bg-brand-pink flex items-center justify-center font-bold text-zinc-800 cursor-pointer shadow-planner-sm hover:scale-105 transition-transform" title="My Profile Settings">
        ${escapeHtml(initial)}
      </div>
    `;
  } else {
    navContainer.innerHTML = `
      <button onclick="openAuthModal('signin')" class="px-4 py-2 text-zinc-700 hover:text-zinc-900 font-bold transition-colors cursor-pointer">
        Sign In
      </button>
      <button onclick="openAuthModal('signup')" class="px-5 py-2.5 bg-brand-pink hover:bg-pink-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">
        Create Account
      </button>
    `;
  }
}

function renderSidebar() {
  const sidebar = document.getElementById('sidebar-container');
  if (!sidebar) return;

  const isCycleEnabled = currentUser?.menstrual_cycle_enabled;

  const menuItems = [
    { name: 'Home', viewId: 'view-dashboard', icon: '🏠', color: 'hover:bg-brand-pink' },
    { name: 'Calendar', viewId: 'view-calendar', icon: '🗓️', color: 'hover:bg-brand-blue' },
    { name: 'Journal', viewId: 'view-journal', icon: '📝', color: 'hover:bg-brand-green' },
    { name: 'Trackers', viewId: 'view-trackers', icon: '🛠️', color: 'hover:bg-brand-pink' },
    { name: 'Statistics', viewId: 'view-stats', icon: '📊', color: 'hover:bg-brand-lavender' },
    ...(isCycleEnabled ? [{ name: 'Cycle Tracker', viewId: 'view-cycle', icon: '🌸', color: 'hover:bg-brand-pink' }] : []),
    { name: 'Settings', viewId: 'view-settings', icon: '⚙️', color: 'hover:bg-brand-blue' },
    { name: 'About', viewId: 'view-about', icon: 'ℹ️', color: 'hover:bg-brand-green' }
  ];

  let navItemsHtml = menuItems.map(item => `
    <button onclick="navigateTo('${item.viewId}')" id="sb-link-${item.viewId}" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all font-semibold text-zinc-700 hover:text-zinc-900 border-transparent hover:border-zinc-800 hover:shadow-planner-sm ${item.color} cursor-pointer">
      <span class="text-lg">${item.icon}</span>
      <span class="text-sm font-semibold">${item.name}</span>
    </button>
  `).join('');

  sidebar.innerHTML = `
    <div>
      <div class="mb-8 border-b-2 border-zinc-800 pb-4 text-center cursor-pointer" onclick="navigateToLanding()">
        <h2 class="font-display text-2xl font-extrabold text-zinc-800 tracking-wide">
          🌸 Recess
        </h2>
        <p class="text-[10px] text-zinc-500 font-bold mt-1 uppercase tracking-widest">
          My Wellness Journal
        </p>
      </div>

      <nav class="space-y-2">
        ${navItemsHtml}
      </nav>
    </div>

    <div class="border-t-2 border-zinc-200 pt-4">
      <div class="flex items-center gap-3 px-2 mb-4">
        <span class="text-2xl">🌸</span>
        <div class="truncate">
          <p class="text-sm font-bold text-zinc-800 truncate">${escapeHtml(currentUser?.name || 'Friend')}</p>
          <p class="text-[10px] text-zinc-400 truncate">${escapeHtml(currentUser?.email || 'sandbox-session')}</p>
        </div>
      </div>
      <button onclick="handleLogoutClick()" class="w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-transparent hover:border-zinc-800 hover:bg-red-50 text-red-600 hover:text-red-700 font-bold transition-all hover:shadow-planner-sm cursor-pointer">
        <span>🚪</span>
        <span class="text-sm">Log Out</span>
      </button>
    </div>
  `;
}

function updateSidebarHighlight(viewId) {
  document.querySelectorAll('[id^="sb-link-"]').forEach(el => {
    el.className = el.className
      .replace('bg-zinc-800 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white shadow-none', 'border-transparent text-zinc-700 hover:text-zinc-900')
      .trim();
  });
  
  const activeLink = document.getElementById(`sb-link-${viewId}`);
  if (activeLink) {
    activeLink.className += ' bg-zinc-800 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white shadow-none';
  }
}

async function handleLogoutClick() {
  if (confirm('Are you sure you want to sign out from Recess?')) {
    await window.db.signOut();
  }
}

// ----------------------------------------------------
// VIEW BUILDER: PUBLIC LANDING PAGE
// ----------------------------------------------------
function initLandingPage() {
  // 1. Features
  const featuresContainer = document.getElementById('features-cards-container');
  if (featuresContainer) {
    featuresContainer.innerHTML = FEATURE_CARDS.map(f => `
      <div class="bg-brand-cream/5 border-2 border-zinc-800 rounded-3xl p-6 shadow-planner hover:-translate-y-0.5 transition-all text-left flex flex-col justify-between">
        <div class="space-y-4">
          <span class="text-3xl block w-fit p-2 border-2 border-zinc-800 bg-[#FFFDF5] rounded-xl shadow-planner-sm">
            ${f.icon}
          </span>
          <h3 class="font-display text-lg font-extrabold text-zinc-800">${f.title}</h3>
          <p class="text-xs font-semibold text-zinc-500 leading-relaxed">${f.desc}</p>
        </div>
      </div>
    `).join('');
  }

  // 2. How it works
  const howitworksContainer = document.getElementById('howitworks-container');
  if (howitworksContainer) {
    howitworksContainer.innerHTML = HOW_IT_WORKS.map((h, idx) => `
      <div class="relative flex flex-col items-center p-6 text-center space-y-4">
        <div class="w-12 h-12 bg-brand-blue border-2 border-zinc-800 rounded-2xl flex items-center justify-center font-display font-extrabold text-lg text-zinc-800 shadow-planner-sm">
          ${h.step}
        </div>
        <h3 class="font-display text-lg font-extrabold text-zinc-800">${h.title}</h3>
        <p class="text-xs font-semibold text-zinc-500 leading-relaxed">${h.desc}</p>
        ${idx < 3 ? `
          <div class="hidden lg:block absolute right-[-24px] top-[30px] text-zinc-300 font-bold text-lg">➔</div>
        ` : ''}
      </div>
    `).join('');
  }

  // 3. Testimonials
  const testimonialsContainer = document.getElementById('testimonials-container');
  if (testimonialsContainer) {
    testimonialsContainer.innerHTML = TESTIMONIALS.map(t => `
      <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 shadow-planner hover:-translate-y-0.5 transition-all text-left flex flex-col justify-between">
        <div class="space-y-4">
          <span class="text-3xl block w-fit p-1 bg-zinc-50 rounded-xl">${t.emoji}</span>
          <p class="text-sm font-semibold text-zinc-600 leading-relaxed italic">${t.text}</p>
        </div>
        <div class="border-t border-zinc-100 pt-4 mt-6">
          <h4 class="font-display font-extrabold text-zinc-800 text-sm">${t.name}</h4>
          <span class="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">${t.role}</span>
        </div>
      </div>
    `).join('');
  }

  // 4. Render interactive guest calendar
  renderDemoCalendar();
}

function renderDemoCalendar() {
  const container = document.getElementById('demo-calendar-container');
  if (!container) return;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Grid dates calculations
  const firstDayIdx = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotal = new Date(year, month, 0).getDate();

  // Create weekdays header
  const weekdayHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => `
    <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest py-2">${w}</span>
  `).join('');

  // Create date squares
  let squares = '';

  // Prev month padding
  for (let i = 0; i < firstDayIdx; i++) {
    const d = prevMonthTotal - firstDayIdx + i + 1;
    squares += `
      <div class="aspect-square bg-zinc-50/50 border border-zinc-100 rounded-2xl flex flex-col justify-start p-2 opacity-40 pointer-events-none">
        <span class="text-xs font-bold text-zinc-300">${d}</span>
      </div>
    `;
  }

  // Current month days
  const todayDateStr = now.toISOString().split('T')[0];
  const demoLogs = window.db.getDemoData().logs;
  const demoNotes = window.db.getDemoData().notes;
  const demoCycles = window.db.getDemoData().cycleLogs;

  for (let d = 1; d <= totalDays; d++) {
    const fMonth = String(month + 1).padStart(2, '0');
    const fDay = String(d).padStart(2, '0');
    const dateStr = `${year}-${fMonth}-${fDay}`;

    const isToday = dateStr === todayDateStr;
    const isPeriodDay = demoCycles.some(c => c.date === dateStr && c.is_period);
    const dayNote = demoNotes.find(n => n.date === dateStr);
    const dayLogs = demoLogs.filter(l => l.date === dateStr && l.value !== 'false' && l.value !== '0');

    squares += `
      <button onclick="handleDemoDateClick('${dateStr}')" class="aspect-square border-2 rounded-2xl p-1.5 md:p-2.5 flex flex-col justify-between items-start text-left cursor-pointer group transition-all duration-200 ${
        isToday 
          ? 'bg-brand-cream border-zinc-800 shadow-planner-sm' 
          : isPeriodDay 
          ? 'bg-brand-pink/30 border-pink-300 hover:border-zinc-800' 
          : 'bg-white border-zinc-200 hover:border-zinc-800 hover:shadow-planner-sm'
      }">
        <div class="flex justify-between items-center w-full">
          <span class="text-xs md:text-sm font-extrabold flex items-center justify-center w-6 h-6 rounded-full ${
            isToday ? 'bg-zinc-800 text-white shadow-planner-sm' : isPeriodDay ? 'text-pink-600 font-extrabold' : 'text-zinc-800'
          }">${d}</span>
          ${isPeriodDay ? `<span class="text-xxs text-pink-500 animate-pulse">🌸</span>` : ''}
        </div>

        <div class="w-full mt-1 flex flex-wrap gap-0.5 items-end min-h-[14px]">
          ${dayNote ? `<span class="text-[10px]">📝</span>` : ''}
          ${dayLogs.slice(0, 3).map(l => {
            const icon = l.tracker_key === 't-water' ? '💧' : l.tracker_key === 't-sleep' ? '😴' : l.tracker_key === 't-workout' ? '💪' : l.tracker_key === 't-steps' ? '🚶' : '🧴';
            return `<span class="text-[10px]">${icon}</span>`;
          }).join('')}
        </div>
      </button>
    `;
  }

  // Next month padding
  const totalCells = firstDayIdx + totalDays;
  const nextPadding = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= nextPadding; d++) {
    squares += `
      <div class="aspect-square bg-zinc-50/50 border border-zinc-100 rounded-2xl flex flex-col justify-start p-2 opacity-40 pointer-events-none">
        <span class="text-xs font-bold text-zinc-300">${d}</span>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="flex items-center justify-between mb-6 border-b-2 border-zinc-100 pb-3">
      <button class="p-1.5 border-2 border-zinc-800 rounded-xl hover:bg-zinc-100 shadow-planner-sm pointer-events-none opacity-50">‹</button>
      <h3 class="font-display text-xl md:text-2xl font-extrabold text-zinc-800">${monthNames[month]} ${year}</h3>
      <button class="p-1.5 border-2 border-zinc-800 rounded-xl hover:bg-zinc-100 shadow-planner-sm pointer-events-none opacity-50">›</button>
    </div>
    <div class="grid grid-cols-7 gap-1.5 text-center mb-2">${weekdayHeader}</div>
    <div class="grid grid-cols-7 gap-1.5 md:gap-2.5">${squares}</div>
  `;
}

function handleDemoDateClick(dateStr) {
  selectedDateStr = dateStr;
  openDetailsDrawer(dateStr);
}

// ----------------------------------------------------
// SECURE CODING XSS PREVENTION: HTML ESCAPING UTILITY
// ----------------------------------------------------
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const GOOGLE_BTN_HTML = `
  <button type="button" onclick="handleGoogleAuthClick()" class="w-full flex items-center justify-center gap-3 py-3 bg-white hover:bg-zinc-50 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm">
    <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
    </svg>
    Continue with Google
  </button>
`;

const OR_SEPARATOR_HTML = `
  <div class="flex items-center justify-center gap-4 my-4">
    <span class="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
    <span class="font-display font-extrabold text-xs text-zinc-400 uppercase tracking-widest">OR</span>
    <span class="w-1.5 h-1.5 rounded-full bg-zinc-300"></span>
  </div>
`;

// ----------------------------------------------------
// AUTHENTICATION LOGIN/SIGNUP STATE MODAL
// ----------------------------------------------------
function openAuthModal(viewMode) {
  const modal = document.getElementById('auth-modal');
  const content = document.getElementById('auth-modal-content');
  if (!modal || !content) return;

  modal.classList.remove('hidden');
  renderAuthModalContent(viewMode);
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function renderAuthModalContent(view, extraData = {}) {
  const content = document.getElementById('auth-modal-content');
  if (!content) return;

  if (view === 'intercept') {
    content.innerHTML = `
      <div class="text-center py-4">
        <div class="flex justify-center mb-4">
          <span class="text-5xl animate-bounce">🌸</span>
        </div>
        <h3 class="font-display text-2xl font-bold text-zinc-800 mb-2">
          Start Your Wellness Journey
        </h3>
        <p class="text-zinc-600 mb-6 font-semibold px-2">
          Create a free account to save your wellness journal.
        </p>
        <div class="flex flex-col gap-3">
          ${GOOGLE_BTN_HTML}
          ${OR_SEPARATOR_HTML}
          <div class="grid grid-cols-2 gap-3">
            <button onclick="renderAuthModalContent('signin')" class="w-full py-3 bg-brand-blue hover:bg-blue-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm">
              Sign In
            </button>
            <button onclick="renderAuthModalContent('signup')" class="w-full py-3 bg-brand-pink hover:bg-pink-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer text-sm">
              Create Account
            </button>
          </div>
        </div>
      </div>
    `;
  } else if (view === 'forgot' || view === 'forgot-email') {
    content.innerHTML = `
      <div class="flex items-center gap-2 mb-6">
        <span class="text-2xl animate-spin-slow">🌸</span>
        <h3 class="font-display text-2xl font-bold text-zinc-800">
          Reset Password
        </h3>
      </div>
      <div id="auth-error-box" class="hidden mb-4 p-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold"></div>
      <div id="auth-success-box" class="hidden mb-4 p-3 bg-green-50 border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold"></div>
      
      <form onsubmit="handleForgotEmailSubmit(event)" class="space-y-4">
        <div>
          <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Email Address</label>
          <input type="email" id="forgot-email-input" required placeholder="name@domain.com" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm" />
        </div>
        <button type="submit" id="auth-submit-btn" class="w-full mt-4 py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2">
          Send OTP Code
        </button>
      </form>
      
      <div class="mt-6 pt-4 border-t border-zinc-200 text-center text-sm font-semibold text-zinc-500">
        <button onclick="renderAuthModalContent('signin')" class="text-zinc-600 hover:underline font-bold">Back to Sign In</button>
      </div>
    `;
  } else if (view === 'forgot-otp') {
    content.innerHTML = `
      <div class="flex items-center gap-2 mb-6">
        <span class="text-2xl animate-spin-slow">🌸</span>
        <h3 class="font-display text-2xl font-bold text-zinc-800">
          Verify OTP
        </h3>
      </div>
      <div id="auth-error-box" class="hidden mb-4 p-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold"></div>
      <div id="auth-success-box" class="p-3 bg-green-50 border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold mb-4">
        ${extraData.message || 'OTP code sent! Please check your email.'}
      </div>
      
      <form onsubmit="handleForgotOtpSubmit(event, '${escapeHtml(extraData.email)}')" class="space-y-4">
        <div>
          <label class="block text-zinc-700 font-bold mb-1.5 text-sm">6-Digit OTP Code</label>
          <input type="text" id="forgot-otp-input" required maxlength="6" pattern="[0-9]{6}" placeholder="123456" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm text-center tracking-widest text-lg font-bold" />
        </div>
        <button type="submit" id="auth-submit-btn" class="w-full mt-4 py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2">
          Verify Code
        </button>
      </form>
      
      <div class="mt-6 pt-4 border-t border-zinc-200 text-center text-sm font-semibold text-zinc-500">
        <button onclick="renderAuthModalContent('forgot-email')" class="text-zinc-600 hover:underline font-bold">Resend OTP</button>
      </div>
    `;
  } else if (view === 'forgot-reset') {
    content.innerHTML = `
      <div class="flex items-center gap-2 mb-6">
        <span class="text-2xl animate-spin-slow">🌸</span>
        <h3 class="font-display text-2xl font-bold text-zinc-800">
          New Password
        </h3>
      </div>
      <div id="auth-error-box" class="hidden mb-4 p-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold"></div>
      
      <form onsubmit="handleForgotResetSubmit(event, '${escapeHtml(extraData.userId)}')" class="space-y-4">
        <div>
          <label class="block text-zinc-700 font-bold mb-1.5 text-sm">New Password</label>
          <input type="password" id="forgot-password-input" required placeholder="••••••••" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm" />
        </div>
        <div>
          <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Confirm Password</label>
          <input type="password" id="forgot-confirm-input" required placeholder="••••••••" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm" />
        </div>
        <button type="submit" id="auth-submit-btn" class="w-full mt-4 py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2">
          Reset Password
        </button>
      </form>
    `;
  } else {
    const isSignIn = view === 'signin';
    
    content.innerHTML = `
      <div class="flex items-center gap-2 mb-6">
        <span class="text-2xl animate-spin-slow">🌸</span>
        <h3 class="font-display text-2xl font-bold text-zinc-800">
          ${isSignIn ? 'Welcome Back' : 'Create Your Journal'}
        </h3>
      </div>
      <div id="auth-error-box" class="hidden mb-4 p-3 bg-red-50 border-2 border-red-200 text-red-600 rounded-xl text-sm font-semibold"></div>
      <div id="auth-success-box" class="hidden mb-4 p-3 bg-green-50 border-2 border-emerald-200 text-emerald-700 rounded-xl text-sm font-semibold"></div>
      
      <div class="mb-4">
        ${GOOGLE_BTN_HTML}
        ${OR_SEPARATOR_HTML}
      </div>

      <form onsubmit="handleAuthSubmit(event, '${view}')" class="space-y-4">
        ${!isSignIn ? `
          <div>
            <label class="block text-zinc-700 font-bold mb-1.5 text-sm">First Name</label>
            <input type="text" id="auth-name" required placeholder="Sarah" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm" />
          </div>
        ` : ''}
        
        <div>
          <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Email Address</label>
          <input type="email" id="auth-email" required placeholder="name@domain.com" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm" />
        </div>

        <div>
          <div class="flex justify-between items-center mb-1.5">
            <label class="text-zinc-700 font-bold text-sm">Password</label>
            ${isSignIn ? `
              <button type="button" onclick="renderAuthModalContent('forgot')" class="text-xs text-zinc-400 hover:underline font-bold">Forgot?</button>
            ` : ''}
          </div>
          <input type="password" id="auth-password" required placeholder="••••••••" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm" />
        </div>

        <button type="submit" id="auth-submit-btn" class="w-full mt-4 py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2">
          ${isSignIn ? 'Sign In' : 'Start My Planner'}
        </button>
      </form>

      <div class="mt-6 pt-4 border-t border-zinc-200 text-center text-sm font-semibold text-zinc-500">
        ${isSignIn ? `
          <p>New to Recess? <button onclick="renderAuthModalContent('signup')" class="text-brand-pink hover:underline font-bold">Create a free account</button></p>
        ` : `
          <p>Already have an account? <button onclick="renderAuthModalContent('signin')" class="text-brand-blue hover:underline font-bold">Sign in here</button></p>
        `}
      </div>
    `;
  }
}

async function handleAuthSubmit(e, viewType) {
  e.preventDefault();
  const errorBox = document.getElementById('auth-error-box');
  const successBox = document.getElementById('auth-success-box');
  const btn = document.getElementById('auth-submit-btn');

  errorBox.classList.add('hidden');
  successBox.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = `<span class="w-5 h-5 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></span>`;

  try {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    
    if (viewType === 'signin') {
      await window.db.signIn(email, password);
      closeAuthModal();
      await initApp();
    } else if (viewType === 'signup') {
      const name = document.getElementById('auth-name').value;
      if (password.length < 8) throw new Error('Password must be at least 8 characters long.');
      await window.db.signUp(email, password, name);
      closeAuthModal();
      await initApp();
    }
  } catch (err) {
    errorBox.textContent = err.message || 'Authentication failed.';
    errorBox.classList.remove('hidden');
  } finally {
    btn.disabled = false;
    btn.textContent = viewType === 'signin' ? 'Sign In' : 'Start My Planner';
  }
}

async function handleForgotEmailSubmit(e) {
  e.preventDefault();
  const errorBox = document.getElementById('auth-error-box');
  const btn = document.getElementById('auth-submit-btn');
  const email = document.getElementById('forgot-email-input').value;

  if (errorBox) errorBox.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = `<span class="w-5 h-5 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></span>`;

  try {
    const otp = await window.db.sendPasswordResetOtp(email);
    let msg = 'OTP code sent! Please check your email.';
    if (otp && typeof otp === 'string') {
      msg = `🌸 Sandbox Mode: Use OTP code <b>${otp}</b> to verify!`;
    }
    renderAuthModalContent('forgot-otp', { email, message: msg });
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Failed to send OTP.';
      errorBox.classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send OTP Code';
  }
}

async function handleForgotOtpSubmit(e, email) {
  e.preventDefault();
  const errorBox = document.getElementById('auth-error-box');
  const btn = document.getElementById('auth-submit-btn');
  const otpCode = document.getElementById('forgot-otp-input').value;

  if (errorBox) errorBox.classList.add('hidden');
  btn.disabled = true;
  btn.innerHTML = `<span class="w-5 h-5 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></span>`;

  try {
    const userId = await window.db.verifyPasswordResetOtp(email, otpCode);
    renderAuthModalContent('forgot-reset', { userId });
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Invalid OTP code.';
      errorBox.classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Verify Code';
  }
}

async function handleForgotResetSubmit(e, userId) {
  e.preventDefault();
  const errorBox = document.getElementById('auth-error-box');
  const btn = document.getElementById('auth-submit-btn');
  const newPassword = document.getElementById('forgot-password-input').value;
  const confirmPassword = document.getElementById('forgot-confirm-input').value;

  if (errorBox) errorBox.classList.add('hidden');
  
  if (newPassword.length < 8) {
    if (errorBox) {
      errorBox.textContent = 'Password must be at least 8 characters long.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  if (newPassword !== confirmPassword) {
    if (errorBox) {
      errorBox.textContent = 'Passwords do not match.';
      errorBox.classList.remove('hidden');
    }
    return;
  }

  btn.disabled = true;
  btn.innerHTML = `<span class="w-5 h-5 border-2 border-zinc-800 border-t-transparent rounded-full animate-spin"></span>`;

  try {
    await window.db.updatePassword(userId, newPassword);
    
    try {
      await window.db.signOut();
    } catch (e) {}

    const content = document.getElementById('auth-modal-content');
    content.innerHTML = `
      <div class="text-center py-6">
        <span class="text-5xl">🎉</span>
        <h3 class="font-display text-2xl font-bold text-zinc-800 mt-4 mb-2">Password Reset Successful!</h3>
        <p class="text-zinc-500 font-semibold text-sm mb-6">You can now sign in with your new password.</p>
        <button onclick="renderAuthModalContent('signin')" class="w-full py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold rounded-xl border-2 border-zinc-800 shadow-planner">Sign In</button>
      </div>
    `;
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Failed to reset password.';
      errorBox.classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'Reset Password';
  }
}

const isForgot = (type) => type === 'forgot';

async function handleGoogleAuthClick() {
  const errorBox = document.getElementById('auth-error-box');
  if (errorBox) errorBox.classList.add('hidden');
  try {
    const user = await window.db.signInWithGoogle();
    if (user) {
      currentUser = user;
      closeAuthModal();
      await initApp();
    }
  } catch (err) {
    if (errorBox) {
      errorBox.textContent = err.message || 'Google authentication failed.';
      errorBox.classList.remove('hidden');
    } else {
      alert(err.message || 'Google authentication failed.');
    }
  }
}

// ----------------------------------------------------
// DATE DETAILS SLIDING DRAWER CONTROL
// ----------------------------------------------------
async function openDetailsDrawer(dateStr) {
  const drawer = document.getElementById('details-drawer');
  const header = document.getElementById('drawer-date-header');
  const body = document.getElementById('drawer-body-content');
  const footer = document.getElementById('drawer-footer-actions');
  if (!drawer || !header || !body || !footer) return;

  selectedDateStr = dateStr;
  drawer.classList.remove('hidden');
  header.textContent = new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
  });

  body.innerHTML = `<div class="h-full flex items-center justify-center"><div class="w-10 h-10 border-4 border-zinc-800 border-t-brand-pink rounded-full animate-spin"></div></div>`;
  footer.innerHTML = '';

  try {
    let noteContent = '';
    let logsMap = {};
    let isPeriod = false;
    let flowLevel = '';
    let cycleMood = '';
    let cycleEnergy = 'medium';
    let symptomsList = [];
    let cycleActive = false;

    if (!currentUser) {
      // Seed Demo logs for guest drawer
      const demo = window.db.getDemoData();
      const matchNote = demo.notes.find(n => n.date === dateStr);
      noteContent = matchNote ? matchNote.content : '';

      demo.logs.filter(l => l.date === dateStr).forEach(l => {
        logsMap[l.tracker_key] = l.value;
      });

      const matchCycle = demo.cycleLogs.find(c => c.date === dateStr);
      if (matchCycle) {
        isPeriod = matchCycle.is_period;
        flowLevel = matchCycle.flow_level;
        cycleMood = matchCycle.mood;
        cycleEnergy = matchCycle.energy_level;
        symptomsList = matchCycle.symptoms;
      }
      cycleActive = true;
    } else {
      const id = currentUser.id;
      const profile = await window.db.getProfile(id);
      cycleActive = profile.menstrual_cycle_enabled;

      const userNotes = await window.db.getNotes(id);
      const matchNote = userNotes.find(n => n.date === dateStr);
      noteContent = matchNote ? matchNote.content : '';

      const userLogs = await window.db.getLogs(id);
      userLogs.filter(l => l.date === dateStr).forEach(l => {
        logsMap[l.tracker_key] = l.value;
      });

      if (cycleActive) {
        const userCycles = await window.db.getCycleLogs(id);
        const matchCycle = userCycles.find(c => c.date === dateStr);
        if (matchCycle) {
          isPeriod = matchCycle.is_period;
          flowLevel = matchCycle.flow_level || '';
          cycleMood = matchCycle.mood || '';
          cycleEnergy = matchCycle.energy_level || 'medium';
          symptomsList = matchCycle.symptoms || [];
        }
      }
    }

    // Build Form Inputs
    let trackersInputs = activeTrackers.map(t => {
      const val = logsMap[t.id] || '';
      if (t.type === 'checkbox') {
        const checked = val === 'true';
        return `
          <div class="bg-white border-2 border-zinc-800 rounded-2xl p-4 shadow-planner-sm">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">${t.icon}</span>
              <span class="font-display font-extrabold text-sm text-zinc-800 leading-none">${escapeHtml(t.name)}</span>
            </div>
            <button type="button" onclick="toggleDrawerCheckbox('${t.id}')" id="drawer-chk-${t.id}" class="w-full py-1.5 px-3 rounded-xl border-2 font-bold flex items-center justify-between text-xs cursor-pointer ${
              checked ? 'bg-brand-green/20 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }">
              <span id="drawer-chk-lbl-${t.id}">${checked ? 'Completed' : 'Tap to Complete'}</span>
              <div id="drawer-chk-box-${t.id}" class="w-4 h-4 border-2 border-zinc-800 rounded-md flex items-center justify-center text-[10px] ${
                checked ? 'bg-zinc-800 text-white' : 'bg-white'
              }">${checked ? '✓' : ''}</div>
            </button>
            <input type="hidden" id="input-${t.id}" value="${val}" />
          </div>
        `;
      } else if (t.type === 'numeric') {
        return `
          <div class="bg-white border-2 border-zinc-800 rounded-2xl p-4 shadow-planner-sm">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">${t.icon}</span>
              <span class="font-display font-extrabold text-sm text-zinc-800 leading-none">${escapeHtml(t.name)}</span>
            </div>
            <input type="number" step="any" id="input-${t.id}" value="${val}" placeholder="Log number..." class="w-full px-3 py-1 border-2 border-zinc-800 rounded-xl bg-zinc-50 focus:outline-none text-xs text-center font-bold text-zinc-800" />
          </div>
        `;
      } else {
        return `
          <div class="bg-white border-2 border-zinc-800 rounded-2xl p-4 shadow-planner-sm">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xl">${t.icon}</span>
              <span class="font-display font-extrabold text-sm text-zinc-800 leading-none">${escapeHtml(t.name)}</span>
            </div>
            <input type="text" id="input-${t.id}" value="${val}" placeholder="Write log..." class="w-full px-3 py-1.5 border-2 border-zinc-800 rounded-xl bg-zinc-50 focus:outline-none text-xs font-semibold text-zinc-800" />
          </div>
        `;
      }
    }).join('');

    let moodOptions = MOODS.map(m => {
      const selected = logsMap['t-mood'] === m.emoji;
      return `
        <button type="button" onclick="selectDrawerMood('${m.emoji}')" id="drawer-mood-${m.emoji}" class="px-3 py-2 border-2 rounded-2xl font-bold flex items-center gap-1.5 transition-all text-sm cursor-pointer ${
          selected ? 'bg-brand-lavender/40 border-zinc-800' : 'bg-white border-zinc-200 hover:border-zinc-800'
        }">
          <span class="text-lg">${m.emoji}</span>
          <span class="text-zinc-700">${m.label}</span>
        </button>
      `;
    }).join('');

    body.innerHTML = `
      <!-- Reflections -->
      <div class="space-y-2">
        <div class="flex items-center gap-1.5 text-zinc-800 font-bold"><span class="text-brand-pink">📝</span> Reflections & Notes</div>
        <textarea id="drawer-note" placeholder="Write journal reflections, highlights, or diary notes..." class="w-full h-32 p-4 border-2 border-zinc-800 rounded-2xl bg-white text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm leading-relaxed resize-none">${noteContent}</textarea>
      </div>

      <!-- Mood -->
      <div class="space-y-3">
        <div class="flex items-center gap-1.5 text-zinc-800 font-bold"><span>😊</span> Today's Mood</div>
        <div class="flex flex-wrap gap-2">${moodOptions}</div>
        <input type="hidden" id="drawer-mood-val" value="${logsMap['t-mood'] || ''}" />
      </div>

      <!-- Trackers -->
      <div class="space-y-4 border-t-2 border-zinc-100 pt-6">
        <div class="flex items-center gap-1.5 text-zinc-800 font-bold mb-2"><span>✨</span> Daily Trackers</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">${trackersInputs}</div>
      </div>

      <!-- Menstrual tracker -->
      ${cycleActive ? `
        <div class="space-y-4 border-t-2 border-zinc-100 pt-6">
          <div class="flex items-center gap-1.5 text-zinc-800 font-bold"><span>🌸</span> Menstrual Cycle Logger</div>
          <div class="bg-white border-2 border-zinc-800 rounded-3xl p-5 space-y-4">
            
            <button type="button" onclick="toggleDrawerPeriod()" id="drawer-period-btn" class="w-full py-3 px-4 rounded-xl border-2 font-display font-bold flex items-center justify-between text-sm cursor-pointer ${
              isPeriod ? 'bg-brand-pink/35 border-zinc-800' : 'bg-zinc-50 border-zinc-200'
            }">
              <span class="flex items-center gap-2">🔥 Period Day</span>
              <div id="drawer-period-box" class="w-5 h-5 border-2 border-zinc-800 rounded-md flex items-center justify-center text-xs ${
                isPeriod ? 'bg-zinc-800 text-white' : 'bg-white'
              }">${isPeriod ? '✓' : ''}</div>
            </button>
            <input type="hidden" id="drawer-period-val" value="${isPeriod}" />

            <div id="drawer-period-inputs" class="${isPeriod ? 'block' : 'hidden'} space-y-4 animate-fade-in bg-zinc-50/50 p-4 border-2 border-zinc-800 rounded-2xl">
              <div>
                <label class="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Flow Level</label>
                <div class="flex gap-2">
                  ${['light', 'medium', 'heavy'].map(f => `
                    <button type="button" onclick="selectDrawerFlow('${f}')" id="drawer-flow-${f}" class="flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                      flowLevel === f ? 'bg-brand-pink border-zinc-800' : 'bg-white border-zinc-200'
                    }">${f}</button>
                  `).join('')}
                </div>
                <input type="hidden" id="drawer-flow-val" value="${flowLevel}" />
              </div>

              <div>
                <label class="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Cycle Energy</label>
                <div class="flex gap-2">
                  ${['low', 'medium', 'high'].map(e => `
                    <button type="button" onclick="selectDrawerEnergy('${e}')" id="drawer-energy-${e}" class="flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                      cycleEnergy === e ? 'bg-brand-pink border-zinc-800' : 'bg-white border-zinc-200'
                    }">${e}</button>
                  `).join('')}
                </div>
                <input type="hidden" id="drawer-energy-val" value="${cycleEnergy}" />
              </div>

              <div>
                <label class="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Physiological Symptoms</label>
                <div class="flex flex-wrap gap-1.5">
                  ${SYMPTOMS.map(s => {
                    const active = symptomsList.includes(s);
                    return `
                      <button type="button" onclick="toggleDrawerSymptom('${s}')" id="drawer-symptom-${s}" class="px-2.5 py-1 border-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        active ? 'bg-brand-pink/20 border-zinc-800 font-bold' : 'bg-white border-zinc-200'
                      }">${s}</button>
                    `;
                  }).join('')}
                </div>
                <input type="hidden" id="drawer-symptoms-val" value="${symptomsList.join(',')}" />
              </div>
            </div>

          </div>
        </div>
      ` : ''}
    `;

    footer.innerHTML = `
      <button onclick="closeDetailsDrawer()" class="flex-1 py-3 border-2 border-zinc-800 rounded-xl hover:bg-zinc-50 font-display font-bold text-zinc-700 cursor-pointer">Cancel</button>
      <button onclick="saveDetailsDrawer()" class="flex-1 py-3 bg-brand-green hover:bg-emerald-100 border-2 border-zinc-800 rounded-xl shadow-planner font-display font-bold text-zinc-800 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">Save Planner</button>
    `;

  } catch (e) {
    console.error(e);
    body.innerHTML = `<p class="text-red-500 font-bold text-center">Failed to load day logs.</p>`;
  }
}

function closeDetailsDrawer() {
  document.getElementById('details-drawer').classList.add('hidden');
}

// Drawer Sub-Controllers
function toggleDrawerCheckbox(id) {
  const hiddenInput = document.getElementById(`input-${id}`);
  const btn = document.getElementById(`drawer-chk-${id}`);
  const lbl = document.getElementById(`drawer-chk-lbl-${id}`);
  const box = document.getElementById(`drawer-chk-box-${id}`);

  const active = hiddenInput.value === 'true';
  if (active) {
    hiddenInput.value = 'false';
    btn.className = "w-full py-1.5 px-3 rounded-xl border-2 font-bold flex items-center justify-between text-xs cursor-pointer bg-zinc-50 border-zinc-200";
    lbl.textContent = 'Tap to Complete';
    box.className = "w-4 h-4 border-2 border-zinc-800 rounded-md flex items-center justify-center text-[10px] bg-white";
    box.textContent = '';
  } else {
    hiddenInput.value = 'true';
    btn.className = "w-full py-1.5 px-3 rounded-xl border-2 font-bold flex items-center justify-between text-xs cursor-pointer bg-brand-green/20 border-zinc-800";
    lbl.textContent = 'Completed';
    box.className = "w-4 h-4 border-2 border-zinc-800 rounded-md flex items-center justify-center text-[10px] bg-zinc-800 text-white";
    box.textContent = '✓';
  }
}

function selectDrawerMood(mood) {
  const hidden = document.getElementById('drawer-mood-val');
  
  // Clear previous active styles
  if (hidden.value) {
    const prevBtn = document.getElementById(`drawer-mood-${hidden.value}`);
    if (prevBtn) prevBtn.className = "px-3 py-2 border-2 rounded-2xl font-bold flex items-center gap-1.5 transition-all text-sm cursor-pointer bg-white border-zinc-200 hover:border-zinc-800";
  }

  // Set new active style
  hidden.value = mood;
  const currentBtn = document.getElementById(`drawer-mood-${mood}`);
  if (currentBtn) currentBtn.className = "px-3 py-2 border-2 rounded-2xl font-bold flex items-center gap-1.5 transition-all text-sm cursor-pointer bg-brand-lavender/40 border-zinc-800";
}

function toggleDrawerPeriod() {
  const hidden = document.getElementById('drawer-period-val');
  const btn = document.getElementById('drawer-period-btn');
  const box = document.getElementById('drawer-period-box');
  const inputs = document.getElementById('drawer-period-inputs');

  const active = hidden.value === 'true';
  if (active) {
    hidden.value = 'false';
    btn.className = "w-full py-3 px-4 rounded-xl border-2 font-display font-bold flex items-center justify-between text-sm cursor-pointer bg-zinc-50 border-zinc-200";
    box.className = "w-5 h-5 border-2 border-zinc-800 rounded-md flex items-center justify-center text-xs bg-white";
    box.textContent = '';
    inputs.classList.add('hidden');
  } else {
    hidden.value = 'true';
    btn.className = "w-full py-3 px-4 rounded-xl border-2 font-display font-bold flex items-center justify-between text-sm cursor-pointer bg-brand-pink/35 border-zinc-800 shadow-planner-sm";
    box.className = "w-5 h-5 border-2 border-zinc-800 rounded-md flex items-center justify-center text-xs bg-zinc-800 text-white";
    box.textContent = '✓';
    inputs.classList.remove('hidden');
  }
}

function selectDrawerFlow(flow) {
  const hidden = document.getElementById('drawer-flow-val');
  if (hidden.value) {
    const prev = document.getElementById(`drawer-flow-${hidden.value}`);
    if (prev) prev.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-white border-zinc-200 hover:border-zinc-800";
  }
  hidden.value = flow;
  const current = document.getElementById(`drawer-flow-${flow}`);
  if (current) current.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-brand-pink border-zinc-800";
}

function selectDrawerEnergy(energy) {
  const hidden = document.getElementById('drawer-energy-val');
  if (hidden.value) {
    const prev = document.getElementById(`drawer-energy-${hidden.value}`);
    if (prev) prev.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-white border-zinc-200 hover:border-zinc-800";
  }
  hidden.value = energy;
  const current = document.getElementById(`drawer-energy-${energy}`);
  if (current) current.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-brand-pink border-zinc-800";
}

function toggleDrawerSymptom(symptom) {
  const hidden = document.getElementById('drawer-symptoms-val');
  let currentList = hidden.value ? hidden.value.split(',') : [];
  
  const btn = document.getElementById(`drawer-symptom-${symptom}`);
  if (currentList.includes(symptom)) {
    currentList = currentList.filter(s => s !== symptom);
    if (btn) btn.className = "px-2.5 py-1 border-2 rounded-xl text-xs font-semibold cursor-pointer transition-all bg-white border-zinc-200 hover:border-zinc-300";
  } else {
    currentList.push(symptom);
    if (btn) btn.className = "px-2.5 py-1 border-2 rounded-xl text-xs font-semibold cursor-pointer transition-all bg-brand-pink/20 border-zinc-800 font-bold shadow-planner-sm";
  }
  hidden.value = currentList.join(',');
}

async function saveDetailsDrawer() {
  if (!currentUser) {
    closeDetailsDrawer();
    openAuthModal('intercept');
    return;
  }

  const userId = currentUser.id;
  const note = document.getElementById('drawer-note').value;
  const mood = document.getElementById('drawer-mood-val').value;

  try {
    // 1. Save note
    if (note.trim()) {
      await window.db.saveNote(userId, selectedDateStr, note);
    } else {
      await window.db.deleteNote(userId, selectedDateStr);
    }

    // 2. Save active trackers
    for (const t of activeTrackers) {
      const input = document.getElementById(`input-${t.id}`);
      if (input) {
        await window.db.saveLog(userId, selectedDateStr, t.id, input.value);
      }
    }

    // 3. Save mood
    if (mood) {
      await window.db.saveLog(userId, selectedDateStr, 't-mood', mood);
    }

    // 4. Save period log
    const periodVal = document.getElementById('drawer-period-val');
    if (periodVal) {
      const isPeriod = periodVal.value === 'true';
      const flowLevel = document.getElementById('drawer-flow-val').value;
      const energyLevel = document.getElementById('drawer-energy-val').value;
      const symptoms = document.getElementById('drawer-symptoms-val').value;
      
      await window.db.saveCycleLog(userId, selectedDateStr, {
        is_period: isPeriod,
        flow_level: isPeriod ? flowLevel : null,
        energy_level: isPeriod ? energyLevel : 'medium',
        symptoms: isPeriod ? (symptoms ? symptoms.split(',') : []) : []
      });
    }

    closeDetailsDrawer();
    await syncUserStorageData();
    navigateTo(activeView); // Reactive reload view

  } catch (e) {
    console.error('Error saving details drawer data', e);
  }
}

// ----------------------------------------------------
// PORTAL VIEW: COVER DASHBOARD
// ----------------------------------------------------
async function initDashboard() {
  const container = document.getElementById('view-dashboard');
  if (!container) return;

  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = activeLogs.filter(l => l.date === todayStr);

  const waterLog = todayLogs.find(l => l.tracker_key === 't-water');
  const waterCups = waterLog ? parseInt(waterLog.value) || 0 : 0;

  const sleepLog = todayLogs.find(l => l.tracker_key === 't-sleep');
  const sleepHours = sleepLog ? parseFloat(sleepLog.value) || 0 : 0;

  const dayNote = activeNotes.find(n => n.date === todayStr);
  const reflectionText = dayNote ? dayNote.content : '';

  // Completed habits calculation
  const habitTrackers = activeTrackers.filter(t => t.type === 'checkbox');
  const completedHabitsCount = habitTrackers.filter(t => {
    const l = todayLogs.find(log => log.tracker_key === t.id);
    return l && l.value === 'true';
  }).length;

  // Render Layout
  container.innerHTML = `
    <!-- HEADER -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2 mb-1">
          <span class="text-3xl animate-pulse">🌸</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">
            ${getGreetingText(currentUser?.name)}
          </h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1">
          🗓️ ${getElegantDateText()}
        </p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-pink border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Today's Page
        </div>
      </div>
    </header>

    <!-- QUICK STATUS METRICS -->
    <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      
      <!-- WATER CUP CLICKER -->
      <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 shadow-planner hover:-translate-y-0.5 transition-all">
        <div class="flex justify-between items-start mb-3">
          <span class="text-sm font-bold text-zinc-500 uppercase tracking-wide">Water Status</span>
          <span class="text-2xl">💧</span>
        </div>
        <h3 class="font-display text-3xl font-extrabold text-zinc-800 mb-4">
          ${waterCups} <span class="text-lg text-zinc-400 font-bold">Cups</span>
        </h3>
        
        <!-- Cups Buttons -->
        <div class="flex gap-1.5 justify-between mb-4">
          ${Array.from({ length: 8 }).map((_, i) => `
            <button onclick="handleDashboardWaterClick(${i < waterCups ? -1 : 1})" class="w-6 h-9 border-2 border-zinc-800 rounded-b-md rounded-t-xs transition-all flex items-center justify-center cursor-pointer ${
              i < waterCups ? 'bg-blue-300 hover:bg-blue-400 text-white' : 'bg-zinc-50 hover:bg-blue-50 text-zinc-300'
            }">
              <span class="text-[10px] font-extrabold">${i + 1}</span>
            </button>
          `).join('')}
        </div>
        
        <div class="flex gap-2">
          <button onclick="handleDashboardWaterClick(-1)" class="flex-1 py-1.5 text-xs font-bold border-2 border-zinc-800 rounded-xl hover:bg-zinc-50 transition-colors cursor-pointer">- Cup</button>
          <button onclick="handleDashboardWaterClick(1)" class="flex-1 py-1.5 text-xs font-bold bg-brand-blue border-2 border-zinc-800 rounded-xl hover:bg-blue-100 transition-all cursor-pointer shadow-planner-sm">+ Cup</button>
        </div>
      </div>

      <!-- SLEEP WIDGET -->
      <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 shadow-planner hover:-translate-y-0.5 transition-all">
        <div class="flex justify-between items-start mb-3">
          <span class="text-sm font-bold text-zinc-500 uppercase tracking-wide">Sleep Hours</span>
          <span class="text-2xl">😴</span>
        </div>
        <h3 class="font-display text-3xl font-extrabold text-zinc-800 mb-2">
          ${sleepHours} <span class="text-lg text-zinc-400 font-bold">Hours</span>
        </h3>
        <p class="text-xs text-zinc-500 font-semibold mb-4 leading-relaxed">Avg sleep duration helps restore body recovery.</p>
        <input type="number" step="0.5" id="db-sleep-val" value="${sleepHours || ''}" placeholder="Log sleep..." onchange="handleDashboardSleepChange(this.value)" class="w-full px-3 py-1.5 border-2 border-zinc-800 rounded-xl font-bold bg-zinc-50 focus:outline-none text-sm text-center" />
      </div>

      <!-- HABITS COMPLETED STREAK -->
      <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 shadow-planner hover:-translate-y-0.5 transition-all">
        <div class="flex justify-between items-start mb-3">
          <span class="text-sm font-bold text-zinc-500 uppercase tracking-wide">Habit Meter</span>
          <span class="text-2xl">💪</span>
        </div>
        <h3 class="font-display text-3xl font-extrabold text-zinc-800 mb-2">
          ${completedHabitsCount} <span class="text-lg text-zinc-400 font-bold">/ ${habitTrackers.length}</span>
        </h3>
        <div class="w-full bg-zinc-100 border-2 border-zinc-800 h-4 rounded-full overflow-hidden mb-3">
          <div class="bg-brand-green h-full border-r-2 border-zinc-800 transition-all duration-500" style="width: ${habitTrackers.length ? (completedHabitsCount / habitTrackers.length) * 100 : 0}%"></div>
        </div>
        <p class="text-xs text-zinc-500 font-semibold leading-normal">
          ${completedHabitsCount === habitTrackers.length ? '⭐ Excellent! All habits checked today!' : 'Keep going! Every milestone is progress.'}
        </p>
      </div>

      <!-- SIDEBAR LINKS -->
      <div class="bg-brand-cream border-2 border-zinc-800 rounded-3xl p-6 shadow-planner flex flex-col justify-between">
        <div class="flex justify-between items-start">
          <span class="text-sm font-bold text-zinc-500 uppercase tracking-wide">Planner Tabs</span>
          <span class="text-xl">✨</span>
        </div>
        <div class="space-y-2 mt-4">
          <button onclick="navigateTo('view-calendar')" class="w-full py-2 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold border-2 border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 shadow-planner-sm transition-all cursor-pointer">🗓️ Open Calendar</button>
          <button onclick="navigateTo('view-journal')" class="w-full py-2 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold border-2 border-zinc-800 rounded-xl flex items-center justify-center gap-1.5 shadow-planner-sm transition-all cursor-pointer">📝 My Journal</button>
        </div>
      </div>

    </section>

    <!-- COLUMN ROW: REFLECTION DIARY & GOALS -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- LEFT BLOCK: REFLECTION & HABITS CHECKMARKS -->
      <div class="lg:col-span-2 space-y-8">
        
        <!-- Reflections Diary -->
        <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
          <div class="flex items-center gap-2 mb-4 border-b-2 border-zinc-100 pb-3">
            <span class="text-xl">📝</span>
            <h3 class="font-display text-xl font-extrabold text-zinc-800">Daily Reflections & Notes</h3>
          </div>
          <textarea id="db-note-reflection" placeholder="How was your day? Log highlights, meals, or reflections..." class="w-full h-44 p-4 border-2 border-zinc-800 rounded-2xl bg-zinc-50 text-zinc-800 focus:outline-none focus:bg-brand-cream font-semibold text-sm leading-relaxed mb-4 resize-none">${reflectionText}</textarea>
          <div class="flex justify-between items-center">
            <span class="text-[10px] text-zinc-400 font-bold">* Saves instantly to today's date</span>
            <button onclick="handleSaveDashboardNote()" class="px-6 py-2 bg-brand-pink hover:bg-pink-100 text-zinc-800 font-display font-semibold rounded-xl border-2 border-zinc-800 shadow-planner-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">Save Sheet</button>
          </div>
        </div>

        <!-- Habits checklists -->
        <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
          <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
            <span class="text-xl">✓</span>
            <h3 class="font-display text-xl font-extrabold text-zinc-800">Daily Habits Checklist</h3>
          </div>
          
          ${habitTrackers.length === 0 ? `
            <div class="text-center py-6 text-zinc-400 font-bold text-sm">
              <p class="mb-4">No active checkmark trackers found.</p>
              <button onclick="navigateTo('view-trackers')" class="px-4 py-2 border-2 border-zinc-800 rounded-xl hover:bg-zinc-50 text-xs font-bold inline-flex items-center gap-1">➕ Customize Trackers</button>
            </div>
          ` : `
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              ${habitTrackers.map(t => {
                const log = todayLogs.find(l => l.tracker_key === t.id);
                const active = log && log.value === 'true';
                return `
                  <button onclick="handleDashboardHabitToggle('${t.id}', ${active})" class="p-4 rounded-2xl border-2 text-left flex items-center justify-between gap-3 transition-all cursor-pointer ${
                    active ? 'bg-brand-green/20 border-zinc-800 shadow-none' : 'bg-zinc-50 border-zinc-200 hover:border-zinc-800 hover:shadow-planner-sm'
                  }">
                    <div class="flex items-center gap-3">
                      <span class="text-2xl">${t.icon}</span>
                      <span class="font-bold text-zinc-800 text-sm md:text-base">${t.name}</span>
                    </div>
                    <div class="w-6 h-6 border-2 border-zinc-800 rounded-md flex items-center justify-center ${
                      active ? 'bg-zinc-800 text-white' : 'bg-white'
                    }">${active ? '✓' : ''}</div>
                  </button>
                `;
              }).join('')}
            </div>
          `}
        </div>

      </div>

      <!-- RIGHT BLOCK: GOALS LIST -->
      <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner flex flex-col h-fit">
        <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
          <span class="text-xl font-bold text-zinc-800">🏆</span>
          <h3 class="font-display text-xl font-extrabold text-zinc-800">My Goals Tracker</h3>
        </div>

        <form onsubmit="handleDashboardGoalSubmit(event)" class="space-y-2.5 mb-6">
          <input type="text" id="db-goal-title" required placeholder="Add a new goal..." class="w-full px-3.5 py-2 border-2 border-zinc-800 rounded-xl bg-zinc-50 focus:outline-none focus:bg-white text-sm font-semibold text-zinc-800" />
          <div class="flex gap-2">
            <select id="db-goal-type" class="px-3 py-1.5 border-2 border-zinc-800 rounded-xl text-xs font-bold bg-white text-zinc-800 focus:outline-none flex-1">
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
            <button type="submit" class="px-4 py-1.5 bg-brand-pink text-zinc-800 border-2 border-zinc-800 rounded-xl hover:bg-pink-100 text-xs font-extrabold shadow-planner-sm cursor-pointer">Add Goal</button>
          </div>
        </form>

        <div class="space-y-3 max-h-96 overflow-y-auto pr-1">
          ${activeGoals.length === 0 ? `
            <p class="text-zinc-400 font-bold text-center py-6 text-sm">No active goals created yet.</p>
          ` : activeGoals.map(g => `
            <div class="p-3 rounded-xl border-2 flex items-center justify-between gap-3 ${
              g.completed ? 'bg-zinc-50 border-zinc-200' : 'bg-brand-cream/20 border-zinc-800'
            }">
              <button onclick="handleDashboardGoalToggle('${g.id}', ${g.completed})" class="flex items-center gap-2.5 text-left flex-1 cursor-pointer">
                <div class="w-5 h-5 border-2 border-zinc-800 rounded-md shrink-0 flex items-center justify-center ${
                  g.completed ? 'bg-zinc-800 text-white' : 'bg-white'
                }">${g.completed ? '✓' : ''}</div>
                <span class="text-xs md:text-sm font-bold ${g.completed ? 'line-through text-zinc-400' : 'text-zinc-800'}">${g.title}</span>
              </button>
              <div class="flex items-center gap-1.5">
                <span class="px-2 py-0.5 border border-zinc-800 rounded-md text-[9px] font-extrabold uppercase ${
                  g.type === 'daily' ? 'bg-brand-pink' : g.type === 'weekly' ? 'bg-brand-blue' : g.type === 'monthly' ? 'bg-brand-lavender' : 'bg-brand-green'
                }">${g.type}</span>
                <button onclick="handleDashboardGoalDelete('${g.id}')" class="text-zinc-300 hover:text-red-500 font-bold text-xs p-1" title="Delete goal">✕</button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>

    <!-- RECENT REFLECTIONS SHEETS -->
    <section class="bg-white border-2 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
      <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
        <span class="text-xl">📖</span>
        <h3 class="font-display text-xl font-extrabold text-zinc-800">Recent Planner Reflections</h3>
      </div>
      
      ${activeNotes.length === 0 ? `
        <p class="text-zinc-400 font-bold text-center py-6 text-sm">Your digital notebook is empty! Start reflections above.</p>
      ` : `
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          ${activeNotes.slice(0, 4).map(n => `
            <div class="bg-brand-cream/10 border-2 border-zinc-800 rounded-2xl p-5 hover:shadow-planner-sm transition-all cursor-pointer" onclick="setSelectedDateAndOpenJournal('${n.date}')">
              <p class="text-xs text-brand-lavender font-extrabold mb-2 uppercase tracking-wider">🌸 ${new Date(n.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
              <p class="text-sm font-semibold text-zinc-700 leading-relaxed line-clamp-3">${n.content}</p>
            </div>
          `).join('')}
        </div>
      `}
    </section>
  `;
}

// Dashboard Widgets Actions
async function handleDashboardWaterClick(change) {
  const todayStr = new Date().toISOString().split('T')[0];
  const todayLogs = activeLogs.filter(l => l.date === todayStr);
  const waterLog = todayLogs.find(l => l.tracker_key === 't-water');
  const currentVal = waterLog ? parseInt(waterLog.value) || 0 : 0;

  const nextVal = Math.max(0, currentVal + change);
  await window.db.saveLog(currentUser.id, todayStr, 't-water', nextVal);
  await syncUserStorageData();
  initDashboard();
}

async function handleDashboardSleepChange(val) {
  const todayStr = new Date().toISOString().split('T')[0];
  const hours = parseFloat(val) || 0;
  await window.db.saveLog(currentUser.id, todayStr, 't-sleep', hours);
  await syncUserStorageData();
  initDashboard();
}

async function handleSaveDashboardNote() {
  const todayStr = new Date().toISOString().split('T')[0];
  const content = document.getElementById('db-note-reflection').value;
  
  if (content.trim()) {
    await window.db.saveNote(currentUser.id, todayStr, content);
  } else {
    await window.db.deleteNote(currentUser.id, todayStr);
  }
  alert('Reflection saved to today\'s wellness cover!');
  await syncUserStorageData();
  initDashboard();
}

async function handleDashboardHabitToggle(trackerKey, active) {
  const todayStr = new Date().toISOString().split('T')[0];
  const nextVal = active ? 'false' : 'true';
  await window.db.saveLog(currentUser.id, todayStr, trackerKey, nextVal);
  await syncUserStorageData();
  initDashboard();
}

async function handleDashboardGoalSubmit(e) {
  e.preventDefault();
  const title = document.getElementById('db-goal-title').value;
  const type = document.getElementById('db-goal-type').value;

  if (title.trim()) {
    await window.db.createGoal(currentUser.id, { title, type });
    await syncUserStorageData();
    initDashboard();
  }
}

async function handleDashboardGoalToggle(goalId, completed) {
  await window.db.updateGoal(currentUser.id, goalId, { completed: !completed });
  await syncUserStorageData();
  initDashboard();
}

async function handleDashboardGoalDelete(goalId) {
  if (confirm('Delete this goal milestone?')) {
    await window.db.deleteGoal(currentUser.id, goalId);
    await syncUserStorageData();
    initDashboard();
  }
}

function setSelectedDateAndOpenJournal(dateStr) {
  selectedDateStr = dateStr;
  navigateTo('view-journal');
}

// ----------------------------------------------------
// PORTAL VIEW: PLANNER CALENDAR PAGE
// ----------------------------------------------------
let activeCalendarDate = new Date();

function initCalendarPage() {
  const container = document.getElementById('view-calendar');
  if (!container) return;

  const year = activeCalendarDate.getFullYear();
  const month = activeCalendarDate.getMonth();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Grid dates calculations
  const firstDayIdx = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const prevMonthTotal = new Date(year, month, 0).getDate();

  const weekdayHeader = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => `
    <span class="text-xs font-bold text-zinc-400 uppercase tracking-widest py-2">${w}</span>
  `).join('');

  let squares = '';

  // Prev month padding
  for (let i = 0; i < firstDayIdx; i++) {
    const d = prevMonthTotal - firstDayIdx + i + 1;
    squares += `
      <div class="aspect-square bg-zinc-50/50 border border-zinc-100 rounded-2xl flex flex-col justify-start p-2 opacity-40 pointer-events-none">
        <span class="text-xs font-bold text-zinc-300">${d}</span>
      </div>
    `;
  }

  // Current month days
  const todayStr = new Date().toISOString().split('T')[0];

  for (let d = 1; d <= totalDays; d++) {
    const fMonth = String(month + 1).padStart(2, '0');
    const fDay = String(d).padStart(2, '0');
    const cellDate = `${year}-${fMonth}-${fDay}`;

    const isToday = cellDate === todayStr;
    const isPeriodDay = activeCycleLogs.some(c => c.date === cellDate && c.is_period);
    const dayNote = activeNotes.find(n => n.date === cellDate);
    const dayLogs = activeLogs.filter(l => l.date === cellDate);

    // Active tracker logs filter
    const activeTrackersLogged = activeTrackers.filter(t => {
      const log = dayLogs.find(l => l.tracker_key === t.id);
      if (!log) return false;
      if (t.type === 'checkbox') return log.value === 'true';
      return log.value && log.value !== '0';
    });

    squares += `
      <button onclick="handleCalendarCellClick('${cellDate}')" class="aspect-square border-2 rounded-2xl p-1.5 md:p-2.5 flex flex-col justify-between items-start text-left cursor-pointer group transition-all duration-200 ${
        isToday 
          ? 'bg-brand-cream border-zinc-800 shadow-planner-sm' 
          : isPeriodDay 
          ? 'bg-brand-pink/30 border-pink-300 hover:border-zinc-800 hover:shadow-planner-sm' 
          : 'bg-white border-zinc-200 hover:border-zinc-800 hover:shadow-planner-sm'
      }">
        <div class="flex justify-between items-center w-full">
          <span class="text-xs md:text-sm font-extrabold flex items-center justify-center w-6 h-6 rounded-full ${
            isToday ? 'bg-zinc-800 text-white shadow-planner-sm' : isPeriodDay ? 'text-pink-600 font-extrabold' : 'text-zinc-800'
          }">${d}</span>
          ${isPeriodDay ? `<span class="text-xxs text-pink-500 animate-pulse">🌸</span>` : ''}
        </div>

        <div class="w-full mt-1.5 flex flex-wrap gap-0.5 items-end min-h-[14px]">
          ${dayNote ? `<span class="text-[10px]" title="Diary notes logged">📝</span>` : ''}
          ${activeTrackersLogged.slice(0, 3).map(t => `<span class="text-[10px]" title="${t.name}">${t.icon}</span>`).join('')}
          ${activeTrackersLogged.length > 3 ? `<span class="text-[8px] font-extrabold text-zinc-400 pl-0.5">+${activeTrackersLogged.length - 3}</span>` : ''}
        </div>
      </button>
    `;
  }

  // Next padding
  const totalCells = firstDayIdx + totalDays;
  const nextPadding = (totalCells % 7 === 0) ? 0 : 7 - (totalCells % 7);
  for (let d = 1; d <= nextPadding; d++) {
    squares += `
      <div class="aspect-square bg-zinc-50/50 border border-zinc-100 rounded-2xl flex flex-col justify-start p-2 opacity-40 pointer-events-none">
        <span class="text-xs font-bold text-zinc-300">${d}</span>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER -->
    <header class="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl animate-pulse">🗓️</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">Wellness Calendar</h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1 mt-1">Double-Page Month Planner Sheet</p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-blue border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Calendar View
        </div>
      </div>
    </header>

    <!-- CALENDAR BOX -->
    <div class="bg-white border-4 border-zinc-800 rounded-3xl p-3 md:p-8 shadow-planner max-w-4xl mx-auto relative overflow-hidden">
      
      <div class="flex items-center justify-between mb-8 border-b-2 border-zinc-100 pb-4">
        <button onclick="handleCalendarMonthShift(-1)" class="p-2 border-2 border-zinc-800 rounded-xl hover:bg-zinc-50 shadow-planner-sm hover:-translate-y-0.5 transition-all text-zinc-800 font-bold">‹</button>
        <h2 class="font-display text-2xl md:text-3xl font-extrabold text-zinc-800">${monthNames[month]} ${year}</h2>
        <button onclick="handleCalendarMonthShift(1)" class="p-2 border-2 border-zinc-800 rounded-xl hover:bg-zinc-50 shadow-planner-sm hover:-translate-y-0.5 transition-all text-zinc-800 font-bold">›</button>
      </div>

      <div class="grid grid-cols-7 gap-1.5 text-center mb-2">${weekdayHeader}</div>
      <div class="grid grid-cols-7 gap-1.5 md:gap-2.5">${squares}</div>

    </div>

    <!-- LEGEND BOX -->
    <div class="bg-brand-cream/30 border-2 border-zinc-800 rounded-3xl p-5 shadow-planner-sm flex flex-wrap items-center justify-around gap-4 text-xs font-bold text-zinc-600 max-w-4xl mx-auto">
      <div class="flex items-center gap-1.5">
        <div class="w-5 h-5 bg-brand-cream border-2 border-zinc-800 rounded-lg flex items-center justify-center text-[10px]">🗓️</div>
        <span>Today's Date</span>
      </div>
      <div class="flex items-center gap-1.5">
        <div class="w-5 h-5 bg-brand-pink/30 border-2 border-pink-300 rounded-lg flex items-center justify-center text-xs">🌸</div>
        <span>Period Active Days</span>
      </div>
      <div class="flex items-center gap-1.5"><span>📝</span> <span>Reflections Written</span></div>
      <div class="flex items-center gap-1.5"><span>💧 / 😴 / 💪</span> <span>Logged Trackers</span></div>
    </div>
  `;
}

function handleCalendarCellClick(dateStr) {
  selectedDateStr = dateStr;
  openDetailsDrawer(dateStr);
}

function handleCalendarMonthShift(direction) {
  activeCalendarDate.setMonth(activeCalendarDate.getMonth() + direction);
  initCalendarPage();
}

// ----------------------------------------------------
// PORTAL VIEW: PLANNER REFLECTIONS DIARY
// ----------------------------------------------------
function initJournalPage() {
  const container = document.getElementById('view-journal');
  if (!container) return;

  if (!selectedDateStr) {
    selectedDateStr = new Date().toISOString().split('T')[0];
  }

  const matched = activeNotes.find(n => n.date === selectedDateStr);
  const editorText = matched ? matched.content : '';

  container.innerHTML = `
    <!-- HEADER -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl animate-pulse">📝</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">Daily Reflections</h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1 mt-1">Personal digital notebook & diary sheets</p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-pink border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Reflections Log
        </div>
      </div>
    </header>

    <!-- BINDER PLANNER SPLIT VIEW -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 relative bg-white border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner overflow-hidden">
      
      <!-- Central Rings spacing decoration -->
      <div class="hidden lg:block absolute left-[42%] top-0 bottom-0 w-8 bg-zinc-50 border-r border-l border-zinc-200 z-10 notebook-rings opacity-40"></div>

      <!-- LEFT SIDEPast Entries List (5/12 width) -->
      <div class="lg:col-span-5 space-y-6 pr-4 lg:border-r border-zinc-100 lg:min-h-[460px] min-h-0">
        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100">
          <span>📖</span>
          <h3 class="font-display font-extrabold text-lg text-zinc-800">My Reflections</h3>
        </div>

        <div class="space-y-4 max-h-[420px] overflow-y-auto pr-1">
          ${activeNotes.length === 0 ? `
            <div class="text-center py-10 text-zinc-400 font-bold text-sm">No entries logged yet. Write one on today\'s sheet!</div>
          ` : activeNotes.map(n => `
            <div onclick="setSelectedJournalDate('${n.date}')" class="p-4 rounded-2xl border-2 transition-all flex flex-col justify-between gap-3 cursor-pointer ${
              selectedDateStr === n.date ? 'bg-brand-pink/15 border-zinc-800 shadow-planner-sm' : 'bg-zinc-50/50 border-zinc-100 hover:border-zinc-300'
            }">
              <div>
                <div class="flex justify-between items-center mb-1.5">
                  <span class="text-xs font-extrabold text-brand-lavender uppercase tracking-wider">
                    🌸 ${new Date(n.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <button onclick="handleDeleteJournalNote(event, '${n.date}')" class="text-zinc-300 hover:text-red-500 font-bold text-xs p-1" title="Delete Entry">✕</button>
                </div>
                <p class="text-xs md:text-sm font-semibold text-zinc-600 line-clamp-3 leading-relaxed">${n.content}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- RIGHT SIDEText Editor (7/12 width) -->
      <div class="lg:col-span-7 lg:pl-10 space-y-6">
        <div class="flex items-center gap-2 mb-4 pb-2 border-b border-zinc-100 justify-between">
          <div class="flex items-center gap-2">
            <span>✍️</span>
            <h3 class="font-display font-extrabold text-lg text-zinc-800">
              ${selectedDateStr === new Date().toISOString().split('T')[0] ? "Today's Sheet" : "Edit Sheet"}
            </h3>
          </div>
          <input type="date" id="journal-date-input" value="${selectedDateStr}" onchange="setSelectedJournalDate(this.value)" class="px-3 py-1 border-2 border-zinc-800 rounded-xl font-bold text-xs bg-brand-cream focus:outline-none" />
        </div>

        <form onsubmit="handleSaveJournalNote(event)" class="space-y-4">
          <textarea id="journal-content" placeholder="Write down reflections, diet logs, workouts or mindful thoughts..." class="w-full h-80 p-5 border-2 border-zinc-800 rounded-2xl bg-zinc-50/50 text-zinc-800 focus:outline-none focus:bg-brand-cream/30 focus:ring-2 focus:ring-brand-lavender font-semibold text-sm leading-relaxed resize-none">${editorText}</textarea>
          <button type="submit" class="w-full py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold border-2 border-zinc-800 rounded-xl shadow-planner hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer">Save Entry</button>
        </form>
      </div>

    </div>
  `;
}

function setSelectedJournalDate(date) {
  selectedDateStr = date;
  initJournalPage();
}

async function handleSaveJournalNote(e) {
  e.preventDefault();
  const content = document.getElementById('journal-content').value;
  if (content.trim()) {
    await window.db.saveNote(currentUser.id, selectedDateStr, content);
  } else {
    await window.db.deleteNote(currentUser.id, selectedDateStr);
  }
  alert('Journal entry synchronized successfully!');
  await syncUserStorageData();
  initJournalPage();
}

async function handleDeleteJournalNote(e, date) {
  e.stopPropagation();
  if (confirm(`Delete journal entry for ${date}?`)) {
    await window.db.deleteNote(currentUser.id, date);
    if (selectedDateStr === date) selectedDateStr = new Date().toISOString().split('T')[0];
    await syncUserStorageData();
    initJournalPage();
  }
}

// ----------------------------------------------------
// PORTAL VIEW: CUSTOM TRACKERS EDITOR
// ----------------------------------------------------
let trackerEditId = null;

function initCustomTrackers() {
  const container = document.getElementById('view-trackers');
  if (!container) return;

  // Selected Emoji preset for form creation
  const formEmoji = document.getElementById('tr-form-emoji')?.value || '🌟';
  const formColor = document.getElementById('tr-form-color')?.value || 'pink';

  container.innerHTML = `
    <!-- HEADER -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl animate-pulse">🛠️</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">Wellness Trackers</h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1 mt-1">Custom trackers setup & reordering</p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-pink border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Configure Trackers
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- FORM BLOCK (1/3 width) -->
      <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 shadow-planner h-fit relative">
        <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
          <span>⚙️</span>
          <h3 class="font-display text-xl font-extrabold text-zinc-800" id="tracker-form-title">${trackerEditId ? 'Edit Tracker' : 'Create Tracker'}</h3>
        </div>

        <form onsubmit="handleSaveTrackerSubmit(event)" class="space-y-4">
          <div>
            <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Tracker Label</label>
            <input type="text" id="tr-name" required placeholder="e.g. Meditation, Reading" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-zinc-50 text-zinc-800 focus:outline-none focus:bg-white text-sm font-semibold" />
          </div>

          <div>
            <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Tracker Log Type</label>
            <select id="tr-type" class="w-full px-4 py-2.5 border-2 border-zinc-800 rounded-xl bg-zinc-50 focus:outline-none text-sm font-bold text-zinc-800">
              <option value="checkbox">✓ Checkbox (Yes / No habit)</option>
              <option value="numeric">🔢 Numeric Input (Hours, cups, steps)</option>
              <option value="text">✍ Text Input (Diet detail, notes list)</option>
            </select>
          </div>

          <div>
            <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Pick Emoji (<span id="tr-emoji-lbl">${formEmoji}</span>)</label>
            <div class="grid grid-cols-6 gap-1.5 p-2.5 bg-zinc-50 border-2 border-zinc-800 rounded-xl max-h-32 overflow-y-auto">
              ${PRESET_EMOJIS.map(e => `
                <button type="button" onclick="selectTrackerFormEmoji('${e}')" class="text-xl p-1 rounded-lg hover:bg-zinc-200 transition-all border-2 border-transparent">${e}</button>
              `).join('')}
            </div>
            <input type="hidden" id="tr-form-emoji" value="${formEmoji}" />
          </div>

          <div>
            <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Tracker Color</label>
            <div class="flex gap-2.5">
              ${PRESET_COLORS.map(c => `
                <button type="button" onclick="selectTrackerFormColor('${c.name}')" id="tr-color-btn-${c.name}" class="w-8 h-8 rounded-full border-2 border-zinc-800 transition-all ${c.class} ${
                  formColor === c.name ? 'scale-110 shadow-planner-sm' : ''
                }" title="${c.name}"></button>
              `).join('')}
            </div>
            <input type="hidden" id="tr-form-color" value="${formColor}" />
          </div>

          <div class="flex gap-3 pt-4 border-t border-zinc-100">
            <button type="button" onclick="resetTrackerForm()" class="flex-1 py-2.5 border-2 border-zinc-800 rounded-xl hover:bg-zinc-50 font-display text-sm font-bold text-zinc-700 cursor-pointer">Cancel</button>
            <button type="submit" class="flex-1 py-2.5 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display text-sm font-bold border-2 border-zinc-800 rounded-xl shadow-planner hover:-translate-y-0.5 transition-all cursor-pointer">Save</button>
          </div>
        </form>
      </div>

      <!-- LIST BLOCK (2/3 width) -->
      <div class="lg:col-span-2 space-y-4">
        <div class="bg-brand-cream/30 border-2 border-zinc-800 rounded-3xl p-5 shadow-planner-sm flex items-center gap-2.5 text-xs font-bold text-zinc-600 mb-2">
          <span>ℹ️</span>
          <span>Use up/down arrow buttons to reorder the layout trackers.</span>
        </div>

        <div class="space-y-3">
          ${activeTrackers.map((t, idx) => {
            const colorPreset = PRESET_COLORS.find(c => c.name === t.color) || PRESET_COLORS[0];
            return `
              <div class="bg-white border-2 border-zinc-800 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-planner hover:-translate-y-0.5 transition-all">
                <div class="flex items-center gap-3.5">
                  <span class="w-10 h-10 border-2 border-zinc-800 rounded-xl flex items-center justify-center text-xl shadow-planner-sm ${colorPreset.class}">${t.icon}</span>
                  <div>
                    <h4 class="font-display font-extrabold text-zinc-800 text-base">${escapeHtml(t.name)}</h4>
                    <span class="text-[9px] px-2 py-0.5 border border-zinc-800 bg-zinc-50 rounded-md font-bold uppercase text-zinc-500 tracking-wider">
                      ${t.type === 'checkbox' ? 'Checkbox habit' : t.type === 'numeric' ? 'Numeric Log' : 'Short diary text'}
                    </span>
                  </div>
                </div>

                <div class="flex items-center gap-2">
                  <button onclick="handleTrackerOrderShift(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} class="p-1 border border-zinc-800 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"><span class="font-bold">↑</span></button>
                  <button onclick="handleTrackerOrderShift(${idx}, 1)" ${idx === activeTrackers.length - 1 ? 'disabled' : ''} class="p-1 border border-zinc-800 rounded-lg transition-colors disabled:opacity-30 cursor-pointer"><span class="font-bold">↓</span></button>
                  
                  <button onclick="handleTrackerEditClick('${t.id}')" class="p-2 text-zinc-600 hover:text-zinc-800 border-2 border-transparent hover:border-zinc-800 rounded-xl transition-all cursor-pointer ml-2">✍️</button>
                  <button onclick="handleTrackerDeleteClick('${t.id}')" class="p-2 text-red-400 hover:text-red-600 border-2 border-transparent hover:border-red-200 rounded-xl transition-all cursor-pointer">🗑️</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

    </div>
  `;
}

function selectTrackerFormEmoji(emoji) {
  document.getElementById('tr-form-emoji').value = emoji;
  document.getElementById('tr-emoji-lbl').textContent = emoji;
}

function selectTrackerFormColor(color) {
  const prevColor = document.getElementById('tr-form-color').value;
  if (prevColor) {
    const prevBtn = document.getElementById(`tr-color-btn-${prevColor}`);
    if (prevBtn) prevBtn.classList.remove('scale-110', 'shadow-planner-sm');
  }

  document.getElementById('tr-form-color').value = color;
  const currentBtn = document.getElementById(`tr-color-btn-${color}`);
  if (currentBtn) currentBtn.classList.add('scale-110', 'shadow-planner-sm');
}

async function handleSaveTrackerSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('tr-name').value;
  const type = document.getElementById('tr-type').value;
  const icon = document.getElementById('tr-form-emoji').value;
  const color = document.getElementById('tr-form-color').value;

  try {
    const trackerData = { name, type, icon, color, order_index: activeTrackers.length };
    
    if (trackerEditId) {
      await window.db.updateTracker(currentUser.id, trackerEditId, trackerData);
    } else {
      await window.db.createTracker(currentUser.id, trackerData);
    }

    resetTrackerForm();
    await syncUserStorageData();
    initCustomTrackers();
  } catch (err) {
    console.error(err);
  }
}

function handleTrackerEditClick(trackerId) {
  const match = activeTrackers.find(t => t.id === trackerId);
  if (!match) return;

  trackerEditId = trackerId;
  initCustomTrackers();

  // Populate Form Fields
  document.getElementById('tr-name').value = match.name;
  document.getElementById('tr-type').value = match.type;
  selectTrackerFormEmoji(match.icon);
  selectTrackerFormColor(match.color);
  document.getElementById('tracker-form-title').textContent = 'Edit Tracker';
}

async function handleTrackerDeleteClick(trackerId) {
  if (confirm('Delete this tracker? Historical daily log statistics will be lost.')) {
    await window.db.deleteTracker(currentUser.id, trackerId);
    await syncUserStorageData();
    initCustomTrackers();
  }
}

async function handleTrackerOrderShift(index, direction) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= activeTrackers.length) return;

  const reordered = [...activeTrackers];
  const temp = reordered[index];
  reordered[index] = reordered[nextIndex];
  reordered[nextIndex] = temp;

  activeTrackers = reordered;
  initCustomTrackers();

  try {
    await window.db.saveTrackerOrder(currentUser.id, reordered.map(t => t.id));
    await syncUserStorageData();
    initCustomTrackers();
  } catch (e) {
    console.error(e);
  }
}

function resetTrackerForm() {
  trackerEditId = null;
  initCustomTrackers();
}

// ----------------------------------------------------
// PORTAL VIEW: MENSTRUAL CYCLE TRACKING
// ----------------------------------------------------
async function initCycleTracker() {
  const container = document.getElementById('view-cycle');
  if (!container) return;

  let todayLogged = activeCycleLogs.find(c => c.date === todayStr());
  let isPeriod = todayLogged ? todayLogged.is_period : false;
  let flowLevel = todayLogged ? todayLogged.flow_level || 'medium' : 'medium';
  let cycleMood = todayLogged ? todayLogged.mood || 'calm' : 'calm';
  let energyLevel = todayLogged ? todayLogged.energy_level || 'medium' : 'medium';
  let symptomsList = todayLogged ? todayLogged.symptoms || [] : [];

  // Calculate estimations
  const periodDays = activeCycleLogs
    .filter(c => c.is_period)
    .map(c => new Date(c.date + 'T00:00:00'))
    .sort((a, b) => b - a);

  let estimateHtml = '';
  if (periodDays.length > 0) {
    const latest = periodDays[0];
    const nextEst = new Date(latest);
    nextEst.setDate(latest.getDate() + 28);
    const diff = Math.ceil((nextEst - new Date()) / (1000 * 60 * 60 * 24));
    
    estimateHtml = `
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 py-2">
        <div class="bg-brand-pink/20 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between shadow-planner-sm">
          <p class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Next Period Estimate</p>
          <h2 class="font-display text-2xl font-extrabold text-zinc-800 mt-2 mb-1">${nextEst.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h2>
          <p class="text-xs font-extrabold text-pink-600 uppercase tracking-wide">
            ${diff > 0 ? `🌸 Approx ${diff} days remaining` : diff === 0 ? '🌸 Estimated to start today!' : `🌸 Late by ${Math.abs(diff)} days / active`}
          </p>
        </div>
        <div class="bg-zinc-50 border-2 border-zinc-800 rounded-2xl p-5 flex flex-col justify-between">
          <p class="text-xs font-bold text-zinc-500 uppercase tracking-widest">Last Period Logged</p>
          <h2 class="font-display text-2xl font-extrabold text-zinc-700 mt-2 mb-1">${latest.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</h2>
          <p class="text-xs font-bold text-zinc-400">Based on calendar reflections.</p>
        </div>
      </div>
    `;
  } else {
    estimateHtml = `
      <div class="text-center py-6 text-zinc-400">
        <span class="text-3xl block mb-2">⚠️</span>
        <p class="font-bold">No period log history found.</p>
        <p class="text-xs font-semibold text-zinc-400 mt-0.5">Toggle a "Period Day" on today's tracker below to start predictions.</p>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- HEADER -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl animate-pulse">🌸</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">Menstrual Cycle Tracker</h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1 mt-1">Private cycle logs & hormonal calendar syncing</p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-pink border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Cycle Sync
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- LOGGERS & ESTIMATIONS (2/3 width) -->
      <div class="lg:col-span-2 space-y-6">
        
        <!-- Estimates -->
        <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 shadow-planner">
          <div class="flex items-center gap-2 mb-4 border-b-2 border-zinc-100 pb-3">
            <span>📈</span>
            <h3 class="font-display text-xl font-extrabold text-zinc-800">Cycle Overview & Estimates</h3>
          </div>
          ${estimateHtml}
        </div>

        <!-- Today Log panel -->
        <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 shadow-planner">
          <div class="flex items-center gap-2 mb-4 border-b-2 border-zinc-100 pb-3">
            <span>📅</span>
            <h3 class="font-display text-xl font-extrabold text-zinc-800">Record Today's Cycle</h3>
          </div>

          <form onsubmit="handleCycleTodaySave(event)" class="space-y-4">
            <button type="button" onclick="toggleCycleViewPeriod()" id="cy-p-btn" class="w-full py-3 px-4 border-2 rounded-2xl flex items-center justify-between font-display font-extrabold text-sm cursor-pointer ${
              isPeriod ? 'bg-brand-pink/35 border-zinc-800 shadow-planner-sm' : 'bg-zinc-50 border-zinc-200'
            }">
              <span class="flex items-center gap-2">🔥 Today is a Period Day</span>
              <div id="cy-p-box" class="w-5 h-5 border-2 border-zinc-800 rounded-md flex items-center justify-center text-xs ${
                isPeriod ? 'bg-zinc-800 text-white' : 'bg-white'
              }">${isPeriod ? '✓' : ''}</div>
            </button>
            <input type="hidden" id="cy-period-val" value="${isPeriod}" />

            <div id="cy-period-inputs" class="${isPeriod ? 'block' : 'hidden'} space-y-4 p-4 border-2 border-zinc-800 rounded-2xl bg-zinc-50/50 animate-fade-in">
              <div>
                <label class="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Flow Strength</label>
                <div class="flex gap-2">
                  ${['light', 'medium', 'heavy'].map(f => `
                    <button type="button" onclick="selectCycleViewFlow('${f}')" id="cy-flow-${f}" class="flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                      flowLevel === f ? 'bg-brand-pink border-zinc-800' : 'bg-white border-zinc-200'
                    }">${f}</button>
                  `).join('')}
                </div>
                <input type="hidden" id="cy-flow-val" value="${flowLevel}" />
              </div>

              <div>
                <label class="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Hormonal Mood</label>
                <select id="cy-mood-val" class="px-3 py-1.5 border-2 border-zinc-800 rounded-xl text-xs font-bold bg-white text-zinc-800 focus:outline-none w-full">
                  <option value="calm" ${cycleMood === 'calm' ? 'selected' : ''}>😊 Calm & Settled</option>
                  <option value="sensitive" ${cycleMood === 'sensitive' ? 'selected' : ''}>🥺 Tender & Sensitive</option>
                  <option value="irritated" ${cycleMood === 'irritated' ? 'selected' : ''}>⚡ Irritated & Moody</option>
                  <option value="tired" ${cycleMood === 'tired' ? 'selected' : ''}>😴 Fatigue & Sleepy</option>
                  <option value="happy" ${cycleMood === 'happy' ? 'selected' : ''}>🌸 Vibrant & Upbeat</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-1.5">Energy Level</label>
                <div class="flex gap-2">
                  ${['low', 'medium', 'high'].map(e => `
                    <button type="button" onclick="selectCycleViewEnergy('${e}')" id="cy-energy-${e}" class="flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer ${
                      energyLevel === e ? 'bg-brand-pink border-zinc-800' : 'bg-white border-zinc-200'
                    }">${e}</button>
                  `).join('')}
                </div>
                <input type="hidden" id="cy-energy-val" value="${energyLevel}" />
              </div>

              <div>
                <label class="block text-xs font-bold text-zinc-500 uppercase tracking-widest mb-2">Physiological Symptoms</label>
                <div class="flex flex-wrap gap-2">
                  ${SYMPTOMS.map(s => {
                    const active = symptomsList.includes(s);
                    return `
                      <button type="button" onclick="toggleCycleViewSymptom('${s}')" id="cy-symptom-${s}" class="px-3 py-1 border-2 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                        active ? 'bg-brand-pink/20 border-zinc-800 font-bold shadow-planner-sm' : 'bg-white border-zinc-200'
                      }">${s}</button>
                    `;
                  }).join('')}
                </div>
                <input type="hidden" id="cy-symptoms-val" value="${symptomsList.join(',')}" />
              </div>
            </div>

            <button type="submit" class="w-full py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold border-2 border-zinc-800 rounded-xl shadow-planner hover:-translate-y-0.5 transition-all cursor-pointer">Save Cycle Entry</button>
          </form>
        </div>

      </div>

      <!-- HISTORIES (1/3 width) -->
      <div class="space-y-6">
        <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 shadow-planner">
          <div class="flex items-center gap-2 mb-4 border-b-2 border-zinc-100 pb-3">
            <span>🌸</span>
            <h3 class="font-display text-lg font-extrabold text-zinc-800">Logged Cycle Days</h3>
          </div>

          <div class="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
            ${activeCycleLogs.length === 0 ? `
              <p class="text-zinc-400 font-bold text-center py-6 text-sm">No cycle records logged.</p>
            ` : activeCycleLogs.map(c => `
              <div class="bg-brand-pink/10 border-2 border-zinc-800 rounded-xl p-3 flex flex-col shadow-planner-sm">
                <div class="flex justify-between items-center mb-1">
                  <span class="text-xs font-bold text-zinc-500">🌸 ${new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  <span class="px-1.5 py-0.5 border border-zinc-800 bg-brand-pink text-[9px] font-extrabold uppercase rounded">${c.flow_level || 'Logged'}</span>
                </div>
                ${c.symptoms && c.symptoms.length > 0 ? `
                  <p class="text-[10px] font-bold text-zinc-400 truncate">Symptoms: ${c.symptoms.join(', ')}</p>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>

    </div>
  `;
}

// Cycle Views Click Handlers
function toggleCycleViewPeriod() {
  const hidden = document.getElementById('cy-period-val');
  const btn = document.getElementById('cy-p-btn');
  const box = document.getElementById('cy-p-box');
  const inputs = document.getElementById('cy-period-inputs');

  const active = hidden.value === 'true';
  if (active) {
    hidden.value = 'false';
    btn.className = "w-full py-3 px-4 border-2 rounded-2xl flex items-center justify-between font-display font-extrabold text-sm cursor-pointer bg-zinc-50 border-zinc-200";
    box.className = "w-5 h-5 border-2 border-zinc-800 rounded-md flex items-center justify-center text-xs bg-white";
    box.textContent = '';
    inputs.classList.add('hidden');
  } else {
    hidden.value = 'true';
    btn.className = "w-full py-3 px-4 border-2 rounded-2xl flex items-center justify-between font-display font-extrabold text-sm cursor-pointer bg-brand-pink/35 border-zinc-800 shadow-planner-sm";
    box.className = "w-5 h-5 border-2 border-zinc-800 rounded-md flex items-center justify-center text-xs bg-zinc-800 text-white";
    box.textContent = '✓';
    inputs.classList.remove('hidden');
  }
}

function selectCycleViewFlow(flow) {
  const hidden = document.getElementById('cy-flow-val');
  if (hidden.value) {
    const prev = document.getElementById(`cy-flow-${hidden.value}`);
    if (prev) prev.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-white border-zinc-200 hover:border-zinc-800";
  }
  hidden.value = flow;
  const current = document.getElementById(`cy-flow-${flow}`);
  if (current) current.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-brand-pink border-zinc-800";
}

function selectCycleViewEnergy(energy) {
  const hidden = document.getElementById('cy-energy-val');
  if (hidden.value) {
    const prev = document.getElementById(`cy-energy-${hidden.value}`);
    if (prev) prev.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-white border-zinc-200 hover:border-zinc-800";
  }
  hidden.value = energy;
  const current = document.getElementById(`cy-energy-${energy}`);
  if (current) current.className = "flex-1 py-1.5 border-2 rounded-xl text-xs font-bold transition-all capitalize cursor-pointer bg-brand-pink border-zinc-800";
}

function toggleCycleViewSymptom(symptom) {
  const hidden = document.getElementById('cy-symptoms-val');
  let currentList = hidden.value ? hidden.value.split(',') : [];
  
  const btn = document.getElementById(`cy-symptom-${symptom}`);
  if (currentList.includes(symptom)) {
    currentList = currentList.filter(s => s !== symptom);
    if (btn) btn.className = "px-3 py-1 border-2 rounded-xl text-xs font-semibold cursor-pointer transition-all bg-white border-zinc-200";
  } else {
    currentList.push(symptom);
    if (btn) btn.className = "px-3 py-1 border-2 rounded-xl text-xs font-semibold cursor-pointer transition-all bg-brand-pink/20 border-zinc-800 font-bold shadow-planner-sm";
  }
  hidden.value = currentList.join(',');
}

async function handleCycleTodaySave(e) {
  e.preventDefault();
  const dateStr = todayStr();
  const isPeriod = document.getElementById('cy-period-val').value === 'true';
  const flowLevel = document.getElementById('cy-flow-val').value;
  const energyLevel = document.getElementById('cy-energy-val').value;
  const symptoms = document.getElementById('cy-symptoms-val').value;
  const mood = document.getElementById('cy-mood-val').value;

  try {
    await window.db.saveCycleLog(currentUser.id, dateStr, {
      is_period: isPeriod,
      flow_level: isPeriod ? flowLevel : null,
      mood: isPeriod ? mood : null,
      energy_level: isPeriod ? energyLevel : 'medium',
      symptoms: isPeriod ? (symptoms ? symptoms.split(',') : []) : []
    });

    alert("Hormonal cycle day saved to database calendar successfully!");
    await syncUserStorageData();
    initCycleTracker();
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------
// PORTAL VIEW: MINIMALIST GRAPH STATISTICS
// ----------------------------------------------------
function initStatistics() {
  const container = document.getElementById('view-view-stats'); // wait, the ID is #view-stats
  const realContainer = document.getElementById('view-stats');
  if (!realContainer) return;

  realContainer.innerHTML = `
    <!-- HEADER -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl animate-pulse">📊</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">Wellness Insights</h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1 mt-1">Weekly progress details & habit analysis</p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-lavender border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Analytics Page
        </div>
      </div>
    </header>

    <!-- METRICS DIGEST -->
    <section class="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10" id="stats-digest-row">
      <!-- Generated dynamically -->
    </section>

    <!-- CHARTS CANVAS SHEETS -->
    <div class="space-y-12 max-w-4xl mx-auto">
      
      <!-- Chart Sheet 1: Sleep & Hydration Curve -->
      <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
        <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
          <span>📈</span>
          <h3 class="font-display text-xl md:text-2xl font-extrabold text-zinc-800">Sleep & Hydration Consistency</h3>
        </div>
        <div class="h-80 w-full relative">
          <canvas id="chart-sleep-water"></canvas>
        </div>
      </div>

      <!-- Chart Sheet 2: Habits Completion Bar -->
      <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
        <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
          <span>✓</span>
          <h3 class="font-display text-xl md:text-2xl font-extrabold text-zinc-800">Daily Habits Checked</h3>
        </div>
        <div class="h-80 w-full relative">
          <canvas id="chart-habits-streaks"></canvas>
        </div>
      </div>

    </div>
  `;

  // Process data for past 7 days
  const timeline = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });

    const dayLogs = activeLogs.filter(l => l.date === dateStr);
    const water = parseFloat(dayLogs.find(l => l.tracker_key === 't-water')?.value) || 0;
    const sleep = parseFloat(dayLogs.find(l => l.tracker_key === 't-sleep')?.value) || 0;

    const checkboxes = activeTrackers.filter(t => t.type === 'checkbox');
    const habitsCount = checkboxes.filter(t => {
      const log = dayLogs.find(l => l.tracker_key === t.id);
      return log && log.value === 'true';
    }).length;

    timeline.push({ label, water, sleep, habits: habitsCount });
  }

  // Calculate Averages
  const avgSleep = timeline.reduce((acc, curr) => acc + curr.sleep, 0) / 7;
  const avgWater = timeline.reduce((acc, curr) => acc + curr.water, 0) / 7;
  const totalHabits = timeline.reduce((acc, curr) => acc + curr.habits, 0);

  document.getElementById('stats-digest-row').innerHTML = `
    <div class="bg-white border-2 border-zinc-800 rounded-3xl p-5 shadow-planner-sm flex items-center gap-4">
      <span class="w-12 h-12 bg-brand-blue border-2 border-zinc-800 rounded-2xl flex items-center justify-center text-xl shadow-planner-sm shrink-0">💧</span>
      <div>
        <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Avg Hydration</span>
        <h3 class="font-display text-xl font-extrabold text-zinc-800">${avgWater.toFixed(1)} Cups / Day</h3>
      </div>
    </div>
    <div class="bg-white border-2 border-zinc-800 rounded-3xl p-5 shadow-planner-sm flex items-center gap-4">
      <span class="w-12 h-12 bg-brand-lavender border-2 border-zinc-800 rounded-2xl flex items-center justify-center text-xl shadow-planner-sm shrink-0">😴</span>
      <div>
        <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Avg Sleep</span>
        <h3 class="font-display text-xl font-extrabold text-zinc-800">${avgSleep.toFixed(1)} Hours / Night</h3>
      </div>
    </div>
    <div class="bg-white border-2 border-zinc-800 rounded-3xl p-5 shadow-planner-sm flex items-center gap-4">
      <span class="w-12 h-12 bg-brand-pink border-2 border-zinc-800 rounded-2xl flex items-center justify-center text-xl shadow-planner-sm shrink-0">🏆</span>
      <div>
        <span class="text-[9px] font-bold text-zinc-400 uppercase tracking-widest block">Habits Completed</span>
        <h3 class="font-display text-xl font-extrabold text-zinc-800">${totalHabits} Streaks Checked</h3>
      </div>
    </div>
  `;

  // Destroy previous Chart instances to prevent canvas hover overlapping
  if (globalChartInstances.sleepWater) globalChartInstances.sleepWater.destroy();
  if (globalChartInstances.habits) globalChartInstances.habits.destroy();

  // 1. Sleep & Hydration Line Chart
  const sleepWaterCtx = document.getElementById('chart-sleep-water')?.getContext('2d');
  if (sleepWaterCtx) {
    globalChartInstances.sleepWater = new Chart(sleepWaterCtx, {
      type: 'line',
      data: {
        labels: timeline.map(t => t.label),
        datasets: [
          {
            label: 'Sleep (Hours)',
            data: timeline.map(t => t.sleep),
            borderColor: '#b49aff',
            backgroundColor: 'rgba(180, 154, 255, 0.1)',
            borderWidth: 3,
            tension: 0.2
          },
          {
            label: 'Water (Cups)',
            data: timeline.map(t => t.water),
            borderColor: '#60a5fa',
            backgroundColor: 'rgba(96, 165, 250, 0.1)',
            borderWidth: 3,
            tension: 0.2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { family: 'Quicksand', weight: 'bold' } } }
        },
        scales: {
          x: { grid: { color: '#f4f4f5' }, ticks: { font: { family: 'Quicksand', weight: 'bold' } } },
          y: { grid: { color: '#f4f4f5' }, ticks: { font: { family: 'Quicksand', weight: 'bold' } } }
        }
      }
    });
  }

  // 2. Habits Bar Chart
  const habitsCtx = document.getElementById('chart-habits-streaks')?.getContext('2d');
  if (habitsCtx) {
    globalChartInstances.habits = new Chart(habitsCtx, {
      type: 'bar',
      data: {
        labels: timeline.map(t => t.label),
        datasets: [{
          label: 'Completed Habits',
          data: timeline.map(t => t.habits),
          backgroundColor: '#a7f3d0',
          borderColor: '#27272a',
          borderWidth: 2,
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { font: { family: 'Quicksand', weight: 'bold' } } }
        },
        scales: {
          x: { grid: { color: '#f4f4f5' }, ticks: { font: { family: 'Quicksand', weight: 'bold' } } },
          y: { grid: { color: '#f4f4f5' }, ticks: { font: { family: 'Quicksand', weight: 'bold' }, stepSize: 1 } }
        }
      }
    });
  }
}

// ----------------------------------------------------
// PORTAL VIEW: GENERAL USER SETTINGS
// ----------------------------------------------------
function initSettingsPage() {
  const container = document.getElementById('view-settings');
  if (!container) return;

  const darkThemeActive = document.documentElement.classList.contains('dark');

  container.innerHTML = `
    <!-- HEADER -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl animate-pulse">⚙️</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">Planner Settings</h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1 mt-1">Personalize theme, exports, & user profile</p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-blue border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Settings Tab
        </div>
      </div>
    </header>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      
      <!-- PROFILE & APPEARANCE (2/3 width) -->
      <div class="lg:col-span-2 space-y-8">
        <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
          <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
            <span>👤</span>
            <h3 class="font-display text-xl font-extrabold text-zinc-800">Profile & Appearance</h3>
          </div>

          <form onsubmit="handleSettingsUpdateSubmit(event)" class="space-y-6">
            <div>
              <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Display Name</label>
              <input type="text" id="set-name" required value="${currentUser?.name || ''}" class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-zinc-50 text-zinc-800 focus:outline-none focus:bg-white text-sm font-semibold" />
            </div>

            <!-- Dark Mode Toggle -->
            <div class="p-4 bg-brand-cream/20 border-2 border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <h4 class="font-display font-extrabold text-zinc-800 text-sm">Planner Color Theme</h4>
                <p class="text-[10px] text-zinc-500 font-semibold mt-0.5">Toggle between calming warm sheets or a soft dark charcoal layout.</p>
              </div>
              <button type="button" onclick="toggleSettingsColorTheme()" class="w-14 h-8 bg-zinc-100 border-2 border-zinc-800 rounded-full p-1 relative flex items-center transition-colors cursor-pointer">
                <div id="set-theme-dot" class="w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center transition-all ${
                  darkThemeActive ? 'translate-x-6 bg-brand-lavender' : 'bg-white'
                }">
                  ${darkThemeActive ? '🌙' : '☀️'}
                </div>
              </button>
              <input type="hidden" id="set-theme-val" value="${darkThemeActive}" />
            </div>

            <!-- Menstrual tracking opt-in -->
            <div class="p-4 bg-brand-pink/10 border-2 border-zinc-800 rounded-2xl flex items-center justify-between gap-4">
              <div>
                <h4 class="font-display font-extrabold text-zinc-800 text-sm">Menstrual Cycle Sync</h4>
                <p class="text-[10px] text-zinc-500 font-semibold mt-0.5">Activate hormonal tracking logs, symptom digests, and estimations.</p>
              </div>
              <button type="button" onclick="toggleSettingsCycleOptIn()" id="set-cycle-btn" class="w-12 h-6 border-2 border-zinc-800 rounded-full relative p-0.5 flex items-center transition-colors cursor-pointer ${
                currentUser?.menstrual_cycle_enabled ? 'bg-brand-pink' : 'bg-zinc-100'
              }">
                <div id="set-cycle-dot" class="w-4 h-4 bg-white border border-zinc-800 rounded-full transition-all ${
                  currentUser?.menstrual_cycle_enabled ? 'translate-x-6' : 'translate-x-0'
                }"></div>
              </button>
              <input type="hidden" id="set-cycle-val" value="${currentUser?.menstrual_cycle_enabled}" />
            </div>

            <button type="submit" class="w-full py-3 bg-brand-green hover:bg-emerald-100 text-zinc-800 font-display font-bold border-2 border-zinc-800 rounded-xl shadow-planner hover:-translate-y-0.5 transition-all cursor-pointer">Save Settings</button>
          </form>
        </div>

        <!-- SECURITY PASSWORD CHANGE -->
        <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
          <div class="flex items-center gap-2 mb-6 border-b-2 border-zinc-100 pb-3">
            <span>🔒</span>
            <h3 class="font-display text-xl font-extrabold text-zinc-800">Account Security</h3>
          </div>
          <form onsubmit="handleSettingsPasswordSubmit(event)" class="space-y-4">
            <div>
              <label class="block text-zinc-700 font-bold mb-1.5 text-sm">New Password</label>
              <input type="password" id="set-pass" required placeholder="Enter new password (8+ characters)..." class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-zinc-50 text-zinc-800 focus:outline-none text-sm font-semibold" />
            </div>
            <div>
              <label class="block text-zinc-700 font-bold mb-1.5 text-sm">Confirm Password</label>
              <input type="password" id="set-pass-confirm" required placeholder="Confirm new password..." class="w-full px-4 py-2.5 rounded-xl border-2 border-zinc-800 bg-zinc-50 text-zinc-800 focus:outline-none text-sm font-semibold" />
            </div>
            <button type="submit" class="px-6 py-2.5 bg-brand-pink hover:bg-pink-100 text-zinc-800 font-display font-semibold rounded-xl border-2 border-zinc-800 shadow-planner-sm hover:-translate-y-0.5 transition-all cursor-pointer">Change Password</button>
          </form>
        </div>
      </div>

      <!-- EXPORTS & DATA (1/3 width) -->
      <div class="space-y-6">
        <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 shadow-planner flex flex-col justify-between">
          <div class="flex items-center gap-2 mb-4 border-b-2 border-zinc-100 pb-3">
            <span>📥</span>
            <h3 class="font-display text-lg font-extrabold text-zinc-800">Planner Backup</h3>
          </div>
          <p class="text-xs text-zinc-500 font-semibold leading-relaxed mb-6">Values your database integrity. Download backups for safe custody, or trigger a physical PDF save sheet!</p>
          <div class="space-y-3">
            <button onclick="handleSettingsExportData()" class="w-full py-2.5 bg-brand-blue hover:bg-blue-100 text-zinc-800 text-xs font-bold border-2 border-zinc-800 rounded-xl flex items-center justify-center gap-2 shadow-planner-sm transition-all cursor-pointer">Export JSON Data</button>
            <button onclick="handleSettingsPrint()" class="w-full py-2.5 bg-white hover:bg-zinc-50 text-zinc-800 text-xs font-bold border-2 border-zinc-800 rounded-xl flex items-center justify-center gap-2 shadow-planner-sm transition-all cursor-pointer">Print / Save PDF</button>
          </div>
        </div>

        <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 shadow-planner text-center">
          <span class="text-3xl block mb-2">⚠️</span>
          <h4 class="font-display font-extrabold text-zinc-800 text-base mb-1">Delete Journal Account</h4>
          <p class="text-[9px] text-zinc-400 font-semibold leading-relaxed mb-6">This will clear profiles, habits, settings, logs, and period histories permanently from the cloud DB.</p>
          <button onclick="handleSettingsDeleteAccount()" class="w-full py-2.5 bg-red-50 hover:bg-red-100 border-2 border-red-200 hover:border-red-500 text-red-500 text-xs font-bold rounded-xl transition-all cursor-pointer">Delete Account</button>
        </div>
      </div>

    </div>
  `;
}

function toggleSettingsColorTheme() {
  const hidden = document.getElementById('set-theme-val');
  const dot = document.getElementById('set-theme-dot');
  
  const isDark = hidden.value === 'true';
  if (isDark) {
    hidden.value = 'false';
    document.documentElement.classList.remove('dark');
    dot.className = "w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center transition-all bg-white";
    dot.textContent = '☀️';
  } else {
    hidden.value = 'true';
    document.documentElement.classList.add('dark');
    dot.className = "w-5 h-5 rounded-full border border-zinc-800 flex items-center justify-center transition-all translate-x-6 bg-brand-lavender";
    dot.textContent = '🌙';
  }
}

function toggleSettingsCycleOptIn() {
  const hidden = document.getElementById('set-cycle-val');
  const btn = document.getElementById('set-cycle-btn');
  const dot = document.getElementById('set-cycle-dot');

  const enabled = hidden.value === 'true';
  if (enabled) {
    hidden.value = 'false';
    btn.className = "w-12 h-6 border-2 border-zinc-800 rounded-full relative p-0.5 flex items-center transition-colors bg-zinc-100 cursor-pointer";
    dot.className = "w-4 h-4 bg-white border border-zinc-800 rounded-full transition-all translate-x-0";
  } else {
    hidden.value = 'true';
    btn.className = "w-12 h-6 border-2 border-zinc-800 rounded-full relative p-0.5 flex items-center transition-colors bg-brand-pink cursor-pointer";
    dot.className = "w-4 h-4 bg-white border border-zinc-800 rounded-full transition-all translate-x-6";
  }
}

async function handleSettingsUpdateSubmit(e) {
  e.preventDefault();
  const name = document.getElementById('set-name').value;
  const cycleEnabled = document.getElementById('set-cycle-val').value === 'true';
  const theme = document.getElementById('set-theme-val').value === 'true' ? 'dark' : 'light';

  try {
    const updated = await window.db.updateProfile(currentUser.id, {
      name,
      menstrual_cycle_enabled: cycleEnabled,
      theme
    });

    currentUser = { ...currentUser, ...updated };
    alert('Profile settings saved successfully!');
    await syncUserStorageData();
    renderSidebar();
    initSettingsPage();
  } catch (err) {
    console.error(err);
  }
}

async function handleSettingsPasswordSubmit(e) {
  e.preventDefault();
  const pass = document.getElementById('set-pass').value;
  const confirmPass = document.getElementById('set-pass-confirm').value;

  if (pass !== confirmPass) {
    alert('Passwords do not match.');
    return;
  }

  try {
    await window.db.updatePassword(currentUser.id, pass);
    alert('Password updated successfully!');
    document.getElementById('set-pass').value = '';
    document.getElementById('set-pass-confirm').value = '';
  } catch (err) {
    alert(err.message || 'Failed updating password.');
  }
}

async function handleSettingsExportData() {
  try {
    const data = await window.db.exportUserData(currentUser.id);
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    
    const a = document.createElement('a');
    a.setAttribute('href', jsonString);
    a.setAttribute('download', 'recess_wellness_journal_export.json');
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {
    console.error(e);
  }
}

function handleSettingsPrint() {
  window.print();
}

async function handleSettingsDeleteAccount() {
  const confirmMsg = "CRITICAL WARNING: Are you sure you want to delete your Recess account?\n\nAll notes, logs, trackers, and history will be permanently deleted!";
  if (confirm(confirmMsg)) {
    await window.db.deleteAccount(currentUser.id);
  }
}

// ----------------------------------------------------
// PORTAL VIEW: STATICS PHILOSOPHY ABOUT PAGE
// ----------------------------------------------------
function initAboutPage() {
  const container = document.getElementById('view-about');
  if (!container) return;

  container.innerHTML = `
    <!-- HEADER -->
    <header class="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b-4 border-zinc-800 pb-8">
      <div>
        <div class="flex items-center gap-2">
          <span class="text-3xl animate-pulse">🌸</span>
          <h1 class="font-display text-3xl md:text-5xl font-extrabold text-zinc-800 tracking-tight">About Recess</h1>
        </div>
        <p class="text-zinc-500 font-bold text-sm md:text-md uppercase tracking-wider pl-1 mt-1">Mindful physical stationery digital planner</p>
      </div>
      <div class="flex gap-4">
        <div class="relative px-4 py-1.5 bg-brand-pink border-2 border-zinc-800 rounded-r-md font-display font-medium text-sm shadow-planner-sm">
          <div class="absolute -left-1.5 top-0 bottom-0 w-1 bg-zinc-800"></div>
          Our Philosophy
        </div>
      </div>
    </header>

    <div class="pl-2 space-y-10 max-w-4xl mx-auto">
      
      <div class="bg-white border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner relative overflow-hidden">
        <div class="absolute -top-3 -right-3 w-14 h-14 bg-brand-lavender border-b-4 border-l-4 border-zinc-800 rotate-45"></div>
        <h3 class="font-display text-2xl font-extrabold text-zinc-800 mb-4 flex items-center gap-2">🌸 The Recess Philosophy</h3>
        <div class="space-y-4 text-zinc-600 font-semibold leading-relaxed">
          <p>Recess is a customizable digital wellness planner designed to help you track habits, nutrition, fitness, sleep, beauty, cycles, reflections, and yearly goals in a clean, aesthetic, and organized notebook format.</p>
          <p>We believe that self-care should feel calm, welcoming, and personal. Recess is designed to feel like a beautiful physical paper planner rather than a sterile corporate database or an overly complicated spreadsheet.</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 shadow-planner hover:-translate-y-0.5 transition-all">
          <h4 class="font-display text-xl font-extrabold text-zinc-800 mb-2.5">🌸 Personal Customization</h4>
          <p class="text-sm font-semibold text-zinc-500 leading-relaxed">Choose exactly what you want to track. Enable defaults like Sleep and Water, add reading or pray habits, or create completely custom checkbox and numeric trackers! We never display unused features.</p>
        </div>
        <div class="bg-white border-2 border-zinc-800 rounded-3xl p-6 shadow-planner hover:-translate-y-0.5 transition-all">
          <h4 class="font-display text-xl font-extrabold text-zinc-800 mb-2.5">🚫 Simple & Uncluttered</h4>
          <p class="text-sm font-semibold text-zinc-500 leading-relaxed">No corporate scoreboards, no premium pricing gates, no aggressive upgrade popups, and no gamified XP systems or digital gardens. Recess is simply a secure, quiet, private space to evaluate your well-being.</p>
        </div>
      </div>

      <div class="bg-brand-cream/35 border-4 border-zinc-800 rounded-3xl p-6 md:p-8 shadow-planner">
        <h3 class="font-display text-xl md:text-2xl font-extrabold text-zinc-800 mb-4 text-center">🎨 Calming Stationery Design System</h3>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div class="p-4 bg-white border-2 border-zinc-800 rounded-2xl shadow-planner-sm font-bold text-zinc-700"><span class="text-2xl block mb-1">🐱</span> Cats & Animals</div>
          <div class="p-4 bg-white border-2 border-zinc-800 rounded-2xl shadow-planner-sm font-bold text-zinc-700"><span class="text-2xl block mb-1">🌸</span> Flower Doodles</div>
          <div class="p-4 bg-white border-2 border-zinc-800 rounded-2xl shadow-planner-sm font-bold text-zinc-700"><span class="text-2xl block mb-1">⭐</span> Star Sparkles</div>
          <div class="p-4 bg-white border-2 border-zinc-800 rounded-2xl shadow-planner-sm font-bold text-zinc-700"><span class="text-2xl block mb-1">🎀</span> Ribbon Accents</div>
        </div>
      </div>

      <footer class="text-center py-6 text-zinc-400 text-xs font-bold border-t-2 border-zinc-100">
        <p>Made with love, pastel stationery, and standard browser DOM structures.</p>
        <p class="mt-1">Recess Planner © 2026. All rights preserved.</p>
      </footer>

    </div>
  `;
}

// ----------------------------------------------------
// SYSTEM HELPER TEXT FORMATTERS
// ----------------------------------------------------
const MOODS = [
  { emoji: '😊', label: 'Calm' },
  { emoji: '🥰', label: 'Loved' },
  { emoji: '😴', label: 'Tired' },
  { emoji: '🌸', label: 'Energetic' },
  { emoji: '🥺', label: 'Sensitive' },
  { emoji: '🧘', label: 'Mindful' }
];

const FLOW_LEVELS = [
  { label: 'Light', value: 'light' },
  { label: 'Medium', value: 'medium' },
  { label: 'Heavy', value: 'heavy' }
];

const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Acne', 'Fatigue', 'Backache'];

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function getGreetingText(name) {
  const hours = new Date().getHours();
  const userName = escapeHtml(name || 'Friend');
  if (hours < 12) return `Good Morning, ${userName}`;
  if (hours < 18) return `Good Afternoon, ${userName}`;
  return `Good Evening, ${userName}`;
}

function getElegantDateText() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}
