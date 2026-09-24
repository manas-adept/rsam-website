/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   event-register.js
   Event Registration & Verification Logic for 4th District Championship 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const getEvtEnv = () => window.ENV_CONFIG || {
  sheetUrl: "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec",
  backendUrl: "http://localhost:3001",
  openwaServerUrl: "http://localhost:3001/send-registration",
  razorpayKey: "rzp_test_TZa1vfjhrPJobv"
};
const SHEET_URL = getEvtEnv().sheetUrl;
const BACKEND_DOMAIN = getEvtEnv().backendUrl;
const OPENWA_SERVER_URL = getEvtEnv().openwaServerUrl;
const OPENWA_API_KEY    = "rsam_whatsapp_secret_key_2026";
const RAZORPAY_KEY_ID   = getEvtEnv().razorpayKey;

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

function getActiveEventConfig() {
  if (window.LIVE_SITE_CONFIG && Array.isArray(window.LIVE_SITE_CONFIG.events)) {
    const active = window.LIVE_SITE_CONFIG.events.find(e => e.isRegistrationActive);
    if (active) return active;
  }
  const savedEvents = localStorage.getItem("RSAM_ADMIN_EVENTS");
  if (savedEvents) {
    try {
      const list = JSON.parse(savedEvents);
      const active = list.find(e => e.isRegistrationActive);
      if (active) return active;
    } catch (e) {}
  }
  const saved = localStorage.getItem("RSAM_ADMIN_EVENT");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return (window.ADMIN_CONFIG && window.ADMIN_CONFIG.activeEvent) || {
    title: "Championship Event",
    year: "2026",
    baseFee: 500.00,
    gatewayPercent: 2.0,
    gstPercent: 18.0
  };
}

function cleanDob(dobStr) {
  if (!dobStr) return 'N/A';
  let s = String(dobStr).trim();
  if (s.includes('T')) s = s.split('T')[0];
  if (s.includes(' ')) s = s.split(' ')[0];
  return s;
}

function formatDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}

const activeEvConfig     = getActiveEventConfig();
const BASE_FEE           = activeEvConfig.baseFee !== undefined ? parseFloat(activeEvConfig.baseFee) : 500.00;
const GATEWAY_CHARGE     = parseFloat(((BASE_FEE * (parseFloat(activeEvConfig.gatewayPercent) || 2.0)) / 100).toFixed(2));
const GST_CHARGE         = parseFloat(((GATEWAY_CHARGE * (parseFloat(activeEvConfig.gstPercent) || 18.0)) / 100).toFixed(2));
const TOTAL_AMOUNT       = parseFloat((BASE_FEE + GATEWAY_CHARGE + GST_CHARGE).toFixed(2));
const TOTAL_AMOUNT_PAISE = Math.round(TOTAL_AMOUNT * 100);

let verifiedSkater = null;

async function fetchSiteConfigEvent() {
  try {
    const cacheBust = `?v=${Date.now()}`;
    const localRes = await fetch(`data/site-config.json${cacheBust}`);
    if (localRes.ok) {
      const localData = await localRes.json();
      if (localData) {
        window.LIVE_SITE_CONFIG = localData;
      }
    }
    const baseUrl = getEvtEnv().backendUrl;
    const res = await fetch(`${baseUrl}/api/site-config${cacheBust}`);
    if (res.ok) {
      const data = await res.json();
      if (data && data.config) {
        window.LIVE_SITE_CONFIG = data.config;
      }
    }
  } catch(e) {}
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetchSiteConfigEvent();

  const isOrganizerPaid = activeEvConfig.feeType === 'organizer' || activeEvConfig.payToOrganizer;
  const isFreeFee = BASE_FEE === 0;

  // Update Fee Banners & Submit Button Text dynamically from admin active event config
  const feeBanner = document.querySelector(".reg-fee-banner");
  if (feeBanner) {
    if (isOrganizerPaid) {
      feeBanner.innerHTML = `ℹ️ Entry Fee: <strong>Paid Directly to Organizer on Spot</strong> <small>(No online payment required on this portal)</small>`;
      feeBanner.style.background = "rgba(245, 158, 11, 0.15)";
      feeBanner.style.borderColor = "rgba(245, 158, 11, 0.4)";
      feeBanner.style.color = "#fef08a";
    } else if (isFreeFee) {
      feeBanner.innerHTML = `🎉 Championship Entry Fee: <strong>Free (₹0.00)</strong> <small>(Fee waived for this event)</small>`;
      feeBanner.style.background = "rgba(52, 211, 153, 0.15)";
      feeBanner.style.borderColor = "rgba(52, 211, 153, 0.4)";
      feeBanner.style.color = "#6ee7b7";
    } else {
      feeBanner.innerHTML = `💳 Championship Entry Fee: <strong>₹${BASE_FEE.toFixed(2)}</strong> <small>(+ ${parseFloat(activeEvConfig.gatewayPercent || 2.0)}% gateway charge &amp; ${parseFloat(activeEvConfig.gstPercent || 18.0)}% GST = ₹${TOTAL_AMOUNT.toFixed(2)} Total)</small>`;
    }
  }

  const submitText = document.querySelector("#evtSubmitBtn .submit-text");
  if (submitText) {
    if (isOrganizerPaid || isFreeFee) {
      submitText.textContent = `Submit Event Registration`;
    } else {
      submitText.textContent = `Confirm & Pay ₹${TOTAL_AMOUNT.toFixed(2)}`;
    }
  }

  // Ticker banner is hidden specifically on championship registration page
  document.body.classList.remove("has-ticker");
  const topTicker = document.querySelector(".top-ticker-bar");
  if (topTicker) topTicker.style.display = "none";

  if (isOrganizerPaid) {
    const lookupCard = document.getElementById("lookupCard");
    if (lookupCard) {
      lookupCard.innerHTML = `
        <div class="lookup-header" style="text-align:center; padding: 2rem 1rem;">
          <div style="font-size:3.5rem; margin-bottom:0.5rem;">📋</div>
          <h3 style="color:#60a5fa; font-size:1.6rem; margin-bottom:0.5rem;">${activeEvConfig.title}</h3>
          <p style="color:#d1d5db; font-size:1.05rem; max-width:560px; margin:0.5rem auto 1.5rem auto;">
            ${activeEvConfig.body || activeEvConfig.description || 'This event is open for participation. Entry fees are payable directly to the event organizer at the venue.'}
          </p>
          <div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3); border-radius:12px; padding:1.2rem; max-width:540px; margin:0 auto 1.5rem auto; text-align:left;">
            <div style="font-weight:600; color:#93c5fd; margin-bottom:0.4rem;">📌 Event Information:</div>
            <div style="color:#e5e7eb; font-size:0.95rem;">📅 <strong>Date:</strong> ${activeEvConfig.date}</div>
            <div style="color:#e5e7eb; font-size:0.95rem; margin-top:0.3rem;">📍 <strong>Venue:</strong> ${activeEvConfig.location}</div>
            <div style="color:#e5e7eb; font-size:0.95rem; margin-top:0.3rem;">💳 <strong>Fee Mode:</strong> Paid directly to Organizer on spot (No online payment required)</div>
          </div>
          <a href="index.html#events" class="btn-primary">&larr; Back to Website Events</a>
        </div>
      `;
    }
    const evtForm = document.getElementById("evtForm");
    if (evtForm) evtForm.style.display = "none";
    return;
  }

  // Check event registration deadline (October 1st, 2026 23:59:59 IST)
  const EVENT_DEADLINE = new Date("2026-10-01T23:59:59+05:30");
  if (new Date() > EVENT_DEADLINE) {
    const lookupCard = document.getElementById("lookupCard");
    if (lookupCard) {
      lookupCard.innerHTML = `
        <div class="lookup-header" style="text-align:center; padding: 1.5rem 0;">
          <div style="font-size:3rem; margin-bottom:0.5rem;">⛔</div>
          <h3 style="color:#ef4444; font-size:1.6rem; margin-bottom:0.4rem;">Event Registration Closed</h3>
          <p style="color:#d1d5db; font-size:1rem; max-width:520px; margin:0.5rem auto 1.5rem auto;">
            Registrations for the <strong>4th District Championship 2026</strong> closed on <strong>1st October 2026</strong>. No further entries are entertained after the deadline.
          </p>
          <a href="index.html#events" class="btn-primary">View Upcoming Events</a>
        </div>
      `;
    }
  }


  const lookupRegNo     = document.getElementById("lookupRegNo");
  if (lookupRegNo) {
    lookupRegNo.addEventListener("input", () => {
      lookupRegNo.value = lookupRegNo.value.toUpperCase();
    });
  }
  const verifyBtn       = document.getElementById("verifyBtn");
  const lookupSpinner   = document.getElementById("lookupSpinner");
  const lookupError     = document.getElementById("lookupError");

  const evtForm         = document.getElementById("evtForm");
  const evtSubmitBtn    = document.getElementById("evtSubmitBtn");
  const discError       = document.getElementById("discError");

  const unregisteredModal  = document.getElementById("unregisteredModal");
  const unregModalMessage  = document.getElementById("unregModalMessage");
  const unregCloseBtn      = document.getElementById("unregCloseBtn");

  const confirmModal      = document.getElementById("confirmModal");
  const confirmSummaryBody = document.getElementById("confirmSummaryBody");
  const confirmEditBtn    = document.getElementById("confirmEditBtn");
  const confirmProceedBtn = document.getElementById("confirmProceedBtn");

  const evtSuccess        = document.getElementById("evtSuccess");

  // 1. Verify RSAM Registration Number Lookup
  async function performLookup() {
    const rawNo = (lookupRegNo.value || "").trim().toUpperCase();
    lookupError.hidden = true;
    lookupError.textContent = "";

    if (!rawNo) {
      lookupError.textContent = "Please enter your RSAM Registration Number (e.g. R260908001).";
      lookupError.hidden = false;
      return;
    }

    verifyBtn.disabled = true;
    lookupSpinner.hidden = false;
    verifyBtn.querySelector(".lookup-btn-text").hidden = true;

    try {
      const apiPort = window.location.port === '8080' || window.location.hostname === 'localhost' ? '3001' : '';
      const baseUrl = apiPort ? `http://${window.location.hostname}:${apiPort}` : '';
      const targetUrl = baseUrl 
        ? `${baseUrl}/api/lookup-skater?regNumber=${encodeURIComponent(rawNo)}`
        : `${SHEET_URL}?action=lookup&regNumber=${encodeURIComponent(rawNo)}`;

      const res = await fetch(targetUrl);
      const text = await res.text();

      let data = null;
      try {
        data = JSON.parse(text);
      } catch (jsonErr) {
        console.warn("[Lookup] Server returned non-JSON format:", text.slice(0, 100));
      }

      if (data && data.status === "found" && data.skater) {
        verifiedSkater = data.skater;
        populateSkaterCard(data.skater);
        evtForm.hidden = false;
        evtForm.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        // Unregistered skater or past year registration -> Show Unregistered Skater Modal cleanly!
        verifiedSkater = null;
        evtForm.hidden = true;
        unregModalMessage.textContent = (data && data.message) ? data.message : `RSAM Registration Number ${rawNo} was not found for 2026.`;
        
        const unregActionBtn = document.getElementById("unregActionBtn") || document.querySelector(".unreg-actions .btn-modal-primary");
        if (unregActionBtn) {
          if (data && data.isPastYear) {
            unregActionBtn.href = `register.html?mode=renew&query=${encodeURIComponent(rawNo)}`;
            unregActionBtn.innerHTML = "🔄 Renew Annual Registration for 2026";
          } else {
            unregActionBtn.href = "register.html";
            unregActionBtn.innerHTML = "📝 Complete RSAM Registration First";
          }
        }
        unregisteredModal.hidden = false;
      }
    } catch (err) {
      console.error("[Event Lookup Error]", err);
      verifiedSkater = null;
      evtForm.hidden = true;
      unregModalMessage.textContent = `RSAM Registration Number ${rawNo} was not found for 2026.`;
      unregisteredModal.hidden = false;
    } finally {
      verifyBtn.disabled = false;
      lookupSpinner.hidden = true;
      verifyBtn.querySelector(".lookup-btn-text").hidden = false;
    }
  }

  if (verifyBtn) verifyBtn.addEventListener("click", performLookup);
  if (lookupRegNo) {
    lookupRegNo.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        performLookup();
      }
    });
  }

  if (unregCloseBtn) {
    unregCloseBtn.addEventListener("click", () => {
      unregisteredModal.hidden = true;
      lookupRegNo.focus();
    });
  }

  function calculateAgeGroup(age) {
    if (age === null || age === undefined || age === "" || isNaN(age)) return "";
    const num = Number(age);
    if (num < 6) return "Under 6";
    if (num < 8) return "6-8";
    if (num < 10) return "8-10";
    if (num < 12) return "10-12";
    if (num < 15) return "12-15";
    if (num < 18) return "15-18";
    return "Above-18";
  }

  function formatDateDDMMMYYYY(dateStr) {
    if (!dateStr) return 'N/A';
    const str = String(dateStr).trim();
    if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(str)) return str;
    const d = new Date(str);
    if (isNaN(d.getTime())) return str;
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Populate Stage 2 Auto-Filled Summary Card
  function populateSkaterCard(skater) {
    document.getElementById("displaySkaterName").textContent = skater.skaterName || "N/A";
    document.getElementById("displayRegNo").textContent      = skater.regNumber || "N/A";
    document.getElementById("displayDob").textContent        = formatDateDDMMMYYYY(skater.dob);
    document.getElementById("displayAge").textContent        = skater.age || "N/A";
    const ageGrp = skater.ageGroup || calculateAgeGroup(skater.age);
    document.getElementById("displayAgeGroup").textContent   = ageGrp || "N/A";
    document.getElementById("displaySchoolClub").textContent = skater.schoolClub || "N/A";
    document.getElementById("displayFather").textContent     = skater.fatherName || "N/A";
    document.getElementById("displayMother").textContent     = skater.motherName || "N/A";
    const displayCoachName = document.getElementById("displayCoachName");
    const displayCoachMobile = document.getElementById("displayCoachMobile");
    if (displayCoachName) displayCoachName.textContent = skater.coachName || "N/A";
    if (displayCoachMobile) displayCoachMobile.textContent = skater.coachMobile || "N/A";
    document.getElementById("displayMobile").textContent     = skater.mobile || "N/A";
    document.getElementById("displayEmail").textContent      = skater.email || "N/A";

    const rawAadhaar = String(skater.aadhaar || '').replace(/\D/g, '').slice(0, 12);
    document.getElementById("displayAadhaar").textContent    = rawAadhaar ? rawAadhaar.replace(/(\d{4})(?=\d)/g, "$1 ") : (skater.aadhaar || "N/A");

    const photoImg = document.getElementById("evtSkaterPhoto");
    const photoPlaceholder = document.getElementById("evtPhotoPlaceholder");

    if (skater.photoUrl && skater.photoUrl.startsWith("http")) {
      photoImg.src = formatDriveImageUrl(skater.photoUrl);
      photoImg.onerror = () => {
        photoImg.hidden = true;
        photoPlaceholder.hidden = false;
      };
      photoImg.hidden = false;
      photoPlaceholder.hidden = true;
    } else {
      photoImg.hidden = true;
      photoPlaceholder.hidden = false;
    }

    const proofsContainer = document.getElementById("displayDocumentProofs");
    if (proofsContainer) {
      let badgesHTML = `<span class="confirm-file-badge" style="background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:6px; font-size:0.82rem;">✓ Passport Photo</span>`;
      if (skater.aadhaarProof || skater.aadhaar) {
        badgesHTML += `<span class="confirm-file-badge" style="background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:6px; font-size:0.82rem;">✓ Address Proof (Aadhaar Card)</span>`;
      }
      if (skater.dobProof || skater.dob) {
        badgesHTML += `<span class="confirm-file-badge" style="background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); padding:4px 10px; border-radius:6px; font-size:0.82rem;">✓ Date of Birth Proof</span>`;
      }
      proofsContainer.innerHTML = badgesHTML;
    }

    // Auto-select existing discipline if valid
    if (skater.discipline) {
      const radio = evtForm.querySelector(`input[name="discipline"][value="${skater.discipline}"]`);
      if (radio) radio.checked = true;
    }
  }

  // Global ESC key listener to dismiss open modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.key === "Esc") {
      const confirmModal = document.getElementById("confirmModal");
      const unregisteredModal = document.getElementById("unregisteredModal");
      const evtSuccess = document.getElementById("evtSuccess");
      if (confirmModal && !confirmModal.hidden) confirmModal.hidden = true;
      if (unregisteredModal && !unregisteredModal.hidden) unregisteredModal.hidden = true;
      if (evtSuccess && !evtSuccess.hidden) evtSuccess.hidden = true;
    }
  });

  // 2. Handle Event Registration Form Submission
  evtForm.addEventListener("submit", (e) => {
    e.preventDefault();

    if (!verifiedSkater) {
      alert("Please verify your RSAM Registration Number first.");
      return;
    }

    const selectedDiscipline = evtForm.querySelector('input[name="discipline"]:checked');
    if (!selectedDiscipline) {
      discError.hidden = false;
      discError.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    discError.hidden = true;

    // Build event payload
    const eventPayload = {
      type: "event_registration",
      eventName: activeEvConfig.title || activeEvConfig.name || "Championship Event",
      year: "2026",
      regNumber: verifiedSkater.regNumber,
      skaterName: verifiedSkater.skaterName,
      dob: verifiedSkater.dob,
      age: verifiedSkater.age,
      ageGroup: verifiedSkater.ageGroup || calculateAgeGroup(verifiedSkater.age),
      schoolClub: verifiedSkater.schoolClub || "N/A",
      fatherName: verifiedSkater.fatherName,
      motherName: verifiedSkater.motherName,
      coachName: verifiedSkater.coachName || "N/A",
      coachMobile: verifiedSkater.coachMobile || "N/A",
      address: verifiedSkater.address,
      mobile: verifiedSkater.mobile,
      email: verifiedSkater.email,
      aadhaar: verifiedSkater.aadhaar,
      discipline: selectedDiscipline.value,
      photoUrl: verifiedSkater.photoUrl
    };

    openConfirmationModal(eventPayload);
  });

  // 3. Pre-Submission Confirmation Modal
  function openConfirmationModal(payload) {
    confirmSummaryBody.innerHTML = `
      <div class="confirm-photo-header">
        ${payload.photoUrl ? `<img src="${payload.photoUrl}" class="confirm-photo-thumb" alt="Skater Photo"/>` : `<div style="font-size:30px;">📸</div>`}
        <div class="confirm-photo-info">
          <h4>${payload.skaterName}</h4>
          <p>RSAM Reg No: <strong style="color:#f59e0b;">${payload.regNumber}</strong></p>
          <p>Event: <strong>${payload.eventName}</strong></p>
        </div>
      </div>
      <div class="confirm-grid">
        <div class="confirm-item">
          <span class="confirm-label">Championship Discipline</span>
          <span class="confirm-value" style="color:#e01c2e; font-weight:700;">${payload.discipline}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Mobile Number</span>
          <span class="confirm-value">${payload.mobile}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Coach Name &amp; Contact</span>
          <span class="confirm-value">${payload.coachName || 'N/A'} (${payload.coachMobile || 'N/A'})</span>
        </div>
          <span class="confirm-value">${payload.mobile}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Email Address</span>
          <span class="confirm-value">${payload.email}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Aadhaar Number</span>
          <span class="confirm-value">${payload.aadhaar}</span>
        </div>

        <div class="confirm-fee-breakdown" style="grid-column: span 2; background: ${BASE_FEE === 0 ? 'rgba(52, 211, 153, 0.08)' : 'rgba(245, 158, 11, 0.08)'}; border: 1px solid ${BASE_FEE === 0 ? 'rgba(52, 211, 153, 0.25)' : 'rgba(245, 158, 11, 0.25)'}; border-radius: 10px; padding: 1rem; margin-top: 0.5rem;">
          ${BASE_FEE === 0 ? `
            <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 700; color: #34d399;">
              <span>Entry Fee Status:</span>
              <span>🎉 FREE / WAIVED (₹0.00)</span>
            </div>
          ` : `
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.3rem;">
              <span>Championship Entry Base Fee:</span>
              <strong>₹${BASE_FEE.toFixed(2)}</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.3rem;">
              <span>Gateway Transaction Charge (${parseFloat(activeEvConfig.gatewayPercent || 2.0)}%):</span>
              <span>+ ₹${GATEWAY_CHARGE.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.6rem;">
              <span>GST on Transaction Fee (${parseFloat(activeEvConfig.gstPercent || 18.0)}%):</span>
              <span>+ ₹${GST_CHARGE.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 700; color: #f59e0b; border-top: 1px dashed rgba(245, 158, 11, 0.3); padding-top: 0.5rem;">
              <span>Total Payable Amount (Razorpay):</span>
              <span style="font-size: 1.2rem;">₹${TOTAL_AMOUNT.toFixed(2)}</span>
            </div>
          `}
        </div>
      </div>
    `;

    confirmModal.hidden = false;

    confirmEditBtn.onclick = () => { confirmModal.hidden = true; };

    confirmProceedBtn.onclick = () => {
      confirmModal.hidden = true;
      if (BASE_FEE === 0 || activeEvConfig.feeType === 'organizer' || activeEvConfig.payToOrganizer) {
        payload.paymentId = "WAIVED_FREE";
        payload.paymentStatus = "WAIVED";
        payload.amountPaid = "0.00";
        submitEventRegistration(payload);
      } else {
        launchRazorpayCheckout(payload);
      }
    };
  }

  // 4. Launch Razorpay Checkout Payment Gate
  function launchRazorpayCheckout(payload) {
    const rzpOptions = {
      key: window.RAZORPAY_KEY_ID || RAZORPAY_KEY_ID,
      amount: TOTAL_AMOUNT_PAISE,
      currency: "INR",
      payment_capture: 1, // Auto-capture payment immediately
      name: "Roller Sports Association Moradabad",
      description: `${payload.eventName} Entry – ${payload.skaterName}`,
      image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png",
      prefill: {
        name: payload.skaterName,
        email: payload.email,
        contact: payload.mobile
      },
      notes: {
        rsamRegNo: payload.regNumber,
        eventName: payload.eventName,
        discipline: payload.discipline
      },
      theme: { color: "#e01c2e" },
      handler: async function (response) {
        console.log("[Razorpay Event] Success! Payment ID:", response.razorpay_payment_id);
        payload.paymentId = response.razorpay_payment_id || ("pay_evt_test_" + Date.now());
        payload.paymentStatus = "SUCCESS";
        payload.amountPaid = TOTAL_AMOUNT.toFixed(2);

        await submitEventRegistration(payload);
      },
      modal: {
        ondismiss: function () {
          alert(`⚠️ Payment Cancelled: Event registration requires a successful payment of ₹${TOTAL_AMOUNT.toFixed(2)}.\n\nYour event registration was not submitted.`);
          evtSubmitBtn.disabled = false;
          evtSubmitBtn.querySelector(".submit-text").hidden = false;
          evtSubmitBtn.querySelector(".submit-spinner").hidden = true;
        }
      }
    };

    if (typeof Razorpay !== "undefined") {
      const rzp = new Razorpay(rzpOptions);
      rzp.open();
    } else {
      console.warn("Razorpay SDK script not found. Proceeding in test mode.");
      payload.paymentId = "pay_evt_test_" + Date.now();
      payload.paymentStatus = "SUCCESS";
      payload.amountPaid = "511.80";
      submitEventRegistration(payload);
    }
  }

  // 5. Post Event Payload to Apps Script & Backend Server
  async function submitEventRegistration(payload) {
    evtSubmitBtn.disabled = true;
    evtSubmitBtn.querySelector(".submit-text").hidden = true;
    evtSubmitBtn.querySelector(".submit-spinner").hidden = false;

    try {
      // POST to Google Apps Script (Appends to District Championship 2026 sheet tab)
      await fetch(SHEET_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload),
        mode: "no-cors"
      });
    } catch (e) {
      console.error("[Google Sheet Event Post Error]", e);
    }

    if (OPENWA_SERVER_URL) {
      try {
        // POST to Local Backend Server for PDF pass & WhatsApp notification
        await fetch(OPENWA_SERVER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": OPENWA_API_KEY
          },
          body: JSON.stringify(payload)
        });
      } catch (e) {
        console.warn("[Backend Event Webhook Warning]", e);
      }
    }

    const evtSuccess = document.getElementById("evtSuccess");
    if (evtSuccess) {
      const regNoEl = document.getElementById("evtSuccessRegNoText");
      const chestNoEl = document.getElementById("evtSuccessChestNoText");
      const payIdEl = document.getElementById("evtSuccessPaymentIdText");
      const subtitleEl = document.getElementById("evtSuccessSubtitle");

      const rsamRegNo = payload.regNumber || 'R260918611';
      const chestNo = payload.eventRegNo || payload.chestNo || (rsamRegNo ? String(rsamRegNo).replace(/\D/g, "").slice(-3) : '611');

      if (regNoEl) regNoEl.textContent = rsamRegNo;
      if (chestNoEl) chestNoEl.textContent = chestNo;
      if (payIdEl) payIdEl.textContent = `(Razorpay ID: ${payload.paymentId || 'Verified'})`;
      if (subtitleEl && payload.eventName) subtitleEl.textContent = `${payload.eventName} Entry Completed`;

      const dlBtn = document.getElementById("evtDownloadPdfBtn");
      if (dlBtn) {
        dlBtn.onclick = () => downloadEventPdfInvoice(payload);
      }
      evtSuccess.hidden = false;
    }
    let secondsLeft = 12;
    const countdownEl = document.getElementById("countdownNum");
    const interval = setInterval(() => {
      secondsLeft--;
      if (countdownEl) countdownEl.textContent = secondsLeft;
      if (secondsLeft <= 0) {
        clearInterval(interval);
        window.location.href = "index.html#events";
      }
    }, 1000);
  }

  function downloadEventPdfInvoice(payload) {
    const regNumber = payload.regNumber || "EVT26_001";
    const skaterName = payload.skaterName || "Athlete";
    const eventName = payload.eventName || activeEvConfig.title || activeEvConfig.name || "Championship Event";
    const discipline = payload.discipline || "Roller Skating";
    const ageGroup = payload.ageGroup || "N/A";
    const age = payload.age || "N/A";
    const amountPaid = payload.amountPaid || "511.80";
    const paymentId = payload.paymentId || "Verified";
    const dob = cleanDob(payload.dob);
    const schoolClub = payload.schoolClub || "N/A";
    const fatherName = payload.fatherName || "N/A";
    const motherName = payload.motherName || "N/A";
    const address = payload.address || "N/A";
    const mobile = payload.mobile || "N/A";
    const email = payload.email || "N/A";
    const aadhaar = payload.aadhaar ? String(payload.aadhaar).replace(/(\d{4})(?=\d)/g, "$1 ") : "N/A";
    const coachName = payload.coachName || "N/A";
    const coachMobile = payload.coachMobile || "N/A";
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups in your browser to download the Event Entry Pass & PDF Invoice.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RSAM_Event_Entry_Invoice_${regNumber}</title>
        <style>
          body { font-family: 'Arial', sans-serif; color: #111827; background: #fff; margin: 0; padding: 20px; }
          .invoice-box { border: 2px solid #e01c2e; border-radius: 12px; padding: 24px; max-width: 750px; margin: auto; }
          .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
          .title { color: #e01c2e; font-size: 22px; font-weight: bold; margin: 0; }
          .subtitle { color: #4b5563; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
          .badge-box { background: #eff6ff; border: 1.5px solid #3b82f6; border-radius: 8px; text-align: center; padding: 12px; margin-bottom: 20px; }
          .badge-label { color: #1d4ed8; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; }
          .badge-num { color: #1e40af; font-size: 24px; font-weight: bold; margin-top: 2px; display: block; }
          .section-title { font-size: 13px; font-weight: bold; color: #374151; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; text-transform: uppercase; }
          table.details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
          table.details-table td { padding: 6px 8px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
          table.details-table td.lbl { color: #6b7280; font-weight: bold; width: 35%; }
          table.details-table td.val { color: #111827; font-weight: 500; }
          table.invoice-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
          table.invoice-table th { background: #f9fafb; color: #4b5563; font-size: 11px; text-transform: uppercase; padding: 8px; text-align: left; border-bottom: 1.5px solid #e5e7eb; }
          table.invoice-table td { padding: 8px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
          .total-row td { font-weight: bold; color: #e01c2e; font-size: 14px; border-top: 2px solid #e01c2e; }
          .seal-box { margin-top: 25px; text-align: right; font-size: 11px; color: #4b5563; }
          .footer-note { font-size: 10px; color: #6b7280; text-align: center; margin-top: 25px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div class="title">ROLLER SPORTS ASSOCIATION MORADABAD</div>
            <div class="subtitle">Official Championship Event Entry Pass &amp; Fee Invoice</div>
          </div>
          <div class="badge-box">
            <span class="badge-label">${eventName.toUpperCase()}</span>
            <span class="badge-num">REG NO: ${regNumber}</span>
          </div>
          <div class="section-title">Athlete Profile &amp; Event Entry</div>
          <table class="details-table">
            <tr><td class="lbl">Athlete Name:</td><td class="val">${skaterName}</td><td class="lbl">RSAM Reg No:</td><td class="val">${regNumber}</td></tr>
            <tr><td class="lbl">Event Name:</td><td class="val" colspan="3"><strong>${eventName}</strong></td></tr>
            <tr><td class="lbl">Age &amp; Age Group:</td><td class="val">${age} yrs (${ageGroup})</td><td class="lbl">Discipline:</td><td class="val">${discipline}</td></tr>
            <tr><td class="lbl">School / Club:</td><td class="val">${schoolClub}</td><td class="lbl">Aadhaar Card:</td><td class="val">${aadhaar}</td></tr>
            <tr><td class="lbl">Father's Name:</td><td class="val">${fatherName}</td><td class="lbl">Mother's Name:</td><td class="val">${motherName}</td></tr>
            <tr><td class="lbl">Mobile Number:</td><td class="val">${mobile}</td><td class="lbl">Email Address:</td><td class="val">${email}</td></tr>
            <tr><td class="lbl">Coach Details:</td><td class="val" colspan="3">${coachName} (${coachMobile})</td></tr>
          </table>
          <div class="section-title">Championship Entry Fee Invoice</div>
          <table class="invoice-table">
            <thead>
              <tr><th>Description</th><th>Gateway Rate</th><th style="text-align:right;">Amount (INR)</th></tr>
            </thead>
            <tbody>
              <tr><td>Championship Event Registration Fee</td><td>Base Fee</td><td style="text-align:right;">₹500.00</td></tr>
              <tr><td>Payment Gateway Service Charge</td><td>2.00%</td><td style="text-align:right;">+ ₹10.00</td></tr>
              <tr><td>GST on Gateway Transaction Fee</td><td>18.00%</td><td style="text-align:right;">+ ₹1.80</td></tr>
              <tr class="total-row"><td>Total Entry Fee Paid (Razorpay)</td><td>Status: ${payload.paymentStatus || 'SUCCESS'}</td><td style="text-align:right;">₹${amountPaid}</td></tr>
            </tbody>
          </table>
          <table class="details-table" style="margin-top:10px;">
            <tr><td class="lbl">Razorpay Payment ID:</td><td class="val">${paymentId}</td><td class="lbl">Entry Date:</td><td class="val">${timestamp}</td></tr>
          </table>
          <div class="seal-box">
            <strong>Roller Sports Association Moradabad</strong><br/>
            <em>Official Event Organizing Committee</em>
          </div>
          <div class="footer-note">
            Moradabad Sports Complex, Kanth Road, Moradabad, UP · Contact: +91-8057781350 · Email: contact@rsam.in
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  }

});
