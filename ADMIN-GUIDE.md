# RSAM Website — Admin Guide

## Table of Contents
1. [Accessing the Admin Panel](#1-accessing-the-admin-panel)
2. [Managing News & Circulars](#2-managing-news--circulars)
3. [Managing Upcoming Events](#3-managing-upcoming-events)
4. [Managing Highlights](#4-managing-highlights)
5. [Managing Officials](#5-managing-officials)
6. [Uploading Images](#6-uploading-images)
7. [Adding a New Admin User](#7-adding-a-new-admin-user)
8. [Removing an Admin User](#8-removing-an-admin-user)
9. [Editing Site-Wide Settings](#9-editing-site-wide-settings)
10. [Editing the Registration Certificate or PAN](#10-editing-the-registration-certificate-or-pan)

---

## 1. Accessing the Admin Panel

1. Go to `https://your-site.netlify.app/admin/`
2. Click **Login with Netlify Identity**
3. Enter your email and password
4. You will land on the admin dashboard with four sections:
   - News & Circulars
   - Upcoming Events
   - Highlights
   - Officials

> **First time?** You must accept the email invitation first (see Section 7). The invitation email contains a link — click it, set your password, then log in at `/admin/`.

---

## 2. Managing News & Circulars

News items appear in the right column of the News section on the website. The 5 most recent are shown; older ones go into an auto-archive.

### Add a news item
1. In the admin, click **News & Circulars → News Items**
2. Click the **+** button inside the "News Items" list
3. Fill in the fields:
   - **Tag** — choose `News`, `Circular`, `Result`, or `Notice` (controls the badge colour)
   - **Title** — headline of the post
   - **Date** — date of the news (format: `YYYY-MM-DD`, e.g. `2026-06-01`)
   - **Location** — optional; leave blank if not applicable
   - **Body** — full text; basic HTML like `<b>bold text</b>` is supported
   - **Link Text / Link URL** — leave URL as `#` if there is no external link
4. Click **Save** (top right)
5. The site updates automatically within ~1 minute after saving

### Edit a news item
1. Click **News & Circulars → News Items**
2. Find the item in the list and click it
3. Make your changes and click **Save**

### Delete a news item
1. Click **News & Circulars → News Items**
2. Hover over the item in the list
3. Click the **delete (trash)** icon on the right side of that row
4. Click **Save**

> **Ordering:** Items are automatically sorted by date — newest first. You do not need to manually reorder them.

---

## 3. Managing Upcoming Events

Upcoming Events appear as a swipeable carousel on the left side of the News section. The badge automatically changes based on the current IST time:
- **Upcoming Event** — before the start time
- **Happening Now** — between start and end time
- **Event Ended** — after the end time

### Add an event
1. Click **Upcoming Events → Events Carousel**
2. Click the **+** button in the "Events" list
3. Fill in the fields:
   - **Event Image** — upload or select an image
   - **Category Label** — fallback label shown only if no start/end time is set (e.g. `Upcoming Event`)
   - **Start Date & Time (IST)** — when the event begins (e.g. `2026-06-15T09:00`)
   - **End Date & Time (IST)** — when the event ends (e.g. `2026-06-15T17:00`)
   - **Display Date** — human-readable date shown on the card (e.g. `June 15, 2026`)
   - **Location** — city or venue
   - **Title** — event name
   - **Description** — short paragraph about the event
4. Click **Save**

### Delete a past event
1. Click **Upcoming Events → Events Carousel**
2. Hover over the event row and click the **trash icon**
3. Click **Save**

---

## 4. Managing Highlights

Highlights appear as cards in the Hall of Highlights section. The first item is shown as a wide featured card; the next 4 are shown as regular cards; anything beyond 5 goes into the archive automatically.

### Add a highlight
1. Click **Highlights → Highlight Cards**
2. Click **+** in the "Highlights" list
3. Fill in the fields:
   - **Featured Wide Card** — toggle ON only for the very first item (the big featured card); leave OFF for all others
   - **Date** — date of the event (`YYYY-MM-DD`)
   - **Images** — click **+** to add one or more images; multiple images create a swipeable gallery on the card
   - **Trophy Emoji** — pick an emoji (🏆 🥇 🥈 🌟 ⚡ 🎖️)
   - **Event Name** — official name of the championship or event
   - **Caption** — short punchy headline shown on the card
   - **Body** — detailed description; basic HTML like `<b>bold</b>` is supported
4. Drag the new item to the **top of the list** so it appears first on the website
5. Click **Save**

### Delete a highlight
1. Click **Highlights → Highlight Cards**
2. Hover over the item and click the **trash icon**
3. Click **Save**

> **Tip:** Keep the item with `Featured Wide Card` toggled ON as the **first item** in the list at all times. If you add a new featured item, toggle OFF the old one.

---

## 5. Managing Officials

### Add an official
1. Click **Officials → Association Members**
2. Click **+** in the "Association Members" list
3. Fill in:
   - **Name** — full name
   - **Designation** — title (e.g. `Joint Secretary`)
   - **Badge Colour** — choose the matching role from the dropdown
   - **Photo** — upload a photo (recommended: square, minimum 300×300 px)
4. Drag to reorder if needed
5. Click **Save**

### Edit an official
1. Click **Officials → Association Members**
2. Click on the official's row
3. Update the fields and click **Save**

### Remove an official
1. Click **Officials → Association Members**
2. Hover over the row and click the **trash icon**
3. Click **Save**

### Show/hide the Committee section
1. Click **Officials → Association Members**
2. Toggle **Show Committee Section** ON or OFF
3. Add committee members in the **Committee Members** list below
4. Click **Save**

---

## 6. Uploading Images

Images uploaded through the admin are stored in the `images/` folder of the website automatically.

**Tips for best results:**
- Use **JPG** format for photos (smaller file size)
- Use **PNG** format for logos or images with transparency
- **Resize before uploading** — keep images under 500 KB for fast loading. Free tools: [squoosh.app](https://squoosh.app) or [tinypng.com](https://tinypng.com)
- Recommended max width: **1400px**

---

## 7. Adding a New Admin User

Only existing admins can invite new users.

1. Log in to [netlify.com](https://netlify.com)
2. Go to your site → **Identity** tab
3. Click **Invite users**
4. Enter the new user's email address and click **Send**
5. The user will receive an email invitation
6. They must click the link in the email — it will open the website and show a **Set Password** popup
7. After setting their password, they can log in at `/admin/`

---

## 8. Removing an Admin User

1. Log in to [netlify.com](https://netlify.com)
2. Go to your site → **Identity** tab
3. Find the user in the list
4. Click the **three dots (⋯)** next to their name
5. Select **Delete user**
6. Confirm — the user will immediately lose access to the admin panel

---

## 9. Editing Site-Wide Settings

Some settings are not in the admin panel and must be edited in code. These rarely change:

| What to change | File to edit | Field |
|---|---|---|
| Site name / tab title | `config.js` | `site.name`, `site.fullName`, `site.tabTitle` |
| Hero badge text | `config.js` | `hero.badge` |
| Hero description | `config.js` | `hero.description` |
| About paragraphs | `config.js` | `about.paragraphs` |
| Stats (athletes, medals) | `config.js` | `about.stats` |
| YouTube / Instagram links | `config.js` | `connect.youtube`, `connect.instagram` |
| Email / phone / address | `config.js` | `connect.email`, `connect.phone`, `connect.address` |
| Show/hide any section | `config.js` | `sections.<name>.enabled` |
| Navigation links | `config.js` | `nav` array |

After editing `config.js`, commit and push the change to GitHub — Netlify will redeploy automatically.

---

## 10. Editing the Registration Certificate or PAN

1. Scan or photograph the document
2. Save it as `rsam_regcert.jpeg` (for the registration certificate) or `rsam_pan.jpeg` (for the PAN card)
3. Replace the existing file in the `images/` folder in the GitHub repository
4. Commit and push — Netlify will update the site automatically within ~1 minute

> The filenames must stay exactly the same. Do not rename them.
