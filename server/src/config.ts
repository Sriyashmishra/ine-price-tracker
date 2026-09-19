import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from current directory or root
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '4000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  cronSecret: process.env.CRON_SECRET || 'ine_secure_cron_secret_key_2026',
  mockStoreBaseUrl: process.env.MOCK_STORE_BASE_URL || 'https://demo.inelabteamdev.com',
  
  // Supabase settings
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_KEY || '',

  // Scraper settings
  scraper: {
    headless: process.env.SCRAPER_HEADLESS !== 'false',
    maxRetries: parseInt(process.env.SCRAPER_MAX_RETRIES || '3', 10),
    timeoutMs: parseInt(process.env.SCRAPER_TIMEOUT_MS || '30000', 10),
    retryDelayBaseMs: 1500,
  }
};
