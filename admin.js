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

function parseDeadlineDate(deadline, dateText, startDT) {
  let target = deadline || startDT || dateText;
  if (!target) return null;
  target = String(target).trim();

  let d = new Date(target);
  if (!isNaN(d.getTime())) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(target)) {
      d.setHours(23, 59, 59, 999);
    }
    return d;
  }

  let cleaned = target.replace(/(\d+)(st|nd|rd|th)/gi, '$1');
  if (cleaned.includes('-')) {
    const parts = cleaned.split('-');
    cleaned = parts[parts.length - 1].trim();
  }

  d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    d.setHours(23, 59, 59, 999);
    return d;
  }
  return null;
}

function formatDeadlineForDisplay(deadlineStr, fallbackStr) {
  const val = deadlineStr || fallbackStr;
  if (!val) return 'Event Date';
  const parsed = parseDeadlineDate(val);
  if (parsed) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNum = parsed.getDate();
    let suffix = 'th';
    if (dayNum % 10 === 1 && dayNum !== 11) suffix = 'st';
    else if (dayNum % 10 === 2 && dayNum !== 12) suffix = 'nd';
    else if (dayNum % 10 === 3 && dayNum !== 13) suffix = 'rd';
    const monthStr = months[parsed.getMonth()];
    const year = parsed.getFullYear();
    
    const hasExplicitTime = typeof deadlineStr === 'string' && (deadlineStr.includes('T') || deadlineStr.includes(':'));
    if (hasExplicitTime) {
      let hours = parsed.getHours();
      const mins = String(parsed.getMinutes()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${dayNum}${suffix} ${monthStr} ${year}, ${hours}:${mins} ${ampm}`;
    }
    return `${dayNum}${suffix} ${monthStr} ${year}`;
  }
  return String(val);
}

function formatDobDdMmmYyyy(str) {
  if (!str) return "N/A";
  str = String(str).trim();
  if (!str || str === "—" || str === "N/A" || str === "null" || str === "undefined") return "N/A";

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (str.includes("GMT") || str.includes("Standard Time") || /^\w{3} \w{3} \d{1,2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, '0');
      const month = months[d.getMonth()];
      const year = d.getFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = months[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      return `${day}-${month}-${year}`;
    }
  }

  const parts = str.split(/[\/\-\.]/).map(s => s.trim());
  if (parts.length === 3) {
    let p0 = parseInt(parts[0], 10);
    let p1 = parseInt(parts[1], 10);
    let p2 = parseInt(parts[2], 10);

    if (parts[2].length === 4 && !isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
      if (p1 >= 1 && p1 <= 12 && p0 >= 1 && p0 <= 31) {
        const day = String(p0).padStart(2, '0');
        const month = months[p1 - 1];
        return `${day}-${month}-${p2}`;
      }
    }
  }

  const d = new Date(str);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, '0');
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  return str;
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
        case "tabPayments":
          renderAdminPayments();
          break;
        case "tabBroadcast":
          initBroadcastControls();
          break;
        case "tabCertificates":
          initCertificateControls();
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

  async function fetchSiteConfigInAdmin() {
    try {
      const cacheBust = `?v=${Date.now()}`;
      const localRes = await fetch(`data/site-config.json${cacheBust}`);
      if (localRes.ok) {
        const localData = await localRes.json();
        if (localData) {
          window.LIVE_SITE_CONFIG = localData;
        }
      }
      const baseUrl = getAdminApiBaseUrl();
      const apiRes = await fetch(`${baseUrl}/api/site-config${cacheBust}`);
      if (apiRes.ok) {
        const apiData = await apiRes.json();
        if (apiData && apiData.config) {
          window.LIVE_SITE_CONFIG = apiData.config;
        }
      }
    } catch(e) {
      console.warn("Error loading site config in admin:", e);
    }
  }

  let unsavedTabsSet = new Set();
  let hasUnsavedEdits = false;

  function markDraftUnsaved(categoryTag) {
    if (categoryTag) unsavedTabsSet.add(categoryTag);
    hasUnsavedEdits = true;
    const batchBar = document.getElementById("adminBatchBar");
    const batchMsg = document.getElementById("batchBarMessage");
    if (batchBar) {
      batchBar.hidden = false;
      batchBar.style.display = "flex";
      if (batchMsg) {
        const catList = Array.from(unsavedTabsSet).join(", ");
        batchMsg.innerHTML = `<strong>Draft Changes Pending (${unsavedTabsSet.size})</strong> — You have unsaved edits in <strong>${catList || 'session'}</strong>. Click "Publish & Save All Changes" when ready to push 1 single commit to GitHub & live site.`;
      }
    }
  }

  async function persistSiteConfig(partialConfig, categoryTag = null, options = {}) {
    if (!window.LIVE_SITE_CONFIG) window.LIVE_SITE_CONFIG = {};
    window.LIVE_SITE_CONFIG = {
      ...window.LIVE_SITE_CONFIG,
      ...partialConfig
    };
    if (partialConfig.fees) {
      localStorage.setItem("RSAM_ADMIN_FEE_CONFIG", JSON.stringify(partialConfig.fees));
    }
    if (partialConfig.events) {
      localStorage.setItem("RSAM_ADMIN_EVENTS", JSON.stringify(partialConfig.events));
    }
    if (partialConfig.news) {
      localStorage.setItem("RSAM_ADMIN_NEWS", JSON.stringify(partialConfig.news));
    }
    if (partialConfig.highlights) {
      localStorage.setItem("RSAM_ADMIN_HIGHLIGHTS", JSON.stringify(partialConfig.highlights));
    }
    if (partialConfig.officials) {
      localStorage.setItem("RSAM_ADMIN_OFFICIALS", JSON.stringify(partialConfig.officials));
    }
    if (partialConfig.skinsuits || partialConfig.skinsuit) {
      const sObj = Array.isArray(partialConfig.skinsuits) ? partialConfig.skinsuits[0] : (partialConfig.skinsuits || partialConfig.skinsuit);
      if (sObj) {
        localStorage.setItem("RSAM_ADMIN_SKINSUIT", JSON.stringify(sObj));
      }
    }

    if (options.isBatchPublish === true) {
      const baseUrl = getAdminApiBaseUrl();
      try {
        const res = await fetch(`${baseUrl}/api/save-site-config`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(window.LIVE_SITE_CONFIG)
        });
        const data = await res.json();
        if (res.ok && data && data.success) {
          unsavedTabsSet.clear();
          hasUnsavedEdits = false;
          const batchBar = document.getElementById("adminBatchBar");
          if (batchBar) {
            batchBar.hidden = true;
            batchBar.style.display = "none";
          }
          notify("✓ All admin changes published live & synced to GitHub in 1 single commit!", "success");
        } else {
          notify("⚠️ Saved in browser, but server sync warning: " + ((data && data.error) || "Unknown error"), "error");
        }
      } catch (e) {
        console.warn("Backend save-site-config fetch warning:", e);
        notify("⚠️ Saved in browser, but server connection warning.", "error");
      }
    } else {
      markDraftUnsaved(categoryTag);
    }
  }

  async function publishAllSiteConfigBatch() {
    const fullConfig = {
      fees: (window.LIVE_SITE_CONFIG && window.LIVE_SITE_CONFIG.fees) || {},
      events: getAdminEvents(),
      news: getAdminNews(),
      newsItems: getAdminNews(),
      highlights: getAdminHighlights(),
      officials: getAdminOfficials(),
      skinsuit: (window.LIVE_SITE_CONFIG && window.LIVE_SITE_CONFIG.skinsuit) || {},
      gallery: (window.LIVE_SITE_CONFIG && window.LIVE_SITE_CONFIG.gallery) || {},
      ticker: (window.LIVE_SITE_CONFIG && window.LIVE_SITE_CONFIG.ticker) || "🚀 Welcome to Roller Sports Association Moradabad (RSAM)...",
      lastUpdated: new Date().toISOString()
    };
    await persistSiteConfig(fullConfig, null, { isBatchPublish: true });
  }

  // 6. Data Loaders (Source of Truth: window.LIVE_SITE_CONFIG from data/site-config.json)
  function getAdminEvents() {
    if (window.LIVE_SITE_CONFIG && Array.isArray(window.LIVE_SITE_CONFIG.events) && window.LIVE_SITE_CONFIG.events.length > 0) {
      return window.LIVE_SITE_CONFIG.events;
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
        body: "Official 4th District Championship for all age groups & disciplines in Moradabad.",
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
        body: "Moradabad speeders won 5 Gold, 8 Silver and 4+ Bronze Medals at 7th UP Open-state Championship at Central Academy, Lucknow.",
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
        body: "The Great Skating Marathon 2026 organized by Agra Roller Skating Welfare Association under the aegis of UPRSA.",
        showOnTicker: true,
        isRegistrationActive: false
      }
    ];
  }

  function getAdminNews() {
    if (window.LIVE_SITE_CONFIG && Array.isArray(window.LIVE_SITE_CONFIG.news)) {
      return window.LIVE_SITE_CONFIG.news;
    }
    const newsObj = typeof NEWS !== 'undefined' ? NEWS : (window.NEWS || {});
    return newsObj.items || [];
  }

  function getAdminHighlights() {
    if (window.LIVE_SITE_CONFIG && Array.isArray(window.LIVE_SITE_CONFIG.highlights)) {
      return window.LIVE_SITE_CONFIG.highlights;
    }
    const hlObj = typeof HIGHLIGHTS !== 'undefined' ? HIGHLIGHTS : (window.HIGHLIGHTS || []);
    return Array.isArray(hlObj) ? hlObj : (hlObj.items || []);
  }

  function getAdminOfficials() {
    if (window.LIVE_SITE_CONFIG && Array.isArray(window.LIVE_SITE_CONFIG.officials)) {
      return window.LIVE_SITE_CONFIG.officials;
    }
    const offObj = typeof OFFICIALS !== 'undefined' ? OFFICIALS : (window.OFFICIALS || {});
    const assoc = offObj.association || [];
    const comm = (offObj.committee && (Array.isArray(offObj.committee) ? offObj.committee : offObj.committee.members)) || [];
    return [...assoc, ...comm];
  }

  // ── Annual Athlete Registration Fee Control ──
  function getAnnualFeeConfig() {
    if (window.LIVE_SITE_CONFIG && window.LIVE_SITE_CONFIG.fees) {
      const f = window.LIVE_SITE_CONFIG.fees;
      const baseFee = f.annualBaseFee !== undefined ? parseFloat(f.annualBaseFee) : (f.baseFee !== undefined ? parseFloat(f.baseFee) : 0.00);
      const gwPct = f.gatewayPercent !== undefined ? parseFloat(f.gatewayPercent) : 2.0;
      const gstPct = f.gstPercent !== undefined ? parseFloat(f.gstPercent) : 18.0;
      const gwFee = parseFloat(((baseFee * gwPct) / 100).toFixed(2));
      const gstFee = parseFloat(((gwFee * gstPct) / 100).toFixed(2));
      const totalPayable = parseFloat((baseFee + gwFee + gstFee).toFixed(2));
      return {
        baseFee: baseFee,
        annualBaseFee: baseFee,
        gatewayPercent: gwPct,
        gstPercent: gstPct,
        totalPayable: totalPayable
      };
    }
    return {
      baseFee: 0.00,
      annualBaseFee: 0.00,
      gatewayPercent: 2.0,
      gstPercent: 18.0,
      totalPayable: 0.00
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
    baseInput.value = currentCfg.baseFee !== undefined ? currentCfg.baseFee : 0;
    gwInput.value = currentCfg.gatewayPercent !== undefined ? currentCfg.gatewayPercent : 2.0;
    gstInput.value = currentCfg.gstPercent !== undefined ? currentCfg.gstPercent : 18.0;

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

    form.onsubmit = async (e) => {
      e.preventDefault();
      const calc = updatePreview();
      const cfg = {
        annualBaseFee: calc.base,
        baseFee: calc.base,
        gatewayPercent: calc.gwPct,
        gstPercent: calc.gstPct,
        gatewayFee: calc.gwFee,
        gstFee: calc.gstFee,
        totalPayable: calc.total
      };
      if (!window.LIVE_SITE_CONFIG) window.LIVE_SITE_CONFIG = {};
      window.LIVE_SITE_CONFIG.fees = cfg;
      await persistSiteConfig({ fees: cfg });
      notify("✓ Annual Athlete Registration Fee updated successfully!");
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
  async function initDashboard() {
    await fetchSiteConfigInAdmin();
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
              Date: ${ev.date} · Deadline: <strong style="color:#60a5fa;">${formatDeadlineForDisplay(ev.deadline, ev.date)}</strong> · Venue: ${ev.location} · Base Fee: <strong>₹${base.toFixed(2)}</strong> ${ev.feeType === 'organizer' ? '<span style="color:#fbbf24;">(Pay to Organizer)</span>' : `(Total Payable: <strong style="color:#f59e0b;">₹${total.toFixed(2)}</strong>)`}
            </div>
            ${(ev.description || ev.body) ? `<div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${(ev.description || ev.body).slice(0, 120)}...</div>` : ''}
          </div>
          <div class="admin-item-actions">
            <button type="button" class="btn-item-archive" onclick="toggleArchiveEvent(${idx})" title="${isArchived ? 'Enable Event' : 'Archive Event'}"><i class="fa-solid ${isArchived ? 'fa-rotate-left' : 'fa-box-archive'}"></i></button>
            <button type="button" class="btn-item-edit" onclick="toggleEventTicker(${idx})" title="${ev.showOnTicker ? 'Hide from Ticker' : 'Show on Ticker'}"><i class="fa-solid fa-bullhorn"></i></button>
            <button type="button" class="btn-item-edit" onclick="toggleEventActiveReg(${idx})" title="${ev.isRegistrationActive ? 'Disable Online Registration for this Event' : 'Enable Online Registration for this Event'}" style="${ev.isRegistrationActive ? 'background:rgba(16,185,129,0.25); color:#34d399; border:1px solid rgba(16,185,129,0.4);' : ''}"><i class="fa-solid fa-bullseye"></i></button>
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

  window.toggleEventActiveReg = function(idx) {
    const events = getAdminEvents();
    if (!events[idx]) return;

    const isCurrentlyActive = !!events[idx].isRegistrationActive;
    if (isCurrentlyActive) {
      events[idx].isRegistrationActive = false;
      localStorage.removeItem("RSAM_ADMIN_EVENT");
      updateSessionBaselineKey("events", JSON.stringify(events));
      persistSiteConfig({ events });
      renderAdminEvents();
      notify(`⏸️ Online registration disabled for ${events[idx].title}`);
    } else {
      events.forEach((ev, i) => {
        ev.isRegistrationActive = (i === idx);
      });
      localStorage.setItem("RSAM_ADMIN_EVENT", JSON.stringify(events[idx]));
      updateSessionBaselineKey("events", JSON.stringify(events));
      persistSiteConfig({ events });
      renderAdminEvents();
      notify(`✓ ${events[idx].title} set as Active Event for online registration!`);
    }
  };
  window.setEventActiveReg = window.toggleEventActiveReg;

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

  window.toggleArchiveNews = async function(idx) {
    const items = getAdminNews();
    if (!items[idx]) return;
    items[idx].archived = !items[idx].archived;
    await persistSiteConfig({ news: items });
    renderAdminNews();
    notify(items[idx].archived ? "📦 Circular archived (hidden from website)." : "🟢 Circular re-activated!");
  };

  window.deleteNewsItem = async function(idx) {
    if (!confirm("Are you sure you want to delete this circular?")) return;
    const items = getAdminNews();
    items.splice(idx, 1);
    await persistSiteConfig({ news: items });
    renderAdminNews();
    notify("✓ Circular deleted successfully.");
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

  window.toggleHlArchive = async function(idx) {
    const items = getAdminHighlights();
    if (items[idx]) {
      items[idx].archived = !items[idx].archived;
      await persistSiteConfig({ highlights: items });
      renderAdminHighlights();
      notify(`✓ Highlight status updated to ${items[idx].archived ? 'Archived' : 'Active'}.`);
    }
  };

  window.deleteHlItem = async function(idx) {
    if (!confirm("Are you sure you want to delete this highlight?")) return;
    const items = getAdminHighlights();
    items.splice(idx, 1);
    await persistSiteConfig({ highlights: items });
    renderAdminHighlights();
    notify("✓ Highlight deleted successfully.");
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

  window.moveOfficialUp = async function(idx) {
    const items = getAdminOfficials();
    if (idx > 0) {
      const temp = items[idx];
      items[idx] = items[idx - 1];
      items[idx - 1] = temp;
      await persistSiteConfig({ officials: items });
      renderAdminOfficials();
      notify("✓ Lineup order updated successfully!");
    }
  };

  window.moveOfficialDown = async function(idx) {
    const items = getAdminOfficials();
    if (idx < items.length - 1) {
      const temp = items[idx];
      items[idx] = items[idx + 1];
      items[idx + 1] = temp;
      await persistSiteConfig({ officials: items });
      renderAdminOfficials();
      notify("✓ Lineup order updated successfully!");
    }
  };

  window.deleteOfficialItem = async function(idx) {
    if (!confirm("Are you sure you want to delete this official?")) return;
    const items = getAdminOfficials();
    items.splice(idx, 1);
    await persistSiteConfig({ officials: items });
    renderAdminOfficials();
    notify("✓ Official deleted successfully.");
  };



  // ── Bulk WhatsApp Broadcast Center ──
  let fetchedBroadcastData = null;

  function updateBroadcastSourceDropdown() {
    const sourceSelect = document.getElementById("bcSourceSelect");
    if (!sourceSelect || !fetchedBroadcastData || !fetchedBroadcastData.length) return;

    const currentVal = sourceSelect.value;
    let optionsHTML = '';

    const evtSheets = fetchedBroadcastData.filter(s => !s.sheetName.toLowerCase().includes("registrations"));

    optionsHTML += `<optgroup label="── 📊 Direct Sheet Contacts ──">`;
    fetchedBroadcastData.forEach((s) => {
      const isReg = s.sheetName.toLowerCase().includes("registrations");
      const icon = isReg ? '🔄' : '🎟️';
      const label = isReg ? `Annual Skater Registrations (${s.sheetName})` : `Event Specific (${s.sheetName})`;
      optionsHTML += `<option value="sheet:${s.sheetName}">${icon} ${label} [${s.count} records]</option>`;
    });
    optionsHTML += `</optgroup>`;

    if (evtSheets.length > 0) {
      optionsHTML += `<optgroup label="── ⚠️ Unregistered for Event (Annual vs Event Comparison) ──">`;
      evtSheets.forEach((eSheet) => {
        optionsHTML += `<option value="unregistered:${eSheet.sheetName}">⚠️ Annually Registered (NOT Registered for ${eSheet.sheetName})</option>`;
      });
      optionsHTML += `</optgroup>`;
    }

    optionsHTML += `<optgroup label="── 📢 All Contacts ──">`;
    optionsHTML += `<option value="general">📢 General Broadcast (All Unique Contacts across all sheets)</option>`;
    optionsHTML += `</optgroup>`;

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

  function getCandidatesForCoach(coachName, coachMobile, records) {
    const cleanMob = String(coachMobile || "").replace(/\D/g, "").slice(-10);
    const cleanName = String(coachName || "").toLowerCase().trim();

    return records.filter(r => {
      const rCoachMob = String(r.coachMobile || "").replace(/\D/g, "").slice(-10);
      const rCoachName = String(r.coachName || "").toLowerCase().trim();
      if (cleanMob && cleanMob.length === 10 && rCoachMob === cleanMob) return true;
      if (cleanName && rCoachName && (rCoachName === cleanName || cleanName.includes(rCoachName) || rCoachName.includes(cleanName))) return true;
      return false;
    });
  }

  function getFilteredRecipients() {
    if (!fetchedBroadcastData || !fetchedBroadcastData.length) return [];

    const sourceSelect = document.getElementById("bcSourceSelect");
    const source = sourceSelect ? sourceSelect.value : "general";
    const includeSkaters = document.getElementById("bcFilterSkaters") ? document.getElementById("bcFilterSkaters").checked : true;
    const includeCoaches = document.getElementById("bcFilterCoaches") ? document.getElementById("bcFilterCoaches").checked : true;

    let records = [];
    let isUnregisteredFilter = false;

    if (source.startsWith("unregistered:")) {
      isUnregisteredFilter = true;
      const targetEvtSheetName = source.replace("unregistered:", "");
      const annSheet = fetchedBroadcastData.find(s => s.sheetName.toLowerCase().includes("registrations")) || fetchedBroadcastData[0];
      const evtSheet = fetchedBroadcastData.find(s => s.sheetName === targetEvtSheetName);

      const annRecords = annSheet ? (annSheet.records || []) : [];
      const evtRecords = evtSheet ? (evtSheet.records || []) : [];

      const evtRegNumbers = new Set();
      const evtMobilesAndNames = new Set();

      evtRecords.forEach(e => {
        const rsam = String(e.rsamRegNo || e.regNumber || "").trim().toUpperCase();
        if (rsam && rsam.length >= 3) {
          evtRegNumbers.add(rsam);
        }
        const mob = String(e.mobile || "").replace(/\D/g, "").slice(-10);
        const name = String(e.skaterName || e.name || "").trim().toLowerCase();
        if (mob && name) {
          evtMobilesAndNames.add(`${mob}_${name}`);
        }
      });

      records = annRecords.filter(r => {
        const rsam = String(r.regNumber || r.rsamRegNo || "").trim().toUpperCase();
        if (rsam && evtRegNumbers.has(rsam)) {
          return false;
        }
        const mob = String(r.mobile || "").replace(/\D/g, "").slice(-10);
        const name = String(r.skaterName || r.name || "").trim().toLowerCase();
        if (mob && name && evtMobilesAndNames.has(`${mob}_${name}`)) {
          return false;
        }
        return true;
      });
    } else if (source.startsWith("sheet:")) {
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
            isUnregistered: isUnregisteredFilter,
            data: r
          });
        }
      }

      const coachMob = String(r.coachMobile || "").replace(/\D/g, "").slice(-10);
      if (includeCoaches && coachMob.length === 10) {
        if (!seenMobiles.has(coachMob)) {
          seenMobiles.add(coachMob);
          const candidates = getCandidatesForCoach(r.coachName, coachMob, records);
          recipients.push({
            role: "Coach",
            name: r.coachName || "Coach",
            mobile: coachMob,
            candidates: candidates.length > 0 ? candidates : [r],
            isUnregistered: isUnregisteredFilter,
            data: r
          });
        }
      }
    });

    return recipients;
  }

  let selectedRecipientIndices = new Set();

  function resetRecipientSelection(totalCount) {
    selectedRecipientIndices = new Set();
    for (let i = 0; i < totalCount; i++) {
      selectedRecipientIndices.add(i);
    }
  }

  function updateRecipientSelectionUI() {
    const recipients = getFilteredRecipients();
    const countEl = document.getElementById("bcSelectedCount");
    if (countEl) {
      countEl.textContent = `${selectedRecipientIndices.size} of ${recipients.length}`;
    }

    const toggleBtn = document.getElementById("bcToggleAllBtn");
    if (toggleBtn && recipients.length > 0) {
      const isAllSelected = (selectedRecipientIndices.size === recipients.length);
      if (isAllSelected) {
        toggleBtn.innerHTML = `🔲 Deselect All`;
        toggleBtn.style.background = `rgba(239,68,68,0.15)`;
        toggleBtn.style.color = `#f87171`;
        toggleBtn.style.borderColor = `rgba(239,68,68,0.3)`;
      } else {
        toggleBtn.innerHTML = `☑️ Select All`;
        toggleBtn.style.background = `rgba(59,130,246,0.15)`;
        toggleBtn.style.color = `#60a5fa`;
        toggleBtn.style.borderColor = `rgba(59,130,246,0.3)`;
      }
    }
  }

  function renderRecipientPreviewList(resetSelection = false) {
    const listEl = document.getElementById("bcRecipientList");
    if (!listEl) return;

    const recipients = getFilteredRecipients();

    if (resetSelection || selectedRecipientIndices.size === 0 || selectedRecipientIndices.size > recipients.length) {
      resetRecipientSelection(recipients.length);
    }

    updateRecipientSelectionUI();

    if (!recipients.length) {
      listEl.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1rem;">Click "Fetch &amp; Preview Recipient List" to load recipient contacts from Google Sheet.</p>`;
      return;
    }

    listEl.innerHTML = `
      <table style="width:100%; border-collapse:collapse; text-align:left;">
        <thead>
          <tr style="border-bottom:1px solid rgba(255,255,255,0.15); color:#9ca3af; font-size:0.8rem;">
            <th style="padding:0.4rem; width:36px; text-align:center;">
              <input type="checkbox" id="bcSelectAllHeader" ${selectedRecipientIndices.size === recipients.length ? 'checked' : ''} style="cursor:pointer;" />
            </th>
            <th style="padding:0.4rem;">Role</th>
            <th style="padding:0.4rem;">Name</th>
            <th style="padding:0.4rem;">Mobile</th>
            <th style="padding:0.4rem;">Chest No (Event)</th>
            <th style="padding:0.4rem;">RSAM Reg No</th>
            <th style="padding:0.4rem;">Discipline</th>
          </tr>
        </thead>
        <tbody>
          ${recipients.map((r, i) => `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); ${selectedRecipientIndices.has(i) ? 'background:rgba(59,130,246,0.08);' : 'opacity:0.6;'}">
              <td style="padding:0.35rem; text-align:center;">
                <input type="checkbox" class="bc-recipient-chk" data-index="${i}" ${selectedRecipientIndices.has(i) ? 'checked' : ''} style="cursor:pointer;" />
              </td>
              <td style="padding:0.35rem;"><span style="background:${r.role === 'Coach' ? 'rgba(245,158,11,0.2)' : 'rgba(59,130,246,0.2)'}; color:${r.role === 'Coach' ? '#fbbf24' : '#60a5fa'}; padding:2px 6px; border-radius:4px; font-size:0.75rem;">${r.role}</span></td>
              <td style="padding:0.35rem;"><strong>${r.name}</strong></td>
              <td style="padding:0.35rem;"><code>${r.mobile}</code></td>
              <td style="padding:0.35rem; color:#fbbf24; font-weight:700;">${r.role === 'Coach' ? `👔 ${r.candidates ? r.candidates.length : 0} ${r.isUnregistered ? 'Unregistered ' : ''}Candidates` : (r.data.eventRegNo || r.data.chestNo ? (r.data.eventRegNo || r.data.chestNo) : (r.isUnregistered ? '<span style="color:#f59e0b; font-weight:600;">⚠️ Not Registered</span>' : '—'))}</td>
              <td style="padding:0.35rem; color:#60a5fa; font-size:0.8rem;"><code>${r.data.regNumber || r.data.rsamRegNo || '—'}</code></td>
              <td style="padding:0.35rem;">${r.data.discipline || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const rowCheckboxes = listEl.querySelectorAll(".bc-recipient-chk");
    rowCheckboxes.forEach(chk => {
      chk.onchange = (e) => {
        const idx = parseInt(e.target.dataset.index, 10);
        if (e.target.checked) {
          selectedRecipientIndices.add(idx);
        } else {
          selectedRecipientIndices.delete(idx);
        }
        renderRecipientPreviewList(false);
      };
    });

    const headerChk = listEl.querySelector("#bcSelectAllHeader");
    if (headerChk) {
      headerChk.onchange = (e) => {
        if (e.target.checked) {
          resetRecipientSelection(recipients.length);
        } else {
          selectedRecipientIndices.clear();
        }
        renderRecipientPreviewList(false);
      };
    }
  }

  function initBroadcastControls() {
    const fetchBtn = document.getElementById("fetchRecipientsBtn");
    const sourceSelect = document.getElementById("bcSourceSelect");
    const filterSkaters = document.getElementById("bcFilterSkaters");
    const filterCoaches = document.getElementById("bcFilterCoaches");
    const varButtons = document.querySelectorAll("#bcVarButtons .btn-var-tag");
    const msgText = document.getElementById("bcMessageText");
    const sendBtn = document.getElementById("sendBroadcastBtn");

    const btnTplSkater = document.getElementById("btnTplSkater");
    const btnTplCoach = document.getElementById("btnTplCoach");
    const btnTplUnregistered = document.getElementById("btnTplUnregistered");

    if (btnTplSkater) {
      btnTplSkater.onclick = () => {
        if (!msgText) return;
        msgText.value = `Dear {skaterName},\n\nThank you for registering with RSAM. Your Registration Number is {regNumber}.\n\nImportant update regarding RSAM upcoming event...`;
        notify("✓ Skater announcement template loaded.");
      };
    }

    if (btnTplCoach) {
      btnTplCoach.onclick = () => {
        if (!msgText) return;
        msgText.value = `Dear {coachName},\n\nThank you for believing in RSAM and following candidates with their respective registration numbers have registered with us so far. Please see below their details.\n\n{skaterList}\n\nBest regards,\nRoller Skating Association of Moradabad (RSAM)`;
        notify("✓ Coach candidates report template loaded.");
      };
    }

    if (btnTplUnregistered) {
      btnTplUnregistered.onclick = () => {
        if (!msgText) return;
        msgText.value = `Dear {skaterName},\n\nReminder: You are registered annually with RSAM (Reg No: {regNumber}), but you have not registered for the upcoming championship yet. Please submit your event entry soon.\n\nIf Coach:\nDear {coachName},\n\nThe following athletes under your guidance are registered annually with RSAM, but have NOT registered for the upcoming event yet:\n\n{skaterList}\n\nPlease ensure their event entries are submitted before the registration deadline.\n\nBest regards,\nRoller Sports Association Moradabad (RSAM)`;
        notify("✓ Event entry reminder template loaded.");
      };
    }

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

    const toggleAllBtn = document.getElementById("bcToggleAllBtn");
    const invertBtn = document.getElementById("bcInvertBtn");

    if (toggleAllBtn) {
      toggleAllBtn.onclick = () => {
        const recipients = getFilteredRecipients();
        if (selectedRecipientIndices.size === recipients.length) {
          selectedRecipientIndices.clear();
        } else {
          resetRecipientSelection(recipients.length);
        }
        renderRecipientPreviewList(false);
      };
    }

    if (invertBtn) {
      invertBtn.onclick = () => {
        const recipients = getFilteredRecipients();
        for (let i = 0; i < recipients.length; i++) {
          if (selectedRecipientIndices.has(i)) {
            selectedRecipientIndices.delete(i);
          } else {
            selectedRecipientIndices.add(i);
          }
        }
        renderRecipientPreviewList(false);
      };
    }

    if (fetchBtn) {
      fetchBtn.onclick = async () => {
        await fetchBroadcastContacts();
        resetRecipientSelection(getFilteredRecipients().length);
        renderRecipientPreviewList(false);
      };
    }
    if (sourceSelect) {
      sourceSelect.onchange = () => {
        renderRecipientPreviewList(true);
      };
    }
    if (filterSkaters) {
      filterSkaters.onchange = () => {
        renderRecipientPreviewList(true);
      };
    }
    if (filterCoaches) {
      filterCoaches.onchange = () => {
        renderRecipientPreviewList(true);
      };
    }

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
        const allRecipients = getFilteredRecipients();
        const recipients = allRecipients.filter((_, i) => selectedRecipientIndices.has(i));
        const rawTemplate = (msgText ? msgText.value : "").trim();
        const imageUrl = (document.getElementById("bcImageUrl") ? document.getElementById("bcImageUrl").value : "").trim();

        if (!recipients.length) {
          alert("Please select at least one recipient from the preview list.");
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

          // Candidate list formatting for coach & skater (includes both Chest Number and RSAM Registration Number)
          const chestNoVal = r.data.eventRegNo || r.data.chestNo || r.data.chestNumber || r.data.bib || '';
          const rsamRegVal = r.data.regNumber || r.data.rsamRegNo || '';

          let skaterListStr = "";
          if (r.role === "Coach") {
            if (r.candidates && r.candidates.length > 0) {
              skaterListStr = r.candidates.map(c => {
                const cChest = c.eventRegNo || c.chestNo || c.chestNumber || c.bib || '';
                const cRsam = c.regNumber || c.rsamRegNo || '';
                const chestStr = cChest ? ` (Chest No: ${cChest})` : '';
                const regStr = cRsam ? ` - Reg: ${cRsam}` : '';
                return `• ${c.skaterName || 'Athlete'}${regStr}${chestStr}`;
              }).join('\n');
            } else {
              const chestStr = chestNoVal ? ` (Chest No: ${chestNoVal})` : '';
              const regStr = rsamRegVal ? ` - Reg: ${rsamRegVal}` : '';
              skaterListStr = `• ${r.data.skaterName || 'Athlete'}${regStr}${chestStr}`;
            }
          } else {
            const chestStr = chestNoVal ? ` (Chest No: ${chestNoVal})` : '';
            const regStr = rsamRegVal ? ` - Reg: ${rsamRegVal}` : '';
            skaterListStr = `• ${r.data.skaterName || r.name}${regStr}${chestStr}`;
          }

          let parsedMsg = rawTemplate;

          const formattedDob = formatDobDdMmmYyyy(r.data.dob || r.data.dateOfBirth);

          // 1. Dynamic replacement for all keys present in r.data
          if (r.data && typeof r.data === "object") {
            Object.keys(r.data).forEach(key => {
              let val = r.data[key];
              if (key.toLowerCase() === "dob" || key.toLowerCase() === "dateofbirth") {
                val = formatDobDdMmmYyyy(val);
              }
              if (val !== undefined && val !== null && val !== "") {
                const regExp = new RegExp(`{${key}}`, 'gi');
                parsedMsg = parsedMsg.replace(regExp, String(val));
              }
            });
          }

          // 2. Explicit aliases and fallback replacements for all standard spreadsheet keys & special variables
          parsedMsg = parsedMsg
            .replace(/{chestNo}/g, chestNoVal || 'N/A')
            .replace(/{chestNumber}/g, chestNoVal || 'N/A')
            .replace(/{eventRegNo}/g, chestNoVal || 'N/A')
            .replace(/{rsamRegNo}/g, rsamRegVal || 'N/A')
            .replace(/{regNumber}/g, rsamRegVal || 'N/A')
            .replace(/{skaterList}/g, skaterListStr)
            .replace(/{skaterName} - {regNumber}/g, skaterListStr)
            .replace(/{skaterName}/g, r.data.skaterName || r.name || 'Athlete')
            .replace(/{dob}/g, formattedDob || 'N/A')
            .replace(/{dateOfBirth}/g, formattedDob || 'N/A')
            .replace(/{age}/g, r.data.age || 'N/A')
            .replace(/{ageGroup}/g, r.data.ageGroup || 'N/A')
            .replace(/{gender}/g, r.data.gender || 'N/A')
            .replace(/{schoolClub}/g, r.data.schoolClub || 'N/A')
            .replace(/{coachName}/g, r.name || r.data.coachName || 'Coach')
            .replace(/{coachMobile}/g, r.mobile || r.data.coachMobile || 'N/A')
            .replace(/{fatherName}/g, r.data.fatherName || 'N/A')
            .replace(/{motherName}/g, r.data.motherName || 'N/A')
            .replace(/{address}/g, r.data.address || 'N/A')
            .replace(/{mobile}/g, r.mobile || r.data.mobile || 'N/A')
            .replace(/{email}/g, r.data.email || 'N/A')
            .replace(/{aadhaar}/g, r.data.aadhaar || 'N/A')
            .replace(/{discipline}/g, r.data.discipline || 'N/A')
            .replace(/{paymentId}/g, r.data.paymentId || r.data.upiUtr || 'N/A')
            .replace(/{paymentStatus}/g, r.data.paymentStatus || r.data.status || 'N/A')
            .replace(/{amountPaid}/g, r.data.amountPaid || 'N/A');

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

          // Anti-Ban Safety Protection for WhatsApp Account:
          // 1. Every 20 messages, insert a 45-second batch cooldown pause
          if (i > 0 && i % 20 === 0 && i < recipients.length - 1) {
            const coolDownSecs = 45;
            for (let c = coolDownSecs; c > 0; c--) {
              if (progressStatus) progressStatus.textContent = `☕ Safety Batch Cooldown (${i}/${recipients.length} sent): Pausing ${c}s to protect WhatsApp account from ban...`;
              await new Promise(res => setTimeout(res, 1000));
            }
          } else if (i < recipients.length - 1) {
            // 2. Randomized 5 to 10 second human-like delay between messages
            const randomDelayMs = Math.floor(Math.random() * 5000) + 5000;
            const waitSecs = (randomDelayMs / 1000).toFixed(1);
            if (progressStatus) progressStatus.textContent = `⏳ Safe Delivery (${i + 1}/${recipients.length}): Waiting ${waitSecs}s to simulate human typing & protect account...`;
            await new Promise(res => setTimeout(res, randomDelayMs));
          }
        }

        const failSuffix = lastErrorMsg ? ` (Last Error: ${lastErrorMsg})` : '';
        if (progressStatus) progressStatus.textContent = `✓ Broadcast complete! ${sentCount} sent, ${failCount} failed.${failSuffix}`;
        notify(`🚀 WhatsApp Broadcast finished! ${sentCount} sent, ${failCount} failed.${failSuffix}`);
        sendBtn.disabled = false;
      };
    }
  }

  function initCertificateControls() {
    const certSheetSelect   = document.getElementById("certSheetSelect");
    const fetchBtn          = document.getElementById("fetchCertRecordsBtn");
    const certSelectedCount = document.getElementById("certSelectedCount");
    const selectAllBtn      = document.getElementById("certSelectAllBtn");
    const deselectAllBtn    = document.getElementById("certDeselectAllBtn");
    const invertBtn         = document.getElementById("certInvertBtn");
    const certSkatersList   = document.getElementById("certSkatersList");
    const bulkWaBtn         = document.getElementById("certBulkWaBtn");
    const bulkEmailBtn      = document.getElementById("certBulkEmailBtn");

    const certSkaterName    = document.getElementById("certSkaterName");
    const certFatherName    = document.getElementById("certFatherName");
    const certSchoolClub    = document.getElementById("certSchoolClub");
    const certDiscipline    = document.getElementById("certDiscipline");
    const certRace1Text     = document.getElementById("certRace1Text");
    const certRace2Text     = document.getElementById("certRace2Text");
    const certVenueText     = document.getElementById("certVenueText");
    const certDateText      = document.getElementById("certDateText");
    const certMobile        = document.getElementById("certMobile");
    
    const printBtn          = document.getElementById("certPrintBtn");
    const singleWaBtn       = document.getElementById("certSingleWaBtn");
    const certPreviewWrap   = document.getElementById("certPreviewCardWrap");

    let cachedSheets = [];
    let activeRecords = [];

    function formatRaceRank(str) {
      if (!str) return "";
      const s = String(str).trim().toLowerCase();
      if (s.includes("participant") || s.includes("participation") || s === "-" || s === "n/a" || s === "null" || s === "none") {
        return "";
      }
      if (s === "1" || s.includes("1st") || s.includes("first") || s.includes("gold")) {
        return "🥇 1st Position";
      }
      if (s === "2" || s.includes("2nd") || s.includes("second") || s.includes("silver")) {
        return "🥈 2nd Position";
      }
      if (s === "3" || s.includes("3rd") || s.includes("third") || s.includes("bronze")) {
        return "🥉 3rd Position";
      }
      if (s.includes("4th")) return "4th Position";
      if (s.includes("5th")) return "5th Position";
      return String(str).trim();
    }

    const formatResultString = formatRaceRank;

    function generateCertSignatureSync(skaterName, regNo, race1, race2, discipline, race3) {
      const salt = "RSAM_SECURE_VERIFIED_CERTIFICATE_HASH_SALT_2026";
      const str = [
        String(skaterName || "").trim().toLowerCase(),
        String(regNo || "").trim().toLowerCase(),
        String(race1 || "").trim().toLowerCase(),
        String(race2 || "").trim().toLowerCase(),
        String(race3 || "").trim().toLowerCase(),
        String(discipline || "").trim().toLowerCase(),
        salt
      ].join("::");
      
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
      for (let i = 0; i < str.length; i++) {
        const ch = str.charCodeAt(i);
        h1 = Math.imul(h1 ^ ch, 2654435761);
        h2 = Math.imul(h2 ^ ch, 1597334677);
      }
      h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
      h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
      return ((h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0')).slice(0, 16);
    }

    // Helper to build URL for public standalone certificate
    function buildCertUrl(c) {
      const origin = window.location.origin;
      const regNo = c.regNumber || c.registrationNo || c.eventRegNo || c.rsamRegNo || c.regNo || "";
      const sig = generateCertSignatureSync(c.skaterName, regNo, c.race1, c.race2, c.discipline, c.race3);

      const params = new URLSearchParams({
        regNo: regNo,
        skaterName: c.skaterName || "",
        fatherName: c.fatherName || "",
        schoolClub: c.schoolClub || "",
        dob: c.dob || "",
        ageGroup: c.ageGroup || "",
        eventTitle: c.eventName || (certSheetSelect ? certSheetSelect.value : "4TH DISTRICT CHAMPIONSHIP 2026"),
        discipline: c.discipline || "Quads",
        raceCount: String(c.raceCount || 2),
        race1Title: c.race1Title || "Race 1 (200m)",
        race2Title: c.race2Title || "Race 2 (500m)",
        race3Title: c.race3Title || "Race 3 (1000m)",
        race1: c.race1 || "",
        race2: c.race2 || "",
        race3: c.race3 || "",
        rink1: c.race1 || "",
        rink2: c.race2 || "",
        rink3: c.race3 || "",
        venue: c.venue || "Moradabad Sports Complex, Kanth Road, Moradabad",
        date: c.dateStr || "15th - 16th October 2026",
        recUpRsa: c.recUpRsa ? "1" : "0",
        recRsfi: c.recRsfi ? "1" : "0",
        recCustom1: c.recCustom1 || "",
        recCustom2: c.recCustom2 || "",
        recCustom3: c.recCustom3 || "",
        sig: sig
      });
      return `${origin}/certificate-view.html?${params.toString()}`;
    }

    function getCertData() {
      const elR1 = document.getElementById("certRace1Text");
      const elR2 = document.getElementById("certRace2Text");
      const elR3 = document.getElementById("certRace3Text");
      const elRCount = document.getElementById("certRaceCount");
      const elR1Title = document.getElementById("certRace1Title");
      const elR2Title = document.getElementById("certRace2Title");
      const elR3Title = document.getElementById("certRace3Title");
      const elVen = document.getElementById("certVenueText");
      const elDat = document.getElementById("certDateText");
      const certDob = document.getElementById("certDob");
      const certAgeGroup = document.getElementById("certAgeGroup");

      const recUpRsa = document.getElementById("certRecUpRsa");
      const recRsfi = document.getElementById("certRecRsfi");
      const custom1Check = document.getElementById("certRecCustom1Check");
      const custom1Text = document.getElementById("certRecCustom1Text");
      const custom2Check = document.getElementById("certRecCustom2Check");
      const custom2Text = document.getElementById("certRecCustom2Text");
      const custom3Check = document.getElementById("certRecCustom3Check");
      const custom3Text = document.getElementById("certRecCustom3Text");

      return {
        skaterName: certSkaterName ? certSkaterName.value.trim() : "",
        fatherName: certFatherName ? certFatherName.value.trim() : "",
        schoolClub: certSchoolClub ? certSchoolClub.value.trim() : "",
        discipline: certDiscipline ? certDiscipline.value.trim() : "",
        dob: certDob ? formatDobDdMmmYyyy(certDob.value.trim()) : "",
        ageGroup: certAgeGroup ? certAgeGroup.value.trim() : "",
        raceCount: elRCount ? parseInt(elRCount.value, 10) : 2,
        race1Title: elR1Title ? elR1Title.value.trim() : "Race 1 (200m)",
        race2Title: elR2Title ? elR2Title.value.trim() : "Race 2 (500m)",
        race3Title: elR3Title ? elR3Title.value.trim() : "Race 3 (1000m)",
        race1: elR1 ? elR1.value.trim() : "",
        race2: elR2 ? elR2.value.trim() : "",
        race3: elR3 ? elR3.value.trim() : "",
        venue: elVen && elVen.value.trim() ? elVen.value.trim() : "Moradabad Sports Complex, Kanth Road, Moradabad",
        dateStr: elDat && elDat.value.trim() ? elDat.value.trim() : "15th - 16th October 2026",
        mobile: certMobile ? certMobile.value.trim() : "",
        eventName: certSheetSelect ? certSheetSelect.value : "4TH DISTRICT CHAMPIONSHIP 2026",
        recUpRsa: recUpRsa ? recUpRsa.checked : true,
        recRsfi: recRsfi ? recRsfi.checked : true,
        recCustom1: (custom1Check && custom1Check.checked && custom1Text) ? custom1Text.value.trim() : "",
        recCustom2: (custom2Check && custom2Check.checked && custom2Text) ? custom2Text.value.trim() : "",
        recCustom3: (custom3Check && custom3Check.checked && custom3Text) ? custom3Text.value.trim() : ""
      };
    }

    function renderCertificatePreview() {
      if (!certPreviewWrap) return;
      const c = getCertData();
      const certUrl = buildCertUrl(c);

      const raceCount = c.raceCount || 2;
      const formattedR1 = formatRaceRank(c.race1);
      const formattedR2 = formatRaceRank(c.race2);
      const formattedR3 = formatRaceRank(c.race3);

      const recLines = [];
      if (c.recUpRsa) recLines.push("RECOGNIZED BY UPRSA");
      if (c.recRsfi) recLines.push("UPRSA AFFILIATED TO : ROLLER SKATING FEDERATION OF INDIA (RSFI)");
      if (c.recCustom1) recLines.push(c.recCustom1.toUpperCase());
      if (c.recCustom2) recLines.push(c.recCustom2.toUpperCase());
      if (c.recCustom3) recLines.push(c.recCustom3.toUpperCase());

      const affStr = recLines.length > 0 ? recLines.join(" · ") : "RECOGNIZED BY UPRSA · UPRSA AFFILIATED TO : ROLLER SKATING FEDERATION OF INDIA (RSFI)";

      certPreviewWrap.innerHTML = `
        <div style="width:100%; aspect-ratio:1.414/1; background:linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%); border-radius:12px; padding:1.4rem 2rem; color:#1f2937; font-family:'Outfit',sans-serif; text-align:center; position:relative; box-shadow:0 10px 30px rgba(0,0,0,0.5); display:flex; flex-direction:column; justify-content:space-between; box-sizing:border-box; overflow:hidden;">
          
          <!-- Royal Navy & Silver Metallic SVG Frame Overlay with Top/Bottom Chequered Flags -->
          <svg style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;" viewBox="0 0 1000 707" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="adminChequeredFlag" width="16" height="16" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#0b192c" />
                <rect x="8" width="8" height="8" fill="#ffffff" />
                <rect y="8" width="8" height="8" fill="#ffffff" />
                <rect x="8" y="8" width="8" height="8" fill="#0b192c" />
              </pattern>
              <linearGradient id="adminNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#0b192c" />
                <stop offset="50%" stop-color="#1e3a8a" />
                <stop offset="100%" stop-color="#0b192c" />
              </linearGradient>
              <linearGradient id="adminSilverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#94a3b8" />
                <stop offset="50%" stop-color="#e2e8f0" />
                <stop offset="100%" stop-color="#64748b" />
              </linearGradient>
            </defs>
            <rect x="8" y="8" width="984" height="691" rx="8" fill="none" stroke="url(#adminNavyGrad)" stroke-width="6" />
            <rect x="16" y="16" width="968" height="675" rx="6" fill="none" stroke="url(#adminSilverGrad)" stroke-width="2.5" />
            <rect x="22" y="22" width="956" height="663" rx="4" fill="none" stroke="url(#adminNavyGrad)" stroke-width="1.2" stroke-dasharray="8,4" />
            
            <!-- Top & Bottom Chequered Flag Pattern Borders -->
            <rect x="140" y="10" width="720" height="6" fill="url(#adminChequeredFlag)" opacity="0.9" rx="2" />
            <rect x="140" y="691" width="720" height="6" fill="url(#adminChequeredFlag)" opacity="0.9" rx="2" />

            <g transform="translate(14, 14)">
              <rect width="20" height="20" fill="url(#adminNavyGrad)" rx="3" />
              <circle cx="10" cy="10" r="5" fill="url(#adminSilverGrad)" />
            </g>
            <g transform="translate(966, 14)">
              <rect width="20" height="20" fill="url(#adminNavyGrad)" rx="3" />
              <circle cx="10" cy="10" r="5" fill="url(#adminSilverGrad)" />
            </g>
            <g transform="translate(14, 673)">
              <rect width="20" height="20" fill="url(#adminNavyGrad)" rx="3" />
              <circle cx="10" cy="10" r="5" fill="url(#adminSilverGrad)" />
            </g>
            <g transform="translate(966, 673)">
              <rect width="20" height="20" fill="url(#adminNavyGrad)" rx="3" />
              <circle cx="10" cy="10" r="5" fill="url(#adminSilverGrad)" />
            </g>
          </svg>

          <!-- RSAM Transparent Watermark -->
          <img src="assets/branding/logo_rsam_transparent.png" style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:380px; opacity:0.22; pointer-events:none; z-index:0;" alt="RSAM Watermark" />

          <div style="position:relative; z-index:2; height:100%; display:flex; flex-direction:column; justify-content:space-between;">
            <!-- Top 4 Header Logos Bar (Standout Transparent Logos: RSAM enlarged visually, UPRSA, RSFI, IOA) -->
            <div style="display:flex; justify-content:space-around; align-items:center; margin-bottom:0.3rem; border-bottom:1.5px dashed rgba(15,23,42,0.15); padding:0.2rem 1rem 0.4rem 1rem; gap:0.8rem;">
              <img src="assets/branding/logo_rsam_transparent.png" style="height:60px; max-height:64px; max-width:125px; object-fit:contain; border:none; background:transparent;" alt="RSAM Logo" />
              <img src="assets/branding/logo_uprsa.png" style="height:48px; max-height:50px; max-width:110px; object-fit:contain; border:none; background:transparent;" alt="UPRSA Logo" />
              <img src="assets/branding/logo_rsfi_indiaskate.png" style="height:48px; max-height:50px; max-width:110px; object-fit:contain; border:none; background:transparent;" alt="RSFI Logo" />
              <img src="assets/branding/logo_ioa_india.webp" style="height:48px; max-height:50px; max-width:110px; object-fit:contain; border:none; background:transparent;" alt="IOA India Logo" />
            </div>

            <!-- Event Title Block & Merit Badge Flanked by Large Skater Illustrations -->
            <div style="display:flex; align-items:center; justify-content:center; gap:0.5rem; width:100%; margin:0.1rem 0;">
              <!-- Left Skater Image (Large, close to title, extending to athlete box) -->
              <img src="assets/branding/skater_left.png" style="height:105px; width:auto; max-width:100px; object-fit:contain; opacity:0.92; flex-shrink:0;" alt="Skater Left" />
              
              <!-- Center Title & Badge Container -->
              <div style="flex:1; text-align:center;">
                <div style="font-family:'Cinzel',serif; font-size:1.35rem; font-weight:800; color:#dc2626; letter-spacing:0.8px; text-transform:uppercase; line-height:1.15;">
                  ${escapeHTML(c.eventName)}
                </div>
                <div style="font-size:0.62rem; font-weight:700; color:#4b5563; text-transform:uppercase; margin-top:0.15rem; margin-bottom:0.2rem;">
                  ${escapeHTML(affStr)}
                </div>
                <div style="font-family:'Cinzel',serif; font-size:1.1rem; font-weight:800; color:#1e3a8a; letter-spacing:1px; background:rgba(30,58,138,0.08); padding:3px 12px; border-radius:20px; display:inline-block; border:1px solid rgba(30,58,138,0.2);">
                  CERTIFICATE OF MERIT &amp; PARTICIPATION
                </div>
              </div>

              <!-- Right Skater Image (Large, close to title, extending to athlete box) -->
              <img src="assets/branding/skater_right.png" style="height:105px; width:auto; max-width:100px; object-fit:contain; opacity:0.92; flex-shrink:0;" alt="Skater Right" />
            </div>

            <!-- Translucent Athlete Card (Uniform Field Styles) -->
            <div style="background:rgba(255,255,255,0.42); backdrop-filter:blur(2px); border:1px solid rgba(15,23,42,0.12); border-radius:8px; padding:0.6rem 1rem; margin:0.3rem 0; text-align:left; font-size:0.82rem;">
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.3rem 1rem;">
                <div>
                  <span style="color:#64748b; font-size:0.6rem; font-weight:700; display:block;">SKATER / ATHLETE NAME</span>
                  <strong style="color:#0f172a; font-size:0.95rem;">${escapeHTML(c.skaterName || 'CHAITANYA GARG')}</strong>
                </div>
                <div>
                  <span style="color:#64748b; font-size:0.6rem; font-weight:700; display:block;">FATHER / PARENT'S NAME</span>
                  <strong style="color:#0f172a; font-size:0.95rem;">${escapeHTML(c.fatherName || 'MANAS GARG')}</strong>
                </div>
                <div>
                  <span style="color:#64748b; font-size:0.6rem; font-weight:700; display:block;">SCHOOL / CLUB</span>
                  <strong style="color:#0f172a; font-size:0.85rem;">${escapeHTML(c.schoolClub || 'KIDS SAVVY (ARYANS PANTHERS)')}</strong>
                </div>
                <div>
                  <span style="color:#64748b; font-size:0.6rem; font-weight:700; display:block;">DOB &amp; AGE GROUP</span>
                  <strong style="color:#0f172a; font-size:0.85rem;">${escapeHTML(formatDobDdMmmYyyy(c.dob) || '30-Jan-2020')} ${c.ageGroup ? '· ' + escapeHTML(c.ageGroup) : ''}</strong>
                </div>
                <div style="grid-column: span 2;">
                  <span style="color:#64748b; font-size:0.6rem; font-weight:700; display:block;">DISCIPLINE / CATEGORY</span>
                  <strong style="color:#0f172a; font-size:0.95rem;">${escapeHTML(c.discipline || 'Quads')}</strong>
                </div>
              </div>
            </div>

            <!-- Venue (First) and Date (Second) -->
            <div style="background:rgba(248,250,252,0.42); backdrop-filter:blur(2px); border:1px solid #e2e8f0; padding:0.35rem 0.8rem; border-radius:6px; font-size:0.75rem; color:#334155; display:flex; justify-content:space-between; margin-bottom:0.3rem;">
              <div>📍 Venue: <strong style="color:#0f172a;">${escapeHTML(c.venue)}</strong></div>
              <div>📅 Event Date: <strong style="color:#0f172a;">${escapeHTML(c.dateStr)}</strong></div>
            </div>

            <!-- Race Result Boxes (Supports 1, 2, or 3 Races) -->
            <div style="display:grid; grid-template-columns: repeat(${Math.min(Math.max(raceCount, 1), 3)}, 1fr); gap:0.5rem; margin-bottom:0.3rem;">
              <div style="background:rgba(255,255,255,0.42); backdrop-filter:blur(2px); border:1.5px solid #cbd5e1; border-radius:6px; overflow:hidden; text-align:center;">
                <div style="background:rgba(241,245,249,0.65); color:#0b192c; font-size:0.65rem; font-weight:800; padding:3px 6px; border-bottom:1px solid #cbd5e1; letter-spacing:0.5px; text-transform:uppercase;">${escapeHTML(c.race1Title || 'RACE 1 RESULT')}</div>
                <div style="min-height:34px; padding:4px; font-size:0.9rem; font-weight:800; color:#0f172a; display:flex; align-items:center; justify-content:center;">
                  ${formattedR1 ? `<strong>${escapeHTML(formattedR1)}</strong>` : `<span style="color:#cbd5e1;">—</span>`}
                </div>
              </div>
              ${raceCount >= 2 ? `
              <div style="background:rgba(255,255,255,0.42); backdrop-filter:blur(2px); border:1.5px solid #cbd5e1; border-radius:6px; overflow:hidden; text-align:center;">
                <div style="background:rgba(241,245,249,0.65); color:#0b192c; font-size:0.65rem; font-weight:800; padding:3px 6px; border-bottom:1px solid #cbd5e1; letter-spacing:0.5px; text-transform:uppercase;">${escapeHTML(c.race2Title || 'RACE 2 RESULT')}</div>
                <div style="min-height:34px; padding:4px; font-size:0.9rem; font-weight:800; color:#0f172a; display:flex; align-items:center; justify-content:center;">
                  ${formattedR2 ? `<strong>${escapeHTML(formattedR2)}</strong>` : `<span style="color:#cbd5e1;">—</span>`}
                </div>
              </div>` : ''}
              ${raceCount >= 3 ? `
              <div style="background:rgba(255,255,255,0.42); backdrop-filter:blur(2px); border:1.5px solid #cbd5e1; border-radius:6px; overflow:hidden; text-align:center;">
                <div style="background:rgba(241,245,249,0.65); color:#0b192c; font-size:0.65rem; font-weight:800; padding:3px 6px; border-bottom:1px solid #cbd5e1; letter-spacing:0.5px; text-transform:uppercase;">${escapeHTML(c.race3Title || 'RACE 3 RESULT')}</div>
                <div style="min-height:34px; padding:4px; font-size:0.9rem; font-weight:800; color:#0f172a; display:flex; align-items:center; justify-content:center;">
                  ${formattedR3 ? `<strong>${escapeHTML(formattedR3)}</strong>` : `<span style="color:#cbd5e1;">—</span>`}
                </div>
              </div>` : ''}
            </div>

            <!-- 3 Bottom Executive Signatories with Lowered Signatures (-5px margin) -->
            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.4rem; margin-top:0.3rem; border-top:1px solid #e5e7eb; padding-top:0.3rem; font-size:0.68rem; text-align:center;">
              <div>
                <div style="height:40px; display:flex; align-items:flex-end; justify-content:center; margin-bottom:-5px;">
                  <img src="assets/signatures/sig_ashok_singhal.png" style="height:38px; max-width:120px; object-fit:contain;" alt="Ashok Singhal Signature" />
                </div>
                <strong style="display:block; color:#dc2626; font-size:0.75rem;">ASHOK SINGHAL</strong>
                <span style="color:#0b192c; font-weight:700; font-size:0.62rem;">PRESIDENT</span>
              </div>
              <div>
                <div style="height:40px; display:flex; align-items:flex-end; justify-content:center; margin-bottom:-5px;">
                  <img src="assets/signatures/sig_parmesh_charan.png" style="height:38px; max-width:120px; object-fit:contain;" alt="Parmesh Charan Signature" />
                </div>
                <strong style="display:block; color:#dc2626; font-size:0.75rem;">PARMESH CHARAN</strong>
                <span style="color:#0b192c; font-weight:700; font-size:0.62rem;">TREASURER</span>
              </div>
              <div>
                <div style="height:40px; display:flex; align-items:flex-end; justify-content:center; margin-bottom:-5px;">
                  <img src="assets/signatures/sig_devendra_rana.png" style="height:38px; max-width:120px; object-fit:contain;" alt="Devendra Kumar Rana Signature" />
                </div>
                <strong style="display:block; color:#dc2626; font-size:0.75rem;">DEVENDRA KUMAR RANA</strong>
                <span style="color:#0b192c; font-weight:700; font-size:0.62rem;">GEN. SECRETARY</span>
              </div>
            </div>

            <!-- Standalone URL Link -->
            <div style="margin-top:0.3rem; padding-top:0.2rem; border-top:1px dashed #d1d5db;">
              <a href="${escapeHTML(certUrl)}" target="_blank" style="color:#2563eb; font-size:0.75rem; text-decoration:underline; font-weight:600;">
                🔗 Open Fullscreen Shareable Certificate (certificate-view.html)
              </a>
            </div>
          </div>
        </div>
      `;
    }

    [
      certSkaterName, certFatherName, certSchoolClub, certDiscipline, certMobile,
      document.getElementById("certRaceCount"),
      document.getElementById("certRace1Title"), document.getElementById("certRace2Title"), document.getElementById("certRace3Title"),
      document.getElementById("certRace1Text"), document.getElementById("certRace2Text"), document.getElementById("certRace3Text"),
      document.getElementById("certVenueText"), document.getElementById("certDateText"),
      document.getElementById("certRecUpRsa"), document.getElementById("certRecRsfi"),
      document.getElementById("certRecCustom1Check"), document.getElementById("certRecCustom1Text"),
      document.getElementById("certRecCustom2Check"), document.getElementById("certRecCustom2Text"),
      document.getElementById("certRecCustom3Check"), document.getElementById("certRecCustom3Text")
    ].forEach(input => {
      if (input) {
        input.oninput = renderCertificatePreview;
        input.onchange = renderCertificatePreview;
      }
    });

    async function fetchEventSheetRecords() {
      if (!certSkatersList) return;
      certSkatersList.innerHTML = `<p style="color:#60a5fa; text-align:center; padding:1.5rem;"><i class="fa-solid fa-spin fa-spinner"></i> Fetching event sheets &amp; results from Google Sheets...</p>`;

      let fetched = false;
      let sheetsData = [];

      // 1. Try Express backend API first
      const baseUrl = getAdminApiBaseUrl();
      try {
        const res = await fetch(`${baseUrl}/api/fetch-contacts`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.status === "ok" && Array.isArray(data.sheets) && data.sheets.length > 0) {
            sheetsData = data.sheets;
            fetched = true;
          }
        }
      } catch (e) {
        console.warn("[Cert Fetch Backend Error]", e);
      }

      // 2. Fallback to direct Apps Script URL
      if (!fetched) {
        try {
          const sheetUrl = (window.ENV_CONFIG && window.ENV_CONFIG.sheetUrl) || (typeof SHEET_URL !== 'undefined' ? SHEET_URL : '') || "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
          const res = await fetch(`${sheetUrl}?action=fetch_all_contacts`);
          if (res.ok) {
            const data = await res.json();
            if (data && (data.sheets || (data.status === "ok" && data.sheets))) {
              sheetsData = data.sheets;
              fetched = true;
            }
          }
        } catch (e) {
          console.warn("[Cert Fetch Direct AppsScript Error]", e);
        }
      }

      if (fetched && sheetsData.length > 0) {
        cachedSheets = sheetsData;
        window.RSAM_CACHED_SHEETS = cachedSheets;

        // Update dropdown dynamically if new sheets are found
        if (certSheetSelect) {
          const currentSelected = certSheetSelect.value;
          certSheetSelect.innerHTML = cachedSheets.map(s => 
            `<option value="${escapeHTML(s.sheetName)}"${s.sheetName === currentSelected ? ' selected' : ''}>🎟️ ${escapeHTML(s.sheetName)} (${s.count} skaters)</option>`
          ).join('');
        }

        loadSelectedSheet();
      } else {
        certSkatersList.innerHTML = `<p style="color:#f87171; text-align:center; padding:1.5rem;">⚠️ Could not load sheets from Google Sheet API. Please check your network connection.</p>`;
      }
    }

    function loadSelectedSheet() {
      if (!certSheetSelect || !cachedSheets.length) return;
      const targetSheetName = certSheetSelect.value;
      const sheetObj = cachedSheets.find(s => s.sheetName === targetSheetName) || cachedSheets[0];
      activeRecords = sheetObj ? sheetObj.records : [];
      renderSkatersTable();
    }

    function renderSkatersTable() {
      if (!certSkatersList) return;
      if (!activeRecords || activeRecords.length === 0) {
        certSkatersList.innerHTML = `<p style="color:#9ca3af; text-align:center; padding:1.5rem;">No skater records in selected sheet.</p>`;
        updateSelectedCount();
        return;
      }

      certSkatersList.innerHTML = `
        <table style="width:100%; border-collapse:collapse; color:#d1d5db; font-size:0.85rem;">
          <thead>
            <tr style="border-bottom:1px solid rgba(255,255,255,0.15); text-align:left; color:#9ca3af;">
              <th style="padding:0.4rem;"><input type="checkbox" id="certMasterChk" checked></th>
              <th style="padding:0.4rem;">Skater Name</th>
              <th style="padding:0.4rem;">Discipline</th>
              <th style="padding:0.4rem;">Result</th>
              <th style="padding:0.4rem; text-align:center;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${activeRecords.map((r, idx) => {
              const resVal = formatResultString(r.result || r.rinkRace1);
              return `
                <tr style="border-bottom:1px solid rgba(255,255,255,0.06);">
                  <td style="padding:0.4rem;">
                    <input type="checkbox" class="cert-skater-chk" data-idx="${idx}" checked>
                  </td>
                  <td style="padding:0.4rem;">
                    <strong style="color:#fff;">${escapeHTML(r.skaterName || 'Athlete')}</strong>
                    <div style="font-size:0.75rem; color:#9ca3af;">
                      ${r.regNumber ? escapeHTML(r.regNumber) : ''} ${r.mobile ? '· 📱 ' + escapeHTML(r.mobile) : ''}
                    </div>
                  </td>
                  <td style="padding:0.4rem; font-size:0.8rem; color:#cbd5e1;">${escapeHTML(r.discipline || '—')}</td>
                  <td style="padding:0.4rem; font-size:0.8rem; color:#f59e0b; font-weight:600;">${escapeHTML(resVal)}</td>
                  <td style="padding:0.4rem; text-align:center;">
                    <button type="button" class="btn-cert-preview-item" data-idx="${idx}" style="font-size:0.72rem; padding:0.25rem 0.5rem; background:rgba(59,130,246,0.2); color:#60a5fa; border:1px solid rgba(59,130,246,0.4); border-radius:4px; cursor:pointer;">👁️ Load</button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Master Checkbox & Count Listeners
      const masterChk = document.getElementById("certMasterChk");
      const itemChks = certSkatersList.querySelectorAll(".cert-skater-chk");

      if (masterChk) {
        masterChk.onchange = () => {
          itemChks.forEach(chk => chk.checked = masterChk.checked);
          updateSelectedCount();
        };
      }

      itemChks.forEach(chk => {
        chk.onchange = updateSelectedCount;
      });

      // Helper to extract Race 1, Race 2 & Race 3 from record
      function populateSkaterInEditor(r) {
        const certDob = document.getElementById("certDob");
        const certAgeGroup = document.getElementById("certAgeGroup");

        if (certSkaterName) certSkaterName.value = r.skaterName || r.name || '';
        if (certFatherName) certFatherName.value = r.fatherName || r.father_name || '';
        if (certSchoolClub) certSchoolClub.value = r.schoolClub || r.school_club || '';
        if (certDiscipline) certDiscipline.value = r.discipline || r.category || '';
        if (certDob)        certDob.value        = formatDobDdMmmYyyy(r.dob || r.dateOfBirth || r.birth_date || '');
        if (certAgeGroup)   certAgeGroup.value   = r.ageGroup || r.age_group || r.category || '';
        if (certMobile)     certMobile.value     = r.mobile || r.phone || '';

        const elR1 = document.getElementById("certRace1Text");
        const elR2 = document.getElementById("certRace2Text");
        const elR3 = document.getElementById("certRace3Text");
        const elVen = document.getElementById("certVenueText");
        const elDat = document.getElementById("certDateText");

        let r1 = r.race1 || r.rinkRace1 || r.rink1 || '';
        let r2 = r.race2 || r.rinkRace2 || r.rink2 || '';
        let r3 = r.race3 || r.roadRace1 || r.rink3 || '';
        if (!r1 && !r2 && !r3 && (r.result || r.results)) {
          const resStr = String(r.result || r.results || '');
          const parts = resStr.split(/,|\/|\||&|;|\n/).map(s => s.trim()).filter(Boolean);
          if (parts.length >= 3) { r1 = parts[0]; r2 = parts[1]; r3 = parts[2]; }
          else if (parts.length === 2) { r1 = parts[0]; r2 = parts[1]; }
          else if (parts.length === 1) { r1 = parts[0]; }
        }

        if (elR1) elR1.value = formatRaceRank(r1);
        if (elR2) elR2.value = formatRaceRank(r2);
        if (elR3) elR3.value = formatRaceRank(r3);
        if (elVen && r.venue) elVen.value = r.venue;
        if (elDat && r.date) elDat.value = r.date;
      }

      // Load Button click listeners
      certSkatersList.querySelectorAll(".btn-cert-preview-item").forEach(btn => {
        btn.onclick = () => {
          const idx = parseInt(btn.getAttribute("data-idx"), 10);
          if (activeRecords[idx]) {
            populateSkaterInEditor(activeRecords[idx]);
            renderCertificatePreview();
            notify(`Loaded ${activeRecords[idx].skaterName || 'Athlete'} into certificate editor!`, "success");
          }
        };
      });

      // Auto-load first skater into editor
      if (activeRecords.length > 0) {
        populateSkaterInEditor(activeRecords[0]);
      }

      updateSelectedCount();
      renderCertificatePreview();
    }

    function updateSelectedCount() {
      if (!certSelectedCount || !certSkatersList) return;
      const checked = certSkatersList.querySelectorAll(".cert-skater-chk:checked");
      certSelectedCount.textContent = checked.length;
    }

    // Select/Deselect/Invert Handlers
    if (selectAllBtn) {
      selectAllBtn.onclick = () => {
        if (!certSkatersList) return;
        certSkatersList.querySelectorAll(".cert-skater-chk").forEach(chk => chk.checked = true);
        const masterChk = document.getElementById("certMasterChk");
        if (masterChk) masterChk.checked = true;
        updateSelectedCount();
      };
    }

    if (deselectAllBtn) {
      deselectAllBtn.onclick = () => {
        if (!certSkatersList) return;
        certSkatersList.querySelectorAll(".cert-skater-chk").forEach(chk => chk.checked = false);
        const masterChk = document.getElementById("certMasterChk");
        if (masterChk) masterChk.checked = false;
        updateSelectedCount();
      };
    }

    if (invertBtn) {
      invertBtn.onclick = () => {
        if (!certSkatersList) return;
        certSkatersList.querySelectorAll(".cert-skater-chk").forEach(chk => chk.checked = !chk.checked);
        updateSelectedCount();
      };
    }

    if (certSheetSelect) {
      certSheetSelect.onchange = loadSelectedSheet;
    }

    if (fetchBtn) {
      fetchBtn.onclick = fetchEventSheetRecords;
    }

    // Single Print / PDF Button
    if (printBtn) {
      printBtn.onclick = () => {
        const c = getCertData();
        const url = buildCertUrl(c);
        window.open(url, '_blank');
      };
    }

    // Single WhatsApp Dispatch Button
    if (singleWaBtn) {
      singleWaBtn.onclick = async () => {
        const c = getCertData();
        if (!c.mobile || c.mobile.length < 10) {
          alert("Please enter a valid 10-digit mobile number for WhatsApp dispatch.");
          return;
        }

        const certUrl = buildCertUrl(c);
        const msg = `🏅 *ROLLER SPORTS ASSOCIATION MORADABAD (RSAM)*\n` +
          `Official Digital Certificate of Merit & Performance\n\n` +
          `Dear *${c.skaterName}*,\n\n` +
          `Congratulations on your performance in *${c.eventName}*!\n\n` +
          `📜 *Certificate Details:*\n` +
          `• Athlete Name: *${c.skaterName}*\n` +
          `• Discipline: *${c.discipline}*\n` +
          `• Result / Award: *${c.resultText}*\n\n` +
          `🔗 *Click to View / Download Official Certificate:*\n` +
          `${certUrl}\n\n` +
          `Best regards,\n*Roller Sports Association Moradabad (RSAM)*`;

        const botStatus = await checkWaBotStatus();
        if (botStatus.isConnected) {
          try {
            const res = await fetch(`${getAdminApiBaseUrl()}/send-registration`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                mobile: c.mobile,
                skaterName: c.skaterName,
                message: msg
              })
            });
            if (res.ok) {
              notify(`✓ WhatsApp Certificate dispatched to ${c.skaterName} (${c.mobile})!`, "success");
              return;
            }
          } catch (e) {
            console.warn("[WhatsApp Certificate Send Error]", e);
          }
        }

        const targetNum = c.mobile.replace(/\D/g, "").slice(-10);
        window.open(`https://api.whatsapp.com/send?phone=91${targetNum}&text=${encodeURIComponent(msg)}`, "_blank");
        notify(`📱 Direct WhatsApp chat link opened for ${c.skaterName}!`, "success");
      };
    }

    // Bulk WhatsApp Broadcast Button
    if (bulkWaBtn) {
      bulkWaBtn.onclick = async () => {
        if (!certSkatersList) return;
        const checkedChks = Array.from(certSkatersList.querySelectorAll(".cert-skater-chk:checked"));
        if (checkedChks.length === 0) {
          alert("Please select at least one skater from the list to broadcast certificates.");
          return;
        }

        const selectedRecords = checkedChks.map(chk => {
          const idx = parseInt(chk.getAttribute("data-idx"), 10);
          return activeRecords[idx];
        }).filter(Boolean);

        if (!confirm(`Broadcast digital certificates via WhatsApp to ${selectedRecords.length} selected skaters?`)) return;

        bulkWaBtn.disabled = true;
        const origText = bulkWaBtn.innerHTML;
        const botStatus = await checkWaBotStatus();

        let sentCount = 0;
        let failCount = 0;

        for (let i = 0; i < selectedRecords.length; i++) {
          const r = selectedRecords[i];
          bulkWaBtn.innerHTML = `⏳ Broadcasting (${i + 1}/${selectedRecords.length}) to ${escapeHTML(r.skaterName)}...`;

          const skaterMobile = (r.mobile || "").replace(/\D/g, "").slice(-10);
          if (!skaterMobile || skaterMobile.length < 10) {
            failCount++;
            continue;
          }

          let r1 = r.race1 || r.rinkRace1 || r.rink1 || '';
          let r2 = r.race2 || r.rinkRace2 || r.rink2 || '';
          let r3 = r.race3 || r.roadRace1 || r.rink3 || '';
          if (!r1 && !r2 && !r3 && (r.result || r.results)) {
            const parts = String(r.result || r.results || '').split(/,|\/|\||&|;|\n/).map(s => s.trim()).filter(Boolean);
            if (parts.length >= 3) { r1 = parts[0]; r2 = parts[1]; r3 = parts[2]; }
            else if (parts.length === 2) { r1 = parts[0]; r2 = parts[1]; }
            else if (parts.length === 1) { r1 = parts[0]; }
          }

          const cData = getCertData();
          const certUrl = buildCertUrl({
            regNumber: r.regNumber || r.registrationNo || r.eventRegNo || r.rsamRegNo || "",
            skaterName: r.skaterName || r.name,
            fatherName: r.fatherName || r.father_name,
            schoolClub: r.schoolClub || r.school_club,
            discipline: r.discipline || r.category,
            raceCount: cData.raceCount,
            race1Title: cData.race1Title,
            race2Title: cData.race2Title,
            race3Title: cData.race3Title,
            race1: formatRaceRank(r1),
            race2: formatRaceRank(r2),
            race3: formatRaceRank(r3),
            eventName: certSheetSelect ? certSheetSelect.value : "District Championship 2026",
            dateStr: cData.dateStr,
            venue: cData.venue
          });

          const msg = `🏅 *ROLLER SPORTS ASSOCIATION MORADABAD (RSAM)*\n` +
            `Official Digital Certificate of Merit & Performance\n\n` +
            `Dear *${r.skaterName}*,\n\n` +
            `Congratulations on your performance in *${certSheetSelect ? certSheetSelect.value : 'RSAM Championship'}*!\n\n` +
            `📜 *Athlete & Event Details:*\n` +
            `• Athlete: *${r.skaterName}*\n` +
            `• Father's Name: *${r.fatherName || '—'}*\n` +
            `• School/Club: *${r.schoolClub || '—'}*\n` +
            `• Discipline: *${r.discipline || '—'}*\n\n` +
            `🔗 *Click to View & Print Official RSAM Digital Certificate:*\n` +
            `${certUrl}\n\n` +
            `Best regards,\n*Roller Sports Association Moradabad (RSAM)*`;

          if (botStatus.isConnected) {
            try {
              const res = await fetch(`${getAdminApiBaseUrl()}/send-registration`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  mobile: skaterMobile,
                  skaterName: r.skaterName,
                  message: msg
                })
              });
              if (res.ok) sentCount++;
              else failCount++;
            } catch (e) {
              failCount++;
            }
          } else {
            window.open(`https://api.whatsapp.com/send?phone=91${skaterMobile}&text=${encodeURIComponent(msg)}`, "_blank");
            sentCount++;
          }

          // Anti-Ban Safety Protection for WhatsApp Account:
          // 1. Every 20 messages, insert a 45-second batch cooldown pause
          if (i > 0 && i % 20 === 0 && i < selectedRecords.length - 1) {
            const coolDownSecs = 45;
            for (let c = coolDownSecs; c > 0; c--) {
              bulkWaBtn.innerHTML = `☕ Safety Cooldown (${i}/${selectedRecords.length} sent): Pausing ${c}s...`;
              await new Promise(res => setTimeout(res, 1000));
            }
          } else if (i < selectedRecords.length - 1) {
            // 2. Randomized 5 to 10 second human-like delay between messages
            const randomDelayMs = Math.floor(Math.random() * 5000) + 5000;
            const waitSecs = (randomDelayMs / 1000).toFixed(1);
            bulkWaBtn.innerHTML = `⏳ Safe Delivery (${i + 1}/${selectedRecords.length}): Waiting ${waitSecs}s...`;
            await new Promise(res => setTimeout(res, randomDelayMs));
          }
        }

        notify(`🚀 Certificate WhatsApp Broadcast complete! ${sentCount} sent, ${failCount} failed.`, "success");
        bulkWaBtn.disabled = false;
        bulkWaBtn.innerHTML = origText;
      };
    }

    // Bulk Email Broadcast Button
    if (bulkEmailBtn) {
      bulkEmailBtn.onclick = async () => {
        if (!certSkatersList) return;
        const checkedChks = Array.from(certSkatersList.querySelectorAll(".cert-skater-chk:checked"));
        if (checkedChks.length === 0) {
          alert("Please select at least one skater from the list to broadcast certificates via Email.");
          return;
        }

        const selectedRecords = checkedChks.map(chk => {
          const idx = parseInt(chk.getAttribute("data-idx"), 10);
          return activeRecords[idx];
        }).filter(r => r && r.email && r.email.includes("@"));

        if (selectedRecords.length === 0) {
          alert("None of the selected skaters have a valid email address.");
          return;
        }

        if (!confirm(`Broadcast digital certificates via Email to ${selectedRecords.length} skaters?`)) return;

        bulkEmailBtn.disabled = true;
        notify(`✉️ Dispatching certificate emails to ${selectedRecords.length} skaters...`, "info");

        try {
          const envConfig = window.ENV_CONFIG || {};
          const sheetUrl = envConfig.sheetUrl || (typeof SHEET_URL !== 'undefined' ? SHEET_URL : '');

          for (const r of selectedRecords) {
            const certUrl = buildCertUrl({
              skaterName: r.skaterName,
              fatherName: r.fatherName,
              schoolClub: r.schoolClub,
              discipline: r.discipline,
              resultText: r.result || (r.rinkRace1 ? `🥇 ${r.rinkRace1} Position` : '🥇 GOLD MEDAL (1st Position)'),
              eventName: certSheetSelect ? certSheetSelect.value : "1st Winter Roller Skating Championship-2025",
              dateStr: new Date().toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })
            });

            await fetch(sheetUrl, {
              method: "POST",
              headers: { "Content-Type": "text/plain" },
              body: JSON.stringify({
                action: "send_certificate_email",
                email: r.email,
                skaterName: r.skaterName,
                eventName: certSheetSelect ? certSheetSelect.value : "1st Winter Roller Skating Championship-2025",
                certUrl
              })
            });
          }

          notify(`✓ Bulk email dispatch completed for ${selectedRecords.length} skaters!`, "success");
        } catch (e) {
          console.warn("[Bulk Email Cert Error]", e);
          notify(`✓ Bulk email dispatch completed!`, "success");
        } finally {
          bulkEmailBtn.disabled = false;
        }
      };
    }

    // Initial load
    fetchEventSheetRecords();
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

    container.innerHTML = folders.map((f, idx) => {
      const isArchived = f.enabled === false;
      const statusBadge = isArchived 
        ? `<span class="badge-status" style="background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.3);">📦 Archived</span>`
        : `<span class="badge-status status-live">🟢 Active</span>`;
      
      return `
      <div class="admin-item-card" style="margin-bottom:1rem; ${isArchived ? 'opacity:0.7;' : ''}">
        <div class="admin-item-info">
          <div style="display:flex; align-items:center; gap:0.6rem; margin-bottom:0.4rem; flex-wrap:wrap;">
            <span class="admin-item-title">${f.title}</span>
            <span class="badge-status status-live">${f.category || 'Gallery'}</span>
            ${statusBadge}
            <span style="font-size:0.75rem; color:#9ca3af; background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px;">Order: #${idx + 1}</span>
          </div>
          <div class="admin-item-sub">📅 ${f.date} · 📍 ${f.location} · Cloudinary Folder ID: <code style="font-weight:700; color:#38bdf8;">${f.folderId}</code></div>
          <div style="font-size:0.85rem; color:#d1d5db; margin-top:0.3rem;">${f.description || ''}</div>
        </div>
        <div class="admin-item-actions" style="display:flex; gap:0.4rem; flex-wrap:wrap;">
          <button type="button" class="btn-item-up" onclick="moveGalleryFolderItem(${idx}, -1)" title="Move Up in Gallery" ${idx === 0 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} aria-label="Move Up"><i class="fa-solid fa-arrow-up"></i></button>
          <button type="button" class="btn-item-down" onclick="moveGalleryFolderItem(${idx}, 1)" title="Move Down in Gallery" ${idx === folders.length - 1 ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''} aria-label="Move Down"><i class="fa-solid fa-arrow-down"></i></button>
          <button type="button" class="btn-item-edit" style="padding:0.4rem 0.6rem; font-size:0.85rem; background:${isArchived ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)'}; color:${isArchived ? '#34d399' : '#fbbf24'}; border:1px solid ${isArchived ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'};" onclick="toggleArchiveGalleryFolderItem(${idx})">
            ${isArchived ? '🟢 Enable' : '📦 Archive'}
          </button>
          <button type="button" class="btn-item-edit" style="padding:0.4rem 0.6rem; font-size:0.85rem;" onclick="editGalleryFolderItem(${idx})">✏️ Edit</button>
          <button type="button" class="btn-item-delete" style="padding:0.4rem 0.6rem; font-size:0.85rem;" onclick="deleteGalleryFolderItem(${idx})">🗑️ Delete</button>
        </div>
      </div>
    `;
    }).join("");
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
      await fetch(`${baseUrl}/api/save-gallery-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folders })
      });
      await fetch(`${baseUrl}/api/save-site-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gallery: { folders } })
      });
      notify("✓ Gallery folder order & archive settings saved globally for all website users!");
    } catch (e) {
      console.warn("Backend save gallery config warning:", e);
    }
  }

  window.moveGalleryFolderItem = function(idx, direction) {
    const folders = getAdminGalleryFolders();
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= folders.length) return;

    // Swap folders
    const temp = folders[idx];
    folders[idx] = folders[targetIdx];
    folders[targetIdx] = temp;

    // Update display order properties
    folders.forEach((f, i) => { f.displayOrder = i + 1; });

    persistAdminGalleryFolders(folders);
    renderAdminGalleryFolders();
    notify(`✓ Moved folder ${direction < 0 ? 'up' : 'down'} (New position: #${targetIdx + 1}).`);
  };

  window.toggleArchiveGalleryFolderItem = function(idx) {
    const folders = getAdminGalleryFolders();
    const f = folders[idx];
    if (!f) return;

    f.enabled = f.enabled === false ? true : false;
    persistAdminGalleryFolders(folders);
    renderAdminGalleryFolders();
    notify(f.enabled ? `✓ Folder "${f.title}" is now active and visible on gallery.` : `📦 Folder "${f.title}" has been archived/disabled.`);
  };

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
    folders.forEach((f, i) => { f.displayOrder = i + 1; });
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
        <div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); border-radius:8px; padding:0.55rem 0.8rem; margin-bottom:0.8rem; color:#93c5fd; font-size:0.8rem; display:flex; align-items:center; gap:0.5rem;">
          <i class="fa-solid fa-clock"></i> <span><strong>Default Site Timezone: IST (India Standard Time / UTC+05:30)</strong> — All deadlines, start &amp; end times operate in IST.</span>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Start Date &amp; Time</label><input type="datetime-local" id="mEvStartDT" value="${formatForDatetimeLocal(ev.startDateTime)}" /></div>
          <div class="form-group"><label>End Date &amp; Time</label><input type="datetime-local" id="mEvEndDT" value="${formatForDatetimeLocal(ev.endDateTime)}" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Registration Deadline <small style="font-weight:400; color:#9ca3af;">(Optional - Defaults to Event Date)</small></label><input type="datetime-local" id="mEvDeadline" value="${formatForDatetimeLocal(ev.deadline)}" placeholder="Defaults to Event Date" /></div>
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
        <div class="form-row" style="flex-wrap:wrap; gap:1.2rem;">
          <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
            <input type="checkbox" id="mEvShowTicker" ${ev.showOnTicker ? 'checked' : ''} />
            <span>Display on banner</span>
          </label>
          <label style="display:flex; align-items:center; gap:0.5rem; color:#fff; cursor:pointer;">
            <input type="checkbox" id="mEvShowDeadlineTicker" ${ev.showDeadlineOnTicker ? 'checked' : ''} />
            <span>Display Deadline on Ticker</span>
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
      let skinsuitConfig = {};
      if (window.LIVE_SITE_CONFIG) {
        if (Array.isArray(window.LIVE_SITE_CONFIG.skinsuits) && window.LIVE_SITE_CONFIG.skinsuits.length > 0) {
          skinsuitConfig = window.LIVE_SITE_CONFIG.skinsuits[0];
        } else if (window.LIVE_SITE_CONFIG.skinsuit) {
          skinsuitConfig = window.LIVE_SITE_CONFIG.skinsuit;
        }
      }
      if (!skinsuitConfig || !skinsuitConfig.frontImage) {
        const savedSkinsuit = localStorage.getItem("RSAM_ADMIN_SKINSUIT");
        if (savedSkinsuit) {
          try {
            const parsed = JSON.parse(savedSkinsuit);
            skinsuitConfig = Array.isArray(parsed) ? parsed[0] : parsed;
          } catch (e) {}
        }
      }
      if ((!skinsuitConfig || !skinsuitConfig.frontImage) && offObj.skinsuit) {
        skinsuitConfig = offObj.skinsuit;
      }
      skinsuitConfig = skinsuitConfig || {};

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
    itemModalForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (activeModalType === "event") {
        const events = getAdminEvents();
        const base = parseFloat(document.getElementById("mEvBaseFee").value) || 0;
        const gwPct = parseFloat(document.getElementById("mEvGwPct").value) || 2.0;
        const gstPct = parseFloat(document.getElementById("mEvGstPct").value) || 18.0;

        const isRegActive = document.getElementById("mEvActiveReg").checked;
        const isTickerShow = document.getElementById("mEvShowTicker").checked;
        const isShowDeadlineTicker = document.getElementById("mEvShowDeadlineTicker") ? document.getElementById("mEvShowDeadlineTicker").checked : false;
        const feeTypeVal = document.getElementById("mEvFeeType").value;

        let deadlineVal = document.getElementById("mEvDeadline").value.trim();
        const dateText = document.getElementById("mEvDateText") ? document.getElementById("mEvDateText").value.trim() : "";
        const startDT = document.getElementById("mEvStartDT") ? document.getElementById("mEvStartDT").value.trim() : "";
        if (!deadlineVal) {
          if (startDT) {
            const datePart = startDT.split('T')[0];
            deadlineVal = `${datePart}T23:59:59+05:30`;
          } else if (dateText) {
            deadlineVal = dateText;
          }
        } else if (!deadlineVal.includes('+') && !deadlineVal.includes('Z')) {
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
          showDeadlineOnTicker: isShowDeadlineTicker,
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
        persistSiteConfig({ events }, "Events");

        if (isRegActive) {
          const activeStr = JSON.stringify(newEvent);
          localStorage.setItem("RSAM_ADMIN_EVENT", activeStr);
          updateSessionBaselineKey("event", activeStr);
        }

        renderAdminEvents();
        notify("✓ Event updated in draft! Click 'Publish & Save All Changes' when ready to deploy to live site.", "success");
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
        persistSiteConfig({ news: items }, "Circulars");
        renderAdminNews();
        notify("✓ Circular saved in draft! Click 'Publish & Save All Changes' when ready to deploy.", "success");
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
        persistSiteConfig({ highlights: items }, "Highlights");
        renderAdminHighlights();
        notify("✓ Highlight saved in draft! Click 'Publish & Save All Changes' when ready to deploy.", "success");
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
        persistSiteConfig({ officials: items }, "Officials");
        renderAdminOfficials();
        notify("✓ Official saved in draft! Click 'Publish & Save All Changes' when ready to deploy.", "success");
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
        persistSiteConfig({ skinsuits: [skinsuitConfig], skinsuit: skinsuitConfig }, "Skinsuit");
        if (typeof window.renderCertificate === 'function') {
          window.renderCertificate();
        }
        notify("✓ Official Skinsuit design saved in draft! Click 'Publish & Save All Changes' when ready to deploy.", "success");
      }
 else if (activeModalType === "galleryFolder") {
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
        persistSiteConfig({ gallery: { folders } }, "Gallery");
        renderAdminGalleryFolders();
        notify("✓ Photo Gallery Folder saved in draft! Click 'Publish & Save All Changes' when ready to deploy.", "success");
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

  const batchPublishBtn = document.getElementById("batchPublishBtn");
  if (batchPublishBtn) {
    batchPublishBtn.addEventListener("click", () => {
      notify("⏳ Publishing all session changes to GitHub in 1 commit...", "info");
      publishAllSiteConfigBatch();
    });
  }

  const batchDiscardBtn = document.getElementById("batchDiscardBtn");
  if (batchDiscardBtn) {
    batchDiscardBtn.addEventListener("click", () => {
      if (confirm("Discard all pending unsaved edits in this session? Your saved dashboard state will be restored.")) {
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
        unsavedTabsSet.clear();
        hasUnsavedEdits = false;
        const batchBar = document.getElementById("adminBatchBar");
        if (batchBar) {
          batchBar.hidden = true;
          batchBar.style.display = "none";
        }
        initDashboard();
        notify("✓ Pending session drafts discarded.");
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

  // ── Direct UPI Payment Approvals & Verification ──
  let cachedPaymentsData = null;
  let activePaymentFilter = "all";
  let activePaymentEventFilter = "all";

  try {
    const savedOverrides = localStorage.getItem("RSAM_PAYMENT_STATUS_OVERRIDES");
    window.RSAM_PAYMENT_STATUS_OVERRIDES = savedOverrides ? JSON.parse(savedOverrides) : (window.RSAM_PAYMENT_STATUS_OVERRIDES || {});
  } catch (e) {
    window.RSAM_PAYMENT_STATUS_OVERRIDES = window.RSAM_PAYMENT_STATUS_OVERRIDES || {};
  }

  function getDirectImageUrl(url) {
    if (!url || url === "—" || url === "N/A") return "";
    url = String(url).trim();
    let fileId = "";
    const match1 = url.match(/\/file\/d\/([^\/]+)/);
    if (match1) fileId = match1[1];
    const match2 = url.match(/[?&]id=([^&]+)/);
    if (!fileId && match2) fileId = match2[1];

    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}=s1200`;
    }
    return url;
  }

  async function renderAdminPayments() {
    const tableWrap = document.getElementById("paymentsListTableWrap");
    const badgeEl = document.getElementById("badgePayments");
    if (!tableWrap) return;

    tableWrap.innerHTML = `<p style="text-align:center; color:#60a5fa; padding:2rem;">⏳ Loading payment records from Google Sheet...</p>`;

    let fetched = false;
    let sheetsData = [];

    // 1. Try Express backend API first
    const baseUrl = getAdminApiBaseUrl();
    try {
      const res = await fetch(`${baseUrl}/api/fetch-contacts`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.status === "ok" && Array.isArray(data.sheets)) {
          sheetsData = data.sheets;
          fetched = true;
        }
      }
    } catch (e) {}

    // 2. Fallback to direct Apps Script URL
    if (!fetched) {
      try {
        const sheetUrl = (window.ENV_CONFIG && window.ENV_CONFIG.sheetUrl) || "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
        const res = await fetch(`${sheetUrl}?action=fetch_all_contacts`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.sheets) {
            sheetsData = data.sheets;
            fetched = true;
          }
        }
      } catch (e) {}
    }

    cachedPaymentsData = sheetsData;

    // Populate Event Dropdown Filter dynamically
    const evtFilterSelect = document.getElementById("paymentEventFilterSelect");
    if (evtFilterSelect && sheetsData.length > 0) {
      const curVal = activePaymentEventFilter || "all";
      evtFilterSelect.innerHTML = `<option value="all"${curVal === 'all' ? ' selected' : ''}>🎟️ All Event Sheets &amp; Annual Registrations</option>` +
        sheetsData.map(s => `<option value="${escapeHTML(s.sheetName)}"${s.sheetName === curVal ? ' selected' : ''}>🎟️ ${escapeHTML(s.sheetName)} (${s.count} skaters)</option>`).join('');

      evtFilterSelect.onchange = () => {
        activePaymentEventFilter = evtFilterSelect.value;
        renderAdminPayments();
      };
    }

    let allRecords = [];
    sheetsData.forEach(s => {
      const isRegSheet = s.sheetName.toLowerCase().includes("registrations");
      (s.records || []).forEach(r => {
        allRecords.push({
          ...r,
          sheetName: s.sheetName,
          isAnnualReg: isRegSheet
        });
      });
    });

    // Apply local memory & localStorage overrides so actions update instantly without waiting for sheet sync
    allRecords.forEach(r => {
      const key = r.regNumber || r.registrationNo || r.eventRegNo || r.rsamRegNo;
      if (key && window.RSAM_PAYMENT_STATUS_OVERRIDES[key]) {
        r.paymentStatus = window.RSAM_PAYMENT_STATUS_OVERRIDES[key];
        r.status = window.RSAM_PAYMENT_STATUS_OVERRIDES[key];
      }
    });

    window.RSAM_ALL_PAYMENT_RECORDS = allRecords;

    // 1. Filter by Event Sheet first for pill counts & table
    const sheetFilteredRecords = allRecords.filter(r => {
      if (activePaymentEventFilter !== "all" && r.sheetName !== activePaymentEventFilter) {
        return false;
      }
      return true;
    });

    // Update filter counts based on selected event sheet
    let cntPending = 0, cntVerified = 0, cntRejected = 0;
    sheetFilteredRecords.forEach(r => {
      const st = String(r.paymentStatus || r.status || '').toUpperCase();
      if (st.includes('PENDING') || st === 'UPI_PENDING' || st === 'APPROVAL_PENDING') cntPending++;
      else if (st === 'REJECTED' || st === 'DECLINED') cntRejected++;
      else cntVerified++;
    });

    const cntAllEl = document.getElementById("cntFilterAll");
    const cntPendingEl = document.getElementById("cntFilterPending");
    const cntVerifiedEl = document.getElementById("cntFilterVerified");
    const cntRejectedEl = document.getElementById("cntFilterRejected");

    if (cntAllEl) cntAllEl.textContent = sheetFilteredRecords.length;
    if (cntPendingEl) cntPendingEl.textContent = cntPending;
    if (cntVerifiedEl) cntVerifiedEl.textContent = cntVerified;
    if (cntRejectedEl) cntRejectedEl.textContent = cntRejected;

    if (badgeEl) {
      badgeEl.textContent = cntPending;
      badgeEl.style.background = cntPending > 0 ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.2)";
      badgeEl.style.color = cntPending > 0 ? "#fbbf24" : "#34d399";
    }

    // 2. Filter records by Status Filter
    let filteredRecords = sheetFilteredRecords.filter(r => {
      const st = String(r.paymentStatus || r.status || '').toUpperCase();
      if (activePaymentFilter === "PENDING_APPROVAL") {
        return st.includes('PENDING') || st === 'UPI_PENDING' || st === 'APPROVAL_PENDING';
      }
      if (activePaymentFilter === "VERIFIED") {
        return st === 'VERIFIED' || st === 'SUCCESS' || st === 'PAID' || st === 'WAIVED';
      }
      if (activePaymentFilter === "REJECTED") {
        return st === 'REJECTED' || st === 'DECLINED';
      }
      return true; // 'all'
    });

    if (!filteredRecords.length) {
      tableWrap.innerHTML = `
        <div style="text-align:center; padding:3rem 1.5rem; color:#9ca3af;">
          <div style="font-size:2.5rem; margin-bottom:0.5rem;">💳</div>
          <h4 style="color:#f3f4f6; margin:0 0 0.4rem 0;">No Payment Records Found</h4>
          <p style="margin:0; font-size:0.88rem;">No skater registrations match the selected event sheet (${activePaymentEventFilter}) and filter category (${activePaymentFilter}).</p>
        </div>
      `;
      return;
    }

    let rowsHTML = '';
    filteredRecords.forEach((r, idx) => {
      const rawSt = String(r.paymentStatus || r.status || '').toUpperCase();
      const isPending = rawSt.includes('PENDING') || rawSt === 'UPI_PENDING' || rawSt === 'APPROVAL_PENDING';
      const isRejected = rawSt === 'REJECTED' || rawSt === 'DECLINED';
      
      let statusBadgeHTML = isPending
        ? `<span style="background:rgba(245,158,11,0.18); color:#fbbf24; border:1px solid rgba(245,158,11,0.4); padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-clock"></i> Pending Approval</span>`
        : (isRejected 
          ? `<span style="background:rgba(239,68,68,0.18); color:#f87171; border:1px solid rgba(239,68,68,0.4); padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-circle-xmark"></i> Rejected</span>`
          : `<span style="background:rgba(16,185,129,0.18); color:#34d399; border:1px solid rgba(16,185,129,0.4); padding:3px 8px; border-radius:12px; font-size:0.75rem; font-weight:700;"><i class="fa-solid fa-circle-check"></i> Approved / Paid</span>`);

      const regNo = r.regNumber || r.registrationNo || r.eventRegNo || `R26-${idx+1}`;
      const name = r.skaterName || r.name || 'Athlete';
      const mob = r.mobile || r.phone || 'N/A';

      const rawUtr = r.upiUtr || r.utr || r.paymentId || r.payId || r.razorpayPaymentId || '';
      let utrVal = String(rawUtr).trim();
      if (utrVal.startsWith('UPI_')) utrVal = utrVal.slice(4);
      if (utrVal.startsWith('pay_')) utrVal = utrVal.slice(4);
      if (!utrVal || utrVal === '—' || utrVal === 'N/A' || utrVal === 'pending' || utrVal === 'pay_pending') utrVal = 'N/A';

      const amt = r.amountPaid ? `₹${r.amountPaid}` : '₹500.00';
      const screenshot = r.paymentScreenshot || r.screenshotUrl || r.paymentProof || '';

      let cleanAgeGroup = r.ageGroup || 'N/A';
      if (!cleanAgeGroup || cleanAgeGroup.includes('GMT') || cleanAgeGroup.includes('Standard Time') || cleanAgeGroup.length > 20 || /^\w{3} \w{3}/.test(cleanAgeGroup)) {
        const numAge = Number(r.age);
        if (!isNaN(numAge) && numAge > 0) {
          if (numAge < 6) cleanAgeGroup = "Under 6";
          else if (numAge < 8) cleanAgeGroup = "6-8";
          else if (numAge < 10) cleanAgeGroup = "8-10";
          else if (numAge < 12) cleanAgeGroup = "10-12";
          else if (numAge < 15) cleanAgeGroup = "12-15";
          else if (numAge < 18) cleanAgeGroup = "15-18";
          else cleanAgeGroup = "Above-18";
        } else {
          cleanAgeGroup = "6-8";
        }
      }

      rowsHTML += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.06); transition:background 0.2s;">
          <td style="padding:0.55rem 0.75rem; color:#60a5fa; font-weight:700; font-size:0.85rem; white-space:nowrap;">
            ${regNo}
          </td>
          <td style="padding:0.55rem 0.75rem;">
            <strong style="color:#fff; display:block; font-size:0.88rem;">${escapeHTML(name)}</strong>
            <small style="color:#9ca3af; font-size:0.78rem;"><i class="fa-solid fa-phone" style="font-size:0.7rem;"></i> ${mob}</small>
          </td>
          <td style="padding:0.55rem 0.75rem; color:#d1d5db; font-size:0.82rem;">
            ${escapeHTML(r.discipline || 'Skating')}
            <div style="font-size:0.72rem; color:#9ca3af;">${cleanAgeGroup}</div>
          </td>
          <td style="padding:0.55rem 0.75rem; font-size:0.82rem;">
            <strong style="color:#34d399; font-size:0.88rem; display:block;">${amt}</strong>
            <div style="font-size:0.75rem; color:#60a5fa; font-weight:600; font-family:monospace; margin-top:1px;">UTR: ${escapeHTML(utrVal)}</div>
          </td>
          <td style="padding:0.55rem 0.75rem; text-align:center;">
            ${screenshot && screenshot !== '—' ? `
              <button type="button" class="btn-dash-action view-screenshot-btn" data-img="${encodeURIComponent(screenshot)}" style="font-size:0.75rem; padding:3px 8px; background:rgba(59,130,246,0.15); color:#93c5fd; border:1px solid rgba(59,130,246,0.3);">
                <i class="fa-solid fa-receipt"></i> View Receipt
              </button>
            ` : `<span style="color:#6b7280; font-size:0.75rem;">No Image</span>`}
          </td>
          <td style="padding:0.55rem 0.75rem; text-align:center;">
            ${statusBadgeHTML}
          </td>
          <td style="padding:0.55rem 0.75rem; text-align:right; white-space:nowrap;">
            ${isPending ? `
              <button type="button" class="approve-payment-btn" data-reg="${regNo}" data-sheet="${r.sheetName}" style="background:#10b981; color:#fff; border:none; padding:4px 10px; border-radius:6px; font-weight:700; font-size:0.78rem; cursor:pointer; margin-right:4px;">
                <i class="fa-solid fa-check"></i> Approve
              </button>
              <button type="button" class="reject-payment-btn" data-reg="${regNo}" data-sheet="${r.sheetName}" style="background:rgba(239,68,68,0.2); color:#f87171; border:1px solid rgba(239,68,68,0.4); padding:4px 8px; border-radius:6px; font-weight:600; font-size:0.78rem; cursor:pointer;">
                <i class="fa-solid fa-xmark"></i> Reject
              </button>
            ` : (isRejected ? `
              <button type="button" class="approve-payment-btn" data-reg="${regNo}" data-sheet="${r.sheetName}" style="background:rgba(16,185,129,0.2); color:#34d399; border:1px solid rgba(16,185,129,0.4); padding:4px 8px; border-radius:6px; font-weight:600; font-size:0.75rem; cursor:pointer;">
                <i class="fa-solid fa-rotate-left"></i> Re-Approve
              </button>
            ` : `
              <span style="color:#34d399; font-size:0.78rem; font-weight:600;"><i class="fa-solid fa-check-double"></i> Pass Issued</span>
            `)}
          </td>
        </tr>
      `;
    });

    tableWrap.style.maxHeight = "480px";
    tableWrap.style.overflowY = "auto";
    tableWrap.style.borderRadius = "10px";
    tableWrap.style.border = "1px solid rgba(255,255,255,0.1)";

    tableWrap.innerHTML = `
      <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.85rem; position:relative;">
        <thead>
          <tr style="background:#0f172a; position:sticky; top:0; z-index:10; border-bottom:1.5px solid rgba(255,255,255,0.12); color:#9ca3af; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.05em; box-shadow:0 2px 4px rgba(0,0,0,0.3);">
            <th style="padding:0.6rem 0.75rem; background:#0f172a;">Reg. ID</th>
            <th style="padding:0.6rem 0.75rem; background:#0f172a;">Athlete &amp; Contact</th>
            <th style="padding:0.6rem 0.75rem; background:#0f172a;">Event / Category</th>
            <th style="padding:0.6rem 0.75rem; background:#0f172a;">Amount &amp; UTR</th>
            <th style="padding:0.6rem 0.75rem; text-align:center; background:#0f172a;">Screenshot</th>
            <th style="padding:0.6rem 0.75rem; text-align:center; background:#0f172a;">Payment Status</th>
            <th style="padding:0.6rem 0.75rem; text-align:right; background:#0f172a;">Admin Action</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHTML}
        </tbody>
      </table>
    `;

    // Bind screenshot lightbox buttons
    document.querySelectorAll(".view-screenshot-btn").forEach(btn => {
      btn.onclick = () => {
        const rawImg = decodeURIComponent(btn.getAttribute("data-img") || "");
        const directImg = getDirectImageUrl(rawImg);
        const lightboxModal = document.getElementById("screenshotLightboxModal");
        const lightboxImg = document.getElementById("lightboxImg");
        const lightboxOriginalLink = document.getElementById("lightboxOriginalLink");
        if (lightboxModal && lightboxImg) {
          lightboxImg.src = directImg || rawImg;
          if (lightboxOriginalLink) {
            lightboxOriginalLink.href = rawImg;
            lightboxOriginalLink.style.display = rawImg ? "inline-flex" : "none";
          }
          lightboxModal.hidden = false;
        }
      };
    });

    // Bind Approve payment buttons
    document.querySelectorAll(".approve-payment-btn").forEach(btn => {
      btn.onclick = (e) => {
        if (e) e.preventDefault();
        const regNo = btn.getAttribute("data-reg");
        const sheetName = btn.getAttribute("data-sheet");
        if (!confirm(`Approve payment for Registration ${regNo}? This will mark status as VERIFIED and issue the WhatsApp Confirmation & Chest Number.`)) return;

        const rec = (window.RSAM_ALL_PAYMENT_RECORDS || []).find(r => 
          (r.regNumber || r.registrationNo || r.eventRegNo || r.rsamRegNo) === regNo && (!sheetName || r.sheetName === sheetName)
        ) || {};

        // 1. Mark in local memory & localStorage overrides immediately so UI updates instantly (<10ms)
        window.RSAM_PAYMENT_STATUS_OVERRIDES[regNo] = 'VERIFIED';
        try {
          localStorage.setItem("RSAM_PAYMENT_STATUS_OVERRIDES", JSON.stringify(window.RSAM_PAYMENT_STATUS_OVERRIDES));
        } catch(err) {}
        rec.paymentStatus = 'VERIFIED';
        rec.status = 'VERIFIED';

        // 2. Immediately re-render payments list table so admin can move to the next item right away!
        renderAdminPayments();
        notify(`✓ Payment for ${regNo} marked as VERIFIED! Syncing with sheet in background...`);

        // 3. Sync payment status update with Google Sheet FIRST, then trigger WhatsApp notification
        const scriptUrl = (window.ENV_CONFIG && window.ENV_CONFIG.sheetUrl) || "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
        fetch(`${scriptUrl}?action=update_payment_status&regNumber=${encodeURIComponent(regNo)}&sheetName=${encodeURIComponent(sheetName || rec.sheetName || '')}&paymentStatus=VERIFIED&skaterName=${encodeURIComponent(rec.skaterName || rec.name || '')}`)
          .then(() => {
            const baseUrl = getAdminApiBaseUrl();
            return fetch(`${baseUrl}/api/approve-payment`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                regNumber: regNo,
                sheetName: sheetName || rec.sheetName,
                action: "approve",
                skaterName: rec.skaterName || rec.name || 'Athlete',
                mobile: rec.mobile || rec.phone || '',
                coachMobile: rec.coachMobile || '',
                coachName: rec.coachName || '',
                eventName: rec.eventName || rec.eventTitle || sheetName || 'District Championship 2026',
                eventRegNo: rec.eventRegNo || rec.chestNo || (regNo ? String(100 + (Number(String(regNo).replace(/\D/g, "").slice(-3)) % 900)) : '100'),
                discipline: rec.discipline || '',
                ageGroup: rec.ageGroup || cleanAgeGroup || '',
                schoolClub: rec.schoolClub || '',
                dob: rec.dob || '',
                email: rec.email || ''
              })
            });
          })
          .catch((err) => console.warn("[Admin Payment Approval Sync Error]", err));
      };
    });

    // Bind Reject payment buttons
    document.querySelectorAll(".reject-payment-btn").forEach(btn => {
      btn.onclick = (e) => {
        if (e) e.preventDefault();
        const regNo = btn.getAttribute("data-reg");
        const sheetName = btn.getAttribute("data-sheet");
        const rec = (window.RSAM_ALL_PAYMENT_RECORDS || []).find(r => 
          (r.regNumber || r.registrationNo || r.eventRegNo || r.rsamRegNo) === regNo && (!sheetName || r.sheetName === sheetName)
        ) || {};

        const skaterName = rec.skaterName || rec.name || 'Athlete';
        const reason = prompt(`Reject payment for ${skaterName} (${regNo})?\n\nEnter rejection reason / note for athlete (sent over WhatsApp):`, "Invalid UTR / Payment mismatch");
        if (reason === null) return;

        // 1. Mark in local memory & localStorage overrides immediately so UI updates instantly (<10ms)
        window.RSAM_PAYMENT_STATUS_OVERRIDES[regNo] = 'REJECTED';
        try {
          localStorage.setItem("RSAM_PAYMENT_STATUS_OVERRIDES", JSON.stringify(window.RSAM_PAYMENT_STATUS_OVERRIDES));
        } catch(err) {}
        rec.paymentStatus = 'REJECTED';
        rec.status = 'REJECTED';

        // 2. Immediately re-render payments list table so admin can move to the next item right away!
        renderAdminPayments();
        notify(`🔴 Payment for ${regNo} marked as REJECTED. Syncing in background...`);

        // 3. Issue background requests asynchronously without blocking UI
        const scriptUrl = (window.ENV_CONFIG && window.ENV_CONFIG.sheetUrl) || "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
        fetch(`${scriptUrl}?action=update_payment_status&regNumber=${encodeURIComponent(regNo)}&sheetName=${encodeURIComponent(sheetName || rec.sheetName || '')}&paymentStatus=REJECTED&skaterName=${encodeURIComponent(skaterName)}`, { mode: 'no-cors' }).catch(() => {});

        try {
          const baseUrl = getAdminApiBaseUrl();
          fetch(`${baseUrl}/api/approve-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              regNumber: regNo, 
              sheetName: sheetName || rec.sheetName, 
              action: "reject", 
              rejectReason: reason,
              skaterName: skaterName,
              mobile: rec.mobile || rec.phone || '',
              eventName: rec.eventName || rec.eventTitle || sheetName || 'District Championship 2026'
            })
          }).catch(() => {});
        } catch (e) {}
      };
    });
  }

  const filterTrack = document.getElementById("paymentFilterTrack");
  if (filterTrack) {
    filterTrack.querySelectorAll(".btn-filter-status").forEach(btn => {
      btn.onclick = () => {
        filterTrack.querySelectorAll(".btn-filter-status").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        activePaymentFilter = btn.getAttribute("data-filter") || "all";
        renderAdminPayments();
      };
    });
  }

  const refreshPaymentsBtn = document.getElementById("refreshPaymentsBtn");
  if (refreshPaymentsBtn) {
    refreshPaymentsBtn.onclick = () => renderAdminPayments();
  }

  async function handleGenerateChestNumbersPdf() {
    let allRecords = window.RSAM_ALL_PAYMENT_RECORDS || [];
    
    // Fallback to cached certificate sheets if payment records empty
    if ((!allRecords || allRecords.length === 0) && window.RSAM_CACHED_SHEETS && Array.isArray(window.RSAM_CACHED_SHEETS)) {
      allRecords = window.RSAM_CACHED_SHEETS.flatMap(s => (s.records || []).map(r => ({ ...r, sheetName: s.sheetName })));
    }

    // Auto-fetch if still uninitialized
    if (!allRecords || allRecords.length === 0) {
      notify("⏳ Fetching skater registration records for chest numbers PDF...", "info");
      const baseUrl = getAdminApiBaseUrl();
      try {
        const res = await fetch(`${baseUrl}/api/fetch-contacts`);
        if (res.ok) {
          const data = await res.json();
          if (data && Array.isArray(data.sheets) && data.sheets.length > 0) {
            window.RSAM_CACHED_SHEETS = data.sheets;
            allRecords = data.sheets.flatMap(s => (s.records || []).map(r => ({ ...r, sheetName: s.sheetName })));
          }
        }
      } catch (e) {
        console.warn("[Chest Numbers Fetch Error]", e);
      }
    }

    const activeFilter = window.activePaymentEventFilter || "all";
    const certSelect = document.getElementById("certSheetSelect");
    const certSelectedSheet = certSelect ? certSelect.value : "";
    
    let targetRecords = [];
    let eventTitle = "Roller Skating Championship 2026";

    if (activeFilter !== "all") {
      targetRecords = allRecords.filter(r => r.sheetName === activeFilter);
      eventTitle = activeFilter;
    } else if (certSelectedSheet) {
      targetRecords = allRecords.filter(r => r.sheetName === certSelectedSheet || (r.sheetName && r.sheetName.includes(certSelectedSheet)));
      eventTitle = certSelectedSheet;
    }

    if (!targetRecords || targetRecords.length === 0) {
      targetRecords = allRecords;
    }
    
    if (!targetRecords || targetRecords.length === 0) {
      alert("No registration records found to generate chest numbers. Please click 'Fetch Payments' or 'Fetch Event Skaters & Results' first.");
      return;
    }

    // Sort records by chest number / registration number if possible
    targetRecords.sort((a, b) => {
      const numA = parseInt(String(a.eventRegNo || a.chestNo || a.regNumber || 0).replace(/\D/g, ''), 10);
      const numB = parseInt(String(b.eventRegNo || b.chestNo || b.regNumber || 0).replace(/\D/g, ''), 10);
      return numA - numB;
    });

    // Prompt user for number of extra blank / dummy chest numbers to generate
    const promptAns = prompt(
      `🎽 Chest Numbers PDF Generator — ${eventTitle}\n\nRegistered Skaters: ${targetRecords.length}\n\nHow many extra BLANK / DUMMY chest numbers would you like to generate?\n(Enter a number like 4 or 8 to create extra blank cards for writing names by hand later, or 0 for none):`,
      "0"
    );
    if (promptAns === null) return; // User cancelled prompt

    let dummyCount = parseInt(promptAns.trim(), 10);
    if (isNaN(dummyCount) || dummyCount < 0) dummyCount = 0;

    // Calculate maximum existing chest number to prevent any overlapping
    let maxChestNum = 99;
    targetRecords.forEach((r, idx) => {
      const rawVal = r.eventRegNo || r.chestNo || r.chestNumber || String(100 + idx);
      const num = parseInt(String(rawVal).replace(/\D/g, ''), 10);
      if (!isNaN(num) && num > maxChestNum) {
        maxChestNum = num;
      }
    });

    // Create shallow copy of records to append dummy chest numbers without mutating global caches
    const pdfRecords = [...targetRecords];

    for (let k = 1; k <= dummyCount; k++) {
      const dummyChestNum = String(maxChestNum + k);
      pdfRecords.push({
        eventRegNo: dummyChestNum,
        chestNo: dummyChestNum,
        skaterName: "",
        isDummy: true
      });
    }

    const win = window.open("", "_blank");
    if (!win) {
      alert("Pop-up blocker prevented opening Chest Numbers PDF. Please allow pop-ups for this site.");
      return;
    }

    let pagesHTML = '';
    for (let i = 0; i < pdfRecords.length; i += 4) {
      const group = pdfRecords.slice(i, i + 4);
      pagesHTML += `
        <div class="chest-page">
          <!-- Paper Knife Grid Crop Marks (Edge ticks for ruler alignment) -->
          <div class="crop-mark crop-v-top"></div>
          <div class="crop-mark crop-v-bottom"></div>
          <div class="crop-mark crop-h-left"></div>
          <div class="crop-mark crop-h-right"></div>
          <div class="crop-mark crop-tl-h"></div>
          <div class="crop-mark crop-tl-v"></div>
          <div class="crop-mark crop-tr-h"></div>
          <div class="crop-mark crop-tr-v"></div>
          <div class="crop-mark crop-bl-h"></div>
          <div class="crop-mark crop-bl-v"></div>
          <div class="crop-mark crop-br-h"></div>
          <div class="crop-mark crop-br-v"></div>

          <div class="chest-grid">
      `;

      for (let g = 0; g < 4; g++) {
        if (g < group.length) {
          const r = group[g];
          const chestNum = r.eventRegNo || r.chestNo || r.chestNumber || String(100 + (i + g));
          const skaterName = r.isDummy ? '' : (r.skaterName || r.name || 'Athlete');
          const nameHTML = r.isDummy 
            ? `<div class="skater-name-dummy">&nbsp;</div>`
            : `<div class="skater-name">${escapeHTML(skaterName)}</div>`;

          pagesHTML += `
            <div class="chest-card">
              <div style="width:100%;">
                <div class="event-badge">${escapeHTML(eventTitle)}</div>
                <div class="chest-number">${escapeHTML(chestNum)}</div>
              </div>
              <div style="width:100%; margin-top: auto;">
                ${nameHTML}
                <div class="association-footer">
                  Roller Sports Association Moradabad
                </div>
              </div>
            </div>
          `;
        } else {
          pagesHTML += `<div class="chest-card" style="visibility: hidden;"></div>`;
        }
      }

      pagesHTML += `</div></div>`;
    }

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Printable Chest Numbers — ${escapeHTML(eventTitle)}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;800;900&display=swap');
          * { box-sizing: border-box; margin: 0; padding: 0; }
          @page {
            size: A4 landscape;
            margin: 6mm;
          }
          body {
            font-family: 'Outfit', sans-serif;
            background: #cbd5e1;
            color: #111827;
            padding: 10px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print-bar {
            background: #1e293b;
            color: #fff;
            padding: 12px 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          }
          .btn-print {
            background: #2563eb;
            color: #fff;
            border: none;
            padding: 10px 22px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 14px;
            cursor: pointer;
            box-shadow: 0 2px 6px rgba(37,99,235,0.3);
            transition: all 0.2s ease;
          }
          .btn-print:hover {
            background: #1d4ed8;
          }

          /* Container for each page (4 chest numbers per A4 landscape page in 2x2 grid) */
          .chest-page {
            position: relative;
            width: 100%;
            height: 192mm;
            background: #ffffff;
            padding: 7mm;
            margin-bottom: 25px;
            page-break-after: always;
            box-sizing: border-box;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          .chest-page:last-child {
            page-break-after: auto;
            margin-bottom: 0;
          }

          /* 2x2 Grid Container */
          .chest-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 8mm;
            width: 100%;
            height: 100%;
          }

          /* Individual Chest Card Cell in 2x2 grid with Prominent Solid Border */
          .chest-card {
            border: 4px solid #1e3a8a;
            border-radius: 12px;
            padding: 10px 14px;
            text-align: center;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
            background: #ffffff;
            overflow: hidden;
            height: 100%;
          }

          .event-badge {
            font-size: 11px;
            font-weight: 800;
            color: #dc2626;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1;
            margin-bottom: 2px;
          }
          .chest-number {
            font-size: 200px; /* Huge 200px triple-digit font size for maximum far-away visibility */
            font-weight: 900;
            color: #0f172a;
            line-height: 0.8;
            letter-spacing: -5px;
            margin: 0;
            padding: 0;
          }
          .skater-name {
            font-size: 28px; /* High-visibility 28px skater name font size */
            font-weight: 900;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            line-height: 1.1;
            word-break: break-word;
            max-height: 64px;
            overflow: hidden;
          }
          .skater-name-dummy {
            min-height: 32px;
            visibility: hidden;
          }
          .association-footer {
            border-top: 1.5px solid #e2e8f0;
            width: 100%;
            padding-top: 4px;
            margin-top: 4px;
            font-size: 10px;
            font-weight: 800;
            color: #1e3a8a;
            letter-spacing: 0.5px;
            text-transform: uppercase;
          }

          /* Paper Knife Cut Marks (Solid black tick marks at sheet edges for ruler alignment) */
          .crop-mark {
            position: absolute;
            background: #000000;
            pointer-events: none;
            z-index: 30;
          }
          /* Vertical knife cut marks (Top & Bottom center line) */
          .crop-v-top {
            top: 0; left: 50%;
            width: 2px; height: 6mm;
            transform: translateX(-50%);
          }
          .crop-v-bottom {
            bottom: 0; left: 50%;
            width: 2px; height: 6mm;
            transform: translateX(-50%);
          }
          /* Horizontal knife cut marks (Left & Right center line) */
          .crop-h-left {
            top: 50%; left: 0;
            width: 6mm; height: 2px;
            transform: translateY(-50%);
          }
          .crop-h-right {
            top: 50%; right: 0;
            width: 6mm; height: 2px;
            transform: translateY(-50%);
          }
          /* 4 Outer Corner Knife Cut Marks */
          .crop-tl-h { top: 7mm; left: 0; width: 6mm; height: 2px; }
          .crop-tl-v { top: 0; left: 7mm; width: 2px; height: 6mm; }

          .crop-tr-h { top: 7mm; right: 0; width: 6mm; height: 2px; }
          .crop-tr-v { top: 0; right: 7mm; width: 2px; height: 6mm; }

          .crop-bl-h { bottom: 7mm; left: 0; width: 6mm; height: 2px; }
          .crop-bl-v { bottom: 0; left: 7mm; width: 2px; height: 6mm; }

          .crop-br-h { bottom: 7mm; right: 0; width: 6mm; height: 2px; }
          .crop-br-v { bottom: 0; right: 7mm; width: 2px; height: 6mm; }

          @media print {
            .no-print-bar { display: none !important; }
            body { background: #fff; padding: 0; margin: 0; }
            .chest-page {
              margin-bottom: 0;
              height: 196mm;
              padding: 6mm;
              page-break-after: always;
              box-shadow: none;
            }
            .chest-page:last-child {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div>
            <strong>🎽 Printable Chest Numbers PDF (4 Cards / A4 Landscape)</strong> — ${escapeHTML(eventTitle)} (${targetRecords.length} Skaters)
          </div>
          <button class="btn-print" onclick="window.print()">🖨️ Print / Save PDF (Landscape A4)</button>
        </div>
        ${pagesHTML}
      </body>
      </html>
    `);
    win.document.close();
  }

  document.querySelectorAll(".btn-generate-chest-pdf, #generateChestNumbersPdfBtn, #generateChestNumbersPdfBtnCert").forEach(btn => {
    btn.onclick = handleGenerateChestNumbersPdf;
  });

  const closeLightboxBtn = document.getElementById("closeLightboxBtn");
  if (closeLightboxBtn) {
    closeLightboxBtn.onclick = () => {
      const lightboxModal = document.getElementById("screenshotLightboxModal");
      if (lightboxModal) lightboxModal.hidden = true;
    };
  }

  // Global ESC key listener to dismiss open modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      const itemModal = document.getElementById("itemModal");
      if (itemModal && !itemModal.hidden) closeModal();
    }
  });
});
