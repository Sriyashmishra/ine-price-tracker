import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { catalogRouter } from './routes/catalog.js';
import { productsRouter } from './routes/products.js';
import { cronRouter } from './routes/cron.js';
import { scraperInstance } from './scraper/scraper.js';
import { db } from './db/client.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*', // Allow Vercel frontend, local dev, or custom domains
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-cron-secret'],
  })
);
app.use(express.json());

// Request logger
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Health check endpoint (Used by Render warmup, cron-job.org keep-alive, or uptime monitors)
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/catalog', catalogRouter);
app.use('/api/products', productsRouter);
app.use('/api/scrape', cronRouter);

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server Error]', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred',
  });
});

const server = app.listen(config.port, async () => {
  console.log(`\n🚀 INE Price Tracker Server running on port ${config.port}`);
  console.log(`📡 Health check: http://localhost:${config.port}/api/health`);
  console.log(`🛒 Target Mock Store: ${config.mockStoreBaseUrl}`);

  // Automatically resolve any products stuck in pending state on startup
  try {
    const products = await db.getProducts();
    const pendingProducts = products.filter(
      p => !p.current_price || p.last_scrape_status === 'PENDING'
    );
    if (pendingProducts.length > 0) {
      console.log(`[Startup] Found ${pendingProducts.length} pending product(s). Resolving initial scrapes...`);
      for (const p of pendingProducts) {
        scraperInstance.scrapeProduct(p, { headless: true }).catch(err => {
          console.error(`[Startup] Scrape failed for ${p.name}:`, err.message);
        });
      }
    }
  } catch (err: any) {
    console.warn('[Startup] Could not check pending products:', err.message);
  }
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Closing scraper and server gracefully...`);
  await scraperInstance.close();
  server.close(() => {
    console.log('Server closed successfully.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
