/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   register.js
   Paste your Google Apps Script Web App URL in SHEET_URL below.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
// https://script.google.com/macros/s/AKfycbyohDIL5CEpuaT3pBp7dh6bzm9c-ccQDAEhfneIe4ADsGTmL5_70oKfnFIjp_BiuUncUg/exec
const SHEET_URL = "https://script.google.com/macros/s/AKfycbyohDIL5CEpuaT3pBp7dh6bzm9c-ccQDAEhfneIe4ADsGTmL5_70oKfnFIjp_BiuUncUg/exec";

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
function bindFileDrop(inputId, nameId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(nameId);
  input.addEventListener("change", () => {
    label.textContent = input.files[0] ? input.files[0].name : "";
  });
}
bindFileDrop("aadhaarProof", "aadhaarFileName");
bindFileDrop("dobProof",     "dobFileName");

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

  /* Basic validation */
  let valid = true;
  form.querySelectorAll("[required]").forEach(el => {
    if (!el.value.trim()) { el.classList.add("invalid"); valid = false; }
    else el.classList.remove("invalid");
  });

  const discipline = form.querySelector("input[name='discipline']:checked");
  if (!discipline) { discError.hidden = false; valid = false; }
  else discError.hidden = true;

  const mobile = mobileInput.value.replace(/\D/g, "");
  if (mobile.length !== 10) { mobileInput.classList.add("invalid"); valid = false; }

  const aadhaarRaw = aadhaarInput.value.replace(/\s/g, "");
  if (aadhaarRaw.length !== 12) { aadhaarInput.classList.add("invalid"); valid = false; }

  if (!valid) return;

  /* Disable button, show spinner */
  submitBtn.disabled = true;
  submitBtn.querySelector(".submit-text").hidden = true;
  submitBtn.querySelector(".submit-spinner").hidden = false;

  try {
    const toBase64 = file => new Promise((res, rej) => {
      const r = new FileReader();
      r.onload  = () => res({ name: file.name, type: file.type, data: r.result.split(",")[1] });
      r.onerror = rej;
      r.readAsDataURL(file);
    });

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
      aadhaarProof: aadhaarFile,
      dobProof:     dobFile,
    };

    await fetch(SHEET_URL, {
      method:  "POST",
      headers: { "Content-Type": "text/plain" },
      body:    JSON.stringify(payload),
      mode:    "no-cors",
    });

    // Show success modal then reload after 6s
    submitBtn.disabled = false;
    submitBtn.querySelector(".submit-text").hidden = false;
    submitBtn.querySelector(".submit-spinner").hidden = true;
    form.hidden = true;
    document.getElementById("regSuccess").hidden = false;
    let secs = 6;
    const tick = setInterval(() => {
      secs--;
      document.getElementById("countdownNum").textContent = secs;
      if (secs <= 0) { clearInterval(tick); location.reload(); }
    }, 1000);
  } catch (err) {
    alert("Submission failed: " + err.message + "\n\nPlease try again or contact us.");
    submitBtn.disabled = false;
    submitBtn.querySelector(".submit-text").hidden = false;
    submitBtn.querySelector(".submit-spinner").hidden = true;
  }
});
