/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   admin.js — RSAM Admin Portal Logic
   Handles authentication, multi-event management, IST status math,
   Cloudinary uploads, pre-populated news/highlights/officials, & state persistence.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function escapeHTML(str) {
  if (typeof str !== 'string') return str || '';
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[match]));
}

document.addEventListener("DOMContentLoaded", () => {
  const SESSION_KEY = "RSAM_ADMIN_SESSION";

  const loginCard = document.getElementById("loginCard");
  const loginForm = document.getElementById("loginForm");
  const loginError = document.getElementById("loginError");

  const adminDashboard = document.getElementById("adminDashboard");
  const adminUserBadge = document.getElementById("adminUserBadge");
  const logoutBtn = document.getElementById("logoutBtn");

  const adminNotify = document.getElementById("adminNotify");

  // 1. Authentication Handlers
  function checkSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const sessData = JSON.parse(session);
        if (sessData && sessData.user) {
          loginCard.hidden = true;
          adminDashboard.hidden = false;
          adminUserBadge.textContent = `🔒 Logged in as ${sessData.user}`;
          adminUserBadge.hidden = false;
          logoutBtn.hidden = false;
          initDashboard();
          return;
        }
      } catch (e) {}
    }
    loginCard.hidden = false;
    adminDashboard.hidden = true;
    adminUserBadge.hidden = true;
    logoutBtn.hidden = true;
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = document.getElementById("adminUser").value.trim();
      const pass = document.getElementById("adminPass").value;

      const configCreds = (window.ADMIN_CONFIG && window.ADMIN_CONFIG.credentials) || { username: "admin", password: "rsam@password2026" };

      if (user === configCreds.username && pass === configCreds.password) {
        loginError.hidden = true;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user, loggedInAt: new Date().toISOString() }));
        checkSession();
      } else {
        loginError.hidden = false;
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.removeItem(SESSION_KEY);
      checkSession();
    });
  }

  checkSession();

  // 2. Dashboard Tabs Navigation
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      tabBtns.forEach(b => b.classList.remove("active"));
      tabPanes.forEach(p => p.classList.remove("active"));

      btn.classList.add("active");
      const targetId = btn.getAttribute("data-tab");
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add("active");
    });
  });

  // 3. Notification Toast Banner
  function notify(msg, type = "success") {
    adminNotify.textContent = msg;
    adminNotify.style.background = type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
    adminNotify.style.borderColor = type === "success" ? "#10b981" : "#ef4444";
    adminNotify.style.color = type === "success" ? "#a7f3d0" : "#fca5a5";
    adminNotify.hidden = false;

    setTimeout(() => { adminNotify.hidden = true; }, 4000);
  }

  // 4. IST Event Status Calculation Helper
  function getEventStatusInfo(ev) {
    if (!ev.startDateTime && !ev.endDateTime) {
      const cat = ev.category || "Championship";
      if (cat.toLowerCase().includes("completed") || cat.toLowerCase().includes("ended")) {
        return { label: "Event Ended", cls: "status-ended", icon: "🔴" };
      }
      return { label: cat, cls: "status-upcoming", icon: "🟡" };
    }

    /* IST = UTC + 5h 30m */
    const nowIST = new Date(Date.now() + (5.5 * 60 - new Date().getTimezoneOffset()) * 60000);
    const start  = ev.startDateTime ? new Date(ev.startDateTime) : null;
    const end    = ev.endDateTime   ? new Date(ev.endDateTime)   : null;

    if (end && nowIST > end)          return { label: "Event Ended",    cls: "status-ended",    icon: "🔴" };
    if (start && nowIST < start)      return { label: "Upcoming Event", cls: "status-upcoming", icon: "🟡" };
    return                                   { label: "Happening Now",  cls: "status-live",     icon: "🟢" };
  }

  // 5. Cloudinary Image Upload Helper
  async function uploadToCloudinary(fileInputEl, targetUrlInputEl, folder = "rsam_website/events") {
    const file = fileInputEl.files[0];
    if (!file) {
      alert("Please select an image file first.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      const apiPort = window.location.port === '8080' || window.location.hostname === 'localhost' ? '3001' : '';
      const baseUrl = apiPort ? `http://${window.location.hostname}:${apiPort}` : '';
      const uploadUrl = `${baseUrl}/api/upload-cloudinary`;

      notify("⏳ Uploading image to Cloudinary...", "info");

      try {
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: base64Data,
            folder: folder,
            fileName: file.name
          })
        });

        const data = await res.json();
        if (data.success && data.url) {
          targetUrlInputEl.value = data.url;
          notify("✓ Image uploaded to Cloudinary successfully!", "success");
        } else {
          alert("Cloudinary upload failed: " + (data.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Cloudinary upload fetch error:", err);
        alert("Could not connect to Cloudinary upload server: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  }

  // 6. Data Loaders (Merging Static Pre-Filled Data with Local Storage Overrides)
  function getAdminEvents() {
    const saved = localStorage.getItem("RSAM_ADMIN_EVENTS");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }

    return [
      {
        id: "evt_district_2026",
        title: "4th District Championship 2026",
        year: "2026",
        category: "District Championship",
        date: "15th - 16th October 2026",
        startDateTime: "2026-10-15T08:00",
        endDateTime: "2026-10-16T18:00",
        deadline: "2026-10-01T23:59:59+05:30",
        location: "Moradabad Sports Complex, Kanth Road",
        feeType: "online",
        baseFee: 500.00,
        gatewayPercent: 2.0,
        gstPercent: 18.0,
        image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png",
        description: "Official 4th District Championship for all age groups & disciplines in Moradabad.",
        showOnTicker: true,
        isRegistrationActive: true
      },
      {
        id: "evt_up_state_2026",
        title: "7th UP Open State (Flat Track)",
        year: "2026",
        category: "State Championship",
        date: "July 19, 2026",
        startDateTime: "2026-05-10T04:30",
        endDateTime: "2026-05-10T10:30",
        deadline: "2026-10-01T23:59:59+05:30",
        location: "Central Academy, Lucknow, Uttar Pradesh",
        feeType: "organizer",
        payToOrganizer: true,
        baseFee: 0,
        gatewayPercent: 0,
        gstPercent: 0,
        image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797445/rsam_website/news/news_lko.jpg",
        description: "Moradabad speeders won 5 Gold, 8 Silver and 4+ Bronze Medals at 7th UP Open-state Championship at Central Academy, Lucknow.",
        showOnTicker: true,
        isRegistrationActive: false
      },
      {
        id: "evt_marathon_2026",
        title: "Run on Wheels 4.0 Skating Marathon",
        year: "2026",
        category: "Marathon Championship",
        date: "May 10, 2026",
        startDateTime: "2026-05-10T06:00",
        endDateTime: "2026-05-10T12:00",
        deadline: "2026-10-01T23:59:59+05:30",
        location: "Agra, Uttar Pradesh",
        feeType: "organizer",
        payToOrganizer: true,
        baseFee: 0,
        gatewayPercent: 0,
        gstPercent: 0,
        image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797458/rsam_website/gallery/felicitaion_ceremony_dmr_2026/row-event.jpg",
        description: "The Great Skating Marathon 2026 organized by Agra Roller Skating Welfare Association under the aegis of UPRSA.",
        showOnTicker: true,
        isRegistrationActive: false
      }
    ];
  }


  function getAdminNews() {
    const saved = localStorage.getItem("RSAM_ADMIN_NEWS");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const newsObj = typeof NEWS !== 'undefined' ? NEWS : (window.NEWS || {});
    return newsObj.items || [];
  }

  function getAdminHighlights() {
    const saved = localStorage.getItem("RSAM_ADMIN_HIGHLIGHTS");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const hlObj = typeof HIGHLIGHTS !== 'undefined' ? HIGHLIGHTS : (window.HIGHLIGHTS || []);
    return hlObj;
  }

  function getAdminOfficials() {
    const saved = localStorage.getItem("RSAM_ADMIN_OFFICIALS");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    const offObj = typeof OFFICIALS !== 'undefined' ? OFFICIALS : (window.OFFICIALS || {});
    const assoc = offObj.association || [];
    const comm = (offObj.committee && (Array.isArray(offObj.committee) ? offObj.committee : offObj.committee.members)) || [];
    return [...assoc, ...comm];

  }


  // 7. Initialize Dashboard Renderers
  function initDashboard() {
    snapshotSessionBaseline();
    renderAdminEvents();
    renderAdminNews();
    renderAdminHighlights();
    renderAdminOfficials();
  }

  // ── Render Events Tab Cards ──
  function renderAdminEvents() {
    const events = getAdminEvents();
    const container = document.getElementById("eventsAdminList");
    if (!container) return;

    if (!events.length) {
      container.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1.5rem;">No events posted yet.</p>`;
      return;
    }

    container.innerHTML = events.map((ev, idx) => {
      const status = getEventStatusInfo(ev);
      const base = parseFloat(ev.baseFee || 500);
      const gwVal = parseFloat(((base * (parseFloat(ev.gatewayPercent) || 2.0)) / 100).toFixed(2));
      const gstVal = parseFloat(((gwVal * (parseFloat(ev.gstPercent) || 18.0)) / 100).toFixed(2));
      const total = parseFloat((base + gwVal + gstVal).toFixed(2));
      const imgSrc = ev.image || 'https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png';

      return `
        <div class="admin-item-card" style="display:flex; align-items:center; gap:1rem;">
          <img src="${imgSrc}" alt="${ev.title}" style="width:65px; height:65px; border-radius:10px; object-fit:cover; border:1px solid rgba(255,255,255,0.15); flex-shrink:0;" onerror="this.src='https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png'" />
          <div class="admin-item-info" style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.4rem;">
              <span class="admin-item-title" style="margin:0;">${ev.title}</span>
              <span class="badge-status ${status.cls}">${status.label}</span>
              ${ev.showOnTicker ? `<span class="badge-ticker">Show on Ticker</span>` : ''}
              ${ev.isRegistrationActive ? `<span class="badge-active-reg">Active Online Reg</span>` : ''}
            </div>
            <div class="admin-item-sub">
              Date: ${ev.date} · Venue: ${ev.location} · Base Fee: <strong>₹${base.toFixed(2)}</strong> ${ev.feeType === 'organizer' ? '<span style="color:#fbbf24;">(Pay to Organizer)</span>' : `(Total Payable: <strong style="color:#f59e0b;">₹${total.toFixed(2)}</strong>)`}
            </div>
            ${ev.description ? `<div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${ev.description.slice(0, 120)}...</div>` : ''}
          </div>
          <div class="admin-item-actions">
            <button type="button" class="btn-item-edit" onclick="toggleEventTicker(${idx})">${ev.showOnTicker ? 'Hide Ticker' : 'Show Ticker'}</button>
            <button type="button" class="btn-item-edit" onclick="setEventActiveReg(${idx})">Set Active Reg</button>
            <button type="button" class="btn-item-edit" onclick="editEventItem(${idx})">Edit</button>
            <button type="button" class="btn-item-delete" onclick="deleteEventItem(${idx})">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.toggleEventTicker = function(idx) {
    const events = getAdminEvents();
    if (events[idx]) {
      events[idx].showOnTicker = !events[idx].showOnTicker;
      localStorage.setItem("RSAM_ADMIN_EVENTS", JSON.stringify(events));
      renderAdminEvents();
      notify(`✓ Ticker visibility updated for ${events[idx].title}`);
    }
  };

  window.setEventActiveReg = function(idx) {
    const events = getAdminEvents();
    events.forEach((ev, i) => {
      ev.isRegistrationActive = (i === idx);
    });
    localStorage.setItem("RSAM_ADMIN_EVENTS", JSON.stringify(events));
    // Also sync active event settings to RSAM_ADMIN_EVENT for event-register.js
    if (events[idx]) {
      localStorage.setItem("RSAM_ADMIN_EVENT", JSON.stringify(events[idx]));
    }
    renderAdminEvents();
    notify(`✓ ${events[idx].title} set as Active Event for online registration!`);
  };

  window.deleteEventItem = function(idx) {
    if (!confirm("Are you sure you want to delete this event?")) return;
    const events = getAdminEvents();
    events.splice(idx, 1);
    localStorage.setItem("RSAM_ADMIN_EVENTS", JSON.stringify(events));
    renderAdminEvents();
    notify("Event deleted.");
  };

  // ── Render News Tab Cards ──
  function renderAdminNews() {
    const items = getAdminNews();
    const container = document.getElementById("newsAdminList");
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1.5rem;">No circulars found.</p>`;
      return;
    }

    container.innerHTML = items.map((item, idx) => `
      <div class="admin-item-card">
        <div class="admin-item-info">
          <div class="admin-item-title">${item.title}</div>
          <div class="admin-item-sub">📅 ${item.date} ${item.location ? '· 📍 ' + item.location : ''} · Tag: <span style="color:#f59e0b;">${item.tag}</span></div>
          <div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${(item.body || '').replace(/<[^>]*>?/gm, '').slice(0, 100)}...</div>
        </div>
        <div class="admin-item-actions">
          <button type="button" class="btn-item-edit" onclick="editNewsItem(${idx})">✏️ Edit</button>
          <button type="button" class="btn-item-delete" onclick="deleteNewsItem(${idx})">🗑️ Delete</button>
        </div>
      </div>
    `).join("");
  }

  window.deleteNewsItem = function(idx) {
    if (!confirm("Are you sure you want to delete this circular?")) return;
    const items = getAdminNews();
    items.splice(idx, 1);
    localStorage.setItem("RSAM_ADMIN_NEWS", JSON.stringify(items));
    renderAdminNews();
    notify("Circular deleted.");
  };

  // ── Render Highlights Tab Cards ──
  function renderAdminHighlights() {
    const items = getAdminHighlights();
    const container = document.getElementById("hlAdminList");
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1.5rem;">No highlights found.</p>`;
      return;
    }

    const activeCount = items.filter(h => !h.archived).length;
    const archivedCount = items.filter(h => h.archived).length;

    const summaryHTML = `
      <div class="hl-summary-bar" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:0.7rem 1.2rem; margin-bottom:1.2rem; display:flex; gap:1.5rem; color:#d1d5db; font-size:0.92rem; align-items:center;">
        <span>Active Highlights: <strong style="color:#34d399; font-size:1rem;">${activeCount}</strong></span>
        <span style="color:rgba(255,255,255,0.2);">|</span>
        <span>Archived Highlights: <strong style="color:#f59e0b; font-size:1rem;">${archivedCount}</strong></span>
      </div>
    `;

    const cardsHTML = items.map((item, idx) => {
      const isArchived = item.archived;
      const statusBadge = isArchived
        ? `<span class="badge-status" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#fbbf24;">📦 Archived</span>`
        : `<span class="badge-status status-live">🟢 Active</span>`;
      const imgCount = (item.images && item.images.length) ? item.images.length : (item.image ? 1 : 0);

      return `
        <div class="admin-item-card">
          <div class="admin-item-info">
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.4rem;">
              <span class="admin-item-title" style="margin:0;">"${item.caption}"</span>
              ${statusBadge}
              <span style="font-size:0.8rem; color:#9ca3af; background:rgba(255,255,255,0.06); padding:0.2rem 0.6rem; border-radius:4px;">📷 ${imgCount} Photos</span>
            </div>
            <div class="admin-item-sub">Event: ${item.event} · Date: ${item.date || 'Championship'}</div>
            <div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${(item.body || '').slice(0, 120)}...</div>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="btn-item-edit" onclick="toggleHlArchive(${idx})">${isArchived ? 'Unarchive' : 'Archive'}</button>
            <button type="button" class="btn-item-edit" onclick="editHlItem(${idx})">Edit</button>
            <button type="button" class="btn-item-delete" onclick="deleteHlItem(${idx})">Delete</button>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = summaryHTML + cardsHTML;
  }

  window.toggleHlArchive = function(idx) {
    const items = getAdminHighlights();
    if (items[idx]) {
      items[idx].archived = !items[idx].archived;
      localStorage.setItem("RSAM_ADMIN_HIGHLIGHTS", JSON.stringify(items));
      renderAdminHighlights();
      notify(`✓ Highlight status updated to ${items[idx].archived ? 'Archived' : 'Active'}.`);
    }
  };

  window.deleteHlItem = function(idx) {
    if (!confirm("Are you sure you want to delete this highlight?")) return;
    const items = getAdminHighlights();
    items.splice(idx, 1);
    localStorage.setItem("RSAM_ADMIN_HIGHLIGHTS", JSON.stringify(items));
    renderAdminHighlights();
    notify("Highlight deleted.");
  };

  // ── Render Officials Tab Cards ──
  function renderAdminOfficials() {
    const items = getAdminOfficials();
    const container = document.getElementById("officialsAdminList");
    if (!container) return;

    if (!items.length) {
      container.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1.5rem;">No officials found.</p>`;
      return;
    }

    container.innerHTML = items.map((item, idx) => {
      const isExec = item.category === 'executive' || ['president','secretary','treasurer','technical'].includes(item.designationClass);
      const catLabel = isExec ? 'Executive Leadership' : 'Technical Referee';
      const photoSrc = item.photo || 'https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png';

      return `
        <div class="admin-item-card" style="display:flex; align-items:center; gap:1rem;">
          <img src="${photoSrc}" alt="${item.name}" style="width:50px; height:50px; border-radius:50%; object-fit:cover; border:2px solid rgba(255,255,255,0.15); flex-shrink:0;" onerror="this.src='https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png'" />
          <div class="admin-item-info" style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.2rem;">
              <span class="admin-item-title" style="margin:0;">${item.name}</span>
              <span class="badge-status" style="background:${isExec ? 'rgba(59,130,246,0.15)' : 'rgba(156,163,175,0.15)'}; color:${isExec ? '#93c5fd' : '#e5e7eb'}; border:1px solid rgba(255,255,255,0.15); font-size:0.75rem; padding:0.15rem 0.5rem;">${catLabel}</span>
            </div>
            <div class="admin-item-sub">${item.designation} ${item.degrees ? '(' + item.degrees + ')' : ''}</div>
          </div>
          <div class="admin-item-actions" style="align-items:center;">
            <button type="button" class="btn-icon-order" onclick="moveOfficialUp(${idx})" data-tooltip="Move Up in Lineup" ${idx === 0 ? 'disabled' : ''} aria-label="Move Up">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
            </button>
            <button type="button" class="btn-icon-order" onclick="moveOfficialDown(${idx})" data-tooltip="Move Down in Lineup" ${idx === items.length - 1 ? 'disabled' : ''} aria-label="Move Down">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            </button>
            <button type="button" class="btn-item-edit" onclick="editOfficialItem(${idx})">Edit</button>
            <button type="button" class="btn-item-delete" onclick="deleteOfficialItem(${idx})">Delete</button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.moveOfficialUp = function(idx) {
    const items = getAdminOfficials();
    if (idx > 0) {
      const temp = items[idx];
      items[idx] = items[idx - 1];
      items[idx - 1] = temp;
      localStorage.setItem("RSAM_ADMIN_OFFICIALS", JSON.stringify(items));
      renderAdminOfficials();
      notify("✓ Lineup order updated.");
    }
  };

  window.moveOfficialDown = function(idx) {
    const items = getAdminOfficials();
    if (idx < items.length - 1) {
      const temp = items[idx];
      items[idx] = items[idx + 1];
      items[idx + 1] = temp;
      localStorage.setItem("RSAM_ADMIN_OFFICIALS", JSON.stringify(items));
      renderAdminOfficials();
      notify("✓ Lineup order updated.");
    }
  };

  window.deleteOfficialItem = function(idx) {
    if (!confirm("Are you sure you want to delete this official?")) return;
    const items = getAdminOfficials();
    items.splice(idx, 1);
    localStorage.setItem("RSAM_ADMIN_OFFICIALS", JSON.stringify(items));
    renderAdminOfficials();
    notify("Official deleted.");
  };


  // 8. Add & Edit Modals Handlers
  const itemModal = document.getElementById("itemModal");
  const itemModalTitle = document.getElementById("itemModalTitle");
  const itemModalFields = document.getElementById("itemModalFields");
  const itemModalClose = document.getElementById("itemModalClose");
  const itemModalCancel = document.getElementById("itemModalCancel");
  const itemModalForm = document.getElementById("itemModalForm");

  let activeModalType = null;
  let activeModalIdx = null;

  function closeModal() {
    itemModal.hidden = true;
    activeModalType = null;
    activeModalIdx = null;
  }

  if (itemModalClose) itemModalClose.addEventListener("click", closeModal);
  if (itemModalCancel) itemModalCancel.addEventListener("click", closeModal);

  function formatForDatetimeLocal(str) {
    if (!str) return '';
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(str)) {
      return str.slice(0, 16);
    }
    const d = new Date(str);
    if (isNaN(d.getTime())) return '';
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  // ── Event Modal Form ──
  function getEventModalHTML(ev = {}) {
    const base = ev.baseFee || 500;
    const gwPct = ev.gatewayPercent || 2.0;
    const gstPct = ev.gstPercent || 18.0;
    const feeType = ev.feeType || (ev.payToOrganizer ? 'organizer' : 'online');

    return `
      <div class="modal-section-card">
        <h4 class="modal-sec-title">Basic Information</h4>
        <div class="form-row">
          <div class="form-group"><label>Event Title</label><input type="text" id="mEvTitle" value="${ev.title || ''}" required placeholder="e.g. 4th District Championship 2026" /></div>
          <div class="form-group"><label>Category / Discipline</label><input type="text" id="mEvCat" value="${ev.category || 'District Championship'}" required /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Year</label><input type="text" id="mEvYear" value="${ev.year || '2026'}" required /></div>
          <div class="form-group"><label>Date Display Text</label><input type="text" id="mEvDateText" value="${ev.date || ''}" required placeholder="e.g. 15th - 16th October 2026" /></div>
        </div>
      </div>

      <div class="modal-section-card">
        <h4 class="modal-sec-title">Dates &amp; Venue Timeline</h4>
        <div class="form-row">
          <div class="form-group"><label>Start Date &amp; Time</label><input type="datetime-local" id="mEvStartDT" value="${formatForDatetimeLocal(ev.startDateTime)}" /></div>
          <div class="form-group"><label>End Date &amp; Time</label><input type="datetime-local" id="mEvEndDT" value="${formatForDatetimeLocal(ev.endDateTime)}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Registration Deadline</label><input type="datetime-local" id="mEvDeadline" value="${formatForDatetimeLocal(ev.deadline)}" required /></div>
          <div class="form-group"><label>Event Location / Venue</label><input type="text" id="mEvLoc" value="${ev.location || ''}" required /></div>
        </div>
      </div>

      <div class="modal-section-card">
        <h4 class="modal-sec-title">Registration Fee Mode &amp; Pricing</h4>
        <div class="form-group form-group--full">
          <label>Fee Payment Mode</label>
          <select id="mEvFeeType" onchange="const isOrg = this.value === 'organizer'; document.getElementById('feeCalcBox').style.display = isOrg ? 'none' : 'block'; document.getElementById('feeOrgNote').style.display = isOrg ? 'block' : 'none';">
            <option value="online" ${feeType === 'online' ? 'selected' : ''}>Online Payment via Razorpay Gateway</option>
            <option value="organizer" ${feeType === 'organizer' ? 'selected' : ''}>Paid Directly to Organizer on Spot (Informational Only)</option>
          </select>
        </div>

        <div id="feeCalcBox" style="display:${feeType === 'organizer' ? 'none' : 'block'}; background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.08); border-radius:10px; padding:1rem; margin-top:0.5rem;">
          <div class="form-row">
            <div class="form-group"><label>Base Fee (₹)</label><input type="number" step="1" id="mEvBaseFee" value="${base}" /></div>
            <div class="form-group"><label>Gateway Charge (%)</label><input type="number" step="0.1" id="mEvGwPct" value="${gwPct}" /></div>
            <div class="form-group"><label>GST Charge (%)</label><input type="number" step="0.1" id="mEvGstPct" value="${gstPct}" /></div>
          </div>
        </div>

        <div id="feeOrgNote" style="display:${feeType === 'organizer' ? 'block' : 'none'}; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.3); border-radius:10px; padding:0.8rem 1rem; margin-top:0.5rem; color:#fef08a; font-size:0.9rem;">
          Fee to be Paid to Organizer: Visitors will see an informational banner stating fees are paid directly to the organizer. Online payment checkout will be disabled for this event.
        </div>
      </div>

      <div class="modal-section-card">
        <h4 class="modal-sec-title">Event Media &amp; Cloudinary Banner</h4>
        <div class="form-group form-group--full">
          <label>Event Banner / Logo Cloudinary URL</label>
          <input type="url" id="mEvImageUrl" value="${ev.image || ''}" placeholder="https://res.cloudinary.com/..." />
          <div class="cloudinary-upload-row">
            <input type="file" id="mEvImageFile" accept="image/*" class="cloudinary-file-input" />
            <button type="button" class="btn-cloudinary-upload" id="btnUploadEvLogo">Upload</button>
          </div>
        </div>
        <div class="form-group form-group--full"><label>Event Description</label><textarea id="mEvDesc" rows="3">${ev.description || ev.body || ''}</textarea></div>
      </div>

      <div class="modal-section-card">
        <h4 class="modal-sec-title">Visibility &amp; Status Controls</h4>
        <div class="form-row">
          <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
            <input type="checkbox" id="mEvShowTicker" ${ev.showOnTicker ? 'checked' : ''} />
            <span>Display on banner</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
            <input type="checkbox" id="mEvActiveReg" ${ev.isRegistrationActive ? 'checked' : ''} />
            <span>Enable Registration</span>
          </label>
        </div>
      </div>
    `;
  }

  const addNewEventBtn = document.getElementById("addNewEventBtn");
  if (addNewEventBtn) {
    addNewEventBtn.addEventListener("click", () => {
      activeModalType = "event";
      activeModalIdx = null;
      itemModalTitle.textContent = "Add New Championship Event";
      itemModalFields.innerHTML = getEventModalHTML();
      itemModal.hidden = false;

      // Bind Cloudinary upload button
      const btnUpload = document.getElementById("btnUploadEvLogo");
      const fileInput = document.getElementById("mEvImageFile");
      const urlInput = document.getElementById("mEvImageUrl");
      if (btnUpload && fileInput && urlInput) {
        btnUpload.onclick = () => uploadToCloudinary(fileInput, urlInput, "rsam_website/events");
      }
    });
  }

  window.editEventItem = function(idx) {
    const events = getAdminEvents();
    const ev = events[idx];
    if (!ev) return;

    activeModalType = "event";
    activeModalIdx = idx;
    itemModalTitle.textContent = "Edit Championship Event";
    itemModalFields.innerHTML = getEventModalHTML(ev);
    itemModal.hidden = false;

    // Bind Cloudinary upload button
    const btnUpload = document.getElementById("btnUploadEvLogo");
    const fileInput = document.getElementById("mEvImageFile");
    const urlInput = document.getElementById("mEvImageUrl");
    if (btnUpload && fileInput && urlInput) {
      btnUpload.onclick = () => uploadToCloudinary(fileInput, urlInput, "rsam_website/events");
    }
  };

  // Add News Modal
  const addNewsBtn = document.getElementById("addNewsBtn");
  if (addNewsBtn) {
    addNewsBtn.addEventListener("click", () => {
      activeModalType = "news";
      activeModalIdx = null;
      itemModalTitle.textContent = "Add New Circular / Notice";
      itemModalFields.innerHTML = `
        <div class="form-group"><label>Title</label><input type="text" id="mNewsTitle" required placeholder="e.g. 4th District Championship Announced" /></div>
        <div class="form-row">
          <div class="form-group"><label>Tag</label>
            <select id="mNewsTag">
              <option value="announcement">Announcement</option>
              <option value="circular">Circular</option>
              <option value="result">Result</option>
              <option value="alert">Alert</option>
              <option value="news">News</option>
            </select>
          </div>
          <div class="form-group"><label>Date</label><input type="text" id="mNewsDate" required placeholder="e.g. Sept 2026" /></div>
        </div>
        <div class="form-group"><label>Location (Optional)</label><input type="text" id="mNewsLoc" placeholder="e.g. Moradabad" /></div>
        <div class="form-group"><label>Body Text</label><textarea id="mNewsBody" rows="4" required></textarea></div>
      `;
      itemModal.hidden = false;
    });
  }

  window.editNewsItem = function(idx) {
    const items = getAdminNews();
    const item = items[idx];
    if (!item) return;

    activeModalType = "news";
    activeModalIdx = idx;
    itemModalTitle.textContent = "Edit Circular / Notice";
    itemModalFields.innerHTML = `
      <div class="form-group"><label>Title</label><input type="text" id="mNewsTitle" value="${item.title || ''}" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Tag</label>
          <select id="mNewsTag">
            <option value="announcement" ${item.tag === 'announcement' ? 'selected' : ''}>Announcement</option>
            <option value="circular" ${item.tag === 'circular' ? 'selected' : ''}>Circular</option>
            <option value="result" ${item.tag === 'result' ? 'selected' : ''}>Result</option>
            <option value="alert" ${item.tag === 'alert' ? 'selected' : ''}>Alert</option>
            <option value="news" ${item.tag === 'news' ? 'selected' : ''}>News</option>
          </select>
        </div>
        <div class="form-group"><label>Date</label><input type="text" id="mNewsDate" value="${item.date || ''}" required /></div>
      </div>
      <div class="form-group"><label>Location (Optional)</label><input type="text" id="mNewsLoc" value="${item.location || ''}" /></div>
      <div class="form-group"><label>Body Text</label><textarea id="mNewsBody" rows="4" required>${(item.body || '').replace(/<[^>]*>?/gm, '')}</textarea></div>
    `;
    itemModal.hidden = false;
  };

  // Multi-Photo Chooser state helper for Highlights (Max 6 photos)
  let currentHlPhotos = [];

  function renderHlPhotoThumbnails() {
    const container = document.getElementById("hlPhotoThumbnailsGrid");
    const countText = document.getElementById("hlPhotoCountText");
    const hiddenInput = document.getElementById("mHlImage");
    const btnBrowse = document.getElementById("btnBrowseHlPhotos");

    if (countText) countText.textContent = `${currentHlPhotos.length} of 6 photos selected`;
    if (hiddenInput) hiddenInput.value = currentHlPhotos.join(", ");
    if (btnBrowse) {
      if (currentHlPhotos.length >= 6) {
        btnBrowse.disabled = true;
        btnBrowse.style.opacity = "0.5";
        btnBrowse.style.cursor = "not-allowed";
        btnBrowse.textContent = "Maximum 6 Photos Selected";
      } else {
        btnBrowse.disabled = false;
        btnBrowse.style.opacity = "1";
        btnBrowse.style.cursor = "pointer";
        btnBrowse.textContent = "Browse & Select Photos (Max 6)";
      }
    }

    if (container) {
      container.innerHTML = currentHlPhotos.map((url, idx) => `
        <div style="position:relative; width:85px; height:85px; border-radius:8px; overflow:hidden; border:1px solid rgba(255,255,255,0.2); background:#000;">
          <img src="${url}" style="width:100%; height:100%; object-fit:cover;" />
          <button type="button" onclick="removeHlPhoto(${idx})" style="position:absolute; top:3px; right:3px; width:22px; height:22px; border-radius:50%; background:rgba(239,68,68,0.9); color:#fff; border:none; font-weight:bold; font-size:14px; cursor:pointer; display:flex; align-items:center; justify-content:center; line-height:1;" title="Remove Photo">&times;</button>
        </div>
      `).join("");
    }
  }

  window.removeHlPhoto = function(idx) {
    currentHlPhotos.splice(idx, 1);
    renderHlPhotoThumbnails();
  };

  function setupHlPhotoChooser(existingPhotos = []) {
    currentHlPhotos = Array.isArray(existingPhotos) ? [...existingPhotos] : (existingPhotos ? [existingPhotos] : []);
    if (currentHlPhotos.length > 6) currentHlPhotos = currentHlPhotos.slice(0, 6);

    renderHlPhotoThumbnails();

    const fileInput = document.getElementById("mHlMultiPicker");
    const btnBrowse = document.getElementById("btnBrowseHlPhotos");

    if (btnBrowse && fileInput) {
      btnBrowse.onclick = () => {
        if (currentHlPhotos.length >= 6) {
          alert("Maximum limit of 6 photos reached.");
          return;
        }
        fileInput.click();
      };

      fileInput.onchange = async (e) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const availableSlots = 6 - currentHlPhotos.length;
        if (availableSlots <= 0) {
          alert("Maximum 6 photos limit reached.");
          return;
        }
        const filesToProcess = files.slice(0, availableSlots);
        notify(`Processing ${filesToProcess.length} photo(s)...`, "info");

        for (const file of filesToProcess) {
          await new Promise(resolve => {
            const reader = new FileReader();
            reader.onload = async (ev) => {
              const base64Data = ev.target.result;
              const apiPort = window.location.port === '8080' || window.location.hostname === 'localhost' ? '3001' : '';
              const baseUrl = apiPort ? `http://${window.location.hostname}:${apiPort}` : '';
              try {
                const res = await fetch(`${baseUrl}/api/upload-cloudinary`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image: base64Data, folder: "rsam_website/highlights", fileName: file.name })
                });
                const data = await res.json();
                if (data.success && data.url) {
                  currentHlPhotos.push(data.url);
                } else {
                  currentHlPhotos.push(base64Data);
                }
              } catch (err) {
                currentHlPhotos.push(base64Data);
              }
              resolve();
            };
            reader.readAsDataURL(file);
          });
        }
        renderHlPhotoThumbnails();
        notify(`✓ Added ${filesToProcess.length} photo(s). (${currentHlPhotos.length}/6 selected)`);
        fileInput.value = "";
      };
    }
  }

  // Add Highlight Modal
  const addHlBtn = document.getElementById("addHlBtn");
  if (addHlBtn) {
    addHlBtn.addEventListener("click", () => {
      activeModalType = "highlight";
      activeModalIdx = null;
      itemModalTitle.textContent = "Add New Highlight";
      itemModalFields.innerHTML = `
        <div class="form-group"><label>Caption / Quote</label><input type="text" id="mHlCaption" required placeholder="e.g. Speed Skaters Win Gold in State" /></div>
        <div class="form-row">
          <div class="form-group"><label>Event Name</label><input type="text" id="mHlEvent" required placeholder="e.g. UP State Championship 2026" /></div>
          <div class="form-group"><label>Trophy Badge</label><input type="text" id="mHlTrophy" value="🏆" required /></div>
        </div>
        <div class="form-group"><label>Date</label><input type="text" id="mHlDate" placeholder="e.g. August 2026" /></div>

        <div class="form-group form-group--full">
          <label>Highlight Photos (Maximum 6 Photos)</label>
          <div class="photo-chooser-box">
            <input type="file" id="mHlMultiPicker" accept="image/*" multiple style="display:none;" />
            <button type="button" class="btn-dash-action" id="btnBrowseHlPhotos">Browse &amp; Select Photos (Max 6)</button>
            <div style="font-size:0.8rem; color:#9ca3af; margin-top:0.4rem;" id="hlPhotoCountText">0 of 6 photos selected</div>
            <div id="hlPhotoThumbnailsGrid" style="display:flex; flex-wrap:wrap; gap:0.6rem; margin-top:0.8rem; justify-content:center;"></div>
          </div>
          <input type="hidden" id="mHlImage" value="" />
        </div>

        <div class="form-group"><label>Description</label><textarea id="mHlBody" rows="3" required></textarea></div>
        <div class="form-group">
          <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
            <input type="checkbox" id="mHlArchived" />
            <span>Mark as Archived Highlight (Moves to Older Highlights Archive)</span>
          </label>
        </div>
      `;
      itemModal.hidden = false;
      setupHlPhotoChooser([]);
    });
  }

  window.editHlItem = function(idx) {
    const items = getAdminHighlights();
    const item = items[idx];
    if (!item) return;

    const existingImgs = (item.images && item.images.length) ? item.images : (item.image ? [item.image] : []);

    activeModalType = "highlight";
    activeModalIdx = idx;
    itemModalTitle.textContent = "Edit Highlight";
    itemModalFields.innerHTML = `
      <div class="form-group"><label>Caption / Quote</label><input type="text" id="mHlCaption" value="${item.caption || ''}" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Event Name</label><input type="text" id="mHlEvent" value="${item.event || ''}" required /></div>
        <div class="form-group"><label>Trophy Badge</label><input type="text" id="mHlTrophy" value="${item.trophy || '🏆'}" required /></div>
      </div>
      <div class="form-group"><label>Date</label><input type="text" id="mHlDate" value="${item.date || ''}" /></div>

      <div class="form-group form-group--full">
        <label>Highlight Photos (Maximum 6 Photos)</label>
        <div class="photo-chooser-box">
          <input type="file" id="mHlMultiPicker" accept="image/*" multiple style="display:none;" />
          <button type="button" class="btn-dash-action" id="btnBrowseHlPhotos">Browse &amp; Select Photos (Max 6)</button>
          <div style="font-size:0.8rem; color:#9ca3af; margin-top:0.4rem;" id="hlPhotoCountText">0 of 6 photos selected</div>
          <div id="hlPhotoThumbnailsGrid" style="display:flex; flex-wrap:wrap; gap:0.6rem; margin-top:0.8rem; justify-content:center;"></div>
        </div>
        <input type="hidden" id="mHlImage" value="" />
      </div>

      <div class="form-group"><label>Description</label><textarea id="mHlBody" rows="3" required>${item.body || ''}</textarea></div>
      <div class="form-group">
        <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
          <input type="checkbox" id="mHlArchived" ${item.archived ? 'checked' : ''} />
          <span>Mark as Archived Highlight (Moves to Older Highlights Archive)</span>
        </label>
      </div>
    `;
    itemModal.hidden = false;
    setupHlPhotoChooser(existingImgs);
  };

  // Add Official Modal
  const addOfficialBtn = document.getElementById("addOfficialBtn");
  if (addOfficialBtn) {
    addOfficialBtn.addEventListener("click", () => {
      activeModalType = "official";
      activeModalIdx = null;
      itemModalTitle.textContent = "Add Official / Referee";
      itemModalFields.innerHTML = `
        <div class="form-group"><label>Category</label>
          <select id="mOffCategory">
            <option value="executive">Executive Association Member</option>
            <option value="referee">Technical Referee / Judge</option>
          </select>
        </div>
        <div class="form-group"><label>Official Full Name</label><input type="text" id="mOffName" required placeholder="e.g. Devendra Rana" /></div>
        <div class="form-row">
          <div class="form-group"><label>Designation</label><input type="text" id="mOffDesig" required placeholder="e.g. General Secretary / State Referee" /></div>
          <div class="form-group"><label>Badge Style Class</label>
            <select id="mOffClass">
              <option value="president">President (Gold Badge)</option>
              <option value="secretary">General Secretary (Red Badge)</option>
              <option value="treasurer">Treasurer (Blue Badge)</option>
              <option value="technical">Technical (Cyan Badge)</option>
              <option value="member">Referee / Member (Gray Badge)</option>
            </select>
          </div>
        </div>
        <div class="form-group"><label>Degrees / Qualifications (Optional)</label><input type="text" id="mOffDegrees" placeholder="e.g. M.P.Ed, B.Tech" /></div>
        <div class="form-group form-group--full">
          <label>Photo URL</label>
          <input type="url" id="mOffPhoto" placeholder="https://res.cloudinary.com/..." required />
          <div class="cloudinary-upload-row">
            <input type="file" id="mOffPhotoFile" accept="image/*" class="cloudinary-file-input" />
            <button type="button" class="btn-cloudinary-upload" id="btnUploadOffPhoto">Upload</button>
          </div>
        </div>
      `;
      itemModal.hidden = false;

      const btnUpload = document.getElementById("btnUploadOffPhoto");
      const fileInput = document.getElementById("mOffPhotoFile");
      const urlInput = document.getElementById("mOffPhoto");
      if (btnUpload && fileInput && urlInput) {
        btnUpload.onclick = () => uploadToCloudinary(fileInput, urlInput, "rsam_website/officials");
      }
    });
  }

  window.editOfficialItem = function(idx) {
    const items = getAdminOfficials();
    const item = items[idx];
    if (!item) return;

    activeModalType = "official";
    activeModalIdx = idx;
    itemModalTitle.textContent = "Edit Official / Referee";
    itemModalFields.innerHTML = `
      <div class="form-group"><label>Category</label>
        <select id="mOffCategory">
          <option value="executive" ${item.category === 'executive' ? 'selected' : ''}>Executive Association Member</option>
          <option value="referee" ${item.category === 'referee' ? 'selected' : ''}>Technical Referee / Judge</option>
        </select>
      </div>
      <div class="form-group"><label>Official Full Name</label><input type="text" id="mOffName" value="${item.name || ''}" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Designation</label><input type="text" id="mOffDesig" value="${item.designation || ''}" required /></div>
        <div class="form-group"><label>Badge Style Class</label>
          <select id="mOffClass">
            <option value="president" ${item.designationClass === 'president' ? 'selected' : ''}>President (Gold Badge)</option>
            <option value="secretary" ${item.designationClass === 'secretary' ? 'selected' : ''}>General Secretary (Red Badge)</option>
            <option value="treasurer" ${item.designationClass === 'treasurer' ? 'selected' : ''}>Treasurer (Blue Badge)</option>
            <option value="technical" ${item.designationClass === 'technical' ? 'selected' : ''}>Technical (Cyan Badge)</option>
            <option value="member" ${item.designationClass === 'member' ? 'selected' : ''}>Referee / Member (Gray Badge)</option>
          </select>
        </div>
      </div>
      <div class="form-group"><label>Degrees / Qualifications (Optional)</label><input type="text" id="mOffDegrees" value="${item.degrees || ''}" /></div>
      <div class="form-group form-group--full">
        <label>Photo URL</label>
        <input type="url" id="mOffPhoto" value="${item.photo || ''}" required />
        <div class="cloudinary-upload-row">
          <input type="file" id="mOffPhotoFile" accept="image/*" class="cloudinary-file-input" />
          <button type="button" class="btn-cloudinary-upload" id="btnUploadOffPhoto">Upload</button>
        </div>
      </div>
    `;
    itemModal.hidden = false;

    const btnUpload = document.getElementById("btnUploadOffPhoto");
    const fileInput = document.getElementById("mOffPhotoFile");
    const urlInput = document.getElementById("mOffPhoto");
    if (btnUpload && fileInput && urlInput) {
      btnUpload.onclick = () => uploadToCloudinary(fileInput, urlInput, "rsam_website/officials");
    }
  };

  // Skinsuit Modal Handler (Side-by-Side Interactive Placeholders)
  const editSkinsuitBtn = document.getElementById("editSkinsuitBtn");
  if (editSkinsuitBtn) {
    editSkinsuitBtn.addEventListener("click", () => {
      const offObj = typeof OFFICIALS !== 'undefined' ? OFFICIALS : (window.OFFICIALS || {});
      let skinsuitConfig = offObj.skinsuit || {};
      const savedSkinsuit = localStorage.getItem("RSAM_ADMIN_SKINSUIT");
      if (savedSkinsuit) {
        try { skinsuitConfig = JSON.parse(savedSkinsuit); } catch (e) {}
      }

      const frontUrl = skinsuitConfig.frontImage || 'https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/skinsuit_front.png';
      const backUrl = skinsuitConfig.backImage || 'https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/skinsuit_back.png';

      activeModalType = "skinsuit";
      activeModalIdx = null;
      itemModalTitle.textContent = "Edit RSAM Official Skater Skinsuit Design";
      itemModalFields.innerHTML = `
        <div class="modal-section-card">
          <h4 class="modal-sec-title">Skinsuit Metadata &amp; Guidelines</h4>
          <div class="form-row">
            <div class="form-group"><label>Showcase Title</label><input type="text" id="mSkinTitle" value="${skinsuitConfig.title || 'RSAM Official Skater Skinsuit'}" required /></div>
            <div class="form-group"><label>Subtitle / Guidelines</label><input type="text" id="mSkinSubtitle" value="${skinsuitConfig.subtitle || 'Mandatory official racing uniform design for all RSAM athletes'}" required /></div>
          </div>
          <div class="form-group" style="margin-top:0.8rem;"><label>Description / Uniform Rules</label><textarea id="mSkinDesc" rows="2">${skinsuitConfig.description || ''}</textarea></div>
        </div>

        <div class="modal-section-card">
          <h4 class="modal-sec-title">Interactive Side-by-Side View Placeholders</h4>
          <div class="skinsuit-placeholders-grid">
            <!-- Front View Card -->
            <div class="skin-view-card">
              <h5 style="color:#38bdf8; margin-bottom:0.6rem; font-weight:700;">Front View</h5>
              <div class="skin-img-preview-box" id="skinFrontPreviewBox" onclick="document.getElementById('mSkinFrontFile').click()">
                <img src="${frontUrl}" id="skinFrontImgTag" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png'" />
              </div>
              <input type="file" id="mSkinFrontFile" accept="image/*" style="display:none;" />
              <input type="url" id="mSkinFrontImg" value="${frontUrl}" placeholder="Front View Cloudinary URL" style="width:100%; margin-top:0.6rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#fff; padding:0.4rem 0.6rem; border-radius:6px; font-size:0.8rem;" />
              <button type="button" class="btn-dash-action" style="margin-top:0.5rem; width:100%; font-size:0.8rem;" onclick="document.getElementById('mSkinFrontFile').click()">Upload Front Image</button>
            </div>

            <!-- Back View Card -->
            <div class="skin-view-card">
              <h5 style="color:#38bdf8; margin-bottom:0.6rem; font-weight:700;">Back View</h5>
              <div class="skin-img-preview-box" id="skinBackPreviewBox" onclick="document.getElementById('mSkinBackFile').click()">
                <img src="${backUrl}" id="skinBackImgTag" style="width:100%; height:100%; object-fit:contain;" onerror="this.src='https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png'" />
              </div>
              <input type="file" id="mSkinBackFile" accept="image/*" style="display:none;" />
              <input type="url" id="mSkinBackImg" value="${backUrl}" placeholder="Back View Cloudinary URL" style="width:100%; margin-top:0.6rem; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.15); color:#fff; padding:0.4rem 0.6rem; border-radius:6px; font-size:0.8rem;" />
              <button type="button" class="btn-dash-action" style="margin-top:0.5rem; width:100%; font-size:0.8rem;" onclick="document.getElementById('mSkinBackFile').click()">Upload Back Image</button>
            </div>
          </div>
        </div>
      `;
      itemModal.hidden = false;

      // Bind interactive uploads & live preview updates
      const frontFile = document.getElementById("mSkinFrontFile");
      const frontUrlInput = document.getElementById("mSkinFrontImg");
      const frontTag = document.getElementById("skinFrontImgTag");

      if (frontUrlInput && frontTag) {
        frontUrlInput.oninput = () => { frontTag.src = frontUrlInput.value.trim(); };
      }
      if (frontFile && frontUrlInput && frontTag) {
        frontFile.onchange = () => uploadToCloudinary(frontFile, frontUrlInput, "rsam_website/branding").then(() => { frontTag.src = frontUrlInput.value; });
      }

      const backFile = document.getElementById("mSkinBackFile");
      const backUrlInput = document.getElementById("mSkinBackImg");
      const backTag = document.getElementById("skinBackImgTag");

      if (backUrlInput && backTag) {
        backUrlInput.oninput = () => { backTag.src = backUrlInput.value.trim(); };
      }
      if (backFile && backUrlInput && backTag) {
        backFile.onchange = () => uploadToCloudinary(backFile, backUrlInput, "rsam_website/branding").then(() => { backTag.src = backUrlInput.value; });
      }
    });
  }

  // Submit Modal Form
  if (itemModalForm) {
    itemModalForm.addEventListener("submit", (e) => {
      e.preventDefault();

      if (activeModalType === "event") {
        const events = getAdminEvents();
        const base = parseFloat(document.getElementById("mEvBaseFee").value) || 0;
        const gwPct = parseFloat(document.getElementById("mEvGwPct").value) || 2.0;
        const gstPct = parseFloat(document.getElementById("mEvGstPct").value) || 18.0;

        const isRegActive = document.getElementById("mEvActiveReg").checked;
        const isTickerShow = document.getElementById("mEvShowTicker").checked;
        const feeTypeVal = document.getElementById("mEvFeeType").value;

        let deadlineVal = document.getElementById("mEvDeadline").value.trim();
        if (deadlineVal && !deadlineVal.includes('+') && !deadlineVal.includes('Z')) {
          if (deadlineVal.length === 16) {
            deadlineVal = deadlineVal + ':00+05:30';
          } else if (deadlineVal.length === 19) {
            deadlineVal = deadlineVal + '+05:30';
          }
        }

        const newEvent = {
          id: activeModalIdx !== null ? events[activeModalIdx].id : "evt_" + Date.now(),
          title: document.getElementById("mEvTitle").value.trim(),
          category: document.getElementById("mEvCat").value.trim(),
          year: document.getElementById("mEvYear").value.trim(),
          date: document.getElementById("mEvDateText").value.trim(),
          startDateTime: document.getElementById("mEvStartDT").value.trim(),
          endDateTime: document.getElementById("mEvEndDT").value.trim(),
          deadline: deadlineVal,
          location: document.getElementById("mEvLoc").value.trim(),
          feeType: feeTypeVal,
          payToOrganizer: feeTypeVal === 'organizer',
          baseFee: feeTypeVal === 'organizer' ? 0 : base,
          gatewayPercent: gwPct,
          gstPercent: gstPct,
          image: document.getElementById("mEvImageUrl").value.trim(),
          description: document.getElementById("mEvDesc").value.trim(),
          body: document.getElementById("mEvDesc").value.trim(),
          showOnTicker: isTickerShow,
          isRegistrationActive: isRegActive
        };

        if (isRegActive) {
          events.forEach(ev => ev.isRegistrationActive = false);
        }

        if (activeModalIdx !== null) events[activeModalIdx] = newEvent;
        else events.unshift(newEvent);

        const evsStr = JSON.stringify(events);
        localStorage.setItem("RSAM_ADMIN_EVENTS", evsStr);
        updateSessionBaselineKey("events", evsStr);

        if (isRegActive) {
          const activeStr = JSON.stringify(newEvent);
          localStorage.setItem("RSAM_ADMIN_EVENT", activeStr);
          updateSessionBaselineKey("event", activeStr);
        }

        renderAdminEvents();
        notify("✓ Championship Event saved successfully!");
      } else if (activeModalType === "news") {
        const items = getAdminNews();
        const newItem = {
          title: document.getElementById("mNewsTitle").value.trim(),
          tag: document.getElementById("mNewsTag").value,
          date: document.getElementById("mNewsDate").value.trim(),
          location: document.getElementById("mNewsLoc").value.trim(),
          body: document.getElementById("mNewsBody").value.trim()
        };
        if (activeModalIdx !== null) items[activeModalIdx] = newItem;
        else items.unshift(newItem);
        const newsStr = JSON.stringify(items);
        localStorage.setItem("RSAM_ADMIN_NEWS", newsStr);
        updateSessionBaselineKey("news", newsStr);
        renderAdminNews();
        notify("✓ Circular saved.");
      } else if (activeModalType === "highlight") {
        const items = getAdminHighlights();
        const newItem = {
          caption: document.getElementById("mHlCaption").value.trim(),
          event: document.getElementById("mHlEvent").value.trim(),
          trophy: document.getElementById("mHlTrophy").value.trim() || "🏆",
          date: document.getElementById("mHlDate").value.trim(),
          images: currentHlPhotos,
          body: document.getElementById("mHlBody").value.trim(),
          archived: document.getElementById("mHlArchived").checked
        };
        if (activeModalIdx !== null) items[activeModalIdx] = newItem;
        else items.unshift(newItem);
        const hlStr = JSON.stringify(items);
        localStorage.setItem("RSAM_ADMIN_HIGHLIGHTS", hlStr);
        updateSessionBaselineKey("highlights", hlStr);
        renderAdminHighlights();
        notify("✓ Highlight saved.");
      } else if (activeModalType === "official") {
        const items = getAdminOfficials();
        const newItem = {
          name: document.getElementById("mOffName").value.trim(),
          designation: document.getElementById("mOffDesig").value.trim(),
          designationClass: document.getElementById("mOffClass").value,
          degrees: document.getElementById("mOffDegrees").value.trim(),
          photo: document.getElementById("mOffPhoto").value.trim(),
          category: document.getElementById("mOffCategory").value
        };
        if (activeModalIdx !== null) items[activeModalIdx] = newItem;
        else items.push(newItem);
        const offStr = JSON.stringify(items);
        localStorage.setItem("RSAM_ADMIN_OFFICIALS", offStr);
        updateSessionBaselineKey("officials", offStr);
        renderAdminOfficials();
        notify("✓ Official saved.");
      } else if (activeModalType === "skinsuit") {
        const skinsuitConfig = {
          title: document.getElementById("mSkinTitle").value.trim(),
          subtitle: document.getElementById("mSkinSubtitle").value.trim(),
          frontImage: document.getElementById("mSkinFrontImg").value.trim(),
          backImage: document.getElementById("mSkinBackImg").value.trim(),
          description: document.getElementById("mSkinDesc").value.trim()
        };
        const skinStr = JSON.stringify(skinsuitConfig);
        localStorage.setItem("RSAM_ADMIN_SKINSUIT", skinStr);
        updateSessionBaselineKey("skinsuit", skinStr);
        notify("✓ Official Skinsuit design updated!");
      }

      closeModal();
    });
  }



  // 9. Export & Reset Handlers
  const exportConfigBtn = document.getElementById("exportConfigBtn");
  if (exportConfigBtn) {
    exportConfigBtn.addEventListener("click", () => {
      const fullConfig = {
        events: getAdminEvents(),
        newsItems: getAdminNews(),
        highlights: getAdminHighlights(),
        officials: getAdminOfficials()
      };
      const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullConfig, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", jsonStr);
      downloadAnchor.setAttribute("download", "rsam_site_admin_config.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      notify("📥 Admin Configuration exported as JSON.");
    });
  }

  // Session Baseline Management (Revert unsaved session edits without wiping saves)
  let sessionBaseline = null;
  function snapshotSessionBaseline() {
    if (!sessionBaseline) {
      sessionBaseline = {
        events: localStorage.getItem("RSAM_ADMIN_EVENTS"),
        event: localStorage.getItem("RSAM_ADMIN_EVENT"),
        news: localStorage.getItem("RSAM_ADMIN_NEWS"),
        highlights: localStorage.getItem("RSAM_ADMIN_HIGHLIGHTS"),
        officials: localStorage.getItem("RSAM_ADMIN_OFFICIALS"),
        skinsuit: localStorage.getItem("RSAM_ADMIN_SKINSUIT")
      };
    }
  }

  function updateSessionBaselineKey(key, value) {
    if (!sessionBaseline) snapshotSessionBaseline();
    sessionBaseline[key] = value;
  }

  // Take initial snapshot on dashboard init
  const origInitDashboard = typeof initDashboard === 'function' ? initDashboard : null;

  const resetDefaultsBtn = document.getElementById("resetDefaultsBtn");
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener("click", () => {
      if (confirm("Revert unsaved changes back to session baseline? Saved items will remain intact.")) {
        if (!sessionBaseline) snapshotSessionBaseline();
        const keys = [
          { prop: 'events', ls: 'RSAM_ADMIN_EVENTS' },
          { prop: 'event', ls: 'RSAM_ADMIN_EVENT' },
          { prop: 'news', ls: 'RSAM_ADMIN_NEWS' },
          { prop: 'highlights', ls: 'RSAM_ADMIN_HIGHLIGHTS' },
          { prop: 'officials', ls: 'RSAM_ADMIN_OFFICIALS' },
          { prop: 'skinsuit', ls: 'RSAM_ADMIN_SKINSUIT' }
        ];
        keys.forEach(k => {
          if (sessionBaseline[k.prop] !== null && sessionBaseline[k.prop] !== undefined) {
            localStorage.setItem(k.ls, sessionBaseline[k.prop]);
          } else {
            localStorage.removeItem(k.ls);
          }
        });
        initDashboard();
        notify("✓ Session changes reverted to session baseline.");
      }
    });
  }
});
