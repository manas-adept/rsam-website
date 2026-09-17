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
      const isEvent = data.type === 'event_registration';
      const isRenewal = data.isRenewal || data.type === 'renewal';
      const primaryColor = isEvent ? '#b91c1c' : (isRenewal ? '#047857' : '#1e3a8a');
      const accentColor = isEvent ? '#f59e0b' : '#d97706';
      const textColor = '#1f2937';

      const certTitle = isEvent
        ? `Official Event Entry Pass — ${data.eventName || 'District Championship 2026'}`
        : (isRenewal ? 'Official Athlete Annual Registration Certificate (Renewal) - 2026' : 'Official Athlete Annual Registration Certificate - 2026');

      // Outer Border
      doc.rect(20, 20, 555, 802).lineWidth(2).stroke(primaryColor);
      doc.rect(25, 25, 545, 792).lineWidth(1).stroke(accentColor);

      // Header Banner
      doc.rect(26, 26, 543, 85).fill(primaryColor);
      doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold').text('ROLLER SPORTS ASSOCIATION MORADABAD', 30, 42, { align: 'center' });
      doc.fontSize(11).font('Helvetica').text(certTitle, 30, 68, { align: 'center' });

      // Registration Number Callout Box
      doc.rect(40, 130, 320, 75).fillAndStroke('#fef3c7', accentColor);
      doc.fillColor('#92400e').fontSize(11).font('Helvetica-Bold').text(isEvent ? 'RSAM REGISTRATION / ENTRY NO' : 'RSAM REGISTRATION NUMBER', 50, 142);
      doc.fillColor('#b45309').fontSize(22).font('Helvetica-Bold').text(regNumber, 50, 162);

      // Skater Photo (if uploaded)
      if (data.skaterPhoto && data.skaterPhoto.data) {
        try {
          const imgBuffer = Buffer.from(data.skaterPhoto.data, 'base64');
          doc.image(imgBuffer, 390, 130, { fit: [140, 160], align: 'center', valign: 'center' });
          doc.rect(390, 130, 140, 160).lineWidth(1.5).stroke(primaryColor);
        } catch (imgErr) {
          console.warn('Could not embed skater photo in PDF:', imgErr.message);
          doc.rect(390, 130, 140, 160).stroke(primaryColor);
          doc.fillColor('#666').fontSize(10).text('Photo On File', 420, 200);
        }
      } else {
        doc.rect(390, 130, 140, 160).stroke(primaryColor);
        doc.fillColor('#666').fontSize(10).text('Photo On File', 420, 200);
      }

      // Details Table Section
      let y = 225;
      const sectionTitle = isEvent ? 'CHAMPIONSHIP ENTRY DETAILS' : (isRenewal ? 'ATHLETE RENEWAL DETAILS' : 'ATHLETE REGISTRATION DETAILS');
      doc.fillColor(primaryColor).fontSize(14).font('Helvetica-Bold').text(sectionTitle, 40, y);
      doc.moveTo(40, y + 18).lineTo(360, y + 18).lineWidth(1.5).stroke(accentColor);

      y += 30;
      const details = [
        ['RSAM Reg. No.:', regNumber],
        ['Full Name:', data.skaterName || 'N/A'],
      ];

      if (isEvent) {
        details.push(['Event Name:', data.eventName || '4th District Championship 2026']);
      }

      details.push(
        ['Date of Birth:', `${data.dob || 'N/A'}  (Age: ${data.age || 'N/A'} yrs · ${data.ageGroup || 'N/A'})`],
        ['Age Group:', data.ageGroup || 'N/A'],
        ['School / Club Name:', data.schoolClub || 'N/A'],
        ['Coach Name:', data.coachName ? `${data.coachName} (${data.coachMobile || 'N/A'})` : 'N/A'],
        ['Discipline:', data.discipline || 'N/A'],
        ['Year / Season:', data.year || '2026'],
        ['Payment ID:', data.paymentId || 'Verified'],
        ['Amount Paid:', `₹${data.amountPaid || (isEvent ? '511.80' : '10.24')}`],
        ['Mobile Number:', data.mobile || 'N/A'],
        ['Email Address:', data.email || 'N/A'],
        ["Father's Name:", data.fatherName || 'N/A'],
        ["Mother's Name:", data.motherName || 'N/A'],
        ['Aadhaar Number:', data.aadhaar ? (data.aadhaar.length >= 4 ? `XXXX-XXXX-${data.aadhaar.slice(-4)}` : data.aadhaar) : 'N/A'],
        ['Residential Address:', data.address || 'N/A']
      );

      doc.fontSize(10);
      details.forEach(([label, value]) => {
        doc.font('Helvetica-Bold').fillColor(textColor).text(label, 40, y, { width: 140 });
        doc.font('Helvetica').fillColor('#374151').text(value, 180, y, { width: 340 });
        y += 22;
      });

      // Verification Box
      y = Math.max(y + 15, 605);
      doc.rect(40, y, 515, 70).fillAndStroke('#f3f4f6', '#d1d5db');
      doc.fillColor('#1f2937').fontSize(10).font('Helvetica-Bold').text('OFFICIAL VERIFICATION NOTICE', 55, y + 10);
      doc.font('Helvetica').fontSize(8.5).fillColor('#4b5563').text(
        isEvent
          ? 'This entry pass confirms championship event registration with Roller Sports Association Moradabad. Please present this document and your assigned RSAM Registration Number at the venue entry.'
          : 'This certificate confirms annual registration with Roller Sports Association Moradabad. All uploaded documents are verified by RSAM officials. Please present this certificate during all district and state championships.',
        55,
        y + 26,
        { width: 485 }
      );

      // Signatures
      y += 95;
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
    console.log('[Email] Skipping email sending: SMTP credentials (SMTP_USER & SMTP_PASS) not set in .env');
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

  const isEvent = data.type === 'event_registration';
  const isRenewal = data.isRenewal || data.type === 'renewal';

  const subjectText = isEvent
    ? `🏆 Event Entry Pass - ${data.eventName || 'District Championship'} (Reg No: ${regNumber})`
    : (isRenewal
      ? `🔄 Registration Renewal Confirmation - Reg No: ${regNumber} (${ORG_NAME})`
      : `🛼 Registration Certificate - Reg No: ${regNumber} (${ORG_NAME})`);

  const headerTitle = isEvent
    ? (data.eventName || 'District Championship 2026 Entry')
    : (isRenewal ? 'Annual Skater Renewal 2026' : 'Annual Skater Registration 2026');

  const pdfFileName = isEvent
    ? `RSAM_Event_Pass_${regNumber}.pdf`
    : `RSAM_Registration_${regNumber}.pdf`;

  const mailOptions = {
    from: `"${ORG_NAME}" <${process.env.EMAIL_FROM || smtpUser}>`,
    to: data.email,
    subject: subjectText,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <div style="background-color: ${isEvent ? '#b91c1c' : (isRenewal ? '#047857' : '#1e3a8a')}; color: white; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">Roller Sports Association Moradabad</h2>
          <p style="margin: 5px 0 0 0; font-size: 14px;">${headerTitle}</p>
        </div>
        <div style="padding: 20px; color: #333;">
          <p>Dear <strong>${data.skaterName}</strong>,</p>
          <p>${isEvent
            ? `Your registration for <strong>${data.eventName || '4th District Championship 2026'}</strong> is confirmed!`
            : (isRenewal
              ? `Your annual registration with <strong>Roller Sports Association Moradabad (RSAM)</strong> has been successfully renewed for 2026!`
              : `Thank you for registering with <strong>Roller Sports Association Moradabad (RSAM)</strong>!`)}</p>
          
          <div style="background-color: #fef3c7; border: 2px solid #f59e0b; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="color: #92400e; font-weight: bold; font-size: 14px;">${isEvent ? 'RSAM ENTRY REGISTRATION NUMBER' : 'YOUR ASSIGNED RSAM REGISTRATION NUMBER'}</span><br/>
            <span style="color: #b45309; font-size: 26px; font-weight: bold;">${regNumber}</span>
          </div>

          <p>Please find your official <strong>${isEvent ? 'Event Entry Pass & Receipt' : 'Registration Certificate'} (PDF)</strong> attached to this email. Present this document during trials and championship entry.</p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>RSAM Reg. No.:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${regNumber}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Athlete Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.skaterName}</td></tr>
            ${isEvent ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Event Name:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.eventName || 'District Championship'}</td></tr>` : ''}
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Discipline:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.discipline || 'N/A'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Date of Birth:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.dob || 'N/A'} (Age: ${data.age || 'N/A'})</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Payment ID:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.paymentId || 'Verified'}</td></tr>
            <tr><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Mobile:</strong></td><td style="padding: 8px; border-bottom: 1px solid #eee;">${data.mobile}</td></tr>
          </table>

          <p style="margin-top: 20px; font-size: 13px; color: #666;">Best regards,<br/><strong>Roller Sports Association Moradabad</strong></p>
        </div>
      </div>
    `,
    attachments: pdfBuffer ? [
      {
        filename: pdfFileName,
        content: pdfBuffer,
        contentType: 'application/pdf'
      }
    ] : []
  };

  console.log(`[Email] Sending ${isEvent ? 'event entry' : 'registration'} email to ${data.email}...`);
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

  if (cleaned.length > 10 && cleaned.startsWith('91')) {
    cleaned = cleaned.slice(-12);
  } else if (cleaned.length >= 10) {
    cleaned = '91' + cleaned.slice(-10);
  } else {
    return null;
  }

  return `${cleaned}@s.whatsapp.net`;
}

/**
 * WhatsApp Bot Connection Status API
 */
app.get('/api/bot-status', (req, res) => {
  res.json({
    success: true,
    isConnected,
    qrDataUrl: latestQrDataUrl
  });
});

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
• *Age Group:* ${data.ageGroup || 'N/A'}
• *School / Club:* ${data.schoolClub || 'N/A'}
• *Coach Name:* ${data.coachName || 'N/A'} (${data.coachMobile || 'N/A'})
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
• *Age Group:* ${data.ageGroup || 'N/A'}
• *School / Club:* ${data.schoolClub || 'N/A'}
• *Discipline:* ${data.discipline || 'N/A'}
• *Coach Name:* ${data.coachName || 'N/A'} (${data.coachMobile || 'N/A'})
• *Razorpay Payment ID:* ${data.paymentId || 'Verified'}
• *Amount Paid:* ₹${data.amountPaid || '10.24'}
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

/**
 * Build Coach WhatsApp Message Text
 */
function buildCoachRegistrationMessage(data, regNumber) {
  const dateStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  if (data.type === 'event_registration') {
    return `🏆 *CHAMPIONSHIP ATHLETE ENTRY NOTICE* 🏆
__________________________________

Dear Coach *${data.coachName || 'Coach'}*,

Your athlete *${data.skaterName}* has successfully registered for the *${data.eventName || '4th District Championship 2026'}*!

🎽 *ATHLETE RSAM REGISTRATION NUMBER:* *${regNumber}*

📋 *Athlete Championship Summary:*
• *Event:* ${data.eventName || '4th District Championship 2026'}
• *Athlete Name:* ${data.skaterName}
• *RSAM Reg. No.:* ${regNumber}
• *Discipline:* ${data.discipline || 'N/A'}
• *Age Group:* ${data.ageGroup || 'N/A'}
• *School / Club:* ${data.schoolClub || 'N/A'}
• *Father's Name:* ${data.fatherName || 'N/A'}
• *Athlete Mobile:* ${data.mobile}
• *Submission Date:* ${dateStr}

Thank you for guiding and mentoring athletes under *${ORG_NAME}*!

Best regards,
*${ORG_NAME}* 🛼🏆`;
  }

  return `🎉 *ATHLETE ANNUAL REGISTRATION NOTICE* 🎉
__________________________________

Dear Coach *${data.coachName || 'Coach'}*,

Your athlete *${data.skaterName}* has completed annual registration with *${ORG_NAME}* for ${data.year || '2026'}.

🎽 *ATHLETE RSAM REGISTRATION NUMBER:* *${regNumber}*

📋 *Athlete Summary:*
• *Athlete Name:* ${data.skaterName}
• *RSAM Reg. No.:* ${regNumber}
• *Date of Birth:* ${data.dob} (Age: ${data.age || 'N/A'})
• *Age Group:* ${data.ageGroup || 'N/A'}
• *School / Club:* ${data.schoolClub || 'N/A'}
• *Discipline:* ${data.discipline || 'N/A'}
• *Father's Name:* ${data.fatherName || 'N/A'}
• *Mother's Name:* ${data.motherName || 'N/A'}
• *Athlete Mobile:* ${data.mobile}
• *Submitted Date:* ${dateStr}

Thank you for your continuous mentorship and support for RSAM athletes.

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

    // Respond immediately to browser for instant UI feedback
    res.json({
      success: true,
      regNumber,
      message: 'Registration accepted. Dispatched WhatsApp and email notifications in background.'
    });

    // Process notification channels asynchronously in background
    setImmediate(async () => {
      // 2. ISOLATED CHANNEL 1: WhatsApp Notifications (Skater + Coach)
      try {
        if (!sock || !isConnected) {
          console.warn(`[WhatsApp] Skipping: Bot not connected yet on server.`);
        } else {
          // A. Send Skater Notification
          const skaterJid = formatWhatsAppJid(payload.mobile);
          if (skaterJid) {
            const skaterMsg = buildRegistrationMessage(payload, regNumber);
            console.log(`[WhatsApp] Sending athlete notification to ${skaterJid} for ${payload.skaterName}...`);
            await sock.sendMessage(skaterJid, { text: skaterMsg });
            console.log(`[WhatsApp] Sent athlete notification to ${payload.skaterName}!`);
          } else {
            console.warn(`[WhatsApp] Skipping skater message: Invalid mobile ${payload.mobile}`);
          }

          // B. Send Coach Notification (if coachMobile provided)
          if (payload.coachMobile && String(payload.coachMobile).replace(/\D/g, "").length === 10) {
            const coachJid = formatWhatsAppJid(payload.coachMobile);
            if (coachJid && coachJid !== skaterJid) {
              const coachMsg = buildCoachRegistrationMessage(payload, regNumber);
              console.log(`[WhatsApp] Sending coach notification to ${coachJid} for Coach ${payload.coachName || 'Coach'}...`);
              await sock.sendMessage(coachJid, { text: coachMsg });
              console.log(`[WhatsApp] Sent coach notification for athlete ${payload.skaterName}!`);
            }
          }
        }
      } catch (waErr) {
        console.error(`[WhatsApp Error] Could not send message to ${payload.skaterName}:`, waErr.message);
      }

      // 3. ISOLATED CHANNEL 2: PDF Generation & Email Delivery
      if (payload.email) {
        let pdfBuffer = null;
        try {
          pdfBuffer = await generateRegistrationPDF(payload, regNumber);
          const pdfDir = path.join(__dirname, 'certificates_2026');
          if (!fs.existsSync(pdfDir)) fs.mkdirSync(pdfDir, { recursive: true });
          const pdfPath = path.join(pdfDir, `${regNumber}_${payload.skaterName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
          fs.writeFileSync(pdfPath, pdfBuffer);
          console.log(`[PDF] Certificate saved locally at ${pdfPath}`);
        } catch (pdfErr) {
          console.error('[PDF Error] Could not generate PDF certificate:', pdfErr.message);
        }

        try {
          console.log(`[Email] Attempting email delivery to ${payload.email}...`);
          await sendRegistrationEmail(payload, regNumber, pdfBuffer);
        } catch (emailErr) {
          console.error(`[Email Error] Could not send email to ${payload.email}:`, emailErr.message);
        }
      }
    });
  } catch (err) {
    console.error('[Send Registration Error]:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Endpoint: POST /api/send-custom-whatsapp
 * Dispatches a custom WhatsApp message & optional media image attachment to any mobile number
 */
app.post('/api/send-custom-whatsapp', authorizeRequest, async (req, res) => {
  try {
    const { mobile, message, imageUrl } = req.body;
    if (!mobile || !message) {
      return res.status(400).json({ success: false, error: 'Mobile number and message text are required.' });
    }

    const jid = formatWhatsAppJid(mobile);
    if (!jid) {
      return res.status(400).json({ success: false, error: `Invalid mobile number: ${mobile}` });
    }

    if (!sock || !isConnected) {
      return res.status(503).json({ success: false, error: 'WhatsApp bot is not connected. Please scan QR code in admin.' });
    }

    console.log(`[WhatsApp Broadcast] Dispatched custom message to ${jid}...`);

    let msgPayload = { text: message };
    if (imageUrl && imageUrl.startsWith('http')) {
      msgPayload = {
        image: { url: imageUrl },
        caption: message
      };
    }

    const result = await sock.sendMessage(jid, msgPayload);
    return res.json({
      success: true,
      mobile,
      jid,
      messageId: result?.key?.id || 'sent'
    });
  } catch (err) {
    console.error('[WhatsApp Custom Send Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Endpoint: GET /api/fetch-contacts
 * Proxy endpoint to fetch all registration contacts from Google Sheet
 */
app.get('/api/fetch-contacts', async (req, res) => {
  const sheetUrl = process.env.GOOGLE_SHEET_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec";
  try {
    const fetchRes = await fetch(`${sheetUrl}?action=fetch_all_contacts`, { redirect: 'follow' });
    const text = await fetchRes.text();
    try {
      const data = JSON.parse(text);
      if (data && data.status === 'ok') {
        return res.json(data);
      }
    } catch (parseErr) {}
  } catch (err) {
    console.warn('[Proxy Fetch Contacts Error]:', err.message);
  }
  return res.json({ status: 'error', message: 'Could not fetch contact records from Google Sheet.' });
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

function matchFolderAlias(str1, str2) {
  if (!str1 || !str2) return false;
  const s1 = String(str1).toLowerCase().trim();
  const s2 = String(str2).toLowerCase().trim();
  if (s1 === s2) return true;

  const clean1 = s1.replace(/[^a-z0-9]/g, '');
  const clean2 = s2.replace(/[^a-z0-9]/g, '');
  if (clean1 && clean2 && (clean1 === clean2 || clean2.includes(clean1) || clean1.includes(clean2))) return true;

  const ignore = new Set(['rsam', 'website', 'gallery', 'events', 'folder', 'https', 'http', 'res', 'cloudinary', 'com', 'image', 'upload', '7th', '4th', '1st', 'championship', 'open']);
  const tokens1 = s1.split(/[^a-z0-9]+/).filter(t => t.length > 0 && !ignore.has(t));
  const tokens2 = s2.split(/[^a-z0-9]+/).filter(t => t.length > 0 && !ignore.has(t));

  if (!tokens1.length || !tokens2.length) return false;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  if ((set1.has('hospital') && !set2.has('hospital')) || (set2.has('hospital') && !set1.has('hospital'))) {
    if (set1.has('felicitaion') || set1.has('felicitation') || set2.has('felicitaion') || set2.has('felicitation')) {
      return false;
    }
  }

  const common = tokens1.filter(t => set2.has(t));

  if (common.length >= 2) return true;
  if (common.length === 1 && (common[0] === 'lko' || common[0] === 'uprsa')) return true;

  return false;
}

/**
 * Helper: Dual-strategy Cloudinary photo fetcher
 * Strategy 1: Search API by asset folder expression (catches photos assigned to asset folders without path prefix in public_id)
 * Strategy 2: Admin API prefix matching (catches photos with path-prefixed public_ids)
 */
async function getCloudinarySubfolderPhotos(subfolder) {
  const photoMap = new Map();

  try {
    const searchRes = await cloudinary.search.expression(`folder:"${subfolder}"`).max_results(500).execute();
    if (searchRes && searchRes.resources && searchRes.resources.length > 0) {
      for (const r of searchRes.resources) {
        const fileName = r.public_id.split('/').pop();
        photoMap.set(r.secure_url, {
          src: r.secure_url,
          publicId: r.public_id,
          caption: `Action Photo (${fileName})`,
          uploadedAt: r.created_at || new Date().toISOString(),
          width: r.width,
          height: r.height
        });
      }
    }
  } catch (eSearch) {
    console.warn('[Cloudinary Search API Notice]:', eSearch.message);
  }

  try {
    let nextCursor = null;
    do {
      const options = { type: 'upload', prefix: subfolder, max_results: 500 };
      if (nextCursor) options.next_cursor = nextCursor;
      const result = await cloudinary.api.resources(options);
      if (result.resources && result.resources.length > 0) {
        for (const r of result.resources) {
          if (!photoMap.has(r.secure_url)) {
            const fileName = r.public_id.split('/').pop();
            photoMap.set(r.secure_url, {
              src: r.secure_url,
              publicId: r.public_id,
              caption: `Action Photo (${fileName})`,
              uploadedAt: r.created_at || new Date().toISOString(),
              width: r.width,
              height: r.height
            });
          }
        }
      }
      nextCursor = result.next_cursor;
    } while (nextCursor);
  } catch (eRes) {
    console.warn('[Cloudinary Resources API Notice]:', eRes.message);
  }

  return Array.from(photoMap.values());
}

/**
 * Dynamic Cloudinary Gallery Endpoint
 * Queries Cloudinary live for all resources inside a subfolder using dual-strategy fetcher
 */
app.get('/api/cloudinary-gallery', async (req, res) => {
  try {
    const rawFolderId = req.query.subfolder || 'rsam_website/gallery';
    let subfolder = rawFolderId;
    if (!subfolder.includes('/') && subfolder !== 'rsam_website/gallery') {
      subfolder = `rsam_website/gallery/${subfolder}`;
    }

    const photos = await getCloudinarySubfolderPhotos(subfolder);

    if (photos.length === 0) {
      return res.json({
        success: false,
        notFound: true,
        folderId: rawFolderId,
        subfolder,
        error: `folderID '${rawFolderId}' not found in gallery`,
        count: 0,
        photos: []
      });
    }

    return res.json({
      success: true,
      subfolder,
      count: photos.length,
      photos
    });
  } catch (err) {
    console.error('[Cloudinary Gallery API Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message, photos: [] });
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
 * Discovers subfolders under rsam_website/gallery directly from Cloudinary live!
 * Uses dual-strategy photo fetcher for 100% reliable asset retrieval across all folder types.
 */
app.get('/api/cloudinary-gallery-folders', async (req, res) => {
  try {
    const baseFolder = req.query.baseFolder || 'rsam_website/gallery';
    const sub = await cloudinary.api.sub_folders(baseFolder);
    
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
    const matchedConfigSet = new Set();

    for (const folder of sub.folders) {
      const photos = await getCloudinarySubfolderPhotos(folder.path);

      const matchedConfig = configFolders.find(c =>
        c.folderId === folder.name ||
        c.cloudinarySubfolder === folder.path ||
        c.cloudinarySubfolder === `rsam_website/gallery/${folder.name}`
      );

      if (matchedConfig) matchedConfigSet.add(matchedConfig.folderId);

      folderList.push({
        folderId: (matchedConfig && matchedConfig.folderId) ? matchedConfig.folderId : folder.name,
        cloudinarySubfolder: folder.path,
        title: (matchedConfig && matchedConfig.title) ? matchedConfig.title : folder.name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        date: (matchedConfig && matchedConfig.date) ? matchedConfig.date : 'Event Gallery',
        location: (matchedConfig && matchedConfig.location) ? matchedConfig.location : 'Moradabad / UP',
        category: (matchedConfig && matchedConfig.category) ? matchedConfig.category : 'Championship',
        description: (matchedConfig && matchedConfig.description) ? matchedConfig.description : `Event photo archive for ${folder.name}`,
        displayOrder: (matchedConfig && matchedConfig.displayOrder) ? matchedConfig.displayOrder : 99,
        notFound: photos.length === 0,
        count: photos.length,
        photos
      });
    }

    // Include admin configured folders that were NOT found on Cloudinary with explicit error metadata
    for (const c of configFolders) {
      if (c.enabled !== false && !matchedConfigSet.has(c.folderId)) {
        folderList.push({
          folderId: c.folderId,
          cloudinarySubfolder: c.cloudinarySubfolder || `rsam_website/gallery/${c.folderId}`,
          title: c.title || c.folderId,
          date: c.date || 'Event Gallery',
          location: c.location || '',
          category: c.category || 'Event',
          description: c.description || '',
          displayOrder: c.displayOrder || 99,
          notFound: true,
          error: `folderID '${c.folderId}' not found in gallery`,
          count: 0,
          photos: []
        });
      }
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

/**
 * Endpoint: POST /api/save-gallery-config
 * Persists admin configured gallery folders & metadata to gallery-config.json for all users
 */
app.post('/api/save-gallery-config', async (req, res) => {
  try {
    const { folders, defaultItemsPerPage, autoOptimizeAfterDays } = req.body;
    if (!Array.isArray(folders)) {
      return res.status(400).json({ success: false, error: 'folders array is required.' });
    }

    const configPath1 = path.join(__dirname, 'data/gallery-config.json');
    const configPath2 = path.join(__dirname, '../data/gallery-config.json');

    const configData = {
      cloudinaryBasePath: 'rsam_website/gallery',
      defaultItemsPerPage: defaultItemsPerPage || 20,
      autoOptimizeAfterDays: autoOptimizeAfterDays || 7,
      folders: folders.map((f, i) => {
        const folderId = f.folderId || f.name || `folder_${i+1}`;
        const subfolder = f.cloudinarySubfolder || (folderId.includes('/') ? folderId : `rsam_website/gallery/${folderId}`);
        return {
          folderId,
          cloudinarySubfolder: subfolder,
          title: f.title || folderId,
          date: f.date || 'Event Gallery',
          location: f.location || 'Moradabad / UP',
          category: f.category || 'Championship',
          enabled: f.enabled !== false,
          displayOrder: f.displayOrder || (i + 1),
          description: f.description || ''
        };
      })
    };

    const jsonStr = JSON.stringify(configData, null, 2);

    if (fs.existsSync(path.dirname(configPath1))) {
      fs.writeFileSync(configPath1, jsonStr, 'utf8');
    }
    if (fs.existsSync(path.dirname(configPath2))) {
      fs.writeFileSync(configPath2, jsonStr, 'utf8');
    }

    console.log('[Gallery Config] Saved updated gallery configuration for all users.');
    return res.json({ success: true, message: 'Gallery configuration saved for all users.', config: configData });
  } catch (err) {
    console.error('[Save Gallery Config Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/site-config
 * Serves live unified site configuration (fees, events, skinsuits, news, highlights, gallery, officials, ticker)
 */
app.get('/api/site-config', (req, res) => {
  try {
    const configPath2 = path.join(__dirname, '../data/site-config.json');
    const configPath1 = path.join(__dirname, 'data/site-config.json');
    const targetPath = fs.existsSync(configPath2) ? configPath2 : (fs.existsSync(configPath1) ? configPath1 : null);

    if (targetPath) {
      const data = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
      return res.json({ success: true, config: data });
    }
    return res.status(404).json({ success: false, error: 'site-config.json not found' });
  } catch (err) {
    console.error('[Get Site Config Error]:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/save-site-config
 * Updates live unified site configuration across server and syncs to client files
 */
app.post('/api/save-site-config', (req, res) => {
  try {
    const newConfig = req.body;
    if (!newConfig || typeof newConfig !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid configuration object provided.' });
    }

    const configPath2 = path.join(__dirname, '../data/site-config.json');
    const configPath1 = path.join(__dirname, 'data/site-config.json');

    // Read existing to merge safely
    let currentConfig = {};
    if (fs.existsSync(configPath2)) {
      try { currentConfig = JSON.parse(fs.readFileSync(configPath2, 'utf8')); } catch (e) {}
    } else if (fs.existsSync(configPath1)) {
      try { currentConfig = JSON.parse(fs.readFileSync(configPath1, 'utf8')); } catch (e) {}
    }

    const mergedConfig = {
      ...currentConfig,
      ...newConfig,
      lastUpdated: new Date().toISOString()
    };

    const jsonStr = JSON.stringify(mergedConfig, null, 2);

    try {
      if (fs.existsSync(path.dirname(configPath2))) fs.writeFileSync(configPath2, jsonStr, 'utf8');
    } catch(e) {}
    try {
      if (fs.existsSync(path.dirname(configPath1))) fs.writeFileSync(configPath1, jsonStr, 'utf8');
    } catch(e) {}

    // Also sync gallery folders if provided
    if (mergedConfig.gallery && Array.isArray(mergedConfig.gallery.folders)) {
      const gPath2 = path.join(__dirname, '../data/gallery-config.json');
      const gPath1 = path.join(__dirname, 'data/gallery-config.json');
      const gStr = JSON.stringify(mergedConfig.gallery, null, 2);
      try { if (fs.existsSync(path.dirname(gPath2))) fs.writeFileSync(gPath2, gStr, 'utf8'); } catch(e) {}
      try { if (fs.existsSync(path.dirname(gPath1))) fs.writeFileSync(gPath1, gStr, 'utf8'); } catch(e) {}
    }

    console.log('[Site Config] Permanently updated data/site-config.json for all users.');
    return res.json({ success: true, message: 'data/site-config.json updated.', config: mergedConfig });
  } catch (err) {
    console.error('[Save Site Config Error]:', err.message);
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
