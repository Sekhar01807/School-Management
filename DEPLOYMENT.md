# 🚀 SchoolSync — Complete Production Deployment Guide

This guide provides end-to-end instructions for deploying the **SchoolSync** platform into production.

---

## 📑 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Strategy 1: Managed Cloud Deployment (Vercel + Render + MongoDB Atlas)](#strategy-1-managed-cloud-deployment-recommended)
   - [Step 1: MongoDB Atlas Database Setup](#step-1-mongodb-atlas-database-setup)
   - [Step 2: Backend Deployment on Render](#step-2-backend-deployment-on-render)
   - [Step 3: Frontend Deployment on Vercel](#step-3-frontend-deployment-on-vercel)
   - [Step 4: Background Workflows with Inngest Cloud](#step-4-background-workflows-with-inngest-cloud)
3. [Strategy 2: Containerized Docker Compose (VPS / AWS EC2 / DigitalOcean)](#strategy-2-containerized-docker-compose-vps--droplet)
4. [Environment Variables Reference](#environment-variables-reference)
5. [CORS & Cookie Configuration](#cors--cookie-configuration)
6. [Post-Deployment Smoke Test Checklist](#post-deployment-smoke-test-checklist)

---

## Architecture Overview

```
                          ┌────────────────────────┐
                          │   End Users / Clients  │
                          └───────────┬────────────┘
                                      │ HTTPS
              ┌───────────────────────┴───────────────────────┐
              ▼                                               ▼
   ┌────────────────────┐                          ┌────────────────────┐
   │  Vercel Frontend   │ ─── API Requests ──────▶ │   Render Backend   │
   │  (React 19 + Vite) │     (Credentials: Inc)   │ (Express 5.2 + TS) │
   └────────────────────┘                          └──────────┬─────────┘
                                                              │
                                     ┌────────────────────────┼────────────────────────┐
                                     ▼                        ▼                        ▼
                          ┌────────────────────┐   ┌────────────────────┐   ┌────────────────────┐
                          │   MongoDB Atlas    │   │   Inngest Cloud    │   │  Google Gemini AI  │
                          │     (Database)     │   │  (Workflow Engine) │   │ (Question & Timet) │
                          └────────────────────┘   └────────────────────┘   └────────────────────┘
```

---

## Strategy 1: Managed Cloud Deployment (Recommended)

### Step 1: MongoDB Atlas Database Setup

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Create a free **M0 Shared Cluster**.
3. Under **Database Access**, create a database user (e.g. `schoolsync_admin`) with **Read and write to any database** privileges.
4. Under **Network Access**, add `0.0.0.0/0` (Allow Access from Anywhere) so cloud serverless instances can connect.
5. Click **Connect** ➔ **Drivers** ➔ Copy the Connection String:
   ```env
   mongodb+srv://schoolsync_admin:<password>@cluster0.b872qiu.mongodb.net/school_management?retryWrites=true&w=majority
   ```

---

### Step 2: Backend Deployment on Render

1. Sign up at [Render](https://render.com) and connect your GitHub repository.
2. Click **New +** ➔ **Web Service**.
3. Select your repository and specify:
   - **Name:** `schoolsync-api`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Add the following **Environment Variables** in the Render dashboard:

| Variable | Value | Description |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enables production optimizers & security headers |
| `PORT` | *(Leave empty / auto)* | Optional; Render automatically assigns and manages the port |
| `MONGO_URL` | `mongodb+srv://...` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | *(Click Generate or paste 32+ char key)* | Cryptographic signing key for HS512 JWTs |
| `CLIENT_URL` | `https://your-frontend.vercel.app` | URL of your deployed frontend (supports comma-separated list) |
| `COOKIE_SAME_SITE` | `none` | Required for cross-domain cookie authentication |
| `GOOGLE_GENERATIVE_AI_API_KEY` | `AIzaSy...` | API key from [Google AI Studio](https://aistudio.google.com) |
| `SEED_DEFAULT_DATA` | `true` *(first boot only)* | Seeds initial admin/academic year; set to `false` afterwards |
| `DEFAULT_ADMIN_PASSWORD` | `YourSecurePassword123!` | Strong password for initial admin account |
| `EMAIL_FROM` | `"SchoolSync" <notifications@schoolsync.com>` | Sender identity |
| `RESEND_API_KEY` | `re_...` *(optional)* | Resend API key or configure SMTP below |

5. Click **Deploy Web Service**.
6. Once deployed, note your backend URL: e.g. `https://schoolsync-api.onrender.com`.

---

### Step 3: Frontend Deployment on Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New...** ➔ **Project**.
2. Import your GitHub repository.
3. In the project setup screen:
   - **Root Directory:** Edit and select `frontend`.
   - **Framework Preset:** `Vite`.
   - **Build Command:** `npm run build` (or `tsc -b && vite build`).
   - **Output Directory:** `dist`.
4. Expand **Environment Variables** and add:

| Name | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://schoolsync-api.onrender.com/api` |

5. Click **Deploy**.
6. After deployment completes, copy your Vercel URL (e.g. `https://schoolsync-demo.vercel.app`).
7. **Important:** Go back to your Render backend dashboard and update `CLIENT_URL` with your exact Vercel URL!

---

### Step 4: Background Workflows with Inngest Cloud

The AI timetable generator and exam question synthesis run via Inngest background step functions.

1. Sign up for a free account at [Inngest](https://www.inngest.com).
2. Create a new App and click **Sync App**.
3. Provide your deployed backend sync endpoint:
   ```
   https://schoolsync-api.onrender.com/api/inngest
   ```
4. Copy the generated `INNGEST_SIGNING_KEY` and `INNGEST_EVENT_KEY` into your Render backend environment variables.

---

## Strategy 2: Containerized Docker Compose (VPS / Droplet)

For self-hosted deployments on AWS EC2, DigitalOcean Droplets, Linode, Hetzner, or Coolify:

### 1. Clone Repository & Configure Environment

```bash
git clone https://github.com/Sekhar01807/School-Management.git
cd School-Management
```

Create a root `.env` file for Docker Compose:
```env
# Security Secrets
JWT_SECRET=generate_a_cryptographically_secure_random_64_character_string_here!
DEFAULT_ADMIN_PASSWORD=SuperStrongAdminPassword2026!

# AI Engine
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_api_key

# Email
RESEND_API_KEY=your_resend_api_key
# Or SMTP credentials:
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_key

# Domain Routing
CLIENT_URL=http://your-server-ip,http://localhost
VITE_API_BASE_URL=http://your-server-ip/api
```

### 2. Build and Launch Stack

```bash
docker compose up -d --build
```

### 3. Verify Container Status

```bash
docker compose ps
```

- **Frontend:** Available on `http://<your-server-ip>:80`
- **Backend API:** Available on `http://<your-server-ip>:5000`
- **MongoDB:** Internal network on `mongodb:27017`

---

## Environment Variables Reference

### Backend Configuration (`backend/.env`)

```ini
# ==========================================
# Server Configuration
# ==========================================
# PORT=5000 (Optional: auto-assigned by cloud hosts like Render)
NODE_ENV=production
CLIENT_URL=https://schoolsync.vercel.app,http://localhost:5173

# ==========================================
# Database Connection
# ==========================================
MONGO_URL=mongodb+srv://<user>:<password>@cluster0.b872qiu.mongodb.net/school_management?retryWrites=true&w=majority
RESET_DB=false
SEED_DEFAULT_DATA=true
DEFAULT_ADMIN_EMAIL=admin@schoolsync.com
DEFAULT_ADMIN_PASSWORD=SuperStrongPassword123!

# ==========================================
# Authentication & Cookies
# ==========================================
JWT_SECRET=a_very_long_secure_random_string_at_least_32_characters
COOKIE_SAME_SITE=none

# ==========================================
# Google Gemini AI Integration
# ==========================================
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...

# ==========================================
# Email Notification Service
# ==========================================
EMAIL_FROM="SchoolSync Notifications" <notifications@schoolsync.com>
# Option 1: Resend
RESEND_API_KEY=re_123456789
# Option 2: SMTP
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=587
SMTP_USER=username
SMTP_PASS=password
SMTP_SECURE=false
```

### Frontend Configuration (`frontend/.env`)

```ini
# Production Backend API URL
VITE_API_BASE_URL=https://schoolsync-api.onrender.com/api
```

---

## CORS & Cookie Configuration

When frontend and backend are hosted on different domains:
1. `backend/src/server.ts` enables `trust proxy` so secure cookie flags function behind cloud load balancers.
2. In `backend/.env`, set:
   ```env
   COOKIE_SAME_SITE=none
   NODE_ENV=production
   ```
3. Modern browsers require `SameSite=none` and `Secure=true` for third-party cookies across separate domains over HTTPS.
4. The API middleware also supports `Authorization: Bearer <token>` headers as a fallback.

---

## Post-Deployment Smoke Test Checklist

- [ ] **Health Check:** Open `https://your-api.onrender.com/health` ➔ should return `{"status":"healthy"}`.
- [ ] **Frontend Load:** Open `https://your-app.vercel.app` ➔ login page renders cleanly with modern styling.
- [ ] **Authentication:** Log in with `admin@schoolsync.com` and your configured password ➔ JWT cookie is set and redirects to `/dashboard`.
- [ ] **Role Navigation:** Verify access to User Management, Academic Year, LMS Exams, Timetable, and Attendance.
- [ ] **Avatar Upload:** Go to **Profile & Settings** ➔ Upload custom avatar or choose preset ➔ verifies persistent storage.
- [ ] **AI Exam Generator:** In LMS Exams, trigger AI Question generation with Gemini ➔ questions populate automatically.
- [ ] **Logout Flow:** Click **Sign Out** in sidebar ➔ session clears cleanly and redirects to `/login`.
