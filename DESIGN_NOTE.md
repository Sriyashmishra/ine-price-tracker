# Architectural Design & Scraping Reliability Note

**Project**: INE Software Engineer Intern Assignment — Product Price Tracker  
**Candidate**: Sriyash Mishra  
**Target Storefront**: `https://demo.inelabteamdev.com/`  
**Date**: September 2026  

---

## 1. Executive Summary & Problem Overview

The objective was to build an automated, production-grade price tracking platform that monitors products on a mock e-commerce storefront, logs historical price and stock fluctuations, visualizes trends over time, and alerts administrators or users when anomalous changes or scrape failures occur.

Unlike conventional static storefronts where products can be ingested via standard `fetch` or `cheerio` HTML parsers, the INE mock storefront implements realistic browser-level challenges:
1. **Client-Side SPA Architecture**: Built on Vite + React 19; initial server response returns an empty `<div id="root"></div>`.
2. **Catalog vs. Detail Decoupling**: The catalog API (`/api/catalog`) provides product titles, categories, and ratings across 1,000 items, but **neither prices nor stock levels are exposed** in the catalog or product detail API (`/api/product/:id`).
3. **Intentional Anti-Scraping / Interaction Bottlenecks**:
   - Dwell & Movement Gating: Prices are masked behind a "Reveal price" flow that only activates when the user pointer hovers over `.price-block` for $\ge 600\text{ ms}$ with at least 8 mouse moves.
   - Event Verification (`isTrusted`): Button click listeners reject synthetic JavaScript `.dispatchEvent(new MouseEvent('click'))` or `element.click()`.
   - Simulated Flakiness: The click handler introduces an artificial 17.5% dropped-click rate and 17.5% 900ms delay.
   - Honeypot Traps: Injected hidden DOM nodes containing randomized or fake price values (`.price-value`, `.amount[data-price="true"]` with `display: none`) alongside strikethrough MRPs.
   - Text Obfuscation: Price text embeds zero-width spaces (`\u200B`), non-breaking spaces (`\u00A0`), full-width Unicode characters, and mixed currency prefixes (`₹`, `Rs.`).
   - Cookie Overlays: Randomly timed modal overlays intercepting pointer events.

This document details the architectural decisions, trade-offs, evasion strategies, audit mechanisms, and the corrections applied to overcome initial AI-assisted development pitfalls.

---

## 2. Scraping Reliability & Evasion Architecture

### 2.1. Overcoming the Interaction Gate (Hover & Dwell Emulation)
To unlock the "Reveal price" button:
- **Natural Pointer Trajectory**: Rather than jumping directly to element coordinates, Playwright's mouse controller executes an interpolated movement path across the `.price-block` container:
  ```typescript
  const box = await priceBlock.boundingBox();
  for (let i = 0; i < 12; i++) {
    const offsetX = box.x + (box.width / 12) * i + (Math.random() * 4 - 2);
    const offsetY = box.y + box.height / 2 + Math.sin(i) * 3;
    await page.mouse.move(offsetX, offsetY);
    await page.waitForTimeout(60);
  }
  ```
- **Dwell Time Verification**: A deliberate pause of 750ms is enforced, exceeding the 600ms threshold before checking if the button transitioned from disabled to active.

### 2.2. Handling `isTrusted` Clicks and Flaky Drops
The mock store checks the browser event's `event.isTrusted` flag, preventing DOM-level JavaScript invocation.
- **CDP-Driven Trusted Events**: Playwright interacts through Chrome DevTools Protocol (CDP) at the OS/browser input level, generating genuine trusted input events.
- **Transient Drop Detection**: Because 17.5% of clicks are dropped intentionally by the client app, our scraper checks if `.price-revealed` or the price display appears within 1.5 seconds. If not, it executes an immediate retry click up to 3 times before falling back to full page reload backoff.

### 2.3. Anti-Honeypot Strategy & Clean Extraction
Once the price container renders, multiple candidate elements exist in the DOM:
- Strikethrough MRP (e.g., `<s>₹4,999</s>`)
- Hidden honeypots (`<span class="price-value" style="display:none">₹12,499</span>`)
- Actual selling price (e.g., `<span class="current-price">₹\u200B3,\u200B499</span>`)

To guarantee accurate extraction:
1. **Bounding Box & Visibility Checks**: Every candidate element is evaluated for non-zero dimensions (`box.width > 0 && box.height > 0`) and computed CSS properties (`visibility !== 'hidden'`, `display !== 'none'`, `opacity !== '0'`).
2. **MRP Exclusion**: Elements styled with `text-decoration: line-through`, `.strikethrough`, or parent `<s>`/`<del>` tags are strictly rejected.
3. **Unicode & Currency Normalization**:
   - Zero-width spaces (`\u200B`), soft hyphens (`\u00AD`), and zero-width non-joiners (`\u200C`) are stripped.
   - Non-breaking spaces (`\u00A0`) are mapped to standard spaces.
   - Currency symbols (`₹`, `INR`, `Rs.`, `$`) and commas are sanitized, and full-width numbers (`０-９`) are mapped to standard ASCII digits.
   - `parseFloat` is applied to obtain a clean, valid IEEE 754 float.

### 2.4. Exponential Backoff & Retry Circuit
Network fluctuations, 5xx server drops, or transient DOM timeouts are handled with exponential backoff:
- **Base delay**: 1,500ms
- **Multiplier**: $1.5 \times \text{delay} + \text{jitter}$
- **Max Retries**: 3 attempts per scrape cycle.
- **Cookie Banner Interceptor**: A proactive check for `.cookie-overlay, [class*="cookie"] button` dismisses overlays prior to any interaction.

---

## 3. Data Integrity & The "Honest Audit Trail" Principle

A core failure mode of inexperienced web scrapers is saving corrupted state (e.g., `price: 0`, `price: null`, or hallucinated values) when an extraction step fails, thereby corrupting downstream analytics.

In our system:
- **Atomic Transactional Logging**: Every scrape attempt emits a record to `scrape_logs` containing:
  - `status`: `'SUCCESS'` | `'FAILED'` | `'RETRY_SUCCESS'`
  - `http_status`: HTTP code returned by the initial page load.
  - `response_time_ms`: Total latency from navigation start to price parse.
  - `attempt_count`: Number of retry attempts required.
  - `error_reason`: Precise failure context (e.g., `"Timeout waiting for .price-block after 10000ms"`).
- **Zero Corrupted Writes**: If an extraction fails, the existing `products.current_price` is **never** overwritten with zeroes or nulls. The error is isolated to `scrape_logs`, preserving historical fidelity.
- **Auditable Frontend UI**: The frontend dashboard exposes a dedicated "Scrape Audit Logs" viewer showing real-time health, latency spikes, and retry counts with color-coded badges.

---

## 4. System Architecture & Deployment Trade-offs

### 4.1. Architecture Diagram
```
+-------------------------------------------------------------+
|                      cron-job.org                           |
|      (Scheduled trigger every 6h / 12h with Bearer Token)    |
+------------------------------+------------------------------+
                               | POST /api/scrape/trigger
                               v
+-------------------------------------------------------------+
|                   Backend API (Render Node/Express)         |
|  - Ingestion: /api/catalog (1000 products, 60/page cache)    |
|  - Tracking:  /api/products/:id (Track/Untrack)              |
|  - Engine:    Playwright Headless / Headed Scraper           |
|  - Database:  Dual-Mode (Supabase PostgreSQL + In-Memory)   |
+-------------------+--------------------+--------------------+
                    |                    |
         Queries &  |                    | Realtime Fetch
          Mutations |                    |
                    v                    v
+------------------------+  +--------------------------------+
|  Supabase PostgreSQL   |  |   Frontend Dashboard (Vercel)  |
|  - products            |  |   - React 18 + Tailwind CSS    |
|  - price_history       |  |   - Recharts Historical Trends |
|  - scrape_logs         |  |   - 1-Click Catalog Importer   |
+------------------------+  +--------------------------------+
```

### 4.2. Free-Tier Cloud Hosting Trade-offs
1. **Render Free Tier Sleep Cycles**:
   - *Problem*: Free Render web services spin down after 15 minutes of inactivity, causing a 40–50s cold-start latency.
   - *Mitigation*: We created a lightweight `/api/health` endpoint. The external cron runner sends a wake-up ping 60 seconds prior to executing batch scraping jobs, ensuring the Playwright container is warm.
2. **Chromium Memory Footprint**:
   - Playwright requires substantial RAM (~200MB per browser context). In resource-constrained cloud containers (512MB RAM on Render free tier), concurrency must be kept sequential (`concurrency = 1` or `2`) with explicit browser closure (`browser.close()`) after each batch to prevent out-of-memory crashes.
3. **Dual-Mode Persistence (Zero-Config Reliability)**:
   - If Supabase environment variables are missing or misconfigured during initial local evaluation, the backend automatically transitions to an In-Memory Mock Repository. This ensures that evaluators can run `npm run dev` or `npm run scrape:headed` out-of-the-box without needing external PostgreSQL credentials.

---

## 5. Reflections: What AI Tools Got Wrong & How We Corrected It

As requested by the assignment design prompt, below is an honest technical analysis of what standard AI models (ChatGPT, Claude, Copilot) misdiagnosed during the initial development cycle:

### 1. The Naive `fetch` / Cheerio Assumption
- **AI's First Attempt**: The AI suggested using Axios and Cheerio to fetch `https://demo.inelabteamdev.com/product/95` and parse `$('.price').text()`.
- **Why It Failed**: The store is a client-side React SPA. The server HTML returned:
  ```html
  <div id="root"></div>
  ```
  Cheerio found zero product elements.
- **Correction**: Replaced Cheerio with a Playwright headless browser engine that executes JavaScript and waits for React hydration.

### 2. Missing the "Reveal Price" Interaction Gate
- **AI's First Attempt**: Even after switching to Playwright, the AI wrote `await page.waitForSelector('.price')`.
- **Why It Failed**: The price is not visible on initial load. The button explicitly requires hovering over `.price-block` for $>600\text{ ms}$ with $\ge 8$ cursor moves to trigger the reveal state. A simple selector wait timed out every time.
- **Correction**: Reverse-engineered the client bundle, discovered the dwell and movement state machine, and implemented human-like cursor interpolation with a 750ms dwell time.

### 3. Synthetic `click()` vs. `isTrusted`
- **AI's First Attempt**: The AI attempted to bypass the hover requirement by running:
  ```javascript
  await page.$eval('button.reveal-price', (btn) => btn.click());
  ```
- **Why It Failed**: Synthetic DOM events have `event.isTrusted = false`. The application event handler explicitly checks `if (!e.isTrusted) return;`, ignoring the click.
- **Correction**: Used Playwright's native CDP mouse click (`await button.click()`), which generates hardware-level trusted browser events.

### 4. Falling for Honeypot Elements
- **AI's First Attempt**: The AI parsed the first element matching `[class*="price"]` or `.price-value`.
- **Why It Failed**: The mock site intentionally creates hidden honeypot elements with fake prices (e.g., `display: none` spans containing ₹99,999) to fool scrapers. The AI's parsed price was consistently wrong.
- **Correction**: Implemented strict computed style checks, bounding box verification (`width > 0 && height > 0`), and explicit filtering of `.strikethrough` MRP elements.

### 5. Invisible Unicode Zero-Width Spaces
- **AI's First Attempt**: The AI ran `parseInt(text.replace(/[^0-9]/g, ''))`.
- **Why It Failed**: The price string embedded invisible `\u200B` characters. While regex sometimes extracted the digits, the AI failed to sanitize non-breaking spaces and full-width numbers, causing `NaN` or concatenated figures (e.g., reading ₹1,200 MRP and ₹900 Sale as `1200900`).
- **Correction**: Built a dedicated regex sanitizer that removes zero-width characters, isolates the primary currency block, and validates against reasonable numeric boundaries.

---

## 6. Conclusion

By combining browser automation, reverse-engineered event mechanics, anti-honeypot heuristics, and an honest audit trail, the INE Price Tracker achieves resilient, production-ready tracking across dynamic SPA storefronts.
