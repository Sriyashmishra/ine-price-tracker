# INE Product Price Tracker (Web Scraping & Real-time Analytics)

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Playwright](https://img.shields.io/badge/Playwright-1.50-green.svg)](https://playwright.dev/)
[![React](https://img.shields.io/badge/React-18-61dafb.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38b2ac.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e.svg)](https://supabase.com/)

A full-stack automated price and stock tracking platform tailored for the **INE Software Engineer Intern Assignment**. The system continuously monitors products on the mock e-commerce storefront at [demo.inelabteamdev.com](https://demo.inelabteamdev.com/), overcomes browser-level anti-scraping challenges (SPA hydration, cursor dwell/movement gates, CDP trusted clicks, honeypots, and Unicode obfuscation), and provides an interactive dashboard with time-series trend analysis and honest scrape audit logs.

---

## 🌐 Live Deployment Links
- **Live Web Application (Vercel)**: [https://ine-price-tracker-sage.vercel.app](https://ine-price-tracker-sage.vercel.app/)
- **Backend API & Scraper Engine (Render)**: [https://ine-price-tracker-backend-45sw.onrender.com](https://ine-price-tracker-backend-45sw.onrender.com/)
- **Target Storefront**: [https://demo.inelabteamdev.com](https://demo.inelabteamdev.com/)

---

## 📑 Table of Contents
1. [Key Features](#-key-features)
2. [Architecture Overview](#-architecture-overview)
3. [Anti-Scraping Evasion Highlights](#-anti-scraping-evasion-highlights)
4. [Project Structure](#-project-structure)
5. [Local Development Setup](#-local-development-setup)
6. [Running the Headed Scraper (Video Recording)](#-running-the-headed-scraper-video-recording)
7. [Automated Cron Scheduling](#-automated-cron-scheduling)
8. [Production Deployment Guide](#-production-deployment-guide)
9. [Environment Variables Reference](#-environment-variables-reference)

---

## ✨ Key Features

- **Full Catalog Browser & 1-Click Tracking**: Dynamically paginates and caches all 1,000 catalog products from `/api/catalog` with fuzzy search and instant tracking.
- **Resilient Playwright Scraping Engine**:
  - Emulates natural pointer trajectories and dwell times (>600ms) to satisfy interactive reveal gates.
  - Generates OS-level trusted CDP clicks (`isTrusted: true`) to bypass synthetic event blockers.
  - Recovers from artificial 17.5% dropped clicks and 900ms latency drops with smart re-clicks.
  - Evades hidden honeypot elements (`display: none`, off-screen fake price spans) and ignores strikethrough MRPs.
  - Sanitizes zero-width spaces (`\u200B`), non-breaking spaces (`\u00A0`), full-width Unicode digits, and INR prefixes.
- **Interactive Analytics Dashboard**:
  - High-level metrics: Active products, In-stock ratio, Average discount, Scraping health rate.
  - Recharts historical price & stock progression with min/max/current statistics.
  - Honest Scrape Audit Trail modal: inspect every HTTP code, retry attempt, latency, and failure reason.
- **Dual-Mode Persistence**:
  - Production: Supabase PostgreSQL with relational foreign keys, cascade rules, and updated-at triggers.
  - Local Zero-Config Fallback: Automatic in-memory repository if Supabase credentials are not provided.

---

## 🏗 Architecture Overview

```
+-------------------------------------------------------------+
|                      cron-job.org                           |
|      (Scheduled trigger every 6h / 12h with Bearer Token)    |
+------------------------------+------------------------------+
                               | POST /api/scrape/trigger
                               v
+-------------------------------------------------------------+
|                   Backend API (Render Node/Express)         |
|  - Ingestion: /api/catalog (1,000 products cached)          |
|  - Tracking:  /api/products/:id (Track/Untrack/Scrape)      |
|  - Engine:    Playwright Headless / Headed Scraper           |
|  - Database:  Supabase PostgreSQL + In-Memory Fallback      |
+-------------------+--------------------+--------------------+
                    |                    |
         Queries &  |                    | Realtime Fetch
          Mutations |                    |
                    v                    v
+------------------------+  +--------------------------------+
|  Supabase PostgreSQL   |  |   Frontend Dashboard (Vercel)  |
|  - products            |  |   - React 18 + Tailwind CSS    |
|  - price_history       |  |   - Recharts Visualizations    |
|  - scrape_logs         |  |   - Scrape Audit Logs Modal    |
+------------------------+  +--------------------------------+
```

---

## 🛡 Anti-Scraping Evasion Highlights

| Challenge Encountered | Why Standard Scraping Failed | Our Production Solution |
| :--- | :--- | :--- |
| **Vite SPA Hydration** | `curl` / Cheerio returned an empty `<div id="root"></div>` | Headless Playwright Chromium browser executing full client JS lifecycle. |
| **Hover & Dwell Gate** | Price hidden until user hovers $>600\text{ ms}$ with $\ge 8$ pointer moves | Smooth mouse trajectory interpolation across `.price-block` with 750ms dwell. |
| **`isTrusted` Event Block** | Synthetic `element.click()` or `dispatchEvent` rejected | Playwright Chrome DevTools Protocol (CDP) native OS mouse events. |
| **Artificial Flakiness** | Mock store drops 17.5% of clicks and delays 17.5% by 900ms | Detection loop with 1.5s timeout; executes automated retry clicks. |
| **Hidden Honeypots** | Site injects hidden spans (`display:none`) with fake high prices | Computed style filtering, visibility check (`width > 0 && height > 0`), and strikethrough MRP exclusion. |
| **Unicode Obfuscation** | Price text embeds zero-width spaces (`\u200B`) and full-width numbers | Regex sanitizer cleaning non-printable characters and normalizing currency strings. |

*For deep architectural analysis, see [DESIGN_NOTE.md](./DESIGN_NOTE.md).*

---

## 📁 Project Structure

```
ine-price-tracker/
├── package.json              # Monorepo convenience scripts
├── README.md                 # Project documentation & runbook
├── DESIGN_NOTE.md            # Scraping reliability & AI reflection writeup
├── .env.example              # Template environment variables
├── supabase/
│   └── schema.sql            # Supabase database schema & triggers
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env
│   └── src/
│       ├── config.ts         # Environment configuration
│       ├── index.ts          # Express API server entrypoint
│       ├── db/
│       │   └── client.ts     # Dual-mode Supabase / In-Memory repository
│       ├── scraper/
│       │   ├── parser.ts     # Currency and stock sanitization logic
│       │   ├── scraper.ts    # Core Playwright automation & retry loop
│       │   ├── headed.ts     # Headed scraper runner for video recording
│       │   └── test_scraper.ts # Headless test harness
│       └── routes/
│           ├── catalog.ts    # Storefront catalog ingestion & search
│           ├── products.ts   # Product tracking & history endpoints
│           └── cron.ts       # Secure cron trigger endpoint
└── client/
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── App.tsx           # Dashboard view coordinator
        ├── services/api.ts   # Axios/Fetch client integration
        └── components/
            ├── Navbar.tsx            # Header with trigger & search actions
            ├── StatsCards.tsx        # High-level KPIs
            ├── ProductTable.tsx      # Interactive product inventory
            ├── PriceChart.tsx        # Recharts historical visualizer
            ├── ProductSearchModal.tsx # Catalog explorer & 1-click import
            └── ScrapeLogsModal.tsx   # Audit trail log viewer
```

---

## 🚀 Local Development Setup

### Prerequisites
- Node.js 18+ or 20+
- npm 9+

### 1. Clone & Setup
```bash
git clone https://github.com/<your-username>/ine-price-tracker.git
cd ine-price-tracker
```

### 2. Configure Environment Variables
Copy `.env.example` to `server/.env` and `client/.env`:
```bash
cp .env.example server/.env
```

*(Optional: If using Supabase, enter your `SUPABASE_URL` and `SUPABASE_KEY`. If left empty, the server automatically uses the high-performance in-memory repository).*

### 3. Install Dependencies
```bash
# In the server directory:
cd server
npm install
npx playwright install chromium

# In the client directory:
cd ../client
npm install
```

### 4. Run Locally
You can run both client and server from the root:
```bash
# Terminal 1 - Backend Server (runs on http://localhost:5001):
npm run dev:server

# Terminal 2 - Frontend Client (runs on http://localhost:5173):
npm run dev:client
```

Open `http://localhost:5173` in your browser.

---

## 🎥 Running the Headed Scraper (Video Recording)

The assignment requires a **2–4 minute screen recording** demonstrating the scraper operating in **headed mode**, showing browser interaction, retry handling on slow or failing responses, and live terminal progress.

We built a dedicated headed runner with slow-motion visualization (`slowMo: 120ms`):

```bash
cd server
npm run scrape:headed
```

### What You Will See in the Video:
1. **Chromium Window Launches**: Visualizes page navigation to `https://demo.inelabteamdev.com/product/95` (or any selected product ID).
2. **Cookie Banner Dismissal**: Automatically spots and closes cookie modals.
3. **Cursor Trajectory & Dwell**: Visual cursor moves across the price block for $>600\text{ ms}$.
4. **Button Click & Reveal**: Native CDP click unlocks the live price.
5. **Console Output**: Outputs structured extraction metrics:
   ```text
   [SCRAPER] 🚀 Navigating to https://demo.inelabteamdev.com/product/95...
   [SCRAPER] 🖱️ Simulating dwell and pointer trajectory over .price-block...
   [SCRAPER] 🎯 Clicking 'Reveal price' button...
   [SCRAPER] ✨ Price successfully revealed!
   [PARSER] 🔍 Extracted visible price: ₹3,499 (parsed numeric: 3499)
   [PARSER] 📦 Stock status: IN_STOCK (Only 3 left)
   [AUDIT] ✅ Run logged: Status=SUCCESS, HTTP=200, Latency=1420ms, Attempts=1
   ```

---

## ⏰ Automated Cron Scheduling

### Option 1: cron-job.org (Recommended for Render)
1. Register a free account at [cron-job.org](https://cron-job.org/).
2. Create a new cron job:
   - **URL**: `https://<your-render-backend-url>/api/scrape/trigger`
   - **Method**: `POST`
   - **Headers**:
     - `Authorization`: `Bearer your-secure-cron-secret`
     - `Content-Type`: `application/json`
   - **Schedule**: Every 6 or 12 hours (e.g., `0 */6 * * *`).

### Option 2: GitHub Actions (`.github/workflows/scrape.yml`)
You can also trigger batch scraping via a scheduled GitHub workflow:
```yaml
name: Scheduled Price Scraper
on:
  schedule:
    - cron: '0 */6 * * *'
  workflow_dispatch:

jobs:
  scrape:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Scrape API
        run: |
          curl -X POST https://${{ secrets.RENDER_BACKEND_URL }}/api/scrape/trigger \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

---

## 🌐 Production Deployment Guide

### 1. Database (Supabase PostgreSQL)
1. Create a free project at [supabase.com](https://supabase.com/).
2. Go to the **SQL Editor** in Supabase and paste the contents of `supabase/schema.sql`. Run the script to create tables (`products`, `price_history`, `scrape_logs`) and automated triggers.
3. Copy your **Project URL** and **Service Role Secret Key** (or Anon key).

### 2. Backend API (Render)
1. Connect your GitHub repository to [Render](https://render.com/).
2. Create a **Web Service**:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npx playwright install chromium && npm run build`
   - **Start Command**: `npm run start`
3. Add Environment Variables:
   - `PORT`: `5001`
   - `SUPABASE_URL`: `<your-supabase-url>`
   - `SUPABASE_KEY`: `<your-supabase-key>`
   - `CRON_SECRET`: `<any-strong-secret-key>`
   - `STORE_BASE_URL`: `https://demo.inelabteamdev.com`

### 3. Frontend Client (Vercel)
1. Import your GitHub repository into [Vercel](https://vercel.com/).
2. Set **Root Directory** to `client`.
3. Framework Preset: **Vite**.
4. Add Environment Variable:
   - `VITE_API_URL`: `https://<your-render-app>.onrender.com`
5. Click **Deploy**.

---

## 🔑 Environment Variables Reference

### Backend (`server/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Server listening port | `5001` |
| `STORE_BASE_URL` | Target mock storefront URL | `https://demo.inelabteamdev.com` |
| `SUPABASE_URL` | Supabase project API URL | `""` *(uses in-memory fallback if empty)* |
| `SUPABASE_KEY` | Supabase service role or anon key | `""` |
| `CRON_SECRET` | Secret token to authorize batch scrape triggers | `ine-super-secret-cron-token-2026` |
| `NODE_ENV` | Environment mode | `production` |

### Frontend (`client/.env`)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_API_URL` | Backend server URL | `http://localhost:5001` |

---

## 👤 Author & Assignment Context
- **Candidate**: Sriyash Mishra 
- **Role**: Software Engineer Intern Assignment: Product Price Tracker
- **Submission Date**: September 20, 2026
