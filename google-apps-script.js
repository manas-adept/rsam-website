/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   Google Apps Script for RSAM Registration + 4th District Championship Event
   
   INSTRUCTIONS FOR SETUP:
   1. Open your Google Sheet linked to the registration form.
   2. Click Extensions -> Apps Script.
   3. Replace all code in Code.gs / rsam.gs with this script.
   4. Update SHEET_ID and DRIVE_FOLDER_ID below if needed.
   5. Click Deploy -> Manage deployments -> Pencil (Edit) -> Version: New version -> Deploy.
      (Ensure "Who has access" is set to "Anyone")
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const SHEET_ID        = "1ze7Ao6ZCXPVKXAjiLfYt6uzjVP2XgfSn5VZeot7rdrs";
const DRIVE_FOLDER_ID = "1M6uBBAv2xCIr2UN_KQP5CP86_a80zhoP";
const OPENWA_SERVER_URL = "http://localhost:3001/send-registration";
const API_SECRET_KEY    = "rsam_whatsapp_secret_key_2026";

/**
 * HTTP GET Endpoint — Used for RSAM Reg No Lookup & Auto-Populate
 */
function doGet(e) {
  try {
    const action = e ? e.parameter.action : "";
    const currentYear = new Date().getFullYear().toString();
    const ss = getSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Could not access spreadsheet." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Helper: Parse row to skater object
    function parseSkaterRow(data, i, headers, regNumber) {
      function findHeaderIndex(candidates, fallbackIdx) {
        for (let candidate of candidates) {
          const idx = headers.findIndex(h => h.includes(candidate));
          if (idx !== -1) return idx;
        }
        return fallbackIdx;
      }
      const regIdx        = findHeaderIndex(["rsam reg", "reg no", "reg. no", "reg number", "registration no"], 1);
      const nameIdx       = findHeaderIndex(["skater name", "name"], 3);
      const dobIdx        = findHeaderIndex(["date of birth", "dob"], 4);
      const ageIdx        = findHeaderIndex(["age"], 5);
      const ageGroupIdx   = findHeaderIndex(["age group", "agegroup"], 6);
      const schoolClubIdx = findHeaderIndex(["school", "club", "institution"], 7);
      const coachNameIdx   = findHeaderIndex(["coach name", "coach's name"], 8);
      const coachMobileIdx = findHeaderIndex(["coach mobile", "coach contact", "coach phone"], 9);
      const fatherIdx     = findHeaderIndex(["father"], 10);
      const motherIdx     = findHeaderIndex(["mother"], 11);
      const addressIdx    = findHeaderIndex(["address"], 12);
      const mobileIdx     = findHeaderIndex(["mobile", "phone", "contact"], 13);
      const emailIdx      = findHeaderIndex(["email"], 14);
      const aadhaarIdx    = findHeaderIndex(["aadhaar", "adhar"], 15);
      const discIdx       = findHeaderIndex(["discipline", "category"], 16);
      const photoIdx      = findHeaderIndex(["photo", "picture", "avatar"], 20);

      return {
        regNumber: String(data[i][regIdx] || regNumber),
        skaterName: String(data[i][nameIdx] || ""),
        dob: String(data[i][dobIdx] || ""),
        age: String(data[i][ageIdx] || ""),
        ageGroup: String(data[i][ageGroupIdx] || ""),
        schoolClub: String(data[i][schoolClubIdx] || ""),
        coachName: String(data[i][coachNameIdx] || ""),
        coachMobile: String(data[i][coachMobileIdx] || "").replace(/^'/, ""),
        fatherName: String(data[i][fatherIdx] || ""),
        motherName: String(data[i][motherIdx] || ""),
        address: String(data[i][addressIdx] || ""),
        mobile: String(data[i][mobileIdx] || "").replace(/^'/, ""),
        email: String(data[i][emailIdx] || ""),
        aadhaar: String(data[i][aadhaarIdx] || "").replace(/^'/, ""),
        discipline: String(data[i][discIdx] || ""),
        photoUrl: String(data[i][photoIdx] || "")
      };
    }

    // 1. EVENT REGISTRATION LOOKUP — Strict Current Year (2026) Check
    if (action === "lookup") {
      const regNumber = (e && e.parameter.regNumber ? e.parameter.regNumber : "").trim().toUpperCase();
      if (!regNumber) {
        return ContentService.createTextOutput(JSON.stringify({ status: "not_found", message: "Please enter a valid RSAM Registration Number." }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      // First check Current Year Sheet (Registrations 2026)
      const currentSheet = ss.getSheetByName("Registrations " + currentYear) || ss.getActiveSheet();
      if (currentSheet) {
        const data = currentSheet.getDataRange().getValues();
        if (data.length > 1) {
          const headers = data[0].map(h => String(h).trim().toLowerCase());
          const regIdx = headers.findIndex(h => h.includes("rsam reg") || h.includes("reg no") || h.includes("registration no"));
          const targetIdx = regIdx !== -1 ? regIdx : 1;
          for (let i = 1; i < data.length; i++) {
            const rowReg = String(data[i][targetIdx] || "").trim().toUpperCase();
            if (rowReg === regNumber) {
              const skater = parseSkaterRow(data, i, headers, regNumber);
              return ContentService.createTextOutput(JSON.stringify({ status: "found", skater: skater }))
                .setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }

      // Check if registration exists in a PAST year sheet
      const allSheets = ss.getSheets();
      for (let sheet of allSheets) {
        const sName = sheet.getName();
        if (sName.toLowerCase().includes("registrations") && !sName.includes(currentYear)) {
          const data = sheet.getDataRange().getValues();
          if (data.length <= 1) continue;
          const headers = data[0].map(h => String(h).trim().toLowerCase());
          const regIdx = headers.findIndex(h => h.includes("rsam reg") || h.includes("reg no") || h.includes("registration no"));
          const targetIdx = regIdx !== -1 ? regIdx : 1;
          for (let i = 1; i < data.length; i++) {
            const rowReg = String(data[i][targetIdx] || "").trim().toUpperCase();
            if (rowReg === regNumber) {
              return ContentService.createTextOutput(JSON.stringify({
                status: "not_found",
                isPastYear: true,
                message: `RSAM Registration (${regNumber}) is from a previous year and not active for ${currentYear}. Please renew your annual RSAM registration for ${currentYear} first.`
              })).setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "not_found",
        isPastYear: false,
        message: `RSAM Registration Number ${regNumber} was not found for ${currentYear}.`
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. ANNUAL REGISTRATION RENEWAL LOOKUP — Searches Reg No or Mobile across ALL sheets
    if (action === "renew_lookup") {
      const rawQuery = (e.parameter.query || e.parameter.regNumber || e.parameter.mobile || "").trim().toUpperCase();
      const mobileQuery = rawQuery.replace(/\D/g, "");

      if (!rawQuery) {
        return ContentService.createTextOutput(JSON.stringify({ status: "not_found", message: "Please enter your previous RSAM Registration Number or 10-digit mobile number." }))
          .setMimeType(ContentService.MimeType.JSON);
      }

      const allSheets = ss.getSheets();
      for (let sheet of allSheets) {
        if (sheet.getName().toLowerCase().includes("registrations")) {
          const data = sheet.getDataRange().getValues();
          if (data.length <= 1) continue;
          const headers = data[0].map(h => String(h).trim().toLowerCase());
          
          const regIdx = headers.findIndex(h => h.includes("rsam reg") || h.includes("reg no"));
          const mobileIdx = headers.findIndex(h => h.includes("mobile") || h.includes("phone"));
          const targetRegIdx = regIdx !== -1 ? regIdx : 1;
          const targetMobileIdx = mobileIdx !== -1 ? mobileIdx : 9;

          for (let i = 1; i < data.length; i++) {
            const rowReg = String(data[i][targetRegIdx] || "").trim().toUpperCase();
            const rowMobile = String(data[i][targetMobileIdx] || "").replace(/\D/g, "");
            
            if (rowReg === rawQuery || (mobileQuery.length === 10 && rowMobile.endsWith(mobileQuery))) {
              const skater = parseSkaterRow(data, i, headers, rowReg);
              return ContentService.createTextOutput(JSON.stringify({ status: "found", skater: skater }))
                .setMimeType(ContentService.MimeType.JSON);
            }
          }
        }
      }

      return ContentService.createTextOutput(JSON.stringify({ status: "not_found", message: `No previous registration record found for '${rawQuery}'. You can fill in your details below.` }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. BULK BROADCAST LOOKUP — Fetches all contacts grouped by sheet tab name
    if (action === "fetch_all_contacts") {
      const allSheets = ss.getSheets();
      const sheetData = [];

      for (let sheet of allSheets) {
        const sName = sheet.getName();
        const data = sheet.getDataRange().getValues();
        if (data.length <= 1) continue;

        const headers = data[0].map(h => String(h).trim().toLowerCase());
        const records = [];

        for (let i = 1; i < data.length; i++) {
          const row = data[i];
          if (!row || !row.some(cell => cell !== "")) continue;
          records.push(parseSkaterRow(data, i, headers, ""));
        }

        if (records.length > 0) {
          sheetData.push({
            sheetName: sName,
            count: records.length,
            records: records
          });
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        count: sheetData.reduce((acc, curr) => acc + curr.count, 0),
        sheets: sheetData
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ok", service: "RSAM API 2026" }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSpreadsheet() {
  if (SHEET_ID) {
    try {
      return SpreadsheetApp.openById(SHEET_ID);
    } catch (err) {
      Logger.log("openById failed, falling back to active spreadsheet: " + err.toString());
    }
  }
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (err2) {
    Logger.log("getActiveSpreadsheet failed: " + err2.toString());
    return null;
  }
}

/**
 * HTTP POST Endpoint — Handles Annual Skater Registrations & Event Registrations
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = getSpreadsheet();
    if (!ss) {
      return ContentService.createTextOutput(JSON.stringify({ status: "error", message: "Could not access spreadsheet." }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Check if this is an Event Registration (e.g. 4th District Championship 2026)
    if (data.type === "event_registration") {
      const eventTabName = data.eventName || "District Championship 2026";
      let eventSheet = ss.getSheetByName(eventTabName);
      if (!eventSheet) {
        eventSheet = ss.insertSheet(eventTabName);
      }

      if (eventSheet.getLastRow() === 0) {
        eventSheet.appendRow([
          "Timestamp",
          "Event Reg No",
          "RSAM Reg No",
          "Event Name",
          "Skater Name",
          "Date of Birth",
          "Age",
          "Age Group",
          "School / Club Name",
          "Coach Name",
          "Coach Contact Number",
          "Father Name",
          "Mother Name",
          "Address",
          "Mobile Number",
          "Email",
          "Aadhaar Number",
          "Discipline",
          "Razorpay Payment ID",
          "Payment Status",
          "Amount Paid",
          "Skater Photo URL"
        ]);
      }

      const eventRegNo = "EVT26_" + String(data.regNumber || "").replace(/^R/, "") + "_" + (eventSheet.getLastRow());

      eventSheet.appendRow([
        new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
        eventRegNo,
        data.regNumber || "N/A",
        data.eventName || "4th District Championship 2026",
        data.skaterName,
        data.dob,
        data.age,
        data.ageGroup || "N/A",
        data.schoolClub || "N/A",
        data.coachName || "N/A",
        "'" + (data.coachMobile || "N/A"),
        data.fatherName,
        data.motherName,
        data.address,
        "'" + data.mobile,
        data.email || "N/A",
        "'" + data.aadhaar,
        data.discipline,
        data.paymentId || "pay_verified",
        data.paymentStatus || "SUCCESS",
        "₹" + (data.amountPaid || "511.80"),
        data.photoUrl || ""
      ]);

      if (OPENWA_SERVER_URL && !OPENWA_SERVER_URL.includes("localhost")) {
        sendWhatsAppNotification(data);
      }

      // Send confirmation email with PDF invoice attachment for Event Registration
      sendRegistrationConfirmationEmail(data, eventRegNo, data.photoUrl);

      return ContentService.createTextOutput(JSON.stringify({
        status: "ok",
        eventRegNo: eventRegNo,
        regNumber: data.regNumber,
        paymentId: data.paymentId,
        amountPaid: data.amountPaid || "511.80"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // Standard Annual Skater Registration
    const year = String(data.year || "2026");
    const targetTabName = "Registrations " + year;
    let sheet = ss.getSheetByName(targetTabName);
    if (!sheet) {
      sheet = ss.insertSheet(targetTabName);
    }

    if (sheet.getLastRow() === 0) {
      sheet.appendRow([
        "Timestamp",
        "RSAM Reg No",
        "Year",
        "Skater Name",
        "Date of Birth",
        "Age",
        "Age Group",
        "School / Club Name",
        "Coach Name",
        "Coach Contact Number",
        "Father Name",
        "Mother Name",
        "Address",
        "Mobile Number",
        "Email",
        "Aadhaar Number",
        "Discipline",
        "Razorpay Payment ID",
        "Payment Status",
        "Amount Paid",
        "Skater Photo URL",
        "Address Proof URL",
        "DOB Proof URL"
      ]);
    }

    let regNumber = data.regNumber;
    if (!regNumber) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const dateKey = `${yy}${mm}${dd}`;
      const rowCount = Math.max(1, sheet.getLastRow());
      const paddedSeq = String(rowCount).padStart(3, '0');
      regNumber = `R${dateKey}${paddedSeq}`;
    }

    function saveFile(fileObj, namePrefix) {
      if (!fileObj || !fileObj.data) return "—";
      return saveFileToDrive(fileObj, namePrefix);
    }

    const photoUrl   = saveFile(data.skaterPhoto, regNumber + "_Photo");
    const aadhaarUrl = saveFile(data.aadhaarProof, regNumber + "_AddressProof");
    const dobUrl     = saveFile(data.dobProof, regNumber + "_DOBProof");

    sheet.appendRow([
      new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      regNumber,
      data.year || "2026",
      data.skaterName,
      data.dob,
      data.age,
      data.ageGroup || "N/A",
      data.schoolClub || "N/A",
      data.coachName || "N/A",
      "'" + (data.coachMobile || "N/A"),
      data.fatherName,
      data.motherName,
      data.address,
      "'" + data.mobile,
      data.email || "N/A",
      "'" + data.aadhaar,
      data.discipline,
      data.paymentId || "pay_verified",
      data.paymentStatus || "SUCCESS",
      "₹" + (data.amountPaid || "10.24"),
      photoUrl,
      aadhaarUrl,
      dobUrl
    ]);

    if (OPENWA_SERVER_URL && !OPENWA_SERVER_URL.includes("localhost")) {
      data.regNumber = regNumber;
      sendWhatsAppNotification(data);
    }

    // Send confirmation email with skater photo attachment
    data.regNumber = regNumber;
    sendRegistrationConfirmationEmail(data, regNumber, photoUrl);

    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      regNumber: regNumber,
      paymentId: data.paymentId || "pay_verified",
      amountPaid: data.amountPaid || "10.24",
      photoUrl: photoUrl,
      aadhaarUrl: aadhaarUrl,
      dobUrl: dobUrl
    })).setMimeType(ContentService.MimeType.JSON);

  } catch(err) {
    Logger.log("Error in doPost: " + err.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function sendRegistrationConfirmationEmail(data, regNumber, photoUrl) {
  if (!data || !data.email || !data.email.includes("@")) return;

  try {
    const skaterName = data.skaterName || "Athlete";
    const discipline = data.discipline || "Roller Skating";
    const ageGroup = data.ageGroup || "N/A";
    const amountPaid = data.amountPaid || "10.24";
    const paymentId = data.paymentId || "Verified";

    const isEvent = (data.type === "event_registration");
    const eventTitle = data.eventName || "4th District Championship 2026";
    const subject = isEvent
      ? `Official RSAM Event Registration Confirmation — ${eventTitle} (${regNumber})`
      : `Official RSAM Athlete Registration Confirmation — ${regNumber}`;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f19; color: #e8e8f0; border: 1px solid #10b981; border-radius: 12px; padding: 24px;">
        <div style="text-align: center; padding-bottom: 16px; border-bottom: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #10b981; margin: 0; font-size: 22px;">Roller Sports Association Moradabad (RSAM)</h2>
          <p style="color: #9ca3af; font-size: 13px; margin-top: 4px;">Recognized by UPRSA & RSFI (IndiaSkate)</p>
        </div>

        <div style="padding: 20px 0;">
          <h3 style="color: #ffffff; margin-top: 0; font-size: 18px;">${isEvent ? 'Event Entry Registration Successful!' : 'Annual Registration Successful!'} 🎉</h3>
          <p style="color: #d1d5db; font-size: 14px; line-height: 1.6;">
            Dear <strong>${skaterName}</strong>,<br/><br/>
            ${isEvent 
              ? `Your registration entry for <strong>${eventTitle}</strong> with <strong>Roller Sports Association Moradabad (RSAM)</strong> has been successfully completed and verified.` 
              : `Your annual athlete membership registration with <strong>Roller Sports Association Moradabad (RSAM)</strong> for <strong>2026</strong> has been successfully completed and verified.`
            }
          </p>

          <div style="background: rgba(245, 158, 11, 0.1); border: 1.5px solid rgba(245, 158, 11, 0.4); border-radius: 10px; padding: 16px; text-align: center; margin: 20px 0;">
            <span style="display: block; font-size: 11px; color: #f59e0b; font-weight: bold; letter-spacing: 1px;">${isEvent ? 'ASSIGNED EVENT REGISTRATION NUMBER' : 'ASSIGNED RSAM REGISTRATION NUMBER'}</span>
            <span style="display: block; font-size: 28px; color: #fbbf24; font-weight: bold; margin-top: 4px;">${regNumber}</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 14px; color: #d1d5db;">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #9ca3af; width: 40%;">Athlete Name:</td><td style="padding: 8px 0; font-weight: bold; color: #fff;">${skaterName}</td></tr>
            ${isEvent ? `<tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #9ca3af;">Event Name:</td><td style="padding: 8px 0; font-weight: bold; color: #f59e0b;">${eventTitle}</td></tr>` : ''}
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #9ca3af;">Discipline:</td><td style="padding: 8px 0; font-weight: bold; color: #fff;">${discipline}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #9ca3af;">Age Group:</td><td style="padding: 8px 0; font-weight: bold; color: #fff;">${ageGroup} (${data.age || 'N/A'} yrs)</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #9ca3af;">School / Club:</td><td style="padding: 8px 0; font-weight: bold; color: #fff;">${data.schoolClub || 'N/A'}</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #9ca3af;">Coach Details:</td><td style="padding: 8px 0; font-weight: bold; color: #fff;">${data.coachName || 'N/A'} (${data.coachMobile || 'N/A'})</td></tr>
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);"><td style="padding: 8px 0; color: #9ca3af;">Payment Reference:</td><td style="padding: 8px 0; color: #34d399; font-weight: bold;">${paymentId} (₹${amountPaid})</td></tr>
          </table>
        </div>

        <div style="padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 12px; color: #9ca3af; text-align: center;">
          <p style="margin: 0;">Roller Sports Association Moradabad · 139 Rana Bhawan, Kanth Road, Moradabad</p>
          <p style="margin-top: 4px;">Attached to this email is your official RSAM Registration Slip &amp; Fee Invoice (PDF) along with your passport photo.</p>
        </div>
      </div>
    `;

    const attachments = [];

    // Generate Official PDF Registration Slip & Fee Invoice Attachment
    try {
      const pdfBlob = createRegistrationPdfInvoice(data, regNumber);
      if (pdfBlob) attachments.push(pdfBlob);
    } catch (pdfErr) {
      Logger.log("PDF invoice creation warning: " + pdfErr.toString());
    }

    // Attach Skater Passport Photo
    if (data.skaterPhoto && data.skaterPhoto.data) {
      try {
        const decoded = Utilities.base64Decode(data.skaterPhoto.data);
        const photoBlob = Utilities.newBlob(decoded, data.skaterPhoto.type || "image/jpeg", `${regNumber}_SkaterPhoto.jpg`);
        attachments.push(photoBlob);
      } catch (pErr) {
        Logger.log("Photo attachment error: " + pErr.toString());
      }
    }

    const emailOptions = {
      to: data.email,
      subject: subject,
      htmlBody: htmlBody
    };
    if (attachments.length > 0) {
      emailOptions.attachments = attachments;
    }

    MailApp.sendEmail(emailOptions);
    Logger.log("Confirmation email with PDF invoice attachment successfully sent to: " + data.email);
  } catch (e) {
    Logger.log("Failed to send confirmation email: " + e.toString());
  }
}

function createRegistrationPdfInvoice(data, regNumber) {
  const skaterName = data.skaterName || "Athlete";
  const discipline = data.discipline || "Roller Skating";
  const ageGroup = data.ageGroup || "N/A";
  const age = data.age || "N/A";
  const amountPaid = data.amountPaid || "10.24";
  const paymentId = data.paymentId || "Verified";
  const dob = data.dob || "N/A";
  const schoolClub = data.schoolClub || "N/A";
  const fatherName = data.fatherName || "N/A";
  const motherName = data.motherName || "N/A";
  const address = data.address || "N/A";
  const mobile = data.mobile || "N/A";
  const email = data.email || "N/A";
  const aadhaar = data.aadhaar ? String(data.aadhaar).replace(/(\d{4})(?=\d)/g, "$1 ") : "N/A";
  const coachName = data.coachName || "N/A";
  const coachMobile = data.coachMobile || "N/A";
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });

  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Helvetica', 'Arial', sans-serif; color: #1f2937; margin: 0; padding: 20px; line-height: 1.4; }
        .invoice-box { border: 2px solid #e01c2e; border-radius: 12px; padding: 24px; max-width: 750px; margin: auto; }
        .header { text-align: center; border-bottom: 2px solid #f3f4f6; padding-bottom: 16px; margin-bottom: 20px; }
        .title { color: #e01c2e; font-size: 22px; font-weight: bold; margin: 0; }
        .subtitle { color: #6b7280; font-size: 12px; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; }
        .badge-box { background: #fffbeeb; border: 1.5px solid #f59e0b; border-radius: 8px; text-align: center; padding: 12px; margin-bottom: 20px; }
        .badge-label { color: #d97706; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; display: block; }
        .badge-num { color: #b45309; font-size: 24px; font-weight: bold; margin-top: 2px; display: block; }
        .section-title { font-size: 13px; font-weight: bold; color: #374151; border-bottom: 1.5px solid #e5e7eb; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        table.details-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        table.details-table td { padding: 6px 8px; font-size: 12px; vertical-align: top; border-bottom: 1px solid #f3f4f6; }
        table.details-table td.lbl { color: #6b7280; font-weight: bold; width: 35%; }
        table.details-table td.val { color: #111827; font-weight: 500; }
        table.invoice-table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 15px; }
        table.invoice-table th { background: #f9fafb; color: #4b5563; font-size: 11px; text-transform: uppercase; padding: 8px; text-align: left; border-bottom: 1.5px solid #e5e7eb; }
        table.invoice-table td { padding: 8px; font-size: 12px; border-bottom: 1px solid #f3f4f6; }
        .total-row td { font-weight: bold; color: #e01c2e; font-size: 14px; border-top: 2px solid #e01c2e; border-bottom: none; }
        .seal-box { margin-top: 25px; text-align: right; font-size: 11px; color: #6b7280; }
        .footer-note { font-size: 10px; color: #9ca3af; text-align: center; margin-top: 25px; border-top: 1px solid #f3f4f6; padding-top: 10px; }
      </style>
    </head>
    <body>
      <div class="invoice-box">
        <div class="header">
          <img src="https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png" style="width: 65px; height: 65px; margin-bottom: 8px;" alt="RSAM Logo"><br/>
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
            <tr class="total-row"><td>Total Amount Paid (Razorpay)</td><td>Status: ${data.paymentStatus || 'SUCCESS'}</td><td style="text-align:right;">₹${amountPaid}</td></tr>
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
    </body>
    </html>
  `;

  try {
    const htmlOutput = HtmlService.createHtmlOutput(pdfHtml);
    const pdfBlob = htmlOutput.getAs('application/pdf');
    pdfBlob.setName(`RSAM_Registration_Invoice_${regNumber}.pdf`);
    return pdfBlob;
  } catch (err) {
    Logger.log("PDF generation error: " + err.toString());
    return null;
  }
}

function sendWhatsAppNotification(payload) {
  try {
    const options = {
      method: "post",
      contentType: "application/json",
      headers: { "x-api-key": API_SECRET_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    UrlFetchApp.fetch(OPENWA_SERVER_URL, options);
  } catch (e) {
    Logger.log("Failed to send webhook: " + e.toString());
  }
}

function saveFileToDrive(fileObj, prefix) {
  try {
    let folder = null;
    if (DRIVE_FOLDER_ID) {
      try {
        folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
      } catch (fErr) {
        Logger.log("Folder lookup by ID failed, falling back to named folder: " + fErr.toString());
      }
    }
    if (!folder) {
      const folders = DriveApp.getFoldersByName("RSAM_Registration_Proofs_2026");
      folder = folders.hasNext() ? folders.next() : DriveApp.createFolder("RSAM_Registration_Proofs_2026");
    }
    const decoded = Utilities.base64Decode(fileObj.data);
    const blob = Utilities.newBlob(decoded, fileObj.type || "application/octet-stream", prefix + "_" + (fileObj.name || "file"));
    const file = folder.createFile(blob);
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sErr) {
      Logger.log("File sharing permission warning: " + sErr.toString());
    }
    return file.getUrl();
  } catch (err) {
    Logger.log("File save error: " + err.toString());
    return "Error saving file: " + err.toString();
  }
}
