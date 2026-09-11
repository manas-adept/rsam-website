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
    const currentYear = "2026";
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
      const regIdx     = findHeaderIndex(["rsam reg", "reg no", "reg. no", "reg number", "registration no"], 1);
      const nameIdx    = findHeaderIndex(["skater name", "name"], 3);
      const dobIdx     = findHeaderIndex(["date of birth", "dob"], 4);
      const ageIdx     = findHeaderIndex(["age"], 5);
      const fatherIdx  = findHeaderIndex(["father"], 6);
      const motherIdx  = findHeaderIndex(["mother"], 7);
      const addressIdx = findHeaderIndex(["address"], 8);
      const mobileIdx  = findHeaderIndex(["mobile", "phone", "contact"], 9);
      const emailIdx   = findHeaderIndex(["email"], 10);
      const aadhaarIdx = findHeaderIndex(["aadhaar", "adhar"], 11);
      const discIdx    = findHeaderIndex(["discipline", "category"], 12);
      const photoIdx   = findHeaderIndex(["photo", "picture", "avatar"], 16);

      return {
        regNumber: String(data[i][regIdx] || regNumber),
        skaterName: String(data[i][nameIdx] || ""),
        dob: String(data[i][dobIdx] || ""),
        age: String(data[i][ageIdx] || ""),
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
      data.fatherName,
      data.motherName,
      data.address,
      "'" + data.mobile,
      data.email || "N/A",
      "'" + data.aadhaar,
      data.discipline,
      data.paymentId || "pay_verified",
      data.paymentStatus || "SUCCESS",
      "₹" + (data.amountPaid || "51.18"),
      photoUrl,
      aadhaarUrl,
      dobUrl
    ]);

    if (OPENWA_SERVER_URL && !OPENWA_SERVER_URL.includes("localhost")) {
      data.regNumber = regNumber;
      sendWhatsAppNotification(data);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "ok",
      regNumber: regNumber,
      paymentId: data.paymentId || "pay_verified",
      amountPaid: data.amountPaid || "51.18",
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
