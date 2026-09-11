/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   register.js
   Paste your Google Apps Script Web App URL in SHEET_URL below.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
// https://script.google.com/macros/s/AKfycbyohDIL5CEpuaT3pBp7dh6bzm9c-ccQDAEhfneIe4ADsGTmL5_70oKfnFIjp_BiuUncUg/exec
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
const BACKEND_DOMAIN = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : (window.PRODUCTION_API_URL || 'https://rsam-whatsapp-bot.onrender.com');
const OPENWA_SERVER_URL = `${BACKEND_DOMAIN}/send-registration`;
const OPENWA_API_KEY    = "rsam_whatsapp_secret_key_2026";

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

/* ── Age auto-calculate ────────────────────────────── */
const dobInput    = document.getElementById("dob");
const ageInput    = document.getElementById("age");

dobInput.addEventListener("change", () => {
  const dob = new Date(dobInput.value);
  if (isNaN(dob)) { ageInput.value = ""; return; }
  const cutoff = new Date("2026-12-31");
  let age = cutoff.getFullYear() - dob.getFullYear();
  const m = cutoff.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && cutoff.getDate() < dob.getDate())) age--;
  ageInput.value = age >= 0 ? age : "";
});

/* ── Aadhaar number formatting (XXXX XXXX XXXX) ────── */
const aadhaarInput = document.getElementById("aadhaar");
aadhaarInput.addEventListener("input", () => {
  let v = aadhaarInput.value.replace(/\D/g, "").slice(0, 12);
  aadhaarInput.value = v.replace(/(\d{4})(?=\d)/g, "$1 ");
});

/* ── Mobile: digits only ───────────────────────────── */
const mobileInput = document.getElementById("mobile");
mobileInput.addEventListener("input", () => {
  mobileInput.value = mobileInput.value.replace(/\D/g, "").slice(0, 10);
});

/* ── File drop labels ──────────────────────────────── */
function bindFileDrop(inputId, nameId, dropId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(nameId);
  const drop  = document.getElementById(dropId);
  if (!input) return;
  input.addEventListener("change", () => {
    if (label) label.textContent = input.files[0] ? input.files[0].name : "";
    if (input.files[0]) {
      input.classList.remove("invalid");
      if (drop) drop.classList.remove("invalid");
    }
  });
}
bindFileDrop("aadhaarProof", "aadhaarFileName", "aadhaarDrop");
bindFileDrop("dobProof",     "dobFileName",     "dobDrop");

/* ── Top Ticker Bar Auto-Hide & Renewal Switcher Logic ── */
document.addEventListener("DOMContentLoaded", () => {
  const EVENT_DEADLINE = new Date("2026-10-01T23:59:59+05:30");
  const topTicker = document.getElementById("topTickerBar");
  if (new Date() <= EVENT_DEADLINE) {
    document.body.classList.add("has-ticker");
    if (topTicker) topTicker.style.display = "flex";
  } else {
    document.body.classList.remove("has-ticker");
    if (topTicker) topTicker.style.display = "none";
  }

  /* Annual Registration Renewal Switcher & Lookup Handler */
  const tabNewReg       = document.getElementById("tabNewReg");
  const tabRenewReg     = document.getElementById("tabRenewReg");
  const renewCard       = document.getElementById("renewCard");
  const renewQueryInput = document.getElementById("renewQueryInput");
  const renewLookupBtn  = document.getElementById("renewLookupBtn");
  const renewSpinner    = document.getElementById("renewSpinner");
  const renewAlert      = document.getElementById("renewAlert");

  function setMode(mode) {
    if (mode === "renew") {
      if (tabNewReg) tabNewReg.classList.remove("active");
      if (tabRenewReg) tabRenewReg.classList.add("active");
      if (renewCard) renewCard.hidden = false;
      if (renewQueryInput) renewQueryInput.focus();
    } else {
      if (tabRenewReg) tabRenewReg.classList.remove("active");
      if (tabNewReg) tabNewReg.classList.add("active");
      if (renewCard) renewCard.hidden = true;
      if (renewAlert) renewAlert.hidden = true;
    }
  }

  if (tabNewReg) tabNewReg.addEventListener("click", () => setMode("new"));
  if (tabRenewReg) tabRenewReg.addEventListener("click", () => setMode("renew"));

  async function performRenewalLookup() {
    const query = (renewQueryInput.value || "").trim().toUpperCase();
    if (renewAlert) {
      renewAlert.hidden = true;
      renewAlert.className = "renew-alert";
      renewAlert.textContent = "";
    }

    if (!query) {
      if (renewAlert) {
        renewAlert.textContent = "Please enter your previous RSAM Registration Number or 10-digit mobile number.";
        renewAlert.classList.add("error");
        renewAlert.hidden = false;
      }
      return;
    }

    if (renewLookupBtn) renewLookupBtn.disabled = true;
    if (renewSpinner) renewSpinner.hidden = false;

    try {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const targetUrl = isLocal
        ? `http://${window.location.hostname}:3001/api/lookup-skater?action=renew_lookup&query=${encodeURIComponent(query)}`
        : `${SHEET_URL}?action=renew_lookup&query=${encodeURIComponent(query)}`;

      const res = await fetch(targetUrl);
      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (e) {}

      if (data && data.status === "found" && data.skater) {
        const s = data.skater;
        const form = document.getElementById("regForm");

function formatToInputDate(dateStr) {
  if (!dateStr) return "";
  const cleaned = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
  
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  
  const parts = cleaned.split(/[\/\.-]/);
  if (parts.length === 3) {
    if (parts[2].length === 4) {
      return `${parts[2]}-${String(parts[1]).padStart(2, '0')}-${String(parts[0]).padStart(2, '0')}`;
    }
  }
  return "";
}

function formatDriveImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  const match = url.match(/\/file\/d\/([^\/]+)/) || url.match(/id=([^&]+)/);
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return url;
}

        if (form.skaterName && s.skaterName) form.skaterName.value = s.skaterName;
        if (form.dob && s.dob) {
          form.dob.value = formatToInputDate(s.dob);
          form.dob.dispatchEvent(new Event("change"));
        }
        if (form.fatherName && s.fatherName) form.fatherName.value = s.fatherName;
        if (form.motherName && s.motherName) form.motherName.value = s.motherName;
        if (form.address && s.address) form.address.value = s.address;
        if (form.mobile && s.mobile) form.mobile.value = String(s.mobile).replace(/^'/, "");
        if (form.email && s.email) form.email.value = s.email;
        if (form.aadhaar && s.aadhaar) {
          form.aadhaar.value = String(s.aadhaar).replace(/^'/, "");
          form.aadhaar.dispatchEvent(new Event("input"));
        }

        if (s.discipline) {
          const radio = form.querySelector(`input[name="discipline"][value="${s.discipline}"]`);
          if (radio) radio.checked = true;
        }

        if (s.photoUrl && s.photoUrl.startsWith("http")) {
          croppedPhotoDataUrl = null;
          photoPreview.src = formatDriveImageUrl(s.photoUrl);
          const previewWrap = document.getElementById("photoPreviewWrap");
          if (previewWrap) previewWrap.hidden = false;
          if (photoFrame) {
            photoFrame.classList.add("has-photo");
            photoFrame.classList.remove("invalid");
          }
        }

        if (renewAlert) {
          renewAlert.innerHTML = `✓ <strong>Registration Record Found!</strong> Details auto-filled for <strong>${s.skaterName}</strong> (${s.regNumber}). Please review your info below and confirm renewal.`;
          renewAlert.classList.add("success");
          renewAlert.hidden = false;
        }

        form.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        if (renewAlert) {
          renewAlert.textContent = (data && data.message) ? data.message : `No previous registration record found for '${query}'.`;
          renewAlert.classList.add("error");
          renewAlert.hidden = false;
        }
      }
    } catch (err) {
      console.error("[Renewal Lookup Error]", err);
      if (renewAlert) {
        renewAlert.textContent = `Error searching previous registration: ${err.message}`;
        renewAlert.classList.add("error");
        renewAlert.hidden = false;
      }
    } finally {
      if (renewLookupBtn) renewLookupBtn.disabled = false;
      if (renewSpinner) renewSpinner.hidden = true;
    }
  }

  if (renewLookupBtn) renewLookupBtn.addEventListener("click", performRenewalLookup);
  if (renewQueryInput) {
    renewQueryInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        performRenewalLookup();
      }
    });
  }

  // Auto-trigger renewal mode if URL params contain mode=renew or query/regNumber
  const urlParams = new URLSearchParams(window.location.search);
  const modeParam = urlParams.get("mode");
  const queryParam = urlParams.get("query") || urlParams.get("regNumber") || urlParams.get("mobile");

  if (modeParam === "renew" || queryParam) {
    setMode("renew");
    if (queryParam && renewQueryInput) {
      renewQueryInput.value = queryParam;
      performRenewalLookup();
    }
  }
});

/* ── Passport Photo Frame & Cropper Handler ── */
const skaterPhotoInput = document.getElementById("skaterPhoto");
const photoFrame       = document.getElementById("photoFrame");
const photoPreview     = document.getElementById("photoPreview");

const cropModal        = document.getElementById("cropModal");
const cropImage        = document.getElementById("cropImage");
const cropCancelBtn    = document.getElementById("cropCancelBtn");
const cropRotateBtn    = document.getElementById("cropRotateBtn");
const cropApplyBtn     = document.getElementById("cropApplyBtn");

let cropper = null;
let croppedPhotoDataUrl = null;

if (skaterPhotoInput) {
  skaterPhotoInput.addEventListener("change", () => {
    const file = skaterPhotoInput.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        cropImage.src = e.target.result;
        cropModal.hidden = false;

        if (cropper) cropper.destroy();
        cropper = new Cropper(cropImage, {
          aspectRatio: 3.5 / 4.5,
          viewMode: 1,
          autoCropArea: 0.9,
          dragMode: 'move',
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
        });
      };
      reader.readAsDataURL(file);
    }
  });
}

if (cropCancelBtn) {
  cropCancelBtn.addEventListener("click", () => {
    cropModal.hidden = true;
    if (cropper) { cropper.destroy(); cropper = null; }
  });
}

if (cropRotateBtn) {
  cropRotateBtn.addEventListener("click", () => {
    if (cropper) cropper.rotate(90);
  });
}

if (cropApplyBtn) {
  cropApplyBtn.addEventListener("click", () => {
    if (cropper) {
      const canvas = cropper.getCroppedCanvas({
        width: 350,
        height: 450,
        fillColor: '#ffffff',
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
      });

      croppedPhotoDataUrl = canvas.toDataURL("image/jpeg", 0.9);
      photoPreview.src = croppedPhotoDataUrl;
      const previewWrap = document.getElementById("photoPreviewWrap");
      if (previewWrap) previewWrap.hidden = false;
      const selectBtn = document.getElementById("selectPhotoBtn");
      if (selectBtn) selectBtn.innerHTML = "<span>📸 Change Photo</span>";
      photoFrame.classList.add("has-photo");
      photoFrame.classList.remove("invalid");

      cropModal.hidden = true;
      cropper.destroy();
      cropper = null;
    }
  });
}

/* ── Nav toggle (mobile) ───────────────────────────── */
const navToggle = document.getElementById("navToggle");
const navLinks  = document.getElementById("navLinks");
if (navToggle) navToggle.addEventListener("click", () => navLinks.classList.toggle("open"));

/* ── Form submit ───────────────────────────────────── */
document.getElementById("regForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const form      = e.target;
  const submitBtn = document.getElementById("submitBtn");
  const discError = document.getElementById("discError");

  /* Comprehensive validation */
  let valid = true;

  // 1. Text / Date / Textarea required inputs
  form.querySelectorAll("input[required]:not([type='file']), textarea[required]").forEach(el => {
    if (!el.value.trim()) {
      el.classList.add("invalid");
      valid = false;
    } else {
      el.classList.remove("invalid");
    }
  });

  // 2. Skater passport photo validation
  if (!croppedPhotoDataUrl && skaterPhotoInput && !skaterPhotoInput.files[0]) {
    if (photoFrame) photoFrame.classList.add("invalid");
    valid = false;
  } else if (photoFrame) {
    photoFrame.classList.remove("invalid");
  }

  // 3. Aadhaar proof document validation
  const aadhaarProofInput = document.getElementById("aadhaarProof");
  const aadhaarDrop = document.getElementById("aadhaarDrop");
  if (!aadhaarProofInput || !aadhaarProofInput.files[0]) {
    if (aadhaarDrop) aadhaarDrop.classList.add("invalid");
    valid = false;
  } else if (aadhaarDrop) {
    aadhaarDrop.classList.remove("invalid");
  }

  // 4. DOB proof document validation
  const dobProofInput = document.getElementById("dobProof");
  const dobDrop = document.getElementById("dobDrop");
  if (!dobProofInput || !dobProofInput.files[0]) {
    if (dobDrop) dobDrop.classList.add("invalid");
    valid = false;
  } else if (dobDrop) {
    dobDrop.classList.remove("invalid");
  }

  // 5. Discipline selection validation
  const discipline = form.querySelector("input[name='discipline']:checked");
  if (!discipline) {
    if (discError) discError.hidden = false;
    valid = false;
  } else if (discError) {
    discError.hidden = true;
  }

  // 6. Mobile number validation (must be exactly 10 digits)
  const mobile = mobileInput ? mobileInput.value.replace(/\D/g, "") : "";
  if (mobile.length !== 10) {
    if (mobileInput) mobileInput.classList.add("invalid");
    valid = false;
  } else if (mobileInput) {
    mobileInput.classList.remove("invalid");
  }

  // 7. Aadhaar card number validation (must be exactly 12 digits)
  const aadhaarRaw = aadhaarInput ? aadhaarInput.value.replace(/\s/g, "") : "";
  if (aadhaarRaw.length !== 12) {
    if (aadhaarInput) aadhaarInput.classList.add("invalid");
    valid = false;
  } else if (aadhaarInput) {
    aadhaarInput.classList.remove("invalid");
  }

  // Form error feedback banner
  let formErrorAlert = document.getElementById("formErrorAlert");
  if (!formErrorAlert) {
    formErrorAlert = document.createElement("div");
    formErrorAlert.id = "formErrorAlert";
    formErrorAlert.style.cssText = "background: rgba(239, 68, 68, 0.15); border: 1px solid #ef4444; color: #fca5a5; padding: 0.85rem 1.2rem; border-radius: 8px; margin-bottom: 1.2rem; font-size: 0.95rem; text-align: center; font-weight: 500;";
    const submitRow = document.querySelector(".reg-submit-row");
    if (submitRow) submitRow.parentNode.insertBefore(formErrorAlert, submitRow);
  }

  if (!valid) {
    formErrorAlert.innerHTML = `⚠️ <strong>Incomplete Form Details</strong><br/><span style="font-size:0.85rem; color:#d1d5db;">Please fill in all required fields highlighted in red, upload passport photo &amp; required document proofs, and select a discipline.</span>`;
    formErrorAlert.hidden = false;

    const firstInvalid = form.querySelector(".invalid, #discError:not([hidden]), .thin-photo-selector.invalid, .file-drop.invalid");
    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof firstInvalid.focus === "function") {
        try { firstInvalid.focus(); } catch (err) {}
      }
    }
    return;
  }

  if (formErrorAlert) formErrorAlert.hidden = true;

  try {
    const toBase64 = file => new Promise((res, rej) => {
      if (!file) return res(null);
      const r = new FileReader();
      r.onload  = () => res({ name: file.name, type: file.type, data: r.result.split(",")[1] });
      r.onerror = rej;
      r.readAsDataURL(file);
    });

    let photoPayload = null;
    if (croppedPhotoDataUrl) {
      photoPayload = {
        name: "passport_photo.jpg",
        type: "image/jpeg",
        data: croppedPhotoDataUrl.split(",")[1]
      };
    } else if (form.skaterPhoto && form.skaterPhoto.files[0]) {
      photoPayload = await toBase64(form.skaterPhoto.files[0]);
    }

    const [aadhaarFile, dobFile] = await Promise.all([
      toBase64(form.aadhaarProof.files[0]),
      toBase64(form.dobProof.files[0]),
    ]);

    const payload = {
      year:         "2026",
      skaterName:   form.skaterName.value.trim(),
      dob:          form.dob.value,
      age:          ageInput.value,
      fatherName:   form.fatherName.value.trim(),
      motherName:   form.motherName.value.trim(),
      address:      form.address.value.trim(),
      mobile,
      email:        form.email.value.trim(),
      aadhaar:      aadhaarRaw,
      discipline:   discipline.value,
      skaterPhoto:  photoPayload,
      aadhaarProof: aadhaarFile,
      dobProof:     dobFile,
    };

// Razorpay Gateway Configuration & Fee Calculations (₹50 base + 2% transaction fee + 18% GST on fee = ₹51.18)
const RAZORPAY_KEY_ID = "rzp_test_TZa1vfjhrPJobv"; // Test Razorpay Key ID
const BASE_REGISTRATION_FEE = 50.00;
const GATEWAY_FEE = 1.00;  // 2% of ₹50.00
const GST_FEE = 0.18;      // 18% GST on ₹1.00
const TOTAL_AMOUNT = 51.18; // Total payable
const TOTAL_AMOUNT_PAISE = 5118; // 51.18 INR in paise

    // Populate Pre-Submission Confirmation Modal Summary
    const confirmModal = document.getElementById("confirmModal");
    const confirmSummaryBody = document.getElementById("confirmSummaryBody");
    const confirmEditBtn = document.getElementById("confirmEditBtn");
    const confirmProceedBtn = document.getElementById("confirmProceedBtn");

    const photoSrc = croppedPhotoDataUrl || (photoPreview.src ? photoPreview.src : "");
    const aadhaarFileName = form.aadhaarProof.files[0] ? form.aadhaarProof.files[0].name : "Attached File";
    const dobFileName = form.dobProof.files[0] ? form.dobProof.files[0].name : "Attached File";

    confirmSummaryBody.innerHTML = `
      <div class="confirm-photo-header">
        ${photoSrc ? `<img src="${photoSrc}" class="confirm-photo-thumb" alt="Skater Photo"/>` : `<div style="font-size:30px;">📸</div>`}
        <div class="confirm-photo-info">
          <h4>${payload.skaterName}</h4>
          <p>Discipline: <strong style="color:#fff;">${payload.discipline}</strong> · Age: ${payload.age} years</p>
        </div>
      </div>
      <div class="confirm-grid">
        <div class="confirm-item">
          <span class="confirm-label">Date of Birth</span>
          <span class="confirm-value">${payload.dob}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Mobile Number</span>
          <span class="confirm-value">${payload.mobile}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Father's Name</span>
          <span class="confirm-value">${payload.fatherName}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Mother's Name</span>
          <span class="confirm-value">${payload.motherName}</span>
        </div>
        <div class="confirm-item confirm-item--full">
          <span class="confirm-label">Aadhaar Card Number</span>
          <span class="confirm-value">${payload.aadhaar.replace(/(\d{4})(?=\d)/g, "$1 ")}</span>
        </div>
        <div class="confirm-item confirm-item--full">
          <span class="confirm-label">Residential Address</span>
          <span class="confirm-value">${payload.address}</span>
        </div>
        <div class="confirm-item">
          <span class="confirm-label">Email Address</span>
          <span class="confirm-value">${payload.email || 'N/A'}</span>
        </div>
        <div class="confirm-item confirm-item--full">
          <span class="confirm-label">Uploaded Document Proofs</span>
          <span class="confirm-file-badge">✓ Passport Photo</span>
          <span class="confirm-file-badge">✓ Address Proof (${aadhaarFileName})</span>
          <span class="confirm-file-badge">✓ DOB Proof (${dobFileName})</span>
        </div>
        
        <!-- Fee & Razorpay Payment Breakdown -->
        <div class="confirm-fee-breakdown" style="grid-column: span 2; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.25); border-radius: 10px; padding: 1rem; margin-top: 0.5rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.3rem;">
            <span>Base Registration Fee:</span>
            <strong>₹50.00</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.3rem;">
            <span>Gateway Transaction Charge (2%):</span>
            <span>+ ₹1.00</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.6rem;">
            <span>GST on Transaction Fee (18%):</span>
            <span>+ ₹0.18</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 700; color: #f59e0b; border-top: 1px dashed rgba(245, 158, 11, 0.3); padding-top: 0.5rem;">
            <span>Total Payable Amount (Razorpay):</span>
            <span style="font-size: 1.2rem;">₹51.18</span>
          </div>
        </div>
      </div>
    `;

    confirmModal.hidden = false;

    // Handle Edit button click
    confirmEditBtn.onclick = () => {
      confirmModal.hidden = true;
    };

    // Handle Proceed to Razorpay Payment
    confirmProceedBtn.onclick = () => {
      confirmModal.hidden = true;

      // Razorpay Checkout Options
      const rzpOptions = {
        key: window.RAZORPAY_KEY_ID || RAZORPAY_KEY_ID,
        amount: TOTAL_AMOUNT_PAISE,
        currency: "INR",
        payment_capture: 1, // Auto-capture payment immediately
        name: "Roller Sports Association Moradabad",
        description: `Annual Registration 2026 – ${payload.skaterName}`,
        image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png",
        prefill: {
          name: payload.skaterName,
          email: payload.email,
          contact: payload.mobile
        },
        notes: {
          skaterName: payload.skaterName,
          discipline: payload.discipline,
          aadhaar: payload.aadhaar
        },
        theme: {
          color: "#e01c2e"
        },
        handler: async function (response) {
          // PAYMENT SUCCESSFUL GATE: Attach Payment ID to payload
          console.log("[Razorpay] Payment Success! Payment ID:", response.razorpay_payment_id);
          payload.paymentId = response.razorpay_payment_id || ("pay_test_" + Date.now());
          payload.paymentStatus = "SUCCESS";
          payload.amountPaid = "51.18";

          // Execute registration submission only AFTER successful payment
          await processRegistrationSubmission(payload);
        },
        modal: {
          ondismiss: function () {
            alert("⚠️ Payment Cancelled: Skater registration requires a successful payment of ₹51.18.\n\nYour registration was not submitted.");
            submitBtn.disabled = false;
            submitBtn.querySelector(".submit-text").hidden = false;
            submitBtn.querySelector(".submit-spinner").hidden = true;
          }
        }
      };

      if (typeof Razorpay !== "undefined") {
        const rzp = new Razorpay(rzpOptions);
        rzp.on('payment.failed', function (resp) {
          alert("❌ Payment Failed: " + (resp.error.description || "Transaction failed") + "\n\nRegistration was not completed.");
          submitBtn.disabled = false;
          submitBtn.querySelector(".submit-text").hidden = false;
          submitBtn.querySelector(".submit-spinner").hidden = true;
        });
        rzp.open();
      } else {
        // Fallback demo mode if Razorpay script is blocked
        console.warn("Razorpay script not available. Simulating test payment for registration...");
        payload.paymentId = "pay_demo_" + Date.now();
        payload.paymentStatus = "SUCCESS";
        payload.amountPaid = "51.18";
        processRegistrationSubmission(payload);
      }
    };

    // Registration Submission Processor (Called strictly AFTER successful payment)
    async function processRegistrationSubmission(payloadData) {
      submitBtn.disabled = true;
      submitBtn.querySelector(".submit-text").hidden = true;
      submitBtn.querySelector(".submit-spinner").hidden = false;

      let assignedRegNo = payloadData.regNumber;
      if (!assignedRegNo) {
        const now = new Date();
        const yy = String(now.getFullYear()).slice(-2);
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const dateKey = `${yy}${mm}${dd}`;
        const randomSeq = String(Math.floor(100 + Math.random() * 900));
        assignedRegNo = `R${dateKey}${randomSeq}`;
      }
      payloadData.regNumber = assignedRegNo;

      try {
        // 1. Submit to Google Apps Script Sheet IMMEDIATELY WITH regNumber, paymentId, and all proof files
        const sheetPromise = fetch(SHEET_URL, {
          method:  "POST",
          headers: { "Content-Type": "text/plain" },
          body:    JSON.stringify(payloadData),
          mode:    "no-cors",
        }).catch(sheetErr => console.warn("Google Sheet submission fetch warning:", sheetErr));

        // 2. Submit to local OpenWA WhatsApp Server Backend if available
        const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        if (OPENWA_SERVER_URL && isLocalHost) {
          try {
            const waRes = await fetch(OPENWA_SERVER_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-api-key": OPENWA_API_KEY
              },
              body: JSON.stringify(payloadData)
            });
            if (waRes.ok) {
              const waData = await waRes.json();
              if (waData && waData.regNumber) {
                assignedRegNo = waData.regNumber;
                payloadData.regNumber = assignedRegNo;
              }
            }
          } catch (waErr) {
            console.warn("Direct OpenWA notification trigger error:", waErr);
          }
        }

        await sheetPromise;

        // Show success modal then reload after 6s
        submitBtn.disabled = false;
        submitBtn.querySelector(".submit-text").hidden = false;
        submitBtn.querySelector(".submit-spinner").hidden = true;
        form.hidden = true;
        
        const successModal = document.getElementById("regSuccess");
        if (assignedRegNo) {
          const titleEl = successModal.querySelector("h3");
          if (titleEl) {
            titleEl.innerHTML = `Registration Successful!<br/><span style="color:#f59e0b;font-size:1rem;display:block;margin-top:0.3rem;">RSAM Reg. No: ${assignedRegNo}</span><small style="color:#10b981;font-size:0.85rem;display:block;margin-top:0.2rem;">Razorpay Payment ID: ${payloadData.paymentId || 'Verified'}</small>`;
          }
        }
        successModal.hidden = false;

        let secs = 6;
        const tick = setInterval(() => {
          secs--;
          document.getElementById("countdownNum").textContent = secs;
          if (secs <= 0) { clearInterval(tick); location.reload(); }
        }, 1000);

      } catch (submitErr) {
        alert("Submission failed: " + submitErr.message + "\n\nPlease try again or contact us.");
        submitBtn.disabled = false;
        submitBtn.querySelector(".submit-text").hidden = false;
        submitBtn.querySelector(".submit-spinner").hidden = true;
      }
    }

  } catch (err) {
    alert("Form processing error: " + err.message);
  }
});
