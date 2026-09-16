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
  
  function updateEnvBadge() {
    const envBadge = document.getElementById("envModeBadge");
    if (envBadge) {
      const isLocal = typeof window !== 'undefined' && (
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '::1'
      );
      const isProd = !isLocal;
      envBadge.textContent = isProd ? "⚡ LIVE PROD MODE" : "⚡ DEV MODE";
      envBadge.style.background = isProd ? "rgba(16, 185, 129, 0.2)" : "rgba(224, 28, 46, 0.2)";
      envBadge.style.borderColor = isProd ? "rgba(16, 185, 129, 0.5)" : "rgba(224, 28, 46, 0.5)";
      envBadge.style.color = isProd ? "#34d399" : "#ff6b6b";
    }
  }
  updateEnvBadge();

  // 1. Authentication Handlers
  function checkSession() {
    const session = localStorage.getItem(SESSION_KEY);
    if (session) {
      try {
        const sessData = JSON.parse(session);
        if (sessData && sessData.user) {
          if (loginCard) {
            loginCard.hidden = true;
            loginCard.style.display = "none";
          }
          if (adminDashboard) {
            adminDashboard.hidden = false;
            adminDashboard.style.display = "block";
          }
          if (adminUserBadge) {
            adminUserBadge.textContent = `🔒 Logged in as ${sessData.user}`;
            adminUserBadge.hidden = false;
            adminUserBadge.style.display = "inline-flex";
          }
          if (logoutBtn) {
            logoutBtn.hidden = false;
            logoutBtn.style.display = "inline-flex";
          }
          initDashboard();
          return;
        }
      } catch (e) {}
    }
    if (loginCard) {
      loginCard.hidden = false;
      loginCard.style.display = "block";
    }
    if (adminDashboard) {
      adminDashboard.hidden = true;
      adminDashboard.style.display = "none";
    }
    if (adminUserBadge) {
      adminUserBadge.hidden = true;
      adminUserBadge.style.display = "none";
    }
    if (logoutBtn) {
      logoutBtn.hidden = true;
      logoutBtn.style.display = "none";
    }
  }

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const userInput = document.getElementById("adminUser").value.trim();
      const passInput = document.getElementById("adminPass").value;

      const configCreds = (window.ADMIN_CONFIG && window.ADMIN_CONFIG.credentials) || { username: "admin", password: "rsam@password2026" };

      const userMatch = userInput.toLowerCase() === (configCreds.username || "admin").toLowerCase();
      const passMatch = passInput.trim() === (configCreds.password || "rsam@password2026").trim();

      if (userMatch && passMatch) {
        loginError.hidden = true;
        localStorage.setItem(SESSION_KEY, JSON.stringify({ user: userInput, loggedInAt: new Date().toISOString() }));
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

  // 2. Dashboard Tabs Navigation (On-Demand Modular Sub-View Loader)
  const tabBtns = document.querySelectorAll(".admin-tab-btn");
  const tabPanes = document.querySelectorAll(".tab-pane");
  const loadedTabs = new Set();

  function activateAdminTab(tabId, pushHash = true) {
    if (!tabId) tabId = "tabEvent";

    tabBtns.forEach(b => {
      if (b.getAttribute("data-tab") === tabId) b.classList.add("active");
      else b.classList.remove("active");
    });

    tabPanes.forEach(p => {
      if (p.id === tabId) p.classList.add("active");
      else p.classList.remove("active");
    });

    if (pushHash && window.location.hash !== `#${tabId}`) {
      history.replaceState(null, "", `#${tabId}`);
    }

    if (!loadedTabs.has(tabId)) {
      loadedTabs.add(tabId);
      switch (tabId) {
        case "tabEvent":
          initAnnualFeeForm();
          renderAdminEvents();
          break;
        case "tabBroadcast":
          initBroadcastControls();
          break;
        case "tabGallery":
          renderAdminGalleryFolders();
          break;
        case "tabNews":
          renderAdminNews();
          break;
        case "tabHighlights":
          renderAdminHighlights();
          break;
        case "tabOfficials":
          renderAdminOfficials();
          break;
        default:
          break;
      }
    }
  }

  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-tab");
      activateAdminTab(targetId, true);
    });
  });

  window.addEventListener("hashchange", () => {
    const hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
      activateAdminTab(hash, false);
    }
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

  function getAdminApiBaseUrl() {
    if (window.ENV_CONFIG && window.ENV_CONFIG.backendUrl) {
      return window.ENV_CONFIG.backendUrl;
    }
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocal) {
      return 'http://localhost:3001';
    }
    return window.PRODUCTION_API_URL || 'https://rsam-whatsapp-bot.onrender.com';
  }

  // 5. Cloudinary Image Upload Helper
  function uploadToCloudinary(fileInputEl, targetUrlInputEl, folder = "rsam_website/events") {
    return new Promise((resolve) => {
      const file = (fileInputEl && fileInputEl.files && fileInputEl.files[0]) ? fileInputEl.files[0] : (fileInputEl instanceof File ? fileInputEl : null);
      if (!file) {
        alert("Please select an image file first.");
        return resolve(false);
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Data = e.target.result;
        const baseUrl = getAdminApiBaseUrl();
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

          const rawText = await res.text();
          let data = null;
          try {
            data = JSON.parse(rawText);
          } catch (parseErr) {
            throw new Error(`Server returned non-JSON response (${res.status}). The upload server may be starting up on Render, please try again in a few seconds.`);
          }

          if (data && data.success && data.url) {
            if (targetUrlInputEl) targetUrlInputEl.value = data.url;
            notify("✓ Image uploaded to Cloudinary successfully!", "success");
            resolve(true);
          } else {
            alert("Cloudinary upload failed: " + ((data && data.error) || "Unknown error"));
            resolve(false);
          }
        } catch (err) {
          console.error("Cloudinary upload fetch error:", err);
          alert("Could not connect to Cloudinary upload server: " + err.message);
          resolve(false);
        }
      };
      reader.readAsDataURL(file);
    });
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


  // ── Annual Athlete Registration Fee Control ──
  function getAnnualFeeConfig() {
    const saved = localStorage.getItem("RSAM_ADMIN_FEE_CONFIG");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return {
      baseFee: 10.00,
      gatewayPercent: 2.0,
      gstPercent: 18.0,
      totalPayable: 10.24
    };
  }

  function initAnnualFeeForm() {
    const form = document.getElementById("annualFeeForm");
    const baseInput = document.getElementById("mAnnBaseFee");
    const gwInput = document.getElementById("mAnnGwPct");
    const gstInput = document.getElementById("mAnnGstPct");
    const previewEl = document.getElementById("annFeeTotalPreview");
    if (!form || !baseInput || !gwInput || !gstInput || !previewEl) return;

    const currentCfg = getAnnualFeeConfig();
    baseInput.value = currentCfg.baseFee;
    gwInput.value = currentCfg.gatewayPercent;
    gstInput.value = currentCfg.gstPercent;

    function updatePreview() {
      const base = parseFloat(baseInput.value) || 0;
      const gwPct = parseFloat(gwInput.value) || 0;
      const gstPct = parseFloat(gstInput.value) || 0;

      const gwFee = parseFloat(((base * gwPct) / 100).toFixed(2));
      const gstFee = parseFloat(((gwFee * gstPct) / 100).toFixed(2));
      const total = parseFloat((base + gwFee + gstFee).toFixed(2));

      previewEl.textContent = `₹${total.toFixed(2)}`;
      return { base, gwPct, gstPct, gwFee, gstFee, total };
    }

    baseInput.oninput = updatePreview;
    gwInput.oninput = updatePreview;
    gstInput.oninput = updatePreview;
    updatePreview();

    form.onsubmit = (e) => {
      e.preventDefault();
      const calc = updatePreview();
      const cfg = {
        baseFee: calc.base,
        gatewayPercent: calc.gwPct,
        gstPercent: calc.gstPct,
        gatewayFee: calc.gwFee,
        gstFee: calc.gstFee,
        totalPayable: calc.total
      };
      localStorage.setItem("RSAM_ADMIN_FEE_CONFIG", JSON.stringify(cfg));
      notify("✓ Annual Athlete Registration Fee updated!");
    };
  }

  function updateAdminTabBadges() {
    const bEv = document.getElementById("badgeEvents");
    const bGal = document.getElementById("badgeGallery");
    const bNews = document.getElementById("badgeNews");
    const bHl = document.getElementById("badgeHighlights");
    const bOff = document.getElementById("badgeOfficials");

    if (bEv) bEv.textContent = getAdminEvents().length;
    if (bGal) bGal.textContent = getAdminGalleryFolders().length;
    if (bNews) bNews.textContent = getAdminNews().length;
    if (bHl) bHl.textContent = getAdminHighlights().length;
    if (bOff) bOff.textContent = getAdminOfficials().length;
  }

  // 7. Initialize Dashboard Renderers (Lazy Tabular Navigation)
  function initDashboard() {
    snapshotSessionBaseline();
    updateAdminTabBadges();
    const initialHash = window.location.hash.slice(1);
    const targetTab = (initialHash && document.getElementById(initialHash)) ? initialHash : "tabEvent";
    activateAdminTab(targetTab, false);
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
      const isArchived = !!ev.archived;
      const statusBadge = isArchived
        ? `<span class="badge-status" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#fbbf24;">📦 Archived</span>`
        : `<span class="badge-status ${status.cls}">${status.label}</span>`;

      return `
        <div class="admin-item-card" style="display:flex; align-items:center; gap:1rem;">
          <img src="${imgSrc}" alt="${ev.title}" style="width:65px; height:65px; border-radius:10px; object-fit:cover; border:1px solid rgba(255,255,255,0.15); flex-shrink:0;" onerror="this.src='https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png'" />
          <div class="admin-item-info" style="flex:1;">
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.4rem;">
              <span class="admin-item-title" style="margin:0;">${ev.title}</span>
              ${statusBadge}
              ${ev.showOnTicker ? `<span class="badge-ticker">Show on Ticker</span>` : ''}
              ${ev.isRegistrationActive ? `<span class="badge-active-reg">Active Online Reg</span>` : ''}
            </div>
            <div class="admin-item-sub">
              Date: ${ev.date} · Venue: ${ev.location} · Base Fee: <strong>₹${base.toFixed(2)}</strong> ${ev.feeType === 'organizer' ? '<span style="color:#fbbf24;">(Pay to Organizer)</span>' : `(Total Payable: <strong style="color:#f59e0b;">₹${total.toFixed(2)}</strong>)`}
            </div>
            ${(ev.description || ev.body) ? `<div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${(ev.description || ev.body).slice(0, 120)}...</div>` : ''}
          </div>
          <div class="admin-item-actions">
            <button type="button" class="btn-item-archive" onclick="toggleArchiveEvent(${idx})" title="${isArchived ? 'Enable Event' : 'Archive Event'}"><i class="fa-solid ${isArchived ? 'fa-rotate-left' : 'fa-box-archive'}"></i></button>
            <button type="button" class="btn-item-edit" onclick="toggleEventTicker(${idx})" title="${ev.showOnTicker ? 'Hide from Ticker' : 'Show on Ticker'}"><i class="fa-solid fa-bullhorn"></i></button>
            <button type="button" class="btn-item-edit" onclick="setEventActiveReg(${idx})" title="Set as Active Event for Online Registration"><i class="fa-solid fa-bullseye"></i></button>
            <button type="button" class="btn-item-edit" onclick="editEventItem(${idx})" title="Edit Event Details"><i class="fa-solid fa-pen-to-square"></i></button>
            <button type="button" class="btn-item-delete" onclick="deleteEventItem(${idx})" title="Delete Event"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.toggleArchiveEvent = function(idx) {
    const events = getAdminEvents();
    if (events[idx]) {
      events[idx].archived = !events[idx].archived;
      localStorage.setItem("RSAM_ADMIN_EVENTS", JSON.stringify(events));
      renderAdminEvents();
      notify(events[idx].archived ? `📦 ${events[idx].title} archived (hidden from website).` : `🟢 ${events[idx].title} re-activated!`);
    }
  };

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

    const activeCount = items.filter(n => !n.archived).length;
    const archivedCount = items.filter(n => n.archived).length;

    const summaryHTML = `
      <div class="news-summary-bar" style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.1); border-radius:10px; padding:0.7rem 1.2rem; margin-bottom:1.2rem; display:flex; gap:1.5rem; color:#d1d5db; font-size:0.92rem; align-items:center;">
        <span>Active Circulars: <strong style="color:#34d399; font-size:1rem;">${activeCount}</strong></span>
        <span style="color:rgba(255,255,255,0.2);">|</span>
        <span>Archived Circulars: <strong style="color:#f59e0b; font-size:1rem;">${archivedCount}</strong></span>
      </div>
    `;

    const cardsHTML = items.map((item, idx) => {
      const isArchived = !!item.archived;
      const statusBadge = isArchived
        ? `<span class="badge-status" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#fbbf24;">📦 Archived</span>`
        : `<span class="badge-status status-live">🟢 Active</span>`;

      return `
        <div class="admin-item-card">
          <div class="admin-item-info">
            <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap; margin-bottom:0.4rem;">
              <span class="admin-item-title" style="margin:0;">${item.title}</span>
              ${statusBadge}
            </div>
            <div class="admin-item-sub">📅 ${item.date} ${item.location ? '· 📍 ' + item.location : ''} · Tag: <span style="color:#f59e0b;">${item.tag}</span></div>
            <div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${(item.body || '').replace(/<[^>]*>?/gm, '').slice(0, 120)}...</div>
          </div>
          <div class="admin-item-actions">
            <button type="button" class="btn-item-archive" onclick="toggleArchiveNews(${idx})" title="${isArchived ? 'Unarchive Circular' : 'Archive Circular'}"><i class="fa-solid ${isArchived ? 'fa-rotate-left' : 'fa-box-archive'}"></i></button>
            <button type="button" class="btn-item-edit" onclick="editNewsItem(${idx})" title="Edit Circular"><i class="fa-solid fa-pen-to-square"></i></button>
            <button type="button" class="btn-item-delete" onclick="deleteNewsItem(${idx})" title="Delete Circular"><i class="fa-solid fa-trash-can"></i></button>
          </div>
        </div>
      `;
    }).join("");

    container.innerHTML = summaryHTML + cardsHTML;
  }

  window.toggleArchiveNews = function(idx) {
    const items = getAdminNews();
    if (!items[idx]) return;
    items[idx].archived = !items[idx].archived;
    const newsStr = JSON.stringify(items);
    localStorage.setItem("RSAM_ADMIN_NEWS", newsStr);
    updateSessionBaselineKey("news", newsStr);
    renderAdminNews();
    notify(items[idx].archived ? "📦 Circular archived (hidden from website)." : "🟢 Circular re-activated!");
  };

  window.deleteNewsItem = function(idx) {
    if (!confirm("Are you sure you want to delete this circular?")) return;
    const items = getAdminNews();
    items.splice(idx, 1);
    const newsStr = JSON.stringify(items);
    localStorage.setItem("RSAM_ADMIN_NEWS", newsStr);
    updateSessionBaselineKey("news", newsStr);
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
            <button type="button" class="btn-item-archive" onclick="toggleHlArchive(${idx})" title="${isArchived ? 'Unarchive Highlight' : 'Archive Highlight'}"><i class="fa-solid ${isArchived ? 'fa-rotate-left' : 'fa-box-archive'}"></i></button>
            <button type="button" class="btn-item-edit" onclick="editHlItem(${idx})" title="Edit Highlight"><i class="fa-solid fa-pen-to-square"></i></button>
            <button type="button" class="btn-item-delete" onclick="deleteHlItem(${idx})" title="Delete Highlight"><i class="fa-solid fa-trash-can"></i></button>
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
            <button type="button" class="btn-item-up" onclick="moveOfficialUp(${idx})" title="Move Up in Lineup" ${idx === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} aria-label="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
            <button type="button" class="btn-item-down" onclick="moveOfficialDown(${idx})" title="Move Down in Lineup" ${idx === items.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} aria-label="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
            <button type="button" class="btn-item-edit" onclick="editOfficialItem(${idx})" title="Edit Official Details"><i class="fa-solid fa-pen-to-square"></i></button>
            <button type="button" class="btn-item-delete" onclick="deleteOfficialItem(${idx})" title="Delete Official"><i class="fa-solid fa-trash-can"></i></button>
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

  // ── Annual Registration Fee Control ──
  function getAnnualFeeConfig() {
    const saved = localStorage.getItem("RSAM_ADMIN_FEE_CONFIG");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return { baseFee: 10.00, gatewayPercent: 2.0, gstPercent: 18.0 };
  }

  function initAnnualFeeForm() {
    const feeConfig = getAnnualFeeConfig();
    const baseInput = document.getElementById("mAnnBaseFee");
    const gwInput   = document.getElementById("mAnnGwPct");
    const gstInput  = document.getElementById("mAnnGstPct");
    const previewEl = document.getElementById("annFeeTotalPreview");
    const form      = document.getElementById("annualFeeForm");

    if (!baseInput || !form) return;

    baseInput.value = feeConfig.baseFee || 10;
    gwInput.value   = feeConfig.gatewayPercent || 2.0;
    gstInput.value  = feeConfig.gstPercent || 18.0;

    function updatePreview() {
      const base = parseFloat(baseInput.value) || 0;
      const gw   = parseFloat(((base * (parseFloat(gwInput.value) || 2.0)) / 100).toFixed(2));
      const gst  = parseFloat(((gw * (parseFloat(gstInput.value) || 18.0)) / 100).toFixed(2));
      const total = parseFloat((base + gw + gst).toFixed(2));
      if (previewEl) previewEl.textContent = `₹${total.toFixed(2)}`;
    }

    baseInput.oninput = updatePreview;
    gwInput.oninput   = updatePreview;
    gstInput.oninput  = updatePreview;
    updatePreview();

    form.onsubmit = (e) => {
      e.preventDefault();
      const newConfig = {
        baseFee: parseFloat(baseInput.value) || 10,
        gatewayPercent: parseFloat(gwInput.value) || 2.0,
        gstPercent: parseFloat(gstInput.value) || 18.0
      };
      localStorage.setItem("RSAM_ADMIN_FEE_CONFIG", JSON.stringify(newConfig));
      notify("✓ Annual athlete registration fee settings saved!");
    };
  }

  // ── Bulk WhatsApp Broadcast Center ──
  let fetchedBroadcastData = null;

  function updateBroadcastSourceDropdown() {
    const sourceSelect = document.getElementById("bcSourceSelect");
    if (!sourceSelect || !fetchedBroadcastData || !fetchedBroadcastData.length) return;

    const currentVal = sourceSelect.value;
    let optionsHTML = '';

    fetchedBroadcastData.forEach((s) => {
      const isReg = s.sheetName.toLowerCase().includes("registrations");
      const icon = isReg ? '🔄' : '🎟️';
      const label = isReg ? `Annual Skater Registrations (${s.sheetName})` : `Event Specific (${s.sheetName})`;
      optionsHTML += `<option value="sheet:${s.sheetName}">${icon} ${label} [${s.count} records]</option>`;
    });

    optionsHTML += `<option value="general">📢 General Broadcast (All Unique Contacts across all sheets)</option>`;

    sourceSelect.innerHTML = optionsHTML;
    if (currentVal && sourceSelect.querySelector(`option[value="${currentVal}"]`)) {
      sourceSelect.value = currentVal;
    }
  }

  async function checkWaBotStatus() {
    const badge = document.getElementById("waBotStatusBadge");
    const baseUrl = getAdminApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/bot-status`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.isConnected) {
          if (badge) {
            badge.textContent = "🟢 Bot Connected & Ready";
            badge.style.background = "rgba(16, 185, 129, 0.2)";
            badge.style.color = "#34d399";
          }
          return { isConnected: true };
        } else {
          if (badge) {
            badge.textContent = "🔴 Bot Offline (Scan QR)";
            badge.style.background = "rgba(239, 68, 68, 0.2)";
            badge.style.color = "#f87171";
          }
          return { isConnected: false, qrDataUrl: data ? data.qrDataUrl : null };
        }
      }
    } catch (e) {}

    if (badge) {
      badge.textContent = "⚠️ Bot Server Standby";
      badge.style.background = "rgba(245, 158, 11, 0.2)";
      badge.style.color = "#fbbf24";
    }
    return { isConnected: false };
  }

  async function fetchBroadcastContacts() {
    const listEl = document.getElementById("bcRecipientList");
    const btn = document.getElementById("fetchRecipientsBtn");

    if (btn) btn.disabled = true;
    if (listEl) listEl.innerHTML = `<p style="color:#60a5fa; text-align:center; padding:1rem;">⏳ Fetching records from Google Sheet...</p>`;

    const baseUrl = getAdminApiBaseUrl();
    let fetched = false;

    // 1. Try Express backend API
    try {
      const res = await fetch(`${baseUrl}/api/fetch-contacts`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === "ok" && Array.isArray(data.sheets) && data.sheets.length > 0) {
          fetchedBroadcastData = data.sheets;
          fetched = true;
          notify("✓ Contact records loaded from Google Sheet backend successfully!");
        }
      }
    } catch (e) {
      console.warn("Backend contact fetch error:", e);
    }

    // 2. If backend API unavailable, try direct Apps Script Web App URL
    if (!fetched) {
      try {
        const sheetUrl = (window.ENV_CONFIG && window.ENV_CONFIG.sheetUrl) || "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
        const res = await fetch(`${sheetUrl}?action=fetch_all_contacts`);
        if (res.ok) {
          const data = await res.json();
          if (data && (data.sheets || (data.status === "ok" && data.sheets))) {
            fetchedBroadcastData = data.sheets;
            fetched = true;
            notify("✓ Contact records loaded directly from Google Sheet!");
          }
        }
      } catch (e) {
        console.warn("Direct Google Sheet fetch error:", e);
      }
    }

    // Strict check: No fallback to local storage or fake sample records
    if (!fetched || !fetchedBroadcastData || !fetchedBroadcastData.length) {
      fetchedBroadcastData = [];
      if (listEl) {
        listEl.innerHTML = `<p style="color:#f87171; text-align:center; padding:1.2rem; background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.25); border-radius:8px;">⚠️ Could not fetch contact records from Google Sheet. Please verify your internet connection or Google Apps Script deployment URL.</p>`;
      }
      notify("⚠️ Unable to fetch contact records from Google Sheet.", "error");
    }

    if (btn) btn.disabled = false;
    updateBroadcastSourceDropdown();
    renderRecipientPreviewList();
  }

  function getFilteredRecipients() {
    if (!fetchedBroadcastData || !fetchedBroadcastData.length) return [];

    const sourceSelect = document.getElementById("bcSourceSelect");
    const source = sourceSelect ? sourceSelect.value : "general";
    const includeSkaters = document.getElementById("bcFilterSkaters") ? document.getElementById("bcFilterSkaters").checked : true;
    const includeCoaches = document.getElementById("bcFilterCoaches") ? document.getElementById("bcFilterCoaches").checked : true;

    let records = [];

    if (source.startsWith("sheet:")) {
      const sheetName = source.replace("sheet:", "");
      const matchedSheet = fetchedBroadcastData.find(s => s.sheetName === sheetName);
      if (matchedSheet) records = matchedSheet.records || [];
    } else if (source === "annual") {
      const annSheet = fetchedBroadcastData.find(s => s.sheetName.toLowerCase().includes("registrations")) || fetchedBroadcastData[0];
      if (annSheet) records = annSheet.records || [];
    } else if (source === "event") {
      const evtSheet = fetchedBroadcastData.find(s => !s.sheetName.toLowerCase().includes("registrations")) || fetchedBroadcastData[0];
      if (evtSheet) records = evtSheet.records || [];
    } else {
      // General Broadcast: All unique contacts across all worksheets
      fetchedBroadcastData.forEach(s => {
        records = records.concat(s.records || []);
      });
    }

    const recipients = [];
    const seenMobiles = new Set();

    records.forEach(r => {
      const skaterMob = String(r.mobile || "").replace(/\D/g, "").slice(-10);
      if (includeSkaters && skaterMob.length === 10) {
        if (!seenMobiles.has(skaterMob)) {
          seenMobiles.add(skaterMob);
          recipients.push({
            role: "Skater",
            name: r.skaterName || "Athlete",
            mobile: skaterMob,
            data: r
          });
        }
      }

      const coachMob = String(r.coachMobile || "").replace(/\D/g, "").slice(-10);
      if (includeCoaches && coachMob.length === 10) {
        if (!seenMobiles.has(coachMob)) {
          seenMobiles.add(coachMob);
          recipients.push({
            role: "Coach",
            name: r.coachName || "Coach",
            mobile: coachMob,
            data: r
          });
        }
      }
    });

    return recipients;
  }

  function renderRecipientPreviewList() {
    const listEl = document.getElementById("bcRecipientList");
    const countEl = document.getElementById("bcSelectedCount");
    if (!listEl) return;

    const recipients = getFilteredRecipients();
    if (countEl) countEl.textContent = recipients.length;

    if (!recipients.length) {
      listEl.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1rem;">Click "Fetch &amp; Preview Recipient List" to load recipient contacts from Google Sheet.</p>`;
      return;
    }

    listEl.innerHTML = `
      <table style="width:100%; border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.15); color:#9ca3af; font-size:0.8rem;">
            <th style="padding:0.4rem;">Role</th>
            <th style="padding:0.4rem;">Name</th>
            <th style="padding:0.4rem;">Mobile</th>
            <th style="padding:0.4rem;">Reg No</th>
            <th style="padding:0.4rem;">Discipline</th>
          </tr>
        </thead>
        <tbody>
          ${recipients.map(r => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
              <td style="padding:0.35rem;"><span style="background:${r.role === 'Coach' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}; color:${r.role === 'Coach' ? '#fbbf24' : '#60a5fa'}; padding:2px 6px; border-radius:4px; font-size:0.75rem;">${r.role}</span></td>
              <td style="padding:0.35rem;"><strong>${r.name}</strong></td>
              <td style="padding:0.35rem;"><code>${r.mobile}</code></td>
              <td style="padding:0.35rem; color:#f59e0b;">${r.data.regNumber || '—'}</td>
              <td style="padding:0.35rem;">${r.data.discipline || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function initBroadcastControls() {
    const fetchBtn = document.getElementById("fetchRecipientsBtn");
    const sourceSelect = document.getElementById("bcSourceSelect");
    const filterSkaters = document.getElementById("bcFilterSkaters");
    const filterCoaches = document.getElementById("bcFilterCoaches");
    const varButtons = document.querySelectorAll("#bcVarButtons .btn-var-tag");
    const msgText = document.getElementById("bcMessageText");
    const sendBtn = document.getElementById("sendBroadcastBtn");

    const btnOpenWaQrModal = document.getElementById("btnOpenWaQrModal");
    const waQrModal = document.getElementById("waQrModal");
    const waQrModalClose = document.getElementById("waQrModalClose");
    const refreshWaQrBtn = document.getElementById("refreshWaQrBtn");
    const waQrStatusText = document.getElementById("waQrStatusText");
    const waQrImgWrap = document.getElementById("waQrImgWrap");

    async function loadQrModalData() {
      if (waQrStatusText) waQrStatusText.textContent = "⏳ Checking WhatsApp bot connection...";
      if (waQrImgWrap) waQrImgWrap.innerHTML = `<p style="color:#4b5563; font-size:0.9rem; padding-top:100px;">Loading QR Code...</p>`;

      const status = await checkWaBotStatus();
      if (status.isConnected) {
        if (waQrStatusText) waQrStatusText.innerHTML = `<strong style="color:#10b981;">✅ WhatsApp Bot is Active &amp; Connected!</strong>`;
        if (waQrImgWrap) waQrImgWrap.innerHTML = `<div style="padding:40px; color:#10b981; font-weight:700; font-size:1.1rem;">✅ Connected to WhatsApp Web</div>`;
      } else {
        const baseUrl = getAdminApiBaseUrl();
        if (waQrStatusText) waQrStatusText.textContent = "📱 Scan this QR Code on WhatsApp (Linked Devices):";
        if (waQrImgWrap) {
          waQrImgWrap.innerHTML = `<iframe src="${baseUrl}/qr" style="width:300px; height:320px; border:none; border-radius:8px;"></iframe>`;
        }
      }
    }

    if (btnOpenWaQrModal) {
      btnOpenWaQrModal.onclick = () => {
        if (waQrModal) waQrModal.hidden = false;
        loadQrModalData();
      };
    }
    if (waQrModalClose) {
      waQrModalClose.onclick = () => {
        if (waQrModal) waQrModal.hidden = true;
      };
    }
    if (refreshWaQrBtn) {
      refreshWaQrBtn.onclick = loadQrModalData;
    }

    checkWaBotStatus();

    if (fetchBtn) fetchBtn.onclick = fetchBroadcastContacts;
    if (sourceSelect) sourceSelect.onchange = renderRecipientPreviewList;
    if (filterSkaters) filterSkaters.onchange = renderRecipientPreviewList;
    if (filterCoaches) filterCoaches.onchange = renderRecipientPreviewList;

    varButtons.forEach(btn => {
      btn.onclick = () => {
        const varName = btn.dataset.var;
        if (!msgText) return;
        const start = msgText.selectionStart;
        const end = msgText.selectionEnd;
        const text = msgText.value;
        msgText.value = text.substring(0, start) + varName + text.substring(end);
        msgText.focus();
        msgText.selectionStart = msgText.selectionEnd = start + varName.length;
      };
    });

    if (sendBtn) {
      sendBtn.onclick = async () => {
        const recipients = getFilteredRecipients();
        const rawTemplate = (msgText ? msgText.value : "").trim();
        const imageUrl = (document.getElementById("bcImageUrl") ? document.getElementById("bcImageUrl").value : "").trim();

        if (!recipients.length) {
          alert("Please fetch and select at least one recipient.");
          return;
        }
        if (!rawTemplate) {
          alert("Please compose a broadcast message.");
          return;
        }

        // Verify bot connection before launching broadcast
        const botStatus = await checkWaBotStatus();
        if (!botStatus.isConnected) {
          const proceedAnyway = confirm("⚠️ Warning: WhatsApp Bot appears offline or disconnected.\n\nWould you like to open the QR scanner modal to link your WhatsApp account before sending?");
          if (proceedAnyway) {
            if (waQrModal) waQrModal.hidden = false;
            loadQrModalData();
            return;
          }
        }

        if (!confirm(`Are you sure you want to send this WhatsApp broadcast to ${recipients.length} recipients?`)) {
          return;
        }

        sendBtn.disabled = true;
        const progressBox = document.getElementById("bcProgressBox");
        const progressStatus = document.getElementById("bcProgressStatus");
        const progressBar = document.getElementById("bcProgressBar");

        if (progressBox) progressBox.hidden = false;

        let sentCount = 0;
        let failCount = 0;
        let lastErrorMsg = "";
        const baseUrl = getAdminApiBaseUrl();

        for (let i = 0; i < recipients.length; i++) {
          const r = recipients[i];
          const pct = Math.round(((i + 1) / recipients.length) * 100);

          if (progressStatus) progressStatus.textContent = `Sending ${i + 1} of ${recipients.length}: ${r.name} (${r.mobile})...`;
          if (progressBar) progressBar.style.width = `${pct}%`;

          let parsedMsg = rawTemplate
            .replace(/{skaterName}/g, r.data.skaterName || r.name)
            .replace(/{regNumber}/g, r.data.regNumber || 'N/A')
            .replace(/{discipline}/g, r.data.discipline || 'N/A')
            .replace(/{coachName}/g, r.data.coachName || 'N/A')
            .replace(/{coachMobile}/g, r.data.coachMobile || 'N/A')
            .replace(/{dob}/g, r.data.dob || 'N/A')
            .replace(/{ageGroup}/g, r.data.ageGroup || 'N/A')
            .replace(/{schoolClub}/g, r.data.schoolClub || 'N/A')
            .replace(/{mobile}/g, r.mobile)
            .replace(/{email}/g, r.data.email || 'N/A')
            .replace(/{aadhaar}/g, r.data.aadhaar || 'N/A');

          try {
            const apiKey = (window.ENV_CONFIG && window.ENV_CONFIG.apiKey) || "rsam_whatsapp_secret_key_2026";
            const res = await fetch(`${baseUrl}/api/send-custom-whatsapp`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": apiKey
              },
              body: JSON.stringify({
                mobile: r.mobile,
                message: parsedMsg,
                imageUrl: imageUrl
              })
            });
            const resData = await res.json();
            if (res.ok && resData && resData.success) {
              sentCount++;
            } else {
              failCount++;
              lastErrorMsg = (resData && resData.error) || `HTTP Error ${res.status}`;
            }
          } catch (err) {
            failCount++;
            lastErrorMsg = err.message;
          }

          await new Promise(res => setTimeout(res, 800));
        }

        const failSuffix = lastErrorMsg ? ` (Last Error: ${lastErrorMsg})` : '';
        if (progressStatus) progressStatus.textContent = `✓ Broadcast complete! ${sentCount} sent, ${failCount} failed.${failSuffix}`;
        notify(`🚀 WhatsApp Broadcast finished! ${sentCount} sent, ${failCount} failed.${failSuffix}`);
        sendBtn.disabled = false;
      };
    }
  }

  // ── Photo Gallery Folders Metadata Control ──
  function getAdminGalleryFolders() {
    const saved = localStorage.getItem("RSAM_ADMIN_GALLERY_FOLDERS");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        folderId: "lko_uprsa_7th_2026",
        cloudinarySubfolder: "rsam_website/gallery/lko_uprsa_7th_2026",
        title: "7th UP Open State Championship",
        date: "July 19, 2026",
        location: "Central Academy, Lucknow",
        category: "State Championship",
        description: "Speed skaters from Moradabad claiming 5 Gold and 8 Silver medals."
      },
      {
        folderId: "dmr_hospital_2026",
        cloudinarySubfolder: "rsam_website/gallery/dmr_hospital_2026",
        title: "Moradabad Skaters Felicitation at DMR Hospital",
        date: "August 2026",
        location: "DMR Hospital, Moradabad",
        category: "Felicitation",
        description: "Special felicitation ceremony hosted at DMR Hospital honoring state championship medalists."
      },
      {
        folderId: "felicitaion_ceremony_dmr_2026",
        cloudinarySubfolder: "rsam_website/gallery/felicitaion_ceremony_dmr_2026",
        title: "Felicitation Ceremony Moradabad",
        date: "April 18, 2026",
        location: "Moradabad",
        category: "Felicitation",
        description: "Honoring RSAM athletes for outstanding sportsmanship and track achievements."
      }
    ];
  }

  function renderAdminGalleryFolders() {
    const folders = getAdminGalleryFolders();
    const container = document.getElementById("galleryAdminList");
    if (!container) return;

    if (!folders.length) {
      container.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1.5rem;">No gallery folders found. Click "+ Add New Gallery Folder" to create one.</p>`;
      return;
    }

    container.innerHTML = folders.map((f, idx) => `
      <div class="admin-item-card" style="margin-bottom:1rem;">
        <div class="admin-item-info">
          <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem;">
            <span class="admin-item-title">${f.title}</span>
            <span class="badge-status status-live">${f.category || 'Gallery'}</span>
          </div>
          <div class="admin-item-sub">📅 ${f.date} · 📍 ${f.location} · Cloudinary Folder ID: <code style="font-weight:700; color:#38bdf8;">${f.folderId}</code></div>
          <div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${f.description}</div>
        </div>
        <div class="admin-item-actions">
          <button type="button" class="btn-item-edit" onclick="editGalleryFolderItem(${idx})">✏️ Edit Metadata &amp; Folder ID</button>
          <button type="button" class="btn-item-delete" onclick="deleteGalleryFolderItem(${idx})">🗑️ Delete</button>
        </div>
      </div>
    `).join("");
  }

  const refreshGalleryBtn = document.getElementById("refreshGalleryFoldersBtn");
  if (refreshGalleryBtn) {
    refreshGalleryBtn.onclick = () => {
      renderAdminGalleryFolders();
      notify("✓ Gallery folders refreshed.");
    };
  }

  const addGalleryBtn = document.getElementById("addGalleryFolderBtn");
  if (addGalleryBtn) {
    addGalleryBtn.onclick = () => {
      activeModalType = "galleryFolder";
      activeModalIdx = null;
      itemModalTitle.textContent = "Add New Photo Gallery Folder";
      itemModalFields.innerHTML = `
        <div class="form-group"><label>Cloudinary Folder ID / Subfolder Path</label><input type="text" id="mGalFolderId" placeholder="e.g. district_championship_2026 or rsam_website/events/district2026" required /></div>
        <div class="form-group"><label>Folder Title</label><input type="text" id="mGalTitle" placeholder="e.g. 4th District Championship 2026 Photos" required /></div>
        <div class="form-row">
          <div class="form-group"><label>Category</label><input type="text" id="mGalCat" value="District Championship" required /></div>
          <div class="form-group"><label>Event Date</label><input type="text" id="mGalDate" placeholder="e.g. Sept 2026" required /></div>
        </div>
        <div class="form-group"><label>Location</label><input type="text" id="mGalLoc" placeholder="e.g. Moradabad Sports Complex" required /></div>
        <div class="form-group"><label>Description</label><textarea id="mGalDesc" rows="3" placeholder="Description of event photos..." required></textarea></div>
      `;
      itemModal.hidden = false;
    };
  }

  async function persistAdminGalleryFolders(folders) {
    localStorage.setItem("RSAM_ADMIN_GALLERY_FOLDERS", JSON.stringify(folders));
    const baseUrl = getAdminApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/save-gallery-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folders })
      });
      if (res.ok) {
        notify("✓ Gallery folders saved globally for all website users!");
      }
    } catch (e) {
      console.warn("Backend save gallery config warning:", e);
    }
  }

  window.editGalleryFolderItem = function(idx) {
    const folders = getAdminGalleryFolders();
    const f = folders[idx];
    if (!f) return;

    activeModalType = "galleryFolder";
    activeModalIdx = idx;
    itemModalTitle.textContent = "Edit Photo Gallery Folder Metadata & Folder ID";
    itemModalFields.innerHTML = `
      <div class="form-group"><label>Cloudinary Folder ID / Subfolder Path</label><input type="text" id="mGalFolderId" value="${f.folderId || ''}" required placeholder="e.g. district_championship_2026" /></div>
      <div class="form-group"><label>Folder Title</label><input type="text" id="mGalTitle" value="${f.title || ''}" required /></div>
      <div class="form-row">
        <div class="form-group"><label>Category</label><input type="text" id="mGalCat" value="${f.category || 'Championship'}" required /></div>
        <div class="form-group"><label>Event Date</label><input type="text" id="mGalDate" value="${f.date || ''}" required /></div>
      </div>
      <div class="form-group"><label>Location</label><input type="text" id="mGalLoc" value="${f.location || ''}" required /></div>
      <div class="form-group"><label>Description</label><textarea id="mGalDesc" rows="3" required>${f.description || ''}</textarea></div>
    `;
    itemModal.hidden = false;
  };

  window.deleteGalleryFolderItem = function(idx) {
    if (!confirm("Are you sure you want to delete this photo gallery folder?")) return;
    const folders = getAdminGalleryFolders();
    folders.splice(idx, 1);
    persistAdminGalleryFolders(folders);
    renderAdminGalleryFolders();
    notify("✓ Photo gallery folder deleted.");
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
          <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
            <input type="checkbox" id="mEvArchived" ${ev.archived ? 'checked' : ''} />
            <span>Archive / Disable this event (Hide from website)</span>
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
        <div class="form-group" style="margin-top:0.8rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
            <input type="checkbox" id="mNewsArchived" />
            <span>Archive / Disable this circular (Hide from live website)</span>
          </label>
        </div>
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
      <div class="form-group" style="margin-top:0.8rem;">
        <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
          <input type="checkbox" id="mNewsArchived" ${item.archived ? 'checked' : ''} />
          <span>Archive / Disable this circular (Hide from live website)</span>
        </label>
      </div>
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
              const baseUrl = getAdminApiBaseUrl();
              try {
                const res = await fetch(`${baseUrl}/api/upload-cloudinary`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ image: base64Data, folder: "rsam_website/highlights", fileName: file.name })
                });
                const rawText = await res.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) {}
                if (data && data.success && data.url) {
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
          isRegistrationActive: isRegActive,
          archived: document.getElementById("mEvArchived") ? document.getElementById("mEvArchived").checked : false
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
          body: document.getElementById("mNewsBody").value.trim(),
          archived: document.getElementById("mNewsArchived") ? document.getElementById("mNewsArchived").checked : false
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
      } else if (activeModalType === "galleryFolder") {
        const folders = getAdminGalleryFolders();
        const customFolderId = document.getElementById("mGalFolderId") ? document.getElementById("mGalFolderId").value.trim() : "";
        const folderPath = customFolderId || ((activeModalIdx !== null && folders[activeModalIdx]) ? folders[activeModalIdx].folderId : "folder_" + Date.now());
        const updatedFolder = {
          folderId: folderPath,
          cloudinarySubfolder: folderPath,
          title: document.getElementById("mGalTitle").value.trim(),
          category: document.getElementById("mGalCat").value.trim(),
          date: document.getElementById("mGalDate").value.trim(),
          location: document.getElementById("mGalLoc").value.trim(),
          description: document.getElementById("mGalDesc").value.trim()
        };
        if (activeModalIdx !== null && folders[activeModalIdx]) {
          folders[activeModalIdx] = updatedFolder;
        } else {
          folders.unshift(updatedFolder);
        }
        persistAdminGalleryFolders(folders);
        renderAdminGalleryFolders();
        notify("✓ Photo Gallery Folder metadata & Folder ID updated and saved for all users!");
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

  const envBadge = document.getElementById("envModeBadge");
  if (envBadge && window.ENV_CONFIG) {
    const isDev = window.ENV_CONFIG.activeEnv === "dev";
    envBadge.textContent = isDev ? `⚡ DEV MODE (${window.ENV_CONFIG.backendUrl})` : `🌐 PROD MODE`;
    envBadge.style.background = isDev ? "rgba(224,28,46,0.2)" : "rgba(34,197,94,0.2)";
    envBadge.style.borderColor = isDev ? "rgba(224,28,46,0.5)" : "rgba(34,197,94,0.5)";
    envBadge.style.color = isDev ? "#ff8888" : "#86efac";
  }

  // Global ESC key listener to dismiss open modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      const itemModal = document.getElementById("itemModal");
      if (itemModal && !itemModal.hidden) closeModal();
    }
  });
});
