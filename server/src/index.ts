import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import config from './lib/config.js';
import logger from './lib/logger.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { httpLogger } from './middleware/logging.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import routes from './routes/index.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const app = express();

// Security best-practice
app.disable('x-powered-by');
app.set('trust proxy', config.TRUST_PROXY);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.CORS_ORIGIN.split(',').map((origin: string) => origin.trim()),
  credentials: true,
}));

// Rate limiting (In-Memory)
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: {
    success: false,
    error: {
      status: 429,
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.',
    },
  },
});
app.use(limiter);

// Basic middleware
app.use(compression());
app.use(express.json({ limit: config.REQUEST_BODY_LIMIT }));
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(requestIdMiddleware);
app.use(httpLogger);

// Routes
app.use('/', routes);

// Error handling: catch-all 404 handler placed after routes
app.use(notFoundHandler);
app.use(errorHandler);

// Graceful shutdown
const setupGracefulShutdown = (server: import('http').Server) => {
  const shutdown = async (signal: string) => {
    try {
      logger.info({ signal }, 'Shutting down');
      await new Promise<void>((resolve) => server.close(() => resolve()));
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (error) {
      logger.error({ error }, 'Error during shutdown');
      process.exit(1);
    }
  };
  ['SIGTERM', 'SIGINT'].forEach((sig) => {
    process.on(sig, () => shutdown(sig));
  });
};

// Initialize server
async function startServer() {
  try {
    const server = app.listen(config.PORT, config.HOST, () => {
      logger.info(`🚀 Server listening at http://${config.HOST}:${config.PORT} (${config.NODE_ENV})`);
    });

    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 67_000;
    server.requestTimeout = 0;
    setupGracefulShutdown(server);

    process.on('uncaughtException', (error) => {
      logger.fatal({ error }, 'Uncaught exception occurred');
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal({ reason, promise }, 'Unhandled rejection occurred');
      process.exit(1);
    });

    return server;
  } catch (error) {
    logger.fatal({ error }, 'Failed to start server');
    process.exit(1);
  }
}

if (process.env['NODE_ENV'] !== 'test') {
  startServer();
}

export default app;
