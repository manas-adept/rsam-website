# OpenWA WhatsApp Notification Setup Guide 🛼📱

This directory contains the Node.js server for **OpenWA (`@open-wa/wa-automate`)**. It listens for website registrations from your RSAM website and automatically sends a WhatsApp confirmation message with all registration details to the athlete's phone number.

---

## 💡 How It Works (Beginner Overview)

1. **Static Website (GitHub Pages / Netlify)**:
   When a user submits the registration form on `register.html`, their form data is posted to your backend / Google Sheet.
2. **OpenWA Server (Node.js App)**:
   OpenWA runs a headless browser that stays logged into WhatsApp Web using your official phone number.
3. **Instant Notification**:
   The OpenWA server receives the registration payload, formats an attractive WhatsApp message, and sends it directly to the athlete's WhatsApp number.

---

## 🚀 Quickstart: Running on your Local Computer (5 Minutes)

### Step 1: Install Node.js
If you don't have Node.js installed:
- Download & install Node.js (LTS version) from [nodejs.org](https://nodejs.org/).

### Step 2: Open Terminal / Command Prompt
Navigate to the `whatsapp-server` directory inside your website project:
```bash
cd whatsapp-server
```

### Step 3: Install Dependencies
Run the following command to download OpenWA and required libraries:
```bash
npm install
```

### Step 4: Start the Server
Start the server:
```bash
npm start
```

### Step 5: Scan QR Code (First Time Only)
1. On initial startup, a browser window or QR code will appear in your terminal/screen.
2. Open **WhatsApp** on your phone.
3. Tap **Menu (3 dots) / Settings** -> **Linked Devices** -> **Link a Device**.
4. Scan the QR code shown on your screen.
5. Done! Your terminal will display: `✅ [OpenWA] Connected & Authenticated successfully with WhatsApp Web!`.

---

## 🌐 Connecting your GitHub Pages / Netlify Website

Since GitHub Pages and Netlify host static files (HTML/JS/CSS), your website needs an HTTP URL to reach your OpenWA server.

### Option A: Local Testing using Ngrok (Free & Fast)
If you are running the OpenWA server on your laptop/PC:
1. Download **Ngrok** from [ngrok.com](https://ngrok.com/).
2. Run: `ngrok http 3000`
3. Ngrok will give you a public URL (e.g. `https://a1b2-123-45-67.ngrok-free.app`).
4. Copy this URL and paste it into:
   - **Google Apps Script (`google-apps-script.js`)**: Set `OPENWA_SERVER_URL = "https://a1b2-123-45-67.ngrok-free.app/send-registration"`
   - **OR `register.js`**: Set `OPENWA_SERVER_URL = "https://a1b2-123-45-67.ngrok-free.app/send-registration"`

### Option B: Hosting 24/7 on Cloud (Railway / Render / VPS)
For production where your laptop isn't always turned on:
1. Push this `whatsapp-server` folder to a GitHub repository.
2. Deploy to [Railway.app](https://railway.app) or [Render.com](https://render.com) (or an Ubuntu VPS like DigitalOcean/AWS).
3. Set Environment Variables (`API_SECRET_KEY`, `ORGANIZATION_NAME`).
4. Perform the QR scan once via cloud logs or remote desktop.

---

## 🧪 Testing the API directly

You can test sending a WhatsApp message using `curl` or Postman:

```bash
curl -X POST http://localhost:3000/send-registration \
  -H "Content-Type: application/json" \
  -H "x-api-key: rsam_whatsapp_secret_key_2026" \
  -d '{
    "skaterName": "John Doe",
    "dob": "2010-05-15",
    "age": "16",
    "discipline": "Speed Inline",
    "mobile": "9876543210",
    "fatherName": "Robert Doe",
    "motherName": "Mary Doe",
    "address": "Moradabad, UP",
    "year": "2026"
  }'
```

---

## 🛠️ Security & Configuration

- **API Secret Key**: Change `API_SECRET_KEY` in `.env` and `google-apps-script.js` / `register.js` to your own random secret password to prevent unauthorized requests.
- **Session Persistence**: Session files are stored automatically in `RSAM_SESSION` folder so you don't have to scan the QR code every time you restart the server.
