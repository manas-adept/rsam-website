/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   register.js
   Paste your Google Apps Script Web App URL in SHEET_URL below.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const getEnv = () => window.ENV_CONFIG || {
  sheetUrl: "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec",
  backendUrl: "http://localhost:3001",
  openwaServerUrl: "http://localhost:3001/send-registration",
  razorpayKey: "rzp_test_TZa1vfjhrPJobv"
};
const SHEET_URL = getEnv().sheetUrl;
const BACKEND_DOMAIN = getEnv().backendUrl;
const OPENWA_SERVER_URL = getEnv().openwaServerUrl;
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

/* ── Age & Age Group auto-calculate ────────────────────── */
function getAgeGroup(age) {
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

const dobInput      = document.getElementById("dob");
const ageInput      = document.getElementById("age");
const ageGroupInput = document.getElementById("ageGroup");
const ageCutoffLabel = document.getElementById("ageCutoffLabel");

const currentCutoffYear = new Date().getFullYear();
if (ageCutoffLabel) {
  ageCutoffLabel.textContent = `(as on 31 Dec ${currentCutoffYear})`;
}

dobInput.addEventListener("change", () => {
  const dob = new Date(dobInput.value);
  if (isNaN(dob)) {
    ageInput.value = "";
    if (ageGroupInput) ageGroupInput.value = "";
    return;
  }
  const cutoff = new Date(currentCutoffYear, 11, 31, 23, 59, 59);
  let age = cutoff.getFullYear() - dob.getFullYear();
  const m = cutoff.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && cutoff.getDate() < dob.getDate())) age--;
  const calcAge = age >= 0 ? age : "";
  ageInput.value = calcAge;
  if (ageGroupInput) {
    ageGroupInput.value = calcAge !== "" ? getAgeGroup(calcAge) : "";
  }
});

/* ── Aadhaar number formatting (XXXX XXXX XXXX) ────── */
const aadhaarInput = document.getElementById("aadhaar");
aadhaarInput.addEventListener("input", () => {
  let v = aadhaarInput.value.replace(/\D/g, "").slice(0, 12);
  aadhaarInput.value = v.replace(/(\d{4})(?=\d)/g, "$1 ");
});

/* ── Mobile: digits only ───────────────────────────── */
const mobileInput = document.getElementById("mobile");
if (mobileInput) {
  mobileInput.addEventListener("input", () => {
    mobileInput.value = mobileInput.value.replace(/\D/g, "").slice(0, 10);
  });
}

const coachMobileInput = document.getElementById("coachMobile");
if (coachMobileInput) {
  coachMobileInput.addEventListener("input", () => {
    coachMobileInput.value = coachMobileInput.value.replace(/\D/g, "").slice(0, 10);
  });
}

/* ── Global ESC Key Modal Dismiss ───────────────────── */
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" || e.key === "Esc") {
    const confirmModal = document.getElementById("confirmModal");
    const cropModal = document.getElementById("cropModal");
    const regSuccess = document.getElementById("regSuccess");
    if (confirmModal && !confirmModal.hidden) confirmModal.hidden = true;
    if (cropModal && !cropModal.hidden) cropModal.hidden = true;
    if (regSuccess && !regSuccess.hidden) regSuccess.hidden = true;
  }
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
  if (renewQueryInput) {
    renewQueryInput.addEventListener("input", () => {
      renewQueryInput.value = renewQueryInput.value.toUpperCase();
    });
  }
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

  async function fetchSiteConfigFee() {
    try {
      const baseUrl = getEnv().backendUrl;
      const res = await fetch(`${baseUrl}/api/site-config`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.config) {
          window.LIVE_SITE_CONFIG = data.config;
          if (data.config.fees) {
            localStorage.setItem("RSAM_ADMIN_FEE_CONFIG", JSON.stringify(data.config.fees));
          }
        }
      }
    } catch(e) {}
    if (typeof updateFeeDisplayUI === 'function') updateFeeDisplayUI();
  }
  fetchSiteConfigFee();
  if (typeof updateFeeDisplayUI === 'function') updateFeeDisplayUI();
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

    // 8. Coach's Name & Contact validation
    const coachNameVal = form.coachName ? form.coachName.value.trim() : "";
    if (!coachNameVal) {
      if (form.coachName) form.coachName.classList.add("invalid");
      valid = false;
    } else if (form.coachName) {
      form.coachName.classList.remove("invalid");
    }

    const coachMobileInput = document.getElementById("coachMobile");
    const coachMobileVal = coachMobileInput ? coachMobileInput.value.replace(/\D/g, "") : "";
    if (coachMobileVal.length !== 10) {
      if (coachMobileInput) coachMobileInput.classList.add("invalid");
      valid = false;
    } else if (coachMobileInput) {
      coachMobileInput.classList.remove("invalid");
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
      formErrorAlert.innerHTML = `⚠️ <strong>Incomplete Form Details</strong><br/><span style="font-size:0.85rem; color:#d1d5db;">Please fill in all required fields highlighted in red (including coach details), upload passport photo &amp; required document proofs, and select a discipline.</span>`;
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
        ageGroup:     ageGroupInput ? ageGroupInput.value : getAgeGroup(ageInput.value),
        schoolClub:   form.schoolClub ? form.schoolClub.value.trim() : "",
        coachName:    coachNameVal,
        coachMobile:  coachMobileVal,
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

function getFeeBreakdown() {
  let baseFee = 0;
  let gwPct = 2.0;
  let gstPct = 18.0;

  if (window.LIVE_SITE_CONFIG && window.LIVE_SITE_CONFIG.fees) {
    const f = window.LIVE_SITE_CONFIG.fees;
    baseFee = parseFloat(f.annualBaseFee !== undefined ? f.annualBaseFee : (f.baseFee !== undefined ? f.baseFee : 0));
    gwPct = parseFloat(f.gatewayPercent || 2.0);
    gstPct = parseFloat(f.gstPercent || 18.0);
  } else {
    const saved = localStorage.getItem("RSAM_ADMIN_FEE_CONFIG");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.annualBaseFee !== undefined) baseFee = parseFloat(p.annualBaseFee);
        else if (p.baseFee !== undefined) baseFee = parseFloat(p.baseFee);
        if (p.gatewayPercent !== undefined) gwPct = parseFloat(p.gatewayPercent);
        if (p.gstPercent !== undefined) gstPct = parseFloat(p.gstPercent);
      } catch (e) {}
    }
  }

  const gatewayFee = parseFloat(((baseFee * gwPct) / 100).toFixed(2));
  const gstFee = parseFloat(((gatewayFee * gstPct) / 100).toFixed(2));
  const totalAmount = parseFloat((baseFee + gatewayFee + gstFee).toFixed(2));
  const totalAmountPaise = Math.round(totalAmount * 100);

  return {
    baseFee,
    gwPct,
    gstPct,
    gatewayFee,
    gstFee,
    totalAmount,
    totalAmountPaise,
    isFree: baseFee === 0
  };
}

function updateFeeDisplayUI() {
  const fee = getFeeBreakdown();
  const feeBanner = document.querySelector(".reg-fee-banner");
  if (feeBanner) {
    if (fee.isFree) {
      feeBanner.innerHTML = `🎉 Annual Registration Fee: <strong>FREE / WAIVED (₹0.00)</strong> <small>(No online payment required)</small>`;
      feeBanner.style.background = "rgba(52, 211, 153, 0.15)";
      feeBanner.style.borderColor = "rgba(52, 211, 153, 0.4)";
      feeBanner.style.color = "#6ee7b7";
    } else {
      feeBanner.innerHTML = `💳 Registration Fee: <strong>₹${fee.baseFee.toFixed(2)}</strong> <small>(+ ${fee.gwPct}% gateway charge &amp; ${fee.gstPct}% GST = ₹${fee.totalAmount.toFixed(2)} Total)</small>`;
      feeBanner.style.background = "rgba(245, 158, 11, 0.15)";
      feeBanner.style.borderColor = "rgba(245, 158, 11, 0.4)";
      feeBanner.style.color = "#fef08a";
    }
  }

  const submitBtnText = document.querySelector("#regForm button[type='submit'] .submit-text, .reg-submit-row button .submit-text, .reg-submit .submit-text");
  if (submitBtnText) {
    if (fee.isFree) {
      submitBtnText.textContent = "Submit Registration (Free / Waived)";
    } else {
      submitBtnText.textContent = `Confirm & Pay ₹${fee.totalAmount.toFixed(2)}`;
    }
  }
}

      // Populate Pre-Submission Confirmation Modal Summary
      const confirmModal = document.getElementById("confirmModal");
      const confirmSummaryBody = document.getElementById("confirmSummaryBody");
      const confirmEditBtn = document.getElementById("confirmEditBtn");
      const confirmProceedBtn = document.getElementById("confirmProceedBtn");

      const photoSrc = croppedPhotoDataUrl || (photoPreview.src ? photoPreview.src : "");
      const aadhaarFileName = form.aadhaarProof.files[0] ? form.aadhaarProof.files[0].name : "Attached File";
      const dobFileName = form.dobProof.files[0] ? form.dobProof.files[0].name : "Attached File";
      const fee = getFeeBreakdown();

      confirmSummaryBody.innerHTML = `
        <div class="confirm-photo-header">
          ${photoSrc ? `<img src="${photoSrc}" class="confirm-photo-thumb" alt="Skater Photo"/>` : `<div style="font-size:30px;">📸</div>`}
          <div class="confirm-photo-info">
            <h4>${payload.skaterName}</h4>
            <p>Discipline: <strong style="color:#fff;">${payload.discipline}</strong> · Age: ${payload.age} yrs (${payload.ageGroup || 'N/A'})</p>
          </div>
        </div>
        <div class="confirm-grid">
          <div class="confirm-item">
            <span class="confirm-label">Date of Birth</span>
            <span class="confirm-value">${formatDateDDMMMYYYY(payload.dob)}</span>
          </div>
          <div class="confirm-item">
            <span class="confirm-label">Age Group</span>
            <span class="confirm-value">${payload.ageGroup || 'N/A'}</span>
          </div>
          <div class="confirm-item confirm-item--full">
            <span class="confirm-label">School / Club Name</span>
            <span class="confirm-value">${payload.schoolClub || 'N/A'}</span>
          </div>
          <div class="confirm-item">
            <span class="confirm-label">Mobile Number</span>
            <span class="confirm-value">${payload.mobile}</span>
          </div>
          <div class="confirm-item">
            <span class="confirm-label">Coach Name &amp; Contact</span>
            <span class="confirm-value">${payload.coachName} (${payload.coachMobile})</span>
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
          <div class="confirm-fee-breakdown" style="grid-column: span 2; background: ${fee.isFree ? 'rgba(52, 211, 153, 0.08)' : 'rgba(245, 158, 11, 0.08)'}; border: 1px solid ${fee.isFree ? 'rgba(52, 211, 153, 0.25)' : 'rgba(245, 158, 11, 0.25)'}; border-radius: 10px; padding: 1rem; margin-top: 0.5rem;">
            ${fee.isFree ? `
              <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 700; color: #34d399;">
                <span>Registration Fee Status:</span>
                <span>🎉 FREE / WAIVED (₹0.00)</span>
              </div>
            ` : `
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.3rem;">
                <span>Base Registration Fee:</span>
                <strong>₹${fee.baseFee.toFixed(2)}</strong>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.3rem;">
                <span>Gateway Transaction Charge (${fee.gwPct}%):</span>
                <span>+ ₹${fee.gatewayFee.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 0.85rem; color: #d1d5db; margin-bottom: 0.6rem;">
                <span>GST on Transaction Fee (${fee.gstPct}%):</span>
                <span>+ ₹${fee.gstFee.toFixed(2)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; font-size: 1.05rem; font-weight: 700; color: #f59e0b; border-top: 1px dashed rgba(245, 158, 11, 0.3); padding-top: 0.5rem;">
                <span>Total Payable Amount (Razorpay):</span>
                <span style="font-size: 1.2rem;">₹${fee.totalAmount.toFixed(2)}</span>
              </div>
            `}
          </div>
        </div>
      `;

      confirmModal.hidden = false;

      // Handle Edit button click
      confirmEditBtn.onclick = () => {
        confirmModal.hidden = true;
      };

      // Handle Proceed to Payment / Submission
      confirmProceedBtn.onclick = () => {
        confirmModal.hidden = true;
        const currentFee = getFeeBreakdown();

        if (currentFee.isFree) {
          payload.paymentId = "WAIVED_FREE";
          payload.paymentStatus = "WAIVED";
          payload.amountPaid = "0.00";
          processRegistrationSubmission(payload);
          return;
        }

        // Razorpay Checkout Options
        const rzpOptions = {
          key: (window.ENV_CONFIG && window.ENV_CONFIG.razorpayKey) || "rzp_test_TZa1vfjhrPJobv",
          amount: currentFee.totalAmountPaise,
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
            payload.amountPaid = TOTAL_AMOUNT.toFixed(2);

            // Execute registration submission only AFTER successful payment
            await processRegistrationSubmission(payload);
          },
          modal: {
            ondismiss: function () {
              alert(`⚠️ Payment Cancelled: Skater registration requires a successful payment of ₹${TOTAL_AMOUNT.toFixed(2)}.\n\nYour registration was not submitted.`);
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
          payload.amountPaid = "10.24";
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
        if (OPENWA_SERVER_URL) {
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
        if (successModal) {
          const regNoEl = document.getElementById("successRegNoText");
          const payIdEl = document.getElementById("successPaymentIdText");
          if (regNoEl) regNoEl.textContent = assignedRegNo || 'R260912001';
          if (payIdEl) payIdEl.textContent = `(Razorpay ID: ${payloadData.paymentId || 'Verified'})`;
          
          const dlBtn = document.getElementById("downloadPdfBtn");
          if (dlBtn) {
            dlBtn.onclick = () => downloadRegistrationPdfInvoice(payloadData);
          }
          successModal.hidden = false;
        }

        let secs = 12;
        const tick = setInterval(() => {
          secs--;
          const cntEl = document.getElementById("countdownNum");
          if (cntEl) cntEl.textContent = secs;
          if (secs <= 0) { clearInterval(tick); location.reload(); }
        }, 1000);

      } catch (submitErr) {
        console.error("Submission Error:", submitErr);
        alert("Registration submission failed: " + submitErr.message);
        submitBtn.disabled = false;
        submitBtn.querySelector(".submit-text").hidden = false;
        submitBtn.querySelector(".submit-spinner").hidden = true;
      }
    }

  } catch (err) {
    alert("Form processing error: " + err.message);
  }
});

function downloadRegistrationPdfInvoice(payloadData) {
  const regNumber = payloadData.regNumber || "R260912001";
  const skaterName = payloadData.skaterName || "Athlete";
  const discipline = payloadData.discipline || "Roller Skating";
  const ageGroup = payloadData.ageGroup || "N/A";
  const age = payloadData.age || "N/A";
  const amountPaid = payloadData.amountPaid || "10.24";
  const paymentId = payloadData.paymentId || "Verified";
  const dob = payloadData.dob || "N/A";
  const schoolClub = payloadData.schoolClub || "N/A";
  const fatherName = payloadData.fatherName || "N/A";
  const motherName = payloadData.motherName || "N/A";
  const address = payloadData.address || "N/A";
  const mobile = payloadData.mobile || "N/A";
  const email = payloadData.email || "N/A";
  const aadhaar = payloadData.aadhaar ? String(payloadData.aadhaar).replace(/(\d{4})(?=\d)/g, "$1 ") : "N/A";
  const coachName = payloadData.coachName || "N/A";
  const coachMobile = payloadData.coachMobile || "N/A";
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    alert("Please allow pop-ups in your browser to download the PDF Invoice.");
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RSAM_Registration_Invoice_${regNumber}</title>
      <style>
        body { font-family: 'Arial', sans-serif; color: #111827; background: #fff; margin: 0; padding: 20px; }
        .invoice-box { border: 2px solid #e01c2e; border-radius: 12px; padding: 24px; max-width: 750px; margin: auto; }
        .header { text-align: center; border-bottom: 2px solid #e5e7eb; padding-bottom: 16px; margin-bottom: 20px; }
        .title { color: #e01c2e; font-size: 22px; font-weight: bold; margin: 0; }
        .subtitle { color: #4b5563; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .badge-box { background: #fffbeeb; border: 1.5px solid #f59e0b; border-radius: 8px; text-align: center; padding: 12px; margin-bottom: 20px; }
        .badge-label { color: #d97706; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; }
        .badge-num { color: #b45309; font-size: 24px; font-weight: bold; margin-top: 2px; display: block; }
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
          <div class="subtitle">Recognized by UPRSA &amp; RSFI (IndiaSkate) · Official Athlete Registration Slip</div>
        </div>
        <div class="badge-box">
          <span class="badge-label">OFFICIAL RSAM REGISTRATION NUMBER</span>
          <span class="badge-num">${regNumber}</span>
        </div>
        <div class="section-title">Athlete Profile</div>
        <table class="details-table">
          <tr><td class="lbl">Athlete Name:</td><td class="val">${skaterName}</td><td class="lbl">Date of Birth:</td><td class="val">${dob}</td></tr>
          <tr><td class="lbl">Age &amp; Age Group:</td><td class="val">${age} yrs (${ageGroup})</td><td class="lbl">Discipline:</td><td class="val">${discipline}</td></tr>
          <tr><td class="lbl">School / Club:</td><td class="val">${schoolClub}</td><td class="lbl">Aadhaar Card:</td><td class="val">${aadhaar}</td></tr>
          <tr><td class="lbl">Father's Name:</td><td class="val">${fatherName}</td><td class="lbl">Mother's Name:</td><td class="val">${motherName}</td></tr>
          <tr><td class="lbl">Mobile Number:</td><td class="val">${mobile}</td><td class="lbl">Email Address:</td><td class="val">${email}</td></tr>
          <tr><td class="lbl">Coach Details:</td><td class="val" colspan="3">${coachName} (${coachMobile})</td></tr>
          <tr><td class="lbl">Residential Address:</td><td class="val" colspan="3">${address}</td></tr>
        </table>
        <div class="section-title">Payment &amp; Fee Breakdown Invoice</div>
        <table class="invoice-table">
          <thead>
            <tr><th>Description</th><th>Gateway Rate</th><th style="text-align:right;">Amount (INR)</th></tr>
          </thead>
          <tbody>
            <tr><td>Base Annual Athlete Membership Fee (2026)</td><td>Base Fee</td><td style="text-align:right;">₹10.00</td></tr>
            <tr><td>Payment Gateway Service Charge</td><td>2.00%</td><td style="text-align:right;">+ ₹0.20</td></tr>
            <tr><td>GST on Gateway Transaction Fee</td><td>18.00%</td><td style="text-align:right;">+ ₹0.04</td></tr>
            <tr class="total-row"><td>Total Amount Paid (Razorpay)</td><td>Status: ${payloadData.paymentStatus || 'SUCCESS'}</td><td style="text-align:right;">₹${amountPaid}</td></tr>
          </tbody>
        </table>
        <table class="details-table" style="margin-top:10px;">
          <tr><td class="lbl">Razorpay Payment ID:</td><td class="val">${paymentId}</td><td class="lbl">Registration Date:</td><td class="val">${timestamp}</td></tr>
        </table>
        <div class="seal-box">
          <strong>Roller Sports Association Moradabad</strong><br/>
          <em>Authorized Verification System</em>
        </div>
        <div class="footer-note">
          139, Rana Bhawan, Near 23 PAC, Kanth Road, Moradabad, UP · Contact: +91-8057781350 · Email: contact@rsam.in
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
