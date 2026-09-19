/**
 * Normalizes and sanitizes price and stock data extracted from INE mock store DOM.
 */

export interface ParsedScrapeResult {
  price: number;
  stockStatus: string;
  isInStock: boolean;
  stockQuantity?: number;
}

/**
 * Normalizes full-width Unicode digits (e.g. ０１２３４５６７８９ -> 0123456789)
 */
export function normalizeUnicodeDigits(str: string): string {
  return str.replace(/[\uFF10-\uFF19]/g, ch => 
    String.fromCharCode(ch.charCodeAt(0) - 0xFF10 + 48)
  );
}

/**
 * Strips zero-width spaces (\u200B), non-breaking spaces (\u00A0),
 * narrow no-break spaces (\u202F), and invisible markers.
 */
export function cleanInvisibleCharacters(str: string): string {
  return str
    .replace(/[\u200B\u200C\u200D\uFEFF]/g, '') // zero-width
    .replace(/[\u00A0\u202F]/g, ' ')            // non-breaking spaces
    .trim();
}

/**
 * Parses raw price string into a clean numeric value.
 * Handles formats like:
 *   "₹ 42.9"
 *   "Rs. 1,499.00"
 *   "₹1 499/- (incl. of all taxes)"
 *   "1.499,00" (euro format)
 *   Unicode full-width digits: "₹４２９９"
 *   Split-spans with zero-width spaces
 */
export function parsePrice(rawText: string): number {
  if (!rawText) {
    throw new Error('Price text is empty');
  }

  // 1. Clean invisible characters & normalize full-width digits
  let cleaned = cleanInvisibleCharacters(rawText);
  cleaned = normalizeUnicodeDigits(cleaned);

  // 2. Remove standard suffixes and noise words
  cleaned = cleaned.replace(/\/\-.*$/i, ''); // e.g. "/- (incl. of all taxes)"
  cleaned = cleaned.replace(/\(incl\.?.*?\)/i, '');
  cleaned = cleaned.replace(/Deal price/i, '');

  // 3. Match euro format: "1.499,00" -> replace . with '' and , with .
  if (/\b\d{1,3}(?:\.\d{3})*,\d{2}\b/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Standard format: remove commas used as thousand separators
    cleaned = cleaned.replace(/,/g, '');
  }

  // 4. Extract first valid float/integer pattern
  const match = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Unable to extract numeric price from: "${rawText}" (cleaned: "${cleaned}")`);
  }

  const price = parseFloat(match[1]);
  if (isNaN(price) || price <= 0) {
    throw new Error(`Extracted invalid price: ${price} from "${rawText}"`);
  }

  return Math.round(price * 100) / 100;
}

/**
 * Parses stock text extracted from badge
 * e.g., "In stock · 4 left", "Only 2 left", "Out of stock"
 */
export function parseStock(rawStockText: string): { stockStatus: string; isInStock: boolean; stockQuantity?: number } {
  if (!rawStockText) {
    return { stockStatus: 'Unknown', isInStock: false };
  }

  const cleaned = cleanInvisibleCharacters(rawStockText);
  const isOut = /out of stock/i.test(cleaned);

  if (isOut) {
    return {
      stockStatus: 'Out of Stock',
      isInStock: false,
      stockQuantity: 0,
    };
  }

  // Try to extract quantity if present e.g. "4 left" or "4 in stock"
  const qtyMatch = cleaned.match(/(\d+)\s*(?:left|in stock)/i);
  const stockQuantity = qtyMatch ? parseInt(qtyMatch[1], 10) : undefined;

  return {
    stockStatus: cleaned || 'In Stock',
    isInStock: true,
    stockQuantity,
  };
}
