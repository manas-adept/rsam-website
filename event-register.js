/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   event-register.js
   Event Registration & Verification Logic for 4th District Championship 2026
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SHEET_URL = "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
const BACKEND_DOMAIN = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : (window.PRODUCTION_API_URL || 'https://rsam-whatsapp-bot.onrender.com');
const OPENWA_SERVER_URL = `${BACKEND_DOMAIN}/send-registration`;
const OPENWA_API_KEY    = "rsam_whatsapp_secret_key_2026";
const RAZORPAY_KEY_ID   = "rzp_test_TZa1vfjhrPJobv";

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
    title: "4th District Championship 2026",
    year: "2026",
    baseFee: 500.00,
    gatewayPercent: 2.0,
    gstPercent: 18.0
  };
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
const BASE_FEE           = parseFloat(activeEvConfig.baseFee || 500.00);
const GATEWAY_CHARGE     = parseFloat(((BASE_FEE * (parseFloat(activeEvConfig.gatewayPercent) || 2.0)) / 100).toFixed(2));
const GST_CHARGE         = parseFloat(((GATEWAY_CHARGE * (parseFloat(activeEvConfig.gstPercent) || 18.0)) / 100).toFixed(2));
const TOTAL_AMOUNT       = parseFloat((BASE_FEE + GATEWAY_CHARGE + GST_CHARGE).toFixed(2));
const TOTAL_AMOUNT_PAISE = Math.round(TOTAL_AMOUNT * 100);

let verifiedSkater = null;

document.addEventListener("DOMContentLoaded", () => {

  const isOrganizerPaid = activeEvConfig.feeType === 'organizer' || activeEvConfig.payToOrganizer;

  // Update Fee Banners & Submit Button Text dynamically from admin active event config
  const feeBanner = document.querySelector(".reg-fee-banner");
  if (feeBanner) {
    if (isOrganizerPaid) {
      feeBanner.innerHTML = `ℹ️ Entry Fee: <strong>Paid Directly to Organizer on Spot</strong> <small>(No online payment required on this portal)</small>`;
      feeBanner.style.background = "rgba(245, 158, 11, 0.15)";
      feeBanner.style.borderColor = "rgba(245, 158, 11, 0.4)";
      feeBanner.style.color = "#fef08a";
    } else {
      feeBanner.innerHTML = `💳 Championship Entry Fee: <strong>₹${BASE_FEE.toFixed(2)}</strong> <small>(+ ${parseFloat(activeEvConfig.gatewayPercent || 2.0)}% gateway charge &amp; ${parseFloat(activeEvConfig.gstPercent || 18.0)}% GST = ₹${TOTAL_AMOUNT.toFixed(2)} Total)</small>`;
    }
  }

  const submitText = document.querySelector("#evtSubmitBtn .submit-text");
  if (submitText && !isOrganizerPaid) {
    submitText.textContent = `Confirm & Pay ₹${TOTAL_AMOUNT.toFixed(2)}`;
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

  // Populate Stage 2 Auto-Filled Summary Card
  function populateSkaterCard(skater) {
    document.getElementById("displaySkaterName").textContent = skater.skaterName || "N/A";
    document.getElementById("displayRegNo").textContent      = skater.regNumber || "N/A";
    document.getElementById("displayDob").textContent        = skater.dob || "N/A";
    document.getElementById("displayAge").textContent        = skater.age || "N/A";
    document.getElementById("displayFather").textContent     = skater.fatherName || "N/A";
    document.getElementById("displayMother").textContent     = skater.motherName || "N/A";
    document.getElementById("displayMobile").textContent     = skater.mobile || "N/A";
    document.getElementById("displayEmail").textContent      = skater.email || "N/A";
    document.getElementById("displayAadhaar").textContent    = skater.aadhaar || "N/A";

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

    // Auto-select existing discipline if valid
    if (skater.discipline) {
      const radio = evtForm.querySelector(`input[name="discipline"][value="${skater.discipline}"]`);
      if (radio) radio.checked = true;
    }
  }

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
      eventName: "4th District Championship 2026",
      year: "2026",
      regNumber: verifiedSkater.regNumber,
      skaterName: verifiedSkater.skaterName,
      dob: verifiedSkater.dob,
      age: verifiedSkater.age,
      fatherName: verifiedSkater.fatherName,
      motherName: verifiedSkater.motherName,
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
          <p>Event: <strong>4th District Championship 2026</strong></p>
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
          <span class="confirm-label">Email Address</span>
          <span class="confirm-value">${payload.email}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Aadhaar Number</span>
          <span class="confirm-value">${payload.aadhaar}</span>
        </div>

        <div class="confirm-fee-breakdown" style="grid-column: span 2; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 1rem; margin-top: 0.5rem;">
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
        </div>
      </div>
    `;

    confirmModal.hidden = false;

    confirmEditBtn.onclick = () => { confirmModal.hidden = true; };

    confirmProceedBtn.onclick = () => {
      confirmModal.hidden = true;
      launchRazorpayCheckout(payload);
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
      description: `4th District Championship 2026 Entry – ${payload.skaterName}`,
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
        payload.amountPaid = "511.80";

        await submitEventRegistration(payload);
      },
      modal: {
        ondismiss: function () {
          alert("⚠️ Payment Cancelled: Event registration requires a successful payment of ₹511.80.\n\nYour event registration was not submitted.");
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
      const payIdEl = document.getElementById("evtSuccessPaymentIdText");
      if (regNoEl) regNoEl.textContent = payload.regNumber || 'R260912001';
      if (payIdEl) payIdEl.textContent = `(Razorpay ID: ${payload.paymentId || 'Verified'})`;
      evtSuccess.hidden = false;
    }
    let secondsLeft = 6;
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

});
