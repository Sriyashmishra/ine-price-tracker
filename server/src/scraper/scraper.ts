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

    // Suppress and disable all cookie overlays and banners at the DOM engine level
    await context.addInitScript(() => {
      const style = document.createElement('style');
      style.innerHTML = `
        .cookie-overlay, .cookie-banner, [class*="cookie"] {
          display: none !important;
          visibility: hidden !important;
          pointer-events: none !important;
          opacity: 0 !important;
          z-index: -999999 !important;
        }
      `;
      if (document.head) {
        document.head.appendChild(style);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          if (document.head) document.head.appendChild(style);
        });
      }
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

      // Simulate mouse movements across the price block (>8 moves, >600ms dwell time)
      await page.mouse.move(box.x + 10, box.y + 10);
      for (let i = 0; i < 10; i++) {
        const moveX = box.x + 15 + Math.random() * (box.width - 30);
        const moveY = box.y + 15 + Math.random() * (box.height - 30);
        await page.mouse.move(moveX, moveY, { steps: 2 });
        await page.waitForTimeout(80);
      }
      // Guarantee dwell time
      await page.waitForTimeout(300);

      // Locate the "Reveal price" button
      const revealBtn = page.locator('button:has-text("Reveal price")');
      await revealBtn.waitFor({ state: 'visible', timeout: 5000 });

      // Ensure button is not disabled
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[aria-label="Reveal price"]') as HTMLButtonElement;
          return btn && !btn.disabled;
        },
        { timeout: 5000 }
      );

      await page.evaluate(() => document.querySelectorAll('.cookie-overlay, .cookie-banner').forEach(e => e.remove())).catch(() => {});
      onProgress('Clicking "Reveal price"...');
      try {
        await revealBtn.click({ timeout: 5000, force: true });
      } catch {
        const btnBox = await revealBtn.boundingBox();
        if (btnBox) {
          await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
        }
      }

      // Handle the deliberate transient dropped clicks in mock store:
      // If after 1200ms it's still idle and not loading/success, click again
      await page.waitForTimeout(1200);
      const isStillIdle = await page.locator('.price-block.price-idle').isVisible().catch(() => false);
      if (isStillIdle) {
        onProgress('Transient click drop detected. Re-clicking "Reveal price"...');
        await page.mouse.move(box.x + 25, box.y + 25);
        await page.waitForTimeout(100);
        try {
          await revealBtn.click({ timeout: 5000, force: true });
        } catch {
          const btnBox = await revealBtn.boundingBox();
          if (btnBox) {
            await page.mouse.click(btnBox.x + btnBox.width / 2, btnBox.y + btnBox.height / 2);
          }
        }
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

    // 5. Extract genuine price (anti-honeypot: avoid display: none spans)
    const rawPriceText = await page.evaluate(() => {
      const priceMain = document.querySelector('.price-main');
      if (!priceMain) return null;

      // First, check for primary prominent price element (tag 'b', 'strong', or class containing 'pv-')
      const primaryEl = priceMain.querySelector('b, strong, [class*="pv-"]') as HTMLElement | null;
      if (primaryEl) {
        const style = window.getComputedStyle(primaryEl);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
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
          parseFloat(style.opacity || '1') < 0.9 ||
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
