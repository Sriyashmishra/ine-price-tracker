import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { catalogRouter } from './routes/catalog.js';
import { productsRouter } from './routes/products.js';
import { cronRouter } from './routes/cron.js';
import { scraperInstance } from './scraper/scraper.js';

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

const server = app.listen(config.port, () => {
  console.log(`\n🚀 INE Price Tracker Server running on port ${config.port}`);
  console.log(`📡 Health check: http://localhost:${config.port}/api/health`);
  console.log(`🛒 Target Mock Store: ${config.mockStoreBaseUrl}`);
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
