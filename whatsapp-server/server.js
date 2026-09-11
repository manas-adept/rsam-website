const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const nodemailer = require('nodemailer');
const cloudinary = require('cloudinary').v2;

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const app = express();
const PORT = process.env.PORT || 3001;
const API_SECRET_KEY = process.env.API_SECRET_KEY || 'rsam_whatsapp_secret_key_2026';
const ORG_NAME = process.env.ORGANIZATION_NAME || 'Roller Sports Association Moradabad (RSAM)';
const COUNTER_FILE = path.join(__dirname, 'chest-counter.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let isConnected = false;
let latestQrDataUrl = null;

/**
 * Generate Next Concise RSAM Registration Number (e.g. R260908001 for R26yymmdd + seq)
 */
function getNextRegistrationNumber(year = '2026') {
  let counter = 1;
  const now = new Date();
  const yy = year.length === 4 ? year.slice(2) : String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateKey = `${yy}${mm}${dd}`;

  try {
    if (fs.existsSync(COUNTER_FILE)) {
      const data = JSON.parse(fs.readFileSync(COUNTER_FILE, 'utf8'));
      if (data && data.dateKey === dateKey && data.lastCounter) {
        counter = data.lastCounter + 1;
      }
    }
  } catch (err) {
    console.error('Error reading registration counter file:', err);
  }

  try {
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ dateKey, lastCounter: counter, lastUpdated: now.toISOString() }), 'utf8');
  } catch (err) {
    console.error('Error writing registration counter file:', err);
  }

  const paddedSeq = String(counter).padStart(3, '0');
  return `R${dateKey}${paddedSeq}`;
}

/**
 * Generate PDF Registration Certificate in Memory Buffer
 */
function generateRegistrationPDF(data, regNumber) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Colors
      const primaryColor = '#1e3a8a'; // Deep navy blue
      const accentColor = '#d97706';  // Gold accent
      const textColor = '#1f2937';

      // Outer Border
      doc.rect(20, 20, 555, 802).lineWidth(2).stroke(primaryColor);
      doc.rect(25, 25, 545, 792).lineWidth(1).stroke(accentColor);

      // Header Banner
      doc.rect(26, 26, 543, 85).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(20).font('Helvetica-Bold').text('ROLLER SPORTS ASSOCIATION MORADABAD', 30, 42, { align: 'center' });
      doc.fontSize(12).font('Helvetica').text('Official Athlete Annual Registration Certificate - 2026', 30, 70, { align: 'center' });

      // Registration Number Callout Box
      doc.rect(40, 130, 320, 75).fillAndStroke('#fef3c7', accentColor);
      doc.fillColor('#92400e').fontSize(11).font('Helvetica-Bold').text('RSAM REGISTRATION NUMBER', 50, 142);
      doc.fillColor('#b45309').fontSize(22).font('Helvetica-Bold').text(regNumber, 50, 162);

      // Skater Photo (if uploaded)
      if (data.skaterPhoto && data.skaterPhoto.data) {
        try {
          const imgBuffer = Buffer.from(data.skaterPhoto.data, 'base64');
          doc.image(imgBuffer, 390, 130, { fit: [140, 160], align: 'center', valig: 'center' });
          doc.rect(390, 130, 140, 160).lineWidth(1.5).stroke(primaryColor);
        } catch (imgErr) {
          console.warn('Could not embed skater photo in PDF:', imgErr.message);
          doc.rect(390, 130, 140, 160).stroke(primaryColor);
          doc.fillColor('#666').fontSize(10).text('Photo On File', 420, 200);
        }
      } else {
        doc.rect(390, 130, 140, 160).stroke(primaryColor);
        doc.fillColor('#666').fontSize(10).text('No Photo Uploaded', 415, 200);
      }

      // Details Table Section
      let y = 225;
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text('ATHLETE REGISTRATION DETAILS', 40, y);
      doc.moveTo(40, y + 18).lineTo(360, y + 18).lineWidth(1.5).stroke(accentColor);

      y += 30;
      const details = [
        ['RSAM Reg. No.:', regNumber],
        ['Full Name:', data.skaterName || 'N/A'],
        ['Date of Birth:', `${data.dob || 'N/A'}  (Age: ${data.age || 'N/A'} years)`],
        ['Discipline:', data.discipline || 'N/A'],
        ['Registration Year:', data.year || '2026'],
        ['Razorpay Payment ID:', data.paymentId || 'Verified (₹51.18)'],
        ['Mobile Number:', data.mobile || 'N/A'],
        ['Email:', data.email || 'N/A'],
        ["Father's Name:", data.fatherName || 'N/A'],
        ["Mother's Name:", data.motherName || 'N/A'],
        ['Aadhaar Number:', data.aadhaar ? `XXXX-XXXX-${data.aadhaar.slice(-4)}` : 'N/A'],
        ['Residential Address:', data.address || 'N/A'],
      ];

      doc.fontSize(10);
      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').fillColor(textColor).text(label, 40, y, { width: 140 });
        doc.font('Helvetica').fillColor('#374151').text(value, 180, y, { width: 340 });
        y += 24;
      });

      // Verification Box
      y = Math.max(y + 20, 600);
      doc.rect(40, y, 515, 75).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text('OFFICIAL VERIFICATION NOTICE', 55, y + 12);
      doc.font('Helvetica').fontSize(9).fillColor('#4b5563').text(
        'This certificate confirms annual registration with Roller Sports Association Moradabad. All uploaded documents (Aadhaar & DOB proof) are verified by RSAM officials. Please present this certificate and your assigned RSAM Registration Number during all district and state championships.',
        55,
        y + 30,
        { width: 485 }
      );

      // Signatures
      y += 105;
      doc.font('Helvetica-Bold').fontSize(10).fillColor(primaryColor);
      doc.text('General Secretary', 60, y);
      doc.text('President / RSAM Official', 380, y);
      doc.font('Helvetica').fontSize(8).fillColor('#6b7280');
      doc.text('Roller Sports Association Moradabad', 60, y + 14);
      doc.text('Roller Sports Association Moradabad', 380, y + 14);

      // Footer
      doc.fontSize(8).fillColor('#9ca3af').text(`Generated on ${new Date().toLocaleString('en-IN')} | Document ID: ${regNumber}`, 40, 800, { align: 'center' });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Send Confirmation Email with PDF Attachment via Nodemailer
 */
async function sendRegistrationEmail(data, regNumber, pdfBuffer) {
  if (!data.email) return { skipped: true, reason: 'No email address provided' };

  const smtpHost = process.env.SMTP_HOST || 'smtp.gmail.com';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587');
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpUser || !smtpPass) {
    console.log('[Email] Skipping email sending: SMTP credentials not set in .env');
    return { skipped: true, reason: 'SMTP credentials not configured in .env' };
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass
    }
  });

  const mailOptions = {
    from: `"${ORG_NAME}" <${process.env.EMAIL_FROM || smtpUser}>`,
    to: data.email,
    subject: `🛼 Registration Certificate - Reg No: ${regNumber} (${ORG_NAME})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="background-color: #1e3a8a; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Roller Sports Association Moradabad</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px;">Annual Skater Registration 2026</p>
        </div>
        <div style="padding: 20px; color: #333;">
          <p>Dear <strong>${data.skaterName}</strong>,</p>
          <p>Thank you for registering with <strong>Roller Sports Association Moradabad (RSAM)</strong>!</p>
          
          <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="color: #92400e; font-weight: bold; font-size: 14px;">YOUR ASSIGNED RSAM REGISTRATION NUMBER</span><br/>
            <span style="color: #b45309; font-size: 26px; font-weight: bold;">${regNumber}</span>
          </div>

          <p>Please find your official <strong>Registration Certificate (PDF)</strong> attached to this email. You can present this certificate and registration number at all upcoming trials and championships.</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>RSAM Reg. No.:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${regNumber}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Athlete Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.skaterName}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Discipline:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.discipline}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date of Birth:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.dob} (Age: ${data.age})</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Mobile:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.mobile}</td></tr>
          </table>

          <p style="margin-top: 20px; font-size: 13px; color: #666;">Best regards,<br/><strong>Roller Sports Association Moradabad</strong></p>
        </div>
      </div>
    `,
    attachments: [
      {
        filename: `RSAM_Registration_${regNumber}.pdf`,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ]
  };

  console.log(`[Email] Sending registration email with PDF to ${data.email}...`);
  const info = await transporter.sendMail(mailOptions);
  console.log(`[Email] Sent successfully to ${data.email}! MessageId: ${info.messageId}`);
  return { success: true, messageId: info.messageId };
}

const AUTH_FOLDER = path.join(__dirname, 'baileys_auth_info');
let sock = null;

async function startWhatsAppBot() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: ['RSAM Moradabad', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n==============================================');
        console.log('📱 SCAN THIS WHATSAPP QR CODE IN TERMINAL OR BROWSER:');
        console.log('==============================================');
        qrcodeTerminal.generate(qr, { small: true });

        try {
          latestQrDataUrl = await QRCode.toDataURL(qr);
          console.log('🌐 Web QR Code updated! Visit your bot URL to view & scan.\n');
        } catch (err) {
          console.error('Error generating QR image data URL:', err);
        }
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`⚠️ Connection closed (code: ${statusCode}). Reconnecting: ${shouldReconnect}`);
        isConnected = false;
        latestQrDataUrl = null;
        if (shouldReconnect) {
          setTimeout(startWhatsAppBot, 3000);
        } else {
          console.log('❌ Logged out from WhatsApp. Clear baileys_auth_info folder to scan new QR code.');
        }
      } else if (connection === 'open') {
        isConnected = true;
        latestQrDataUrl = null;
        console.log('\n==============================================');
        console.log('✅ WhatsApp Bot is Ready & Connected via Baileys WebSockets!');
        console.log('==============================================\n');
      }
    });
  } catch (err) {
    console.error('Error starting WhatsApp socket:', err);
    setTimeout(startWhatsAppBot, 5000);
  }
}

function formatWhatsAppJid(phoneStr) {
  let cleaned = String(phoneStr || '').replace(/\D/g, '');
  if (!cleaned) return null;
  
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  
  return `${cleaned}@s.whatsapp.net`;
}

/**
 * Build WhatsApp Message Text
 */
function buildRegistrationMessage(data, regNumber) {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (data.type === 'event_registration') {
    return `🏆 *CHAMPIONSHIP ENTRY CONFIRMATION* 🏆
__________________________________

Dear *${data.skaterName || 'Athlete'}*,

You have successfully registered for the *${data.eventName || '4th District Championship 2026'}* powered by RSAM!

🎽 *RSAM REGISTRATION NUMBER:* *${regNumber}*

📋 *Event Entry Details:*
• *Event:* ${data.eventName || '4th District Championship 2026'}
• *RSAM Reg. No.:* ${regNumber}
• *Athlete Name:* ${data.skaterName}
• *Discipline:* ${data.discipline || 'N/A'}
• *Razorpay Payment ID:* ${data.paymentId || 'Verified'}
• *Amount Paid:* ₹${data.amountPaid || '511.80'}
• *Date of Birth:* ${data.dob} (Age: ${data.age || 'N/A'})
• *Mobile Number:* ${data.mobile}
• *Submission Date:* ${dateStr}

${data.email ? '📧 Confirmation receipt sent to ' + data.email : ''}

✅ Please bring your RSAM Registration Number & identity proof to the venue.

Best regards,
*${ORG_NAME}* 🛼🏆`;
  }

  return `🎉 *REGISTRATION CONFIRMATION* 🎉
__________________________________

Dear *${data.skaterName || 'Athlete'}*,

Thank you for registering with *${ORG_NAME}*! Your registration details have been received successfully.

🎽 *YOUR RSAM REGISTRATION NUMBER:* *${regNumber}*
(Please preserve this Registration Number for all upcoming trials & championships)

📋 *Registration Details:*
• *RSAM Reg. No.:* ${regNumber}
• *Registration Year:* ${data.year || '2026'}
• *Athlete Name:* ${data.skaterName}
• *Date of Birth:* ${data.dob} (Age: ${data.age || 'N/A'})
• *Discipline:* ${data.discipline || 'N/A'}
• *Razorpay Payment ID:* ${data.paymentId || 'Verified'}
• *Amount Paid:* ₹${data.amountPaid || '51.18'}
• *Mobile Number:* ${data.mobile}
• *Father's Name:* ${data.fatherName || 'N/A'}
• *Mother's Name:* ${data.motherName || 'N/A'}
• *Address:* ${data.address || 'N/A'}
• *Submitted Date:* ${dateStr}

${data.email ? '📧 *PDF Certificate:* Your PDF Registration Certificate with your passport photo has been sent to ' + data.email : ''}

✅ Your submitted documents & passport photo are under verification by RSAM admins.

If you have any questions or corrections, please reply directly to this message or contact our officials.

Best regards,
*${ORG_NAME}* 🛼🏆`;
}

function authorizeRequest(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey || apiKey !== API_SECRET_KEY) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid API Secret Key' });
  }
  next();
}

app.get(['/', '/qr'], (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RSAM WhatsApp Bot - Connected</title>
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #e8f5e9; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 450px; }
            h1 { color: #2e7d32; margin-top: 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>✅ WhatsApp Connected!</h1>
            <p style="font-size: 16px; color: #333;">Your RSAM WhatsApp Bot is logged in and actively monitoring for website registrations.</p>
          </div>
        </body>
      </html>
    `);
  }

  if (!latestQrDataUrl) {
    return res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>RSAM WhatsApp QR Code</title>
          <meta http-equiv="refresh" content="3">
          <style>
            body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #f0f2f5; margin: 0; }
            .card { background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 450px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>⏳ Generating QR Code...</h2>
            <p>Please wait a few seconds for the QR code to be generated.</p>
          </div>
        </body>
      </html>
    `);
  }

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Scan RSAM WhatsApp QR Code</title>
        <meta http-equiv="refresh" content="15">
        <style>
          body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; background: #f0f2f5; margin: 0; }
          .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); text-align: center; max-width: 420px; }
          img { width: 280px; height: 280px; margin: 20px 0; border: 3px solid #25D366; border-radius: 12px; padding: 8px; background: white; }
          h2 { color: #075e54; margin-top: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h2>🛼 Link RSAM WhatsApp Bot</h2>
          <p>Open <b>WhatsApp</b> on your phone ➔ Tap <b>Menu / Settings</b> ➔ <b>Linked Devices</b> ➔ <b>Link a Device</b> and scan the QR code below:</p>
          <img src="${latestQrDataUrl}" alt="WhatsApp QR Code" />
          <p style="color: #666; font-size: 13px;">This page auto-refreshes every 15 seconds.</p>
        </div>
      </body>
    </html>
  `);
});

/**
 * Endpoint: POST /send-registration
 * Generates RSAM Registration Number, sends WhatsApp notification, generates PDF, & emails PDF certificate
 */
app.post('/send-registration', authorizeRequest, async (req, res) => {
  try {
    if (!isConnected) {
      console.warn('[WhatsApp] Bot is not connected yet. Proceeding with PDF generation & email delivery...');
    }

    const payload = req.body;
    if (!payload || !payload.skaterName || !payload.mobile) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: skaterName and mobile are required.'
      });
    }

    // 1. Assign RSAM Registration Number
    const regNumber = payload.regNumber || getNextRegistrationNumber(payload.year || '2026');
    console.log(`[RegistrationNumber] Assigned ${regNumber} to ${payload.skaterName}`);

    // 2. Format WhatsApp recipient JID
    const jid = formatWhatsAppJid(payload.mobile);
    if (!jid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mobile number format.'
      });
    }

    // 3. Send WhatsApp Notification
    let msgId = 'pending';
    try {
      if (sock && isConnected) {
        const messageText = buildRegistrationMessage(payload, regNumber);
        console.log(`[WhatsApp] Sending notification to ${jid} for ${payload.skaterName} (${regNumber})...`);
        const sendResult = await sock.sendMessage(jid, { text: messageText });
        msgId = sendResult?.key?.id || 'sent';
        console.log(`[WhatsApp] Successfully sent message to ${payload.skaterName}! Message ID: ${msgId}`);
      } else {
        console.warn(`[WhatsApp] Bot is not connected yet. Skipping live WhatsApp message.`);
      }
    } catch (waErr) {
      console.warn(`[WhatsApp] Could not send WhatsApp message to ${payload.skaterName} (${jid}):`, waErr.message);
    }

    // 4. Generate Registration Certificate PDF
    let emailResult = { skipped: true, reason: 'No email provided' };
    try {
      const pdfBuffer = await generateRegistrationPDF(payload, regNumber);

      // Save PDF copy locally for admin records
      const pdfDir = path.join(__dirname, 'certificates_2026');
      if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
      const pdfPath = path.join(pdfDir, `${regNumber}_${payload.skaterName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
      fs.writeFileSync(pdfPath, pdfBuffer);
      console.log(`[PDF] Certificate saved locally at ${pdfPath}`);

      // 5. Send Email with PDF Attachment (if email provided)
      if (payload.email) {
        emailResult = await sendRegistrationEmail(payload, regNumber, pdfBuffer);
      }
    } catch (pdfErr) {
      console.error('[PDF/Email] Error generating/sending PDF certificate:', pdfErr);
    }

    return res.json({
      success: true,
      regNumber,
      messageId: msgId,
      emailResult
    });
  } catch (err) {
    console.error('[Send Registration Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * RSAM Skater Reg Number Lookup API Endpoint
 */
app.get('/api/lookup-skater', async (req, res) => {
  const action = req.query.action || 'lookup';
  const queryParam = req.query.query || req.query.regNumber || '';
  const cleanQuery = String(queryParam).trim().toUpperCase();

  if (!cleanQuery) {
    return res.json({ status: 'not_found', message: 'Please enter a valid RSAM Registration Number or mobile number.' });
  }

  const sheetUrl = process.env.GOOGLE_SHEET_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";

  try {
    const targetUrl = `${sheetUrl}?action=${encodeURIComponent(action)}&query=${encodeURIComponent(cleanQuery)}&regNumber=${encodeURIComponent(cleanQuery)}`;
    const fetchRes = await fetch(targetUrl, { redirect: 'follow' });
    const text = await fetchRes.text();
    try {
      const data = JSON.parse(text);
      if (data && data.status) {
        return res.json(data);
      }
    } catch (jsonErr) {
      console.warn('[Proxy Lookup] Apps Script returned HTML/Redirect page');
    }
  } catch (e) {
    console.warn('[Proxy Lookup] Apps Script fetch error:', e.message);
  }

  return res.json({
    status: 'not_found',
    message: `RSAM Registration record '${cleanQuery}' was not found.`
  });
});

/**
 * Dynamic Cloudinary Gallery Endpoint
 * Queries Cloudinary Admin API live for all resources inside a subfolder
 */
app.get('/api/cloudinary-gallery', async (req, res) => {
  try {
    const subfolder = req.query.subfolder || 'rsam_website/gallery';
    let allResources = [];
    let nextCursor = null;

    do {
      const options = {
        type: 'upload',
        prefix: subfolder,
        max_results: 500
      };
      if (nextCursor) options.next_cursor = nextCursor;

      const result = await cloudinary.api.resources(options);
      if (result.resources && result.resources.length > 0) {
        allResources = allResources.concat(result.resources);
      }
      nextCursor = result.next_cursor;
    } while (nextCursor);

    const photos = allResources.map(r => {
      const fileName = r.public_id.split('/').pop();
      return {
        src: r.secure_url,
        publicId: r.public_id,
        caption: `Action Photo (${fileName})`,
        uploadedAt: r.created_at || new Date().toISOString(),
        width: r.width,
        height: r.height
      };
    });

    return res.json({
      success: true,
      subfolder,
      count: photos.length,
      photos
    });
  } catch (err) {
    console.error('[Cloudinary Gallery API Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Direct Cloudinary Image Upload Endpoint
 * Accepts base64 image data and uploads directly to Cloudinary target folder (default: rsam_website/events)
 */
app.post('/api/upload-cloudinary', async (req, res) => {
  try {
    const { image, folder, fileName } = req.body;
    if (!image) {
      return res.status(400).json({ success: false, error: 'Missing required image base64 data.' });
    }

    const targetFolder = folder || 'rsam_website/events';
    const uploadOptions = {
      folder: targetFolder,
      resource_type: 'auto'
    };
    if (fileName) {
      uploadOptions.public_id = fileName.replace(/[^a-zA-Z0-9_.-]/g, '_');
    }

    const result = await cloudinary.uploader.upload(image, uploadOptions);
    console.log(`[Cloudinary Upload] Successfully uploaded to ${result.secure_url}`);

    return res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height
    });
  } catch (err) {
    console.error('[Cloudinary Upload Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Dynamic Subfolder Discovery Endpoint
 * Discovers ALL subfolders under rsam_website/gallery directly from Cloudinary live!
 * Reads titles/metadata from gallery-config.json if available, or formats folder name dynamically.
 */
app.get('/api/cloudinary-gallery-folders', async (req, res) => {
  try {
    const baseFolder = req.query.baseFolder || 'rsam_website/gallery';
    const sub = await cloudinary.api.sub_folders(baseFolder);
    
    // Read local gallery-config for rich metadata (title, date, location, description) if matched
    const configPath = fs.existsSync(path.join(__dirname, 'data/gallery-config.json'))
      ? path.join(__dirname, 'data/gallery-config.json')
      : path.join(__dirname, '../data/gallery-config.json');
    let configFolders = [];
    if (fs.existsSync(configPath)) {
      try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        configFolders = configData.folders || [];
      } catch (e) {}
    }

    const folderList = [];

    for (const folder of sub.folders) {
      // Fetch live resources for this subfolder
      let allResources = [];
      let nextCursor = null;

      do {
        const opts = { type: 'upload', prefix: folder.path, max_results: 500 };
        if (nextCursor) opts.next_cursor = nextCursor;
        const result = await cloudinary.api.resources(opts);
        if (result.resources) allResources = allResources.concat(result.resources);
        nextCursor = result.next_cursor;
      } while (nextCursor);

      const photos = allResources.map(r => {
        const fileName = r.public_id.split('/').pop();
        return {
          src: r.secure_url,
          publicId: r.public_id,
          caption: `Action Photo (${fileName})`,
          uploadedAt: r.created_at || new Date().toISOString(),
          width: r.width,
          height: r.height
        };
      });

      const matchedConfig = configFolders.find(c => c.cloudinarySubfolder === folder.path || c.folderId === folder.name) || {};

      folderList.push({
        folderId: matchedConfig.folderId || folder.name,
        cloudinarySubfolder: folder.path,
        title: matchedConfig.title || folder.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        date: matchedConfig.date || 'Event Gallery',
        location: matchedConfig.location || 'Moradabad / UP',
        category: matchedConfig.category || 'Championship',
        description: matchedConfig.description || `Event photo archive for ${folder.name}`,
        displayOrder: matchedConfig.displayOrder || 99,
        count: photos.length,
        photos
      });
    }

    folderList.sort((a, b) => a.displayOrder - b.displayOrder);

    return res.json({
      success: true,
      baseFolder,
      count: folderList.length,
      folders: folderList
    });
  } catch (err) {
    console.error('[Cloudinary Subfolder Discovery API Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    whatsappConnected: isConnected,
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('----------------------------------------------------');
  console.log(`🌐 OpenWA Server running on http://localhost:${PORT}`);
  console.log(`📱 QR Code Webpage: http://localhost:${PORT}`);
  console.log(`🔑 Secret API Key: ${API_SECRET_KEY}`);
  console.log(`📡 Registration Endpoint: POST http://localhost:${PORT}/send-registration`);
  console.log('----------------------------------------------------');
  
  console.log('🚀 Initializing WhatsApp Web Client (Baileys WebSockets)...');
  startWhatsAppBot();
});
