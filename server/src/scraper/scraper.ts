import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { config } from '../config.js';
import { db, Product } from '../db/client.js';
import { parsePrice, parseStock, ParsedScrapeResult } from './parser.js';

export interface ScrapeOptions {
  headless?: boolean;
  slowMo?: number;
  timeoutMs?: number;
  onProgress?: (msg: string) => void;
}

export interface ScrapeExecutionResult {
  success: boolean;
  data?: ParsedScrapeResult;
  attempts: number;
  totalDurationMs: number;
  error?: string;
}

export class StoreScraper {
  private browser: Browser | null = null;

  async init(headless: boolean = true, slowMo: number = 0): Promise<Browser> {
    if (!this.browser) {
      this.browser = await chromium.launch({
        headless,
        slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
        ],
      });
    }
    return this.browser;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Scrapes an individual product by URL or ID with automatic retry & exponential backoff.
   */
  async scrapeProduct(
    product: Product,
    options: ScrapeOptions = {}
  ): Promise<ScrapeExecutionResult> {
    const headless = options.headless ?? config.scraper.headless;
    const slowMo = options.slowMo ?? 0;
    const timeoutMs = options.timeoutMs ?? config.scraper.timeoutMs;
    const maxRetries = config.scraper.maxRetries;
    const onProgress = options.onProgress || ((msg: string) => console.log(`[Scraper] ${msg}`));

    const startTime = Date.now();
    let attempt = 0;
    let lastError: Error | null = null;

    const browser = await this.init(headless, slowMo);
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
    });

    // Suppress cookie overlays & inject prominent screencast cursor at browser context level
    await context.addInitScript(() => {
      // 1. Style to neutralize cookie overlays & format high-visibility screencast cursor
      const style = document.createElement('style');
      style.innerHTML = `
        .cookie-overlay, .cookie-banner, [class*="cookie"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          opacity: 0 !important;
          z-index: -999999 !important;
        }

        #screencast-cursor-container {
          position: fixed !important;
          top: 0 !important;
          left: 0 !important;
          pointer-events: none !important;
          z-index: 2147483647 !important;
          transform: translate3d(-3px, -2px, 0);
          display: block !important;
          will-change: transform, left, top;
        }

        .screencast-halo {
          position: absolute;
          top: 0;
          left: 0;
          width: 34px;
          height: 34px;
          border-radius: 50%;
          background: rgba(245, 158, 11, 0.42);
          box-shadow: 0 0 16px rgba(245, 158, 11, 0.85), 0 0 32px rgba(245, 158, 11, 0.4);
          transform: translate(-50%, -50%);
          pointer-events: none;
          transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
        }

        .screencast-cursor-icon {
          position: absolute;
          top: 0;
          left: 0;
          width: 28px;
          height: 28px;
          pointer-events: none;
          filter: drop-shadow(0 2px 6px rgba(0,0,0,0.85));
          transform: rotate(-8deg);
          transition: transform 0.1s ease;
        }

        .screencast-ripple {
          position: absolute;
          top: 0;
          left: 0;
          width: 52px;
          height: 52px;
          border-radius: 50%;
          border: 3px solid #10b981;
          transform: translate(-50%, -50%) scale(0.2);
          opacity: 0;
          pointer-events: none;
        }

        #screencast-cursor-container.clicking .screencast-halo {
          background: rgba(16, 185, 129, 0.65);
          box-shadow: 0 0 22px rgba(16, 185, 129, 0.95);
          transform: translate(-50%, -50%) scale(1.35);
        }

        #screencast-cursor-container.clicking .screencast-cursor-icon {
          transform: rotate(-8deg) scale(0.88);
        }

        #screencast-cursor-container.clicking .screencast-ripple {
          animation: screencast-click-wave 0.45s ease-out forwards;
        }

        @keyframes screencast-click-wave {
          0% {
            transform: translate(-50%, -50%) scale(0.2);
            opacity: 1;
          }
          100% {
            transform: translate(-50%, -50%) scale(1.9);
            opacity: 0;
          }
        }
      `;

      if (document.head) {
        document.head.appendChild(style);
      } else {
        document.documentElement.appendChild(style);
      }

      // 2. High-visibility cursor element with crisp macOS pointer arrow + spotlight halo
      const container = document.createElement('div');
      container.id = 'screencast-cursor-container';
      container.innerHTML = `
        <div class="screencast-halo"></div>
        <div class="screencast-ripple"></div>
        <svg class="screencast-cursor-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 3L11.5 21L14.2 13.8L21 11.2L4 3Z" fill="#0f172a" stroke="#ffffff" stroke-width="2.2" stroke-linejoin="round"/>
        </svg>
      `;

      function mountCursor() {
        if (!document.documentElement.contains(container)) {
          document.documentElement.appendChild(container);
        }
      }

      mountCursor();
      document.addEventListener('DOMContentLoaded', mountCursor);

      function updatePosition(x: number, y: number, isClicking: boolean = false) {
        mountCursor();
        container.style.left = x + 'px';
        container.style.top = y + 'px';
        if (isClicking) {
          container.classList.add('clicking');
        } else {
          container.classList.remove('clicking');
        }
      }

      (window as any).__updateScreencastCursor = updatePosition;

      window.addEventListener('mousemove', (e) => {
        updatePosition(e.clientX, e.clientY, (window as any).__cursorIsDown || false);
      }, { capture: true, passive: true });

      window.addEventListener('mousedown', (e) => {
        (window as any).__cursorIsDown = true;
        updatePosition(e.clientX, e.clientY, true);
      }, { capture: true, passive: true });

      window.addEventListener('mouseup', (e) => {
        (window as any).__cursorIsDown = false;
        updatePosition(e.clientX, e.clientY, false);
      }, { capture: true, passive: true });
    });

    try {
      while (attempt < maxRetries) {
        attempt++;
        const attemptStartTime = Date.now();
        onProgress(`Attempt ${attempt}/${maxRetries} for "${product.name}" (ID: ${product.store_product_id})...`);

        try {
          const page = await context.newPage();
          page.setDefaultTimeout(timeoutMs);

          const result = await this.extractProductData(page, product.url, onProgress);
          await page.close();

          const durationMs = Date.now() - attemptStartTime;
          const totalDurationMs = Date.now() - startTime;

          // 1. Log success honestly
          await db.addScrapeLog({
            product_id: product.id,
            store_product_id: product.store_product_id,
            status: 'SUCCESS',
            attempt_number: attempt,
            duration_ms: durationMs,
            extracted_price: result.price,
            extracted_stock: result.stockStatus,
          });

          // 2. Update product latest record
          await db.updateProduct(product.id, {
            current_price: result.price,
            stock_status: result.stockStatus,
            is_in_stock: result.isInStock,
            last_scraped_at: new Date().toISOString(),
            last_scrape_status: 'SUCCESS',
          });

          // 3. Append to historical timeseries
          await db.addPriceHistory({
            product_id: product.id,
            price: result.price,
            stock_status: result.stockStatus,
            is_in_stock: result.isInStock,
          });

          onProgress(`✓ Scraped successfully: ₹${result.price} (${result.stockStatus}) in ${durationMs}ms`);

          return {
            success: true,
            data: result,
            attempts: attempt,
            totalDurationMs,
          };
        } catch (err: any) {
          lastError = err;
          const durationMs = Date.now() - attemptStartTime;
          const isFinalAttempt = attempt >= maxRetries;
          const status = isFinalAttempt ? 'FAILED' : 'RETRIED';

          onProgress(`⚠ Attempt ${attempt} failed: ${err.message}`);

          // Log failure or retry attempt honestly
          await db.addScrapeLog({
            product_id: product.id,
            store_product_id: product.store_product_id,
            status,
            attempt_number: attempt,
            duration_ms: durationMs,
            error_message: err.message || 'Unknown scrape error',
          });

          if (!isFinalAttempt) {
            // Adaptive exponential backoff with jitter: longer backoff for 429 rate limits
            const isRateLimit = err.message && err.message.includes('429');
            const baseDelay = isRateLimit ? 3000 : config.scraper.retryDelayBaseMs;
            const backoffMs =
              baseDelay * Math.pow(2, attempt - 1) +
              Math.floor(Math.random() * 800);
            onProgress(`Waiting ${backoffMs}ms before retrying...`);
            await new Promise(r => setTimeout(r, backoffMs));
          }
        }
      }

      // If all retries failed
      const totalDurationMs = Date.now() - startTime;
      await db.updateProduct(product.id, {
        last_scraped_at: new Date().toISOString(),
        last_scrape_status: 'FAILED',
      });

      return {
        success: false,
        attempts: attempt,
        totalDurationMs,
        error: lastError?.message || 'Exceeded max scrape retries',
      };
    } finally {
      await context.close();
    }
  }

  /**
   * Internal page interaction routine to solve the dynamic price reveal.
   */
  private async extractProductData(
    page: Page,
    productUrl: string,
    onProgress: (msg: string) => void
  ): Promise<ParsedScrapeResult> {
    onProgress(`Navigating to ${productUrl}...`);
    try {
      await page.goto(productUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    } catch {
      await page.goto(productUrl, { waitUntil: 'commit', timeout: 15000 }).catch(() => {});
    }

    // Allow page to settle
    await page.waitForTimeout(800);

    // Initial cursor placement
    await page.mouse.move(200, 150, { steps: 3 });

    // 1. Check and dismiss cookie overlay if present
    try {
      await page.evaluate(() => {
        const overlays = document.querySelectorAll('.cookie-overlay, .cookie-banner, [class*="cookie"]');
        overlays.forEach(el => {
          const btn = el.querySelector('button');
          if (btn) btn.click();
          el.remove();
        });
      });
    } catch {
      // Ignore if no cookie banner
    }

    // 2. Wait for the price block to render in the DOM
    const priceBlock = page.locator('.price-block');
    await priceBlock.waitFor({ state: 'attached', timeout: 20000 });

    // 3. Check if price is already revealed or if we need the hover + reveal interaction
    const isAlreadyRevealed = await page.locator('.price-block.price-success').isVisible().catch(() => false);

    if (!isAlreadyRevealed) {
      onProgress('Hovering over price block to satisfy dwell & movement requirements...');

      // Get bounding box of the price area to generate realistic mouse movements
      const box = await priceBlock.boundingBox();
      if (!box) {
        throw new Error('Could not compute price-block bounding box');
      }

      // Smoothly move into the price block
      await page.mouse.move(box.x + 30, box.y + 25, { steps: 5 });
      await page.waitForTimeout(80);

      // Simulate human-like mouse movements across the price block (>8 moves, >600ms dwell time)
      for (let i = 0; i < 9; i++) {
        const moveX = box.x + 20 + Math.random() * (box.width - 40);
        const moveY = box.y + 20 + Math.random() * (box.height - 40);
        await page.mouse.move(moveX, moveY, { steps: 3 });
        await page.waitForTimeout(85);
      }
      // Dwell pause over the price area to guarantee >600ms threshold
      await page.waitForTimeout(300);

      // Locate the "Reveal price" button
      const revealBtn = page.locator('button:has-text("Reveal price"), button[aria-label*="Reveal price"], .reveal-price-btn');
      await revealBtn.waitFor({ state: 'visible', timeout: 8000 });

      // Move cursor directly onto the button so it's clearly visible before clicking
      const btnBox = await revealBtn.boundingBox();
      if (btnBox) {
        const btnCenterX = Math.round(btnBox.x + btnBox.width / 2);
        const btnCenterY = Math.round(btnBox.y + btnBox.height / 2);

        onProgress('Moving cursor onto "Reveal price" button...');
        await page.mouse.move(btnCenterX, btnCenterY, { steps: 6 });
        await page.waitForTimeout(400);

        // Ensure button is not disabled
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('button[aria-label="Reveal price"], button:has-text("Reveal price")') as HTMLButtonElement;
            return btn && !btn.disabled;
          },
          { timeout: 5000 }
        ).catch(() => {});

        await page.evaluate(() => document.querySelectorAll('.cookie-overlay, .cookie-banner').forEach(e => e.remove())).catch(() => {});
        onProgress('Clicking "Reveal price"...');
        await page.mouse.down();
        await page.waitForTimeout(120);
        await page.mouse.up();
        await revealBtn.click({ timeout: 5000, force: true }).catch(() => {});
      }

      // Handle the deliberate transient dropped clicks in mock store (17.5% drop rate)
      await page.waitForTimeout(1100);
      const isStillIdle = await page.locator('.price-block.price-idle').isVisible().catch(() => false);
      if (isStillIdle && btnBox) {
        onProgress('Transient click drop detected. Re-clicking "Reveal price"...');
        const btnCenterX = Math.round(btnBox.x + btnBox.width / 2);
        const btnCenterY = Math.round(btnBox.y + btnBox.height / 2);
        await page.mouse.move(btnCenterX, btnCenterY, { steps: 4 });
        await page.mouse.down();
        await page.waitForTimeout(100);
        await page.mouse.up();
        await revealBtn.click({ timeout: 5000, force: true }).catch(() => {});
      }
    }

    // 4. Wait for resolution (.price-success or .price-error)
    onProgress('Waiting for price quote response from mock store...');
    const resultState = await Promise.race([
      page.locator('.price-block.price-success').waitFor({ state: 'visible', timeout: 18000 }).then(() => 'SUCCESS'),
      page.locator('.price-block.price-error').waitFor({ state: 'visible', timeout: 18000 }).then(() => 'ERROR'),
    ]).catch(() => 'TIMEOUT');

    if (resultState === 'ERROR') {
      const errorMsg = await page.locator('.price-block.price-error .price-substatus').innerText().catch(() => 'Store responded with error');
      throw new Error(`Store price error: ${errorMsg}`);
    }

    if (resultState === 'TIMEOUT') {
      throw new Error('Timed out waiting for store price resolution');
    }

    // Pause 2 seconds so the viewer watching the screen recording can clearly observe the revealed price on screen
    await page.waitForTimeout(2000);

    // Wait for the price text to be fully populated inside .price-main
    await page.waitForFunction(() => {
      const pm = document.querySelector('.price-main');
      if (!pm) return false;
      const el = pm.querySelector('[class*="pv-"], b, strong');
      return el && el.textContent && el.textContent.trim().length > 0;
    }, { timeout: 6000 }).catch(() => {});

    // 5. Extract genuine price (anti-honeypot: avoid display: none spans)
    const rawPriceText = await page.evaluate(() => {
      const priceMain = document.querySelector('.price-main');
      if (!priceMain) return null;

      // First, check for primary prominent price element (class containing 'pv-' or bold)
      const primaryEl = priceMain.querySelector('[class*="pv-"], b, strong') as HTMLElement | null;
      if (primaryEl) {
        const style = window.getComputedStyle(primaryEl);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          // If digits are split across multiple spans, concatenate their text directly
          const childSpans = Array.from(primaryEl.querySelectorAll('span'));
          if (childSpans.length > 0) {
            const combined = childSpans.map(s => s.textContent || '').join('');
            if (combined.trim().length > 0) return combined.trim();
          }
          const text = primaryEl.textContent?.trim() || '';
          if (text.length > 0) return text;
        }
      }

      // Fallback: iterate child elements
      const children = Array.from(priceMain.children) as HTMLElement[];
      for (const el of children) {
        const style = window.getComputedStyle(el);
        const text = el.textContent || '';
        // Skip hidden honeypots and decorative elements
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          el.getAttribute('aria-hidden') === 'true' ||
          el.classList.contains('price-value') ||
          el.classList.contains('amount') ||
          el.classList.contains('mr-') ||
          el.classList.contains('sl-') ||
          style.textDecorationLine.includes('line-through') || // MRP
          text.includes('% off') ||
          text.includes('Deal price') ||
          text.includes('Updating')
        ) {
          continue;
        }
        if (text.trim().length > 0) {
          return text.trim();
        }
      }
      return null;
    });

    if (!rawPriceText) {
      throw new Error('Failed to locate visible price element in .price-main');
    }

    const price = parsePrice(rawPriceText);

    // 6. Extract stock status badge
    const stockBadge = page.locator('.stock-badge');
    const rawStockText = await stockBadge.innerText().catch(() => 'In Stock');
    const { stockStatus, isInStock, stockQuantity } = parseStock(rawStockText);

    return {
      price,
      stockStatus,
      isInStock,
      stockQuantity,
    };
  }
}

export const scraperInstance = new StoreScraper();
