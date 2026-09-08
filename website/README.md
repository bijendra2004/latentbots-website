# ⚡ LatentBots — Intelligent WhatsApp Automation Platform & Owner Console

> **Calm, intelligent message routing and automation right where you already are — on WhatsApp.**

![LatentBots Platform](https://img.shields.io/badge/Platform-LatentBots-orange.svg)
![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)
![Express](https://img.shields.io/badge/Express-v4.21-blue.svg)
![SQLite](https://img.shields.io/badge/Database-SQLite3-lightgrey.svg)
![Brevo SMTP](https://img.shields.io/badge/Email-Brevo%20SMTP%20%26%20API-0092ff.svg)
![License](https://img.shields.io/badge/License-Private-red.svg)

---

## 📖 Overview

**LatentBots** is a complete, modern web platform and centralized management suite for intelligent WhatsApp bots and automations (including *LatentMail*, *LatentAlert*, *LatentDigest*, and *LatentLead*). 

The repository contains:
1. **User Website (`user-website/`)**: High-converting public landing page, interactive hero bot carousel with real-time launch status badges, 3-step WhatsApp connect workflow, bot catalog, and user session management.
2. **Owner Console (`admin-website/`)**: Enterprise-grade admin portal with TOTP 2FA, live traffic metrics, bot file deployment & auto-versioning hub, inline badge controller, user audience management, error audit logs, and Brevo SMTP email delivery integration.
3. **Backend Engine (`backend/`)**: Secure Express REST API, SQLite database with automatic migrations, JWT authentication, and Brevo v3 HTTPS & SMTP hybrid mailer.

---

## 🌟 Key Features

### 🚀 Public User Platform
- **Dynamic Hero Slider Track**: Fast, silky-smooth bot carousel showcasing flagship bots with real-time top-right corner badges (`🟢 LIVE`, `🟡 COMING SOON`, `🔵 BETA`, `🟠 MAINTENANCE`).
- **3-Step Connect Modal**: Customized WhatsApp link generator with pre-filled greeting text and configuration steps.
- **Dynamic Bots Catalog**: Live bot catalog pulled directly from the SQLite database.
- **Client Authentication**: Clean, friction-free Sign In / Sign Up modal with local session persistence.

### 🛡️ Owner Console / Admin Panel (`/admin`)
- **Bank-Grade Security**: Password + TOTP 2FA (Google Authenticator / Authy), rate-limited login endpoints, HttpOnly JWT cookies, and Helmet security headers.
- **Bot Deployment & Version Release Hub**:
  - Drag-and-drop bot script and config file uploads (`.js`, `.py`, `.json`, `.zip`).
  - Auto-versioning engine (`v1.0.0` → `v1.1.0`) with changelog integration.
  - Interactive **Hero Badge Selector** for instant 1-click updates across the live website.
  - Attached file storage and instant downloads.
- **Audience & User Management**: Manage registered users, toggle notification levels, and block/unblock accounts.
- **Live Traffic & Health Roster**: Real-time traffic simulation, memory, latency, and uptime monitoring.
- **Brevo SMTP & Transactional Email Hub**: Pre-configured sender `latentbots@gmail.com` with Brevo v3 HTTPS REST API and Nodemailer fallback.
- **System Issues & Delivery Error Logs**: Real-time error monitoring and webhook failure logs.

---

## 📂 Project Structure

```text
latentWebsite/
├── website/
│   ├── admin-website/            # Owner Console frontend (SPA)
│   │   ├── index.html            # Admin dashboard UI
│   │   ├── style.css             # Dark/Light console theme styles
│   │   ├── script.js             # Core admin logic, TOTP, and state
│   │   └── bots-panel.js         # Bot deployment hub & badge manager
│   │
│   ├── user-website/             # Public landing page & catalog
│   │   ├── index.html            # Main landing page
│   │   ├── style.css             # Modern brand design & responsive styling
│   │   └── script.js             # Hero slider, modals, and dynamic bot sync
│   │
│   ├── backend/                  # Server & API Engine
│   │   ├── server.js             # Express entry point
│   │   ├── db-connect.js         # SQLite connection & schema migrations
│   │   ├── models/               # Data access models (bot, user, version, issue, log)
│   │   ├── routes/               # API route handlers (bots, admin, email, users, logs)
│   │   └── services/             # Brevo Mailer engine & HTML email templates
│   │
│   ├── shared/                   # Shared configuration & env validator
│   ├── data/                     # SQLite database storage (gitignored)
│   ├── .env.example              # Environment variables template
│   ├── .gitignore                # Security-focused ignore rules
│   └── package.json              # Dependencies and scripts
│
├── .gitignore                    # Root gitignore
└── README.md                     # Project documentation
```

---

## ⚙️ Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher recommended)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher)

### 1. Clone the Repository
```bash
git clone git@github.com:bijendra2004/latentbots-website.git
cd latentbots-website/website
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy the example `.env` file:
```bash
cp .env.example .env
```

Edit `.env` with your secure credentials:
```env
PORT=3000
DB_PATH=./data/latentmail.db
ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=your-secure-admin-password-123
ADMIN_TOTP_SECRET=JBSWY3DPEHPK3PXP
JWT_SECRET=your-32-char-jwt-secret-key-123456789
WHATSAPP_NUMBER=15551234567
NODE_ENV=development

# ==========================================
# BREVO SMTP & API CONFIGURATION
# ==========================================
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=latentbots@gmail.com
SMTP_PASS=xkeysib-your-brevo-api-or-smtp-key
BREVO_API_KEY=xkeysib-your-brevo-api-or-smtp-key
SMTP_FROM_EMAIL=latentbots@gmail.com
SMTP_FROM_NAME=LatentBots
```

> [!IMPORTANT]
> **Never commit your `.env` file!** The `.gitignore` file is strictly configured to protect `.env`, API keys, and SQLite databases from being uploaded.

---

## 🚀 Running the Server

### Development Mode (with hot reloading)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

### Access URLs
- 🌐 **User Landing Page:** [http://localhost:3000](http://localhost:3000)
- 🔒 **Owner Console Admin Panel:** [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 🔑 REST API Endpoints

### 🤖 Bot Management (`/api/bots`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/bots` | Public | Fetch all active deployed bots with steps & metadata |
| `GET` | `/api/bots/:id` | Public | Fetch single bot details by ID/slug |
| `POST` | `/api/bots` | Admin | Deploy new bot or publish version update with file upload |
| `PATCH` | `/api/bots/:id/badge` | Admin | 1-Click instant update for Hero Badge status (`LIVE`, `COMING SOON`, `BETA`) |
| `DELETE` | `/api/bots/:id` | Admin | Delete / archive a bot from roster |
| `GET` | `/api/bots/download/:id`| Public/Admin | Download attached bot script/file |

### ✉️ Email Delivery & Brevo Status (`/api/email`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/email/status` | Admin | Check Brevo API / SMTP connection and credentials |
| `POST` | `/api/email/test` | Admin | Send a test verification email to confirm delivery |

### 👥 User & Session Management (`/api/users`)
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/users/signup` | Public | Register new user account |
| `POST` | `/api/users/signin` | Public | Authenticate user |
| `GET` | `/api/users` | Admin | List all registered users with notification preferences |
| `PATCH` | `/api/users/:id/status` | Admin | Block or unblock a user |

---

## 🔐 Security Highlights

- **TOTP Two-Factor Authentication**: Protects the admin panel using RFC 6238 time-based one-time passwords.
- **Brute Force Protection**: Rate limiting enabled on authentication endpoints (`express-rate-limit`).
- **Data Protection**: Sensitive environment variables and SQLite databases excluded from version control.
- **Content Security**: Hardened HTTP headers powered by `helmet`.

---

## 📄 License & Maintainer

- **Developer / Maintainer**: [Bijendra Yadav](https://github.com/bijendra2004)
- **Email**: `latentbots@gmail.com`
- **Copyright**: &copy; 2026 LatentBots. All rights reserved.